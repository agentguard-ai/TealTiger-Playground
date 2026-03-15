/**
 * Property-Based Tests for Visual Policy Serialization
 * 
 * Property 1: Visual Policy Serialization Round-Trip (Task 7.5)
 * Property 14: Policy Persistence Round-Trip (Task 7.6)
 * 
 * Requirements: 28.1, 28.2, 1.10
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  LocalStorageVisualPolicyStorage,
} from '../VisualPolicyStorageService';
import type {
  VisualPolicy,
  PolicyBlock,
  BlockConnection,
  PolicyMetadata,
} from '../../types/visual-policy';

// ============================================================================
// localStorage Mock
// ============================================================================

class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string): string | null { return this.store[key] || null; }
  setItem(key: string, value: string): void { this.store[key] = value; }
  removeItem(key: string): void { delete this.store[key]; }
  clear(): void { this.store = {}; }
}

const localStorageMock = new LocalStorageMock();
global.localStorage = localStorageMock as any;

// ============================================================================
// Arbitraries
// ============================================================================

const blockDefinitionIds = [
  'guard-pii-detection', 'guard-prompt-injection', 'guard-content-moderation',
  'action-allow', 'action-deny', 'action-log-event',
  'routing-provider-selection', 'cost-budget-limit', 'compliance-audit-logging',
];

const positionArb = fc.record({
  x: fc.integer({ min: 0, max: 2000 }),
  y: fc.integer({ min: 0, max: 2000 }),
});

const simpleParamsArb = fc.oneof(
  fc.constant({}),
  fc.constant({ threshold: 0.8 }),
  fc.constant({ types: ['email', 'phone'] }),
  fc.constant({ enabled: true, level: 'high' }),
  fc.constant({ limit: 100, window: 'hourly' }),
);

function blockArb(index: number): fc.Arbitrary<PolicyBlock> {
  return fc.tuple(
    fc.constantFrom(...blockDefinitionIds),
    positionArb,
    simpleParamsArb,
    fc.boolean(),
  ).map(([defId, pos, params, collapsed]) => ({
    id: `block-${index}-${Math.random().toString(36).slice(2, 8)}`,
    definitionId: defId,
    position: pos,
    parameters: params,
    selected: false,
    collapsed,
    errors: [],
    warnings: [],
  }));
}

function policyArb(): fc.Arbitrary<VisualPolicy> {
  return fc.tuple(
    fc.integer({ min: 1, max: 4 }),
    fc.string({ minLength: 1, maxLength: 30 }),
    fc.string({ minLength: 0, maxLength: 100 }),
    fc.record({
      x: fc.integer({ min: -500, max: 500 }),
      y: fc.integer({ min: -500, max: 500 }),
      zoom: fc.constantFrom(0.5, 0.75, 1, 1.25, 1.5, 2),
    }),
    fc.constantFrom('security', 'cost-control', 'compliance', 'routing'),
    fc.subarray(['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'], { minLength: 0, maxLength: 3 }),
    fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 0, maxLength: 3 }),
  ).chain(([blockCount, name, description, viewport, category, providers, tags]) => {
    const blockArbs = Array.from({ length: blockCount }, (_, i) => blockArb(i));
    return fc.tuple(...blockArbs).map(blocks => {
      const blockIds = blocks.map(b => b.id);
      // Generate simple connections between sequential blocks
      const connections: BlockConnection[] = [];
      for (let i = 0; i < blocks.length - 1; i++) {
        connections.push({
          id: `conn-${i}`,
          sourceBlockId: blockIds[i],
          sourceOutputId: 'output',
          targetBlockId: blockIds[i + 1],
          targetInputId: 'input',
          isValid: true,
        });
      }

      const id = `policy-${Math.random().toString(36).slice(2, 10)}`;
      const workspaceId = `ws-${Math.random().toString(36).slice(2, 8)}`;

      return {
        id,
        workspaceId,
        name,
        description,
        blocks,
        connections,
        viewport,
        metadata: {
          tags,
          category,
          providers,
          models: ['gpt-4'],
          estimatedCost: 0.01,
          testCoverage: 80,
          isVisual: true,
          blockCount: blocks.length,
        } as PolicyMetadata,
        version: '1.0.0',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as VisualPolicy;
    });
  });
}

// ============================================================================
// Property 1: Visual Policy Serialization Round-Trip
// ============================================================================

describe('Property 1: Visual Policy Serialization Round-Trip', () => {
  let storage: LocalStorageVisualPolicyStorage;

  beforeEach(() => {
    localStorageMock.clear();
    storage = new LocalStorageVisualPolicyStorage();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('export then import preserves all block data', async () => {
    await fc.assert(
      fc.asyncProperty(policyArb(), async (policy) => {
        localStorageMock.clear();
        await storage.saveVisualPolicy(policy);

        const exported = await storage.exportPolicy(policy.id);
        const parsed = JSON.parse(exported);

        expect(parsed.version).toBe('1.0.0');
        expect(parsed.policy.blocks.length).toBe(policy.blocks.length);

        for (let i = 0; i < policy.blocks.length; i++) {
          expect(parsed.policy.blocks[i].id).toBe(policy.blocks[i].id);
          expect(parsed.policy.blocks[i].definitionId).toBe(policy.blocks[i].definitionId);
          expect(parsed.policy.blocks[i].position.x).toBe(policy.blocks[i].position.x);
          expect(parsed.policy.blocks[i].position.y).toBe(policy.blocks[i].position.y);
          expect(JSON.stringify(parsed.policy.blocks[i].parameters)).toBe(
            JSON.stringify(policy.blocks[i].parameters)
          );
        }
      }),
      { numRuns: 25 }
    );
  });

  it('export then import preserves connections', async () => {
    await fc.assert(
      fc.asyncProperty(policyArb(), async (policy) => {
        localStorageMock.clear();
        await storage.saveVisualPolicy(policy);

        const exported = await storage.exportPolicy(policy.id);
        const parsed = JSON.parse(exported);

        expect(parsed.policy.connections.length).toBe(policy.connections.length);
        for (let i = 0; i < policy.connections.length; i++) {
          expect(parsed.policy.connections[i].sourceBlockId).toBe(policy.connections[i].sourceBlockId);
          expect(parsed.policy.connections[i].targetBlockId).toBe(policy.connections[i].targetBlockId);
        }
      }),
      { numRuns: 25 }
    );
  });

  it('export then import preserves viewport and metadata', async () => {
    await fc.assert(
      fc.asyncProperty(policyArb(), async (policy) => {
        localStorageMock.clear();
        await storage.saveVisualPolicy(policy);

        const exported = await storage.exportPolicy(policy.id);
        const parsed = JSON.parse(exported);

        expect(parsed.policy.viewport.x).toBe(policy.viewport.x);
        expect(parsed.policy.viewport.y).toBe(policy.viewport.y);
        expect(parsed.policy.viewport.zoom).toBe(policy.viewport.zoom);
        expect(parsed.policy.metadata.category).toBe(policy.metadata.category);
        expect(parsed.policy.metadata.tags).toEqual(policy.metadata.tags);
        expect(parsed.policy.metadata.providers).toEqual(policy.metadata.providers);
        expect(parsed.policy.metadata.isVisual).toBe(true);
      }),
      { numRuns: 25 }
    );
  });

  it('import creates new policy with different ID', async () => {
    await fc.assert(
      fc.asyncProperty(policyArb(), async (policy) => {
        localStorageMock.clear();
        await storage.saveVisualPolicy(policy);

        const exported = await storage.exportPolicy(policy.id);
        const imported = await storage.importPolicy(exported);

        expect(imported.id).not.toBe(policy.id);
        expect(imported.name).toBe(policy.name);
        expect(imported.blocks.length).toBe(policy.blocks.length);
        expect(imported.connections.length).toBe(policy.connections.length);
      }),
      { numRuns: 25 }
    );
  });

  it('double export-import produces equivalent policies', async () => {
    await fc.assert(
      fc.asyncProperty(policyArb(), async (policy) => {
        localStorageMock.clear();
        await storage.saveVisualPolicy(policy);

        const exported1 = await storage.exportPolicy(policy.id);
        const imported1 = await storage.importPolicy(exported1);
        const exported2 = await storage.exportPolicy(imported1.id);
        const imported2 = await storage.importPolicy(exported2);

        expect(imported2.name).toBe(imported1.name);
        expect(imported2.blocks.length).toBe(imported1.blocks.length);
        expect(imported2.connections.length).toBe(imported1.connections.length);
      }),
      { numRuns: 15 }
    );
  });
});

// ============================================================================
// Property 14: Policy Persistence Round-Trip
// ============================================================================

describe('Property 14: Policy Persistence Round-Trip', () => {
  let storage: LocalStorageVisualPolicyStorage;

  beforeEach(() => {
    localStorageMock.clear();
    storage = new LocalStorageVisualPolicyStorage();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('save then load preserves all block state', async () => {
    await fc.assert(
      fc.asyncProperty(policyArb(), async (policy) => {
        localStorageMock.clear();
        await storage.saveVisualPolicy(policy);
        const loaded = await storage.loadVisualPolicy(policy.id);

        expect(loaded).toBeTruthy();
        expect(loaded!.blocks.length).toBe(policy.blocks.length);

        for (let i = 0; i < policy.blocks.length; i++) {
          expect(loaded!.blocks[i].id).toBe(policy.blocks[i].id);
          expect(loaded!.blocks[i].definitionId).toBe(policy.blocks[i].definitionId);
          expect(loaded!.blocks[i].position.x).toBe(policy.blocks[i].position.x);
          expect(loaded!.blocks[i].position.y).toBe(policy.blocks[i].position.y);
          expect(JSON.stringify(loaded!.blocks[i].parameters)).toBe(
            JSON.stringify(policy.blocks[i].parameters)
          );
          expect(loaded!.blocks[i].collapsed).toBe(policy.blocks[i].collapsed);
        }
      }),
      { numRuns: 25 }
    );
  });

  it('save then load preserves connections', async () => {
    await fc.assert(
      fc.asyncProperty(policyArb(), async (policy) => {
        localStorageMock.clear();
        await storage.saveVisualPolicy(policy);
        const loaded = await storage.loadVisualPolicy(policy.id);

        expect(loaded).toBeTruthy();
        expect(loaded!.connections.length).toBe(policy.connections.length);

        for (let i = 0; i < policy.connections.length; i++) {
          expect(loaded!.connections[i].id).toBe(policy.connections[i].id);
          expect(loaded!.connections[i].sourceBlockId).toBe(policy.connections[i].sourceBlockId);
          expect(loaded!.connections[i].targetBlockId).toBe(policy.connections[i].targetBlockId);
          expect(loaded!.connections[i].isValid).toBe(policy.connections[i].isValid);
        }
      }),
      { numRuns: 25 }
    );
  });

  it('save then load preserves viewport and metadata', async () => {
    await fc.assert(
      fc.asyncProperty(policyArb(), async (policy) => {
        localStorageMock.clear();
        await storage.saveVisualPolicy(policy);
        const loaded = await storage.loadVisualPolicy(policy.id);

        expect(loaded).toBeTruthy();
        expect(loaded!.viewport.x).toBe(policy.viewport.x);
        expect(loaded!.viewport.y).toBe(policy.viewport.y);
        expect(loaded!.viewport.zoom).toBe(policy.viewport.zoom);
        expect(loaded!.metadata.category).toBe(policy.metadata.category);
        expect(loaded!.metadata.tags).toEqual(policy.metadata.tags);
        expect(loaded!.metadata.providers).toEqual(policy.metadata.providers);
        expect(loaded!.metadata.isVisual).toBe(true);
        expect(loaded!.metadata.blockCount).toBe(policy.metadata.blockCount);
      }),
      { numRuns: 25 }
    );
  });

  it('save then load preserves policy identity', async () => {
    await fc.assert(
      fc.asyncProperty(policyArb(), async (policy) => {
        localStorageMock.clear();
        await storage.saveVisualPolicy(policy);
        const loaded = await storage.loadVisualPolicy(policy.id);

        expect(loaded).toBeTruthy();
        expect(loaded!.id).toBe(policy.id);
        expect(loaded!.workspaceId).toBe(policy.workspaceId);
        expect(loaded!.name).toBe(policy.name);
        expect(loaded!.description).toBe(policy.description);
        expect(loaded!.version).toBe(policy.version);
        expect(loaded!.createdBy).toBe(policy.createdBy);
      }),
      { numRuns: 25 }
    );
  });

  it('multiple saves are idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(policyArb(), async (policy) => {
        localStorageMock.clear();
        await storage.saveVisualPolicy(policy);
        await storage.saveVisualPolicy(policy);

        const loaded = await storage.loadVisualPolicy(policy.id);
        expect(loaded).toBeTruthy();
        expect(loaded!.id).toBe(policy.id);
        expect(loaded!.blocks.length).toBe(policy.blocks.length);

        const all = await storage.listVisualPolicies(policy.workspaceId);
        expect(all.filter(p => p.id === policy.id).length).toBe(1);
      }),
      { numRuns: 25 }
    );
  });

  it('delete removes policy completely', async () => {
    await fc.assert(
      fc.asyncProperty(policyArb(), async (policy) => {
        localStorageMock.clear();
        await storage.saveVisualPolicy(policy);
        expect(await storage.loadVisualPolicy(policy.id)).toBeTruthy();

        await storage.deleteVisualPolicy(policy.id);
        expect(await storage.loadVisualPolicy(policy.id)).toBeNull();
      }),
      { numRuns: 25 }
    );
  });
});
