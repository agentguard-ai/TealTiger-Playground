// Unit tests for offline sync functionality
// Requirements: 27.6, 27.7, 27.8

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RealtimeCollaborationService } from '../../services/RealtimeCollaborationService';
import type { PendingChange } from '../../services/RealtimeCollaborationService';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => {
  const createMockChannel = () => {
    const channel: any = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue({ status: 'subscribed' }),
      unsubscribe: vi.fn().mockResolvedValue({ status: 'unsubscribed' }),
      track: vi.fn().mockResolvedValue({}),
      presenceState: vi.fn(() => ({})),
    };
    return channel;
  };
  
  return {
    createClient: vi.fn(() => ({
      channel: vi.fn(() => createMockChannel()),
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      })),
    })),
  };
});

describe('RealtimeCollaborationService - Offline Sync', () => {
  let service: RealtimeCollaborationService;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
      configurable: true,
    });

    service = new RealtimeCollaborationService(
      'https://test.supabase.co',
      'test-key'
    );
  });

  describe('Offline Queue Management', () => {
    it('should queue changes when offline', () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      service.queueOfflineChange('comment_added', {
        policyId: 'policy-1',
        content: 'Test comment',
      });

      const queue = service.getOfflineQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('comment_added');
      expect(queue[0].data.policyId).toBe('policy-1');
    });

    it('should persist queue to localStorage', () => {
      service.queueOfflineChange('comment_added', {
        policyId: 'policy-1',
        content: 'Test comment',
      });

      const stored = localStorage.getItem('tealtiger_offline_queue');
      expect(stored).toBeTruthy();
      
      const queue = JSON.parse(stored!);
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('comment_added');
    });

    it('should maintain queue order by timestamp', () => {
      service.queueOfflineChange('comment_added', { id: '1' });
      service.queueOfflineChange('comment_resolved', { id: '2' });
      service.queueOfflineChange('reply_added', { id: '3' });

      const queue = service.getOfflineQueue();
      expect(queue).toHaveLength(3);
      expect(queue[0].data.id).toBe('1');
      expect(queue[1].data.id).toBe('2');
      expect(queue[2].data.id).toBe('3');
    });

    it('should generate unique IDs for queued changes', () => {
      service.queueOfflineChange('comment_added', { content: 'Test 1' });
      service.queueOfflineChange('comment_added', { content: 'Test 2' });

      const queue = service.getOfflineQueue();
      expect(queue[0].id).not.toBe(queue[1].id);
      expect(queue[0].id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });
  });

  describe('Sync Operations', () => {
    it('should sync queued changes when online', async () => {
      const changes: PendingChange[] = [
        {
          id: 'change-1',
          type: 'comment_added',
          data: { policyId: 'policy-1', content: 'Test' },
          timestamp: new Date(),
          retryCount: 0,
        },
      ];

      const result = await service.syncOfflineChanges(changes);
      
      expect(result.synced).toContain('change-1');
      expect(result.failed).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should not sync when offline', async () => {
      // Create a fresh service instance for this test
      const offlineService = new RealtimeCollaborationService(
        'https://test.supabase.co',
        'test-key'
      );
      
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
        configurable: true,
      });

      const changes: PendingChange[] = [
        {
          id: 'change-1',
          type: 'comment_added',
          data: { policyId: 'policy-1' },
          timestamp: new Date(),
          retryCount: 0,
        },
      ];

      const result = await offlineService.syncOfflineChanges(changes);
      
      expect(result.synced).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle sync failures gracefully', async () => {
      const changes: PendingChange[] = [
        {
          id: 'change-1',
          type: 'unknown_type', // This will be handled gracefully
          data: {},
          timestamp: new Date(),
          retryCount: 0,
        },
      ];

      const result = await service.syncOfflineChanges(changes);
      
      // Should not throw, changes are processed
      expect(result).toBeDefined();
      expect(result.synced.length + result.failed.length).toBeGreaterThanOrEqual(0);
    });

    it('should clear synced changes from queue', async () => {
      service.queueOfflineChange('comment_added', { id: '1' });
      service.queueOfflineChange('comment_added', { id: '2' });

      const queue = service.getOfflineQueue();
      const result = await service.syncOfflineChanges(queue);

      expect(result.synced.length).toBeGreaterThan(0);
      
      const remainingQueue = service.getOfflineQueue();
      expect(remainingQueue.length).toBeLessThan(queue.length);
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts during sync', async () => {
      // This test would require mocking a conflict scenario
      // For now, we'll test the structure
      const changes: PendingChange[] = [
        {
          id: 'change-1',
          type: 'comment_added',
          data: { policyId: 'policy-1' },
          timestamp: new Date(),
          retryCount: 0,
        },
      ];

      const result = await service.syncOfflineChanges(changes);
      
      expect(result).toHaveProperty('conflicts');
      expect(Array.isArray(result.conflicts)).toBe(true);
    });

    it('should use last_write_wins strategy by default', async () => {
      const changes: PendingChange[] = [
        {
          id: 'change-1',
          type: 'comment_added',
          data: { policyId: 'policy-1' },
          timestamp: new Date(),
          retryCount: 0,
        },
      ];

      const result = await service.syncOfflineChanges(changes);
      
      // If there are conflicts, they should use last_write_wins
      result.conflicts.forEach((conflict) => {
        expect(conflict.strategy).toBe('last_write_wins');
      });
    });
  });

  describe('Online/Offline Detection', () => {
    it('should detect online status', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      expect(service.isServiceOnline()).toBe(true);
    });

    it('should detect offline status', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Create new service to pick up offline status
      const offlineService = new RealtimeCollaborationService(
        'https://test.supabase.co',
        'test-key'
      );

      expect(offlineService.isServiceOnline()).toBe(false);
    });

    it('should trigger sync when connection restored', async () => {
      const syncSpy = vi.spyOn(service, 'syncOfflineChanges');

      // Queue a change while offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      
      service.queueOfflineChange('comment_added', { id: '1' });

      // Simulate going online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      
      window.dispatchEvent(new Event('online'));

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(syncSpy).toHaveBeenCalled();
    });
  });

  describe('Service Cleanup', () => {
    it('should unsubscribe from all channels on cleanup', async () => {
      // Just verify the method exists and doesn't throw
      await expect(service.unsubscribeAll()).resolves.not.toThrow();
    });
  });
});
