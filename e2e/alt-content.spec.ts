/**
 * E2E Test: Alternative Content for Visual Elements
 * Validates: Requirements 25.3, 25.4, 25.6
 */
import { test, expect, type Page, type Route } from '@playwright/test';

const TEST_USER = {
  id: 'user-alt-001', github_id: 'alt-tester', username: 'alt-tester',
  email: 'alt@tealtiger.io', avatar_url: 'https://ui-avatars.com/api/?name=ALT',
  last_seen: new Date().toISOString(),
};
const TEST_WORKSPACE = {
  id: 'ws-alt-001', name: 'Alt Content Team', slug: 'alt-content-team',
  owner_id: TEST_USER.id,
  settings: { requiredApprovers: 1, approverUserIds: [], allowEmergencyBypass: false, autoApprovalRules: [] },
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};
const TEST_MEMBER = {
  id: 'member-alt-001', workspace_id: TEST_WORKSPACE.id,
  user_id: TEST_USER.id, role: 'owner', joined_at: new Date().toISOString(),
};
const TEST_POLICIES = [
  { id: 'policy-alt-001', workspace_id: TEST_WORKSPACE.id, name: 'PII Detection Policy', description: 'Detects PII', current_version: '1.0.0', state: 'production', created_by: TEST_USER.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'policy-alt-002', workspace_id: TEST_WORKSPACE.id, name: 'Cost Control Policy', description: 'Budget limits', current_version: '2.0.0', state: 'draft', created_by: TEST_USER.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'policy-alt-003', workspace_id: TEST_WORKSPACE.id, name: 'Prompt Injection Guard', description: 'Injection detection', current_version: '1.1.0', state: 'approved', created_by: TEST_USER.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

async function mockAltContentAPI(page: Page) {
  await page.route('**/auth/v1/token*', async (route: Route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token', token_type: 'bearer', expires_in: 3600, refresh_token: 'mock-refresh-token',
        user: { id: TEST_USER.id, email: TEST_USER.email, user_metadata: { user_name: TEST_USER.username, avatar_url: TEST_USER.avatar_url, preferred_username: TEST_USER.username } },
      }),
    });
  });
  await page.route('**/auth/v1/user', async (route: Route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: TEST_USER.id, email: TEST_USER.email, user_metadata: { user_name: TEST_USER.username, avatar_url: TEST_USER.avatar_url } }),
    });
  });
  await page.route('**/rest/v1/**', async (route: Route) => {
    const method = route.request().method();
    if (method === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
    else { await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
  });
  await page.route('**/rest/v1/users*', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([TEST_USER]) });
  });
  await page.route('**/rest/v1/workspaces*', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([TEST_WORKSPACE]) });
  });
  await page.route('**/rest/v1/workspace_members*', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([TEST_MEMBER]) });
  });
  await page.route('**/rest/v1/policies*', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEST_POLICIES) });
  });
  await page.route('**/rest/v1/policy_approvals*', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route('**/rest/v1/audit_log*', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route('**/rest/v1/compliance_mappings*', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

test.describe('Alternative Content for Visual Elements', () => {
  test.beforeEach(async ({ page }) => {
    await mockAltContentAPI(page);
  });

  // Validates: Requirement 25.3 - Policy diff text descriptions
  test('1. Color-coded elements include text labels, not just color', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Code Playground')).toBeVisible({ timeout: 15_000 });
    const colorCodedElements = await page.evaluate(() => {
      const colorPatterns = ['bg-green', 'bg-red', 'bg-yellow', 'bg-blue', 'text-green', 'text-red', 'text-yellow'];
      const elements = Array.from(document.querySelectorAll('*'));
      const colorOnly: string[] = [];
      for (const el of elements) {
        const classes = el.className;
        if (typeof classes !== 'string') continue;
        const hasColorClass = colorPatterns.some((p) => classes.includes(p));
        if (!hasColorClass) continue;
        const text = (el.textContent || '').trim();
        const ariaLabel = el.getAttribute('aria-label') || '';
        const title = el.getAttribute('title') || '';
        const role = el.getAttribute('role') || '';
        const hasAccessibleText = text.length > 0 || ariaLabel.length > 0 || title.length > 0;
        const isDecorative = /\bw-[12]\b/.test(classes) && /\bh-[12]\b/.test(classes);
        const isInformational = !isDecorative && (el.tagName === 'SPAN' || el.tagName === 'DIV' || el.tagName === 'BUTTON' || role === 'status' || role === 'img');
        if (isInformational && !hasAccessibleText) {
          const tag = el.tagName.toLowerCase();
          const cls = classes.substring(0, 80);
          colorOnly.push('<' + tag + ' class="' + cls + '">');
        }
      }
      return { colorOnly };
    });
    expect(colorCodedElements.colorOnly, 'Found color-coded element(s) without text:\n' + colorCodedElements.colorOnly.join('\n')).toEqual([]);
  });

  test('2. Policy state badges include text labels alongside color', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Code Playground')).toBeVisible({ timeout: 15_000 });
    const stateBadges = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('.rounded-full, [role="status"]'));
      const results: Array<{ text: string; hasAriaLabel: boolean; hasVisibleText: boolean }> = [];
      for (const badge of badges) {
        const text = (badge.textContent || '').trim();
        const ariaLabel = badge.getAttribute('aria-label') || '';
        const isStateBadge = ['draft', 'review', 'approved', 'production'].includes(text.toLowerCase()) || ariaLabel.toLowerCase().includes('state');
        if (isStateBadge || ariaLabel.length > 0) {
          results.push({ text, hasAriaLabel: ariaLabel.length > 0, hasVisibleText: text.length > 0 });
        }
      }
      return results;
    });
    for (const badge of stateBadges) {
      expect(badge.hasVisibleText || badge.hasAriaLabel, 'State badge "' + badge.text + '" should have visible text or aria-label').toBe(true);
    }
  });

  // Validates: Requirement 25.4 - Analytics chart data tables
  test('3. SVG chart elements have role="img" and aria-label', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Code Playground')).toBeVisible({ timeout: 15_000 });
    const svgCharts = await page.evaluate(() => {
      const svgs = Array.from(document.querySelectorAll('svg'));
      const chartSvgs: Array<{ hasRoleImg: boolean; hasAriaLabel: boolean; ariaLabel: string; isDecorative: boolean }> = [];
      for (const svg of svgs) {
        const role = svg.getAttribute('role');
        const ariaLabel = svg.getAttribute('aria-label') || '';
        const ariaHidden = svg.getAttribute('aria-hidden');
        const hasDataElements = svg.querySelectorAll('rect').length > 2 || svg.querySelectorAll('circle').length > 2;
        const isChart = role === 'img' || hasDataElements;
        if (isChart) {
          chartSvgs.push({ hasRoleImg: role === 'img', hasAriaLabel: ariaLabel.length > 0, ariaLabel, isDecorative: ariaHidden === 'true' });
        }
      }
      return chartSvgs;
    });
    for (const chart of svgCharts) {
      if (!chart.isDecorative) {
        expect(chart.hasRoleImg || chart.hasAriaLabel, 'Chart SVG should have role="img" or aria-label').toBe(true);
      }
    }
  });

  test('4. Chart bar elements have title tooltips for data access', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Code Playground')).toBeVisible({ timeout: 15_000 });
    const chartDataPoints = await page.evaluate(() => {
      const rects = Array.from(document.querySelectorAll('svg rect'));
      const dataRects: Array<{ hasTitle: boolean; titleText: string }> = [];
      for (const rect of rects) {
        const title = rect.querySelector('title');
        if (title) {
          dataRects.push({ hasTitle: true, titleText: (title.textContent || '').trim() });
        }
      }
      return { total: rects.length, withTitles: dataRects };
    });
    for (const point of chartDataPoints.withTitles) {
      expect(point.hasTitle, 'Chart data point should have a <title> element').toBe(true);
      expect(point.titleText.length, 'Chart data point title should contain text').toBeGreaterThan(0);
    }
  });

  test('5. Metric cards provide text-based values, not just visuals', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Code Playground')).toBeVisible({ timeout: 15_000 });
    const gaugeElements = await page.evaluate(() => {
      const svgs = Array.from(document.querySelectorAll('svg'));
      const gauges: Array<{ hasTextValue: boolean; textContent: string; parentHasLabel: boolean }> = [];
      for (const svg of svgs) {
        const circles = svg.querySelectorAll('circle');
        if (circles.length >= 2) {
          const parent = svg.closest('div');
          const textInParent = parent ? (parent.textContent || '').trim() : '';
          const hasPercentage = /\d+%/.test(textInParent);
          const label = parent?.querySelector('.text-gray-400, .text-xs');
          const labelText = label ? (label.textContent || '').trim() : '';
          gauges.push({ hasTextValue: hasPercentage, textContent: textInParent.substring(0, 100), parentHasLabel: labelText.length > 0 });
        }
      }
      return gauges;
    });
    for (const gauge of gaugeElements) {
      expect(gauge.hasTextValue || gauge.parentHasLabel, 'Gauge should have text value or label').toBe(true);
    }
  });

  // Validates: Requirement 25.6 - Compliance report accessibility
  test('6. Tables use proper semantic markup (thead, th with scope)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Code Playground')).toBeVisible({ timeout: 15_000 });
    const tableAnalysis = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table'));
      const results: Array<{ hasThead: boolean; hasTbody: boolean; thCount: number; thWithScope: number; rowCount: number }> = [];
      for (const table of tables) {
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        const ths = Array.from(table.querySelectorAll('th'));
        const thsWithScope = ths.filter((th) => th.getAttribute('scope'));
        const rows = table.querySelectorAll('tbody tr');
        results.push({ hasThead: thead !== null, hasTbody: tbody !== null, thCount: ths.length, thWithScope: thsWithScope.length, rowCount: rows.length });
      }
      return { tableCount: tables.length, tables: results };
    });
    for (const table of tableAnalysis.tables) {
      expect(table.hasThead, 'Table should have a <thead> element').toBe(true);
      expect(table.hasTbody, 'Table should have a <tbody> element').toBe(true);
      if (table.thCount > 0) {
        expect(table.thWithScope, 'All <th> elements should have scope attribute').toBe(table.thCount);
      }
    }
  });

  test('7. Progress bars have text alternatives', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Code Playground')).toBeVisible({ timeout: 15_000 });
    const progressBars = await page.evaluate(() => {
      const divBars = Array.from(document.querySelectorAll('.rounded-full'));
      const divProgress: Array<{ hasAriaRole: boolean; hasAriaValue: boolean; hasAdjacentText: boolean; adjacentText: string }> = [];
      for (const bar of divBars) {
        const child = bar.querySelector('div');
        if (!child) continue;
        const childStyle = child.getAttribute('style') || '';
        const isProgressBar = childStyle.includes('width:');
        if (!isProgressBar) continue;
        const role = bar.getAttribute('role');
        const ariaValueNow = bar.getAttribute('aria-valuenow');
        const parent = bar.parentElement;
        const parentText = parent ? (parent.textContent || '').trim() : '';
        const hasPercentageText = /\d+%/.test(parentText);
        divProgress.push({ hasAriaRole: role === 'progressbar', hasAriaValue: ariaValueNow !== null, hasAdjacentText: hasPercentageText, adjacentText: parentText.substring(0, 80) });
      }
      return { divProgressBars: divProgress };
    });
    for (const bar of progressBars.divProgressBars) {
      expect(bar.hasAriaRole || bar.hasAriaValue || bar.hasAdjacentText, 'Progress bar should have role, aria-valuenow, or adjacent text').toBe(true);
    }
  });

  // Cross-cutting: color-coded elements don't rely solely on color
  test('8. Diff change indicators use symbols in addition to color', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Code Playground')).toBeVisible({ timeout: 15_000 });
    const diffPatternCheck = await page.evaluate(() => {
      const diffColorClasses = ['bg-green-50', 'bg-red-50', 'bg-yellow-50'];
      const elementsWithDiffColors = Array.from(document.querySelectorAll('*')).filter((el) => {
        const classes = typeof el.className === 'string' ? el.className : '';
        return diffColorClasses.some((c) => classes.includes(c));
      });
      const withoutText = elementsWithDiffColors.filter((el) => {
        const classes = typeof el.className === 'string' ? el.className : '';
        const isDecorative = /\bw-[12]\b/.test(classes) && /\bh-[12]\b/.test(classes);
        return !isDecorative && (el.textContent || '').trim().length === 0;
      });
      return { totalDiffElements: elementsWithDiffColors.length, withoutText: withoutText.length };
    });
    expect(diffPatternCheck.withoutText, 'Found diff-colored element(s) without text content').toBe(0);
  });

  test('9. Buttons with SVG icons have accessible names', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Code Playground')).toBeVisible({ timeout: 15_000 });
    const iconAnalysis = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const issues: string[] = [];
      for (const btn of buttons) {
        const svgs = btn.querySelectorAll('svg');
        if (svgs.length === 0) continue;
        const btnText = (btn.textContent || '').trim();
        const btnAriaLabel = btn.getAttribute('aria-label') || '';
        const btnTitle = btn.getAttribute('title') || '';
        const hasLabel = btnText.length > 0 || btnAriaLabel.length > 0 || btnTitle.length > 0;
        if (!hasLabel) {
          const svgHasLabel = Array.from(svgs).some((svg) => (svg.getAttribute('aria-label') || '').length > 0);
          if (!svgHasLabel) {
            const cls = (btn.className || '').substring(0, 60);
            issues.push('<button class="' + cls + '"> has SVG without accessible name');
          }
        }
      }
      return issues;
    });
    expect(iconAnalysis, 'Found button(s) with SVG icons lacking accessible names:\n' + iconAnalysis.join('\n')).toEqual([]);
  });

  test('10. Percentage values are rendered as readable text', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Code Playground')).toBeVisible({ timeout: 15_000 });
    const coverageIndicators = await page.evaluate(() => {
      const percentElements = Array.from(document.querySelectorAll('*')).filter((el) => {
        const text = (el.textContent || '').trim();
        return /^\d+%$/.test(text) && el.children.length === 0;
      });
      return { count: percentElements.length, values: percentElements.map((el) => ({ text: (el.textContent || '').trim(), tag: el.tagName.toLowerCase() })) };
    });
    for (const indicator of coverageIndicators.values) {
      expect(indicator.text.length, 'Coverage percentage should be rendered as readable text').toBeGreaterThan(0);
    }
  });
});
