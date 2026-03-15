/**
 * E2E Test: Mobile Responsiveness
 *
 * Validates the playground renders and functions correctly on mobile and
 * tablet viewports. Tests run against emulated iOS Safari (iPhone 14),
 * Android Chrome (Pixel 7), and iPad devices.
 *
 * Coverage:
 *   1. iOS Safari viewport – page loads, touch targets, viewport meta
 *   2. Android Chrome viewport – page loads, touch targets
 *   3. Tablet viewport – layout adapts correctly
 *   4. Responsive layout breakpoints (mobile < 768, tablet 768-1024, desktop > 1024)
 *   5. Touch-friendly UI elements (minimum 44×44 px touch targets)
 *   6. No horizontal overflow on mobile viewports
 *   7. Navigation works on mobile (hamburger menu or similar)
 *   8. Text readability on small screens (font sizes, line heights)
 *
 * All Supabase API calls are intercepted via Playwright route mocking
 * so the tests run without a live backend.
 *
 * Validates: Task 8.5.5 – Mobile responsiveness testing
 */

import { test, expect, type Page, type Route } from '@playwright/test';

// ---------------------------------------------------------------------------
// Test data (mirrors cross-browser.spec.ts)
// ---------------------------------------------------------------------------

const TEST_USER = {
  id: 'user-mobile-001',
  github_id: 'mobile-tester',
  username: 'mobile-tester',
  email: 'mobile@tealtiger.io',
  avatar_url: 'https://ui-avatars.com/api/?name=MT',
  last_seen: new Date().toISOString(),
};

const TEST_WORKSPACE = {
  id: 'ws-mobile-001',
  name: 'Mobile Test Team',
  slug: 'mobile-test-team',
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
  id: 'member-mobile-001',
  workspace_id: TEST_WORKSPACE.id,
  user_id: TEST_USER.id,
  role: 'owner',
  joined_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Supabase REST API mock helper (same pattern as cross-browser.spec.ts)
// ---------------------------------------------------------------------------

async function mockSupabaseAPI(page: Page) {
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

  await page.route('**/rest/v1/**', async (route: Route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });

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
// Viewport size helpers
// ---------------------------------------------------------------------------

const MOBILE_WIDTH = 390;   // iPhone 14 logical width
const TABLET_WIDTH = 810;   // iPad logical width
const DESKTOP_WIDTH = 1280;

const BREAKPOINTS = {
  mobile: { max: 767 },
  tablet: { min: 768, max: 1024 },
  desktop: { min: 1025 },
};

/** Minimum recommended touch target size per WCAG / Apple HIG */
const MIN_TOUCH_TARGET = 44;

// ---------------------------------------------------------------------------
// 1. iOS Safari viewport (iPhone 14)
// ---------------------------------------------------------------------------

test.describe('Mobile Responsive: iOS Safari (iPhone 14)', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
    await page.setViewportSize({ width: MOBILE_WIDTH, height: 844 });
  });

  test('page loads successfully on iPhone viewport', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');

    const body = page.locator('body');
    await expect(body).toBeVisible();

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('viewport meta tag is present and configured for mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const viewportMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta ? meta.getAttribute('content') : null;
    });

    expect(viewportMeta).not.toBeNull();
    expect(viewportMeta).toContain('width=device-width');
  });

  test('interactive elements meet minimum touch target size (44px)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const smallTargets = await page.evaluate((minSize) => {
      const interactiveSelectors = 'a, button, input, select, textarea, [role="button"], [tabindex]';
      const elements = Array.from(document.querySelectorAll(interactiveSelectors));
      const tooSmall: { tag: string; width: number; height: number; text: string }[] = [];

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        // Skip hidden or zero-size elements
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.width < minSize || rect.height < minSize) {
          tooSmall.push({
            tag: el.tagName.toLowerCase(),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            text: (el.textContent || '').trim().slice(0, 30),
          });
        }
      }
      return tooSmall;
    }, MIN_TOUCH_TARGET);

    // Allow a small tolerance – some inline links may be smaller
    // but primary interactive controls should meet the threshold
    const criticalSmall = smallTargets.filter(
      (t) => ['button', 'input', 'select', 'textarea'].includes(t.tag),
    );
    expect(criticalSmall).toEqual([]);
  });
});


// ---------------------------------------------------------------------------
// 2. Android Chrome viewport (Pixel 7)
// ---------------------------------------------------------------------------

