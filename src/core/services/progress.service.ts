import { connectToDatabase } from '@/lib/db';
import { LessonProgressModel } from '@/core/domain/lesson-progress.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';

import { LessonModel } from '@/core/domain/lesson.model';
import { AccessService } from './access.service';
import {
  ILessonProgressSafeDTO,
  LessonProgressStatus
} from '@/core/domain/domain-types';
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface RecordProgressInput {
  secondsWatched?: number;
  isCompleted?: boolean;
}

export class ProgressService {
  /**
   * Records or updates progress for a specific lesson by an enrolled student.
   * Validates access and recalculates course progress percent atomically.
   */
  static async recordLessonProgress(
    userId: string,
    courseId: string,
    lessonId: string,
    input: RecordProgressInput
  ): Promise<{ progress: ILessonProgressSafeDTO; courseProgressPercent: number; isCourseCompleted: boolean }> {
    await connectToDatabase();

    // Verify lesson belongs to course
    const lesson = await LessonModel.findOne({ _id: lessonId, courseId });
    if (!lesson) {
      throw new NotFoundError('Lesson in Course', `${lessonId} in Course ${courseId}`);
    }

    // Require active lesson access
    await AccessService.requireLessonAccess(userId, lessonId);

    // Active enrollment is required for recording progress
    const enrollment = await EnrollmentModel.findOne({
      userId,
      courseId,
      status: 'active'
    });

    if (!enrollment) {
      throw new AuthorizationError('Active enrollment required to record progress.');
    }

    // Validate inputs
    if (input.secondsWatched !== undefined) {
      if (typeof input.secondsWatched !== 'number' || input.secondsWatched < 0) {
        throw new ValidationError('secondsWatched must be a non-negative number.');
      }
    }

    let progressDoc = await LessonProgressModel.findOne({
      enrollmentId: enrollment._id,
      lessonId
    });

    const now = new Date();

    if (!progressDoc) {
      const isCompleted = Boolean(input.isCompleted);
      const status: LessonProgressStatus = isCompleted
        ? 'completed'
        : (input.secondsWatched && input.secondsWatched > 0 ? 'in_progress' : 'not_started');

      progressDoc = await LessonProgressModel.create({
        enrollmentId: enrollment._id,
        userId,
        courseId,
        lessonId,
        status,
        secondsWatched: input.secondsWatched || 0,
        isCompleted,
        completedAt: isCompleted ? now : null
      });
    } else {
      if (input.secondsWatched !== undefined && input.secondsWatched > progressDoc.secondsWatched) {
        progressDoc.secondsWatched = input.secondsWatched;
      }

      if (input.isCompleted !== undefined) {
        if (input.isCompleted && !progressDoc.isCompleted) {
          progressDoc.isCompleted = true;
          progressDoc.status = 'completed';
          progressDoc.completedAt = now;
        } else if (!input.isCompleted && progressDoc.isCompleted) {
          // Idempotent completion: Once marked completed, cannot uncomplete accidentally unless explicit reset
          // But allow update if explicitly setting false
          progressDoc.isCompleted = false;
          progressDoc.status = progressDoc.secondsWatched > 0 ? 'in_progress' : 'not_started';
          progressDoc.completedAt = null;
        }
      } else if (progressDoc.secondsWatched > 0 && progressDoc.status === 'not_started') {
        progressDoc.status = 'in_progress';
      }

      await progressDoc.save();
    }

    // Recalculate course completion progress
    const { progressPercent, isCompleted: isCourseCompleted } = await this.recalculateCourseProgress(
      enrollment._id.toString(),
      courseId
    );

    return {
      progress: progressDoc.toSafeDTO(),
      courseProgressPercent: progressPercent,
      isCourseCompleted
    };
  }

  /**
   * Recalculates course progress percentage:
   * progressPercent = (completed eligible lessons / total eligible lessons) * 100
   * Idempotently stamps completedAt when progress reaches 100%.
   */
  static async recalculateCourseProgress(
    enrollmentId: string,
    courseId: string
  ): Promise<{ progressPercent: number; isCompleted: boolean }> {
    await connectToDatabase();

    const enrollment = await EnrollmentModel.findById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundError('Enrollment', enrollmentId);
    }

    // Total eligible lessons in the course
    const totalLessonsCount = await LessonModel.countDocuments({ courseId });

    if (totalLessonsCount === 0) {
      // Division by zero guard
      enrollment.progressPercent = 0;
      await enrollment.save();
      return { progressPercent: 0, isCompleted: false };
    }

    // Completed lessons for this enrollment
    const completedLessonsCount = await LessonProgressModel.countDocuments({
      enrollmentId,
      isCompleted: true
    });

    const calculatedPercent = Math.min(
      100,
      Math.round((completedLessonsCount / totalLessonsCount) * 100)
    );

    enrollment.progressPercent = calculatedPercent;

    let isCompleted = false;
    if (calculatedPercent === 100) {
      isCompleted = true;
      if (!enrollment.completedAt) {
        enrollment.completedAt = new Date();
      }
      // Note: we preserve enrollment status as active or completed per documentation
      // docs/DATABASE_SCHEMA.md defines status: 'active' | 'completed' | 'dropped'
    }

    await enrollment.save();

    logger.info('Course progress updated', {
      enrollmentId,
      courseId,
      completedLessonsCount,
      totalLessonsCount,
      calculatedPercent
    });

    return { progressPercent: calculatedPercent, isCompleted };
  }

  /**
   * Retrieves all lesson progress records for an enrollment
   */
  static async getEnrollmentProgress(enrollmentId: string): Promise<ILessonProgressSafeDTO[]> {
    await connectToDatabase();
    const records = await LessonProgressModel.find({ enrollmentId });
    return records.map(r => r.toSafeDTO());
  }
}
