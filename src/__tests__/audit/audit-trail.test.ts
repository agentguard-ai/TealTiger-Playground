// Unit tests for audit trail service
// Requirements: 10.1-10.10

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditTrailService } from '../../services/AuditTrailService';
import type { AuditEvent, AuditFilters } from '../../types/audit';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn()
          })),
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn()
            }))
          })),
          in: vi.fn(() => ({
            order: vi.fn()
          }))
        }))
      }))
    }))
  },
  isSupabaseConfigured: () => true
}));

describe('AuditTrailService', () => {
  let service: AuditTrailService;

  beforeEach(() => {
    service = new AuditTrailService();
    vi.clearAllMocks();
  });

  describe('logEvent', () => {
    it('should log an audit event with all required fields', async () => {
      const { supabase } = await import('../../lib/supabase');
      const mockData = {
        id: 'event-123',
        workspace_id: 'workspace-123',
        actor_id: 'user-123',
        action: 'policy_created',
        resource_type: 'policy',
        resource_id: 'policy-123',
        metadata: { policyName: 'Test Policy' },
        created_at: new Date().toISOString()
      };

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
        }))
      }));

      (supabase!.from as any).mockReturnValue({
        insert: mockInsert
      });

      const event = await service.logEvent(
        'workspace-123',
        'user-123',
        'policy_created',
        'policy',
        'policy-123',
        { policyName: 'Test Policy' }
      );

      expect(event.id).toBe('event-123');
      expect(event.workspaceId).toBe('workspace-123');
      expect(event.actorId).toBe('user-123');
      expect(event.action).toBe('policy_created');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should redact sensitive data before logging', async () => {
      const { supabase } = await import('../../lib/supabase');
      let insertedData: any;

      const mockInsert = vi.fn((data) => {
        insertedData = data;
        return {
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { ...data, id: 'event-123', created_at: new Date().toISOString() },
              error: null
            }))
          }))
        };
      });

      (supabase!.from as any).mockReturnValue({
        insert: mockInsert
      });

      await service.logEvent(
        'workspace-123',
        'user-123',
        'policy_evaluated',
        'policy',
        'policy-123',
        {
          apiKey: 'sk-1234567890',
          userEmail: 'user@example.com',
          policyName: 'Test Policy'
        }
      );

      expect(insertedData.metadata.apiKey).toBe('[REDACTED]');
      expect(insertedData.metadata.userEmail).toMatch(/\[EMAIL_REDACTED\]/);
      expect(insertedData.metadata.policyName).toBe('Test Policy');
    });
  });

  describe('getEvents', () => {
    it('should retrieve paginated audit events', async () => {
      const { supabase } = await import('../../lib/supabase');
      const mockEvents = [
        {
          id: 'event-1',
          workspace_id: 'workspace-123',
          actor_id: 'user-123',
          action: 'policy_created',
          resource_type: 'policy',
          resource_id: 'policy-1',
          metadata: {},
          created_at: new Date().toISOString()
        },
        {
          id: 'event-2',
          workspace_id: 'workspace-123',
          actor_id: 'user-123',
          action: 'policy_updated',
          resource_type: 'policy',
          resource_id: 'policy-1',
          metadata: {},
          created_at: new Date().toISOString()
        }
      ];

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn(() => Promise.resolve({ data: mockEvents, error: null }))
          }))
        }))
      }));

      (supabase!.from as any).mockReturnValue({
        select: mockSelect
      });

      // Mock count query
      const mockCountSelect = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ count: 2, error: null }))
      }));

      (supabase!.from as any).mockReturnValueOnce({
        select: mockCountSelect
      });

      const result = await service.getEvents('workspace-123', { page: 1, pageSize: 100 });

      expect(result.items).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(100);
    });
  });

  describe('filterEvents', () => {
    it('should filter events by date range', async () => {
      const { supabase } = await import('../../lib/supabase');
      const mockEvents = [
        {
          id: 'event-1',
          workspace_id: 'workspace-123',
          actor_id: 'user-123',
          action: 'policy_created',
          resource_type: 'policy',
          resource_id: 'policy-1',
          metadata: {},
          created_at: new Date('2024-01-15').toISOString()
        }
      ];

      const mockGte = vi.fn(() => ({
        lte: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockEvents, error: null }))
        }))
      }));

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: mockGte
        }))
      }));

      (supabase!.from as any).mockReturnValue({
        select: mockSelect
      });

      const filters: AuditFilters = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      };

      const result = await service.filterEvents('workspace-123', filters);

      expect(result).toHaveLength(1);
      expect(mockGte).toHaveBeenCalled();
    });

    it('should filter events by action type', async () => {
      const { supabase } = await import('../../lib/supabase');
      const mockEvents = [
        {
          id: 'event-1',
          workspace_id: 'workspace-123',
          actor_id: 'user-123',
          action: 'policy_created',
          resource_type: 'policy',
          resource_id: 'policy-1',
          metadata: {},
          created_at: new Date().toISOString()
        }
      ];

      const mockIn = vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: mockEvents, error: null }))
      }));

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          in: mockIn
        }))
      }));

      (supabase!.from as any).mockReturnValue({
        select: mockSelect
      });

      const filters: AuditFilters = {
        actions: ['policy_created', 'policy_updated']
      };

      const result = await service.filterEvents('workspace-123', filters);

      expect(result).toHaveLength(1);
      expect(mockIn).toHaveBeenCalledWith('action', ['policy_created', 'policy_updated']);
    });
  });

  describe('formatEventDescription', () => {
    it('should format policy created event', () => {
      const event: AuditEvent = {
        id: 'event-1',
        workspaceId: 'workspace-123',
        actorId: 'user-123',
        action: 'policy_created',
        resourceType: 'policy',
        resourceId: 'policy-1',
        metadata: { policyName: 'Test Policy' },
        createdAt: new Date()
      };

      const description = service.formatEventDescription(event);
      expect(description).toContain('Created policy');
      expect(description).toContain('Test Policy');
    });

    it('should format policy approved event', () => {
      const event: AuditEvent = {
        id: 'event-1',
        workspaceId: 'workspace-123',
        actorId: 'user-123',
        action: 'policy_approved',
        resourceType: 'policy',
        resourceId: 'policy-1',
        metadata: { policyName: 'Test Policy' },
        createdAt: new Date()
      };

      const description = service.formatEventDescription(event);
      expect(description).toContain('Approved policy');
      expect(description).toContain('Test Policy');
    });

    it('should format member added event', () => {
      const event: AuditEvent = {
        id: 'event-1',
        workspaceId: 'workspace-123',
        actorId: 'user-123',
        action: 'member_added',
        resourceType: 'workspace_member',
        resourceId: 'member-1',
        metadata: { username: 'john_doe', role: 'editor' },
        createdAt: new Date()
      };

      const description = service.formatEventDescription(event);
      expect(description).toContain('Added');
      expect(description).toContain('john_doe');
      expect(description).toContain('editor');
    });

    it('should format emergency bypass event', () => {
      const event: AuditEvent = {
        id: 'event-1',
        workspaceId: 'workspace-123',
        actorId: 'user-123',
        action: 'emergency_bypass',
        resourceType: 'policy',
        resourceId: 'policy-1',
        metadata: { policyName: 'Critical Policy', reason: 'Production incident' },
        createdAt: new Date()
      };

      const description = service.formatEventDescription(event);
      expect(description).toContain('Emergency bypass');
      expect(description).toContain('Critical Policy');
      expect(description).toContain('Production incident');
    });
  });

  describe('redactSensitiveData', () => {
    it('should redact API keys', () => {
      const metadata = {
        apiKey: 'sk-1234567890',
        api_key: 'pk-0987654321',
        normalField: 'normal value'
      };

      const redacted = service.redactSensitiveData(metadata);

      expect(redacted.apiKey).toBe('[REDACTED]');
      expect(redacted.api_key).toBe('[REDACTED]');
      expect(redacted.normalField).toBe('normal value');
    });

    it('should redact passwords and secrets', () => {
      const metadata = {
        password: 'secret123',
        secret: 'my-secret',
        token: 'bearer-token',
        normalField: 'normal value'
      };

      const redacted = service.redactSensitiveData(metadata);

      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.secret).toBe('[REDACTED]');
      expect(redacted.token).toBe('[REDACTED]');
      expect(redacted.normalField).toBe('normal value');
    });

    it('should redact email addresses', () => {
      const metadata = {
        userEmail: 'user@example.com',
        description: 'Contact user@example.com for details'
      };

      const redacted = service.redactSensitiveData(metadata);

      expect(redacted.userEmail).toMatch(/\[EMAIL_REDACTED\]/);
      expect(redacted.description).toMatch(/\[EMAIL_REDACTED\]/);
    });

    it('should redact phone numbers', () => {
      const metadata = {
        phone: '123-456-7890',
        contact: 'Call 555.123.4567'
      };

      const redacted = service.redactSensitiveData(metadata);

      expect(redacted.phone).toMatch(/\[PHONE_REDACTED\]/);
      expect(redacted.contact).toMatch(/\[PHONE_REDACTED\]/);
    });

    it('should preserve non-sensitive data', () => {
      const metadata = {
        policyName: 'Test Policy',
        version: '1.0.0',
        decision: 'ALLOW',
        cost: 0.05
      };

      const redacted = service.redactSensitiveData(metadata);

      expect(redacted.policyName).toBe('Test Policy');
      expect(redacted.version).toBe('1.0.0');
      expect(redacted.decision).toBe('ALLOW');
      expect(redacted.cost).toBe(0.05);
    });
  });
});
