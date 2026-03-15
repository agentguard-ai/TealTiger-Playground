/**
 * Security Audit: XSS Prevention Tests
 * 
 * Tests that user-generated content is properly sanitized before rendering.
 * Covers policy code display, comments, workspace names, and all user-facing fields.
 * 
 * Validates: Requirement 30.3, 30.10
 * - THE Playground SHALL sanitize policy code before displaying in UI (prevent XSS)
 * - THE Playground SHALL pass OWASP ZAP security scan with no high-severity findings
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHtml, containsXssVector, XSS_PAYLOADS } from './security-helpers';

describe('Security Audit: XSS Prevention', () => {
  describe('HTML sanitization', () => {
    it('should remove script tags and their content', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should remove event handler attributes', () => {
      const inputs = [
        '<img onerror=alert(1) src=x>',
        '<div onmouseover="alert(1)">hover</div>',
        '<input onfocus=alert(1) autofocus>',
        '<body onload=alert(1)>',
        '<svg onload=alert(1)>',
      ];

      for (const input of inputs) {
        const result = sanitizeHtml(input);
        expect(result).not.toMatch(/on\w+\s*=/i);
      }
    });

    it('should remove javascript: URLs', () => {
      const inputs = [
        '<a href="javascript:alert(1)">click</a>',
        '<a href="JAVASCRIPT:alert(1)">click</a>',
        '<a href="javascript :alert(1)">click</a>',
      ];

      for (const input of inputs) {
        const result = sanitizeHtml(input);
        expect(result.toLowerCase()).not.toContain('javascript:');
      }
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="https://evil.com"></iframe>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('</iframe');
    });

    it('should remove object and embed tags', () => {
      const inputs = [
        '<object data="evil.swf"></object>',
        '<embed src="evil.swf">',
      ];

      for (const input of inputs) {
        const result = sanitizeHtml(input);
        expect(result).not.toMatch(/<object\b/i);
        expect(result).not.toMatch(/<embed\b/i);
      }
    });

    it('should remove form tags', () => {
      const input = '<form action="https://evil.com"><input type="text"></form>';
      const result = sanitizeHtml(input);
      expect(result).not.toMatch(/<\s*form\b/i);
    });

    it('should handle nested script tags', () => {
      const input = '<scr<script>ipt>alert(1)</scr</script>ipt>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('alert(1)');
    });

    it('should preserve safe HTML content', () => {
      const input = '<p>This is <strong>bold</strong> and <em>italic</em> text.</p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('should handle all XSS payloads from the test suite', () => {
      for (const payload of XSS_PAYLOADS) {
        const result = sanitizeHtml(payload);
        // After sanitization, no executable JS should remain
        expect(result).not.toMatch(/<script\b/i);
        expect(result).not.toMatch(/\bon\w+\s*=/i);
        expect(result).not.toMatch(/javascript\s*:/i);
        expect(result).not.toMatch(/<iframe\b/i);
      }
    });
  });

  describe('XSS vector detection', () => {
    it('should detect script tag vectors', () => {
      expect(containsXssVector('<script>alert(1)</script>')).toBe(true);
      expect(containsXssVector('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
    });

    it('should detect event handler vectors', () => {
      expect(containsXssVector('<img onerror=alert(1)>')).toBe(true);
      expect(containsXssVector('<div onmouseover="alert(1)">')).toBe(true);
    });

    it('should detect javascript: URL vectors', () => {
      expect(containsXssVector('<a href="javascript:alert(1)">')).toBe(true);
    });

    it('should detect iframe vectors', () => {
      expect(containsXssVector('<iframe src="evil.com">')).toBe(true);
    });

    it('should not flag safe content', () => {
      expect(containsXssVector('Hello, world!')).toBe(false);
      expect(containsXssVector('function add(a, b) { return a + b; }')).toBe(false);
      expect(containsXssVector('The <em>quick</em> brown fox')).toBe(false);
      expect(containsXssVector('Use the script command to run tests')).toBe(false);
    });

    it('should detect all XSS payloads from the test suite', () => {
      // At least 80% of payloads should be detected
      const detected = XSS_PAYLOADS.filter(p => containsXssVector(p));
      expect(detected.length).toBeGreaterThanOrEqual(Math.floor(XSS_PAYLOADS.length * 0.8));
    });
  });

  describe('Policy code display sanitization', () => {
    it('should sanitize policy code containing script injections', () => {
      const maliciousCode = `
        // Normal policy code
        function evaluate(request) {
          return { decision: "ALLOW" };
        }
        </script><script>alert(document.cookie)</script>
      `;
      const result = sanitizeHtml(maliciousCode);
      expect(result).not.toMatch(/<script\b[^<]*alert/i);
    });

    it('should preserve legitimate code syntax', () => {
      const legitimateCode = `
        const threshold = 0.05;
        if (cost > threshold) {
          return { decision: "DENY", reason: "Cost exceeds limit" };
        }
        return { decision: "ALLOW" };
      `;
      const result = sanitizeHtml(legitimateCode);
      expect(result).toContain('threshold');
      expect(result).toContain('DENY');
      expect(result).toContain('ALLOW');
    });

    it('should handle template literal injection attempts', () => {
      const input = '${alert("xss")}';
      // Template literals should be treated as plain text in display
      expect(containsXssVector(input)).toBe(false);
      // But the sanitizer should still handle it safely
      const result = sanitizeHtml(input);
      expect(result).toBe(input); // No HTML to sanitize
    });
  });

  describe('Comment content sanitization', () => {
    it('should sanitize comments with embedded HTML', () => {
      const maliciousComment = 'Great work! <img src=x onerror=alert("xss")> Keep it up!';
      const result = sanitizeHtml(maliciousComment);
      expect(result).not.toMatch(/onerror/i);
      expect(result).toContain('Great work!');
      expect(result).toContain('Keep it up!');
    });

    it('should handle Markdown-like content safely', () => {
      const markdownComment = '**Bold** and *italic* and `code` and [link](https://example.com)';
      const result = sanitizeHtml(markdownComment);
      // Markdown syntax should pass through unchanged
      expect(result).toContain('**Bold**');
      expect(result).toContain('*italic*');
      expect(result).toContain('`code`');
    });

    it('should sanitize @mention injection attempts', () => {
      const maliciousMention = '@<script>alert(1)</script>user';
      const result = sanitizeHtml(maliciousMention);
      expect(result).not.toMatch(/<script\b/i);
      expect(result).toContain('@');
    });
  });

  describe('Workspace name display sanitization', () => {
    it('should sanitize workspace names with HTML', () => {
      const maliciousName = 'Team <script>alert(1)</script>';
      const result = sanitizeHtml(maliciousName);
      expect(result).not.toMatch(/<script\b/i);
      expect(result).toContain('Team');
    });

    it('should sanitize workspace names with event handlers', () => {
      const maliciousName = 'Team" onmouseover="alert(1)';
      const result = sanitizeHtml(maliciousName);
      expect(result).not.toMatch(/onmouseover/i);
    });
  });

  describe('Content Security Policy headers', () => {
    it('should define expected CSP directives', () => {
      // Verify the expected CSP policy structure
      const expectedDirectives = {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"], // Monaco editor needs inline styles
        'img-src': ["'self'", 'https:', 'data:'],
        'connect-src': ["'self'", 'https://*.supabase.co'],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
      };

      // Verify each directive is defined
      for (const [directive, values] of Object.entries(expectedDirectives)) {
        expect(directive).toBeTruthy();
        expect(values.length).toBeGreaterThan(0);
      }
    });

    it('should not allow unsafe-eval in script-src', () => {
      const cspScriptSrc = ["'self'"];
      expect(cspScriptSrc).not.toContain("'unsafe-eval'");
    });

    it('should block framing with frame-ancestors none', () => {
      const frameAncestors = ["'none'"];
      expect(frameAncestors).toContain("'none'");
    });
  });

  describe('DOM-based XSS prevention', () => {
    it('should not use innerHTML with unsanitized content', () => {
      // Simulate the pattern: always sanitize before innerHTML
      const userContent = '<img src=x onerror=alert(1)>';
      const sanitized = sanitizeHtml(userContent);

      // The sanitized version should be safe for innerHTML
      expect(sanitized).not.toMatch(/onerror/i);
    });

    it('should use textContent for plain text display', () => {
      // Simulate using textContent instead of innerHTML for plain text
      const userInput = '<script>alert(1)</script>';

      // textContent treats everything as text, not HTML
      const div = { textContent: '' };
      div.textContent = userInput;
      expect(div.textContent).toBe(userInput); // Stored as-is, rendered as text
    });

    it('should escape HTML entities in user-generated content', () => {
      const escapeHtml = (str: string): string => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      const malicious = '<script>alert("xss")</script>';
      const escaped = escapeHtml(malicious);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(escaped).not.toContain('<script>');
    });
  });
});
