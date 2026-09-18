/**
 * Consistent Domain & Application Error Model
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT_ERROR'
  | 'PAYMENT_ERROR'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMIT_EXCEEDED';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: ErrorCode, statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required.') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied. Insufficient permissions.') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const msg = identifier ? `${resource} '${identifier}' not found.` : `${resource} not found.`;
    super(msg, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT_ERROR', 409);
  }
}

export class PaymentError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'PAYMENT_ERROR', 402, details);
  }
}

export class PaymentProviderError extends PaymentError {
  constructor(message: string, details?: unknown) {
    super(message, details);
    this.name = 'PaymentProviderError';
  }
}

export class ApplicationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'INTERNAL_ERROR', 500, details);
    this.name = 'ApplicationError';
  }
}

