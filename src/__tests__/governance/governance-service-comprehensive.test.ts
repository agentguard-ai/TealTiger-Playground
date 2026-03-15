// Comprehensive GovernanceService unit tests
// Task 7.1.5: Test approval process, state transitions, emergency bypass, auto-approval rules
// Requirements: 7.1-7.10

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GovernanceService } from '@/services/GovernanceService';
import { PolicyState } from '@/types/policy';
import type { Policy, PolicyVersion } from '@/types/policy';

// --- Mock policyRegistryService ---

const mockGetPolicy = vi.fn();
const mockGetVersion = vi.fn();

vi.mock('@/services/PolicyRegistryService', () => ({
  policyRegistryService: {
    getPolicy: (...args: any[]) => mockGetPolicy(...args),
    getVersion: (...args: any[]) => mockGetVersion(...args),
  },
}));

// --- Mock supabase ---

const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
  isSupabaseConfigured: vi.fn(() => true),
}));

// --- Helpers ---

function chain(overrides: Record<string, any> = {}) {
  const self: any = {};
  const methods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'in', 'gte', 'lte', 'or',
    'order', 'single',
  ];
  for (const m of methods) {
    self[m] = vi.fn(() => self);
  }
  Object.assign(self, overrides);
  return self;
}

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: 'policy-1',
    workspaceId: 'ws-1',
    name: 'Test Policy',
    description: 'A test policy',
    currentVersion: '1.0.0',
    state: PolicyState.Draft,
    createdBy: 'user-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeVersion(overrides: Partial<PolicyVersion> = {}): PolicyVersion {
  return {
    id: 'version-1',
    policyId: 'policy-1',
    version: '1.0.0',
    code: 'const policy = { rule: "allow" };',
    metadata: { tags: [], category: 'security', providers: [], models: [], estimatedCost: 0, testCoverage: 0 },
    createdBy: 'user-1',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeApprovalRow(overrides: Record<string, any> = {}) {
  return {
    id: 'approval-1',
    policy_id: 'policy-1',
    version_id: 'version-1',
    approver_id: 'approver-1',
    status: 'pending',
    comment: '',
    created_at: new Date().toISOString(),
    decided_at: null,
    ...overrides,
  };
}

function makeWorkspaceRow(settingsOverrides: Record<string, any> = {}) {
  return {
    settings: {
      requiredApprovers: 1,
      approverUserIds: ['approver-1'],
      allowEmergencyBypass: true,
      autoApprovalRules: [],
      ...settingsOverrides,
    },
  };
}

describe('GovernanceService (comprehensive)', () => {
  let service: GovernanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService();
  });

  // ─── promotePolicy ──────────────────────────────────────────────

  describe('promotePolicy', () => {
    it('should promote Draft → Review without approval', async () => {
      const policy = makePolicy({ state: PolicyState.Draft });
      mockGetPolicy.mockResolvedValue(policy);

      // supabase.from('policies').update(...).eq(...).select().single()
      mockFrom.mockImplementation((table: string) => {
        if (table === 'policies') {
          return chain({
            update: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                select: vi.fn(() => chain({
                  single: vi.fn().mockResolvedValue({
                    data: { ...policy, state: 'review' },
                    error: null,
                  }),
                })),
              })),
            })),
          });
        }
        // audit_log insert
        return chain({ insert: vi.fn().mockResolvedValue({ error: null }) });
      });

      const result = await service.promotePolicy({
        policyId: 'policy-1',
        targetState: PolicyState.Review,
        userId: 'user-1',
      });

      expect(result.state).toBe(PolicyState.Review);
      expect(mockGetPolicy).toHaveBeenCalledWith('policy-1');
    });

    it('should promote Review → Approved when approvals are met', async () => {
      const policy = makePolicy({ state: PolicyState.Review });
      mockGetPolicy.mockResolvedValue(policy);

      const approvedRow = makeApprovalRow({ status: 'approved' });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: makeWorkspaceRow({ requiredApprovers: 1 }),
                  error: null,
                }),
              })),
            })),
          });
        }
        if (table === 'policy_approvals') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                order: vi.fn().mockResolvedValue({ data: [approvedRow], error: null }),
              })),
            })),
          });
        }
        if (table === 'policies') {
          return chain({
            update: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                select: vi.fn(() => chain({
                  single: vi.fn().mockResolvedValue({
                    data: { ...policy, state: 'approved' },
                    error: null,
                  }),
                })),
              })),
            })),
          });
        }
        // audit_log
        return chain({ insert: vi.fn().mockResolvedValue({ error: null }) });
      });

      const result = await service.promotePolicy({
        policyId: 'policy-1',
        targetState: PolicyState.Approved,
        userId: 'user-1',
      });

      expect(result.state).toBe(PolicyState.Approved);
    });

    it('should promote Approved → Production', async () => {
      const policy = makePolicy({ state: PolicyState.Approved });
      mockGetPolicy.mockResolvedValue(policy);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'policies') {
          return chain({
            update: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                select: vi.fn(() => chain({
                  single: vi.fn().mockResolvedValue({
                    data: { ...policy, state: 'production' },
                    error: null,
                  }),
                })),
              })),
            })),
          });
        }
        return chain({ insert: vi.fn().mockResolvedValue({ error: null }) });
      });

      const result = await service.promotePolicy({
        policyId: 'policy-1',
        targetState: PolicyState.Production,
        userId: 'user-1',
      });

      expect(result.state).toBe(PolicyState.Production);
    });

    it('should reject invalid transition Draft → Production', async () => {
      const policy = makePolicy({ state: PolicyState.Draft });
      mockGetPolicy.mockResolvedValue(policy);

      await expect(
        service.promotePolicy({
          policyId: 'policy-1',
          targetState: PolicyState.Production,
          userId: 'user-1',
        })
      ).rejects.toThrow('Invalid state transition from draft to production');
    });

    it('should reject invalid transition Draft → Approved', async () => {
      const policy = makePolicy({ state: PolicyState.Draft });
      mockGetPolicy.mockResolvedValue(policy);

      await expect(
        service.promotePolicy({
          policyId: 'policy-1',
          targetState: PolicyState.Approved,
          userId: 'user-1',
        })
      ).rejects.toThrow('Invalid state transition');
    });

    it('should reject Review → Approved when approvals are insufficient', async () => {
      const policy = makePolicy({ state: PolicyState.Review });
      mockGetPolicy.mockResolvedValue(policy);

      const pendingRow = makeApprovalRow({ status: 'pending' });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: makeWorkspaceRow({ requiredApprovers: 2 }),
                  error: null,
                }),
              })),
            })),
          });
        }
        if (table === 'policy_approvals') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                order: vi.fn().mockResolvedValue({ data: [pendingRow], error: null }),
              })),
            })),
          });
        }
        return chain();
      });

      await expect(
        service.promotePolicy({
          policyId: 'policy-1',
          targetState: PolicyState.Approved,
          userId: 'user-1',
        })
      ).rejects.toThrow('Cannot promote policy');
    });

    it('should throw when supabase update fails', async () => {
      const policy = makePolicy({ state: PolicyState.Draft });
      mockGetPolicy.mockResolvedValue(policy);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'policies') {
          return chain({
            update: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                select: vi.fn(() => chain({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'DB write error' },
                  }),
                })),
              })),
            })),
          });
        }
        return chain();
      });

      await expect(
        service.promotePolicy({
          policyId: 'policy-1',
          targetState: PolicyState.Review,
          userId: 'user-1',
        })
      ).rejects.toThrow('Failed to promote policy: DB write error');
    });
  });

  // ─── requestApproval ────────────────────────────────────────────

  describe('requestApproval', () => {
    it('should create approval records for each approver', async () => {
      const policy = makePolicy();
      mockGetPolicy.mockResolvedValue(policy);

      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'policy_approvals') {
          return chain({ insert: mockInsert });
        }
        if (table === 'users') {
          return chain({
            select: vi.fn(() => chain({
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: 'approver-1', username: 'alice', email: 'alice@test.com' },
                  { id: 'approver-2', username: 'bob', email: 'bob@test.com' },
                ],
                error: null,
              }),
            })),
          });
        }
        // audit_log
        return chain({ insert: vi.fn().mockResolvedValue({ error: null }) });
      });

      await service.requestApproval({
        policyId: 'policy-1',
        versionId: 'version-1',
        approverIds: ['approver-1', 'approver-2'],
        userId: 'user-1',
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ approver_id: 'approver-1', status: 'pending' }),
          expect.objectContaining({ approver_id: 'approver-2', status: 'pending' }),
        ])
      );
    });

    it('should throw when insert fails', async () => {
      const policy = makePolicy();
      mockGetPolicy.mockResolvedValue(policy);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'policy_approvals') {
          return chain({
            insert: vi.fn().mockResolvedValue({ error: { message: 'Insert error' } }),
          });
        }
        return chain();
      });

      await expect(
        service.requestApproval({
          policyId: 'policy-1',
          versionId: 'version-1',
          approverIds: ['approver-1'],
          userId: 'user-1',
        })
      ).rejects.toThrow('Failed to request approvals: Insert error');
    });
  });

  // ─── approvePolicy ─────────────────────────────────────────────

  describe('approvePolicy', () => {
    it('should record approval and return mapped result', async () => {
      const policy = makePolicy();
      mockGetPolicy.mockResolvedValue(policy);

      const pendingRow = makeApprovalRow({ id: 'appr-1', status: 'pending' });
      const approvedRow = makeApprovalRow({
        id: 'appr-1',
        status: 'approved',
        comment: 'LGTM',
        decided_at: new Date().toISOString(),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'policy_approvals') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                eq: vi.fn(() => chain({
                  eq: vi.fn(() => chain({
                    eq: vi.fn(() => chain({
                      single: vi.fn().mockResolvedValue({ data: pendingRow, error: null }),
                    })),
                  })),
                })),
              })),
            })),
            update: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                select: vi.fn(() => chain({
                  single: vi.fn().mockResolvedValue({ data: approvedRow, error: null }),
                })),
              })),
            })),
          });
        }
        // audit_log
        return chain({ insert: vi.fn().mockResolvedValue({ error: null }) });
      });

      const result = await service.approvePolicy({
        policyId: 'policy-1',
        versionId: 'version-1',
        approverId: 'approver-1',
        comment: 'LGTM',
      });

      expect(result.status).toBe('approved');
      expect(result.comment).toBe('LGTM');
      expect(result.policyId).toBe('policy-1');
      expect(result.approverId).toBe('approver-1');
    });

    it('should throw when no pending approval exists', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'policy_approvals') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                eq: vi.fn(() => chain({
                  eq: vi.fn(() => chain({
                    eq: vi.fn(() => chain({
                      single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Not found' },
                      }),
                    })),
                  })),
                })),
              })),
            })),
          });
        }
        return chain();
      });

      await expect(
        service.approvePolicy({
          policyId: 'policy-1',
          versionId: 'version-1',
          approverId: 'approver-1',
          comment: 'ok',
        })
      ).rejects.toThrow('No pending approval found for this approver');
    });

    it('should throw when update fails', async () => {
      const policy = makePolicy();
      mockGetPolicy.mockResolvedValue(policy);

      const pendingRow = makeApprovalRow({ status: 'pending' });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'policy_approvals') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                eq: vi.fn(() => chain({
                  eq: vi.fn(() => chain({
                    eq: vi.fn(() => chain({
                      single: vi.fn().mockResolvedValue({ data: pendingRow, error: null }),
                    })),
                  })),
                })),
              })),
            })),
            update: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                select: vi.fn(() => chain({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Update failed' },
                  }),
                })),
              })),
            })),
          });
        }
        return chain();
      });

      await expect(
        service.approvePolicy({
          policyId: 'policy-1',
          versionId: 'version-1',
          approverId: 'approver-1',
          comment: 'ok',
        })
      ).rejects.toThrow('Failed to approve policy: Update failed');
    });
  });

  // ─── rejectPolicy ──────────────────────────────────────────────

  describe('rejectPolicy', () => {
    it('should record rejection with reason', async () => {
      const policy = makePolicy();
      mockGetPolicy.mockResolvedValue(policy);

      const pendingRow = makeApprovalRow({ id: 'appr-1', status: 'pending' });
      const rejectedRow = makeApprovalRow({
        id: 'appr-1',
        status: 'rejected',
        comment: 'Needs more tests',
        decided_at: new Date().toISOString(),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'policy_approvals') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                eq: vi.fn(() => chain({
                  eq: vi.fn(() => chain({
                    eq: vi.fn(() => chain({
                      single: vi.fn().mockResolvedValue({ data: pendingRow, error: null }),
                    })),
                  })),
                })),
              })),
            })),
            update: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                select: vi.fn(() => chain({
                  single: vi.fn().mockResolvedValue({ data: rejectedRow, error: null }),
                })),
              })),
            })),
          });
        }
        // audit_log
        return chain({ insert: vi.fn().mockResolvedValue({ error: null }) });
      });

      const result = await service.rejectPolicy({
        policyId: 'policy-1',
        versionId: 'version-1',
        approverId: 'approver-1',
        reason: 'Needs more tests',
      });

      expect(result.status).toBe('rejected');
      expect(result.comment).toBe('Needs more tests');
      expect(result.policyId).toBe('policy-1');
    });

    it('should throw when no pending approval exists for rejection', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'policy_approvals') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                eq: vi.fn(() => chain({
                  eq: vi.fn(() => chain({
                    eq: vi.fn(() => chain({
                      single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Not found' },
                      }),
                    })),
                  })),
                })),
              })),
            })),
          });
        }
        return chain();
      });

      await expect(
        service.rejectPolicy({
          policyId: 'policy-1',
          versionId: 'version-1',
          approverId: 'approver-1',
          reason: 'Bad policy',
        })
      ).rejects.toThrow('No pending approval found for this approver');
    });

    it('should throw when rejection update fails', async () => {
      const policy = makePolicy();
      mockGetPolicy.mockResolvedValue(policy);

      const pendingRow = makeApprovalRow({ status: 'pending' });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'policy_approvals') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                eq: vi.fn(() => chain({
                  eq: vi.fn(() => chain({
                    eq: vi.fn(() => chain({
                      single: vi.fn().mockResolvedValue({ data: pendingRow, error: null }),
                    })),
                  })),
                })),
              })),
            })),
            update: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                select: vi.fn(() => chain({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Reject update failed' },
                  }),
                })),
              })),
            })),
          });
        }
        return chain();
      });

      await expect(
        service.rejectPolicy({
          policyId: 'policy-1',
          versionId: 'version-1',
          approverId: 'approver-1',
          reason: 'Bad',
        })
      ).rejects.toThrow('Failed to reject policy: Reject update failed');
    });
  });

  // ─── getApprovalStatus ─────────────────────────────────────────

  describe('getApprovalStatus', () => {
    it('should return workflow with approvals and required count', async () => {
      const policy = makePolicy({ state: PolicyState.Review });
      mockGetPolicy.mockResolvedValue(policy);

      const approvalRows = [
        makeApprovalRow({ id: 'a1', status: 'approved', approver_id: 'approver-1' }),
        makeApprovalRow({ id: 'a2', status: 'pending', approver_id: 'approver-2' }),
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: makeWorkspaceRow({ requiredApprovers: 2 }),
                  error: null,
                }),
              })),
            })),
          });
        }
        if (table === 'policy_approvals') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                order: vi.fn().mockResolvedValue({ data: approvalRows, error: null }),
              })),
            })),
          });
        }
        return chain();
      });

      const workflow = await service.getApprovalStatus('policy-1');

      expect(workflow.policyId).toBe('policy-1');
      expect(workflow.currentState).toBe(PolicyState.Review);
      expect(workflow.requiredApprovals).toBe(2);
      expect(workflow.approvals).toHaveLength(2);
      expect(workflow.canPromote).toBe(false); // only 1 of 2 approved
    });

    it('should set canPromote true when all approvals met', async () => {
      const policy = makePolicy({ state: PolicyState.Review });
      mockGetPolicy.mockResolvedValue(policy);

      const approvalRows = [
        makeApprovalRow({ id: 'a1', status: 'approved', approver_id: 'approver-1' }),
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: makeWorkspaceRow({ requiredApprovers: 1 }),
                  error: null,
                }),
              })),
            })),
          });
        }
        if (table === 'policy_approvals') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                order: vi.fn().mockResolvedValue({ data: approvalRows, error: null }),
              })),
            })),
          });
        }
        return chain();
      });

      const workflow = await service.getApprovalStatus('policy-1');

      expect(workflow.canPromote).toBe(true);
      expect(workflow.requiredApprovals).toBe(1);
    });

    it('should throw when workspace settings fetch fails', async () => {
      const policy = makePolicy();
      mockGetPolicy.mockResolvedValue(policy);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Workspace not found' },
                }),
              })),
            })),
          });
        }
        return chain();
      });

      await expect(
        service.getApprovalStatus('policy-1')
      ).rejects.toThrow('Failed to get workspace settings: Workspace not found');
    });

    it('should default to 1 required approver when settings are empty', async () => {
      const policy = makePolicy({ state: PolicyState.Review });
      mockGetPolicy.mockResolvedValue(policy);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: { settings: {} },
                  error: null,
                }),
              })),
            })),
          });
        }
        if (table === 'policy_approvals') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          });
        }
        return chain();
      });

      const workflow = await service.getApprovalStatus('policy-1');

      expect(workflow.requiredApprovals).toBe(1);
      expect(workflow.canPromote).toBe(false); // 0 approvals < 1 required
    });
  });

  // ─── validateEditPermission ────────────────────────────────────

  describe('validateEditPermission', () => {
    it('should allow editing Draft policies', async () => {
      mockGetPolicy.mockResolvedValue(makePolicy({ state: PolicyState.Draft }));
      const result = await service.validateEditPermission('policy-1', 'user-1');
      expect(result).toBe(true);
    });

    it('should allow editing Review policies', async () => {
      mockGetPolicy.mockResolvedValue(makePolicy({ state: PolicyState.Review }));
      const result = await service.validateEditPermission('policy-1', 'user-1');
      expect(result).toBe(true);
    });

    it('should block editing Approved policies', async () => {
      mockGetPolicy.mockResolvedValue(makePolicy({ state: PolicyState.Approved }));
      const result = await service.validateEditPermission('policy-1', 'user-1');
      expect(result).toBe(false);
    });

    it('should block editing Production policies', async () => {
      mockGetPolicy.mockResolvedValue(makePolicy({ state: PolicyState.Production }));
      const result = await service.validateEditPermission('policy-1', 'user-1');
      expect(result).toBe(false);
    });
  });

  // ─── notifyApprovers ──────────────────────────────────────────

  describe('notifyApprovers', () => {
    it('should fetch approver details and log audit event', async () => {
      const policy = makePolicy();
      mockGetPolicy.mockResolvedValue(policy);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return chain({
            select: vi.fn(() => chain({
              in: vi.fn().mockResolvedValue({
                data: [{ id: 'approver-1', username: 'alice', email: 'alice@test.com' }],
                error: null,
              }),
            })),
          });
        }
        // audit_log
        return chain({ insert: mockInsert });
      });

      await service.notifyApprovers('policy-1', ['approver-1']);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle user fetch errors gracefully', async () => {
      const policy = makePolicy();
      mockGetPolicy.mockResolvedValue(policy);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return chain({
            select: vi.fn(() => chain({
              in: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'User fetch error' },
              }),
            })),
          });
        }
        return chain();
      });

      // Should not throw
      await service.notifyApprovers('policy-1', ['approver-1']);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ─── emergencyBypass ──────────────────────────────────────────

  describe('emergencyBypass', () => {
    it('should bypass approval and update state when enabled', async () => {
      const policy = makePolicy({ state: PolicyState.Review });
      mockGetPolicy.mockResolvedValue(policy);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: makeWorkspaceRow({ allowEmergencyBypass: true }),
                  error: null,
                }),
              })),
            })),
          });
        }
        if (table === 'policies') {
          return chain({
            update: vi.fn(() => chain({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          });
        }
        // audit_log
        return chain({ insert: vi.fn().mockResolvedValue({ error: null }) });
      });

      await expect(
        service.emergencyBypass({
          policyId: 'policy-1',
          userId: 'user-1',
          reason: 'Critical security fix',
          targetState: PolicyState.Approved,
        })
      ).resolves.toBeUndefined();
    });

    it('should throw when emergency bypass is disabled', async () => {
      const policy = makePolicy({ state: PolicyState.Review });
      mockGetPolicy.mockResolvedValue(policy);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: makeWorkspaceRow({ allowEmergencyBypass: false }),
                  error: null,
                }),
              })),
            })),
          });
        }
        return chain();
      });

      await expect(
        service.emergencyBypass({
          policyId: 'policy-1',
          userId: 'user-1',
          reason: 'Urgent fix',
          targetState: PolicyState.Approved,
        })
      ).rejects.toThrow('Emergency bypass is not enabled for this workspace');
    });

    it('should reject invalid state transition during bypass', async () => {
      const policy = makePolicy({ state: PolicyState.Draft });
      mockGetPolicy.mockResolvedValue(policy);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: makeWorkspaceRow({ allowEmergencyBypass: true }),
                  error: null,
                }),
              })),
            })),
          });
        }
        return chain();
      });

      await expect(
        service.emergencyBypass({
          policyId: 'policy-1',
          userId: 'user-1',
          reason: 'Skip everything',
          targetState: PolicyState.Production,
        })
      ).rejects.toThrow('Invalid state transition from draft to production');
    });

    it('should throw when policy update fails during bypass', async () => {
      const policy = makePolicy({ state: PolicyState.Review });
      mockGetPolicy.mockResolvedValue(policy);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: makeWorkspaceRow({ allowEmergencyBypass: true }),
                  error: null,
                }),
              })),
            })),
          });
        }
        if (table === 'policies') {
          return chain({
            update: vi.fn(() => chain({
              eq: vi.fn().mockResolvedValue({ error: { message: 'Bypass update failed' } }),
            })),
          });
        }
        return chain();
      });

      await expect(
        service.emergencyBypass({
          policyId: 'policy-1',
          userId: 'user-1',
          reason: 'Critical',
          targetState: PolicyState.Approved,
        })
      ).rejects.toThrow('Failed to bypass approval: Bypass update failed');
    });

    it('should throw when workspace settings fetch fails', async () => {
      const policy = makePolicy({ state: PolicyState.Review });
      mockGetPolicy.mockResolvedValue(policy);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'WS not found' },
                }),
              })),
            })),
          });
        }
        return chain();
      });

      await expect(
        service.emergencyBypass({
          policyId: 'policy-1',
          userId: 'user-1',
          reason: 'Urgent',
          targetState: PolicyState.Approved,
        })
      ).rejects.toThrow('Failed to get workspace settings: WS not found');
    });
  });

  // ─── checkAutoApproval ────────────────────────────────────────

  describe('checkAutoApproval', () => {
    it('should return true for small changes (lines_changed_lt)', async () => {
      const policy = makePolicy();
      mockGetPolicy.mockResolvedValue(policy);

      const oldVersion = makeVersion({ id: 'v1', code: 'line1\nline2\nline3' });
      const newVersion = makeVersion({ id: 'v2', code: 'line1\nline2-changed\nline3' });
      mockGetVersion.mockImplementation((id: string) =>
        id === 'v1' ? Promise.resolve(oldVersion) : Promise.resolve(newVersion)
      );

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: makeWorkspaceRow({
                    autoApprovalRules: [
                      { name: 'Small changes', condition: 'lines_changed_lt', threshold: 5, enabled: true },
                    ],
                  }),
                  error: null,
                }),
              })),
            })),
          });
        }
        return chain();
      });

      const result = await service.checkAutoApproval('policy-1', 'v1', 'v2');
      expect(result).toBe(true);
    });

    it('should return false when changes exceed threshold', async () => {
      const policy = makePolicy();
      mockGetPolicy.mockResolvedValue(policy);

      const oldVersion = makeVersion({ id: 'v1', code: 'a\nb\nc\nd\ne\nf' });
      const newVersion = makeVersion({ id: 'v2', code: 'x\ny\nz\nw\nv\nu' });
      mockGetVersion.mockImplementation((id: string) =>
        id === 'v1' ? Promise.resolve(oldVersion) : Promise.resolve(newVersion)
      );

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: makeWorkspaceRow({
                    autoApprovalRules: [
                      { name: 'Small changes', condition: 'lines_changed_lt', threshold: 3, enabled: true },
                    ],
                  }),
                  error: null,
                }),
              })),
            })),
          });
        }
        return chain();
      });

      const result = await service.checkAutoApproval('policy-1', 'v1', 'v2');
      expect(result).toBe(false);
    });

    it('should return true for metadata-only changes', async () => {
      const policy = makePolicy();
      mockGetPolicy.mockResolvedValue(policy);

      const sameCode = 'const x = 1;';
      const oldVersion = makeVersion({ id: 'v1', code: sameCode });
      const newVersion = makeVersion({ id: 'v2', code: sameCode });
      mockGetVersion.mockImplementation((id: string) =>
        id === 'v1' ? Promise.resolve(oldVersion) : Promise.resolve(newVersion)
      );

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: makeWorkspaceRow({
                    autoApprovalRules: [
                      { name: 'Metadata only', condition: 'metadata_only', threshold: 0, enabled: true },
                    ],
                  }),
                  error: null,
                }),
              })),
            })),
          });
        }
        return chain();
      });

      const result = await service.checkAutoApproval('policy-1', 'v1', 'v2');
      expect(result).toBe(true);
    });

    it('should return true for comment-only changes', async () => {
      const policy = makePolicy();
      mockGetPolicy.mockResolvedValue(policy);

      const oldVersion = makeVersion({ id: 'v1', code: 'const x = 1;' });
      const newVersion = makeVersion({ id: 'v2', code: '// Added comment\nconst x = 1;' });
      mockGetVersion.mockImplementation((id: string) =>
        id === 'v1' ? Promise.resolve(oldVersion) : Promise.resolve(newVersion)
      );

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: makeWorkspaceRow({
                    autoApprovalRules: [
                      { name: 'Comment only', condition: 'comment_only', threshold: 0, enabled: true },
                    ],
                  }),
                  error: null,
                }),
              })),
            })),
          });
        }
        return chain();
      });

      const result = await service.checkAutoApproval('policy-1', 'v1', 'v2');
      expect(result).toBe(true);
    });

    it('should return false when no auto-approval rules are enabled', async () => {
      const policy = makePolicy();
      mockGetPolicy.mockResolvedValue(policy);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: makeWorkspaceRow({ autoApprovalRules: [] }),
                  error: null,
                }),
              })),
            })),
          });
        }
        return chain();
      });

      const result = await service.checkAutoApproval('policy-1', 'v1', 'v2');
      expect(result).toBe(false);
    });

    it('should return false when rules exist but are disabled', async () => {
      const policy = makePolicy();
      mockGetPolicy.mockResolvedValue(policy);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({
                  data: makeWorkspaceRow({
                    autoApprovalRules: [
                      { name: 'Disabled rule', condition: 'metadata_only', threshold: 0, enabled: false },
                    ],
                  }),
                  error: null,
                }),
              })),
            })),
          });
        }
        return chain();
      });

      const result = await service.checkAutoApproval('policy-1', 'v1', 'v2');
      expect(result).toBe(false);
    });
  });
});
