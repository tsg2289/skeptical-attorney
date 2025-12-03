/**
 * Comprehensive PII Anonymization Pipeline
 * Detects and replaces personal identifying information with neutral placeholders
 * before sending data to OpenAI API
 * Includes re-identification logic to restore original values
 */

export interface PIIMapping {
  [placeholder: string]: string[];
}

export interface ContextualMapping {
  placeholder: string;
  original: string;
  context: string; // Context clues like "Plaintiff", "Defendant", etc.
}

export interface AnonymizationResult {
  anonymizedText: string;
  mapping: PIIMapping;
  contextualMappings: ContextualMapping[]; // Track context for better matching
  originalText: string;
}

/**
 * Comprehensive PII anonymization with mapping - replaces PII with neutral placeholders
 * Returns both anonymized text and mapping for re-identification
 */
export function anonymizeDataWithMapping(data: string): AnonymizationResult {
  if (typeof data !== 'string' || !data.trim()) {
    return {
      anonymizedText: data,
      mapping: {},
      contextualMappings: [],
      originalText: data
    };
  }

  let anonymized = data;
  const mapping: PIIMapping = {};
  const contextualMappings: ContextualMapping[] = [];

  // Helper to add to mapping
  const addToMapping = (placeholder: string, original: string) => {
    if (!mapping[placeholder]) {
      mapping[placeholder] = [];
    }
    if (!mapping[placeholder].includes(original)) {
      mapping[placeholder].push(original);
    }
  };

  // Helper to extract context around a match
  const getContext = (match: string, index: number, text: string): string => {
    const contextWindow = 50; // Look 50 chars before and after
    const start = Math.max(0, index - contextWindow);
    const end = Math.min(text.length, index + match.length + contextWindow);
    const context = text.substring(start, end).toLowerCase();
    
    // Extract key context words
    const contextWords: string[] = [];
    if (/\bplaintiff\b/i.test(context)) contextWords.push('plaintiff');
    if (/\bdefendant\b/i.test(context)) contextWords.push('defendant');
    if (/\bclient\b/i.test(context)) contextWords.push('client');
    if (/\bwitness\b/i.test(context)) contextWords.push('witness');
    if (/\bdeponent\b/i.test(context)) contextWords.push('deponent');
    if (/\bpetitioner\b/i.test(context)) contextWords.push('petitioner');
    if (/\brespondent\b/i.test(context)) contextWords.push('respondent');
    if (/\binsured\b/i.test(context)) contextWords.push('insured');
    if (/\bclaimant\b/i.test(context)) contextWords.push('claimant');
    
    return contextWords.join('|');
  };

  // Names with titles (must come before standalone names)
  anonymized = anonymized.replace(
    /\b(?:Mr|Mrs|Ms|Dr|Prof|Judge|Attorney|Atty|Esq|Hon)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
    (match, offset) => {
      addToMapping('[TITLE] [NAME]', match);
      const context = getContext(match, offset, data);
      contextualMappings.push({
        placeholder: '[TITLE] [NAME]',
        original: match,
        context: context
      });
      return '[TITLE] [NAME]';
    }
  );

  // Standalone names (First Last pattern) - process on original data to avoid double replacement
  const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const nameMatches: Array<{ match: string; index: number }> = [];
  let nameMatch;
  while ((nameMatch = namePattern.exec(data)) !== null) {
    // Check if this name was part of a title (look back 20 chars)
    const beforeIndex = Math.max(0, nameMatch.index - 20);
    const beforeText = data.substring(beforeIndex, nameMatch.index);
    if (!/\b(?:Mr|Mrs|Ms|Dr|Prof|Judge|Attorney|Atty|Esq|Hon)\.?\s+$/.test(beforeText)) {
      nameMatches.push({ match: nameMatch[0], index: nameMatch.index });
    }
  }
  // Replace names in reverse order to preserve indices
  nameMatches.reverse().forEach(({ match, index }) => {
    if (anonymized.includes(match)) {
      addToMapping('[NAME]', match);
      const context = getContext(match, index, data);
      contextualMappings.push({
        placeholder: '[NAME]',
        original: match,
        context: context
      });
      anonymized = anonymized.replace(match, '[NAME]');
    }
  });

  // Email addresses
  anonymized = anonymized.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    (match) => {
      addToMapping('[EMAIL]', match);
      return '[EMAIL]';
    }
  );

  // Phone numbers (various formats)
  anonymized = anonymized.replace(
    /\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/g,
    (match) => {
      addToMapping('[PHONE]', match);
      return '[PHONE]';
    }
  );

  // Phone numbers - second format (process on original to distinguish from SSN)
  const phonePattern2 = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const phoneMatches2: Array<{ match: string; index: number }> = [];
  let phoneMatch2;
  while ((phoneMatch2 = phonePattern2.exec(data)) !== null) {
    const match = phoneMatch2[0];
    // Only add if it's NOT SSN format (middle part should be 3 digits, not 2)
    if (!/^\d{3}[-.\s]?\d{2}[-.\s]?\d{4}$/.test(match)) {
      phoneMatches2.push({ match, index: phoneMatch2.index });
    }
  }
  phoneMatches2.reverse().forEach(({ match }) => {
    if (anonymized.includes(match)) {
      addToMapping('[PHONE]', match);
      anonymized = anonymized.replace(match, '[PHONE]');
    }
  });

  // Social Security Numbers (XXX-XX-XXXX format - middle 2 digits)
  // Process on original data to avoid conflicts with phone numbers
  const ssnPattern = /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g;
  const ssnMatches: Array<{ match: string; index: number }> = [];
  let ssnMatch;
  while ((ssnMatch = ssnPattern.exec(data)) !== null) {
    ssnMatches.push({ match: ssnMatch[0], index: ssnMatch.index });
  }
  ssnMatches.reverse().forEach(({ match }) => {
    if (anonymized.includes(match)) {
      addToMapping('[SSN]', match);
      anonymized = anonymized.replace(match, '[SSN]');
    }
  });

  // Physical addresses (street addresses)
  anonymized = anonymized.replace(
    /\b\d+\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Ct|Court|Place|Pl|Highway|Hwy)\b/gi,
    (match) => {
      addToMapping('[ADDRESS]', match);
      return '[ADDRESS]';
    }
  );

  // ZIP codes (but preserve in context of [ADDRESS] if already replaced)
  anonymized = anonymized.replace(
    /\b(?!\[ADDRESS\])\d{5}(?:-\d{4})?\b/g,
    (match) => {
      addToMapping('[ZIPCODE]', match);
      return '[ZIPCODE]';
    }
  );

  // Credit card numbers
  anonymized = anonymized.replace(
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    (match) => {
      addToMapping('[CARD_NUMBER]', match);
      return '[CARD_NUMBER]';
    }
  );

  // Driver's license numbers
  anonymized = anonymized.replace(
    /\b[A-Z]{1,2}\d{6,9}\b/g,
    (match) => {
      addToMapping('[DRIVERS_LICENSE]', match);
      return '[DRIVERS_LICENSE]';
    }
  );

  // Case numbers and docket numbers
  anonymized = anonymized.replace(
    /\b(?:Case|Docket|File|Matter)\s*#?\s*[A-Z0-9-]+\b/gi,
    (match) => {
      addToMapping('[CASE_NUMBER]', match);
      return '[CASE_NUMBER]';
    }
  );

  // Account numbers
  anonymized = anonymized.replace(
    /\b(?:Account|Acct|Account\s*Number)\s*#?\s*\d{4,16}\b/gi,
    (match) => {
      addToMapping('[ACCOUNT_NUMBER]', match);
      return '[ACCOUNT_NUMBER]';
    }
  );

  // Dates of birth
  anonymized = anonymized.replace(
    /\b(?:DOB|Birth|Born|Date\s*of\s*Birth)\s*:?\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi,
    (match) => {
      addToMapping('[DATE_OF_BIRTH]', match);
      return '[DATE_OF_BIRTH]';
    }
  );

  // Company names with legal suffixes
  anonymized = anonymized.replace(
    /\b[A-Z][A-Za-z0-9\s&.,'-]+(?:Inc|LLC|Corp|Corporation|Company|Co|Ltd|Limited|Partnership|LP|LLP)\b/g,
    (match) => {
      addToMapping('[COMPANY]', match);
      return '[COMPANY]';
    }
  );

  // Medical record numbers
  anonymized = anonymized.replace(
    /\b(?:MRN|Medical\s*Record|Patient\s*ID)\s*#?\s*[A-Z0-9-]+\b/gi,
    (match) => {
      addToMapping('[MEDICAL_RECORD]', match);
      return '[MEDICAL_RECORD]';
    }
  );

  // Insurance policy numbers
  anonymized = anonymized.replace(
    /\b(?:Policy|Ins|Insurance)\s*#?\s*[A-Z0-9-]{6,20}\b/gi,
    (match) => {
      addToMapping('[INSURANCE_POLICY]', match);
      return '[INSURANCE_POLICY]';
    }
  );

  // IP addresses
  anonymized = anonymized.replace(
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    (match) => {
      addToMapping('[IP_ADDRESS]', match);
      return '[IP_ADDRESS]';
    }
  );

  // Legal roles with names
  anonymized = anonymized.replace(
    /\b(?:Client|Plaintiff|Defendant|Witness|Deponent|Petitioner|Respondent)\s*:?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/gi,
    (match, offset) => {
      addToMapping('[LEGAL_ROLE]: [NAME]', match);
      // Extract the role from the match itself
      const roleMatch = match.match(/\b(Client|Plaintiff|Defendant|Witness|Deponent|Petitioner|Respondent)\b/i);
      const role = roleMatch ? roleMatch[1].toLowerCase() : '';
      contextualMappings.push({
        placeholder: '[LEGAL_ROLE]: [NAME]',
        original: match,
        context: role
      });
      return '[LEGAL_ROLE]: [NAME]';
    }
  );

  // Clean up multiple spaces
  anonymized = anonymized.replace(/\s+/g, ' ').trim();

  return {
    anonymizedText: anonymized,
    mapping,
    contextualMappings,
    originalText: data
  };
}

