import { NextRequest, NextResponse } from 'next/server';

import { HOMEPAGE_URL } from 'lib/constants';

export function middleware(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname;
  
  // AUTH CHECK - Check for Django session cookie before any rewrites
  const sessionCookie = request.cookies.get('sessionid');

  // If no session cookie and trying to access protected route, redirect to login
  if (!sessionCookie && (pathname.startsWith('/docs') || pathname.startsWith('/account'))) {
    const loginUrl = new URL('/login', HOMEPAGE_URL);
  
    // Add the original URL as 'next' parameter
    loginUrl.searchParams.set('next', request.nextUrl.href);

    return NextResponse.redirect(loginUrl);
  }
  
  // For all other requests (root domain, www, etc.), continue normally
  return NextResponse.next();
}

export const config = {
  // Match all paths except static files and api routes
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};