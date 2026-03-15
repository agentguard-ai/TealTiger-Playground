// Compliance framework types
// Requirements: 8.1-8.10

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  requirements: ComplianceRequirement[];
}

export interface ComplianceRequirement {
  id: string;
  frameworkId: string;
  code: string; // e.g., "ASI01", "NIST-AI-RMF-1.0-GOVERN-1.1"
  title: string;
  description: string;
  category: string;
}

export interface ComplianceMapping {
  id: string;
  policyId: string;
  frameworkId: string;
  requirementId: string;
  notes: string;
  createdAt: Date;
  createdBy?: string;
  workspaceId?: string;
}

export interface ComplianceCoverage {
  frameworkId: string;
  totalRequirements: number;
  mappedRequirements: number;
  coveragePercentage: number;
  unmappedRequirements: ComplianceRequirement[];
}

export interface CreateMappingInput {
  policyId: string;
  frameworkId: string;
  requirementId: string;
  notes: string;
  workspaceId: string;
  userId: string;
}

export interface ExportMappingsInput {
  workspaceId: string;
  frameworkId?: string;
  format: 'csv' | 'json';
}
