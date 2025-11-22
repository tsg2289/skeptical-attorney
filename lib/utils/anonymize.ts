/**
 * Anonymizes user input data before sending to external APIs
 * This ensures sensitive information is not exposed
 */
export function anonymizeData(data: string): string {
  // Remove email addresses
  let anonymized = data.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[EMAIL_REDACTED]'
  );

  // Remove phone numbers
  anonymized = anonymized.replace(
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    '[PHONE_REDACTED]'
  );

  // Remove SSN patterns
  anonymized = anonymized.replace(
    /\b\d{3}-\d{2}-\d{4}\b/g,
    '[SSN_REDACTED]'
  );

  // Remove credit card numbers
  anonymized = anonymized.replace(
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    '[CARD_REDACTED]'
  );

  return anonymized;
}





