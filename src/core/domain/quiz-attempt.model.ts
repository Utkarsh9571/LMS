import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  IQuizAttemptResultAnswerDTO,
  IQuizAttemptSafeDTO,
  IQuizAttemptStudentSafeDTO,
  QuizAttemptStatus
} from './domain-types';

export interface IQuizAttemptAnswer {
  questionId: string;
  selectedOptionIds: string[];
  isCorrect: boolean;
  awardedPoints: number;
  correctOptionIds: string[];
  explanation?: string;
}

export interface IQuizAttemptDocument extends Document {
  _id: mongoose.Types.ObjectId;
  quizId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  enrollmentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  attemptNumber: number;
  status: QuizAttemptStatus;
  startedAt: Date;
  deadlineAt: Date | null;
  submittedAt: Date | null;
  finalizedAt: Date | null;
  score: number;
  percentageScore: number;
  isPassed: boolean;
  answers: IQuizAttemptAnswer[];
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): IQuizAttemptSafeDTO;
  toStudentSafeDTO(): IQuizAttemptStudentSafeDTO;
}

const QuizAttemptAnswerSchema = new Schema<IQuizAttemptAnswer>(
  {
    questionId: { type: String, required: true },
    selectedOptionIds: { type: [String], default: [] },
    isCorrect: { type: Boolean, required: true, default: false },
    awardedPoints: { type: Number, required: true, default: 0 },
    correctOptionIds: { type: [String], default: [] },
    explanation: { type: String }
  },
  { _id: false }
);

const QuizAttemptSchema = new Schema<IQuizAttemptDocument>(
  {
    quizId: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: [true, 'Quiz ID is required'],
      index: true
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'Lesson ID is required'],
      index: true
    },
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment ID is required'],
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    attemptNumber: {
      type: Number,
      required: [true, 'Attempt number is required'],
      min: [1, 'Attempt number must be at least 1']
    },
    status: {
      type: String,
      required: true,
      enum: ['in_progress', 'submitted', 'timed_out'],
      default: 'in_progress',
      index: true
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    deadlineAt: {
      type: Date,
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    },
    finalizedAt: {
      type: Date,
      default: null
    },
    score: {
      type: Number,
      required: true,
      default: 0
    },
    percentageScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0
    },
    isPassed: {
      type: Boolean,
      required: true,
      default: false,
      index: true
    },
    answers: {
      type: [QuizAttemptAnswerSchema],
      default: []
    }
  },
  {
    timestamps: true,
    collection: 'quiz_attempts'
  }
);

// Compound Unique Index: prevents concurrent duplicate attempt numbers for the same enrollment
QuizAttemptSchema.index({ enrollmentId: 1, quizId: 1, attemptNumber: 1 }, { unique: true });
QuizAttemptSchema.index({ enrollmentId: 1, quizId: 1, isPassed: 1 });
QuizAttemptSchema.index({ userId: 1, lessonId: 1 });

QuizAttemptSchema.methods.toSafeDTO = function (this: IQuizAttemptDocument): IQuizAttemptSafeDTO {
  const isFinalized = this.status === 'submitted' || this.status === 'timed_out';

  const answersFormatted: IQuizAttemptResultAnswerDTO[] | undefined = isFinalized
    ? this.answers.map((a) => ({
        questionId: a.questionId,
        selectedOptionIds: a.selectedOptionIds,
        isCorrect: a.isCorrect,
        awardedPoints: a.awardedPoints,
        correctOptionIds: a.correctOptionIds,
        explanation: a.explanation
      }))
    : undefined;

  return {
    id: this._id.toString(),
    quizId: this.quizId.toString(),
    lessonId: this.lessonId.toString(),
    enrollmentId: this.enrollmentId.toString(),
    userId: this.userId.toString(),
    attemptNumber: this.attemptNumber,
    status: this.status,
    startedAt: this.startedAt.toISOString(),
    deadlineAt: this.deadlineAt ? this.deadlineAt.toISOString() : null,
    submittedAt: this.submittedAt ? this.submittedAt.toISOString() : null,
    finalizedAt: this.finalizedAt ? this.finalizedAt.toISOString() : null,
    score: this.score,
    percentageScore: this.percentageScore,
    isPassed: this.isPassed,
    answers: answersFormatted,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString()
  };
};

QuizAttemptSchema.methods.toStudentSafeDTO = function (
  this: IQuizAttemptDocument
): IQuizAttemptStudentSafeDTO {
  const isFinalized = this.status === 'submitted' || this.status === 'timed_out';

  const answersFormatted: IQuizAttemptResultAnswerDTO[] | undefined = isFinalized
    ? this.answers.map((a) => ({
        questionId: a.questionId,
        selectedOptionIds: a.selectedOptionIds,
        isCorrect: a.isCorrect,
        awardedPoints: a.awardedPoints,
        correctOptionIds: a.correctOptionIds,
        explanation: a.explanation
      }))
    : undefined;

  return {
    id: this._id.toString(),
    quizId: this.quizId.toString(),
    lessonId: this.lessonId.toString(),
    enrollmentId: this.enrollmentId.toString(),
    // userId intentionally omitted
    attemptNumber: this.attemptNumber,
    status: this.status,
    startedAt: this.startedAt.toISOString(),
    deadlineAt: this.deadlineAt ? this.deadlineAt.toISOString() : null,
    submittedAt: this.submittedAt ? this.submittedAt.toISOString() : null,
    finalizedAt: this.finalizedAt ? this.finalizedAt.toISOString() : null,
    score: this.score,
    percentageScore: this.percentageScore,
    isPassed: this.isPassed,
    answers: answersFormatted,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString()
  };
};

export const QuizAttemptModel: Model<IQuizAttemptDocument> =
  mongoose.models.QuizAttempt ||
  mongoose.model<IQuizAttemptDocument>('QuizAttempt', QuizAttemptSchema);
