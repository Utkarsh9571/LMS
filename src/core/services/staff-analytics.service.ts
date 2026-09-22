import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/core/domain/user.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { OrderModel } from '@/core/domain/order.model';
import { LiveSessionModel } from '@/core/domain/live-session.model';
import { BatchModel } from '@/core/domain/batch.model';
import { AttendanceModel } from '@/core/domain/attendance.model';
import { CertificateModel } from '@/core/domain/certificate.model';
import { ProductModel } from '@/core/domain/product.model';
import { LessonProgressModel } from '@/core/domain/lesson-progress.model';
import { QuizAttemptModel } from '@/core/domain/quiz-attempt.model';
import { AssignmentSubmissionModel } from '@/core/domain/assignment-submission.model';
import { UserRole } from '@/core/domain/domain-types';
import { AuthorizationError, NotFoundError } from '@/lib/errors';

export interface IExecutiveKPIs {
  activeStudents: number;
  revenueByMarket?: Array<{
    marketCode: string;
    currency: string;
    totalMinorUnits: number;
  }>;
  activeServices?: number;
  upcomingWorkshops: number;
  completedWorkshops: number;
  certificatesIssued: number;
}

export interface ILearningAnalytics {
  activeEnrollments: number;
  completedEnrollments: number;
  averageProgress: number;
  courseCompletionCount: number;
  lessonCompletionCount: number;
  quizPassRate: number;
  assignmentPassRate: number;
  certificatesIssued: number;
}

export interface ISalesAnalytics {
  paidOrderCount: number;
  pendingPaymentCount: number;
  failedPaymentCount: number;
  revenueByMarket: Array<{
    marketCode: string;
    currency: string;
    totalMinorUnits: number;
  }>;
  revenueOverTime: Array<{
    period: string;
    marketCode: string;
    currency: string;
    totalMinorUnits: number;
  }>;
  revenueByProduct: Array<{
    productId: string;
    productTitle: string;
    totalMinorUnits: number;
  }>;
}

export interface IWorkshopAnalytics {
  upcomingSessions: number;
  completedSessions: number;
  registeredStudents: number;
  attendedStudents: number;
  attendanceRatio: number;
}

export interface IStaffAnalyticsResponse {
  role: string;
  isGlobalAdmin: boolean;
  executiveKPIs: IExecutiveKPIs;
  learningAnalytics: ILearningAnalytics;
  salesAnalytics: ISalesAnalytics | null;
  workshopAnalytics: IWorkshopAnalytics;
}

export class StaffAnalyticsService {
  /**
   * Computes authoritative analytics scoped by user role.
   * Admin/Superadmin: Global analytics + Sales revenue.
   * Instructor: Analytics strictly scoped to assigned batches/sessions (No sales/revenue data).
   */
  static async getAnalytics(callerId: string): Promise<IStaffAnalyticsResponse> {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(callerId);
    if (!isObjectId) throw new NotFoundError('User', callerId);

    await connectToDatabase();

    const caller = await UserModel.findById(callerId);
    if (!caller) throw new NotFoundError('User', callerId);

    const isGlobalAdmin = caller.globalRoles.some((r: UserRole) =>
      ['admin', 'superadmin', 'staff'].includes(r)
    );
    const isInstructor = caller.globalRoles.includes('instructor');

    if (!isGlobalAdmin && !isInstructor) {
      throw new AuthorizationError('Requires staff or instructor privileges.');
    }

    if (isGlobalAdmin) {
      return this.getGlobalAnalytics(caller);
    } else {
      return this.getInstructorAnalytics(caller);
    }
  }