/**
 * Simple anonymization without mapping (backward compatibility)
 */
export function anonymizeData(data: string): string {
  if (typeof data !== 'string' || !data.trim()) {
    return data;
  }

  let anonymized = data;

  // Names with titles (must come before standalone names)
  anonymized = anonymized.replace(
    /\b(?:Mr|Mrs|Ms|Dr|Prof|Judge|Attorney|Atty|Esq|Hon)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
    '[TITLE] [NAME]'
  );

  // Standalone names (First Last pattern)
  anonymized = anonymized.replace(
    /\b[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
    '[NAME]'
  );

  // Email addresses
  anonymized = anonymized.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[EMAIL]'
  );

  // Phone numbers (various formats)
  anonymized = anonymized.replace(
    /\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/g,
    '[PHONE]'
  );
  anonymized = anonymized.replace(
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    '[PHONE]'
  );
  // 10-digit numbers that look like phone numbers (but not dates or other numbers)
  anonymized = anonymized.replace(
    /\b(?<![\d\/-])([2-9]\d{2})([2-9]\d{2})(\d{4})(?![\d\/-])\b/g,
    '[PHONE]'
  );

  // Social Security Numbers (XXX-XX-XXXX or XXX XX XXXX or XXX.XX.XXXX)
  anonymized = anonymized.replace(
    /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    '[SSN]'
  );

  // Physical addresses (street addresses)
  anonymized = anonymized.replace(
    /\b\d+\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Ct|Court|Place|Pl|Highway|Hwy)\b/gi,
    '[ADDRESS]'
  );

  // ZIP codes (but preserve in context of [ADDRESS] if already replaced)
  anonymized = anonymized.replace(
    /\b(?!\[ADDRESS\])\d{5}(?:-\d{4})?\b/g,
    '[ZIPCODE]'
  );

  // Credit card numbers
  anonymized = anonymized.replace(
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    '[CARD_NUMBER]'
  );

  // Driver's license numbers
  anonymized = anonymized.replace(
    /\b[A-Z]{1,2}\d{6,9}\b/g,
    '[DRIVERS_LICENSE]'
  );

  // Case numbers and docket numbers
  anonymized = anonymized.replace(
    /\b(?:Case|Docket|File|Matter)\s*#?\s*[A-Z0-9-]+\b/gi,
    '[CASE_NUMBER]'
  );

  // Account numbers
  anonymized = anonymized.replace(
    /\b(?:Account|Acct|Account\s*Number)\s*#?\s*\d{4,16}\b/gi,
    '[ACCOUNT_NUMBER]'
  );

  // Dates of birth
  anonymized = anonymized.replace(
    /\b(?:DOB|Birth|Born|Date\s*of\s*Birth)\s*:?\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi,
    '[DATE_OF_BIRTH]'
  );

  // Company names with legal suffixes
  anonymized = anonymized.replace(
    /\b[A-Z][A-Za-z0-9\s&.,'-]+(?:Inc|LLC|Corp|Corporation|Company|Co|Ltd|Limited|Partnership|LP|LLP)\b/g,
    '[COMPANY]'
  );

  // Medical record numbers
  anonymized = anonymized.replace(
    /\b(?:MRN|Medical\s*Record|Patient\s*ID)\s*#?\s*[A-Z0-9-]+\b/gi,
    '[MEDICAL_RECORD]'
  );

  // Insurance policy numbers
  anonymized = anonymized.replace(
    /\b(?:Policy|Ins|Insurance)\s*#?\s*[A-Z0-9-]{6,20}\b/gi,
    '[INSURANCE_POLICY]'
  );

  // IP addresses
  anonymized = anonymized.replace(
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    '[IP_ADDRESS]'
  );

  // Legal roles with names
  anonymized = anonymized.replace(
    /\b(?:Client|Plaintiff|Defendant|Witness|Deponent|Petitioner|Respondent)\s*:?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/gi,
    '[LEGAL_ROLE]: [NAME]'
  );

  // Clean up multiple spaces
  anonymized = anonymized.replace(/\s+/g, ' ').trim();

  return anonymized;
}

