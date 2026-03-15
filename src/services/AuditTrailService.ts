import { supabase } from '../lib/supabase';
import CryptoJS from 'crypto-js';
import jsPDF from 'jspdf';
import type {
  AuditEvent,
  AuditAction,
  ResourceType,
  AuditQueryOptions,
  AuditFilters,
  PaginatedResult,
  AuditError,
  AuditExportMetadata,
  AuditExport,
} from '../types/audit';

/**
 * AuditTrailService - Manages immutable audit trail logging
 * Requirements: 10.1-10.10
 */
export class AuditTrailService {
  /**
   * Logs an audit event (append-only)
   * Requirements: 10.1-10.6
   */
  async logEvent(
    workspaceId: string,
    actorId: string,
    action: AuditAction,
    resourceType: ResourceType,
    resourceId: string,
    metadata?: Record<string, any>
  ): Promise<AuditEvent> {
    try {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      // Redact sensitive data before logging
      const redactedMetadata = this.redactSensitiveData(metadata || {});

      const { data, error } = await supabase
        .from('audit_log')
        .insert({
          workspace_id: workspaceId,
          actor_id: actorId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          metadata: redactedMetadata,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapAuditEvent(data);
    } catch (error) {
      throw this.handleError(error, 'Failed to log audit event');
    }
  }

  /**
   * Gets audit events with pagination
   * Requirements: 10.8
   */
  async getEvents(
    workspaceId: string,
    options: AuditQueryOptions = { page: 1, pageSize: 100 }
  ): Promise<PaginatedResult<AuditEvent>> {
    try {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const { page, pageSize, sortBy = 'created_at', sortOrder = 'desc' } = options;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Get total count
      const { count, error: countError } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      if (countError) throw countError;

      // Get paginated events
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) throw error;

      const total = count || 0;
      const items = data.map(this.mapAuditEvent);

      return {
        items,
        total,
        page,
        pageSize,
        hasMore: to < total - 1,
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to get audit events');
    }
  }

  /**
   * Filters events by criteria
   * Requirements: 10.8
   */
  async filterEvents(
    workspaceId: string,
    filters: AuditFilters
  ): Promise<AuditEvent[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      let query = supabase
        .from('audit_log')
        .select('*')
        .eq('workspace_id', workspaceId);

      // Apply date range filter
      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString());
      }

      // Apply actor filter
      if (filters.actor) {
        query = query.eq('actor_id', filters.actor);
      }

      // Apply action filter
      if (filters.actions && filters.actions.length > 0) {
        query = query.in('action', filters.actions);
      }

      // Apply resource type filter
      if (filters.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
      }

      // Order by most recent first
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return data.map(this.mapAuditEvent);
    } catch (error) {
      throw this.handleError(error, 'Failed to filter audit events');
    }
  }

  /**
   * Generates human-readable description of event
   * Requirements: 10.10
   */
  formatEventDescription(event: AuditEvent): string {
    const actionDescriptions: Record<AuditAction, (e: AuditEvent) => string> = {
      policy_created: (e) => `Created policy "${e.metadata.policyName || 'Untitled'}"`,
      policy_updated: (e) => `Updated policy "${e.metadata.policyName || 'Untitled'}" to version ${e.metadata.version || 'unknown'}`,
      policy_deleted: (e) => `Deleted policy "${e.metadata.policyName || 'Untitled'}"`,
      policy_approved: (e) => `Approved policy "${e.metadata.policyName || 'Untitled'}"`,
      policy_rejected: (e) => `Rejected policy "${e.metadata.policyName || 'Untitled'}" - ${e.metadata.reason || 'No reason provided'}`,
      policy_deployed: (e) => `Deployed policy "${e.metadata.policyName || 'Untitled'}" to ${e.metadata.environment || 'production'}`,
      policy_evaluated: (e) => `Evaluated policy "${e.metadata.policyName || 'Untitled'}" - ${e.metadata.decision || 'unknown'} decision`,
      member_added: (e) => `Added ${e.metadata.username || 'user'} as ${e.metadata.role || 'member'}`,
      member_removed: (e) => `Removed ${e.metadata.username || 'user'} from workspace`,
      member_role_changed: (e) => `Changed ${e.metadata.username || 'user'}'s role from ${e.metadata.oldRole || 'unknown'} to ${e.metadata.newRole || 'unknown'}`,
      workspace_settings_changed: (e) => `Updated workspace settings: ${e.metadata.changedFields?.join(', ') || 'multiple fields'}`,
      auth_login: (e) => `Signed in via ${e.metadata.provider || 'GitHub'}`,
      auth_logout: () => 'User signed out',
      emergency_bypass: (e) => `Emergency bypass for policy "${e.metadata.policyName || 'Untitled'}" - ${e.metadata.reason || 'No reason provided'}`,
    };

    const formatter = actionDescriptions[event.action];
    return formatter ? formatter(event) : `Performed action: ${event.action}`;
  }

  /**
   * Exports audit log as CSV with all fields
   * Requirements: 11.1
   */
  async exportCSV(
    workspaceId: string,
    filters?: AuditFilters
  ): Promise<string> {
    try {
      const events = await this.filterEvents(workspaceId, filters || {});
      
      // CSV header
      const headers = [
        'ID',
        'Timestamp',
        'Actor ID',
        'Action',
        'Resource Type',
        'Resource ID',
        'Description',
        'Metadata'
      ];
      
      // CSV rows
      const rows = events.map(event => [
        event.id,
        event.createdAt.toISOString(),
        event.actorId,
        event.action,
        event.resourceType,
        event.resourceId,
        this.formatEventDescription(event),
        JSON.stringify(event.metadata)
      ]);
      
      // Escape CSV values
      const escapeCsvValue = (value: string): string => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };
      
      // Build CSV
      const csvLines = [
        headers.map(escapeCsvValue).join(','),
        ...rows.map(row => row.map(v => escapeCsvValue(String(v))).join(','))
      ];
      
      return csvLines.join('\n');
    } catch (error) {
      throw this.handleError(error, 'Failed to export audit log as CSV');
    }
  }

  /**
   * Exports audit log as JSON with full event details
   * Requirements: 11.2
   */
  async exportJSON(
    workspaceId: string,
    filters?: AuditFilters
  ): Promise<string> {
    try {
      const events = await this.filterEvents(workspaceId, filters || {});
      
      const exportData: AuditExport = {
        metadata: {
          exportedAt: new Date(),
          exportedBy: 'system', // Should be replaced with actual user ID
          filters: filters || {},
          totalEvents: events.length,
        },
        events: events.map(event => ({
          ...event,
          createdAt: event.createdAt,
        })),
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw this.handleError(error, 'Failed to export audit log as JSON');
    }
  }

  /**
   * Exports audit log as PDF with formatted tables
   * Requirements: 11.3
   */
  async exportPDF(
    workspaceId: string,
    filters?: AuditFilters
  ): Promise<Blob> {
    try {
      const events = await this.filterEvents(workspaceId, filters || {});
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;
      
      // Title
      doc.setFontSize(18);
      doc.text('Audit Trail Export', margin, yPosition);
      yPosition += 10;
      
      // Export metadata
      doc.setFontSize(10);
      doc.text(`Exported: ${new Date().toISOString()}`, margin, yPosition);
      yPosition += 6;
      doc.text(`Total Events: ${events.length}`, margin, yPosition);
      yPosition += 10;
      
      // Filter information
      if (filters?.dateRange) {
        doc.text(
          `Date Range: ${filters.dateRange.start.toISOString()} to ${filters.dateRange.end.toISOString()}`,
          margin,
          yPosition
        );
        yPosition += 6;
      }
      
      if (filters?.actions && filters.actions.length > 0) {
        doc.text(`Actions: ${filters.actions.join(', ')}`, margin, yPosition);
        yPosition += 6;
      }
      
      yPosition += 5;
      
      // Events table
      doc.setFontSize(8);
      const columnWidths = {
        timestamp: 35,
        action: 35,
        resource: 30,
        description: pageWidth - margin * 2 - 100,
      };
      
      // Table header
      doc.setFont('helvetica', 'bold');
      let xPosition = margin;
      doc.text('Timestamp', xPosition, yPosition);
      xPosition += columnWidths.timestamp;
      doc.text('Action', xPosition, yPosition);
      xPosition += columnWidths.action;
      doc.text('Resource', xPosition, yPosition);
      xPosition += columnWidths.resource;
      doc.text('Description', xPosition, yPosition);
      yPosition += 6;
      
      // Table rows
      doc.setFont('helvetica', 'normal');
      for (const event of events) {
        // Check if we need a new page
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        
        xPosition = margin;
        
        // Timestamp
        const timestamp = event.createdAt.toISOString().substring(0, 19).replace('T', ' ');
        doc.text(timestamp, xPosition, yPosition);
        xPosition += columnWidths.timestamp;
        
        // Action
        doc.text(event.action, xPosition, yPosition);
        xPosition += columnWidths.action;
        
        // Resource
        doc.text(event.resourceType, xPosition, yPosition);
        xPosition += columnWidths.resource;
        
        // Description (truncate if too long)
        const description = this.formatEventDescription(event);
        const truncatedDesc = description.length > 50 
          ? description.substring(0, 47) + '...' 
          : description;
        doc.text(truncatedDesc, xPosition, yPosition);
        
        yPosition += 5;
      }
      
      // Footer with signature notice
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
      
      return doc.output('blob');
    } catch (error) {
      throw this.handleError(error, 'Failed to export audit log as PDF');
    }
  }

  /**
   * Generates SHA-256 signature for tamper detection
   * Requirements: 11.4, 11.6
   */
  async signExport(data: string): Promise<string> {
    try {
      const hash = CryptoJS.SHA256(data);
      return hash.toString(CryptoJS.enc.Hex);
    } catch (error) {
      throw this.handleError(error, 'Failed to sign export');
    }
  }

  /**
   * Verifies export signature
   * Requirements: 11.5
   */
  async verifySignature(data: string, signature: string): Promise<boolean> {
    try {
      const computedSignature = await this.signExport(data);
      return computedSignature === signature;
    } catch (error) {
      throw this.handleError(error, 'Failed to verify signature');
    }
  }

  /**
   * Redacts sensitive data from metadata
   * Requirements: 10.9
   */
  redactSensitiveData(metadata: Record<string, any>): Record<string, any> {
    const redacted = { ...metadata };
    const sensitiveKeys = [
      'apikey',
      'api_key',
      'password',
      'secret',
      'token',
      'accesstoken',
      'access_token',
      'refreshtoken',
      'refresh_token',
      'privatekey',
      'private_key',
      'ssn',
      'creditcard',
      'credit_card',
    ];

    // Redact sensitive keys first (before pattern matching)
    for (const key of Object.keys(redacted)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        redacted[key] = '[REDACTED]';
      }
    }

    // Redact email addresses (PII) - only for non-redacted fields with non-whitespace content
    for (const key of Object.keys(redacted)) {
      if (typeof redacted[key] === 'string' && redacted[key] !== '[REDACTED]' && redacted[key].trim().length > 0) {
        // More permissive email regex to catch edge cases
        redacted[key] = redacted[key].replace(
          /[^\s@]+@[^\s@]+\.[^\s@]+/g,
          '[EMAIL_REDACTED]'
        );
      }
    }

    // Redact phone numbers (PII) - only for non-redacted fields with non-whitespace content
    for (const key of Object.keys(redacted)) {
      if (typeof redacted[key] === 'string' && redacted[key] !== '[REDACTED]' && redacted[key].trim().length > 0) {
        redacted[key] = redacted[key].replace(
          /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
          '[PHONE_REDACTED]'
        );
      }
    }

    return redacted;
  }

  /**
   * Maps database audit event to domain model
   */
  private mapAuditEvent(data: any): AuditEvent {
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      actorId: data.actor_id,
      action: data.action as AuditAction,
      resourceType: data.resource_type as ResourceType,
      resourceId: data.resource_id,
      metadata: data.metadata || {},
      createdAt: new Date(data.created_at),
    };
  }

  /**
   * Handles errors and wraps them in AuditError
   */
  private handleError(error: any, defaultMessage: string): AuditError {
    console.error('AuditTrailService error:', error);
    return {
      message: error?.message || defaultMessage,
      code: error?.code,
    };
  }
}

// Export singleton instance
export const auditTrailService = new AuditTrailService();
