/**
 * Utility functions for the Attorney Answer Generator
 */

/**
 * Sanitize text input to prevent XSS and other security issues
 */
export function sanitizeInput(input: string, maxLength: number = 10000): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
}

/**
 * Validate form data for answer generation
 */
export function validateAnswerInput(data: {
  plaintiffName: string
  defendantName: string
  complaintText: string
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data.plaintiffName || data.plaintiffName.trim().length === 0) {
    errors.push('Plaintiff name is required')
  }
  
  if (!data.defendantName || data.defendantName.trim().length === 0) {
    errors.push('Defendant name is required')
  }
  
  if (!data.complaintText || data.complaintText.trim().length === 0) {
    errors.push('Complaint text is required')
  }
  
  if (data.plaintiffName && data.plaintiffName.length > 200) {
    errors.push('Plaintiff name must be less than 200 characters')
  }
  
  if (data.defendantName && data.defendantName.length > 200) {
    errors.push('Defendant name must be less than 200 characters')
  }
  
  if (data.complaintText && data.complaintText.length > 50000) {
    errors.push('Complaint text must be less than 50,000 characters')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Format date for legal documents
 */
export function formatLegalDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Generate filename for document download
 */
export function generateFileName(defendantName: string, documentType: string = 'answer'): string {
  const sanitizedName = defendantName.replace(/[^a-zA-Z0-9]/g, '_')
  const date = new Date().toISOString().split('T')[0]
  return `${documentType}_${sanitizedName}_${date}.txt`
}

/**
 * Rate limiting utility (simple in-memory implementation)
 */
class SimpleRateLimit {
  private requests: Map<string, number[]> = new Map()
  
  isAllowed(identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now()
    const windowStart = now - windowMs
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, [])
    }
    
    const userRequests = this.requests.get(identifier)!
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => time > windowStart)
    
    if (validRequests.length >= maxRequests) {
      return false
    }
    
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return true
  }
}

export const rateLimit = new SimpleRateLimit()

/**
 * Error handling utility
 */
export function handleApiError(error: unknown): { message: string; status: number } {
  if (error instanceof Error) {
    // OpenAI specific errors
    if (error.message.includes('API key')) {
      return { message: 'Invalid API configuration', status: 500 }
    }
    
    if (error.message.includes('rate limit')) {
      return { message: 'Rate limit exceeded. Please try again later.', status: 429 }
    }
    
    if (error.message.includes('insufficient_quota')) {
      return { message: 'Service temporarily unavailable', status: 503 }
    }
    
    return { message: error.message, status: 400 }
  }
  
  return { message: 'An unexpected error occurred', status: 500 }
}



