import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { UserRole } from '@/core/domain/domain-types';

export const SESSION_COOKIE_NAME = 'lms_session';
const SESSION_EXPIRATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  globalRoles: UserRole[];
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(config.security.sessionSecret);
}

/**
 * Creates a cryptographically signed, tamper-resistant JWT session token
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    sub: payload.userId,
    email: payload.email,
    globalRoles: payload.globalRoles
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRATION_SECONDS}s`)
    .sign(getSecretKey());
}

/**
 * Verifies and decodes a session token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256']
    });

    if (!payload.sub || !payload.email || !Array.isArray(payload.globalRoles)) {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email as string,
      globalRoles: payload.globalRoles as UserRole[]
    };
  } catch {
    return null;
  }
}

/**
 * Sets the secure HTTP-only session cookie
 */
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_EXPIRATION_SECONDS
  });
}

/**
 * Clears the session cookie on logout
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Reads and verifies the current session from incoming cookies
 */
export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}
