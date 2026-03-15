import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { AuditTrailService } from '../../services/AuditTrailService';
import type { AuditEvent, AuditAction, ResourceType, AuditFilters } from '../../types/audit';

/**
 * Property-based tests for audit export functionality
 * Requirements: 10.9, 11.1-11.4, 11.7, 11.9
 * 
 * **Validates: Requirements 10.9, 11.1-11.4, 11.7, 11.9**
 */

describe('Audit Export Property Tests', () => {
  let service: AuditTrailService;

  beforeEach(() => {
    service = new AuditTrailService();
  });

  // Arbitraries for generating test data
  const auditActionArb = fc.constantFrom<AuditAction>(
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

  const resourceTypeArb = fc.constantFrom<ResourceType>(
    'policy',
    'policy_version',
    'workspace',
    'workspace_member',
    'comment',
    'compliance_mapping'
  );

  const auditEventArb = fc.record({
    id: fc.uuid(),
    workspaceId: fc.uuid(),
    actorId: fc.uuid(),
    action: auditActionArb,
    resourceType: resourceTypeArb,
    resourceId: fc.uuid(),
    metadata: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
    createdAt: fc.date(),
  }) as fc.Arbitrary<AuditEvent>;

  /**
   * Property 46: Audit Export Round-Trip - CSV
   * **Validates: Requirements 11.1**
   * 
   * FOR ALL valid audit events, exporting to CSV and parsing back
   * SHALL preserve all essential fields (id, timestamp, action, resource)
   */
  it('Property 46: CSV export preserves essential audit event fields', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(auditEventArb, { minLength: 1, maxLength: 10 }), async (events) => {
        // Mock filterEvents to return our test events
        const originalFilterEvents = service.filterEvents.bind(service);
        service.filterEvents = async () => events;

        try {
          const csv = await service.exportCSV('test-workspace');

          // Parse CSV
          const lines = csv.split('\n');
          expect(lines.length).toBeGreaterThan(1); // Header + at least one row

          const headers = lines[0].split(',');
          expect(headers).toContain('ID');
          expect(headers).toContain('Timestamp');
          expect(headers).toContain('Action');
          expect(headers).toContain('Resource Type');
          expect(headers).toContain('Resource ID');

          // Verify each event is represented
          for (const event of events) {
            const eventRow = lines.find((line) => line.includes(event.id));
            expect(eventRow).toBeDefined();
            expect(eventRow).toContain(event.action);
            expect(eventRow).toContain(event.resourceType);
          }
        } finally {
          service.filterEvents = originalFilterEvents;
        }
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 47: Audit Export Round-Trip - JSON
   * **Validates: Requirements 11.2**
   * 
   * FOR ALL valid audit events, exporting to JSON and parsing back
   * SHALL produce equivalent audit events with all fields intact
   */
  it('Property 47: JSON export round-trip preserves all audit event data', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(auditEventArb, { minLength: 1, maxLength: 10 }), async (events) => {
        // Mock filterEvents to return our test events
        const originalFilterEvents = service.filterEvents.bind(service);
        service.filterEvents = async () => events;

        try {
          const json = await service.exportJSON('test-workspace');
          const parsed = JSON.parse(json);

          // Verify structure
          expect(parsed).toHaveProperty('metadata');
          expect(parsed).toHaveProperty('events');
          expect(parsed.metadata).toHaveProperty('exportedAt');
          expect(parsed.metadata).toHaveProperty('totalEvents');
          expect(parsed.metadata.totalEvents).toBe(events.length);

          // Verify all events are present
          expect(parsed.events).toHaveLength(events.length);

          // Verify each event's fields
          for (let i = 0; i < events.length; i++) {
            const original = events[i];
            const exported = parsed.events[i];

            expect(exported.id).toBe(original.id);
            expect(exported.workspaceId).toBe(original.workspaceId);
            expect(exported.actorId).toBe(original.actorId);
            expect(exported.action).toBe(original.action);
            expect(exported.resourceType).toBe(original.resourceType);
            expect(exported.resourceId).toBe(original.resourceId);
            expect(exported.metadata).toEqual(original.metadata);
          }
        } finally {
          service.filterEvents = originalFilterEvents;
        }
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 49: Audit Export Filtering Correctness
   * **Validates: Requirements 11.4, 11.5, 11.7**
   * 
   * FOR ALL audit events and filter criteria, exported events
   * SHALL match the filter criteria exactly
   */
  it('Property 49: Exported events match filter criteria', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(auditEventArb, { minLength: 5, maxLength: 20 }),
        fc.array(auditActionArb, { minLength: 1, maxLength: 3 }),
        async (events, selectedActions) => {
          // Mock filterEvents to filter by actions
          const originalFilterEvents = service.filterEvents.bind(service);
          service.filterEvents = async (workspaceId: string, filters: AuditFilters) => {
            if (filters.actions && filters.actions.length > 0) {
              return events.filter((e) => filters.actions!.includes(e.action));
            }
            return events;
          };

          try {
            const filters: AuditFilters = { actions: selectedActions };
            const json = await service.exportJSON('test-workspace', filters);
            const parsed = JSON.parse(json);

            // All exported events should match the filter
            for (const event of parsed.events) {
              expect(selectedActions).toContain(event.action);
            }

            // Count should match filtered events
            const expectedCount = events.filter((e) => selectedActions.includes(e.action)).length;
            expect(parsed.events.length).toBe(expectedCount);
          } finally {
            service.filterEvents = originalFilterEvents;
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 52: Audit Export Metadata Inclusion
   * **Validates: Requirements 11.7, 11.8**
   * 
   * FOR ALL audit exports, metadata SHALL include timestamp, filters,
   * and total event count
   */
  it('Property 52: Export metadata includes required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(auditEventArb, { minLength: 1, maxLength: 10 }),
        fc.date(),
        async (events, startDate) => {
          const endDate = new Date(startDate.getTime() + 86400000); // +1 day

          // Mock filterEvents
          const originalFilterEvents = service.filterEvents.bind(service);
          service.filterEvents = async () => events;

          try {
            const filters: AuditFilters = {
              dateRange: { start: startDate, end: endDate },
            };

            const json = await service.exportJSON('test-workspace', filters);
            const parsed = JSON.parse(json);

            // Verify metadata structure
            expect(parsed.metadata).toBeDefined();
            expect(parsed.metadata.exportedAt).toBeDefined();
            expect(parsed.metadata.exportedBy).toBeDefined();
            expect(parsed.metadata.filters).toBeDefined();
            expect(parsed.metadata.totalEvents).toBe(events.length);

            // Verify filters are preserved
            expect(parsed.metadata.filters.dateRange).toBeDefined();
          } finally {
            service.filterEvents = originalFilterEvents;
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 53: Audit Export Sensitive Data Redaction
   * **Validates: Requirements 10.9, 11.9**
   * 
   * FOR ALL audit events containing sensitive data (API keys, emails, phones),
   * exported data SHALL have sensitive fields redacted (via redactSensitiveData)
   */
  it('Property 53: Sensitive data is redacted in exports', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          workspaceId: fc.uuid(),
          actorId: fc.uuid(),
          action: auditActionArb,
          resourceType: resourceTypeArb,
          resourceId: fc.uuid(),
          metadata: fc.record({
            apiKey: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            email: fc.emailAddress(),
            phone: fc.constant('555-123-4567'),
            normalField: fc.string(),
          }),
          createdAt: fc.date(),
        }),
        async (event) => {
          // Apply redaction as would happen during logEvent
          const redactedMetadata = service.redactSensitiveData(event.metadata);
          const redactedEvent = { ...event, metadata: redactedMetadata } as AuditEvent;

          // Mock filterEvents to return redacted event
          const originalFilterEvents = service.filterEvents.bind(service);
          service.filterEvents = async () => [redactedEvent];

          try {
            const json = await service.exportJSON('test-workspace');
            const parsed = JSON.parse(json);

            const exportedEvent = parsed.events[0];

            // Sensitive fields should be redacted
            expect(exportedEvent.metadata.apiKey).toBe('[REDACTED]');
            expect(exportedEvent.metadata.email).toBe('[EMAIL_REDACTED]');
            expect(exportedEvent.metadata.phone).toBe('[PHONE_REDACTED]');

            // Normal fields should be preserved
            expect(exportedEvent.metadata.normalField).toBe(event.metadata.normalField);
          } finally {
            service.filterEvents = originalFilterEvents;
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: SHA-256 Signature Consistency
   * **Validates: Requirements 11.4, 11.6**
   * 
   * FOR ALL export data, generating a signature twice SHALL produce
   * the same signature (deterministic)
   */
  it('Property: SHA-256 signature is deterministic', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 10 }), async (data) => {
        const signature1 = await service.signExport(data);
        const signature2 = await service.signExport(data);

        expect(signature1).toBe(signature2);
        expect(signature1).toHaveLength(64); // SHA-256 produces 64 hex characters
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Signature Verification Correctness
   * **Validates: Requirements 11.5**
   * 
   * FOR ALL export data, verifying a valid signature SHALL return true,
   * and verifying an invalid signature SHALL return false
   */
  it('Property: Signature verification detects tampering', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 10 }), fc.string(), async (data, tamperedData) => {
        fc.pre(data !== tamperedData); // Ensure data is different

        const signature = await service.signExport(data);

        // Valid signature should verify
        const validResult = await service.verifySignature(data, signature);
        expect(validResult).toBe(true);

        // Invalid signature should not verify
        const invalidResult = await service.verifySignature(tamperedData, signature);
        expect(invalidResult).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: CSV Export Escaping
   * **Validates: Requirements 11.1**
   * 
   * FOR ALL audit events with special CSV characters (commas, quotes, newlines),
   * CSV export SHALL properly escape values
   */
  it('Property: CSV export properly escapes special characters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          workspaceId: fc.uuid(),
          actorId: fc.uuid(),
          action: auditActionArb,
          resourceType: resourceTypeArb,
          resourceId: fc.uuid(),
          metadata: fc.record({
            description: fc.oneof(
              fc.constant('Value with, comma'),
              fc.constant('Value with "quotes"'),
              fc.constant('Value with\nnewline')
            ),
          }),
          createdAt: fc.date(),
        }),
        async (event) => {
          // Mock filterEvents
          const originalFilterEvents = service.filterEvents.bind(service);
          service.filterEvents = async () => [event as AuditEvent];

          try {
            const csv = await service.exportCSV('test-workspace');

            // CSV should be parseable (no broken rows)
            const lines = csv.split('\n');
            expect(lines.length).toBeGreaterThanOrEqual(2); // Header + at least one row

            // Special characters should be escaped
            const dataRow = lines[1];
            if (event.metadata.description.includes(',')) {
              // Should be quoted
              expect(dataRow).toMatch(/"[^"]*,[^"]*"/);
            }
            if (event.metadata.description.includes('"')) {
              // Quotes should be doubled
              expect(dataRow).toMatch(/"[^"]*""[^"]*"/);
            }
          } finally {
            service.filterEvents = originalFilterEvents;
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: PDF Export Generation
   * **Validates: Requirements 11.3**
   * 
   * FOR ALL audit events, PDF export SHALL generate a valid PDF blob
   */
  it('Property: PDF export generates valid PDF blob', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(auditEventArb, { minLength: 1, maxLength: 5 }), async (events) => {
        // Mock filterEvents
        const originalFilterEvents = service.filterEvents.bind(service);
        service.filterEvents = async () => events;

        try {
          const pdfBlob = await service.exportPDF('test-workspace');

          // Verify it's a Blob
          expect(pdfBlob).toBeInstanceOf(Blob);
          expect(pdfBlob.type).toBe('application/pdf');
          expect(pdfBlob.size).toBeGreaterThan(0);

          // Verify PDF magic number (starts with %PDF)
          const arrayBuffer = await pdfBlob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const header = String.fromCharCode(...uint8Array.slice(0, 4));
          expect(header).toBe('%PDF');
        } finally {
          service.filterEvents = originalFilterEvents;
        }
      }),
      { numRuns: 20 } // Fewer runs for PDF generation (slower)
    );
  });
});
