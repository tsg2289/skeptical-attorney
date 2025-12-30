/**
 * SOC2-Compliant Data Anonymization Utilities
 * 
 * Before any data is sent to AI systems, this module replaces
 * identifying information with placeholders. After AI response,
 * placeholders are restored to original values.
 * 
 * This protects:
 * - Client confidentiality
 * - Privileged communications
 * - Sensitive personal data
 * - Compliance with legal and ethical rules
 */

export interface AnonymizationMap {
  [placeholder: string]: string;
}

interface AnonymizationResult {
  anonymizedText: string;
  map: AnonymizationMap;
}

// Pattern definitions for sensitive data
const PATTERNS = {
  // Names (common first/last name patterns)
  names: /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
  
  // Email addresses
  emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone numbers (various formats)
  phones: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  
  // Street addresses (number + street name patterns)
  addresses: /\b\d{1,5}\s+(?:[A-Z][a-z]+\s*)+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Court|Ct|Lane|Ln|Boulevard|Blvd|Way|Circle|Cir)\b\.?/gi,
  
  // Social Security Numbers
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // Driver's License (California format and others)
  driverLicense: /\b[A-Z]\d{7}\b/g,
  
  // Case numbers (various court formats)
  caseNumbers: /\b(?:\d{2})?[A-Z]{2,4}[-\s]?\d{5,8}\b/g,
  
  // Policy/Account numbers
  policyNumbers: /\b(?:Policy|Claim|Account|File)[\s#:]*[A-Z0-9-]{6,20}\b/gi,
  
  // Dates of birth
  dob: /\b(?:DOB|Date of Birth|Born)[\s:]*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi,
  
  // Medical conditions/diagnoses (common patterns)
  medical: /\b(?:diagnosed with|suffering from|treatment for)\s+[A-Za-z\s]+(?:syndrome|disease|disorder|injury|fracture|trauma)\b/gi,
};

// Placeholder generators
const generatePlaceholder = (type: string, index: number): string => {
  return `[${type.toUpperCase()}_${index.toString().padStart(3, '0')}]`;
};

/**
 * Anonymize sensitive data in text before sending to AI
 * Returns anonymized text and a map for de-anonymization
 */
export function anonymizeText(text: string): AnonymizationResult {
  const map: AnonymizationMap = {};
  let anonymizedText = text;
  const counters: Record<string, number> = {};

  // Process each pattern type
  Object.entries(PATTERNS).forEach(([type, pattern]) => {
    counters[type] = 0;
    const matches = text.match(pattern) || [];
    
    // Deduplicate matches
    const uniqueMatches = [...new Set(matches)];
    
    uniqueMatches.forEach((match) => {
      const placeholder = generatePlaceholder(type, counters[type]++);
      map[placeholder] = match;
      // Use regex with global flag to replace all occurrences
      anonymizedText = anonymizedText.split(match).join(placeholder);
    });
  });

  return { anonymizedText, map };
}

/**
 * Restore original values from AI response using anonymization map
 */
export function deanonymizeText(text: string, map: AnonymizationMap): string {
  let restoredText = text;
  
  Object.entries(map).forEach(([placeholder, original]) => {
    restoredText = restoredText.split(placeholder).join(original);
  });
  
  return restoredText;
}

/**
 * Anonymize case data object before sending to AI
 */
export function anonymizeCaseData(caseData: {
  plaintiffName?: string;
  defendantName?: string;
  caseFacts?: string;
  caseDescription?: string;
  discoveryText?: string;
}): { anonymized: typeof caseData; map: AnonymizationMap } {
  const fullText = [
    caseData.plaintiffName,
    caseData.defendantName,
    caseData.caseFacts,
    caseData.caseDescription,
    caseData.discoveryText,
  ].filter(Boolean).join('\n---SECTION_BREAK---\n');

  const { anonymizedText, map } = anonymizeText(fullText);
  
  // Split back into components
  const parts = anonymizedText.split('\n---SECTION_BREAK---\n');
  let idx = 0;
  
  const anonymized = {
    plaintiffName: caseData.plaintiffName ? parts[idx++] : undefined,
    defendantName: caseData.defendantName ? parts[idx++] : undefined,
    caseFacts: caseData.caseFacts ? parts[idx++] : undefined,
    caseDescription: caseData.caseDescription ? parts[idx++] : undefined,
    discoveryText: caseData.discoveryText ? parts[idx++] : undefined,
  };

  return { anonymized, map };
}

/**
 * Validate that no PII remains in anonymized text
 * Returns list of potential PII that wasn't caught
 */
export function validateAnonymization(text: string): string[] {
  const potentialPII: string[] = [];
  
  Object.entries(PATTERNS).forEach(([type, pattern]) => {
    const matches = text.match(pattern);
    if (matches) {
      potentialPII.push(...matches.map(m => `[${type}]: ${m}`));
    }
  });
  
  return potentialPII;
}

/**
 * Log anonymization event for audit trail
 */
export function logAnonymizationEvent(
  caseId: string,
  userId: string,
  action: 'anonymize' | 'deanonymize',
  itemCount: number
): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'ANONYMIZATION',
    caseId,
    userId,
    action,
    itemsProcessed: itemCount,
    level: 'INFO'
  }));
}

/**
 * Mask a specific value for display purposes (partial redaction)
 */
export function maskValue(value: string, type: 'ssn' | 'phone' | 'email' | 'account'): string {
  switch (type) {
    case 'ssn':
      return `XXX-XX-${value.slice(-4)}`;
    case 'phone':
      return `(XXX) XXX-${value.slice(-4)}`;
    case 'email':
      const [local, domain] = value.split('@');
      return `${local[0]}***@${domain}`;
    case 'account':
      return `****${value.slice(-4)}`;
    default:
      return '****';
  }
}


