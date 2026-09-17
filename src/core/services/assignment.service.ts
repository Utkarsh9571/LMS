import mongoose from 'mongoose';
import crypto from 'crypto';
import path from 'path';
import { connectToDatabase } from '@/lib/db';
import { AssignmentModel, IAssignmentDocument } from '@/core/domain/assignment.model';
import {
  AssignmentSubmissionModel,
  IAssignmentSubmissionDocument
} from '@/core/domain/assignment-submission.model';
import { LessonModel } from '@/core/domain/lesson.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { BatchModel } from '@/core/domain/batch.model';
import { ProgressService } from './progress.service';
import { MockStorageProvider } from '@/providers/storage/mock-storage.provider';
import { IStorageProvider } from '@/providers/storage/storage-provider.interface';
import {
  IAssignmentSafeDTO,
  IAssignmentSubmissionSafeDTO
} from '@/core/domain/domain-types';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError
} from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface CreateAssignmentInput {
  courseId: string;
  lessonId: string;
  title: string;
  instructionsMarkdown: string;
  passingScorePercent?: number;
  maxScore?: number;
  maxSubmissions?: number;
  allowedFileExtensions?: string[];
  maxFileSizeBytes?: number;
  dueDate?: Date | null;
}

export interface UpdateAssignmentInput {
  title?: string;
  instructionsMarkdown?: string;
  status?: 'draft' | 'published' | 'archived';
  passingScorePercent?: number;
  maxScore?: number;
  maxSubmissions?: number;
  allowedFileExtensions?: string[];
  maxFileSizeBytes?: number;
  dueDate?: Date | null;
}

export interface InitiateUploadInput {
  assignmentId: string;
  enrollmentId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}

export interface CreateSubmissionInput {
  assignmentId: string;
  enrollmentId: string;
  storageKey: string;
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
  studentNotes?: string;
}

export interface GradeSubmissionInput {
  submissionId: string;
  graderId: string;
  score: number;
  feedbackMarkdown?: string;
  requestedResubmission?: boolean;
}

export class AssignmentService {
  private static storageProvider: IStorageProvider = new MockStorageProvider();

  public static setStorageProvider(provider: IStorageProvider) {
    this.storageProvider = provider;
  }

