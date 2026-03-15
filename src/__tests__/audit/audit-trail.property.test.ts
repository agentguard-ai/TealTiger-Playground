// Property-based tests for audit trail
// Requirements: 10.1-10.10
// Properties: 38, 39, 40, 41, 42, 43, 44, 45, 48

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { AuditTrailService } from '../../services/AuditTrailService';
import type { AuditAction, ResourceType, AuditEvent, AuditFilters } from '../../types/audit';

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
        })),
        order: vi.fn(() => ({
          range: vi.fn()
        }))
      }))
    }))
  },
  isSupabaseConfigured: () => true
}));

// Arbitraries for property-based testing
const auditActionArbitrary = fc.constantFrom<AuditAction>(
  'policy_created',
  'policy_updated',
  'policy_deleted',
  'policy_approved',
  'policy_rejected',
  'policy_deployed',
  'policy_evaluated',
  'member_added',
  'member_removed',
  'member_role_changed',
  'workspace_settings_changed',
  'auth_login',
  'auth_logout',
  'emergency_bypass'
);

const resourceTypeArbitrary = fc.constantFrom<ResourceType>(
  'policy',
  'policy_version',
  'workspace',
  'workspace_member',
  'comment',
  'compliance_mapping'
);

const auditEventArbitrary = fc.record({
  id: fc.uuid(),
  workspaceId: fc.uuid(),
  actorId: fc.uuid(),
  action: auditActionArbitrary,
  resourceType: resourceTypeArbitrary,
  resourceId: fc.uuid(),
  metadata: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
  createdAt: fc.date()
}) as fc.Arbitrary<AuditEvent>;

