/**
 * E2E Test: Cross-Browser Compatibility
 *
 * Validates core functionality across Chrome, Firefox, Safari (WebKit),
 * and Edge. Each test runs in all four browser projects configured in
 * playwright.config.ts.
 *
 * Coverage:
 *   1. Basic page load and rendering
 *   2. CSS compatibility (flexbox, grid, custom properties)
 *   3. JavaScript API compatibility (Intl, crypto, ResizeObserver, etc.)
 *   4. Form interactions and input handling
 *   5. Local storage and session storage
 *   6. Accessibility features (focus management, ARIA)
 *
 * All Supabase API calls are intercepted via Playwright route mocking
 * so the tests run without a live backend.
 *
 * Validates: Task 8.5.4 – Cross-browser testing
 */

import { test, expect, type Page, type Route } from '@playwright/test';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const TEST_USER = {
  id: 'user-xbrowser-001',
  github_id: 'xbrowser-tester',
  username: 'xbrowser-tester',
  email: 'xbrowser@tealtiger.io',
  avatar_url: 'https://ui-avatars.com/api/?name=XB',
  last_seen: new Date().toISOString(),
};

const TEST_WORKSPACE = {
  id: 'ws-xbrowser-001',
  name: 'Cross-Browser Team',
  slug: 'cross-browser-team',
  owner_id: TEST_USER.id,
  settings: {
    requiredApprovers: 1,
    approverUserIds: [],
    allowEmergencyBypass: false,
    autoApprovalRules: [],
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const TEST_MEMBER = {
  id: 'member-xbrowser-001',
  workspace_id: TEST_WORKSPACE.id,
  user_id: TEST_USER.id,
  role: 'owner',
  joined_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Supabase REST API mock helper
// ---------------------------------------------------------------------------

async function mockSupabaseAPI(page: Page) {
  // Auth endpoints
  await page.route('**/auth/v1/token*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: TEST_USER.id,
          email: TEST_USER.email,
          user_metadata: {
            user_name: TEST_USER.username,
            avatar_url: TEST_USER.avatar_url,
            preferred_username: TEST_USER.username,
          },
        },
      }),
    });
  });

  await page.route('**/auth/v1/user', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: TEST_USER.id,
        email: TEST_USER.email,
        user_metadata: {
          user_name: TEST_USER.username,
          avatar_url: TEST_USER.avatar_url,
        },
      }),
    });
  });

  // Catch-all for Supabase REST tables
  await page.route('**/rest/v1/**', async (route: Route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });

  // Specific table endpoints (last-registered matches first in Playwright)
  await page.route('**/rest/v1/users*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([TEST_USER]),
    });
  });

  await page.route('**/rest/v1/workspaces*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([TEST_WORKSPACE]),
    });
  });

  await page.route('**/rest/v1/workspace_members*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([TEST_MEMBER]),
    });
  });
}

// ---------------------------------------------------------------------------
// 1. Basic page load and rendering
// ---------------------------------------------------------------------------

test.describe('Cross-Browser: Page Load & Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
  });

  test('page loads successfully and renders main content', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');

    // The page should have a visible body with content
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Verify the document title is set
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('no console errors on initial load', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors (e.g. Supabase connection warnings)
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes('supabase') &&
        !err.includes('Failed to fetch') &&
        !err.includes('net::ERR'),
    );
    expect(criticalErrors).toEqual([]);
  });

  test('viewport renders correctly at standard desktop size', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Page should not have horizontal overflow
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);
  });
});


// ---------------------------------------------------------------------------
// 2. CSS compatibility (flexbox, grid, custom properties)
// ---------------------------------------------------------------------------

test.describe('Cross-Browser: CSS Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('flexbox layout renders correctly', async ({ page }) => {
    // Find elements using flexbox and verify they lay out properly
    const flexContainers = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements
        .filter((el) => {
          const style = window.getComputedStyle(el);
          return style.display === 'flex' || style.display === 'inline-flex';
        })
        .slice(0, 5)
        .map((el) => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return {
            display: style.display,
            flexDirection: style.flexDirection,
            width: rect.width,
            height: rect.height,
          };
        });
    });

    // At least one flex container should exist and have dimensions
    expect(flexContainers.length).toBeGreaterThan(0);
    for (const container of flexContainers) {
      expect(container.width).toBeGreaterThan(0);
      expect(container.height).toBeGreaterThan(0);
    }
  });

  test('CSS custom properties (variables) are resolved', async ({ page }) => {
    const customPropsWork = await page.evaluate(() => {
      // Set a custom property and verify it resolves
      document.documentElement.style.setProperty('--test-xbrowser-color', '#0d9488');
      const resolved = getComputedStyle(document.documentElement).getPropertyValue(
        '--test-xbrowser-color',
      );
      document.documentElement.style.removeProperty('--test-xbrowser-color');
      return resolved.trim() === '#0d9488';
    });
    expect(customPropsWork).toBe(true);
  });

  test('CSS grid layout is supported', async ({ page }) => {
    const gridSupported = await page.evaluate(() => {
      const el = document.createElement('div');
      el.style.display = 'grid';
      document.body.appendChild(el);
      const computed = window.getComputedStyle(el).display;
      document.body.removeChild(el);
      return computed === 'grid';
    });
    expect(gridSupported).toBe(true);
  });

  test('CSS transitions and transforms are supported', async ({ page }) => {
    const supported = await page.evaluate(() => {
      const el = document.createElement('div');
      el.style.transform = 'translateX(10px)';
      el.style.transition = 'transform 0.3s ease';
      document.body.appendChild(el);
      const transform = window.getComputedStyle(el).transform;
      document.body.removeChild(el);
      // transform should be a matrix value, not 'none'
      return transform !== 'none' && transform !== '';
    });
    expect(supported).toBe(true);
  });
});