  /**
   * Helper to execute operations within a MongoDB ClientSession transaction
   * where supported, falling back gracefully with explicit warning on standalone instances.
   */
  private static async executeWithTransaction<T>(
    fn: (session: mongoose.ClientSession) => Promise<T>,
    fallbackFn: () => Promise<T>
  ): Promise<T> {
    const session = await mongoose.startSession();
    try {
      let result: T | undefined;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result as T;
    } catch (err: any) {
      if (
        err?.code === 20 ||
        err?.codeName === 'IllegalOperation' ||
        err?.message?.includes('Transaction numbers are only allowed on a replica set member or mongos')
      ) {
        logger.warn(
          '[AssignmentService] MongoDB replica set transactions not supported by current topology. Falling back to sequential execution (non-atomic standalone mode).'
        );
        return await fallbackFn();
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Create an assignment attached to an assignment lesson
   */
  static async createAssignment(input: CreateAssignmentInput): Promise<IAssignmentSafeDTO> {
    await connectToDatabase();

    const { courseId, lessonId, title, instructionsMarkdown } = input;
    if (!courseId) throw new ValidationError('courseId is required.');
    if (!lessonId) throw new ValidationError('lessonId is required.');
    if (!title?.trim()) throw new ValidationError('title is required.');
    if (!instructionsMarkdown?.trim()) throw new ValidationError('instructionsMarkdown is required.');

    const lesson = await LessonModel.findOne({ _id: lessonId, courseId });
    if (!lesson) {
      throw new NotFoundError('Lesson in Course', `${lessonId} in Course ${courseId}`);
    }
    if (lesson.contentType !== 'assignment') {
      throw new ValidationError(
        `Lesson ${lessonId} has contentType '${lesson.contentType}', must be 'assignment'.`
      );
    }

    const existingAssignment = await AssignmentModel.findOne({ lessonId });
    if (existingAssignment) {
      throw new ValidationError(`An assignment is already attached to lesson ${lessonId}.`);
    }

    const assignment = await AssignmentModel.create({
      courseId,
      lessonId,
      title: title.trim(),
      instructionsMarkdown: instructionsMarkdown.trim(),
      status: 'draft',
      passingScorePercent: input.passingScorePercent ?? 70,
      maxScore: input.maxScore ?? 100,
      maxSubmissions: input.maxSubmissions ?? 0,
      allowedFileExtensions: input.allowedFileExtensions ?? ['.pdf', '.zip'],
      maxFileSizeBytes: input.maxFileSizeBytes ?? 52428800,
      dueDate: input.dueDate || null
    });

    lesson.contentData = { ...lesson.contentData, assignmentId: assignment._id.toString() };
    await lesson.save();

    logger.info('[AssignmentService] Created assignment', {
      assignmentId: assignment._id.toString(),
      lessonId
    });
    return assignment.toSafeDTO();
  }

  /**
   * Update assignment details
   */
  static async updateAssignment(
    assignmentId: string,
    input: UpdateAssignmentInput
  ): Promise<IAssignmentSafeDTO> {
    await connectToDatabase();

    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) throw new NotFoundError('Assignment', assignmentId);

    if (input.title !== undefined) {
      if (!input.title.trim()) throw new ValidationError('title cannot be empty.');
      assignment.title = input.title.trim();
    }
    if (input.instructionsMarkdown !== undefined) {
      if (!input.instructionsMarkdown.trim()) throw new ValidationError('instructionsMarkdown cannot be empty.');
      assignment.instructionsMarkdown = input.instructionsMarkdown.trim();
    }
    if (input.status !== undefined) {
      if (!['draft', 'published', 'archived'].includes(input.status)) {
        throw new ValidationError(`Invalid status: ${input.status}`);
      }
      assignment.status = input.status;
    }
    if (input.passingScorePercent !== undefined) {
      if (input.passingScorePercent < 1 || input.passingScorePercent > 100) {
        throw new ValidationError('passingScorePercent must be between 1 and 100.');
      }
      assignment.passingScorePercent = input.passingScorePercent;
    }
    if (input.maxScore !== undefined) {
      if (input.maxScore < 1) throw new ValidationError('maxScore must be at least 1.');
      assignment.maxScore = input.maxScore;
    }
    if (input.maxSubmissions !== undefined) {
      if (input.maxSubmissions < 0) throw new ValidationError('maxSubmissions cannot be negative.');
      assignment.maxSubmissions = input.maxSubmissions;
    }
    if (input.allowedFileExtensions !== undefined) {
      assignment.allowedFileExtensions = input.allowedFileExtensions;
    }
    if (input.maxFileSizeBytes !== undefined) {
      if (input.maxFileSizeBytes < 1024) throw new ValidationError('maxFileSizeBytes must be at least 1KB.');
      assignment.maxFileSizeBytes = input.maxFileSizeBytes;
    }
    if (input.dueDate !== undefined) {
      assignment.dueDate = input.dueDate;
    }

    await assignment.save();
    return assignment.toSafeDTO();
  }

  /**
   * Get assignment by ID
   */
  static async getAssignment(assignmentId: string): Promise<IAssignmentSafeDTO> {
    await connectToDatabase();
    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) throw new NotFoundError('Assignment', assignmentId);
    return assignment.toSafeDTO();
  }

  /**
   * Get assignment by Lesson ID
   */
  static async getAssignmentByLesson(lessonId: string): Promise<IAssignmentSafeDTO> {
    await connectToDatabase();
    const assignment = await AssignmentModel.findOne({ lessonId });
    if (!assignment) throw new NotFoundError('Assignment for Lesson', lessonId);
    return assignment.toSafeDTO();
  }

  /**
   * Server-governed upload initiation:
   * Validates enrollment ownership, file size, extension, and generates an unguessable storage key.
   * Note: Extension and MIME type checks validate metadata only and do not constitute antivirus/content scanning.
   */
  static async initiateUpload(
    userId: string,
    input: InitiateUploadInput
  ): Promise<{ uploadUrl: string; fileUrl: string; storageKey: string; fields?: Record<string, string> }> {
    await connectToDatabase();

    const { assignmentId, enrollmentId, fileName, fileSizeBytes, mimeType } = input;

    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) throw new NotFoundError('Assignment', assignmentId);
    if (assignment.status !== 'published') {
      throw new ValidationError('Assignment is not published.');
    }

    // Validate enrollment ownership and course context
    const enrollment = await EnrollmentModel.findOne({
      _id: enrollmentId,
      userId,
      courseId: assignment.courseId,
      status: 'active'
    });
    if (!enrollment) {
      throw new AuthorizationError('Active enrollment matching course context is required.');
    }

    // Validate submission limits
    if (assignment.maxSubmissions > 0) {
      const submissionCount = await AssignmentSubmissionModel.countDocuments({
        enrollmentId,
        assignmentId
      });
      if (submissionCount >= assignment.maxSubmissions) {
        throw new ValidationError(`Maximum submissions limit (${assignment.maxSubmissions}) reached.`);
      }
    }

    // Validate file size
    if (fileSizeBytes <= 0) {
      throw new ValidationError('File size must be positive.');
    }
    if (fileSizeBytes > assignment.maxFileSizeBytes) {
      throw new ValidationError(
        `File size (${fileSizeBytes} bytes) exceeds limit of ${assignment.maxFileSizeBytes} bytes.`
      );
    }

    // Validate file extension
    const ext = path.extname(fileName).toLowerCase();
    if (!ext || !assignment.allowedFileExtensions.map((e) => e.toLowerCase()).includes(ext)) {
      throw new ValidationError(
        `File extension '${ext}' is not allowed. Allowed: ${assignment.allowedFileExtensions.join(', ')}`
      );
    }

    // Server generates storage key: uploads/{userId}/{assignmentId}/{randomToken}{ext}
    const token = crypto.randomBytes(16).toString('hex');
    const storageKey = `uploads/${userId}/${assignmentId}/${token}${ext}`;

    const uploadResult = await this.storageProvider.getSignedUploadUrl(storageKey, mimeType, false);

    logger.info('[AssignmentService] Initiated upload', {
      userId,
      assignmentId,
      storageKey
    });

    return {
      uploadUrl: uploadResult.uploadUrl,
      fileUrl: uploadResult.fileUrl,
      storageKey,
      fields: uploadResult.fields
    };
  }

