// ComplianceReportService - Compliance report generation
// Requirements: 9.1-9.10

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  ComplianceReport,
  ReportFilters,
  ReportSummary,
  PolicyReportEntry,
  AuditSummary,
  AuditEvent,
  BrandingConfig,
  GenerateReportInput,
  ScheduleReportInput
} from '../types/compliance-report';
import type { Policy, PolicyVersion } from '../types/policy';
import type { ComplianceMapping } from '../types/compliance';
import { complianceService } from './ComplianceService';
import { getFrameworkById } from '../data/compliance-frameworks';

export class ComplianceReportService {
  /**
   * Generates a compliance report
   * Requirements: 9.1-9.6
   */
  async generateReport(input: GenerateReportInput): Promise<ComplianceReport> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { workspaceId, frameworkId, filters, userId } = input;

    // Validate framework exists
    const framework = getFrameworkById(frameworkId);
    if (!framework) {
      throw new Error(`Framework not found: ${frameworkId}`);
    }

    // Get all policies in workspace
    let policiesQuery = supabase!
      .from('policies')
      .select('*')
      .eq('workspace_id', workspaceId);

    // Apply filters
    if (filters?.policyState) {
      policiesQuery = policiesQuery.eq('state', filters.policyState);
    }

    if (filters?.dateRange) {
      policiesQuery = policiesQuery
        .gte('updated_at', filters.dateRange.start.toISOString())
        .lte('updated_at', filters.dateRange.end.toISOString());
    }

    const { data: policies, error: policiesError } = await policiesQuery.order('name');

    if (policiesError) {
      throw new Error(`Failed to get policies: ${policiesError.message}`);
    }

    // Build policy report entries
    const policyEntries: PolicyReportEntry[] = [];
    let totalTestCoverage = 0;
    let totalSuccessRate = 0;
    const mappedPolicyIds = new Set<string>();

    for (const policy of policies) {
      // Get current version
      const { data: version, error: versionError } = await supabase!
        .from('policy_versions')
        .select('*')
        .eq('policy_id', policy.id)
        .eq('version', policy.current_version)
        .single();

      if (versionError || !version) {
        continue; // Skip policies without versions
      }

      // Get mappings for this policy
      const mappings = await complianceService.getPolicyMappings(policy.id);
      
      // Filter mappings by framework if specified
      const frameworkMappings = filters?.framework
        ? mappings.filter(m => m.frameworkId === frameworkId)
        : mappings;

      if (frameworkMappings.length > 0) {
        mappedPolicyIds.add(policy.id);
      }

      // Get test coverage from metadata
      const testCoverage = version.metadata?.testCoverage || 0;
      totalTestCoverage += testCoverage;

      // Calculate success rate from analytics (mock for now)
      const successRate = await this.calculateSuccessRate(policy.id);
      totalSuccessRate += successRate;

      // Get approval status
      const approvalStatus = await this.getApprovalStatus(policy.id);

      policyEntries.push({
        policy: this.mapPolicy(policy),
        version: this.mapPolicyVersion(version),
        mappings: frameworkMappings,
        testCoverage,
        successRate,
        approvalStatus,
        lastModified: new Date(policy.updated_at)
      });
    }

    // Calculate summary
    const summary: ReportSummary = {
      totalPolicies: policies.length,
      mappedPolicies: mappedPolicyIds.size,
      coveragePercentage: policies.length > 0 
        ? Math.round((mappedPolicyIds.size / policies.length) * 100)
        : 0,
      averageTestCoverage: policies.length > 0
        ? Math.round(totalTestCoverage / policies.length)
        : 0,
      averageSuccessRate: policies.length > 0
        ? Math.round(totalSuccessRate / policies.length)
        : 0
    };

    // Get audit summary
    const auditSummary = await this.getAuditSummary(workspaceId, filters?.dateRange);

    // Create report
    const report: ComplianceReport = {
      id: crypto.randomUUID(),
      workspaceId,
      frameworkId,
      generatedAt: new Date(),
      generatedBy: userId,
      filters: filters || {},
      summary,
      policies: policyEntries,
      auditSummary
    };

