import crypto from 'crypto';
import { connectToDatabase } from '@/lib/db';
import { CertificateModel } from '@/core/domain/certificate.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { CourseModel } from '@/core/domain/course.model';
import { UserModel } from '@/core/domain/user.model';
import { BatchModel } from '@/core/domain/batch.model';
import { LessonModel } from '@/core/domain/lesson.model';
import { QuizModel } from '@/core/domain/quiz.model';
import { QuizAttemptModel } from '@/core/domain/quiz-attempt.model';
import { AssignmentModel } from '@/core/domain/assignment.model';
import { AssignmentSubmissionModel } from '@/core/domain/assignment-submission.model';
import {
  ICertificateSafeDTO,
  ICertificatePublicVerificationDTO,
  MarketCode
} from '@/core/domain/domain-types';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError
} from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface CertificateEligibilityResult {
  isEligible: boolean;
  enrollmentId: string;
  reasons: string[];
  courseProgressPercent: number;
  unpassedQuizzes: string[];
  unpassedAssignments: string[];
}

export class CertificateService {
  /**
   * Evaluates certificate eligibility for an enrollment:
   * 1. Active enrollment
   * 2. 100% course progress
   * 3. All required published quizzes in the course passed for this exact enrollmentId
   * 4. All required published assignments in the course passed for this exact enrollmentId
   */
  static async evaluateEligibility(
    enrollmentId: string,
    userId?: string
  ): Promise<CertificateEligibilityResult> {
    await connectToDatabase();

    const enrollment = await EnrollmentModel.findById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundError('Enrollment', enrollmentId);
    }

    // If userId provided, enforce ownership
    if (userId && enrollment.userId.toString() !== userId) {
      throw new AuthorizationError('You do not own this enrollment.');
    }

    const reasons: string[] = [];
    const unpassedQuizzes: string[] = [];
    const unpassedAssignments: string[] = [];

    if (enrollment.status !== 'active' && enrollment.status !== 'completed') {
      reasons.push(`Enrollment is not active (current status: ${enrollment.status}).`);
    }

    if (enrollment.progressPercent < 100) {
      reasons.push(`Curriculum progress is ${enrollment.progressPercent}%, must be 100%.`);
    }

    // Required published quizzes — resolved via canonical Course → Module → Lesson hierarchy.
    // Only published Quiz documents attached to valid canonical course lessons count.
    // A published Quiz document not linked to any lesson in this course is excluded.
    const quizLessons = await LessonModel.find({
      courseId: enrollment.courseId,
      contentType: 'quiz'
    }).select('_id');
    const quizLessonIds = quizLessons.map((l) => l._id);

    const publishedQuizzes = await QuizModel.find({
      lessonId: { $in: quizLessonIds },
      status: 'published'
    });

    for (const q of publishedQuizzes) {
      const hasPassed = await QuizAttemptModel.exists({
        enrollmentId: enrollment._id,
        quizId: q._id,
        isPassed: true
      });
      if (!hasPassed) {
        unpassedQuizzes.push(q.title);
      }
    }

    if (unpassedQuizzes.length > 0) {
      reasons.push(`Quizzes not yet passed: ${unpassedQuizzes.join(', ')}.`);
    }

    // Required published assignments — same canonical hierarchy resolution.
    const assignmentLessons = await LessonModel.find({
      courseId: enrollment.courseId,
      contentType: 'assignment'
    }).select('_id');
    const assignmentLessonIds = assignmentLessons.map((l) => l._id);

    const publishedAssignments = await AssignmentModel.find({
      lessonId: { $in: assignmentLessonIds },
      status: 'published'
    });

    for (const a of publishedAssignments) {
      const hasPassed = await AssignmentSubmissionModel.exists({
        enrollmentId: enrollment._id,
        assignmentId: a._id,
        isPassed: true
      });
      if (!hasPassed) {
        unpassedAssignments.push(a.title);
      }
    }

    if (unpassedAssignments.length > 0) {
      reasons.push(`Assignments not yet passed: ${unpassedAssignments.join(', ')}.`);
    }

    const isEligible = reasons.length === 0;

