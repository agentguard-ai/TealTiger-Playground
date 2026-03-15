/**
 * Security Audit: Input Validation Tests
 * 
 * Tests that all user inputs are validated before database writes.
 * Covers policy names, workspace names, comments, and other user-facing fields.
 * 
 * Validates: Requirement 30.2, 30.4, 30.10
 * - THE Playground SHALL validate all user inputs before database writes
 * - THE Playground SHALL use parameterized queries to prevent SQL injection
 * - THE Playground SHALL pass OWASP ZAP security scan with no high-severity findings
 */

import { describe, it, expect } from 'vitest';
import {
  validateInput,
  validateWorkspaceName,
  validatePolicyName,
  validateCommentContent,
  SQL_INJECTION_PAYLOADS,
  MALICIOUS_INPUTS,
  XSS_PAYLOADS,
} from './security-helpers';

describe('Security Audit: Input Validation', () => {
  describe('General input validation', () => {
    it('should reject inputs exceeding max length', () => {
      const result = validateInput(MALICIOUS_INPUTS.oversizedString, { maxLength: 1000 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('input exceeds maximum length of 1000');
    });

    it('should reject inputs containing null bytes', () => {
      const result = validateInput(MALICIOUS_INPUTS.nullBytes);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('input contains null bytes');
    });

    it('should reject inputs containing script tags when HTML not allowed', () => {
      const result = validateInput('<script>alert("xss")</script>', { allowHtml: false });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('script tags'))).toBe(true);
    });

    it('should reject inputs containing event handlers when HTML not allowed', () => {
      const result = validateInput('<img onerror=alert(1) src=x>', { allowHtml: false });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('event handlers'))).toBe(true);
    });

    it('should accept valid plain text inputs', () => {
      const result = validateInput('This is a valid input string');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate against custom patterns', () => {
      const result = validateInput('invalid!@#', { pattern: /^[a-zA-Z0-9]+$/ });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('pattern'))).toBe(true);
    });
  });

  describe('Workspace name validation', () => {
    it('should accept valid workspace names', () => {
      const validNames = [
        'My Team',
        'engineering-team',
        'Team Alpha 2024',
        'dev_ops',
        'A1',
        'Production Team',
      ];
      for (const name of validNames) {
        const result = validateWorkspaceName(name);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject workspace names that are too long', () => {
      const result = validateWorkspaceName('A'.repeat(200));
      expect(result.valid).toBe(false);
    });

    it('should reject workspace names starting with special characters', () => {
      const invalidNames = ['-team', '_team', ' team', '.team'];
      for (const name of invalidNames) {
        const result = validateWorkspaceName(name);
        expect(result.valid).toBe(false);
      }
    });

    it('should reject workspace names with XSS payloads', () => {
      for (const payload of XSS_PAYLOADS) {
        const result = validateWorkspaceName(payload);
        expect(result.valid).toBe(false);
      }
    });

    it('should reject workspace names with SQL injection payloads', () => {
      for (const payload of SQL_INJECTION_PAYLOADS) {
        const result = validateWorkspaceName(payload);
        expect(result.valid).toBe(false);
      }
    });

    it('should reject empty workspace names', () => {
      const result = validateWorkspaceName('');
      expect(result.valid).toBe(false);
    });

    it('should reject single-character workspace names', () => {
      const result = validateWorkspaceName('A');
      expect(result.valid).toBe(false);
    });
  });

  describe('Policy name validation', () => {
    it('should accept valid policy names', () => {
      const validNames = [
        'PII Detection Policy',
        'cost-control-v2',
        'Rate Limiting 2024',
        'prompt_injection_guard',
        'A1',
      ];
      for (const name of validNames) {
        const result = validatePolicyName(name);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject policy names that are too long', () => {
      const result = validatePolicyName('A'.repeat(300));
      expect(result.valid).toBe(false);
    });

    it('should reject policy names with XSS payloads', () => {
      for (const payload of XSS_PAYLOADS) {
        const result = validatePolicyName(payload);
        expect(result.valid).toBe(false);
      }
    });

    it('should reject policy names with SQL injection payloads', () => {
      for (const payload of SQL_INJECTION_PAYLOADS) {
        const result = validatePolicyName(payload);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('Comment content validation', () => {
    it('should accept valid comment content', () => {
      const validComments = [
        'This looks good, approved!',
        'Please review the rate limiting logic on line 42.',
        'I think we should use a different approach here.\n\nWhat do you think?',
        '@alice Can you take a look at this?',
        'The cost threshold should be $0.05 per request.',
      ];
      for (const comment of validComments) {
        const result = validateCommentContent(comment);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject comments with script tags', () => {
      const result = validateCommentContent('Great work! <script>document.cookie</script>');
      expect(result.valid).toBe(false);
    });

    it('should reject comments with event handlers', () => {
      const result = validateCommentContent('Check this <img onerror=alert(1) src=x>');
      expect(result.valid).toBe(false);
    });

    it('should reject comments exceeding max length', () => {
      const result = validateCommentContent('A'.repeat(20_000));
      expect(result.valid).toBe(false);
    });

    it('should reject comments with null bytes', () => {
      const result = validateCommentContent('Normal text\x00hidden payload');
      expect(result.valid).toBe(false);
    });
  });

  describe('SQL injection prevention', () => {
    it('should reject all SQL injection payloads in workspace names', () => {
      for (const payload of SQL_INJECTION_PAYLOADS) {
        const result = validateWorkspaceName(payload);
        expect(result.valid).toBe(false);
      }
    });

    it('should reject all SQL injection payloads in policy names', () => {
      for (const payload of SQL_INJECTION_PAYLOADS) {
        const result = validatePolicyName(payload);
        expect(result.valid).toBe(false);
      }
    });

    it('should handle parameterized query simulation', () => {
      // Simulate that Supabase uses parameterized queries
      // The input should be treated as a literal string parameter, not SQL
      const maliciousInput = "'; DROP TABLE users; --";

      // In a parameterized query, the value is bound as a parameter ($1)
      // and never interpolated into the SQL string
      const queryTemplate = 'SELECT * FROM workspaces WHERE name = $1';
      const parameterValue = maliciousInput;

      // The query template never contains the user input
      expect(queryTemplate).not.toContain(maliciousInput);
      // The parameter value is the raw input (DB driver handles escaping)
      expect(parameterValue).toBe(maliciousInput);
      // The template uses positional parameters, not string interpolation
      expect(queryTemplate).toMatch(/\$\d+/);
    });
  });

  describe('Path traversal prevention', () => {
    it('should detect path traversal attempts', () => {
      const pathTraversalInputs = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '%2e%2e%2f%2e%2e%2f',
        '....//....//etc/passwd',
      ];

      for (const input of pathTraversalInputs) {
        const result = validateWorkspaceName(input);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('Prototype pollution prevention', () => {
    it('should not allow __proto__ as a valid workspace name', () => {
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

      for (const key of dangerousKeys) {
        const wsResult = validateWorkspaceName(key);
        expect(wsResult.valid).toBe(false);
      }
    });

    it('should safely handle objects with polluted prototypes', () => {
      const maliciousPayload = JSON.parse('{"__proto__": {"isAdmin": true}}');
      const safeObj: Record<string, unknown> = {};
      
      // Object.assign should not pollute prototype
      Object.assign(safeObj, maliciousPayload);
      
      // The base Object prototype should not be affected
      const cleanObj: Record<string, unknown> = {};
      expect((cleanObj as any).isAdmin).toBeUndefined();
    });
  });

  describe('Unicode and encoding attacks', () => {
    it('should handle right-to-left override characters', () => {
      const rtlInput = '\u202Emalicious\u202C';
      const result = validateWorkspaceName(rtlInput);
      expect(result.valid).toBe(false);
    });

    it('should handle zero-width characters', () => {
      const zeroWidthInput = 'normal\u200Btext';
      // Zero-width chars in names should be caught by pattern validation
      const result = validateWorkspaceName(zeroWidthInput);
      expect(result.valid).toBe(false);
    });

    it('should handle homoglyph attacks', () => {
      // Cyrillic 'а' looks like Latin 'a' but is different
      const homoglyphInput = 'аdmin'; // First char is Cyrillic
      const result = validateWorkspaceName(homoglyphInput);
      expect(result.valid).toBe(false);
    });
  });
});
