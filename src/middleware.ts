import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from './lib/session';
import { resolveMarketContext } from './core/services/market-resolution.service';

/**
 * Next.js Edge Middleware for Boundary Protection & Market Propagation
 * 
 * Invariants:
 * - Public routes (/api/auth/*, /api/health, /api/market, /) are accessible without session.
 * - Protected route prefixes:
 *     - /admin/* requires session with 'admin' or 'superadmin' role.
 *     - /instructor/* requires session with 'instructor', 'admin', or 'superadmin' role.
 *     - /student/* requires authenticated session.
 * - Resolves Market Context using centralized resolveMarketContext:
 *     - In Production: Hostname/domain is authoritative. Query parameters, cookies, and client headers are IGNORED.
 *     - In Development: ?market=SG/MY query param or dev cookie allowed.
 * - SECURITY BOUNDARY: Overwrites/deletes any client-supplied 'x-market-code' header before passing downstream.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get('host') || '';

  // 1. Resolve market using canonical resolution service
  let resolvedMarketCode = 'SG';
  try {
    const market = resolveMarketContext({
      host,
      searchParams: request.nextUrl.searchParams,
      devCookieMarket: request.cookies.get('lms_dev_market')?.value
    });
    resolvedMarketCode = market.code;
  } catch {
    // In production, if domain is unmapped, reject or fail safe
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Unknown market domain: ${host}`
          }
        },
        { status: 404 }
      );
    }
  }

  // 2. Check route protection
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const isInstructorRoute = pathname.startsWith('/instructor') || pathname.startsWith('/api/instructor');
  const isStudentRoute = pathname.startsWith('/student') || pathname.startsWith('/api/student');
  const isStaffRoute = pathname.startsWith('/staff') || pathname.startsWith('/api/v1/staff');

  if (isAdminRoute || isInstructorRoute || isStudentRoute || isStaffRoute) {
    const sessionCookie = request.cookies.get('lms_session')?.value;
    const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;

    if (!session) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AUTHENTICATION_ERROR',
              message: 'Authentication required.'
            }
          },
          { status: 401 }
        );
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const roles = session.globalRoles;

    if (isStaffRoute && !roles.some(r => ['admin', 'superadmin', 'instructor', 'staff'].includes(r))) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AUTHORIZATION_ERROR',
              message: 'Requires staff privileges.'
            }
          },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    if (isAdminRoute && !roles.includes('admin') && !roles.includes('superadmin')) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AUTHORIZATION_ERROR',
              message: 'Requires admin role.'
            }
          },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    if (isInstructorRoute && !roles.includes('instructor') && !roles.includes('admin') && !roles.includes('superadmin')) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AUTHORIZATION_ERROR',
              message: 'Requires instructor role.'
            }
          },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // 3. Security Boundary: Strip client-supplied x-market-code and set trusted server value
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-market-code'); // Explicitly sanitize client header
  requestHeaders.set('x-market-code', resolvedMarketCode);

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files & images
     */
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
};