test.describe('Mobile Responsive: Android Chrome (Pixel 7)', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
    await page.setViewportSize({ width: 412, height: 915 });
  });

  test('page loads successfully on Android viewport', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('interactive elements meet minimum touch target size on Android', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const smallTargets = await page.evaluate((minSize) => {
      const elements = Array.from(
        document.querySelectorAll('button, input, select, textarea, [role="button"]'),
      );
      const tooSmall: { tag: string; width: number; height: number }[] = [];

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.width < minSize || rect.height < minSize) {
          tooSmall.push({
            tag: el.tagName.toLowerCase(),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
      return tooSmall;
    }, MIN_TOUCH_TARGET);

    expect(smallTargets).toEqual([]);
  });

  test('no horizontal overflow on Android viewport', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Tablet viewport (iPad)
// ---------------------------------------------------------------------------

test.describe('Mobile Responsive: Tablet (iPad)', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
    await page.setViewportSize({ width: TABLET_WIDTH, height: 1080 });
  });

  test('page loads successfully on tablet viewport', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('layout adapts to tablet width', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Content should fill the viewport without excessive whitespace or overflow
    const layoutInfo = await page.evaluate(() => {
      const body = document.body;
      const rect = body.getBoundingClientRect();
      return {
        bodyWidth: rect.width,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

    expect(layoutInfo.hasOverflow).toBe(false);
    expect(layoutInfo.bodyWidth).toBeGreaterThan(0);
  });

  test('no horizontal overflow on tablet viewport', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});


// ---------------------------------------------------------------------------
// 4. Responsive layout breakpoints
// ---------------------------------------------------------------------------

test.describe('Mobile Responsive: Breakpoints', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
  });

  test('mobile breakpoint (< 768px) – no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test('tablet breakpoint (768-1024px) – no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test('desktop breakpoint (> 1024px) – no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: DESKTOP_WIDTH, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test('content is visible at each breakpoint', async ({ page }) => {
    const widths = [375, 768, DESKTOP_WIDTH];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);

      // Verify the page has rendered content (not blank)
      const hasContent = await page.evaluate(() => {
        return (document.body.innerText || '').trim().length > 0;
      });
      expect(hasContent).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Touch-friendly UI elements
// ---------------------------------------------------------------------------

test.describe('Mobile Responsive: Touch-Friendly Elements', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
    await page.setViewportSize({ width: MOBILE_WIDTH, height: 844 });
  });

  test('all buttons meet 44×44 px minimum touch target', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const undersizedButtons = await page.evaluate((minSize) => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
      return buttons
        .filter((btn) => {
          const rect = btn.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.width < minSize || rect.height < minSize);
        })
        .map((btn) => ({
          text: (btn.textContent || '').trim().slice(0, 40),
          width: Math.round(btn.getBoundingClientRect().width),
          height: Math.round(btn.getBoundingClientRect().height),
        }));
    }, MIN_TOUCH_TARGET);

    expect(undersizedButtons).toEqual([]);
  });

  test('form inputs have adequate height for touch interaction', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const undersizedInputs = await page.evaluate((minSize) => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      return inputs
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.height < minSize;
        })
        .map((el) => ({
          type: (el as HTMLInputElement).type || el.tagName.toLowerCase(),
          height: Math.round(el.getBoundingClientRect().height),
        }));
    }, MIN_TOUCH_TARGET);

    expect(undersizedInputs).toEqual([]);
  });

  test('clickable elements have sufficient spacing between them', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const overlappingPairs = await page.evaluate(() => {
      const clickable = Array.from(
        document.querySelectorAll('a, button, input, [role="button"]'),
      ).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      const overlaps: { el1: string; el2: string }[] = [];
      for (let i = 0; i < clickable.length && i < 50; i++) {
        for (let j = i + 1; j < clickable.length && j < 50; j++) {
          const r1 = clickable[i].getBoundingClientRect();
          const r2 = clickable[j].getBoundingClientRect();
          // Check if bounding boxes overlap
          const overlapsX = r1.left < r2.right && r1.right > r2.left;
          const overlapsY = r1.top < r2.bottom && r1.bottom > r2.top;
          if (overlapsX && overlapsY) {
            // Only flag if one is not a child of the other
            if (!clickable[i].contains(clickable[j]) && !clickable[j].contains(clickable[i])) {
              overlaps.push({
                el1: (clickable[i].textContent || '').trim().slice(0, 20),
                el2: (clickable[j].textContent || '').trim().slice(0, 20),
              });
            }
          }
        }
      }
      return overlaps;
    });

    // Some overlap may be acceptable in complex UIs, but flag excessive overlap
    expect(overlappingPairs.length).toBeLessThan(5);
  });
});


// ---------------------------------------------------------------------------
// 6. No horizontal overflow on mobile viewports
// ---------------------------------------------------------------------------

