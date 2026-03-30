import { NextResponse } from 'next/server';

export function proxy(request) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname === '/login' || pathname === '/register';
  const isApiAuthRoute = pathname.startsWith('/api/auth');
  const isPublicRoute = pathname.startsWith('/_next') || pathname === '/favicon.ico' || pathname.startsWith('/api/cron');

  if (isPublicRoute || isApiAuthRoute) {
    return NextResponse.next();
  }

  // If the user is unauthenticated, redirect them to the login page.
  // We ignore API routes here because `requireSession()` handles 401s on the backend.
  if (!token && !isAuthRoute && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If already authenticated and trying to hit login/register, push them to Dashboard
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