/**
 * Re-identify placeholders in text using the mapping
 * Restores original PII values from placeholders in AI responses
 * Uses context-aware matching to prevent name swapping
 */
export function reidentifyData(
  text: string, 
  mapping: PIIMapping, 
  contextualMappings?: ContextualMapping[]
): string {
  if (typeof text !== 'string' || !text.trim()) {
    return text;
  }

  if (!mapping || Object.keys(mapping).length === 0) {
    return text;
  }

  let restored = text;

  // Helper to get context around a placeholder in the response text
  const getResponseContext = (match: string, index: number, text: string): string => {
    const contextWindow = 50;
    const start = Math.max(0, index - contextWindow);
    const end = Math.min(text.length, index + match.length + contextWindow);
    const context = text.substring(start, end).toLowerCase();
    
    const contextWords: string[] = [];
    if (/\bplaintiff\b/i.test(context)) contextWords.push('plaintiff');
    if (/\bdefendant\b/i.test(context)) contextWords.push('defendant');
    if (/\bclient\b/i.test(context)) contextWords.push('client');
    if (/\bwitness\b/i.test(context)) contextWords.push('witness');
    if (/\bdeponent\b/i.test(context)) contextWords.push('deponent');
    if (/\bpetitioner\b/i.test(context)) contextWords.push('petitioner');
    if (/\brespondent\b/i.test(context)) contextWords.push('respondent');
    if (/\binsured\b/i.test(context)) contextWords.push('insured');
    if (/\bclaimant\b/i.test(context)) contextWords.push('claimant');
    
    return contextWords.join('|');
  };

  // Restore in reverse order of priority (most specific first to avoid conflicts)
  const placeholderOrder = [
    '[LEGAL_ROLE]: [NAME]',
    '[TITLE] [NAME]',
    '[NAME]',
    '[EMAIL]',
    '[PHONE]',
    '[SSN]',
    '[ADDRESS]',
    '[ZIPCODE]',
    '[CARD_NUMBER]',
    '[DRIVERS_LICENSE]',
    '[CASE_NUMBER]',
    '[ACCOUNT_NUMBER]',
    '[DATE_OF_BIRTH]',
    '[COMPANY]',
    '[MEDICAL_RECORD]',
    '[INSURANCE_POLICY]',
    '[IP_ADDRESS]'
  ];

  // For each placeholder type, restore all instances
  placeholderOrder.forEach(placeholder => {
    if (mapping[placeholder] && mapping[placeholder].length > 0) {
      const originals = mapping[placeholder];
      
      // If we have contextual mappings and multiple originals, use context-aware matching
      if (contextualMappings && contextualMappings.length > 0 && originals.length > 1) {
        // Create a copy of contextual mappings to avoid modifying the original
        const availableMappings = [...contextualMappings].filter(cm => cm.placeholder === placeholder);
        const availableOriginals = [...originals];
        
        // Find all placeholder occurrences with their positions
        const placeholderRegex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const matches: Array<{ match: string; index: number }> = [];
        let match;
        while ((match = placeholderRegex.exec(restored)) !== null) {
          matches.push({ match: match[0], index: match.index });
        }

        // For each placeholder in the response, try to match by context
        matches.reverse().forEach(({ match, index }) => {
          const responseContext = getResponseContext(match, index, restored);
          
          // Find the best matching original based on context
          let bestMatch: string | null = null;
          let bestScore = 0;
          let bestMappingIndex = -1;
          
          if (availableMappings.length > 0 && responseContext) {
            // Score each original based on context match
            availableMappings.forEach((cm, idx) => {
              if (cm.context && responseContext) {
                const contextParts = cm.context.split('|');
                const responseParts = responseContext.split('|');
                const score = contextParts.filter(cp => responseParts.includes(cp)).length;
                if (score > bestScore) {
                  bestScore = score;
                  bestMatch = cm.original;
                  bestMappingIndex = idx;
                }
              }
            });
          }
          
          // If we found a context match, use it; otherwise use round-robin
          if (bestMatch && bestMappingIndex >= 0) {
            restored = restored.substring(0, index) + bestMatch + restored.substring(index + match.length);
            // Remove the used mapping to avoid reuse
            availableMappings.splice(bestMappingIndex, 1);
            const originalIndex = availableOriginals.indexOf(bestMatch);
            if (originalIndex >= 0) {
              availableOriginals.splice(originalIndex, 1);
            }
          } else if (availableOriginals.length > 0) {
            // Fallback to round-robin
            const original = availableOriginals[0];
            restored = restored.substring(0, index) + original + restored.substring(index + match.length);
            availableOriginals.shift(); // Remove used original
          }
        });
      } else {
        // Simple round-robin for single values or when no context available
        let originalIndex = 0;
        restored = restored.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          () => {
            const original = originals[originalIndex % originals.length];
            originalIndex++;
            return original;
          }
        );
      }
    }
  });

  return restored;
}





