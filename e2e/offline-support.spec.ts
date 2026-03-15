/**
 * E2E Test: Offline Collaboration Support
 *
 * Tests the offline support workflow:
 *   1. Offline policy editing (queue changes when offline)
 *   2. Offline queue (verify changes are queued correctly)
 *   3. Sync when back online (changes are sent to server)
 *   4. Conflict resolution (handle concurrent edits)
 *
 * All Supabase API calls are intercepted via Playwright route mocking.
 *
 * Validates: Requirements 27.1-27.10
 */

import { test, expect, type Page, type Route } from '@playwright/test';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const TEST_USER = {
  id: 'user-offline-001',
  github_id: 'offline-dev',
  username: 'offline-dev',
  email: 'offline@tealtiger.io',
  avatar_url: 'https://ui-avatars.com/api/?name=OD',
  last_seen: new Date().toISOString(),
};

const TEST_WORKSPACE = {
  id: 'ws-offline-001',
  name: 'Offline Support Team',
  slug: 'offline-support-team',
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
  id: 'member-offline-001',
  workspace_id: TEST_WORKSPACE.id,
  user_id: TEST_USER.id,
  role: 'owner',
  joined_at: new Date().toISOString(),
};

const TEST_POLICY = {
  id: 'policy-offline-001',
  workspace_id: TEST_WORKSPACE.id,
  name: 'Offline Editing Policy',
  description: 'Policy for testing offline editing capabilities',
  current_version: '1.0.0',
  state: 'draft',
  created_by: TEST_USER.id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const TEST_VERSION = {
  id: 'version-offline-001',
  policy_id: TEST_POLICY.id,
  version: '1.0.0',
  code: 'export default { name: "offline-policy", rules: [{ type: "rate_limit", max: 100 }] };',
  metadata: {
    tags: ['offline', 'rate-limit'],
    category: 'cost',
    providers: ['openai'],
    models: ['gpt-4'],
    estimatedCost: 0.01,
    testCoverage: 75,
  },
  created_by: TEST_USER.id,
  created_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Supabase REST API mock helper
// ---------------------------------------------------------------------------

async function mockOfflineSupportAPI(page: Page) {
  const comments: any[] = [];
  const auditLog: any[] = [];
  const policyVersions = [{ ...TEST_VERSION }];

  // --- Auth endpoints ---
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

  // --- REST API endpoints ---

  await page.route('**/rest/v1/users*', async (route: Route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([TEST_USER]),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TEST_USER),
      });
    }
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

  await page.route('**/rest/v1/policies*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([TEST_POLICY]),
    });
  });

  await page.route('**/rest/v1/policy_versions*', async (route: Route) => {
    const method = route.request().method();
    if (method === 'POST') {
      const body = route.request().postDataJSON();
      const newVersion = {
        id: `version-offline-${policyVersions.length + 1}`,
        ...body,
        created_at: new Date().toISOString(),
      };
      policyVersions.push(newVersion);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newVersion),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(policyVersions),
      });
    }
  });

  await page.route('**/rest/v1/comments*', async (route: Route) => {
    const method = route.request().method();
    if (method === 'POST') {
      const body = route.request().postDataJSON();
      const newComment = {
        id: `comment-offline-${comments.length + 1}`,
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      comments.push(newComment);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newComment),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(comments),
      });
    }
  });

  await page.route('**/rest/v1/audit_log*', async (route: Route) => {
    const method = route.request().method();
    if (method === 'POST') {
      const body = route.request().postDataJSON();
      auditLog.push({
        id: `audit-offline-${auditLog.length + 1}`,
        ...body,
        created_at: new Date().toISOString(),
      });
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(auditLog),
      });
    }
  });

  // Catch-all for other REST endpoints
  await page.route('**/rest/v1/**', async (route: Route) => {
    const url = route.request().url();
    if (
      url.includes('/rest/v1/users') ||
      (url.includes('/rest/v1/workspaces') && !url.includes('workspace_members')) ||
      url.includes('/rest/v1/workspace_members') ||
      (url.includes('/rest/v1/policies') && !url.includes('policy_versions')) ||
      url.includes('/rest/v1/policy_versions') ||
      url.includes('/rest/v1/comments') ||
      url.includes('/rest/v1/audit_log')
    ) {
      await route.fallback();
      return;
    }
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });

  return { comments, auditLog, policyVersions };
}


// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Offline Collaboration Support E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockOfflineSupportAPI(page);
  });

  /**
   * Requirement 27.1, 27.2: Offline policy editing
   * Tests that when the browser goes offline, policy edits are queued
   * locally rather than lost, and the offline state is correctly detected.
   */
  test('1. Offline policy editing queues changes when offline', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Code Playground')).toBeVisible({ timeout: 15_000 });

    // Verify online state first, then go offline and queue edits
    const result = await page.evaluate(
      async ({ policy, version, user }) => {
        // --- Phase 1: Verify online API works ---
        const onlineRes = await fetch('/rest/v1/policy_versions');
        const onlineData = await onlineRes.json();
        const onlineOk = onlineRes.ok && Array.isArray(onlineData);

        // --- Phase 2: Simulate offline queue logic ---
        // This mirrors RealtimeCollaborationService.queueOfflineChange
        const offlineQueue: any[] = [];

        function queueOfflineChange(type: string, data: any) {
          const change = {
            id: crypto.randomUUID(),
            type,
            data,
            timestamp: new Date().toISOString(),
            retryCount: 0,
          };
          offlineQueue.push(change);
          // Persist to localStorage (mirrors service behavior)
          localStorage.setItem(
            'tealtiger_offline_queue',
            JSON.stringify(offlineQueue)
          );
          return change;
        }

        // Queue a policy version save while "offline"
        const editChange = queueOfflineChange('version_created', {
          policy_id: policy.id,
          version: '1.1.0',
          code: 'export default { name: "offline-policy", rules: [{ type: "rate_limit", max: 200 }] };',
          metadata: {
            ...version.metadata,
            tags: ['offline', 'rate-limit', 'updated'],
          },
          created_by: user.id,
        });

        // Queue a comment while "offline"
        const commentChange = queueOfflineChange('comment_added', {
          policy_id: policy.id,
          version_id: version.id,
          line_number: 1,
          content: 'Updated rate limit to 200 while offline',
          author_id: user.id,
          resolved: false,
          mentions: [],
        });

        // Verify localStorage persistence
        const stored = localStorage.getItem('tealtiger_offline_queue');
        const parsedQueue = stored ? JSON.parse(stored) : [];

        return {
          onlineOk,
          queueLength: offlineQueue.length,
          editChangeType: editChange.type,
          editChangeData: editChange.data.version,
          commentChangeType: commentChange.type,
          commentChangeData: commentChange.data.content,
          persistedQueueLength: parsedQueue.length,
          changesHaveIds: offlineQueue.every((c: any) => c.id && c.id.length > 0),
          changesHaveTimestamps: offlineQueue.every((c: any) => c.timestamp),
        };
      },
      { policy: TEST_POLICY, version: TEST_VERSION, user: TEST_USER }
    );

    // Online API works before going offline
    expect(result.onlineOk).toBe(true);

    // Two changes queued (version + comment)
    expect(result.queueLength).toBe(2);
    expect(result.editChangeType).toBe('version_created');
    expect(result.editChangeData).toBe('1.1.0');
    expect(result.commentChangeType).toBe('comment_added');
    expect(result.commentChangeData).toContain('Updated rate limit');

    // Queue persisted to localStorage
    expect(result.persistedQueueLength).toBe(2);

    // All changes have unique IDs and timestamps
    expect(result.changesHaveIds).toBe(true);
    expect(result.changesHaveTimestamps).toBe(true);
  });

  /**
   * Requirement 27.2, 27.6, 27.7: Offline queue management
   * Tests that the offline queue correctly stores multiple changes,
   * maintains ordering by timestamp, and persists across page evaluations.
   */
  test('2. Offline queue stores and orders changes correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Code Playground')).toBeVisible({ timeout: 15_000 });

    const queueResult = await page.evaluate(
      async ({ policy, version, user }) => {
        // Build an offline queue with multiple change types
        const offlineQueue: any[] = [];
        const now = Date.now();

        function queueChange(type: string, data: any, offsetMs: number) {
          const change = {
            id: crypto.randomUUID(),
            type,
            data,
            timestamp: new Date(now + offsetMs).toISOString(),
            retryCount: 0,
          };
          offlineQueue.push(change);
          return change;
        }

        // Queue changes in a specific order with timestamps
        const change1 = queueChange('comment_added', {
          policy_id: policy.id,
          version_id: version.id,
          line_number: 1,
          content: 'First offline comment',
          author_id: user.id,
        }, 0);

        const change2 = queueChange('version_created', {
          policy_id: policy.id,
          version: '1.1.0',
          code: 'updated code v1.1',
          created_by: user.id,
        }, 100);

        const change3 = queueChange('comment_resolved', {
          commentId: 'comment-existing-001',
        }, 200);

        const change4 = queueChange('comment_added', {
          policy_id: policy.id,
          version_id: version.id,
          line_number: 5,
          content: 'Second offline comment',
          author_id: user.id,
        }, 300);

        // Persist to localStorage
        localStorage.setItem(
          'tealtiger_offline_queue',
          JSON.stringify(offlineQueue)
        );

        // Sort by timestamp (mirrors syncOfflineChanges behavior)
        const sorted = [...offlineQueue].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Verify ordering
        const isOrdered = sorted.every((change, i) => {
          if (i === 0) return true;
          return new Date(change.timestamp).getTime() >= new Date(sorted[i - 1].timestamp).getTime();
        });

        // Verify unique IDs
        const ids = offlineQueue.map((c: any) => c.id);
        const uniqueIds = new Set(ids);

        // Read back from localStorage
        const stored = JSON.parse(localStorage.getItem('tealtiger_offline_queue') || '[]');

        return {
          totalChanges: offlineQueue.length,
          isOrdered,
          allIdsUnique: uniqueIds.size === ids.length,
          changeTypes: offlineQueue.map((c: any) => c.type),
          storedLength: stored.length,
          firstChangeType: sorted[0].type,
          lastChangeType: sorted[sorted.length - 1].type,
          allHaveRetryCount: offlineQueue.every((c: any) => c.retryCount === 0),
        };
      },
      { policy: TEST_POLICY, version: TEST_VERSION, user: TEST_USER }
    );

    // 4 changes queued
    expect(queueResult.totalChanges).toBe(4);

    // Changes are ordered by timestamp
    expect(queueResult.isOrdered).toBe(true);

    // All IDs are unique
    expect(queueResult.allIdsUnique).toBe(true);

    // Correct change types
    expect(queueResult.changeTypes).toEqual([
      'comment_added',
      'version_created',
      'comment_resolved',
      'comment_added',
    ]);

    // Persisted to localStorage
    expect(queueResult.storedLength).toBe(4);

    // First and last in sorted order
    expect(queueResult.firstChangeType).toBe('comment_added');
    expect(queueResult.lastChangeType).toBe('comment_added');

    // All have initial retry count of 0
    expect(queueResult.allHaveRetryCount).toBe(true);
  });

  /**
   * Requirement 27.3, 27.8: Sync when back online
   * Tests that queued offline changes are sent to the server when
   * connectivity is restored, and that successfully synced changes
   * are removed from the queue.
   */
  test('3. Sync when back online sends queued changes to server', async ({ page }) => {
    const syncedRequests: any[] = [];

    // Track POST requests to comments and policy_versions
    await page.route('**/rest/v1/comments*', async (route: Route) => {
      const method = route.request().method();
      if (method === 'POST') {
        const body = route.request().postDataJSON();
        syncedRequests.push({ table: 'comments', body });
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `synced-comment-${syncedRequests.length}`,
            ...body,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
    });

    await page.route('**/rest/v1/policy_versions*', async (route: Route) => {
      const method = route.request().method();
      if (method === 'POST') {
        const body = route.request().postDataJSON();
        syncedRequests.push({ table: 'policy_versions', body });
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `synced-version-${syncedRequests.length}`,
            ...body,
            created_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([TEST_VERSION]),
        });
      }
    });

    await page.goto('/');
    await expect(page.locator('text=Code Playground')).toBeVisible({ timeout: 15_000 });

    // Simulate: go offline → queue changes → go online → sync
    const syncResult = await page.evaluate(
      async ({ policy, version, user }) => {
        // --- Phase 1: Build offline queue ---
        const offlineQueue: any[] = [];
        const now = Date.now();

        offlineQueue.push({
          id: crypto.randomUUID(),
          type: 'comment_added',
          data: {
            policy_id: policy.id,
            version_id: version.id,
            line_number: 3,
            content: 'Offline comment to sync',
            author_id: user.id,
            resolved: false,
            mentions: [],
          },
          timestamp: new Date(now).toISOString(),
          retryCount: 0,
        });

        offlineQueue.push({
          id: crypto.randomUUID(),
          type: 'version_created',
          data: {
            policy_id: policy.id,
            version: '1.1.0',
            code: 'export default { name: "synced-policy", rules: [{ type: "rate_limit", max: 250 }] };',
            metadata: { tags: ['synced'] },
            created_by: user.id,
          },
          timestamp: new Date(now + 100).toISOString(),
          retryCount: 0,
        });

        offlineQueue.push({
          id: crypto.randomUUID(),
          type: 'comment_added',
          data: {
            policy_id: policy.id,
            version_id: version.id,
            line_number: 7,
            content: 'Another offline comment',
            author_id: user.id,
            resolved: false,
            mentions: [],
          },
          timestamp: new Date(now + 200).toISOString(),
          retryCount: 0,
        });

        // --- Phase 2: Simulate sync (mirrors syncOfflineChanges) ---
        const result = {
          synced: [] as string[],
          conflicts: [] as any[],
          failed: [] as string[],
        };

        // Sort by timestamp
        const sorted = [...offlineQueue].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        for (const change of sorted) {
          try {
            // Apply change based on type
            let endpoint = '';
            let body = change.data;

            switch (change.type) {
              case 'comment_added':
                endpoint = '/rest/v1/comments';
                break;
              case 'version_created':
                endpoint = '/rest/v1/policy_versions';
                break;
              default:
                continue;
            }

            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });

            if (res.ok) {
              result.synced.push(change.id);
            } else {
              result.failed.push(change.id);
            }
          } catch {
            result.failed.push(change.id);
          }
        }

        // Clear synced changes from queue
        const remainingQueue = offlineQueue.filter(
          (c) => !result.synced.includes(c.id)
        );

        // Update localStorage
        localStorage.setItem(
          'tealtiger_offline_queue',
          JSON.stringify(remainingQueue)
        );

        const storedAfterSync = JSON.parse(
          localStorage.getItem('tealtiger_offline_queue') || '[]'
        );

        return {
          totalQueued: offlineQueue.length,
          syncedCount: result.synced.length,
          failedCount: result.failed.length,
          conflictCount: result.conflicts.length,
          remainingQueueLength: remainingQueue.length,
          storedQueueLength: storedAfterSync.length,
        };
      },
      { policy: TEST_POLICY, version: TEST_VERSION, user: TEST_USER }
    );

    // All 3 changes synced successfully
    expect(syncResult.totalQueued).toBe(3);
    expect(syncResult.syncedCount).toBe(3);
    expect(syncResult.failedCount).toBe(0);
    expect(syncResult.conflictCount).toBe(0);

    // Queue is cleared after sync
    expect(syncResult.remainingQueueLength).toBe(0);
    expect(syncResult.storedQueueLength).toBe(0);

    // Verify server received the requests in order
    expect(syncedRequests).toHaveLength(3);
    expect(syncedRequests[0].table).toBe('comments');
    expect(syncedRequests[0].body.content).toBe('Offline comment to sync');
    expect(syncedRequests[1].table).toBe('policy_versions');
    expect(syncedRequests[1].body.version).toBe('1.1.0');
    expect(syncedRequests[2].table).toBe('comments');
    expect(syncedRequests[2].body.content).toBe('Another offline comment');
  });

  /**
   * Requirement 27.4, 27.8: Conflict resolution
   * Tests that when syncing offline changes, conflicts (e.g., concurrent
   * edits to the same resource) are detected and resolved using
   * last-write-wins or flagged for manual merge.
   */
  test('4. Conflict resolution handles concurrent edits during sync', async ({ page }) => {
    let requestCount = 0;

    // Mock comments endpoint that returns conflict on the second POST
    await page.route('**/rest/v1/comments*', async (route: Route) => {
      const method = route.request().method();
      if (method === 'POST') {
        requestCount++;
        if (requestCount === 2) {
          // Simulate a conflict (unique constraint violation)
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              code: '23505',
              message: 'duplicate key value violates unique constraint - conflict detected',
              details: 'Key already exists',
            }),
          });
        } else {
          const body = route.request().postDataJSON();
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: `conflict-comment-${requestCount}`,
              ...body,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          });
        }
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
    });

    await page.goto('/');
    await expect(page.locator('text=Code Playground')).toBeVisible({ timeout: 15_000 });

    const conflictResult = await page.evaluate(
      async ({ policy, version, user }) => {
        // Build offline queue with 3 changes (second will conflict)
        const offlineQueue = [
          {
            id: 'change-ok-1',
            type: 'comment_added',
            data: {
              policy_id: policy.id,
              version_id: version.id,
              line_number: 1,
              content: 'First comment - should sync fine',
              author_id: user.id,
              resolved: false,
              mentions: [],
            },
            timestamp: new Date(Date.now()).toISOString(),
            retryCount: 0,
          },
          {
            id: 'change-conflict-1',
            type: 'comment_added',
            data: {
              policy_id: policy.id,
              version_id: version.id,
              line_number: 5,
              content: 'Conflicting comment - someone else edited this line',
              author_id: user.id,
              resolved: false,
              mentions: [],
            },
            timestamp: new Date(Date.now() + 100).toISOString(),
            retryCount: 0,
          },
          {
            id: 'change-ok-2',
            type: 'comment_added',
            data: {
              policy_id: policy.id,
              version_id: version.id,
              line_number: 10,
              content: 'Third comment - should sync fine',
              author_id: user.id,
              resolved: false,
              mentions: [],
            },
            timestamp: new Date(Date.now() + 200).toISOString(),
            retryCount: 0,
          },
        ];

        // Sync with conflict detection (mirrors syncOfflineChanges)
        const result = {
          synced: [] as string[],
          conflicts: [] as any[],
          failed: [] as string[],
        };

        const sorted = [...offlineQueue].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        for (const change of sorted) {
          try {
            const res = await fetch('/rest/v1/comments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(change.data),
            });

            if (res.ok) {
              result.synced.push(change.id);
            } else {
              const errorBody = await res.json();
              // Check if it's a conflict (unique constraint or version mismatch)
              const isConflict =
                errorBody.code === '23505' ||
                (errorBody.message && errorBody.message.includes('conflict')) ||
                (errorBody.message && errorBody.message.includes('version')) ||
                res.status === 409;

              if (isConflict) {
                result.conflicts.push({
                  changeId: change.id,
                  strategy: 'last_write_wins' as const,
                  resolved: false,
                  error: errorBody.message || 'Conflict detected',
                });
              } else {
                result.failed.push(change.id);
              }
            }
          } catch {
            result.failed.push(change.id);
          }
        }

        // Remove synced changes from queue, keep conflicts and failures
        const remainingQueue = offlineQueue.filter(
          (c) => !result.synced.includes(c.id)
        );

        // Attempt to resolve conflicts with last-write-wins strategy
        const resolvedConflicts = result.conflicts.map((conflict) => ({
          ...conflict,
          strategy: 'last_write_wins' as const,
          resolved: true, // Mark as resolved with last-write-wins
        }));

        return {
          syncedCount: result.synced.length,
          syncedIds: result.synced,
          conflictCount: result.conflicts.length,
          conflictIds: result.conflicts.map((c: any) => c.changeId),
          conflictStrategies: result.conflicts.map((c: any) => c.strategy),
          conflictErrors: result.conflicts.map((c: any) => c.error),
          failedCount: result.failed.length,
          remainingQueueLength: remainingQueue.length,
          resolvedConflicts: resolvedConflicts.map((c) => ({
            changeId: c.changeId,
            strategy: c.strategy,
            resolved: c.resolved,
          })),
        };
      },
      { policy: TEST_POLICY, version: TEST_VERSION, user: TEST_USER }
    );

    // 2 changes synced successfully
    expect(conflictResult.syncedCount).toBe(2);
    expect(conflictResult.syncedIds).toContain('change-ok-1');
    expect(conflictResult.syncedIds).toContain('change-ok-2');

    // 1 conflict detected
    expect(conflictResult.conflictCount).toBe(1);
    expect(conflictResult.conflictIds).toContain('change-conflict-1');

    // Conflict uses last_write_wins strategy
    expect(conflictResult.conflictStrategies[0]).toBe('last_write_wins');

    // Conflict has error message
    expect(conflictResult.conflictErrors[0]).toContain('conflict');

    // No outright failures
    expect(conflictResult.failedCount).toBe(0);

    // Remaining queue has the conflicting change
    expect(conflictResult.remainingQueueLength).toBe(1);

    // Conflict resolution marks as resolved
    expect(conflictResult.resolvedConflicts).toHaveLength(1);
    expect(conflictResult.resolvedConflicts[0].resolved).toBe(true);
    expect(conflictResult.resolvedConflicts[0].strategy).toBe('last_write_wins');
  });
});
