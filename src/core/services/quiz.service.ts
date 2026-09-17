import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { QuizModel, IQuizDocument } from '@/core/domain/quiz.model';
import { QuizAttemptModel, IQuizAttemptDocument } from '@/core/domain/quiz-attempt.model';
import { LessonModel } from '@/core/domain/lesson.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { ProgressService } from './progress.service';
import {
  IQuizSafeDTO,
  IQuizAttemptSafeDTO,
  IQuizAttemptStudentSafeDTO,
  IQuizQuestionAuthoringDTO,
  IQuizAttemptStudentAnswerDTO,
  IQuizAttemptResultAnswerDTO
} from '@/core/domain/domain-types';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError
} from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface CreateQuizInput {
  courseId: string;
  lessonId: string;
  title: string;
  description?: string;
  passingScorePercent?: number;
  timeLimitMinutes?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  questions?: IQuizQuestionAuthoringDTO[];
}

export interface UpdateQuizInput {
  title?: string;
  description?: string;
  status?: 'draft' | 'published' | 'archived';
  passingScorePercent?: number;
  timeLimitMinutes?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  questions?: IQuizQuestionAuthoringDTO[];
}

export class QuizService {
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
      // If MongoDB is running in standalone mode, error code 20 (IllegalOperation) is thrown
      if (
        err?.code === 20 ||
        err?.codeName === 'IllegalOperation' ||
        err?.message?.includes('Transaction numbers are only allowed on a replica set member or mongos')
      ) {
        logger.warn(
          '[QuizService] MongoDB replica set transactions not supported by current topology. Falling back to sequential execution (non-atomic standalone mode).'
        );
        return await fallbackFn();
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Create a new Quiz attached to a quiz lesson.
   * Enforces 1:1 relationship between Lesson and Quiz.
   */
  static async createQuiz(input: CreateQuizInput): Promise<IQuizSafeDTO> {
    await connectToDatabase();

    const { courseId, lessonId, title, questions = [] } = input;
    if (!courseId) throw new ValidationError('courseId is required.');
    if (!lessonId) throw new ValidationError('lessonId is required.');
    if (!title?.trim()) throw new ValidationError('title is required.');

    const lesson = await LessonModel.findOne({ _id: lessonId, courseId });
    if (!lesson) {
      throw new NotFoundError('Lesson in Course', `${lessonId} in Course ${courseId}`);
    }
    if (lesson.contentType !== 'quiz') {
      throw new ValidationError(`Lesson ${lessonId} has contentType '${lesson.contentType}', must be 'quiz'.`);
    }

    const existingQuiz = await QuizModel.findOne({ lessonId });
    if (existingQuiz) {
      throw new ValidationError(`A quiz is already attached to lesson ${lessonId}.`);
    }

    // Validate questions
    for (const q of questions) {
      if (!q.id || !q.text?.trim()) {
        throw new ValidationError('Every question must have an id and text.');
      }
      if (!['single_choice', 'multiple_choice', 'true_false'].includes(q.questionType)) {
        throw new ValidationError(`Invalid questionType: ${q.questionType}`);
      }
      if (!q.options || q.options.length < 2) {
        throw new ValidationError(`Question ${q.id} must have at least 2 options.`);
      }
      if (!q.correctOptionIds || q.correctOptionIds.length === 0) {
        throw new ValidationError(`Question ${q.id} must have at least one correct option ID.`);
      }
      if (q.points !== undefined && (typeof q.points !== 'number' || q.points < 1)) {
        throw new ValidationError(`Question ${q.id} points must be a positive integer.`);
      }
    }

    const quiz = await QuizModel.create({
      courseId,
      lessonId,
      title: title.trim(),
      description: input.description?.trim(),
      status: 'draft',
      passingScorePercent: input.passingScorePercent ?? 70,
      timeLimitMinutes: input.timeLimitMinutes ?? 0,
      maxAttempts: input.maxAttempts ?? 0,
      shuffleQuestions: Boolean(input.shuffleQuestions),
      shuffleOptions: Boolean(input.shuffleOptions),
      questions
    });

    // Update lesson contentData.quizId
    lesson.contentData = { ...lesson.contentData, quizId: quiz._id.toString() };
    await lesson.save();

    logger.info('[QuizService] Created quiz', { quizId: quiz._id.toString(), lessonId });
    return quiz.toSafeDTO(true);
  }

  /**
   * Update quiz configuration and questions (Instructor / Admin).
   */
  static async updateQuiz(quizId: string, input: UpdateQuizInput): Promise<IQuizSafeDTO> {
    await connectToDatabase();

    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw new NotFoundError('Quiz', quizId);

    if (input.title !== undefined) {
      if (!input.title.trim()) throw new ValidationError('title cannot be empty.');
      quiz.title = input.title.trim();
    }
    if (input.description !== undefined) {
      quiz.description = input.description.trim();
    }
    if (input.status !== undefined) {
      if (!['draft', 'published', 'archived'].includes(input.status)) {
        throw new ValidationError(`Invalid quiz status: ${input.status}`);
      }
      quiz.status = input.status;
    }
    if (input.passingScorePercent !== undefined) {
      if (input.passingScorePercent < 1 || input.passingScorePercent > 100) {
        throw new ValidationError('passingScorePercent must be between 1 and 100.');
      }
      quiz.passingScorePercent = input.passingScorePercent;
    }
    if (input.timeLimitMinutes !== undefined) {
      if (input.timeLimitMinutes < 0) throw new ValidationError('timeLimitMinutes cannot be negative.');
      quiz.timeLimitMinutes = input.timeLimitMinutes;
    }
    if (input.maxAttempts !== undefined) {
      if (input.maxAttempts < 0) throw new ValidationError('maxAttempts cannot be negative.');
      quiz.maxAttempts = input.maxAttempts;
    }
    if (input.shuffleQuestions !== undefined) quiz.shuffleQuestions = Boolean(input.shuffleQuestions);
    if (input.shuffleOptions !== undefined) quiz.shuffleOptions = Boolean(input.shuffleOptions);

    if (input.questions !== undefined) {
      for (const q of input.questions) {
        if (!q.id || !q.text?.trim()) {
          throw new ValidationError('Every question must have an id and text.');
        }
        if (!['single_choice', 'multiple_choice', 'true_false'].includes(q.questionType)) {
          throw new ValidationError(`Invalid questionType: ${q.questionType}`);
        }
        if (!q.options || q.options.length < 2) {
          throw new ValidationError(`Question ${q.id} must have at least 2 options.`);
        }
        if (!q.correctOptionIds || q.correctOptionIds.length === 0) {
          throw new ValidationError(`Question ${q.id} must have at least one correct option ID.`);
        }
      }
      quiz.questions = input.questions as any;
    }

    await quiz.save();
    return quiz.toSafeDTO(true);
  }

  /**
   * Get Quiz details for Authoring / Management (includes correctOptionIds)
   */
  static async getQuizForAuthoring(quizId: string): Promise<IQuizSafeDTO> {
    await connectToDatabase();
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw new NotFoundError('Quiz', quizId);
    return quiz.toSafeDTO(true);
  }

  /**
   * Get Quiz details by lessonId (includes correctOptionIds if isAuthoring is true)
   */
  static async getQuizByLesson(lessonId: string, isAuthoring = false): Promise<IQuizSafeDTO> {
    await connectToDatabase();
    const quiz = await QuizModel.findOne({ lessonId });
    if (!quiz) throw new NotFoundError('Quiz for Lesson', lessonId);
    return quiz.toSafeDTO(isAuthoring);
  }

  /**
   * Start a new Quiz Attempt for an enrolled student.
   * Server computes authoritative deadlineAt = startedAt + timeLimitMinutes * 60 * 1000.
   * Handles duplicate-key concurrency safely via retry loop.
   */
  static async startAttempt(
    userId: string,
    enrollmentId: string,
    quizId: string
  ): Promise<{ attempt: IQuizAttemptSafeDTO; questions: any[] }> {
    await connectToDatabase();

    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw new NotFoundError('Quiz', quizId);
    if (quiz.status !== 'published') {
      throw new ValidationError('Quiz is not currently published.');
    }

    // Validate enrollment ownership and status
    const enrollment = await EnrollmentModel.findOne({
      _id: enrollmentId,
      userId,
      courseId: quiz.courseId,
      status: 'active'
    });
    if (!enrollment) {
      throw new AuthorizationError('Active enrollment matching course context is required.');
    }

    // Check if an in-progress attempt already exists
    const inProgress = await QuizAttemptModel.findOne({
      enrollmentId,
      quizId,
      status: 'in_progress'
    });
    if (inProgress) {
      // If deadline has passed including 15s network grace, mark it timed_out
      const now = new Date();
      if (inProgress.deadlineAt && now.getTime() > inProgress.deadlineAt.getTime() + 15000) {
        inProgress.status = 'timed_out';
        inProgress.finalizedAt = now;
        await inProgress.save();
      } else {
        // Return existing in-progress attempt
        return {
          attempt: inProgress.toSafeDTO(),
          questions: this.prepareStudentQuestions(quiz)
        };
      }
    }

    // Check maxAttempts limit (0 = unlimited)
    if (quiz.maxAttempts > 0) {
      const finalizedCount = await QuizAttemptModel.countDocuments({
        enrollmentId,
        quizId,
        status: { $in: ['submitted', 'timed_out'] }
      });
      if (finalizedCount >= quiz.maxAttempts) {
        throw new ValidationError(`Maximum attempts (${quiz.maxAttempts}) reached for this quiz.`);
      }
    }

    const now = new Date();
    const deadlineAt =
      quiz.timeLimitMinutes > 0
        ? new Date(now.getTime() + quiz.timeLimitMinutes * 60 * 1000)
        : null;

    // Retry loop for duplicate-key concurrency (code 11000 on attemptNumber)
    let attemptDoc: IQuizAttemptDocument | null = null;
    let retries = 3;

    while (retries > 0) {
      try {
        const lastAttempt = await QuizAttemptModel.findOne({ enrollmentId, quizId })
          .sort({ attemptNumber: -1 })
          .select('attemptNumber');

        const nextAttemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1;

        attemptDoc = await QuizAttemptModel.create({
          quizId,
          lessonId: quiz.lessonId,
          enrollmentId,
          userId,
          attemptNumber: nextAttemptNumber,
          status: 'in_progress',
          startedAt: now,
          deadlineAt,
          score: 0,
          percentageScore: 0,
          isPassed: false,
          answers: []
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

    if (!attemptDoc) {
      throw new Error('Failed to start quiz attempt due to concurrent attempt creation.');
    }

    logger.info('[QuizService] Started quiz attempt', {
      attemptId: attemptDoc._id.toString(),
      attemptNumber: attemptDoc.attemptNumber,
      deadlineAt
    });

    return {
      attempt: attemptDoc.toSafeDTO(),
      questions: this.prepareStudentQuestions(quiz)
    };
  }

  /**
   * Submit and finalize a Quiz Attempt.
   * Performs server-side objective scoring and transactional lesson progress update on pass.
   * 15-second grace window is network tolerance only.
   */
  static async submitAttempt(
    userId: string,
    attemptId: string,
    submittedAnswers: IQuizAttemptStudentAnswerDTO[]
  ): Promise<IQuizAttemptSafeDTO> {
    await connectToDatabase();

    const attempt = await QuizAttemptModel.findById(attemptId);
    if (!attempt) throw new NotFoundError('Quiz Attempt', attemptId);

    // Enforce ownership
    if (attempt.userId.toString() !== userId) {
      throw new AuthorizationError('You do not own this quiz attempt.');
    }

    // Idempotent return if already finalized
    if (attempt.status !== 'in_progress') {
      return attempt.toSafeDTO();
    }

    const quiz = await QuizModel.findById(attempt.quizId);
    if (!quiz) throw new NotFoundError('Quiz', attempt.quizId.toString());

    const now = new Date();
    const submissionTime = now.getTime();

    // Check deadline and 15s network grace period
    let isLateTimeout = false;
    if (attempt.deadlineAt) {
      const deadlineTime = attempt.deadlineAt.getTime();
      const graceLimitTime = deadlineTime + 15000; // 15s grace

      if (submissionTime > graceLimitTime) {
        isLateTimeout = true;
      }
    }

    if (isLateTimeout) {
      // Finalize as timed_out with 0 score
      attempt.status = 'timed_out';
      attempt.submittedAt = now;
      attempt.finalizedAt = now;
      attempt.score = 0;
      attempt.percentageScore = 0;
      attempt.isPassed = false;
      await attempt.save();

      logger.info('[QuizService] Quiz attempt timed out past 15s grace window', {
        attemptId: attempt._id.toString()
      });
      return attempt.toSafeDTO();
    }

    // Score the attempt objectively from submitted answer payload
    let earnedPoints = 0;
    let totalPoints = 0;
    const scoredAnswers: IQuizAttemptResultAnswerDTO[] = [];

    const answerMap = new Map<string, string[]>();
    for (const ans of submittedAnswers) {
      answerMap.set(ans.questionId, ans.selectedOptionIds || []);
    }

    for (const q of quiz.questions) {
      const qPoints = q.points || 1;
      totalPoints += qPoints;

      const userSelected = answerMap.get(q.id) || [];
      const correctSelected = q.correctOptionIds || [];

      // Check exact set equality of chosen options
      const isCorrect =
        userSelected.length === correctSelected.length &&
        userSelected.every((id) => correctSelected.includes(id));

      const awarded = isCorrect ? qPoints : 0;
      earnedPoints += awarded;

      scoredAnswers.push({
        questionId: q.id,
        selectedOptionIds: userSelected,
        isCorrect,
        awardedPoints: awarded,
        correctOptionIds: correctSelected,
        explanation: q.explanation
      });
    }

    const percentageScore =
      totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const isPassed = percentageScore >= quiz.passingScorePercent;

    // Mutate attempt state
    attempt.status = 'submitted';
    attempt.submittedAt = now;
    attempt.finalizedAt = now;
    attempt.score = earnedPoints;
    attempt.percentageScore = percentageScore;
    attempt.isPassed = isPassed;
    attempt.answers = scoredAnswers as any;

    if (isPassed) {
      // Transactional mutation: save attempt + mark lesson progress
      await this.executeWithTransaction(
        async (session) => {
          await attempt.save({ session });
          await ProgressService.markLessonCompletedInternal(
            userId,
            quiz.courseId.toString(),
            quiz.lessonId.toString(),
            session
          );
        },
        async () => {
          await attempt.save();
          await ProgressService.markLessonCompletedInternal(
            userId,
            quiz.courseId.toString(),
            quiz.lessonId.toString()
          );
        }
      );
    } else {
      await attempt.save();
    }

    logger.info('[QuizService] Scored and finalized quiz attempt', {
      attemptId: attempt._id.toString(),
      percentageScore,
      isPassed
    });

    return attempt.toSafeDTO();
  }

  /**
   * Get attempt history for an enrollment (internal/admin use — includes userId in DTO)
   */
  static async getEnrollmentAttempts(
    enrollmentId: string,
    quizId: string
  ): Promise<IQuizAttemptSafeDTO[]> {
    await connectToDatabase();
    const attempts = await QuizAttemptModel.find({ enrollmentId, quizId }).sort({
      attemptNumber: 1
    });
    return attempts.map((a) => a.toSafeDTO());
  }

  /**
   * Get attempt history for a student: validates that the enrollment belongs to userId
   * before returning student-safe DTOs (userId omitted from response).
   */
  static async getStudentAttempts(
    userId: string,
    enrollmentId: string,
    quizId: string
  ): Promise<IQuizAttemptStudentSafeDTO[]> {
    await connectToDatabase();

    // Validate enrollment ownership
    const enrollment = await EnrollmentModel.findOne({ _id: enrollmentId, userId });
    if (!enrollment) {
      throw new AuthorizationError('Enrollment not found or does not belong to the authenticated user.');
    }

    const attempts = await QuizAttemptModel.find({ enrollmentId, quizId }).sort({
      attemptNumber: 1
    });
    return attempts.map((a) => a.toStudentSafeDTO());
  }

  /**
   * Strip correct answers and explanations when providing questions to student
   */
  private static prepareStudentQuestions(quiz: IQuizDocument): any[] {
    let questions = quiz.questions.map((q) => {
      let options = q.options.map((opt) => ({ id: opt.id, text: opt.text }));
      if (quiz.shuffleOptions) {
        options = this.shuffleArray([...options]);
      }
      return {
        id: q.id,
        text: q.text,
        questionType: q.questionType,
        points: q.points,
        options
      };
    });

    if (quiz.shuffleQuestions) {
      questions = this.shuffleArray([...questions]);
    }

    return questions;
  }

  private static shuffleArray<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
