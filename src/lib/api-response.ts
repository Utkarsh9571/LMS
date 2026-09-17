import { NextResponse } from 'next/server';
import { AppError } from './errors';
import { logger } from './logger';

/**
 * Standardized API Response Contract
 */

export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
}

export interface ApiResponseError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

export function apiSuccess<T>(data: T, status: number = 200): NextResponse<ApiResponseSuccess<T>> {
  return NextResponse.json(
    {
      success: true,
      data
    },
    { status }
  );
}

export function apiError(error: unknown): NextResponse<ApiResponseError> {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      },
      { status: error.statusCode }
    );
  }

  const err = error as Error;
  logger.error('Unhandled internal server error', { error: err?.message, stack: err?.stack });

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected internal error occurred.'
      }
    },
    { status: 500 }
  );
}
