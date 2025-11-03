// Input sanitization functions
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[;]/g, '') // Remove semicolons
    .substring(0, 1000); // Limit length
}

export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.trim().toLowerCase();
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  return sanitized;
}

export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') return '';
  
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
}

// Password validation
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', 'dragon', 'master'
  ];
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Password contains common weak patterns');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// SQL injection prevention
export function sanitizeForSQL(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[';]/g, '') // Remove single quotes and semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment starts
    .replace(/\*\//g, '') // Remove block comment ends
    .replace(/xp_/gi, '') // Remove xp_ functions
    .replace(/sp_/gi, '') // Remove sp_ functions
    .trim();
}

// XSS prevention
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return '';
  
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// PII Detection and Sanitization for AI/OpenAI usage
export function sanitizeForOpenAI(input: string): string {
  if (typeof input !== 'string') return '';
  
  let sanitized = input.trim();
  
  // Remove or replace common PII patterns
  sanitized = sanitized
    // Names (First Last pattern)
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, '[NAME]')
    
    // Social Security Numbers (XXX-XX-XXXX)
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    .replace(/\b\d{3}\s\d{2}\s\d{4}\b/g, '[SSN]')
    
    // Phone numbers (various formats)
    .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]')
    .replace(/\b\(\d{3}\)\s?\d{3}-\d{4}\b/g, '[PHONE]')
    .replace(/\b\d{3}\.\d{3}\.\d{4}\b/g, '[PHONE]')
    .replace(/\b\d{10}\b/g, '[PHONE]')
    
    // Email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    
    // Addresses (street addresses)
    .replace(/\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Ct|Court|Place|Pl)\b/gi, '[ADDRESS]')
    
    // ZIP codes
    .replace(/\b\d{5}(?:-\d{4})?\b/g, '[ZIPCODE]')
    
    // Titles with names
    .replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|Judge|Attorney|Atty|Esq)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, '[TITLE] [NAME]')
    
    // Credit card numbers (basic pattern)
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_NUMBER]')
    
    // Driver's license numbers (state-specific patterns)
    .replace(/\b[A-Z]{1,2}\d{6,8}\b/g, '[DL_NUMBER]')
    
    // Case numbers and docket numbers
    .replace(/\b(?:Case|Docket|File)\s*#?\s*\d+[A-Za-z]*\b/gi, '[CASE_NUMBER]')
    
    // Account numbers (various formats)
    .replace(/\b(?:Account|Acct)\s*#?\s*\d{4,12}\b/gi, '[ACCOUNT_NUMBER]')
    
    // Dates that might contain sensitive info (keep generic dates)
    .replace(/\b(?:DOB|Birth|Born)\s*:?\s*\d{1,2}\/\d{1,2}\/\d{4}\b/gi, '[DATE_OF_BIRTH]')
    
    // Company names (basic pattern)
    .replace(/\b[A-Z][A-Za-z\s&.,]+(?:Inc|LLC|Corp|Corporation|Company|Co|Ltd|Limited)\b/g, '[COMPANY]')
    
    // Medical record numbers
    .replace(/\b(?:MRN|Medical Record)\s*#?\s*\d+\b/gi, '[MEDICAL_RECORD]')
    
    // Insurance policy numbers
    .replace(/\b(?:Policy|Ins)\s*#?\s*\d{6,12}\b/gi, '[POLICY_NUMBER]')
    
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
  
  return sanitized;
}

// Enhanced PII detection for logging purposes
export function detectPII(input: string): { hasPII: boolean; detectedTypes: string[] } {
  if (typeof input !== 'string') return { hasPII: false, detectedTypes: [] };
  
  const detectedTypes: string[] = [];
  
  // Check for various PII patterns
  if (/\b[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/.test(input)) detectedTypes.push('NAMES');
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(input)) detectedTypes.push('SSN');
  if (/\b\d{3}-\d{3}-\d{4}\b/.test(input)) detectedTypes.push('PHONE');
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(input)) detectedTypes.push('EMAIL');
  if (/\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi.test(input)) detectedTypes.push('ADDRESS');
  if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(input)) detectedTypes.push('CREDIT_CARD');
  
  return {
    hasPII: detectedTypes.length > 0,
    detectedTypes
  };
}

// Sanitize AI context to remove sensitive information
export function sanitizeAIContext(context: string): string {
  if (typeof context !== 'string') return '';
  
  return sanitizeForOpenAI(context)
    // Additional context-specific sanitization
    .replace(/\b(?:Client|Plaintiff|Defendant|Witness|Deponent)\s*:?\s*[A-Z][a-z]+/gi, '[ROLE]: [NAME]')
    .replace(/\b(?:Attorney|Lawyer|Counsel)\s*:?\s*[A-Z][a-z]+/gi, '[ATTORNEY]: [NAME]')
    .replace(/\b(?:Judge|Magistrate)\s*:?\s*[A-Z][a-z]+/gi, '[JUDGE]: [NAME]');
}