test.describe('Mobile Responsive: No Horizontal Overflow', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
  });

  test('no horizontal scroll at 320px (smallest common mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test('no horizontal scroll at 390px (iPhone 14)', async ({ page }) => {
    await page.setViewportSize({ width: MOBILE_WIDTH, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test('no elements extend beyond viewport on mobile', async ({ page }) => {
    await page.setViewportSize({ width: MOBILE_WIDTH, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const overflowingElements = await page.evaluate((vpWidth) => {
      const all = Array.from(document.querySelectorAll('body *'));
      const overflowing: { tag: string; right: number }[] = [];

      for (const el of all.slice(0, 200)) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) continue;
        if (rect.right > vpWidth + 1) {
          overflowing.push({
            tag: `${el.tagName.toLowerCase()}.${el.className?.toString().slice(0, 30) || ''}`,
            right: Math.round(rect.right),
          });
        }
      }
      return overflowing;
    }, MOBILE_WIDTH);

    expect(overflowingElements).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 7. Navigation on mobile
// ---------------------------------------------------------------------------

test.describe('Mobile Responsive: Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
    await page.setViewportSize({ width: MOBILE_WIDTH, height: 844 });
  });

  test('navigation is accessible on mobile viewport', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check for a navigation element (nav, hamburger button, or menu toggle)
    const hasNav = await page.evaluate(() => {
      const nav = document.querySelector('nav, [role="navigation"]');
      const hamburger = document.querySelector(
        'button[aria-label*="menu" i], button[aria-label*="nav" i], ' +
        '[data-testid*="menu"], [class*="hamburger"], [class*="menu-toggle"]',
      );
      return !!(nav || hamburger);
    });

    // The app should have some form of navigation
    expect(hasNav).toBe(true);
  });

  test('navigation links/buttons are reachable on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Find all navigation-related interactive elements
    const navItems = await page.evaluate(() => {
      const nav = document.querySelector('nav, [role="navigation"]');
      if (!nav) return [];

      const links = Array.from(nav.querySelectorAll('a, button'));
      return links
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().slice(0, 30),
          visible: true,
        }));
    });

    // Navigation should have at least one visible interactive element
    expect(navItems.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 8. Text readability on small screens
// ---------------------------------------------------------------------------

test.describe('Mobile Responsive: Text Readability', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page);
    await page.setViewportSize({ width: MOBILE_WIDTH, height: 844 });
  });

  test('body text font size is at least 14px on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const fontSizes = await page.evaluate(() => {
      const textElements = Array.from(document.querySelectorAll('p, span, li, td, label, div'));
      const sizes: number[] = [];

      for (const el of textElements.slice(0, 100)) {
        const text = (el.textContent || '').trim();
        if (text.length < 5) continue; // skip very short text
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        if (fontSize > 0) sizes.push(fontSize);
      }
      return sizes;
    });

    if (fontSizes.length > 0) {
      const minFontSize = Math.min(...fontSizes);
      // Body text should be at least 14px for readability on mobile
      expect(minFontSize).toBeGreaterThanOrEqual(14);
    }
  });

  test('line height provides adequate spacing for readability', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const lineHeightRatios = await page.evaluate(() => {
      const textElements = Array.from(document.querySelectorAll('p, li, td'));
      const ratios: number[] = [];

      for (const el of textElements.slice(0, 50)) {
        const text = (el.textContent || '').trim();
        if (text.length < 10) continue;
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        const lineHeight = parseFloat(style.lineHeight);
        if (fontSize > 0 && lineHeight > 0 && !isNaN(lineHeight)) {
          ratios.push(lineHeight / fontSize);
        }
      }
      return ratios;
    });

    if (lineHeightRatios.length > 0) {
      // Line height should be at least 1.2× font size for readability
      const minRatio = Math.min(...lineHeightRatios);
      expect(minRatio).toBeGreaterThanOrEqual(1.2);
    }
  });

  test('text does not overflow its container on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const overflowingText = await page.evaluate(() => {
      const textElements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span'));
      const overflowing: string[] = [];

      for (const el of textElements.slice(0, 100)) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) continue;
        const style = window.getComputedStyle(el);
        // Check for text that overflows without wrapping
        if (
          style.overflow === 'visible' &&
          style.whiteSpace === 'nowrap' &&
          el.scrollWidth > el.clientWidth + 1
        ) {
          overflowing.push((el.textContent || '').trim().slice(0, 40));
        }
      }
      return overflowing;
    });

    expect(overflowingText).toEqual([]);
  });

  test('headings scale appropriately on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const headingSizes = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
      return headings
        .filter((h) => {
          const rect = h.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((h) => ({
          tag: h.tagName.toLowerCase(),
          fontSize: parseFloat(window.getComputedStyle(h).fontSize),
          width: Math.round(h.getBoundingClientRect().width),
          viewportWidth: window.innerWidth,
        }));
    });

    for (const heading of headingSizes) {
      // Headings should not exceed viewport width
      expect(heading.width).toBeLessThanOrEqual(heading.viewportWidth);
      // Headings should have a reasonable font size (not too large for mobile)
      expect(heading.fontSize).toBeLessThanOrEqual(48);
      expect(heading.fontSize).toBeGreaterThanOrEqual(16);
    }
  });
});
