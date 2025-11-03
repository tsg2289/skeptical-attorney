import crypto from 'crypto';

// In-memory store for CSRF tokens (in production, use Redis or database)
const csrfTokens = new Map<string, { token: string; expires: number }>();

export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + (60 * 60 * 1000); // 1 hour
  
  csrfTokens.set(sessionId, { token, expires });
  
  return token;
}

export function validateCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);
  
  if (!stored) {
    return false;
  }
  
  if (stored.expires < Date.now()) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  return stored.token === token;
}

export function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (data.expires < now) {
      csrfTokens.delete(sessionId);
    }
  }
}

// CSRF protection middleware
export function csrfProtection(req: { method?: string; url?: string; headers: Record<string, string | string[] | undefined> }, res: { status: (code: number) => { json: (data: any) => void }; json: (data: any) => void }, next?: () => void) {
  // Skip CSRF protection for GET requests
  if (req.method === 'GET') {
    if (next) next();
    return;
  }
  
  // Skip CSRF protection for public endpoints and Supabase calls
  const publicEndpoints = ['/api/health', '/api/public'];
  const supabaseEndpoints = ['/api/supabase', '/api/auth'];
  
  if (publicEndpoints.some(endpoint => req.url?.startsWith(endpoint)) ||
      supabaseEndpoints.some(endpoint => req.url?.startsWith(endpoint)) ||
      req.url?.includes('supabase.co')) {
    if (next) next();
    return;
  }
  
  const sessionId = req.headers['x-session-id'] as string;
  const csrfToken = req.headers['x-csrf-token'] as string;
  
  if (!sessionId || !csrfToken) {
    return res.status(403).json({
      error: 'CSRF token missing',
      code: 'CSRF_TOKEN_MISSING'
    });
  }
  
  if (!validateCSRFToken(sessionId, csrfToken)) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }
  
  if (next) next();
}

// Clean up expired tokens every 5 minutes
setInterval(cleanupExpiredTokens, 5 * 60 * 1000);

