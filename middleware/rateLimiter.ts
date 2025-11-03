interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = options;
    this.cleanup();
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
    setTimeout(() => this.cleanup(), this.options.windowMs);
  }

  isAllowed(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const key = identifier;

    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.options.windowMs
      };
      return {
        allowed: true,
        remaining: this.options.max - 1,
        resetTime: this.store[key].resetTime
      };
    }

    if (this.store[key].count >= this.options.max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: this.store[key].resetTime
      };
    }

    this.store[key].count++;
    return {
      allowed: true,
      remaining: this.options.max - this.store[key].count,
      resetTime: this.store[key].resetTime
    };
  }
}

export function createRateLimiter(options: RateLimitOptions) {
  return new RateLimiter(options);
}

export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later'
});

export const apiRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many API requests, please try again later'
});

export const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes
  message: 'Too many requests, please try again later'
});

