import type { ClientSession } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { BatchModel, IBatchDocument } from '@/core/domain/batch.model';
import { CourseModel } from '@/core/domain/course.model';
import { UserModel } from '@/core/domain/user.model';
import {
  BatchStatus,
  MarketCode,
  IBatchSafeDTO,
  LiveMeetingProviderType
} from '@/core/domain/domain-types';
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface CreateBatchInput {
  courseId: string;
  marketCode: MarketCode;
  code: string;
  name: string;
  description?: string;
  capacity: number;
  startDate: string | Date;
  endDate: string | Date;
  enrollmentOpenAt?: string | Date | null;
  enrollmentCloseAt?: string | Date | null;
  primaryInstructorId: string;
  meetingProvider?: LiveMeetingProviderType;
}

export interface UpdateBatchInput {
  name?: string;
  description?: string;
  status?: BatchStatus;
  capacity?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  enrollmentOpenAt?: string | Date | null;
  enrollmentCloseAt?: string | Date | null;
  primaryInstructorId?: string;
  meetingProvider?: LiveMeetingProviderType;
}

export interface ClaimSeatResult {
  success: boolean;
  failureReason?: 'BATCH_FULL' | 'WINDOW_CLOSED' | 'NOT_ENROLLING' | 'NOT_FOUND';
  batch?: IBatchDocument;
}

export class BatchService {
  /**
   * Validates legal Batch state transitions
   */
  static validateStateTransition(current: BatchStatus, next: BatchStatus): void {
    if (current === next) return;

    const legalTransitions: Record<BatchStatus, BatchStatus[]> = {
      draft: ['upcoming', 'cancelled'],
      upcoming: ['enrolling', 'draft', 'cancelled'],
      enrolling: ['upcoming', 'in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [], // Terminal
      cancelled: []  // Terminal
    };

    const allowed = legalTransitions[current] || [];
    if (!allowed.includes(next)) {
      throw new ValidationError(`Illegal batch status transition from '${current}' to '${next}'.`);
    }
  }

  /**
   * Evaluates enrollment eligibility for a batch
   */
  static isEnrollmentEligible(batch: IBatchDocument, now: Date = new Date()): { eligible: boolean; reason?: string } {
    if (batch.status !== 'enrolling') {
      return { eligible: false, reason: `Batch status is '${batch.status}', not 'enrolling'.` };
    }

    if (batch.enrollmentOpenAt && now < batch.enrollmentOpenAt) {
      return { eligible: false, reason: 'Batch enrollment window has not opened yet.' };
    }

    if (batch.enrollmentCloseAt && now >= batch.enrollmentCloseAt) {
      return { eligible: false, reason: 'Batch enrollment window has closed.' };
    }

    if (batch.enrolledCount >= batch.capacity) {
      return { eligible: false, reason: 'Batch has reached maximum capacity.' };
    }

    return { eligible: true };
  }

  /**
   * Atomically claims a seat in a batch using a conditional query filter.
   * Invariant: enrolledCount must be < capacity. No read-then-write logic!
   */
  static async claimBatchSeatAtomic(
    batchId: string,
    session?: ClientSession,
    now: Date = new Date()
  ): Promise<ClaimSeatResult> {
    await connectToDatabase();

    // The correctness mechanism: conditional atomic update
    const claimedBatch = await BatchModel.findOneAndUpdate(
      {
        _id: batchId,
        status: 'enrolling',
        $and: [
          { $or: [{ enrollmentOpenAt: null }, { enrollmentOpenAt: { $lte: now } }] },
          { $or: [{ enrollmentCloseAt: null }, { enrollmentCloseAt: { $gt: now } }] }
        ],
        $expr: { $lt: ['$enrolledCount', '$capacity'] }
      },
      { $inc: { enrolledCount: 1 } },
      { session, new: true }
    );

    if (claimedBatch) {
      logger.info('Successfully claimed batch seat atomically', {
        batchId,
        enrolledCount: claimedBatch.enrolledCount,
        capacity: claimedBatch.capacity
      });
      return { success: true, batch: claimedBatch };
    }

    // Diagnostic-only inspection (does NOT affect atomic correctness)
    const existingQuery = BatchModel.findById(batchId);
    if (session) existingQuery.session(session);
    const existing = await existingQuery;

    if (!existing) return { success: false, failureReason: 'NOT_FOUND' };
    if (existing.status !== 'enrolling') return { success: false, failureReason: 'NOT_ENROLLING' };
    if (existing.enrollmentOpenAt && existing.enrollmentOpenAt > now) return { success: false, failureReason: 'WINDOW_CLOSED' };
    if (existing.enrollmentCloseAt && existing.enrollmentCloseAt <= now) return { success: false, failureReason: 'WINDOW_CLOSED' };
    if (existing.enrolledCount >= existing.capacity) return { success: false, failureReason: 'BATCH_FULL' };

    return { success: false, failureReason: 'NOT_ENROLLING' };
  }

  /**
   * Atomically releases a claimed seat (e.g. on student drop or administrative compensation)
   */
  static async releaseBatchSeatAtomic(
    batchId: string,
    session?: ClientSession
  ): Promise<void> {
    await connectToDatabase();

    await BatchModel.updateOne(
      { _id: batchId, enrolledCount: { $gt: 0 } },
      { $inc: { enrolledCount: -1 } },
      { session }
    );

    logger.info('Released batch seat atomically', { batchId });
  }

  /**
   * Creates a new Batch (Admin / Superadmin only)
   */
  static async createBatch(input: CreateBatchInput): Promise<IBatchSafeDTO> {
    await connectToDatabase();

    const {
      courseId,
      marketCode,
      code,
      name,
      description,
      capacity,
      startDate,
      endDate,
      enrollmentOpenAt,
      enrollmentCloseAt,
      primaryInstructorId,
      meetingProvider
    } = input;

    // Validate Course
    const course = await CourseModel.findById(courseId);
    if (!course) throw new NotFoundError('Course', courseId);

    // Validate Instructor
    const instructor = await UserModel.findById(primaryInstructorId);
    if (!instructor) throw new NotFoundError('Instructor User', primaryInstructorId);
    if (!instructor.globalRoles.some(r => ['instructor', 'admin', 'superadmin'].includes(r))) {
      throw new ValidationError(`User '${primaryInstructorId}' does not have instructor privileges.`);
    }

    // Validate Capacity
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new ValidationError('Capacity must be an integer of at least 1.');
    }

    // Validate Dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('Valid startDate and endDate are required.');
    }
    if (end <= start) {
      throw new ValidationError('endDate must be strictly after startDate.');
    }

