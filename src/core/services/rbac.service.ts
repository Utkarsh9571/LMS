import { UserRole, Permission } from '@/core/domain/domain-types';
import { AuthorizationError } from '@/lib/errors';

/**
 * RBAC Capability Matrix
 * Canonical definitions from docs/RBAC.md
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  superadmin: [
    'markets:manage',
    'courses:write',
    'commerce:write',
    'batches:write',
    'sessions:host',
    'assignments:grade',
    'orders:write',
    'content:read',
    'messages:operate'
  ],
  admin: [
    'courses:write',
    'commerce:write',
    'batches:write',
    'sessions:host',
    'assignments:grade',
    'orders:write',
    'content:read',
    'messages:operate'
  ],
  instructor: [
    'batches:write',
    'sessions:host',
    'assignments:grade',
    'content:read',
    'messages:operate'
  ],
  student: [
    'content:read',
    'assignments:submit'
  ],
  staff: [
    'content:read',
    'orders:write',
    'messages:operate'
  ]
} as const;

/**
 * Checks whether any of the user's roles has the requested permission
 */
export function hasPermission(roles: UserRole[], permission: Permission): boolean {
  if (!roles || roles.length === 0) {
    return false;
  }

  // Superadmin has global administrative access
  if (roles.includes('superadmin')) {
    return true;
  }

  return roles.some(role => {
    const rolePermissions = ROLE_PERMISSIONS[role];
    return rolePermissions ? rolePermissions.includes(permission) : false;
  });
}

/**
 * Checks whether any of the user's roles matches one of the allowed roles
 */
export function hasRole(userRoles: UserRole[], allowedRoles: UserRole[]): boolean {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }
  if (userRoles.includes('superadmin')) {
    return true;
  }
  return userRoles.some(role => allowedRoles.includes(role));
}

/**
 * Throws an AuthorizationError if permission is missing
 */
export function assertPermission(roles: UserRole[], permission: Permission): void {
  if (!hasPermission(roles, permission)) {
    throw new AuthorizationError(`Missing required permission: ${permission}`);
  }
}

/**
 * Throws an AuthorizationError if role is missing
 */
export function assertRole(userRoles: UserRole[], allowedRoles: UserRole[]): void {
  if (!hasRole(userRoles, allowedRoles)) {
    throw new AuthorizationError(`Requires one of roles: ${allowedRoles.join(', ')}`);
  }
}
