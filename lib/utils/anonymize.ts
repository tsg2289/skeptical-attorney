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

  // Helper to extract context around a match - ENHANCED VERSION
  const getContext = (match: string, index: number, text: string): string => {
    const contextWindow = 100; // Increased from 50 to capture more context
    const start = Math.max(0, index - contextWindow);
    const end = Math.min(text.length, index + match.length + contextWindow);
    const context = text.substring(start, end).toLowerCase();
    const beforeMatch = text.substring(start, index).toLowerCase();
    const afterMatch = text.substring(index + match.length, end).toLowerCase();
    
    // Extract key context words
    const contextWords: string[] = [];
    
    // Explicit role labels
    if (/\bplaintiff\b/i.test(context)) contextWords.push('plaintiff');
    if (/\bdefendant\b/i.test(context)) contextWords.push('defendant');
    if (/\bclient\b/i.test(context)) contextWords.push('client');
    if (/\bwitness\b/i.test(context)) contextWords.push('witness');
    if (/\bdeponent\b/i.test(context)) contextWords.push('deponent');
    if (/\bpetitioner\b/i.test(context)) contextWords.push('petitioner');
    if (/\brespondent\b/i.test(context)) contextWords.push('respondent');
    if (/\binsured\b/i.test(context)) contextWords.push('insured');
    if (/\bclaimant\b/i.test(context)) contextWords.push('claimant');
    
    // ENHANCED: Semantic pattern detection for employment cases
    // Pattern: "[PLAINTIFF] was employed by [DEFENDANT]"
    if (/\bwas employed by\b/i.test(afterMatch)) {
      contextWords.push('plaintiff', 'client', 'claimant');
    }
    if (/\bwas employed by\b/i.test(beforeMatch)) {
      contextWords.push('defendant', 'respondent');
    }
    
    // Pattern: "[PLAINTIFF] worked for/at [DEFENDANT]"
    if (/\bworked (?:for|at)\b/i.test(afterMatch)) {
      contextWords.push('plaintiff', 'client');
    }
    if (/\bworked (?:for|at)\b/i.test(beforeMatch)) {
      contextWords.push('defendant');
    }
    
    // Pattern: "[DEFENDANT] employed/hired [PLAINTIFF]"
    if (/\b(?:employed|hired)\b/i.test(afterMatch) && !/\bwas\b/i.test(afterMatch)) {
      contextWords.push('defendant');
    }
    if (/\b(?:employed|hired) by\b/i.test(beforeMatch)) {
      contextWords.push('plaintiff', 'client');
    }
    
    // Pattern: "[PLAINTIFF] was injured/harmed by [DEFENDANT]"
    if (/\bwas (?:injured|harmed|hurt|damaged|defrauded) by\b/i.test(afterMatch)) {
      contextWords.push('plaintiff', 'client');
    }
    if (/\bwas (?:injured|harmed|hurt|damaged|defrauded) by\b/i.test(beforeMatch)) {
      contextWords.push('defendant');
    }
    
    // Pattern: "[PLAINTIFF] sustained injuries" (no defendant needed)
    if (/\bsustained (?:injuries|damages)\b/i.test(afterMatch)) {
      contextWords.push('plaintiff', 'client');
    }
    
    // Pattern: "Our client [PLAINTIFF]" or "represents [PLAINTIFF]"
    if (/\b(?:our client|represents|representing)\b/i.test(beforeMatch)) {
      contextWords.push('plaintiff', 'client');
    }
    
    // Pattern: Entity with LLC, Inc, Corp = likely defendant/employer
    if (/,?\s*(?:llc|inc|corp|ltd|l\.l\.c\.|co\.|company)\b/i.test(afterMatch.substring(0, 20))) {
      contextWords.push('defendant');
    }
    
    return [...new Set(contextWords)].join('|'); // Remove duplicates
  };

  // Helper to get role-specific placeholder based on context
  const getRolePlaceholder = (context: string, isCompany: boolean): string => {
    const ctx = context.toLowerCase();
    
    // Check for plaintiff/client indicators
    if (ctx.includes('plaintiff') || ctx.includes('client') || ctx.includes('claimant')) {
      return isCompany ? '[PLAINTIFF_COMPANY]' : '[PLAINTIFF]';
    }
    
    // Check for defendant/employer indicators
    if (ctx.includes('defendant') || ctx.includes('respondent') || ctx.includes('insured')) {
      return isCompany ? '[DEFENDANT_COMPANY]' : '[DEFENDANT]';
    }
    
    // Fallback to generic placeholders
    return isCompany ? '[COMPANY]' : '[NAME]';
  };

  // Names with titles (must come before standalone names)
  anonymized = anonymized.replace(
    /\b(?:Mr|Mrs|Ms|Dr|Prof|Judge|Attorney|Atty|Esq|Hon)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
    (match, offset) => {
      const context = getContext(match, offset, data);
      const basePlaceholder = getRolePlaceholder(context, false);
      // Use role-specific placeholder with title indicator
      const placeholder = basePlaceholder === '[PLAINTIFF]' ? '[TITLE] [PLAINTIFF]' :
                         basePlaceholder === '[DEFENDANT]' ? '[TITLE] [DEFENDANT]' :
                         '[TITLE] [NAME]';
      addToMapping(placeholder, match);
      contextualMappings.push({
        placeholder: placeholder,
        original: match,
        context: context
      });
      return placeholder;
    }
  );

  // Standalone names (First Last pattern) - process on original data to avoid double replacement
  const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  
  // Common phrases that look like names but aren't - exclude these from name detection
  const excludedPhrases = new Set([
    // Legal terms
    'Settlement Demand', 'Economic Damages', 'Non Economic', 'Medical Treatment',
    'Case Summary', 'General Damages', 'Special Damages', 'Punitive Damages',
    'Compensatory Damages', 'Property Damage', 'Lost Wages', 'Pain Suffering',
    'Emotional Distress', 'Mental Anguish', 'Loss Consortium', 'Wrongful Termination',
    'Breach Contract', 'Personal Injury', 'Premises Liability', 'Products Liability',
    'Medical Malpractice', 'Legal Malpractice', 'Insurance Coverage', 'Policy Limits',
    'Liability Coverage', 'Documentation Provided',
    // California Codes and Legal References (CRITICAL - these look like names!)
    'Labor Code', 'Civil Code', 'Penal Code', 'Government Code', 'Vehicle Code',
    'Business Professions', 'Health Safety', 'Family Code', 'Probate Code',
    'Insurance Code', 'Revenue Taxation', 'Corporations Code', 'Education Code',
    'Elections Code', 'Evidence Code', 'Financial Code', 'Fish Game',
    'Food Agricultural', 'Harbors Navigation', 'Military Veterans', 'Public Contract',
    'Public Resources', 'Public Utilities', 'Streets Highways', 'Unemployment Insurance',
    'Water Code', 'Welfare Institutions', 'Code Civil', 'Code Section', 
    'California Code', 'Federal Code', 'United States',
    // Legal terms that look like names
    'Civil Penalties', 'Criminal Penalties', 'Statutory Penalties', 'Civil Procedure',
    'Criminal Procedure', 'Due Process', 'Equal Protection', 'Good Faith',
    'Bad Faith', 'Prima Facie', 'Res Judicata', 'Summary Judgment',
    'Default Judgment', 'Bench Trial', 'Jury Trial', 'Settlement Agreement',
    'Settlement Conference', 'Case Management', 'Discovery Requests',
    'Interrogatory Responses', 'Document Production', 'Motion Practice',
    'Oral Argument', 'Written Argument', 'Legal Analysis', 'Legal Research',
    'Affirmative Defenses', 'Statute Limitations', 'Burden Proof', 'Standard Care',
    'Proximate Cause', 'Actual Damages', 'Nominal Damages', 'Treble Damages',
    'Liquidated Damages', 'Consequential Damages', 'Incidental Damages',
    // Business/HR terms
    'Human Resources', 'Legal Services', 'Professional Services', 'Administrative Services',
    'Customer Service', 'Technical Support', 'Quality Control', 'Risk Management',
    'Claims Department', 'Legal Department', 'Pacific Logistics',
    // Section titles
    'Case Description', 'Facts Section', 'Liability Section', 'Damages Section',
  ]);
  
  // Pattern-based exclusions: words that indicate business/government entities, not person names
  const businessSuffixes = /\b(Development|Agency|Department|Division|Bureau|Commission|Authority|Services|Solutions|Logistics|Management|Operations|Resources|Group|Industries|Systems|Technologies|Consulting|Enterprises|Associates|Partners|Corporation|Foundation|Institute|Organization|Administration|Board|Council|Office|Center|Clinic|Hospital|University|College|School|Bank|Insurance|Financial|Holdings|Ventures|Capital|Media|Communications|Marketing|Staffing|Recruiting|Delivery|Distribution|Transport|Freight|Shipping|Supply|Warehouse|Manufacturing|Production|Construction|Engineering|Design|Architecture|Analytics|Software|Network|Digital|Global|National|International|Regional|Metro|County|State|Federal)$/i;
  
  // US State names that often appear in business/agency names
  const stateNames = /^(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i;
  
  // Helper function to check if a phrase looks like a business/entity name rather than a person
  const isLikelyBusinessName = (phrase: string): boolean => {
    // Check static exclusions first
    if (excludedPhrases.has(phrase)) return true;
    
    // Check if starts with a legal role word (these are handled by the legal roles pattern)
    if (/^(Plaintiff|Plaintiffs|Defendant|Defendants|Client|Clients|Witness|Witnesses|Deponent|Deponents|Petitioner|Petitioners|Respondent|Respondents)\b/i.test(phrase)) return true;
    
    // Check if ends with business/government suffix
    if (businessSuffixes.test(phrase)) return true;
    
    // Check if starts with a US state name (likely an agency)
    if (stateNames.test(phrase)) return true;
    
    // Check if ends with "Code" (legal reference, not a name)
    if (/\bCode$/i.test(phrase)) return true;
    
    // Check if ends with common legal terms that look like names
    if (/\b(Penalties|Procedure|Process|Judgment|Trial|Agreement|Practice|Damages|Coverage|Liability|Malpractice|Professions|Safety|Navigation|Insurance|Resources|Utilities|Highways|Veterans|Contract|Institutions)$/i.test(phrase)) return true;
    
    // Check for common business patterns
    const words = phrase.split(' ');
    const lastWord = words[words.length - 1];
    
    // If last word is a common business term, it's probably not a person
    const businessTerms = ['Labor', 'Works', 'Tech', 'Corp', 'Co', 'Team', 'Staff', 'Crew', 'Fleet', 'Force'];
    if (businessTerms.includes(lastWord)) return true;
    
    return false;
  };
  
  const nameMatches: Array<{ match: string; index: number }> = [];
  let nameMatch;
  while ((nameMatch = namePattern.exec(data)) !== null) {
    // Check if this name was part of a title (look back 20 chars)
    const beforeIndex = Math.max(0, nameMatch.index - 20);
    const beforeText = data.substring(beforeIndex, nameMatch.index);
    if (!/\b(?:Mr|Mrs|Ms|Dr|Prof|Judge|Attorney|Atty|Esq|Hon)\.?\s+$/.test(beforeText)) {
      // Get context FIRST to check if this is clearly a party in the case
      const context = getContext(nameMatch[0], nameMatch.index, data);
      
      // If context strongly indicates a party role, include it even if it looks like a business name
      const isPartyRole = context.includes('plaintiff') || context.includes('client') || 
                          context.includes('claimant') || context.includes('defendant') || 
                          context.includes('respondent');
      
      // Only apply business name exclusions if NOT clearly a party role
      if (isPartyRole || !isLikelyBusinessName(nameMatch[0])) {
        nameMatches.push({ match: nameMatch[0], index: nameMatch.index });
      }
    }
  }
  // Replace names in reverse order to preserve indices
  nameMatches.reverse().forEach(({ match, index }) => {
    if (anonymized.includes(match)) {
      const context = getContext(match, index, data);
      const placeholder = getRolePlaceholder(context, false);
      addToMapping(placeholder, match);
      contextualMappings.push({
        placeholder: placeholder,
        original: match,
        context: context
      });
      anonymized = anonymized.replace(match, placeholder);
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

  // Company names with legal suffixes - use role-specific placeholders
  // Companies are typically defendants/employers unless explicitly identified as plaintiff
  const companyPattern = /\b[A-Z][A-Za-z0-9\s&.,'-]+(?:Inc|LLC|Corp|Corporation|Company|Co|Ltd|Limited|Partnership|LP|LLP)\b/g;
  const legalRolePrefix = /^(Plaintiff|Plaintiffs|Defendant|Defendants|Client|Clients|Witness|Witnesses|Petitioner|Petitioners|Respondent|Respondents)\s+/i;
  
  const companyMatches: Array<{ match: string; index: number }> = [];
  let companyMatch;
  while ((companyMatch = companyPattern.exec(data)) !== null) {
    let match = companyMatch[0];
    let index = companyMatch.index;
    
    // If company match starts with a legal role word, strip it off
    // (e.g., "Defendants Redstone Structural, Inc." -> "Redstone Structural, Inc.")
    const roleMatch = match.match(legalRolePrefix);
    if (roleMatch) {
      match = match.substring(roleMatch[0].length);
      index += roleMatch[0].length;
    }
    
    if (match.trim()) {
      companyMatches.push({ match: match.trim(), index });
    }
  }
  companyMatches.reverse().forEach(({ match, index }) => {
    if (anonymized.includes(match)) {
      const context = getContext(match, index, data);
      // Companies default to defendant unless explicitly plaintiff
      let placeholder = getRolePlaceholder(context, true);
      // If no role detected, default to defendant for companies
      if (placeholder === '[COMPANY]') {
        placeholder = '[DEFENDANT_COMPANY]';
      }
      addToMapping(placeholder, match);
      contextualMappings.push({
        placeholder: placeholder,
        original: match,
        context: context.includes('defendant') ? context : context + '|defendant'
      });
      anonymized = anonymized.replace(match, placeholder);
    }
  });

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

  // Legal roles with names - use role-specific placeholders (includes plural forms)
  anonymized = anonymized.replace(
    /\b(?:Clients?|Plaintiffs?|Defendants?|Witnesses?|Deponents?|Petitioners?|Respondents?)\s*:?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/gi,
    (match, offset) => {
      // Extract the role from the match itself (handle both singular and plural)
      const roleMatch = match.match(/\b(Clients?|Plaintiffs?|Defendants?|Witnesses?|Deponents?|Petitioners?|Respondents?)\b/i);
      let role = roleMatch ? roleMatch[1].toLowerCase() : '';
      // Normalize plural to singular for role determination
      role = role.replace(/s$/, '');
      
      // Determine placeholder based on explicit role in text
      let placeholder: string;
      if (role === 'plaintiff' || role === 'client' || role === 'petitioner') {
        placeholder = '[PLAINTIFF]';
      } else if (role === 'defendant' || role === 'respondent') {
        placeholder = '[DEFENDANT]';
      } else if (role === 'witness' || role === 'deponent') {
        placeholder = '[WITNESS]';
      } else {
        placeholder = '[NAME]';
      }
      
      addToMapping(placeholder, match);
      contextualMappings.push({
        placeholder: placeholder,
        original: match,
        context: role
      });
      return placeholder;
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

  // Standalone names (First Last pattern) - with exclusions for common legal/business terms
  const excludedPhrasesSimple = new Set([
    'Settlement Demand', 'Economic Damages', 'Non Economic', 'Medical Treatment',
    'Case Summary', 'General Damages', 'Special Damages', 'Punitive Damages',
    'Compensatory Damages', 'Property Damage', 'Lost Wages', 'Pain Suffering',
    'Emotional Distress', 'Mental Anguish', 'Loss Consortium', 'Wrongful Termination',
    'Breach Contract', 'Personal Injury', 'Premises Liability', 'Products Liability',
    'Medical Malpractice', 'Legal Malpractice', 'Insurance Coverage', 'Policy Limits',
    'Liability Coverage', 'Documentation Provided',
    // California Codes and Legal References
    'Labor Code', 'Civil Code', 'Penal Code', 'Government Code', 'Vehicle Code',
    'Business Professions', 'Health Safety', 'Family Code', 'Probate Code',
    'Insurance Code', 'Revenue Taxation', 'Corporations Code', 'Education Code',
    'Elections Code', 'Evidence Code', 'Financial Code', 'Fish Game',
    'Food Agricultural', 'Harbors Navigation', 'Military Veterans', 'Public Contract',
    'Public Resources', 'Public Utilities', 'Streets Highways', 'Unemployment Insurance',
    'Water Code', 'Welfare Institutions', 'Code Civil', 'Code Section',
    'California Code', 'Federal Code', 'United States',
    // Legal terms that look like names
    'Civil Penalties', 'Criminal Penalties', 'Statutory Penalties', 'Civil Procedure',
    'Criminal Procedure', 'Due Process', 'Equal Protection', 'Good Faith',
    'Bad Faith', 'Prima Facie', 'Res Judicata', 'Summary Judgment',
    'Default Judgment', 'Bench Trial', 'Jury Trial', 'Settlement Agreement',
    'Settlement Conference', 'Case Management', 'Discovery Requests',
    'Interrogatory Responses', 'Document Production', 'Motion Practice',
    'Oral Argument', 'Written Argument', 'Legal Analysis', 'Legal Research',
    'Affirmative Defenses', 'Statute Limitations', 'Burden Proof', 'Standard Care',
    'Proximate Cause', 'Actual Damages', 'Nominal Damages', 'Treble Damages',
    'Liquidated Damages', 'Consequential Damages', 'Incidental Damages',
    // Business/HR terms
    'Human Resources', 'Legal Services', 'Professional Services', 'Administrative Services',
    'Customer Service', 'Technical Support', 'Quality Control', 'Risk Management',
    'Claims Department', 'Legal Department', 'Pacific Logistics',
    'Case Description', 'Facts Section', 'Liability Section', 'Damages Section',
  ]);
  
  // Pattern-based exclusions for simple anonymization
  const businessSuffixesSimple = /\b(Development|Agency|Department|Division|Bureau|Commission|Authority|Services|Solutions|Logistics|Management|Operations|Resources|Group|Industries|Systems|Technologies|Consulting|Enterprises|Associates|Partners|Corporation|Foundation|Institute|Organization|Administration|Board|Council|Office|Center|Clinic|Hospital|University|College|School|Bank|Insurance|Financial|Holdings|Ventures|Capital|Media|Communications|Marketing|Staffing|Recruiting|Delivery|Distribution|Transport|Freight|Shipping|Supply|Warehouse|Manufacturing|Production|Construction|Engineering|Design|Architecture|Analytics|Software|Network|Digital|Global|National|International|Regional|Metro|County|State|Federal)$/i;
  const stateNamesSimple = /^(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i;
  const businessTermsSimple = ['Labor', 'Works', 'Tech', 'Corp', 'Co', 'Team', 'Staff', 'Crew', 'Fleet', 'Force'];
  
  const isLikelyBusinessNameSimple = (phrase: string): boolean => {
    if (excludedPhrasesSimple.has(phrase)) return true;
    // Check if starts with a legal role word
    if (/^(Plaintiff|Plaintiffs|Defendant|Defendants|Client|Clients|Witness|Witnesses|Deponent|Deponents|Petitioner|Petitioners|Respondent|Respondents)\b/i.test(phrase)) return true;
    if (businessSuffixesSimple.test(phrase)) return true;
    if (stateNamesSimple.test(phrase)) return true;
    // Check if ends with "Code" (legal reference)
    if (/\bCode$/i.test(phrase)) return true;
    // Check if ends with common legal terms
    if (/\b(Penalties|Procedure|Process|Judgment|Trial|Agreement|Practice|Damages|Coverage|Liability|Malpractice|Professions|Safety|Navigation|Insurance|Resources|Utilities|Highways|Veterans|Contract|Institutions)$/i.test(phrase)) return true;
    const lastWord = phrase.split(' ').pop() || '';
    if (businessTermsSimple.includes(lastWord)) return true;
    return false;
  };
  
  anonymized = anonymized.replace(
    /\b[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
    (match) => isLikelyBusinessNameSimple(match) ? match : '[NAME]'
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

  // Legal roles with names (includes plural forms)
  anonymized = anonymized.replace(
    /\b(?:Clients?|Plaintiffs?|Defendants?|Witnesses?|Deponents?|Petitioners?|Respondents?)\s*:?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/gi,
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
  // Include new role-specific placeholders
  const placeholderOrder = [
    // Role-specific placeholders (most specific)
    '[TITLE] [PLAINTIFF]',
    '[TITLE] [DEFENDANT]',
    '[PLAINTIFF_COMPANY]',
    '[DEFENDANT_COMPANY]',
    '[PLAINTIFF]',
    '[DEFENDANT]',
    '[WITNESS]',
    // Legacy/fallback placeholders
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





