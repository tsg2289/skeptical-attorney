import { NextRequest, NextResponse } from 'next/server';
import { generalRateLimit } from './rateLimiter';
import { SecurityLogger, getClientIP, getUserAgent } from '../utils/securityLogger';

export interface SecurityConfig {
  enableRateLimit?: boolean;
  enableCSRF?: boolean;
  enableLogging?: boolean;
  rateLimitType?: 'general' | 'strict' | 'auth' | 'api';
  skipCSRF?: string[]; // Endpoints to skip CSRF protection
}

// Helper to get client IP from NextRequest
function getRequestIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

// Security headers middleware for Next.js API routes
export function securityHeaders(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  
  // Set security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
  
  // Prevent caching of API routes that might contain sensitive info
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
  
  return response;
}

// Rate limiting middleware for Next.js API routes
export function rateLimitMiddleware(request: NextRequest, limitType: 'general' | 'auth' | 'api' | 'strict' = 'general'): NextResponse | null {
  const ip = getRequestIP(request);
  const endpoint = request.nextUrl.pathname;
  
  let rateLimitResult;
  if (limitType === 'auth') {
    const { authRateLimit } = require('./rateLimiter');
    rateLimitResult = authRateLimit.isAllowed(ip);
  } else if (limitType === 'api' || limitType === 'strict') {
    // Map 'strict' to 'api' for stricter rate limiting
    const { apiRateLimit } = require('./rateLimiter');
    rateLimitResult = apiRateLimit.isAllowed(ip);
  } else {
    rateLimitResult = generalRateLimit.isAllowed(ip);
  }
  
  if (!rateLimitResult.allowed) {
    SecurityLogger.logRateLimit(ip, endpoint, request.headers.get('user-agent') || undefined);
    
    return NextResponse.json(
      {
        error: 'Too many requests, please try again later',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      },
      { status: 429 }
    );
  }
  
  return null; // Continue processing
}

// Combined security middleware wrapper for Next.js API routes
export function createSecurityMiddleware(config: SecurityConfig = {}) {
  const {
    enableRateLimit = true,
    enableLogging = true,
    rateLimitType = 'general',
    skipCSRF = []
  } = config;

  return (request: NextRequest): NextResponse | null => {
    const endpoint = request.nextUrl.pathname;
    const ip = getRequestIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Apply security headers
    const response = securityHeaders(request);

    // Log all requests if logging is enabled
    if (enableLogging) {
      SecurityLogger.logDataAccess('anonymous', endpoint, request.method, ip, userAgent);
    }

    // Apply rate limiting
    if (enableRateLimit) {
      const rateLimitResult = rateLimitMiddleware(request, rateLimitType);
      if (rateLimitResult) {
        return rateLimitResult;
      }
    }

    return response;
  };
}

// Pre-configured security middleware for different endpoint types
export const authSecurity = createSecurityMiddleware({
  enableRateLimit: true,
  enableLogging: true,
  rateLimitType: 'auth'
});

export const apiSecurity = createSecurityMiddleware({
  enableRateLimit: true,
  enableLogging: true,
  rateLimitType: 'api'
});

export const publicSecurity = createSecurityMiddleware({
  enableRateLimit: true,
  enableLogging: true,
  rateLimitType: 'general'
});

