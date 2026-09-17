import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/core/domain/user.model';
import { UserRole, MarketCode, IUserSafeProfile } from '@/core/domain/domain-types';
import { hashPassword, verifyPassword, normalizeEmail, validatePasswordStrength } from '@/lib/password';
import { setSessionCookie, clearSessionCookie } from '@/lib/session';
import { ValidationError, AuthenticationError, ConflictError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  marketCode?: MarketCode;
  globalRoles?: UserRole[]; // Only accepted in internal/seed contexts
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Registers a new user account with hashed password and initial student role
   */
  static async register(input: RegisterInput): Promise<IUserSafeProfile> {
    const email = normalizeEmail(input.email);
    validatePasswordStrength(input.password);

    if (!input.fullName || input.fullName.trim().length < 2) {
      throw new ValidationError('Full name must be at least 2 characters.');
    }

    await connectToDatabase();

    const existing = await UserModel.findOne({ email });
    if (existing) {
      throw new ConflictError('An account with this email address already exists.');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await UserModel.create({
      email,
      passwordHash,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim(),
      globalRoles: input.globalRoles && input.globalRoles.length > 0 ? input.globalRoles : ['student'],
      status: 'active',
      lastActiveMarket: input.marketCode || 'SG'
    });

    logger.info('New user registered successfully', { userId: user._id.toString() });

    // Establish authenticated session
    await setSessionCookie({
      userId: user._id.toString(),
      email: user.email,
      globalRoles: user.globalRoles
    });

    return user.toSafeProfile();
  }

  /**
   * Authenticates user credentials and establishes a session cookie
   */
  static async login(input: LoginInput): Promise<IUserSafeProfile> {
    const email = normalizeEmail(input.email);

    if (!input.password) {
      throw new ValidationError('Password is required.');
    }

    await connectToDatabase();

    // Explicitly select passwordHash which is hidden by default
    const user = await UserModel.findOne({ email }).select('+passwordHash');

    if (!user) {
      // Prevent user enumeration by providing identical error message
      throw new AuthenticationError('Invalid email or password.');
    }

    if (user.status !== 'active') {
      throw new AuthenticationError('Account is suspended. Please contact support.');
    }

    const isMatch = await verifyPassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AuthenticationError('Invalid email or password.');
    }

    logger.info('User authenticated successfully', { userId: user._id.toString() });

    await setSessionCookie({
      userId: user._id.toString(),
      email: user.email,
      globalRoles: user.globalRoles
    });

    return user.toSafeProfile();
  }

  /**
   * Logs out the user by clearing the session cookie
   */
  static async logout(): Promise<void> {
    await clearSessionCookie();
  }
}
