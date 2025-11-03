// Flagged words and their suggested alternatives
const flaggedWordsMap = new Map([
  // Deposition-related words (client flagged)
  ['deposition', {
    alternatives: ['examination', 'testimony', 'oral examination', 'sworn statement', 'examination under oath'],
    reason: 'Client has flagged this word - consider using alternatives',
    severity: 'warning'
  }],
  ['depose', {
    alternatives: ['examine', 'question under oath', 'take testimony', 'conduct examination'],
    reason: 'Client has flagged this word - consider using alternatives',
    severity: 'warning'
  }],
  ['deposing', {
    alternatives: ['examining', 'questioning under oath', 'taking testimony', 'conducting examination'],
    reason: 'Client has flagged this word - consider using alternatives',
    severity: 'warning'
  }],
  ['deposed', {
    alternatives: ['examined', 'questioned under oath', 'testified', 'gave sworn statement'],
    reason: 'Client has flagged this word - consider using alternatives',
    severity: 'warning'
  }],
  
  // Sensitive information flags
  ['client name', {
    alternatives: ['client', 'party', 'individual', 'person'],
    reason: 'Contains potentially sensitive client identification information',
    severity: 'high'
  }],
  ['plaintiff', {
    alternatives: ['claimant', 'petitioner', 'complainant', 'party'],
    reason: 'Identifies a party to the litigation',
    severity: 'medium'
  }],
  ['defendant', {
    alternatives: ['respondent', 'accused', 'party', 'opposing party'],
    reason: 'Identifies a party to the litigation',
    severity: 'medium'
  }],
  ['company name', {
    alternatives: ['entity', 'organization', 'corporation', 'business'],
    reason: 'Contains potentially sensitive business identification information',
    severity: 'high'
  }],
  ['address', {
    alternatives: ['location', 'place', 'site', 'premises'],
    reason: 'Contains potentially sensitive location information',
    severity: 'high'
  }],
  ['phone number', {
    alternatives: ['contact information', 'telephone', 'phone', 'communication'],
    reason: 'Contains potentially sensitive contact information',
    severity: 'high'
  }],
  ['email', {
    alternatives: ['electronic communication', 'message', 'correspondence', 'contact'],
    reason: 'Contains potentially sensitive contact information',
    severity: 'high'
  }],
  ['social security', {
    alternatives: ['SSN', 'identification number', 'ID number', 'personal identifier'],
    reason: 'Contains highly sensitive personal identification information',
    severity: 'critical'
  }],
  ['ssn', {
    alternatives: ['social security number', 'identification number', 'ID number', 'personal identifier'],
    reason: 'Contains highly sensitive personal identification information',
    severity: 'critical'
  }],
  ['date of birth', {
    alternatives: ['DOB', 'birth date', 'age', 'personal information'],
    reason: 'Contains potentially sensitive personal information',
    severity: 'high'
  }],
  ['dob', {
    alternatives: ['date of birth', 'birth date', 'age', 'personal information'],
    reason: 'Contains potentially sensitive personal information',
    severity: 'high'
  }],
  ['medical record', {
    alternatives: ['health information', 'medical information', 'health data', 'medical data'],
    reason: 'Contains highly sensitive medical information protected by HIPAA',
    severity: 'critical'
  }],
  ['financial information', {
    alternatives: ['financial data', 'monetary information', 'economic data', 'financial details'],
    reason: 'Contains potentially sensitive financial information',
    severity: 'high'
  }],
  ['bank account', {
    alternatives: ['account', 'financial account', 'banking information', 'account number'],
    reason: 'Contains highly sensitive financial account information',
    severity: 'critical'
  }],
  ['credit card', {
    alternatives: ['payment method', 'card information', 'payment card', 'financial instrument'],
    reason: 'Contains highly sensitive payment information',
    severity: 'critical'
  }],
  ['personal information', {
    alternatives: ['personal data', 'individual information', 'personal details', 'private information'],
    reason: 'Contains potentially sensitive personal information',
    severity: 'high'
  }],
  ['confidential', {
    alternatives: ['private', 'sensitive', 'restricted', 'proprietary'],
    reason: 'Indicates sensitive or restricted information',
    severity: 'medium'
  }],
  ['privileged', {
    alternatives: ['protected', 'confidential', 'restricted', 'sensitive'],
    reason: 'Indicates legally protected information',
    severity: 'medium'
  }],
  ['attorney-client', {
    alternatives: ['legal privilege', 'attorney privilege', 'legal protection', 'privileged communication'],
    reason: 'Indicates legally privileged attorney-client communication',
    severity: 'medium'
  }],
  ['work product', {
    alternatives: ['attorney work product', 'legal work', 'case preparation', 'litigation materials'],
    reason: 'Indicates attorney work product that may be privileged',
    severity: 'medium'
  }]
]);

export function checkText(text: string): Array<{
  word: string;
  count: number;
  alternatives: string[];
  reason: string;
  severity: string;
}> {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const flags: Array<{
    word: string;
    count: number;
    alternatives: string[];
    reason: string;
    severity: string;
  }> = [];
  
  for (const [word, config] of flaggedWordsMap.entries()) {
    // Use different regex patterns for single words vs multi-word phrases
    let regex: RegExp;
    if (word.includes(' ')) {
      // Multi-word phrases: use case-insensitive search without word boundaries
      regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    } else {
      // Single words: use word boundaries
      regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    }
    
    const matches = text.match(regex);
    
    if (matches) {
      flags.push({
        word: word,
        count: matches.length,
        alternatives: config.alternatives,
        reason: config.reason,
        severity: config.severity
      });
    }
  }
  
  return flags;
}

export function replaceWord(text: string, flaggedWord: string, replacement: string): string {
  if (!text || !flaggedWord || !replacement) {
    return text;
  }
  
  // Handle multi-word phrases differently
  let regex: RegExp;
  if (flaggedWord.includes(' ')) {
    regex = new RegExp(flaggedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  } else {
    regex = new RegExp(`\\b${flaggedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  }
  
  return text.replace(regex, replacement);
}

export function getFlaggedWords() {
  return flaggedWordsMap;
}