  /**
   * Submit assignment after upload completes.
   * Enforces server-generated storage key ownership prefix (uploads/{userId}/{assignmentId}/...)
   */
  static async submitAssignment(
    userId: string,
    input: CreateSubmissionInput
  ): Promise<IAssignmentSubmissionSafeDTO> {
    await connectToDatabase();

    const { assignmentId, enrollmentId, storageKey, originalFileName, fileSizeBytes, mimeType, studentNotes } =
      input;

    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) throw new NotFoundError('Assignment', assignmentId);

    // Enforce that storageKey was generated for this user and assignment
    const expectedPrefix = `uploads/${userId}/${assignmentId}/`;
    if (!storageKey.startsWith(expectedPrefix)) {
      throw new AuthorizationError('Invalid storage key or storage key not owned by user.');
    }

    // Check if this storageKey has already been used (prevent duplicate key submission)
    const existingSubmissionWithKey = await AssignmentSubmissionModel.findOne({ storageKey });
    if (existingSubmissionWithKey) {
      throw new ValidationError('This uploaded file key has already been submitted.');
    }

    // Validate enrollment ownership and course context
    const enrollment = await EnrollmentModel.findOne({
      _id: enrollmentId,
      userId,
      courseId: assignment.courseId,
      status: 'active'
    });
    if (!enrollment) {
      throw new AuthorizationError('Active enrollment matching course context is required.');
    }

    // Check submission count against maxSubmissions
    if (assignment.maxSubmissions > 0) {
      const existingCount = await AssignmentSubmissionModel.countDocuments({
        enrollmentId,
        assignmentId
      });
      if (existingCount >= assignment.maxSubmissions) {
        throw new ValidationError(`Maximum submissions limit (${assignment.maxSubmissions}) reached.`);
      }
    }

    // Calculate submissionNumber with concurrency retry
    let submissionDoc: IAssignmentSubmissionDocument | null = null;
    let retries = 3;

    while (retries > 0) {
      try {
        const lastSub = await AssignmentSubmissionModel.findOne({ enrollmentId, assignmentId })
          .sort({ submissionNumber: -1 })
          .select('submissionNumber');

        const nextNumber = lastSub ? lastSub.submissionNumber + 1 : 1;

        submissionDoc = await AssignmentSubmissionModel.create({
          assignmentId,
          lessonId: assignment.lessonId,
          enrollmentId,
          userId,
          submissionNumber: nextNumber,
          status: 'submitted',
          storageKey,
          originalFileName: originalFileName.trim(),
          fileSizeBytes,
          mimeType,
          studentNotes: studentNotes?.trim(),
          submittedAt: new Date()
        });
        break;
      } catch (err: any) {
        if (err?.code === 11000 && retries > 1) {
          retries--;
          await new Promise((r) => setTimeout(r, 50));
          continue;
        }
        throw err;
      }
    }

