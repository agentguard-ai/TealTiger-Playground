/**
 * Security Test Helpers
 * 
 * Shared utilities for security audit tests covering:
 * - Input sanitization and validation
 * - XSS payload generation
 * - Mock RLS enforcement
 * - Auth state simulation
 * 
 * Validates: Requirement 30.10
 */

// Common XSS attack vectors for testing
export const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert("xss")>',
  '<svg onload=alert("xss")>',
  '"><script>alert("xss")</script>',
  "';alert('xss');//",
  '<iframe src="javascript:alert(\'xss\')">',
  '<body onload=alert("xss")>',
  '<input onfocus=alert("xss") autofocus>',
  '<marquee onstart=alert("xss")>',
  '<details open ontoggle=alert("xss")>',
  '<a href="javascript:alert(\'xss\')">click</a>',
  '<div style="background:url(javascript:alert(\'xss\'))">',
  '{{constructor.constructor("alert(1)")()}}',
  '${alert("xss")}',
  '<math><mtext><table><mglyph><svg><mtext><textarea><path id="</textarea><img onerror=alert(1) src=1>">',
];

// SQL injection payloads
export const SQL_INJECTION_PAYLOADS = [
  "'; DROP TABLE users; --",
  "1' OR '1'='1",
  "1; DELETE FROM policies WHERE 1=1",
  "' UNION SELECT * FROM users --",
  "admin'--",
  "1' OR 1=1 --",
  "'; INSERT INTO users VALUES('hacker','hacker'); --",
  "1'; EXEC xp_cmdshell('dir'); --",
];

// Malicious input patterns
export const MALICIOUS_INPUTS = {
  oversizedString: 'A'.repeat(100_000),
  nullBytes: 'test\x00hidden',
  unicodeExploits: '\u202Emalicious\u202C',
  pathTraversal: '../../../etc/passwd',
  commandInjection: '; rm -rf /',
  protoPolllution: '__proto__',
  constructorAccess: 'constructor',
};

/**
 * Sanitizes HTML content by stripping dangerous tags and attributes.
 * This mirrors what the application should do before rendering user content.
 */
export function sanitizeHtml(input: string): string {
  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove event handlers (on*)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  // Remove iframe, object, embed, form tags
  sanitized = sanitized.replace(/<\s*\/?\s*(iframe|object|embed|form|base)\b[^>]*>/gi, '');
  // Remove data: URLs in attributes (potential XSS vector)
  sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, '');
  // Encode remaining angle brackets in suspicious contexts
  sanitized = sanitized.replace(/<(svg|math|marquee|details|body|meta|link)\b/gi, '&lt;$1');
  return sanitized;
}

/**
 * Validates that a string input meets security requirements.
 */
export function validateInput(input: string, options: {
  maxLength?: number;
  allowHtml?: boolean;
  pattern?: RegExp;
  fieldName?: string;
} = {}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { maxLength = 10_000, allowHtml = false, pattern, fieldName = 'input' } = options;

  if (typeof input !== 'string') {
    errors.push(`${fieldName} must be a string`);
    return { valid: false, errors };
  }

  if (input.length > maxLength) {
    errors.push(`${fieldName} exceeds maximum length of ${maxLength}`);
  }

  if (input.includes('\x00')) {
    errors.push(`${fieldName} contains null bytes`);
  }

  if (!allowHtml && /<script\b/i.test(input)) {
    errors.push(`${fieldName} contains script tags`);
  }

  if (!allowHtml && /on\w+\s*=/i.test(input)) {
    errors.push(`${fieldName} contains event handlers`);
  }

  if (pattern && !pattern.test(input)) {
    errors.push(`${fieldName} does not match required pattern`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates workspace name input
 */
export function validateWorkspaceName(name: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check basic input validity first
  const baseResult = validateInput(name, {
    maxLength: 100,
    fieldName: 'Workspace name',
  });
  errors.push(...baseResult.errors);

  // Must be at least 2 chars, start and end with alphanumeric
  if (!/^[a-zA-Z0-9]/.test(name) || !/[a-zA-Z0-9]$/.test(name)) {
    errors.push('Workspace name must start and end with alphanumeric characters');
  }
  if (name.length < 2) {
    errors.push('Workspace name must be at least 2 characters');
  }
  // Only allow alphanumeric, spaces, hyphens, underscores in the middle
  if (!/^[a-zA-Z0-9][a-zA-Z0-9 \-_]*[a-zA-Z0-9]$/.test(name) && name.length >= 2) {
    errors.push('Workspace name contains invalid characters');
  }
  // Block dangerous names
  const blockedNames = ['__proto__', 'constructor', 'prototype'];
  if (blockedNames.includes(name)) {
    errors.push('Workspace name is reserved');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates policy name input
 */
export function validatePolicyName(name: string): { valid: boolean; errors: string[] } {
  return validateInput(name, {
    maxLength: 200,
    pattern: /^[a-zA-Z0-9][a-zA-Z0-9\s\-_.]{0,198}[a-zA-Z0-9]$/,
    fieldName: 'Policy name',
  });
}

/**
 * Validates comment content
 */
export function validateCommentContent(content: string): { valid: boolean; errors: string[] } {
  return validateInput(content, {
    maxLength: 10_000,
    allowHtml: false,
    fieldName: 'Comment',
  });
}

/**
 * Checks if a string contains potential XSS vectors
 */
export function containsXssVector(input: string): boolean {
  const xssPatterns = [
    /<script\b/i,
    /on\w+\s*=/i,
    /javascript\s*:/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<svg\b[^>]*\bon/i,
    /<img\b[^>]*\bon/i,
    /<math\b/i,
    /<body\b[^>]*\bon/i,
  ];
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Mock authenticated user for testing
 */
export interface MockAuthUser {
  id: string;
  githubId: string;
  username: string;
  email: string;
  avatarUrl: string;
  workspaceIds: string[];
  roles: Map<string, 'owner' | 'editor' | 'viewer'>;
}

export function createMockUser(overrides: Partial<MockAuthUser> = {}): MockAuthUser {
  return {
    id: `user-${Math.random().toString(36).slice(2, 10)}`,
    githubId: `gh-${Math.random().toString(36).slice(2, 10)}`,
    username: `testuser-${Math.random().toString(36).slice(2, 8)}`,
    email: `test-${Math.random().toString(36).slice(2, 8)}@example.com`,
    avatarUrl: 'https://avatars.githubusercontent.com/u/0',
    workspaceIds: [],
    roles: new Map(),
    ...overrides,
  };
}
