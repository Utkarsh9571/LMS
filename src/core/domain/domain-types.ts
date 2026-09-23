/**
 * Foundational Domain Types & Enums
 * Mirrors DOMAIN_MODEL.md, DATABASE_SCHEMA.md, COURSE_ENGINE.md, and RBAC.md
 */

export type MarketCode = 'SG' | 'MY';
export type CurrencyCode = 'SGD' | 'MYR';

export type UserRole = 'superadmin' | 'admin' | 'staff' | 'instructor' | 'student';
export type UserStatus = 'active' | 'suspended';

export type Permission =
  | 'markets:manage'
  | 'courses:write'
  | 'commerce:write'
  | 'batches:write'
  | 'sessions:host'
  | 'assignments:grade'
  | 'orders:write'
  | 'content:read'
  | 'assignments:submit'
  | 'messages:operate';

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';
export type CourseStatus = 'draft' | 'published' | 'archived';
export type CourseDeliveryMode = 'self_paced' | 'cohort_batch';

export type LessonContentType = 'video' | 'pdf' | 'rich_text' | 'quiz' | 'assignment';

export interface ILessonResource {
  title: string;
  storageKey: string;
  fileSizeBytes: number;
  mimeType: string;
  downloadAllowed: boolean;
}

export interface ILessonContentData {
  videoStorageKey?: string;
  durationSeconds?: number;
  pdfStorageKey?: string;
  bodyMarkdown?: string;
  quizId?: string;
  assignmentId?: string;
}

export type V1DeliverableType = 'course' | 'batch';
export type FutureDeliverableType = 'workshop' | 'bundle' | 'membership' | 'consultation';
export type DeliverableType = V1DeliverableType | FutureDeliverableType;

export type V1EntitlementTargetType = 'course' | 'batch';
export type FutureEntitlementTargetType = 'workshop' | 'bundle' | 'membership' | 'consultation';
export type EntitlementTargetType = V1EntitlementTargetType | FutureEntitlementTargetType;

export type OrderStatus = 'pending_payment' | 'paid' | 'payment_failed' | 'fulfillment_failed' | 'refund_in_progress' | 'refunded' | 'cancelled';
export type PaymentAttemptStatus = 'initiated' | 'pending' | 'succeeded' | 'failed' | 'abandoned';
export type WebhookEventStatus = 'received' | 'processed' | 'ignored_duplicate' | 'failed';

export interface IUserSafeProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  globalRoles: UserRole[];
  status: UserStatus;
  lastActiveMarket?: MarketCode;
  createdAt: string;
  updatedAt: string;
}

export interface IMarketSafeContext {
  code: MarketCode;
  name: string;
  countryCode: string;
  currency: CurrencyCode;
  currencyMinorUnits: number;
  timezone: string;
  domains: string[];
  locale: string;
  status: 'active' | 'maintenance' | 'inactive';
}

export interface ICourseSafeDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: CourseLevel;
  thumbnailUrl: string;
  status: CourseStatus;
  deliveryModes: CourseDeliveryMode[];
  estimatedHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface IModuleSafeDTO {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  dripDaysAfterEnrollment: number;
  createdAt: string;
  updatedAt: string;
}

export interface ILessonSafeDTO {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  order: number;
  contentType: LessonContentType;
  contentData: ILessonContentData;
  isPreviewFree: boolean;
  unlockOverrideDays: number | null;
  effectiveDripDays?: number;
  resources: ILessonResource[];
  createdAt: string;
  updatedAt: string;
}

export interface ICurriculumDTO {
  course: ICourseSafeDTO;
  modules: Array<IModuleSafeDTO & { lessons: ILessonSafeDTO[] }>;
}

