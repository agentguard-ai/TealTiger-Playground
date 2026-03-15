// Policy sharing and discovery types
// Requirements: 21.1-21.10

export type PolicyVisibility = 'private' | 'public';

export interface SharedPolicy {
  id: string;
  policyId: string;
  workspaceId: string;
  name: string;
  description: string;
  author: string;
  authorAvatar?: string;
  visibility: PolicyVisibility;
  stars: number;
  forks: number;
  views: number;
  testCoverage: number;
  approvalStatus: 'draft' | 'approved' | 'production';
  tags: string[];
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyReport {
  id: string;
  policyId: string;
  reporterId: string;
  reason: 'inappropriate' | 'malicious' | 'copyright' | 'spam' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: Date;
}

export interface PolicySearchFilters {
  query?: string;
  tags?: string[];
  category?: string;
  sortBy?: 'stars' | 'forks' | 'recent' | 'views';
  limit?: number;
  offset?: number;
}
