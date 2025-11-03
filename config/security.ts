export const securityConfig = {
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  csrf: {
    tokenLength: 32,
    cookieName: 'csrf-token',
  },
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict' as const,
  },
  headers: {
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
  },
  environment: {
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test'
  }
};

export const securityEventTypes = {
  LOGIN_ATTEMPT: 'login_attempt',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  CSRF_VIOLATION: 'csrf_violation',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  PASSWORD_RESET_REQUEST: 'password_reset_request',
  PASSWORD_RESET_SUCCESS: 'password_reset_success',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked',
} as const;

export type SecurityEventType = typeof securityEventTypes[keyof typeof securityEventTypes];