export type EntitlementStatus = 'active' | 'suspended' | 'revoked' | 'expired';
export type EnrollmentStatus = 'active' | 'completed' | 'dropped';
export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface IEntitlementSafeDTO {
  id: string;
  userId: string;
  sourceOrderId?: string | null;
  marketCode: MarketCode;
  targetType: EntitlementTargetType;
  targetId: string;
  status: EntitlementStatus;
  grantedAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IEnrollmentSafeDTO {
  id: string;
  userId: string;
  courseId: string;
  batchId?: string | null;
  entitlementId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt?: string | null;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface ILessonProgressSafeDTO {
  id: string;
  enrollmentId: string;
  userId: string;
  courseId: string;
  lessonId: string;
  status: LessonProgressStatus;
  secondsWatched: number;
  isCompleted: boolean;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AccessDenialReason =
  | 'unauthenticated'
  | 'no_entitlement'
  | 'expired_entitlement'
  | 'inactive_enrollment'
  | 'drip_locked'
  | 'not_found';

export interface ILessonAccessEvaluation {
  granted: boolean;
  reason?: AccessDenialReason;
  unlocksAt?: Date;
  daysRemaining?: number;
}

export interface IStudentLessonCurriculumDTO {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  order: number;
  contentType: LessonContentType;
  isPreviewFree: boolean;
  effectiveDripDays: number;
  isUnlocked: boolean;
  unlocksAt?: string;
  daysRemaining?: number;
  progressStatus: LessonProgressStatus;
  isCompleted: boolean;
  contentData?: ILessonContentData;
  resources?: ILessonResource[];
}

export interface IStudentCurriculumDTO {
  course: ICourseSafeDTO;
  enrollment: IEnrollmentSafeDTO;
  modules: Array<IModuleSafeDTO & { lessons: IStudentLessonCurriculumDTO[] }>;
}

// ==========================================
// Phase 1E — Commerce & Payments DTOs
// ==========================================

export interface IProductDeliverableDTO {
  deliverableType: V1DeliverableType; // 'course' | 'batch'
  targetId: string;
  titleOverride?: string;
  order?: number;
}

export interface IProductSafeDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  deliverables: IProductDeliverableDTO[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OfferStatus = 'active' | 'expired' | 'disabled';

export interface IOfferSafeDTO {
  id: string;
  productId: string;
  marketCode: MarketCode;
  currency: CurrencyCode;
  basePriceMinorUnits: number;
  displayOriginalPriceMinorUnits?: number | null;
  isPubliclyListed: boolean;
  status: OfferStatus;
  validFrom?: string | null;
  validUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IBillingDetails {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  addressLine1?: string;
}

export interface IOrderSafeDTO {
  id: string;
  orderNumber: string;
  userId: string;
  marketCode: MarketCode;
  productId: string;
  offerId: string;
  selectedBatchId?: string | null;
  currency: CurrencyCode;
  subtotalMinorUnits: number;
  discountMinorUnits: number;
  couponId?: string | null;
  taxMinorUnits: number;
  totalMinorUnits: number;
  billingDetails: IBillingDetails;
  status: OrderStatus;
  fulfillmentError?: string | null;
  activePaymentAttemptId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IPaymentAttemptSafeDTO {
  id: string;
  orderId: string;
  attemptNumber: number;
  marketCode: MarketCode;
  provider: 'hitpay' | 'mock';
  externalReference?: string | null;
  gatewayPaymentId?: string | null;
  currency: CurrencyCode;
  amountMinorUnits: number;
  paymentMethod?: string | null;
  status: PaymentAttemptStatus;
  errorMessage?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IRefundAttemptSafeDTO {
  id: string;
  orderId: string;
  paymentAttemptId: string;
  refundAttemptNumber: number;
  amountMinorUnits: number;
  currency: CurrencyCode;
  status: 'initiated' | 'pending' | 'succeeded' | 'failed' | 'unknown';
  gatewayRefundId?: string | null;
  gatewayPaymentId?: string | null;
  reason?: string | null;
  callerId: string;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IPaymentWebhookEventDTO {
  id: string;
  provider: string;
  eventId: string;
  orderId?: string | null;
  paymentAttemptId?: string | null;
  status: WebhookEventStatus;
  payloadHash: string;
  receivedAt: string;
  processedAt?: string | null;
}

export interface ICheckoutInput {
  productId: string;
  batchId?: string | null;
  couponCode?: string;
  billingDetails: IBillingDetails;
  baseUrl?: string;
}

export interface ICheckoutResultDTO {
  orderNumber: string;
  paymentAttemptId: string;
  checkoutUrl: string;
}

export interface IRetryPaymentResultDTO {
  paymentAttemptId: string;
  checkoutUrl: string;
}

// ==========================================
// Phase 1F — Batch & Cohort Engine DTOs
// ==========================================

export type BatchStatus = 'draft' | 'upcoming' | 'enrolling' | 'in_progress' | 'completed' | 'cancelled';
export type LiveMeetingProviderType = 'mock' | 'zoom' | 'google_meet';

export interface IBatchSafeDTO {
  id: string;
  courseId: string;
  marketCode: MarketCode;
  code: string;
  name: string;
  description?: string;
  status: BatchStatus;
  capacity: number;
  enrolledCount: number;
  startDate: string;
  endDate: string;
  enrollmentOpenAt?: string | null;
  enrollmentCloseAt?: string | null;
  primaryInstructorId: string;
  meetingProvider: LiveMeetingProviderType;
  createdAt: string;
  updatedAt: string;
}

export type LiveSessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';
export type RecordingStatus = 'none' | 'processing' | 'available' | 'failed';

export interface ILiveSessionSafeDTO {
  id: string;
  batchId: string;
  courseId: string;
  title: string;
  description?: string;
  status: LiveSessionStatus;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  meetingProvider: LiveMeetingProviderType;
  providerMeetingId: string;
  hostUrl?: string; // Statically hidden from students in public / student endpoints
  studentJoinUrl: string;
  recordingStatus: RecordingStatus;
  recordingUrl?: string | null;
  recordingDurationSeconds?: number | null;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export interface IAttendanceSafeDTO {
  id: string;
  liveSessionId: string;
  batchId: string;
  userId: string;
  status: AttendanceStatus;
  joinedAt: string;
  lastSeenAt?: string | null;
  joinCount: number;
  ipAddress?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Phase 1G — Assessments & Certificates DTOs
// ==========================================

export type AssessmentStatus = 'draft' | 'published' | 'archived';
export type QuizQuestionType = 'single_choice' | 'multiple_choice' | 'true_false';
export type QuizAttemptStatus = 'in_progress' | 'submitted' | 'timed_out';
export type AssignmentSubmissionStatus = 'submitted' | 'graded' | 'resubmission_requested';

export interface IQuizOptionSafeDTO {
  id: string;
  text: string;
}

export interface IQuizQuestionStudentDTO {
  id: string;
  text: string;
  questionType: QuizQuestionType;
  options: IQuizOptionSafeDTO[];
  points: number;
}

export interface IQuizQuestionAuthoringDTO extends IQuizQuestionStudentDTO {
  correctOptionIds: string[];
  explanation?: string;
}

export interface IQuizSafeDTO {
  id: string;
  courseId: string;
  lessonId: string;
  title: string;
  description?: string;
  status: AssessmentStatus;
  passingScorePercent: number;
  timeLimitMinutes: number; // 0 = unlimited
  maxAttempts: number; // 0 = unlimited
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questionCount: number;
  totalPoints: number;
  questions?: IQuizQuestionAuthoringDTO[]; // Present only for instructors/admins
  createdAt: string;
  updatedAt: string;
}

export interface IQuizAttemptStudentAnswerDTO {
  questionId: string;
  selectedOptionIds: string[];
}

export interface IQuizAttemptResultAnswerDTO extends IQuizAttemptStudentAnswerDTO {
  isCorrect: boolean;
  awardedPoints: number;
  correctOptionIds: string[];
  explanation?: string;
}

export interface IQuizAttemptSafeDTO {
  id: string;
  quizId: string;
  lessonId: string;
  enrollmentId: string;
  userId: string; // Internal/admin use only — not returned to student endpoints
  attemptNumber: number;
  status: QuizAttemptStatus;
  startedAt: string;
  deadlineAt: string | null;
  submittedAt: string | null;
  finalizedAt: string | null;
  score: number;
  percentageScore: number;
  isPassed: boolean;
  answers?: IQuizAttemptResultAnswerDTO[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Student-safe quiz attempt DTO: userId is intentionally omitted.
 * The server validates enrollment ownership before returning these records.
 */
export interface IQuizAttemptStudentSafeDTO {
  id: string;
  quizId: string;
  lessonId: string;
  enrollmentId: string;
  attemptNumber: number;
  status: QuizAttemptStatus;
  startedAt: string;
  deadlineAt: string | null;
  submittedAt: string | null;
  finalizedAt: string | null;
  score: number;
  percentageScore: number;
  isPassed: boolean;
  answers?: IQuizAttemptResultAnswerDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface IAssignmentSafeDTO {
  id: string;
  courseId: string;
  lessonId: string;
  title: string;
  instructionsMarkdown: string;
  status: AssessmentStatus;
  passingScorePercent: number;
  maxScore: number;
  maxSubmissions: number; // 0 = unlimited
  allowedFileExtensions: string[]; // e.g. ['.pdf', '.zip']
  maxFileSizeBytes: number;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IAssignmentSubmissionSafeDTO {
  id: string;
  assignmentId: string;
  lessonId: string;
  enrollmentId: string;
  userId: string;
  submissionNumber: number;
  status: AssignmentSubmissionStatus;
  // storageKey intentionally omitted — internal server/storage reference only
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
  studentNotes?: string;
  submittedAt: string;
  graderId?: string | null;
  gradedAt?: string | null;
  score?: number | null;
  percentageScore?: number | null;
  isPassed?: boolean | null;
  feedbackMarkdown?: string | null;
  fileDownloadUrl?: string | null; // Signed read URL generated server-side
  createdAt: string;
  updatedAt: string;
}

export interface ICertificateStudentSnapshot {
  fullName: string;
  email: string;
}

export interface ICertificateCourseSnapshot {
  title: string;
  slug: string;
  estimatedHours: number;
}

export interface ICertificateBatchSnapshot {
  code: string;
  name: string;
  completedAt?: string | null;
}

export interface ICertificateInstructorSnapshot {
  fullName: string;
}

export interface ICertificateSafeDTO {
  id: string;
  certificateNumber: string;
  enrollmentId: string;
  userId: string;
  courseId: string;
  batchId?: string | null;
  marketCode: MarketCode;
  studentSnapshot: ICertificateStudentSnapshot;
  courseSnapshot: ICertificateCourseSnapshot;
  batchSnapshot?: ICertificateBatchSnapshot | null;
  primaryInstructorSnapshot?: ICertificateInstructorSnapshot | null;
  issuedAt: string;
  verificationUrl: string;
  isRevoked: boolean;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ICertificatePublicVerificationDTO {
  certificateNumber: string;
  isValid: boolean;
  studentName: string; // Publicly shows name only, no email/phone
  courseTitle: string;
  deliveryMode: 'self_paced' | 'cohort_batch';
  batchName?: string | null;
  marketCode: MarketCode;
  issuedAt: string;
  primaryInstructorName?: string | null;
}

export type StaffMessageAction = 'workshop_reminder' | 'batch_announcement' | 'individual_email';
export type StaffMessageStatus = 'submitted' | 'failed' | 'partially_failed';
export type StaffMessageTargetType = 'batch' | 'session' | 'user';

export interface IStaffMessageSafeDTO {
  id: string;
  senderId: string;
  senderName: string;
  action: StaffMessageAction;
  targetType: StaffMessageTargetType;
  targetId: string;
  targetName: string;
  subject: string;
  messagePreview: string;
  recipientCount: number;
  failedCount: number;
  status: StaffMessageStatus;
  failureReason?: string | null;
  marketCode?: MarketCode | null;
  createdAt: string;
  updatedAt: string;
}