    return {
      isEligible,
      enrollmentId,
      reasons,
      courseProgressPercent: enrollment.progressPercent,
      unpassedQuizzes,
      unpassedAssignments
    };
  }

  /**
   * Issue a certificate idempotently for an enrollment.
   * If already issued for this enrollmentId, returns existing certificate.
   */
  static async issueCertificate(
    enrollmentId: string,
    requestedUserId?: string
  ): Promise<ICertificateSafeDTO> {
    await connectToDatabase();

    const existingCert = await CertificateModel.findOne({ enrollmentId });
    if (existingCert) {
      return existingCert.toSafeDTO();
    }

    // Evaluate eligibility
    const eligibility = await this.evaluateEligibility(enrollmentId, requestedUserId);
    if (!eligibility.isEligible) {
      throw new ValidationError(
        `Enrollment not eligible for certificate: ${eligibility.reasons.join(' ')}`
      );
    }

    const enrollment = await EnrollmentModel.findById(enrollmentId);
    if (!enrollment) throw new NotFoundError('Enrollment', enrollmentId);

    const user = await UserModel.findById(enrollment.userId);
    if (!user) throw new NotFoundError('User', enrollment.userId.toString());

    const course = await CourseModel.findById(enrollment.courseId);
    if (!course) throw new NotFoundError('Course', enrollment.courseId.toString());

    let batch = null;
    let instructor = null;
    let marketCode: MarketCode = 'SG';

    if (enrollment.batchId) {
      batch = await BatchModel.findById(enrollment.batchId);
      if (batch) {
        marketCode = batch.marketCode;
        if (batch.primaryInstructorId) {
          instructor = await UserModel.findById(batch.primaryInstructorId);
        }
      }
    } else {
      marketCode = (user.lastActiveMarket as MarketCode) || 'SG';
    }

    // Generate unique Certificate Number: CERT-YYYY-MARKET-XXXXXX
    const year = new Date().getFullYear();
    let certificateNumber = '';
    let isUnique = false;
    let retries = 5;

    while (!isUnique && retries > 0) {
      const randToken = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 hex chars
      certificateNumber = `CERT-${year}-${marketCode}-${randToken}`;
      const exists = await CertificateModel.exists({ certificateNumber });
      if (!exists) {
        isUnique = true;
      } else {
        retries--;
      }
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique certificate identifier.');
    }

    const verificationUrl = `/verify/${certificateNumber}`;

    try {
      const certificate = await CertificateModel.create({
        certificateNumber,
        enrollmentId: enrollment._id,
        userId: user._id,
        courseId: course._id,
        batchId: batch ? batch._id : null,
        marketCode,
        studentSnapshot: {
          fullName: user.fullName,
          email: user.email
        },
        courseSnapshot: {
          title: course.title,
          slug: course.slug,
          estimatedHours: course.estimatedHours
        },
        batchSnapshot: batch
          ? {
              code: batch.code,
              name: batch.name,
              completedAt: batch.endDate ? batch.endDate.toISOString() : null
            }
          : null,
        primaryInstructorSnapshot: instructor
          ? {
              fullName: instructor.fullName
            }
          : null,
        issuedAt: new Date(),
        verificationUrl
      });

      logger.info('[CertificateService] Issued certificate', {
        certificateNumber,
        enrollmentId,
        userId: user._id.toString()
      });

      return certificate.toSafeDTO();
    } catch (err: any) {
      if (err?.code === 11000) {
        // Concurrently created for this enrollment, return existing
        const existing = await CertificateModel.findOne({ enrollmentId });
        if (existing) return existing.toSafeDTO();
      }
      throw err;
    }
  }

  /**
   * Get certificate by certificateNumber for public verification.
   * Strips private student email/phone (PII safe).
   */
  static async verifyCertificatePublicly(
    certificateNumber: string
  ): Promise<ICertificatePublicVerificationDTO | null> {
    await connectToDatabase();

    const cert = await CertificateModel.findOne({ certificateNumber });
    if (!cert) {
      return null;
    }

    return {
      certificateNumber: cert.certificateNumber,
      isValid: !cert.isRevoked,
      studentName: cert.studentSnapshot.fullName,
      courseTitle: cert.courseSnapshot.title,
      deliveryMode: cert.batchId ? 'cohort_batch' : 'self_paced',
      batchName: cert.batchSnapshot ? cert.batchSnapshot.name : null,
      marketCode: cert.marketCode,
      issuedAt: cert.issuedAt.toISOString(),
      primaryInstructorName: cert.primaryInstructorSnapshot
        ? cert.primaryInstructorSnapshot.fullName
        : null
    };
  }

  /**
   * Get certificate for an enrollment
   */
  static async getCertificateByEnrollment(
    enrollmentId: string
  ): Promise<ICertificateSafeDTO | null> {
    await connectToDatabase();
    const cert = await CertificateModel.findOne({ enrollmentId });
    return cert ? cert.toSafeDTO() : null;
  }

  /**
   * Revoke a certificate. Admin/superadmin only.
   * Idempotent: if already revoked, returns current state without error.
   * Does NOT delete the certificate — the issuance record is preserved.
   */
  static async revokeCertificate(
    certId: string,
    revokedByUserId: string,
    revocationReason?: string
  ): Promise<ICertificateSafeDTO> {
    await connectToDatabase();

    const cert = await CertificateModel.findById(certId);
    if (!cert) throw new NotFoundError('Certificate', certId);

    // Idempotent: already revoked — return current state
    if (cert.isRevoked) {
      logger.info('[CertificateService] Revocation requested for already-revoked certificate (idempotent)', {
        certId,
        certificateNumber: cert.certificateNumber
      });
      return cert.toSafeDTO();
    }

    cert.isRevoked = true;
    cert.revokedAt = new Date();
    await cert.save();

    logger.info('[CertificateService] Certificate revoked', {
      certId,
      certificateNumber: cert.certificateNumber,
      revokedByUserId,
      revocationReason: revocationReason ?? 'not provided'
    });

    return cert.toSafeDTO();
  }
}