    const openAt = enrollmentOpenAt ? new Date(enrollmentOpenAt) : null;
    const closeAt = enrollmentCloseAt ? new Date(enrollmentCloseAt) : null;
    if (openAt && closeAt && closeAt <= openAt) {
      throw new ValidationError('enrollmentCloseAt must be strictly after enrollmentOpenAt.');
    }

    // Check duplicate code
    const existingCode = await BatchModel.findOne({ code: code.trim().toUpperCase() });
    if (existingCode) {
      throw new ConflictError(`Batch with code '${code}' already exists.`);
    }

    const batch = await BatchModel.create({
      courseId,
      marketCode,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description?.trim(),
      status: 'draft',
      capacity,
      enrolledCount: 0,
      startDate: start,
      endDate: end,
      enrollmentOpenAt: openAt,
      enrollmentCloseAt: closeAt,
      primaryInstructorId,
      meetingProvider: meetingProvider || 'mock'
    });

    logger.info('Created new Batch', { batchId: batch._id.toString(), code: batch.code });
    return batch.toSafeDTO();
  }

  /**
   * Updates an existing Batch
   */
  static async updateBatch(batchId: string, input: UpdateBatchInput): Promise<IBatchSafeDTO> {
    await connectToDatabase();

    const batch = await BatchModel.findById(batchId);
    if (!batch) throw new NotFoundError('Batch', batchId);

    if (input.status && input.status !== batch.status) {
      this.validateStateTransition(batch.status, input.status);
      batch.status = input.status;
    }

    if (typeof input.capacity === 'number') {
      if (!Number.isInteger(input.capacity) || input.capacity < 1) {
        throw new ValidationError('Capacity must be an integer of at least 1.');
      }
      if (input.capacity < batch.enrolledCount) {
        throw new ValidationError(
          `Cannot reduce capacity to ${input.capacity}; already has ${batch.enrolledCount} enrolled students.`
        );
      }
      batch.capacity = input.capacity;
    }

    if (input.name) batch.name = input.name.trim();
    if (input.description !== undefined) batch.description = input.description.trim();
    if (input.startDate) batch.startDate = new Date(input.startDate);
    if (input.endDate) batch.endDate = new Date(input.endDate);
    if (input.enrollmentOpenAt !== undefined) {
      batch.enrollmentOpenAt = input.enrollmentOpenAt ? new Date(input.enrollmentOpenAt) : null;
    }
    if (input.enrollmentCloseAt !== undefined) {
      batch.enrollmentCloseAt = input.enrollmentCloseAt ? new Date(input.enrollmentCloseAt) : null;
    }

    if (input.primaryInstructorId) {
      const instructor = await UserModel.findById(input.primaryInstructorId);
      if (!instructor) throw new NotFoundError('Instructor User', input.primaryInstructorId);
      if (!instructor.globalRoles.some(r => ['instructor', 'admin', 'superadmin'].includes(r))) {
        throw new ValidationError('User does not have instructor privileges.');
      }
      batch.primaryInstructorId = instructor._id;
    }

    if (input.meetingProvider) {
      batch.meetingProvider = input.meetingProvider;
    }

    await batch.save();
    return batch.toSafeDTO();
  }

  /**
   * Finds batch by ID
   */
  static async getBatchById(batchId: string): Promise<IBatchSafeDTO> {
    await connectToDatabase();
    const batch = await BatchModel.findById(batchId);
    if (!batch) throw new NotFoundError('Batch', batchId);
    return batch.toSafeDTO();
  }

  /**
   * Lists batches with optional filtering
   */
  static async listBatches(filter: {
    courseId?: string;
    marketCode?: MarketCode;
    status?: BatchStatus;
    primaryInstructorId?: string;
  }): Promise<IBatchSafeDTO[]> {
    await connectToDatabase();

    const query: any = {};
    if (filter.courseId) query.courseId = filter.courseId;
    if (filter.marketCode) query.marketCode = filter.marketCode;
    if (filter.status) query.status = filter.status;
    if (filter.primaryInstructorId) query.primaryInstructorId = filter.primaryInstructorId;

    const batches = await BatchModel.find(query).sort({ startDate: 1 });
    return batches.map(b => b.toSafeDTO());
  }
}
