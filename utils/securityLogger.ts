// Simplified security logger that works without winston
// Can be upgraded to use winston in production if needed

export interface SecurityEvent {
  eventType: 'AUTH_FAILURE' | 'AUTH_SUCCESS' | 'RATE_LIMIT' | 'INVALID_INPUT' | 'SUSPICIOUS_ACTIVITY' | 'DATA_ACCESS' | 'PERMISSION_DENIED';
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  endpoint?: string;
  details: Record<string, unknown>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp?: Date;
}

class SecurityLogger {
  private static getLogLevel(severity: SecurityEvent['severity']): string {
    switch (severity) {
      case 'CRITICAL':
        return 'error';
      case 'HIGH':
        return 'warn';
      case 'MEDIUM':
        return 'info';
      case 'LOW':
        return 'info';
      default:
        return 'info';
    }
  }

  private static formatLog(event: SecurityEvent): string {
    const timestamp = event.timestamp || new Date();
    const logEntry = {
      timestamp: timestamp.toISOString(),
      level: this.getLogLevel(event.severity),
      eventType: event.eventType,
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      endpoint: event.endpoint,
      details: event.details,
      severity: event.severity
    };
    return JSON.stringify(logEntry);
  }

  static log(event: SecurityEvent): void {
    const logMessage = this.formatLog(event);
    
    // Log to console (can be redirected to file in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Security] ${logMessage}`);
    } else {
      // In production, you might want to use a logging service
      console.log(`[Security] ${logMessage}`);
    }
    
    // Optionally write to file (Node.js fs)
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
      try {
        const fs = require('fs');
        const path = require('path');
        const logDir = path.join(process.cwd(), 'logs');
        
        // Ensure logs directory exists
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        const logFile = path.join(logDir, `security-${event.severity.toLowerCase() === 'error' || event.severity === 'CRITICAL' ? 'error' : 'combined'}.log`);
        fs.appendFileSync(logFile, logMessage + '\n');
      } catch (err) {
        // Silently fail if file writing is not possible
        console.error('Failed to write security log:', err);
      }
    }
  }

  static logAuthFailure(ipAddress: string, email: string, reason: string, userAgent?: string): void {
    this.log({
      eventType: 'AUTH_FAILURE',
      ipAddress,
      userAgent,
      details: { email, reason },
      severity: 'MEDIUM'
    });
  }

  static logAuthSuccess(userId: string, ipAddress: string, userAgent?: string): void {
    this.log({
      eventType: 'AUTH_SUCCESS',
      userId,
      ipAddress,
      userAgent,
      details: { action: 'login' },
      severity: 'LOW'
    });
  }

  static logRateLimit(ipAddress: string, endpoint: string, userAgent?: string): void {
    this.log({
      eventType: 'RATE_LIMIT',
      ipAddress,
      userAgent,
      endpoint,
      details: { action: 'rate_limit_exceeded' },
      severity: 'MEDIUM'
    });
  }

  static logInvalidInput(ipAddress: string, endpoint: string, input: unknown, userAgent?: string): void {
    this.log({
      eventType: 'INVALID_INPUT',
      ipAddress,
      userAgent,
      endpoint,
      details: { input, reason: 'validation_failed' },
      severity: 'LOW'
    });
  }

  static logSuspiciousActivity(ipAddress: string, activity: string, details: Record<string, unknown>, userAgent?: string): void {
    this.log({
      eventType: 'SUSPICIOUS_ACTIVITY',
      ipAddress,
      userAgent,
      details: { activity, ...details },
      severity: 'HIGH'
    });
  }

  static logDataAccess(userId: string, resource: string, action: string, ipAddress: string, userAgent?: string): void {
    this.log({
      eventType: 'DATA_ACCESS',
      userId,
      ipAddress,
      userAgent,
      details: { resource, action },
      severity: 'LOW'
    });
  }

  static logPermissionDenied(userId: string, resource: string, action: string, ipAddress: string, userAgent?: string): void {
    this.log({
      eventType: 'PERMISSION_DENIED',
      userId,
      ipAddress,
      userAgent,
      details: { resource, action, reason: 'insufficient_permissions' },
      severity: 'MEDIUM'
    });
  }
}

export { SecurityLogger };

// Helper function to get client IP
export function getClientIP(req: { headers: Record<string, string | string[] | undefined>; connection?: { remoteAddress?: string }; socket?: { remoteAddress?: string } }): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return ip || 
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
}

// Helper function to get user agent
export function getUserAgent(req: { headers: Record<string, string | string[] | undefined> }): string {
  const userAgent = req.headers['user-agent'];
  return Array.isArray(userAgent) ? userAgent[0] : userAgent || 'unknown';
}

