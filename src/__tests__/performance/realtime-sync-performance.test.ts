import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RealtimeCollaborationService } from '@/services/RealtimeCollaborationService';
import type { PendingChange } from '@/services/RealtimeCollaborationService';

/**
 * Performance tests for real-time sync latency
 * Validates: Requirements 29.7
 *
 * Tests that the RealtimeCollaborationService handles message latency < 100ms,
 * supports 10 concurrent users for presence, syncs offline queues efficiently,
 * and manages subscription setup/teardown within performance budgets.
 */

// Helper to create a channel mock where subscribe() returns the channel itself
function createChannelMock() {
  const ch: any = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    track: vi.fn().mockResolvedValue(undefined),
    presenceState: vi.fn().mockReturnValue({}),
  };
  ch.subscribe.mockReturnValue(ch);
  return ch;
}

const mockSupabaseClient = {
  channel: vi.fn(),
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// --- Data generators ---

function generatePresenceUsers(count: number) {
  const state: Record<string, any[]> = {};
  for (let i = 0; i < count; i++) {
    state[`user-${i}`] = [
      {
        userId: `user-${i}`,
        username: `developer${i}`,
        avatarUrl: `https://avatars.example.com/${i}.png`,
        cursorPosition: { line: (i * 7) % 100 + 1, column: (i * 3) % 80 },
        lastActivity: new Date(Date.now() - i * 5000).toISOString(),
      },
    ];
  }
  return state;
}

function generateOfflineChanges(count: number): PendingChange[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `change-${i}`,
    type: ['comment_added', 'comment_resolved', 'reply_added'][i % 3],
    data: {
      commentId: `comment-${i}`,
      content: `Offline change ${i} content`,
      policy_id: `policy-${i % 5}`,
      author_id: `user-${i % 10}`,
    },
    timestamp: new Date(Date.now() - (count - i) * 1000),
    retryCount: 0,
  }));
}

// --- Performance helper ---

async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

// 100ms budget per Requirement 29.7
const REALTIME_THRESHOLD_MS = 100;

