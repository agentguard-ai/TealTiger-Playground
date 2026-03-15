// PII pattern generation for testing

export function generatePIIResponse(prompt: string): string {
  const piiExamples = [
    'My email is john.doe@example.com and my phone is 555-123-4567.',
    'Please contact me at jane.smith@company.com or call 555-987-6543.',
    'My SSN is 123-45-6789 and my credit card is 4532-1234-5678-9010.',
    'You can reach me at support@tealtiger.ai or 555-234-5678.',
    'Send the invoice to billing@example.org. My card number is 5425-2334-3010-9903.',
  ];

  return piiExamples[Math.floor(Math.random() * piiExamples.length)];
}

export function hasPIIPattern(text: string): boolean {
  const patterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{3}-\d{3}-\d{4}\b/, // Phone
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card
  ];

  return patterns.some((pattern) => pattern.test(text));
}