    // Log audit event
    await this.logAuditEvent(
      workspaceId,
      userId,
      'compliance_report_generated',
      'compliance_report',
      report.id,
      {
        framework_id: frameworkId,
        total_policies: summary.totalPolicies,
        coverage_percentage: summary.coveragePercentage
      }
    );

    return report;
  }

  /**
   * Exports report as PDF with organization branding
   * Requirements: 9.7
   */
  async exportPDF(report: ComplianceReport, branding?: BrandingConfig): Promise<Blob> {
    // Generate HTML content
    const html = this.generateReportHTML(report, branding);

    // For now, return HTML as blob (PDF generation would require a library like jsPDF or puppeteer)
    // In production, this would use a PDF generation service
    const blob = new Blob([html], { type: 'text/html' });
    
    console.warn('PDF export not fully implemented. Returning HTML blob. Use a PDF library like jsPDF or puppeteer for production.');
    
    return blob;
  }

  /**
   * Exports report as CSV for data analysis
   * Requirements: 9.8
   */
  async exportCSV(report: ComplianceReport): Promise<string> {
    const rows: string[] = [];

    // CSV header
    const headers = [
      'Policy Name',
      'Version',
      'State',
      'Test Coverage (%)',
      'Success Rate (%)',
      'Approval Status',
      'Mapped Requirements',
      'Last Modified',
      'Created By'
    ];
    rows.push(headers.join(','));

    // CSV data rows
    for (const entry of report.policies) {
      const row = [
        this.escapeCSV(entry.policy.name),
        entry.version.version,
        entry.policy.state,
        entry.testCoverage.toString(),
        entry.successRate.toString(),
        this.escapeCSV(entry.approvalStatus),
        entry.mappings.length.toString(),
        entry.lastModified.toISOString(),
        entry.policy.createdBy
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Schedules automated report generation
   * Requirements: 9.10
   */
  async scheduleReport(input: ScheduleReportInput): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { workspaceId, frameworkId, schedule, recipients, userId } = input;

    // Store scheduled report configuration
    // Note: Actual scheduling would require a cron job or scheduled function
    const { error } = await supabase!
      .from('scheduled_reports')
      .insert({
        workspace_id: workspaceId,
        framework_id: frameworkId,
        schedule,
        recipients,
        created_by: userId,
        enabled: true
      });

    if (error) {
      throw new Error(`Failed to schedule report: ${error.message}`);
    }

    // Log audit event
    await this.logAuditEvent(
      workspaceId,
      userId,
      'compliance_report_scheduled',
      'scheduled_report',
      crypto.randomUUID(),
      {
        framework_id: frameworkId,
        schedule,
        recipients_count: recipients.length
      }
    );

    console.warn('Report scheduled. Implement cron job or scheduled function for automated generation.');
  }

  // Helper methods

  private async calculateSuccessRate(policyId: string): Promise<number> {
    if (!isSupabaseConfigured()) {
      return 100; // Default success rate
    }

    // Get analytics events for this policy
    const { data: events, error } = await supabase!
      .from('analytics_events')
      .select('metadata')
      .eq('metadata->>policy_id', policyId)
      .eq('event_type', 'policy_evaluation');

    if (error || !events || events.length === 0) {
      return 100; // Default if no data
    }

    // Calculate success rate
    const successful = events.filter(e => e.metadata?.success === true).length;
    return Math.round((successful / events.length) * 100);
  }

  private async getApprovalStatus(policyId: string): Promise<string> {
    if (!isSupabaseConfigured()) {
      return 'Unknown';
    }

    // Get latest approval for this policy
    const { data: approval, error } = await supabase!
      .from('policy_approvals')
      .select('status')
      .eq('policy_id', policyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !approval) {
      return 'No approvals';
    }

    return approval.status;
  }

  private async getAuditSummary(
    workspaceId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<AuditSummary> {
    if (!isSupabaseConfigured()) {
      return {
        totalChanges: 0,
        totalApprovals: 0,
        totalDeployments: 0,
        recentEvents: []
      };
    }

    // Build query
    let query = supabase!
      .from('audit_log')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
    }

    const { data: events, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get audit events: ${error.message}`);
    }

    // Count event types
    const totalChanges = events.filter(e => 
      e.action.includes('policy_updated') || 
      e.action.includes('policy_created')
    ).length;

    const totalApprovals = events.filter(e => 
      e.action.includes('policy_approved')
    ).length;

    const totalDeployments = events.filter(e => 
      e.action.includes('policy_deployed') ||
      e.action === 'policy_state_changed'
    ).length;

    // Get recent events (last 10)
    const recentEvents = events.slice(0, 10).map(e => this.mapAuditEvent(e));

    return {
      totalChanges,
      totalApprovals,
      totalDeployments,
      recentEvents
    };
  }

  private generateReportHTML(report: ComplianceReport, branding?: BrandingConfig): string {
    const framework = getFrameworkById(report.frameworkId);
    const frameworkName = framework?.name || report.frameworkId;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Compliance Report - ${frameworkName}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    .header {
      border-bottom: 3px solid ${branding?.primaryColor || '#0066cc'};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: ${branding?.primaryColor || '#0066cc'};
      margin: 0;
    }
    .summary {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-value {
      font-size: 32px;
      font-weight: bold;
      color: ${branding?.primaryColor || '#0066cc'};
    }
    .summary-label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: ${branding?.primaryColor || '#0066cc'};
      color: white;
      font-weight: bold;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${branding?.organizationName || 'Organization'} - Compliance Report</h1>
    <p>Framework: ${frameworkName}</p>
    <p>Generated: ${report.generatedAt.toLocaleString()}</p>
  </div>

  <div class="summary">
    <h2>Executive Summary</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-value">${report.summary.totalPolicies}</div>
        <div class="summary-label">Total Policies</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${report.summary.coveragePercentage}%</div>
        <div class="summary-label">Coverage</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${report.summary.averageTestCoverage}%</div>
        <div class="summary-label">Avg Test Coverage</div>
      </div>
    </div>
  </div>

  <h2>Policy Details</h2>
  <table>
    <thead>
      <tr>
        <th>Policy Name</th>
        <th>Version</th>
        <th>State</th>
        <th>Test Coverage</th>
        <th>Success Rate</th>
        <th>Mappings</th>
      </tr>
    </thead>
    <tbody>
      ${report.policies.map(entry => `
        <tr>
          <td>${this.escapeHTML(entry.policy.name)}</td>
          <td>${entry.version.version}</td>
          <td>${entry.policy.state}</td>
          <td>${entry.testCoverage}%</td>
          <td>${entry.successRate}%</td>
          <td>${entry.mappings.length}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Audit Summary</h2>
  <p>Total Changes: ${report.auditSummary.totalChanges}</p>
  <p>Total Approvals: ${report.auditSummary.totalApprovals}</p>
  <p>Total Deployments: ${report.auditSummary.totalDeployments}</p>

  <div class="footer">
    ${branding?.footer || 'Generated by TealTiger Compliance System'}
  </div>
</body>
</html>
    `.trim();
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private escapeHTML(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private mapPolicy(data: any): Policy {
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      name: data.name,
      description: data.description,
      currentVersion: data.current_version,
      state: data.state,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapPolicyVersion(data: any): PolicyVersion {
    return {
      id: data.id,
      policyId: data.policy_id,
      version: data.version,
      code: data.code,
      metadata: data.metadata,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at)
    };
  }

  private mapAuditEvent(data: any): AuditEvent {
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      actorId: data.actor_id,
      action: data.action,
      resourceType: data.resource_type,
      resourceId: data.resource_id,
      metadata: data.metadata,
      createdAt: new Date(data.created_at)
    };
  }

  private async logAuditEvent(
    workspaceId: string,
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: any
  ): Promise<void> {
    if (!isSupabaseConfigured()) return;

    await supabase!.from('audit_log').insert({
      workspace_id: workspaceId,
      actor_id: actorId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata
    });
  }
}

// Export singleton instance
export const complianceReportService = new ComplianceReportService();