  /**
   * Computes global operational, learning, sales, and workshop analytics for Admins
   */
  private static async getGlobalAnalytics(caller: any): Promise<IStaffAnalyticsResponse> {
    const now = new Date();

    const [
      activeStudents,
      revenueByMarketRaw,
      activeServices,
      upcomingWorkshops,
      completedWorkshops,
      certificatesIssued,
      activeEnrollments,
      completedEnrollments,
      avgProgressRaw,
      lessonCompletions,
      quizSubmitted,
      quizPassed,
      assignmentGraded,
      assignmentPassed,
      paidOrderCount,
      pendingPaymentCount,
      failedPaymentCount,
      revenueOverTimeRaw,
      revenueByProductRaw,
      totalRegistered,
      totalAttended
    ] = await Promise.all([
      // Executive KPIs
      UserModel.countDocuments({ status: 'active' }),
      OrderModel.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: { marketCode: '$marketCode', currency: '$currency' }, total: { $sum: '$totalMinorUnits' } } }
      ]),
      ProductModel.countDocuments({ status: 'active' }),
      LiveSessionModel.countDocuments({ status: 'scheduled', startTime: { $gte: now } }),
      LiveSessionModel.countDocuments({ status: 'completed' }),
      CertificateModel.countDocuments({ isRevoked: false }),

      // Learning Analytics
      EnrollmentModel.countDocuments({ status: 'active' }),
      EnrollmentModel.countDocuments({ progressPercent: 100 }),
      EnrollmentModel.aggregate([
        { $group: { _id: null, avgProgress: { $avg: '$progressPercent' } } }
      ]),
      LessonProgressModel.countDocuments({ isCompleted: true }),
      QuizAttemptModel.countDocuments({ status: 'submitted' }),
      QuizAttemptModel.countDocuments({ status: 'submitted', isPassed: true }),
      AssignmentSubmissionModel.countDocuments({ status: 'graded' }),
      AssignmentSubmissionModel.countDocuments({ status: 'graded', isPassed: true }),

      // Sales Analytics
      OrderModel.countDocuments({ status: 'paid' }),
      OrderModel.countDocuments({ status: 'pending_payment' }),
      OrderModel.countDocuments({ status: { $in: ['payment_failed', 'fulfillment_failed'] } }),
      OrderModel.aggregate([
        { $match: { status: 'paid' } },
        {
          $group: {
            _id: {
              period: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              marketCode: '$marketCode',
              currency: '$currency'
            },
            total: { $sum: '$totalMinorUnits' }
          }
        },
        { $sort: { '_id.period': 1 } }
      ]),
      OrderModel.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: '$productId', total: { $sum: '$totalMinorUnits' } } }
      ]),

      // Workshop Analytics
      EnrollmentModel.countDocuments({ batchId: { $ne: null }, status: 'active' }),
      AttendanceModel.countDocuments({ status: { $in: ['present', 'late'] } })
    ]);

    // Format revenue by market
    const revenueByMarket = (revenueByMarketRaw || []).map((r: any) => ({
      marketCode: r._id.marketCode,
      currency: r._id.currency,
      totalMinorUnits: r.total || 0
    }));

    // Format revenue over time
    const revenueOverTime = (revenueOverTimeRaw || []).map((r: any) => ({
      period: r._id.period,
      marketCode: r._id.marketCode,
      currency: r._id.currency,
      totalMinorUnits: r.total || 0
    }));

    // Format revenue by product
    const productIds = revenueByProductRaw.map((r: any) => r._id);
    const products = productIds.length > 0 ? await ProductModel.find({ _id: { $in: productIds } }) : [];
    const productMap = new Map(products.map(p => [p._id.toString(), p.title]));

    const revenueByProduct = revenueByProductRaw.map((r: any) => ({
      productId: r._id.toString(),
      productTitle: productMap.get(r._id.toString()) || 'Unknown Product',
      totalMinorUnits: r.total || 0
    }));

    // Calculate rates safely without NaN
    const averageProgress = avgProgressRaw.length > 0 && typeof avgProgressRaw[0].avgProgress === 'number'
      ? Math.round(avgProgressRaw[0].avgProgress)
      : 0;

    const quizPassRate = quizSubmitted > 0 ? Math.round((quizPassed / quizSubmitted) * 100) : 0;
    const assignmentPassRate = assignmentGraded > 0 ? Math.round((assignmentPassed / assignmentGraded) * 100) : 0;
    const attendanceRatio = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

    return {
      role: 'admin',
      isGlobalAdmin: true,
      executiveKPIs: {
        activeStudents,
        revenueByMarket,
        activeServices,
        upcomingWorkshops,
        completedWorkshops,
        certificatesIssued
      },
      learningAnalytics: {
        activeEnrollments,
        completedEnrollments,
        averageProgress,
        courseCompletionCount: completedEnrollments,
        lessonCompletionCount: lessonCompletions,
        quizPassRate,
        assignmentPassRate,
        certificatesIssued
      },
      salesAnalytics: {
        paidOrderCount,
        pendingPaymentCount,
        failedPaymentCount,
        revenueByMarket,
        revenueOverTime,
        revenueByProduct
      },
      workshopAnalytics: {
        upcomingSessions: upcomingWorkshops,
        completedSessions: completedWorkshops,
        registeredStudents: totalRegistered,
        attendedStudents: totalAttended,
        attendanceRatio
      }
    };
  }

  /**
   * Computes scoped analytics for Instructors (Assigned batches/sessions only)
   */
  private static async getInstructorAnalytics(caller: any): Promise<IStaffAnalyticsResponse> {
    const now = new Date();

    // Find assigned batches
    const assignedBatches = await BatchModel.find({ primaryInstructorId: caller._id });
    const batchIds = assignedBatches.map(b => b._id);
    const courseIds = Array.from(new Set(assignedBatches.map(b => b.courseId.toString())));

    if (batchIds.length === 0) {
      return {
        role: 'instructor',
        isGlobalAdmin: false,
        executiveKPIs: {
          activeStudents: 0,
          upcomingWorkshops: 0,
          completedWorkshops: 0,
          certificatesIssued: 0
        },
        learningAnalytics: {
          activeEnrollments: 0,
          completedEnrollments: 0,
          averageProgress: 0,
          courseCompletionCount: 0,
          lessonCompletionCount: 0,
          quizPassRate: 0,
          assignmentPassRate: 0,
          certificatesIssued: 0
        },
        salesAnalytics: null,
        workshopAnalytics: {
          upcomingSessions: 0,
          completedSessions: 0,
          registeredStudents: 0,
          attendedStudents: 0,
          attendanceRatio: 0
        }
      };
    }

    const [
      activeStudentsRaw,
      upcomingWorkshops,
      completedWorkshops,
      certificatesIssued,
      activeEnrollments,
      completedEnrollments,
      avgProgressRaw,
      quizSubmitted,
      quizPassed,
      assignmentGraded,
      assignmentPassed,
      totalAttended
    ] = await Promise.all([
      EnrollmentModel.distinct('userId', { batchId: { $in: batchIds }, status: 'active' }),
      LiveSessionModel.countDocuments({ batchId: { $in: batchIds }, status: 'scheduled', startTime: { $gte: now } }),
      LiveSessionModel.countDocuments({ batchId: { $in: batchIds }, status: 'completed' }),
      CertificateModel.countDocuments({ courseId: { $in: courseIds }, isRevoked: false }),

      EnrollmentModel.countDocuments({ batchId: { $in: batchIds }, status: 'active' }),
      EnrollmentModel.countDocuments({ batchId: { $in: batchIds }, progressPercent: 100 }),
      EnrollmentModel.aggregate([
        { $match: { batchId: { $in: batchIds } } },
        { $group: { _id: null, avgProgress: { $avg: '$progressPercent' } } }
      ]),

      QuizAttemptModel.countDocuments({ status: 'submitted' }),
      QuizAttemptModel.countDocuments({ status: 'submitted', isPassed: true }),
      AssignmentSubmissionModel.countDocuments({ status: 'graded' }),
      AssignmentSubmissionModel.countDocuments({ status: 'graded', isPassed: true }),

      AttendanceModel.countDocuments({ batchId: { $in: batchIds }, status: { $in: ['present', 'late'] } })
    ]);

    const activeStudents = activeStudentsRaw.length;
    const totalRegistered = activeEnrollments;
    const averageProgress = avgProgressRaw.length > 0 && typeof avgProgressRaw[0].avgProgress === 'number'
      ? Math.round(avgProgressRaw[0].avgProgress)
      : 0;

    const quizPassRate = quizSubmitted > 0 ? Math.round((quizPassed / quizSubmitted) * 100) : 0;
    const assignmentPassRate = assignmentGraded > 0 ? Math.round((assignmentPassed / assignmentGraded) * 100) : 0;
    const attendanceRatio = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

    return {
      role: 'instructor',
      isGlobalAdmin: false,
      executiveKPIs: {
        activeStudents,
        upcomingWorkshops,
        completedWorkshops,
        certificatesIssued
      },
      learningAnalytics: {
        activeEnrollments,
        completedEnrollments,
        averageProgress,
        courseCompletionCount: completedEnrollments,
        lessonCompletionCount: 0,
        quizPassRate,
        assignmentPassRate,
        certificatesIssued
      },
      salesAnalytics: null, // Strictly hidden for instructors
      workshopAnalytics: {
        upcomingSessions: upcomingWorkshops,
        completedSessions: completedWorkshops,
        registeredStudents: totalRegistered,
        attendedStudents: totalAttended,
        attendanceRatio
      }
    };
  }
}
