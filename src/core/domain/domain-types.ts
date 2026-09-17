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
  | 'assignments:submit';

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

export type OrderStatus = 'pending_payment' | 'paid' | 'payment_failed' | 'refunded' | 'cancelled';
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
  currency: CurrencyCode;
  subtotalMinorUnits: number;
  discountMinorUnits: number;
  couponId?: string | null;
  taxMinorUnits: number;
  totalMinorUnits: number;
  billingDetails: IBillingDetails;
  status: OrderStatus;
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
  currency: CurrencyCode;
  amountMinorUnits: number;
  paymentMethod?: string | null;
  status: PaymentAttemptStatus;
  errorMessage?: string | null;
  paidAt?: string | null;
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
  couponCode?: string;
  billingDetails: IBillingDetails;
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


