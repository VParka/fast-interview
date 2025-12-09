// ============================================
// Supabase Middleware Client
// Enhanced with Rate Limiting, Security Headers, and Bot Protection
// ============================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  checkAllLimits,
  getRateLimitHeaders,
  incrementDailyUsage,
} from '@/lib/rate-limit';

// Security headers to add to all responses
const SECURITY_HEADERS = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Enable XSS protection (legacy, but still useful)
  'X-XSS-Protection': '1; mode=block',
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permissions policy (restrict browser features)
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
};

// Content Security Policy for production
const CSP_HEADER = process.env.NODE_ENV === 'production'
  ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.clarity.ms; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.openai.com https://api.cohere.ai wss://*.supabase.co; frame-ancestors 'none';"
  : '';

// Strict Transport Security (only in production with HTTPS)
const HSTS_HEADER = process.env.NODE_ENV === 'production'
  ? 'max-age=31536000; includeSubDomains; preload'
  : '';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshing the auth token
  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // ============================================
  // Rate Limiting for API Routes
  // ============================================
  if (pathname.startsWith('/api/')) {
    // Skip rate limiting for health check endpoints
    if (pathname === '/api/health') {
      return addSecurityHeaders(supabaseResponse);
    }

    // Get user tier (default to free, implement proper tier checking)
    const userTier: 'free' | 'pro' | 'unlimited' = 'free'; // TODO: Get from user profile

    // Check all rate limits
    const limitResult = await checkAllLimits(
      request,
      user?.id,
      pathname,
      userTier
    );

    // Add rate limit headers to response
    for (const [key, value] of Object.entries(limitResult.headers)) {
      supabaseResponse.headers.set(key, value);
    }

    // If rate limited, return 429 Too Many Requests
    if (!limitResult.allowed) {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: limitResult.errorMessage || 'Too many requests',
          ...(limitResult.dailyLimitResult && {
            dailyLimit: {
              limit: limitResult.dailyLimitResult.limit,
              used: limitResult.dailyLimitResult.used,
              resetsAt: limitResult.dailyLimitResult.resetsAt,
            },
          }),
        },
        { status: 429 }
      );

      // Add rate limit headers to error response
      for (const [key, value] of Object.entries(limitResult.headers)) {
        errorResponse.headers.set(key, value);
      }

      return addSecurityHeaders(errorResponse);
    }

    // For successful interview creation, increment daily usage
    // This is done here optimistically; actual increment should be in the route handler
    // after successful creation to avoid counting failed attempts
  }

  // ============================================
  // HTTPS Redirect (Production)
  // ============================================
  if (process.env.NODE_ENV === 'production') {
    const proto = request.headers.get('x-forwarded-proto');
    if (proto === 'http') {
      const httpsUrl = new URL(request.url);
      httpsUrl.protocol = 'https:';
      return NextResponse.redirect(httpsUrl, 301);
    }
  }

  // ============================================
  // Protected Routes (Authentication Required)
  // ============================================
  const protectedPaths = ['/dashboard', '/interview'];
  const isProtectedPath = protectedPaths.some(path =>
    pathname.startsWith(path)
  );

  // Auth routes (redirect if already logged in)
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.some(path =>
    pathname.startsWith(path)
  );

  if (isProtectedPath && !user) {
    // Redirect to login if not authenticated
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    const redirectResponse = NextResponse.redirect(url);
    return addSecurityHeaders(redirectResponse);
  }

  if (isAuthPath && user) {
    // Redirect to dashboard if already authenticated
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    const redirectResponse = NextResponse.redirect(url);
    return addSecurityHeaders(redirectResponse);
  }

  // ============================================
  // API Route Authentication
  // ============================================
  const protectedApiPaths = [
    '/api/interview',
    '/api/upload',
    '/api/rag',
    '/api/profile',
    '/api/credit',
  ];

  const isProtectedApi = protectedApiPaths.some(path =>
    pathname.startsWith(path)
  );

  if (isProtectedApi && !user) {
    const errorResponse = NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
    return addSecurityHeaders(errorResponse);
  }

  return addSecurityHeaders(supabaseResponse);
}

// Helper function to add security headers
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Add security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Add CSP header in production
  if (CSP_HEADER) {
    response.headers.set('Content-Security-Policy', CSP_HEADER);
  }

  // Add HSTS header in production
  if (HSTS_HEADER) {
    response.headers.set('Strict-Transport-Security', HSTS_HEADER);
  }

  return response;
}

// Export for use in API routes that need to increment daily usage
export { incrementDailyUsage };
