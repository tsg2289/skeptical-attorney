# Security Integration Summary

This document outlines the security features integrated from the original deposition tool application.

## Security Features Implemented

### 1. **Root Middleware** (`middleware.ts`)
- Applies security headers to all requests
- Handles Supabase session management
- Protects routes and redirects unauthenticated users

### 2. **Rate Limiting** (`middleware/rateLimiter.ts`)
- **API Routes**: 100 requests per 15 minutes
- **Authentication**: 5 attempts per 15 minutes
- **General**: 50 requests per 15 minutes
- Automatically cleans up expired entries

### 3. **CSRF Protection** (`middleware/csrf.ts`)
- Generates and validates CSRF tokens
- Protects POST/PUT/DELETE requests
- Automatically skips GET requests and public endpoints
- Token expiration: 1 hour

### 4. **Security Logger** (`utils/securityLogger.ts`)
- Logs security events (auth failures, rate limits, suspicious activity)
- Console logging in development
- File logging in production (`logs/security-error.log` and `logs/security-combined.log`)
- Event types:
  - AUTH_FAILURE / AUTH_SUCCESS
  - RATE_LIMIT
  - INVALID_INPUT
  - SUSPICIOUS_ACTIVITY
  - DATA_ACCESS
  - PERMISSION_DENIED

### 5. **Security Configuration** (`config/security.ts`)
- Centralized security settings
- Rate limiting configuration
- Password policy
- Session settings
- Security headers configuration

### 6. **Security Middleware** (`middleware/security.ts`)
- Combines rate limiting, logging, and security headers
- Pre-configured for different endpoint types:
  - `authSecurity` - For authentication endpoints
  - `apiSecurity` - For API routes
  - `publicSecurity` - For public endpoints

### 7. **Supabase Middleware** (`lib/supabase/middleware.ts`)
- Updates Supabase sessions
- Handles authentication redirects
- Supports dev bypass mode
- Protects deposition routes while allowing public routes

## Security Headers Applied

All requests receive these security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`

API routes also receive:
- `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
- `Pragma: no-cache`
- `Expires: 0`

## API Key Protection

✅ **All API keys are server-side only**
- OpenAI API key: `process.env.OPENAI_API_KEY` (no `NEXT_PUBLIC_` prefix)
- Never exposed to client-side code
- Environment variables in `.env.local` (gitignored)

## Protected Routes

The middleware automatically protects:
- `/services/deposition/*` routes (except login, auth callbacks, and public API routes)

Public routes (no authentication required):
- `/services/deposition/login`
- `/services/deposition/auth/callback`
- `/services/deposition/reset-password`
- `/api/*` (API routes)
- `/` (home page)
- `/services/deposition/debug*` (development only)

## Rate Limiting Details

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| API Routes | 100 requests | 15 minutes |
| Authentication | 5 attempts | 15 minutes |
| General | 50 requests | 15 minutes |

Rate limit exceeded responses include:
- HTTP 429 status
- `retryAfter` header (seconds until retry)

## CSRF Protection

CSRF tokens are required for:
- POST requests
- PUT requests
- DELETE requests

CSRF protection is automatically skipped for:
- GET requests
- Public endpoints (`/api/health`, `/api/public`)
- Supabase endpoints (`/api/supabase`, `/api/auth`)

## Security Logging

Security events are logged with:
- Timestamp
- Event type
- IP address
- User agent
- Endpoint
- Severity level

In production, logs are written to:
- `logs/security-error.log` - Critical and error-level events
- `logs/security-combined.log` - All security events

## Development Mode

In development:
- Security logging outputs to console
- Dev bypass mode available via `NEXT_PUBLIC_DEV_BYPASS_AUTH=true`
- More detailed error messages

## Environment Variables Required

```bash
# OpenAI (Server-side only - NEVER use NEXT_PUBLIC_ prefix)
OPENAI_API_KEY=your_openai_api_key_here

# Supabase (Public keys - safe to expose)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Development Settings
NEXT_PUBLIC_DEV_BYPASS_AUTH=false
```

## Files Protected by .gitignore

- `.env*.local` - Environment files
- `logs/` - Security logs
- `*.log` - All log files
- `*.key`, `*.pem` - Key files
- `secrets/`, `.secrets/` - Secret directories

## Additional Security Measures

1. **Input Validation**: Zod schemas in API routes
2. **PII Sanitization**: Automatic PII detection and sanitization for OpenAI requests
3. **SQL Injection Prevention**: Input sanitization
4. **XSS Prevention**: HTML escaping utilities
5. **Password Policy**: Enforced in validation utilities

## Testing Security Features

To test rate limiting:
1. Make 101 API requests within 15 minutes
2. Should receive HTTP 429 response

To test authentication protection:
1. Try accessing `/services/deposition/dashboard` without authentication
2. Should redirect to `/services/deposition/login`

## Notes

- Security middleware is automatically applied via root `middleware.ts`
- API routes can optionally use `apiSecurity`, `authSecurity`, or `publicSecurity` wrappers
- CSRF tokens are managed automatically by the middleware
- Rate limiting uses in-memory storage (consider Redis for production scaling)