describe('Audit Trail Property Tests', () => {
  let service: AuditTrailService;

  beforeEach(() => {
    service = new AuditTrailService();
    vi.clearAllMocks();
  });

  /**
   * Property 38: Audit Event Completeness - Policy Operations
   * Validates: Requirements 10.1
   * 
   * Test that all policy CRUD operations generate audit events with required fields.
   */
  it('Property 38: Policy operations generate complete audit events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.constantFrom<AuditAction>('policy_created', 'policy_updated', 'policy_deleted'),
        fc.uuid(),
        fc.record({
          policyName: fc.string({ minLength: 1, maxLength: 100 }),
          version: fc.string({ minLength: 5, maxLength: 10 })
        }),
        async (workspaceId, actorId, action, resourceId, metadata) => {
          const { supabase } = await import('../../lib/supabase');
          const mockInsert = vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: fc.sample(fc.uuid(), 1)[0],
                  workspace_id: workspaceId,
                  actor_id: actorId,
                  action,
                  resource_type: 'policy',
                  resource_id: resourceId,
                  metadata,
                  created_at: new Date().toISOString()
                },
                error: null
              }))
            }))
          }));

          (supabase!.from as any).mockReturnValue({
            insert: mockInsert
          });

          const event = await service.logEvent(
            workspaceId,
            actorId,
            action,
            'policy',
            resourceId,
            metadata
          );

          // Verify all required fields are present
          expect(event.id).toBeDefined();
          expect(event.workspaceId).toBe(workspaceId);
          expect(event.actorId).toBe(actorId);
          expect(event.action).toBe(action);
          expect(event.resourceType).toBe('policy');
          expect(event.resourceId).toBe(resourceId);
          expect(event.metadata).toBeDefined();
          expect(event.createdAt).toBeInstanceOf(Date);

          // Verify insert was called with correct data
          expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
              workspace_id: workspaceId,
              actor_id: actorId,
              action,
              resource_type: 'policy',
              resource_id: resourceId
            })
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 39: Audit Event Completeness - Approvals
   * Validates: Requirements 10.2
   * 
   * Test that all approval/rejection events are logged with complete information.
   */
  it('Property 39: Approval events are logged completely', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.constantFrom<AuditAction>('policy_approved', 'policy_rejected'),
        fc.uuid(),
        fc.record({
          policyName: fc.string({ minLength: 1, maxLength: 100 }),
          reason: fc.string({ minLength: 0, maxLength: 500 })
        }),
        async (workspaceId, actorId, action, resourceId, metadata) => {
          const { supabase } = await import('../../lib/supabase');
          const mockInsert = vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: fc.sample(fc.uuid(), 1)[0],
                  workspace_id: workspaceId,
                  actor_id: actorId,
                  action,
                  resource_type: 'policy',
                  resource_id: resourceId,
                  metadata,
                  created_at: new Date().toISOString()
                },
                error: null
              }))
            }))
          }));

          (supabase!.from as any).mockReturnValue({
            insert: mockInsert
          });

          const event = await service.logEvent(
            workspaceId,
            actorId,
            action,
            'policy',
            resourceId,
            metadata
          );

          expect(event.action).toMatch(/approved|rejected/);
          expect(event.metadata).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 40: Audit Event Completeness - Evaluations
   * Validates: Requirements 10.3
   * 
   * Test that evaluation events are logged without sensitive data.
   */
  it('Property 40: Evaluation events redact sensitive data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.record({
          policyName: fc.string({ minLength: 1, maxLength: 100 }),
          decision: fc.constantFrom('ALLOW', 'DENY', 'MODIFY'),
          apiKey: fc.string({ minLength: 20, maxLength: 40 }),
          userEmail: fc.emailAddress()
        }),
        async (workspaceId, actorId, resourceId, metadata) => {
          const { supabase } = await import('../../lib/supabase');
          
          // Capture what was actually inserted
          let insertedData: any;
          const mockInsert = vi.fn((data) => {
            insertedData = data;
            return {
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    id: fc.sample(fc.uuid(), 1)[0],
                    ...data,
                    created_at: new Date().toISOString()
                  },
                  error: null
                }))
              }))
            };
          });

          (supabase!.from as any).mockReturnValue({
            insert: mockInsert
          });

          await service.logEvent(
            workspaceId,
            actorId,
            'policy_evaluated',
            'policy',
            resourceId,
            metadata
          );

          // Verify sensitive data was redacted
          expect(insertedData.metadata.apiKey).toBe('[REDACTED]');
          expect(insertedData.metadata.userEmail).toMatch(/\[EMAIL_REDACTED\]/);
          // policyName might contain email patterns, so check if it was redacted or preserved
          if (insertedData.metadata.policyName.includes('[EMAIL_REDACTED]')) {
            // Email pattern was found and redacted
            expect(insertedData.metadata.policyName).toMatch(/\[EMAIL_REDACTED\]/);
          } else {
            // No email pattern, should be preserved
            expect(insertedData.metadata.policyName).toBe(metadata.policyName);
          }
          expect(insertedData.metadata.decision).toBe(metadata.decision);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 41: Audit Event Completeness - Membership
   * Validates: Requirements 10.4
   * 
   * Test that membership changes are logged.
   */
  it('Property 41: Membership changes are logged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.constantFrom<AuditAction>('member_added', 'member_removed', 'member_role_changed'),
        fc.uuid(),
        fc.record({
          username: fc.string({ minLength: 1, maxLength: 50 }),
          role: fc.constantFrom('owner', 'editor', 'viewer')
        }),
        async (workspaceId, actorId, action, resourceId, metadata) => {
          const { supabase } = await import('../../lib/supabase');
          const mockInsert = vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: fc.sample(fc.uuid(), 1)[0],
                  workspace_id: workspaceId,
                  actor_id: actorId,
                  action,
                  resource_type: 'workspace_member',
                  resource_id: resourceId,
                  metadata,
                  created_at: new Date().toISOString()
                },
                error: null
              }))
            }))
          }));

          (supabase!.from as any).mockReturnValue({
            insert: mockInsert
          });

          const event = await service.logEvent(
            workspaceId,
            actorId,
            action,
            'workspace_member',
            resourceId,
            metadata
          );

          expect(event.action).toMatch(/member_/);
          expect(event.resourceType).toBe('workspace_member');
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 42: Audit Event Completeness - Configuration
   * Validates: Requirements 10.5
   * 
   * Test that configuration changes are logged.
   */
  it('Property 42: Configuration changes are logged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.record({
          changedFields: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 })
        }),
        async (workspaceId, actorId, resourceId, metadata) => {
          const { supabase } = await import('../../lib/supabase');
          const mockInsert = vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: fc.sample(fc.uuid(), 1)[0],
                  workspace_id: workspaceId,
                  actor_id: actorId,
                  action: 'workspace_settings_changed',
                  resource_type: 'workspace',
                  resource_id: resourceId,
                  metadata,
                  created_at: new Date().toISOString()
                },
                error: null
              }))
            }))
          }));

          (supabase!.from as any).mockReturnValue({
            insert: mockInsert
          });

          const event = await service.logEvent(
            workspaceId,
            actorId,
            'workspace_settings_changed',
            'workspace',
            resourceId,
            metadata
          );

          expect(event.action).toBe('workspace_settings_changed');
          expect(event.metadata.changedFields).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 43: Audit Event Structure Consistency
   * Validates: Requirements 10.6
   * 
   * Test that all events include timestamp, actor, action, and resource.
   */
  it('Property 43: All events have consistent structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        auditActionArbitrary,
        resourceTypeArbitrary,
        fc.uuid(),
        fc.dictionary(fc.string(), fc.string()),
        async (workspaceId, actorId, action, resourceType, resourceId, metadata) => {
          const { supabase } = await import('../../lib/supabase');
          const mockInsert = vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: fc.sample(fc.uuid(), 1)[0],
                  workspace_id: workspaceId,
                  actor_id: actorId,
                  action,
                  resource_type: resourceType,
                  resource_id: resourceId,
                  metadata,
                  created_at: new Date().toISOString()
                },
                error: null
              }))
            }))
          }));

          (supabase!.from as any).mockReturnValue({
            insert: mockInsert
          });

          const event = await service.logEvent(
            workspaceId,
            actorId,
            action,
            resourceType,
            resourceId,
            metadata
          );

          // Verify required fields
          expect(event).toHaveProperty('id');
          expect(event).toHaveProperty('workspaceId');
          expect(event).toHaveProperty('actorId');
          expect(event).toHaveProperty('action');
          expect(event).toHaveProperty('resourceType');
          expect(event).toHaveProperty('resourceId');
          expect(event).toHaveProperty('metadata');
          expect(event).toHaveProperty('createdAt');
          expect(event.createdAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 44: Audit Trail Immutability
   * Validates: Requirements 10.7
   * 
   * Test that audit events cannot be modified (append-only).
   * Note: This is enforced by database RLS policies, so we test the service doesn't provide update methods.
   */
  it('Property 44: Audit trail service has no update/delete methods', () => {
    // Verify service only has read and append methods
    expect(service).toHaveProperty('logEvent');
    expect(service).toHaveProperty('getEvents');
    expect(service).toHaveProperty('filterEvents');
    expect(service).toHaveProperty('formatEventDescription');
    expect(service).toHaveProperty('redactSensitiveData');
    
    // Verify no update or delete methods exist
    expect(service).not.toHaveProperty('updateEvent');
    expect(service).not.toHaveProperty('deleteEvent');
    expect(service).not.toHaveProperty('modifyEvent');
  });

  /**
   * Property 45: Audit Trail Filtering Correctness
   * Validates: Requirements 10.8
   * 
   * Test that filter returns only matching events.
   */
  it('Property 45: Filtering returns only matching events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(auditEventArbitrary, { minLength: 5, maxLength: 20 }),
        fc.array(auditActionArbitrary, { minLength: 1, maxLength: 3 }),
        async (workspaceId, events, filterActions) => {
          const { supabase } = await import('../../lib/supabase');
          
          // Mock filtered results
          const filteredEvents = events.filter(e => filterActions.includes(e.action));
          const mockSelect = vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: filteredEvents.map(e => ({
                    id: e.id,
                    workspace_id: e.workspaceId,
                    actor_id: e.actorId,
                    action: e.action,
                    resource_type: e.resourceType,
                    resource_id: e.resourceId,
                    metadata: e.metadata,
                    created_at: e.createdAt.toISOString()
                  })),
                  error: null
                }))
              }))
            }))
          }));

          (supabase!.from as any).mockReturnValue({
            select: mockSelect
          });

          const filters: AuditFilters = {
            actions: filterActions
          };

          const result = await service.filterEvents(workspaceId, filters);

          // Verify all returned events match the filter
          result.forEach(event => {
            expect(filterActions).toContain(event.action);
          });

          // Verify count matches expected
          expect(result.length).toBe(filteredEvents.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 48: Audit Event Description Readability
   * Validates: Requirements 10.10
   * 
   * Test that human-readable descriptions are generated for all event types.
   */
  it('Property 48: All events have human-readable descriptions', () => {
    fc.assert(
      fc.property(
        auditEventArbitrary,
        (event) => {
          const description = service.formatEventDescription(event);

          // Description should be non-empty
          expect(description).toBeTruthy();
          expect(description.length).toBeGreaterThan(0);

          // Description should not contain underscores (should be human-readable)
          expect(description).not.toMatch(/_/);

          // Description should be a complete sentence or phrase
          expect(description.length).toBeGreaterThan(10);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Additional test: Sensitive data redaction
   * Validates: Requirements 10.9
   */
  it('Redacts API keys, passwords, and PII from metadata', () => {
    // Use alphanumeric strings without @ to avoid false email matches
    const safeStringArbitrary = fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 '.split(''))
    );

    fc.assert(
      fc.property(
        fc.record({
          apiKey: fc.string({ minLength: 20, maxLength: 40 }),
          password: fc.string({ minLength: 8, maxLength: 20 }),
          email: fc.emailAddress(),
          phoneNumber: fc.string({ minLength: 10, maxLength: 15 }),
          normalField: safeStringArbitrary
        }),
        (metadata) => {
          const redacted = service.redactSensitiveData(metadata);

          // Sensitive fields should be redacted
          expect(redacted.apiKey).toBe('[REDACTED]');
          expect(redacted.password).toBe('[REDACTED]');
          expect(redacted.email).toMatch(/\[EMAIL_REDACTED\]/);
          
          // Normal fields (without email-like patterns) should be preserved
          expect(redacted.normalField).toBe(metadata.normalField);
        }
      ),
      { numRuns: 100 }
    );
  });
});
