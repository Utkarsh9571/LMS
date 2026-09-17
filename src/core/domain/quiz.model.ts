import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  AssessmentStatus,
  IQuizQuestionAuthoringDTO,
  IQuizSafeDTO,
  QuizQuestionType
} from './domain-types';

export interface IQuizOption {
  id: string;
  text: string;
}

export interface IQuizQuestion {
  id: string;
  text: string;
  questionType: QuizQuestionType;
  options: IQuizOption[];
  correctOptionIds: string[];
  points: number;
  explanation?: string;
}

export interface IQuizDocument extends Document {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: AssessmentStatus;
  passingScorePercent: number;
  timeLimitMinutes: number; // 0 = unlimited
  maxAttempts: number; // 0 = unlimited
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: IQuizQuestion[];
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(includeAnswers?: boolean): IQuizSafeDTO;
}

const QuizOptionSchema = new Schema<IQuizOption>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const QuizQuestionSchema = new Schema<IQuizQuestion>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    questionType: {
      type: String,
      required: true,
      enum: ['single_choice', 'multiple_choice', 'true_false']
    },
    options: { type: [QuizOptionSchema], default: [] },
    correctOptionIds: { type: [String], default: [] },
    points: { type: Number, required: true, min: 1, default: 1 },
    explanation: { type: String, trim: true }
  },
  { _id: false }
);

const QuizSchema = new Schema<IQuizDocument>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'Lesson ID is required']
    },
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    },
    passingScorePercent: {
      type: Number,
      required: true,
      min: [1, 'Passing score must be at least 1%'],
      max: [100, 'Passing score cannot exceed 100%'],
      default: 70
    },
    timeLimitMinutes: {
      type: Number,
      required: true,
      min: [0, 'Time limit cannot be negative'],
      default: 0
    },
    maxAttempts: {
      type: Number,
      required: true,
      min: [0, 'Max attempts cannot be negative'],
      default: 0 // 0 = unlimited
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: false
    },
    questions: {
      type: [QuizQuestionSchema],
      default: []
    }
  },
  {
    timestamps: true,
    collection: 'quizzes'
  }
);

// Indexes
QuizSchema.index({ lessonId: 1 }, { unique: true });
QuizSchema.index({ courseId: 1, status: 1 });

QuizSchema.methods.toSafeDTO = function (this: IQuizDocument, includeAnswers = false): IQuizSafeDTO {
  const totalPoints = this.questions.reduce((sum, q) => sum + (q.points || 0), 0);

  const formattedQuestions: IQuizQuestionAuthoringDTO[] | undefined = includeAnswers
    ? this.questions.map((q) => ({
        id: q.id,
        text: q.text,
        questionType: q.questionType,
        options: q.options.map((opt) => ({ id: opt.id, text: opt.text })),
        points: q.points,
        correctOptionIds: q.correctOptionIds || [],
        explanation: q.explanation
      }))
    : undefined;

  return {
    id: this._id.toString(),
    courseId: this.courseId.toString(),
    lessonId: this.lessonId.toString(),
    title: this.title,
    description: this.description,
    status: this.status,
    passingScorePercent: this.passingScorePercent,
    timeLimitMinutes: this.timeLimitMinutes,
    maxAttempts: this.maxAttempts,
    shuffleQuestions: this.shuffleQuestions,
    shuffleOptions: this.shuffleOptions,
    questionCount: this.questions.length,
    totalPoints,
    questions: formattedQuestions,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString()
  };
};

export const QuizModel: Model<IQuizDocument> =
  mongoose.models.Quiz || mongoose.model<IQuizDocument>('Quiz', QuizSchema);
