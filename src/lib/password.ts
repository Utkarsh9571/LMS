import bcrypt from 'bcryptjs';
import { ValidationError } from '@/lib/errors';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Validates password strength rules:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function validatePasswordStrength(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required.');
  }

  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long.');
  }

  if (!/[A-Z]/.test(password)) {
    throw new ValidationError('Password must contain at least one uppercase letter.');
  }

  if (!/[a-z]/.test(password)) {
    throw new ValidationError('Password must contain at least one lowercase letter.');
  }

  if (!/[0-9]/.test(password)) {
    throw new ValidationError('Password must contain at least one number.');
  }
}

/**
 * Normalizes email address to prevent duplicate account variations
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new ValidationError('Valid email is required.');
  }
  return email.trim().toLowerCase();
}

/**
 * Securely hashes a plaintext password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  validatePasswordStrength(password);
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
}