describe('Real-time Sync Latency Performance', () => {
  let service: RealtimeCollaborationService;
  let defaultChannel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultChannel = createChannelMock();
    mockSupabaseClient.channel.mockReturnValue(defaultChannel);
    mockSupabaseClient.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    service = new RealtimeCollaborationService('https://fake.supabase.co', 'fake-key');
  });

  describe('message handling latency < 100ms', () => {
    it('should set up policy change subscription within 100ms', async () => {
      const callback = vi.fn();

      const { result: unsubscribe, durationMs } = await measureTime(() =>
        service.subscribeToPolicyChanges('policy-latency-1', callback)
      );

      expect(typeof unsubscribe).toBe('function');
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('policy:policy-latency-1');
      expect(defaultChannel.on).toHaveBeenCalled();
      expect(defaultChannel.subscribe).toHaveBeenCalled();
      expect(durationMs).toBeLessThan(REALTIME_THRESHOLD_MS);
    });

    it('should set up comment subscription within 100ms', async () => {
      const callback = vi.fn();

      const { result: unsubscribe, durationMs } = await measureTime(() =>
        service.subscribeToComments('policy-latency-2', callback)
      );

      expect(typeof unsubscribe).toBe('function');
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('comments:policy-latency-2');
      expect(defaultChannel.subscribe).toHaveBeenCalled();
      expect(durationMs).toBeLessThan(REALTIME_THRESHOLD_MS);
    });

    it('should handle rapid sequential subscriptions within 100ms each', async () => {
      const policyIds = Array.from({ length: 5 }, (_, i) => `policy-rapid-${i}`);
      mockSupabaseClient.channel.mockImplementation(() => createChannelMock());

      for (const policyId of policyIds) {
        const { durationMs } = await measureTime(() =>
          service.subscribeToPolicyChanges(policyId, vi.fn())
        );
        expect(durationMs).toBeLessThan(REALTIME_THRESHOLD_MS);
      }

      expect(mockSupabaseClient.channel).toHaveBeenCalledTimes(5);
    });

    it('should broadcast presence within 100ms', async () => {
      const { durationMs } = await measureTime(() =>
        service.broadcastPresence('workspace-latency', 'user-1', {
          username: 'developer1',
          avatarUrl: 'https://avatars.example.com/1.png',
          cursorPosition: { line: 42, column: 10 },
        })
      );

      expect(defaultChannel.track).toHaveBeenCalled();
      expect(durationMs).toBeLessThan(REALTIME_THRESHOLD_MS);
    });
  });

  describe('presence with 10 concurrent users', () => {
    it('should retrieve 10 active users within 100ms', async () => {
      const presenceState = generatePresenceUsers(10);
      defaultChannel.presenceState.mockReturnValue(presenceState);

      const { result, durationMs } = await measureTime(() =>
        service.getActiveUsers('workspace-concurrent')
      );

      expect(result).toHaveLength(10);
      for (let i = 0; i < 10; i++) {
        const user = result.find(u => u.userId === `user-${i}`);
        expect(user).toBeDefined();
        expect(user!.username).toBe(`developer${i}`);
        expect(user!.cursorPosition).toBeDefined();
        expect(user!.lastActivity).toBeInstanceOf(Date);
      }
      expect(durationMs).toBeLessThan(REALTIME_THRESHOLD_MS);
    });

    it('should handle 10 concurrent presence broadcasts within 100ms total', async () => {
      const broadcasts = Array.from({ length: 10 }, (_, i) => ({
        workspaceId: 'workspace-concurrent',
        userId: `user-${i}`,
        presence: {
          username: `developer${i}`,
          avatarUrl: `https://avatars.example.com/${i}.png`,
          cursorPosition: { line: i * 10 + 1, column: i * 5 },
        },
      }));

      const { durationMs } = await measureTime(async () => {
        await Promise.all(
          broadcasts.map(b =>
            service.broadcastPresence(b.workspaceId, b.userId, b.presence)
          )
        );
      });

      expect(defaultChannel.track).toHaveBeenCalledTimes(10);
      expect(durationMs).toBeLessThan(REALTIME_THRESHOLD_MS);
    });

    it('should retrieve presence for 20 users without degradation', async () => {
      const presenceState = generatePresenceUsers(20);
      defaultChannel.presenceState.mockReturnValue(presenceState);

      const { result, durationMs } = await measureTime(() =>
        service.getActiveUsers('workspace-large')
      );

      expect(result).toHaveLength(20);
      expect(durationMs).toBeLessThan(REALTIME_THRESHOLD_MS);
    });

    it('should handle empty presence state within 100ms', async () => {
      defaultChannel.presenceState.mockReturnValue({});

      const { result, durationMs } = await measureTime(() =>
        service.getActiveUsers('workspace-empty')
      );

      expect(result).toHaveLength(0);
      expect(durationMs).toBeLessThan(REALTIME_THRESHOLD_MS);
    });
  });

  describe('offline queue sync performance', () => {
    it('should sync 10 offline changes within 100ms', async () => {
      const changes = generateOfflineChanges(10);
      (service as any).isOnline = true;

      const { result, durationMs } = await measureTime(() =>
        service.syncOfflineChanges(changes)
      );

      expect(result.synced).toHaveLength(10);
      expect(result.conflicts).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(durationMs).toBeLessThan(REALTIME_THRESHOLD_MS);
    });

    it('should sync 25 offline changes within 100ms', async () => {
      const changes = generateOfflineChanges(25);
      (service as any).isOnline = true;

      const { result, durationMs } = await measureTime(() =>
        service.syncOfflineChanges(changes)
      );

      expect(result.synced).toHaveLength(25);
      expect(durationMs).toBeLessThan(REALTIME_THRESHOLD_MS);
    });

    it('should handle sync with conflicts within 100ms', async () => {
      const changes = generateOfflineChanges(10);
      let callCount = 0;
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount % 3 === 0) {
            return Promise.resolve({ error: { code: '23505', message: 'conflict' } });
          }
          return Promise.resolve({ error: null });
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      (service as any).isOnline = true;

      const { durationMs } = await measureTime(() =>
        service.syncOfflineChanges(changes)
      );

      expect(durationMs).toBeLessThan(REALTIME_THRESHOLD_MS);
    });

    it('should handle empty offline queue within 100ms', async () => {
      (service as any).isOnline = true;

      const { result, durationMs } = await measureTime(() =>
        service.syncOfflineChanges([])
      );

      expect(result.synced).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(durationMs).toBeLessThan(REALTIME_THRESHOLD_MS);
    });

    it('should return immediately when offline', async () => {
      const changes = generateOfflineChanges(10);
      (service as any).isOnline = false;

      const { result, durationMs } = await measureTime(() =>
        service.syncOfflineChanges(changes)
      );

      expect(result.synced).toHaveLength(0);
      expect(durationMs).toBeLessThan(REALTIME_THRESHOLD_MS);
    });
  });

  describe('subscription setup/teardown performance', () => {
    it('should set up and tear down a policy subscription within 100ms', async () => {
      const { result: unsubscribe, durationMs: setupMs } = await measureTime(() =>
        service.subscribeToPolicyChanges('policy-teardown-1', vi.fn())
      );
      expect(setupMs).toBeLessThan(REALTIME_THRESHOLD_MS);

      const { durationMs: teardownMs } = await measureTime(async () => {
        await unsubscribe();
      });
      expect(teardownMs).toBeLessThan(REALTIME_THRESHOLD_MS);
    });

    it('should unsubscribe from all channels within 100ms', async () => {
      const channelMocks = Array.from({ length: 5 }, () => createChannelMock());
      let channelIdx = 0;
      mockSupabaseClient.channel.mockImplementation(() => channelMocks[channelIdx++]);

      for (let i = 0; i < 5; i++) {
        await service.subscribeToPolicyChanges(`policy-multi-${i}`, vi.fn());
      }

      const { durationMs } = await measureTime(() => service.unsubscribeAll());

      for (const ch of channelMocks) {
        expect(ch.unsubscribe).toHaveBeenCalled();
      }
      expect(durationMs).toBeLessThan(REALTIME_THRESHOLD_MS);
    });

    it('should handle repeated subscribe/unsubscribe cycles without degradation', async () => {
      const durations: number[] = [];

      for (let i = 0; i < 5; i++) {
        const ch = createChannelMock();
        mockSupabaseClient.channel.mockReturnValue(ch);

        const { durationMs } = await measureTime(async () => {
          const unsubscribe = await service.subscribeToPolicyChanges(`policy-cycle-${i}`, vi.fn());
          await unsubscribe();
        });
        durations.push(durationMs);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avgDuration).toBeLessThan(REALTIME_THRESHOLD_MS);
      for (const d of durations) {
        expect(d).toBeLessThan(REALTIME_THRESHOLD_MS);
      }
    });

    it('should queue offline changes within 100ms', () => {
      const start = performance.now();
      for (let i = 0; i < 20; i++) {
        service.queueOfflineChange('comment_added', {
          commentId: `comment-${i}`,
          content: `Queued comment ${i}`,
        });
      }
      const durationMs = performance.now() - start;

      expect(service.getOfflineQueue()).toHaveLength(20);
      expect(durationMs).toBeLessThan(REALTIME_THRESHOLD_MS);
    });
  });
});