    if (!submissionDoc) {
      throw new Error('Failed to record submission due to concurrent submission conflict.');
    }

    const downloadUrl = await this.storageProvider.getReadUrl(storageKey);
    return submissionDoc.toSafeDTO(downloadUrl);
  }

  /**
   * Instructor / Admin grading workflow:
   * Calculates score/percentage/isPassed server-side, validates grader authority over the student's batch,
   * and triggers transactional ProgressService update upon passing grade.
   */
  static async gradeSubmission(
    userContext: { userId: string; roles: string[] },
    input: GradeSubmissionInput
  ): Promise<IAssignmentSubmissionSafeDTO> {
    await connectToDatabase();

    const { submissionId, graderId, score, feedbackMarkdown, requestedResubmission } = input;

    const submission = await AssignmentSubmissionModel.findById(submissionId);
    if (!submission) throw new NotFoundError('Assignment Submission', submissionId);

    const assignment = await AssignmentModel.findById(submission.assignmentId);
    if (!assignment) throw new NotFoundError('Assignment', submission.assignmentId.toString());

    // Validate grader authority
    const isGlobalStaff =
      userContext.roles.includes('superadmin') ||
      userContext.roles.includes('admin') ||
      userContext.roles.includes('staff');

    if (!isGlobalStaff) {
      if (userContext.roles.includes('instructor')) {
        // Must verify instructor is primary instructor of student's batch
        const enrollment = await EnrollmentModel.findById(submission.enrollmentId);
        if (!enrollment || !enrollment.batchId) {
          throw new AuthorizationError('Instructor not authorized to grade self-paced student.');
        }
        const batch = await BatchModel.findOne({
          _id: enrollment.batchId,
          primaryInstructorId: userContext.userId
        });
        if (!batch) {
          throw new AuthorizationError('Instructor not assigned to this student batch.');
        }
      } else {
        throw new AuthorizationError('Insufficient permissions to grade assignments.');
      }
    }

    // Validate score bounds
    if (typeof score !== 'number' || score < 0 || score > assignment.maxScore) {
      throw new ValidationError(`Score must be between 0 and maxScore (${assignment.maxScore}).`);
    }

    // Server-side calculation of percentage and isPassed
    const percentageScore =
      assignment.maxScore > 0 ? Math.round((score / assignment.maxScore) * 100) : 0;
    const isPassed = percentageScore >= assignment.passingScorePercent;

    const now = new Date();
    submission.graderId = new mongoose.Types.ObjectId(graderId);
    submission.gradedAt = now;
    submission.score = score;
    submission.percentageScore = percentageScore;
    submission.isPassed = isPassed;
    submission.feedbackMarkdown = feedbackMarkdown?.trim() || null;
    submission.status = requestedResubmission ? 'resubmission_requested' : 'graded';

    if (isPassed) {
      // Multi-document transaction: update submission + mark lesson completed
      await this.executeWithTransaction(
        async (session) => {
          await submission.save({ session });
          await ProgressService.markLessonCompletedInternal(
            submission.userId.toString(),
            assignment.courseId.toString(),
            assignment.lessonId.toString(),
            session
          );
        },
        async () => {
          await submission.save();
          await ProgressService.markLessonCompletedInternal(
            submission.userId.toString(),
            assignment.courseId.toString(),
            assignment.lessonId.toString()
          );
        }
      );
    } else {
      await submission.save();
    }

    logger.info('[AssignmentService] Graded submission', {
      submissionId: submission._id.toString(),
      score,
      percentageScore,
      isPassed,
      status: submission.status
    });

    const downloadUrl = await this.storageProvider.getReadUrl(submission.storageKey);
    return submission.toSafeDTO(downloadUrl);
  }

  /**
   * Get submission history for an enrollment
   */
  static async getEnrollmentSubmissions(
    enrollmentId: string,
    assignmentId: string
  ): Promise<IAssignmentSubmissionSafeDTO[]> {
    await connectToDatabase();
    const submissions = await AssignmentSubmissionModel.find({ enrollmentId, assignmentId }).sort({
      submissionNumber: 1
    });

    const results: IAssignmentSubmissionSafeDTO[] = [];
    for (const sub of submissions) {
      const readUrl = await this.storageProvider.getReadUrl(sub.storageKey);
      results.push(sub.toSafeDTO(readUrl));
    }
    return results;
  }
}
