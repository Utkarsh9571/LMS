import { connectToDatabase } from '@/lib/db';
import { LessonModel } from '@/core/domain/lesson.model';
import { ModuleModel } from '@/core/domain/module.model';
import { EntitlementModel } from '@/core/domain/entitlement.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import {
  ILessonAccessEvaluation
} from '@/core/domain/domain-types';

import { AuthorizationError, AuthenticationError, NotFoundError } from '@/lib/errors';


export class AccessService {
  /**
   * Evaluates lesson access for a user.
   * Logic:
   * 1. If lesson.isPreviewFree === true -> GRANTED immediately (even without authentication).
   * 2. If user is not provided -> DENIED ('unauthenticated').
   * 3. Checks active non-expired Entitlement for course -> if missing, DENIED ('no_entitlement').
   * 4. Checks active Enrollment for course -> if missing or inactive, DENIED ('inactive_enrollment' or 'no_entitlement').
   * 5. Evaluates drip unlock schedule:
   *    effectiveDripDays = lesson.unlockOverrideDays ?? module.dripDaysAfterEnrollment ?? 0
   *    unlockTime = enrollment.enrolledAt.getTime() + effectiveDripDays * 86400000
   *    if now < unlockTime -> DENIED ('drip_locked').
   * 6. Otherwise -> GRANTED.
   */
  static async canAccessLesson(
    userId: string | null | undefined,
    lessonId: string,
    now: Date = new Date()
  ): Promise<ILessonAccessEvaluation> {
    await connectToDatabase();

    const lesson = await LessonModel.findById(lessonId);
    if (!lesson) {
      return { granted: false, reason: 'not_found' };
    }

    // 1. Preview Free lessons bypass all entitlement and enrollment gates
    if (lesson.isPreviewFree) {
      return { granted: true };
    }

    // 2. Authentication check
    if (!userId) {
      return { granted: false, reason: 'unauthenticated' };
    }

    const courseId = lesson.courseId.toString();

    // 3. Verify Active Entitlement for Course
    // Path A: User holds direct active Course Entitlement
    let hasActiveEntitlement = false;
    let effectiveEnrollment = await EnrollmentModel.findOne({
      userId,
      courseId,
      status: 'active'
    });

    const courseEntitlement = await EntitlementModel.findOne({
      userId,
      targetType: 'course',
      targetId: courseId,
      status: 'active'
    });

    if (courseEntitlement && courseEntitlement.isAccessValid(now)) {
      hasActiveEntitlement = true;
    }

    // Path B: User holds an active Batch Entitlement backing an active Batch Enrollment for this course
    if (!hasActiveEntitlement) {
      const batchEnrollments = await EnrollmentModel.find({
        userId,
        courseId,
        batchId: { $ne: null },
        status: 'active'
      });

      for (const bEnroll of batchEnrollments) {
        const batchEntitlement = await EntitlementModel.findById(bEnroll.entitlementId);
        if (
          batchEntitlement &&
          batchEntitlement.status === 'active' &&
          batchEntitlement.isAccessValid(now)
        ) {
          hasActiveEntitlement = true;
          effectiveEnrollment = bEnroll;
          break;
        }
      }
    }

    if (!hasActiveEntitlement) {
      return { granted: false, reason: 'no_entitlement' };
    }

    // 4. Verify Active Enrollment for Course
    const enrollment = effectiveEnrollment;
    if (!enrollment || enrollment.status !== 'active') {
      return {
        granted: false,
        reason: enrollment ? 'inactive_enrollment' : 'no_entitlement'
      };
    }

    // 5. Evaluate Drip Content Unlocking
    const moduleDoc = await ModuleModel.findById(lesson.moduleId);
    const moduleDripDays = moduleDoc?.dripDaysAfterEnrollment || 0;
    const effectiveDripDays = typeof lesson.unlockOverrideDays === 'number'
      ? lesson.unlockOverrideDays
      : moduleDripDays;

    if (effectiveDripDays > 0) {
      const unlockTime = enrollment.enrolledAt.getTime() + effectiveDripDays * 24 * 60 * 60 * 1000;
      const currentTime = now.getTime();

      if (currentTime < unlockTime) {
        const daysRemaining = Math.ceil((unlockTime - currentTime) / (1000 * 60 * 60 * 24));
        return {
          granted: false,
          reason: 'drip_locked',
          unlocksAt: new Date(unlockTime),
          daysRemaining
        };
      }
    }

    return { granted: true };
  }

  /**
   * Throws AuthorizationError if student cannot access the lesson
   */
  static async requireLessonAccess(
    userId: string,
    lessonId: string,
    now: Date = new Date()
  ): Promise<void> {
    const evaluation = await this.canAccessLesson(userId, lessonId, now);
    if (!evaluation.granted) {
      if (evaluation.reason === 'unauthenticated') {
        throw new AuthenticationError('Authentication required to access protected lesson.');
      }
      if (evaluation.reason === 'drip_locked') {
        const dateStr = evaluation.unlocksAt ? evaluation.unlocksAt.toISOString() : 'later';
        throw new AuthorizationError(`This lesson is drip locked until ${dateStr}.`);
      }

      if (evaluation.reason === 'expired_entitlement') {
        throw new AuthorizationError('Your course entitlement has expired.');
      }
      if (evaluation.reason === 'inactive_enrollment') {
        throw new AuthorizationError('Your enrollment in this course is inactive.');
      }
      if (evaluation.reason === 'not_found') {
        throw new NotFoundError('Lesson', lessonId);
      }
      throw new AuthorizationError('You do not have an active enrollment or entitlement for this course.');
    }
  }

  /**
   * Evaluates if user can access course-level student resources
   */
  static async canAccessCourse(
    userId: string,
    courseId: string,
    now: Date = new Date()
  ): Promise<boolean> {
    await connectToDatabase();

    // 1. Direct course entitlement
    const entitlement = await EntitlementModel.findOne({
      userId,
      targetType: 'course',
      targetId: courseId,
      status: 'active'
    });

    if (entitlement && entitlement.isAccessValid(now)) {
      const enrollment = await EnrollmentModel.findOne({
        userId,
        courseId,
        status: 'active'
      });
      if (enrollment) return true;
    }

    // 2. Active Batch Entitlement backing an active batch enrollment
    const batchEnrollments = await EnrollmentModel.find({
      userId,
      courseId,
      batchId: { $ne: null },
      status: 'active'
    });

    for (const bEnroll of batchEnrollments) {
      const batchEntitlement = await EntitlementModel.findById(bEnroll.entitlementId);
      if (
        batchEntitlement &&
        batchEntitlement.status === 'active' &&
        batchEntitlement.isAccessValid(now)
      ) {
        return true;
      }
    }

    return false;
  }
}
