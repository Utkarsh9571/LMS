/**
 * Foundational Domain Types & Enums
 * Mirrors DOMAIN_MODEL.md, DATABASE_SCHEMA.md, and RBAC.md
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
