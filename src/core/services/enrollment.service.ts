import type { ClientSession } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { EnrollmentModel, IEnrollmentDocument } from '@/core/domain/enrollment.model';
import { EntitlementModel } from '@/core/domain/entitlement.model';
import { CourseModel } from '@/core/domain/course.model';
import { IEnrollmentSafeDTO } from '@/core/domain/domain-types';
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface EnsureEnrollmentInput {
  userId: string;
  courseId: string;
  batchId?: string | null;
  entitlementId: string;
}

export class EnrollmentService {
  /**
   * Creates an Enrollment strictly from an active Entitlement basis.
   * Transaction-aware: passes optional ClientSession to all queries and mutations.
   * Idempotent: returns existing active enrollment if already present.
   * Enforces compound unique invariant: (userId, courseId, batchId).
   */
  static async createEnrollmentFromEntitlement(
    entitlementId: string,
    expectedUserId?: string,
    session?: ClientSession
  ): Promise<IEnrollmentSafeDTO> {
    await connectToDatabase();

    const entitlementQuery = EntitlementModel.findById(entitlementId);
    if (session) entitlementQuery.session(session);
    const entitlement = await entitlementQuery;

    if (!entitlement) {
      throw new NotFoundError('Entitlement', entitlementId);
    }

    if (expectedUserId && entitlement.userId.toString() !== expectedUserId) {
      throw new AuthorizationError('Entitlement does not belong to the authenticated user.');
    }

    if (entitlement.status !== 'active') {
      throw new AuthorizationError(`Entitlement is ${entitlement.status}, cannot create enrollment.`);
    }

    const now = new Date();
    if (entitlement.expiresAt && now >= entitlement.expiresAt) {
      entitlement.status = 'expired';
      await entitlement.save({ session });
      throw new AuthorizationError('Entitlement has expired, cannot create enrollment.');
    }

    let courseId: string;
    let batchId: string | null = null;

    if (entitlement.targetType === 'course') {
      courseId = entitlement.targetId.toString();
    } else if (entitlement.targetType === 'batch') {
      batchId = entitlement.targetId.toString();
      throw new ValidationError('Batch enrollment fulfillment is scheduled for Phase 1F.');
    } else {
      throw new ValidationError(`Unsupported entitlement targetType: ${entitlement.targetType}`);
    }

    const courseQuery = CourseModel.findById(courseId);
    if (session) courseQuery.session(session);
    const course = await courseQuery;

    if (!course) {
      throw new NotFoundError('Course', courseId);
    }

    // Check for existing enrollment (userId, courseId, batchId)
    const existingQuery = EnrollmentModel.findOne({
      userId: entitlement.userId,
      courseId,
      batchId: batchId || null
    });
    if (session) existingQuery.session(session);
    const existing = await existingQuery;

    if (existing) {
      logger.info('Enrollment already exists, returning existing record', {
        enrollmentId: existing._id.toString(),
        userId: entitlement.userId.toString(),
        courseId
      });
      return existing.toSafeDTO();
    }

    const [enrollment] = await EnrollmentModel.create(
      [
        {
          userId: entitlement.userId,
          courseId,
          batchId: batchId || null,
          entitlementId: entitlement._id,
          status: 'active',
          enrolledAt: now,
          progressPercent: 0
        }
      ],
      session ? { session } : undefined
    );

    logger.info('Enrollment created successfully from entitlement', {
      enrollmentId: enrollment._id.toString(),
      userId: entitlement.userId.toString(),
      courseId
    });

    return enrollment.toSafeDTO();
  }


  /**
   * Retrieves active enrollment for a student in a course
   */
  static async getActiveEnrollment(
    userId: string,
    courseId: string
  ): Promise<IEnrollmentDocument | null> {
    await connectToDatabase();
    return EnrollmentModel.findOne({
      userId,
      courseId,
      status: 'active'
    });
  }

  /**
   * Retrieves all enrollments for a student
   */
  static async getStudentEnrollments(userId: string): Promise<IEnrollmentSafeDTO[]> {
    await connectToDatabase();
    const enrollments = await EnrollmentModel.find({ userId }).sort({ enrolledAt: -1 });
    return enrollments.map(e => e.toSafeDTO());
  }
}