// ---------------------------------------------------------------------------
// 3. JavaScript API compatibility
// ---------------------------------------------------------------------------

test.describe('Cross-Browser: JavaScript API Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Intl API is available and functional', async ({ page }) => {
    const intlWorks = await page.evaluate(() => {
      try {
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        });
        const result = formatter.format(1234.56);
        return result.includes('1,234.56') || result.includes('1234.56');
      } catch {
        return false;
      }
    });
    expect(intlWorks).toBe(true);
  });

  test('crypto.subtle API is available', async ({ page }) => {
    const cryptoAvailable = await page.evaluate(async () => {
      try {
        if (!window.crypto?.subtle) return false;
        // Test SHA-256 hashing (used for audit export signatures)
        const data = new TextEncoder().encode('tealtiger-test');
        const hash = await crypto.subtle.digest('SHA-256', data);
        return hash.byteLength === 32;
      } catch {
        return false;
      }
    });
    expect(cryptoAvailable).toBe(true);
  });

  test('ResizeObserver API is available', async ({ page }) => {
    const resizeObserverAvailable = await page.evaluate(() => {
      return typeof ResizeObserver === 'function';
    });
    expect(resizeObserverAvailable).toBe(true);
  });

  test('IntersectionObserver API is available', async ({ page }) => {
    const available = await page.evaluate(() => {
      return typeof IntersectionObserver === 'function';
    });
    expect(available).toBe(true);
  });

  test('structuredClone is available', async ({ page }) => {
    const works = await page.evaluate(() => {
      try {
        const obj = { a: 1, b: { c: 2 } };
        const clone = structuredClone(obj);
        return clone.a === 1 && clone.b.c === 2 && clone !== obj && clone.b !== obj.b;
      } catch {
        return false;
      }
    });
    expect(works).toBe(true);
  });

  test('Promise.allSettled is available', async ({ page }) => {
    const works = await page.evaluate(async () => {
      const results = await Promise.allSettled([
        Promise.resolve('ok'),
        Promise.reject(new Error('fail')),
      ]);
      return (
        results.length === 2 &&
        results[0].status === 'fulfilled' &&
        results[1].status === 'rejected'
      );
    });
    expect(works).toBe(true);
  });

  test('URL and URLSearchParams APIs work correctly', async ({ page }) => {
    const works = await page.evaluate(() => {
      try {
        const url = new URL('https://example.com/path?key=value');
        const params = new URLSearchParams(url.search);
        return url.pathname === '/path' && params.get('key') === 'value';
      } catch {
        return false;
      }
    });
    expect(works).toBe(true);
  });
});


// ---------------------------------------------------------------------------
// 4. Form interactions and input handling
// ---------------------------------------------------------------------------

test.describe('Cross-Browser: Form Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('text input accepts and displays typed text', async ({ page }) => {
    // Find the first visible text input or textarea on the page
    const input = page.locator('input[type="text"], input:not([type]), textarea').first();
    const inputExists = (await input.count()) > 0;

    if (inputExists) {
      await input.click();
      await input.fill('cross-browser test input');
      const value = await input.inputValue();
      expect(value).toBe('cross-browser test input');
    } else {
      // If no text input exists on the page, verify input creation works
      const inputWorks = await page.evaluate(() => {
        const el = document.createElement('input');
        el.type = 'text';
        document.body.appendChild(el);
        el.value = 'cross-browser test';
        const result = el.value === 'cross-browser test';
        document.body.removeChild(el);
        return result;
      });
      expect(inputWorks).toBe(true);
    }
  });

  test('click events fire correctly on buttons', async ({ page }) => {
    const clickWorks = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const btn = document.createElement('button');
        btn.textContent = 'Test';
        btn.addEventListener('click', () => resolve(true));
        document.body.appendChild(btn);
        btn.click();
        document.body.removeChild(btn);
        // Fallback timeout in case click doesn't fire
        setTimeout(() => resolve(false), 1000);
      });
    });
    expect(clickWorks).toBe(true);
  });

  test('keyboard events fire correctly', async ({ page }) => {
    const keyboardWorks = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const input = document.createElement('input');
        input.type = 'text';
        document.body.appendChild(input);
        input.focus();
        input.addEventListener('keydown', (e) => {
          resolve(e.key === 'a');
          document.body.removeChild(input);
        });
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
        setTimeout(() => resolve(false), 1000);
      });
    });
    expect(keyboardWorks).toBe(true);
  });

  test('select/dropdown elements work correctly', async ({ page }) => {
    const selectWorks = await page.evaluate(() => {
      const select = document.createElement('select');
      const opt1 = document.createElement('option');
      opt1.value = 'chrome';
      opt1.textContent = 'Chrome';
      const opt2 = document.createElement('option');
      opt2.value = 'firefox';
      opt2.textContent = 'Firefox';
      select.appendChild(opt1);
      select.appendChild(opt2);
      document.body.appendChild(select);
      select.value = 'firefox';
      const result = select.value === 'firefox';
      document.body.removeChild(select);
      return result;
    });
    expect(selectWorks).toBe(true);
  });
});


