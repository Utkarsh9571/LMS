import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/core/domain/user.model';
import { UserRole, Permission, IUserSafeProfile } from '@/core/domain/domain-types';
import { getSessionFromCookies } from '@/lib/session';
import { AuthenticationError } from '@/lib/errors';
import { assertRole, assertPermission } from './rbac.service';

export interface AuthenticatedUserContext {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  globalRoles: UserRole[];
  status: string;
  lastActiveMarket?: string;
}

/**
 * Retrieves the currently authenticated user from the session cookie
 * Returns null if unauthenticated or user is deactivated
 */
export async function getCurrentUser(): Promise<IUserSafeProfile | null> {
  const session = await getSessionFromCookies();
  if (!session) {
    return null;
  }

  await connectToDatabase();
  const user = await UserModel.findById(session.userId);

  if (!user || user.status !== 'active') {
    return null;
  }

  return user.toSafeProfile();
}

/**
 * Requires an authenticated user session; throws AuthenticationError otherwise
 */
export async function requireAuth(): Promise<IUserSafeProfile> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationError('Authentication required.');
  }
  return user;
}

/**
 * Requires the authenticated user to hold at least one of the specified roles
 */
export async function requireRole(...allowedRoles: UserRole[]): Promise<IUserSafeProfile> {
  const user = await requireAuth();
  assertRole(user.globalRoles, allowedRoles);
  return user;
}

/**
 * Requires the authenticated user to hold the specified permission
 */
export async function requirePermission(permission: Permission): Promise<IUserSafeProfile> {
  const user = await requireAuth();
  assertPermission(user.globalRoles, permission);
  return user;
}
