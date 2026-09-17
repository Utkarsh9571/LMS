import { connectToDatabase } from '@/lib/db';
import { EntitlementModel, IEntitlementDocument } from '@/core/domain/entitlement.model';
import { UserModel } from '@/core/domain/user.model';
import { CourseModel } from '@/core/domain/course.model';
import {
  EntitlementTargetType,
  MarketCode,
  IEntitlementSafeDTO
} from '@/core/domain/domain-types';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface GrantEntitlementInput {
  userId: string;
  sourceOrderId?: string | null;
  marketCode: MarketCode;
  targetType: EntitlementTargetType;
  targetId: string;
  expiresAt?: Date | null;
}

export class EntitlementService {
  /**
   * Idempotently grants an entitlement.
   * If an active non-expired entitlement already exists for the same target,
   * preserves it and optionally extends expiresAt rather than creating a duplicate active grant.
   */
  static async grantEntitlement(input: GrantEntitlementInput): Promise<IEntitlementSafeDTO> {
    const { userId, sourceOrderId, marketCode, targetType, targetId, expiresAt } = input;

    if (!userId) throw new ValidationError('userId is required.');
    if (!marketCode || !['SG', 'MY'].includes(marketCode)) {
      throw new ValidationError('marketCode must be SG or MY.');
    }
    if (!targetType || !['course', 'batch'].includes(targetType)) {
      throw new ValidationError("targetType must be 'course' or 'batch'.");
    }
    if (!targetId) throw new ValidationError('targetId is required.');

    await connectToDatabase();

    // Verify user exists
    const user = await UserModel.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    // Verify course exists if targetType is course
    if (targetType === 'course') {
      const course = await CourseModel.findById(targetId);
      if (!course) throw new NotFoundError('Course', targetId);
    }

    const now = new Date();

    // Check for existing active entitlement
    const existing = await EntitlementModel.findOne({
      userId,
      targetType,
      targetId,
      status: 'active'
    });

    if (existing) {
      if (existing.isAccessValid(now)) {
        // If existing has expiration and new grant provides extended expiration
        if (expiresAt && existing.expiresAt && expiresAt > existing.expiresAt) {
          existing.expiresAt = expiresAt;
          await existing.save();
          logger.info('Extended existing entitlement duration', {
            entitlementId: existing._id.toString(),
            userId,
            newExpiresAt: expiresAt
          });
        }
        return existing.toSafeDTO();
      } else {
        // Mark previously expired one as 'expired'
        existing.status = 'expired';
        await existing.save();
      }
    }

    const entitlement = await EntitlementModel.create({
      userId,
      sourceOrderId: sourceOrderId || null,
      marketCode,
      targetType,
      targetId,
      status: 'active',
      grantedAt: now,
      expiresAt: expiresAt || null
    });

    logger.info('Entitlement granted', {
      entitlementId: entitlement._id.toString(),
      userId,
      targetType,
      targetId,
      marketCode
    });

    return entitlement.toSafeDTO();
  }

  /**
   * Retrieves active, non-expired entitlement for a user and target
   */
  static async getActiveEntitlement(
    userId: string,
    targetType: EntitlementTargetType,
    targetId: string
  ): Promise<IEntitlementDocument | null> {
    await connectToDatabase();
    const now = new Date();

    const entitlement = await EntitlementModel.findOne({
      userId,
      targetType,
      targetId,
      status: 'active',
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
    });

    return entitlement;
  }

  /**
   * Checks whether a user has active valid entitlement to a course
   */
  static async hasActiveCourseEntitlement(userId: string, courseId: string): Promise<boolean> {
    const entitlement = await this.getActiveEntitlement(userId, 'course', courseId);
    return entitlement !== null;
  }

  /**
   * Safe Administrative / Development grant mechanism.
   * Grants entitlement without requiring payment or fake orders.
   */
  static async grantDevelopmentAccess(
    userId: string,
    courseId: string,
    marketCode: MarketCode = 'SG',
    expiresAt?: Date | null
  ): Promise<IEntitlementSafeDTO> {
    return this.grantEntitlement({
      userId,
      sourceOrderId: null,
      marketCode,
      targetType: 'course',
      targetId: courseId,
      expiresAt: expiresAt || null
    });
  }
}