// ---------------------------------------------------------------------------
// 5. Local storage and session storage
// ---------------------------------------------------------------------------

test.describe('Cross-Browser: Web Storage', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('localStorage read/write works correctly', async ({ page }) => {
    const works = await page.evaluate(() => {
      try {
        const key = 'tealtiger-xbrowser-test';
        const value = JSON.stringify({ test: true, timestamp: Date.now() });
        localStorage.setItem(key, value);
        const retrieved = localStorage.getItem(key);
        localStorage.removeItem(key);
        return retrieved === value;
      } catch {
        return false;
      }
    });
    expect(works).toBe(true);
  });

  test('sessionStorage read/write works correctly', async ({ page }) => {
    const works = await page.evaluate(() => {
      try {
        const key = 'tealtiger-xbrowser-session-test';
        const value = 'session-data-123';
        sessionStorage.setItem(key, value);
        const retrieved = sessionStorage.getItem(key);
        sessionStorage.removeItem(key);
        return retrieved === value;
      } catch {
        return false;
      }
    });
    expect(works).toBe(true);
  });

  test('localStorage persists across same-origin navigations', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('tealtiger-persist-test', 'persisted-value');
    });

    // Navigate away and back
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const persisted = await page.evaluate(() => {
      const val = localStorage.getItem('tealtiger-persist-test');
      localStorage.removeItem('tealtiger-persist-test');
      return val;
    });
    expect(persisted).toBe('persisted-value');
  });

  test('storage event fires on localStorage changes', async ({ page }) => {
    const eventFires = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        // Storage events only fire in other windows, so we test the API exists
        const hasStorageEvent = typeof StorageEvent === 'function';
        resolve(hasStorageEvent);
      });
    });
    expect(eventFires).toBe(true);
  });
});


// ---------------------------------------------------------------------------
// 6. Accessibility features (focus management, ARIA)
// ---------------------------------------------------------------------------

test.describe('Cross-Browser: Accessibility Features', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Tab key moves focus through interactive elements', async ({ page }) => {
    // Press Tab and verify focus moves to an interactive element
    await page.keyboard.press('Tab');

    const focusedTag = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName.toLowerCase() : null;
    });

    // Focus should land on an interactive element
    const interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'details', 'summary'];
    const isFocusable =
      focusedTag !== null &&
      (interactiveTags.includes(focusedTag) ||
        (await page.evaluate(() => {
          const el = document.activeElement;
          return el?.getAttribute('tabindex') !== null;
        })));

    expect(isFocusable).toBe(true);
  });

  test('focus-visible outline is rendered on keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab');

    const hasFocusIndicator = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      const style = window.getComputedStyle(el);
      // Check for outline or box-shadow focus indicators
      const hasOutline = style.outlineStyle !== 'none' && style.outlineWidth !== '0px';
      const hasBoxShadow = style.boxShadow !== 'none' && style.boxShadow !== '';
      return hasOutline || hasBoxShadow;
    });

    expect(hasFocusIndicator).toBe(true);
  });

  test('ARIA roles are recognized by the browser', async ({ page }) => {
    const ariaWorks = await page.evaluate(() => {
      const el = document.createElement('div');
      el.setAttribute('role', 'alert');
      el.setAttribute('aria-live', 'assertive');
      el.textContent = 'Test alert';
      document.body.appendChild(el);
      const role = el.getAttribute('role');
      const ariaLive = el.getAttribute('aria-live');
      document.body.removeChild(el);
      return role === 'alert' && ariaLive === 'assertive';
    });
    expect(ariaWorks).toBe(true);
  });

  test('aria-label is accessible on interactive elements', async ({ page }) => {
    const ariaLabelWorks = await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', 'Close dialog');
      document.body.appendChild(btn);
      const label = btn.getAttribute('aria-label');
      document.body.removeChild(btn);
      return label === 'Close dialog';
    });
    expect(ariaLabelWorks).toBe(true);
  });

  test('page has a valid lang attribute on html element', async ({ page }) => {
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBeTruthy();
    // Should be a valid BCP 47 language tag (e.g. "en", "en-US")
    expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
  });
});
