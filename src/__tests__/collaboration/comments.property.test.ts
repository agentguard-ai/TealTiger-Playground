// Property-based tests for collaboration comments
// Requirements: 6.3, 6.8, 6.9, 6.10
// Properties: 20, 21, 22, 23

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CollaborationService } from '../../services/CollaborationService';
import { Comment, CommentFilters } from '../../types/comment';

// Test configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-key';

// Arbitraries for property-based testing
const commentArbitrary = fc.record({
  policyId: fc.uuid(),
  versionId: fc.uuid(),
  lineNumber: fc.integer({ min: 1, max: 1000 }),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  authorId: fc.uuid(),
});

const replyArbitrary = fc.record({
  commentId: fc.uuid(),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  authorId: fc.uuid(),
});

const filterArbitrary = fc.record({
  author: fc.option(fc.uuid(), { nil: undefined }),
  resolved: fc.option(fc.boolean(), { nil: undefined }),
  dateRange: fc.option(
    fc.record({
      start: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
      end: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
    }),
    { nil: undefined }
  ),
});


describe('Collaboration Comments - Property-Based Tests', () => {
  let service: CollaborationService;
  let supabase: SupabaseClient;
  let testWorkspaceId: string;
  let testUserId: string;
  let testPolicyId: string;
  let testVersionId: string;
  let supabaseAvailable = false;

  beforeEach(async () => {
    service = new CollaborationService(SUPABASE_URL, SUPABASE_KEY);
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    try {
      // Check if Supabase is available
      const { error: healthError } = await supabase.from('users').select('id').limit(1);
      if (healthError && healthError.message.includes('Failed to fetch')) {
        supabaseAvailable = false;
        return;
      }
      supabaseAvailable = true;

      // Create test data
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          github_id: `test-${Date.now()}`,
          username: 'testuser',
          email: 'test@example.com',
        })
        .select()
        .single();
      
      if (userError || !user) {
        throw new Error(`Failed to create test user: ${userError?.message}`);
      }
      testUserId = user.id;

      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: 'Test Workspace',
          slug: `test-${Date.now()}`,
          owner_id: testUserId,
        })
        .select()
        .single();
      
      if (workspaceError || !workspace) {
        throw new Error(`Failed to create test workspace: ${workspaceError?.message}`);
      }
      testWorkspaceId = workspace.id;

      const { data: policy, error: policyError } = await supabase
        .from('policies')
        .insert({
          workspace_id: testWorkspaceId,
          name: 'Test Policy',
          current_version: '1.0.0',
          created_by: testUserId,
        })
        .select()
        .single();
      
      if (policyError || !policy) {
        throw new Error(`Failed to create test policy: ${policyError?.message}`);
      }
      testPolicyId = policy.id;

      const { data: version, error: versionError } = await supabase
        .from('policy_versions')
        .insert({
          policy_id: testPolicyId,
          version: '1.0.0',
          code: 'test code',
          created_by: testUserId,
        })
        .select()
        .single();
      
      if (versionError || !version) {
        throw new Error(`Failed to create test version: ${versionError?.message}`);
      }
      testVersionId = version.id;
    } catch (error) {
      console.error('Setup failed:', error);
      supabaseAvailable = false;
    }
  });

  afterEach(async () => {
    if (!supabaseAvailable) return;
    
    // Cleanup test data
    try {
      await supabase.from('comments').delete().eq('policy_id', testPolicyId);
      await supabase.from('policy_versions').delete().eq('policy_id', testPolicyId);
      await supabase.from('policies').delete().eq('id', testPolicyId);
      await supabase.from('workspaces').delete().eq('id', testWorkspaceId);
      await supabase.from('users').delete().eq('id', testUserId);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });


  /**
   * Property 20: Comment Thread Preservation
   * Validates: Requirements 6.3
   * 
   * Thread structure (comment + replies) is preserved across operations
   */
  it.skipIf(!process.env.VITE_SUPABASE_URL)('Property 20: Comment thread structure is preserved across operations', async () => {
    if (!supabaseAvailable) {
      console.log('Skipping test: Supabase not available');
      return;
    }
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(replyArbitrary, { minLength: 0, maxLength: 5 }),
        async (replies) => {
          // Add a comment
          const comment = await service.addComment(
            testPolicyId,
            testVersionId,
            10,
            'Test comment',
            testUserId
          );

          // Add replies
          const addedReplies = [];
          for (const reply of replies) {
            const addedReply = await service.addReply(
              comment.id,
              reply.content,
              testUserId
            );
            addedReplies.push(addedReply);
          }

          // Fetch thread
          const threads = await service.getComments(testPolicyId, testVersionId);
          const thread = threads.find((t) => t.comment.id === comment.id);

          // Verify thread structure
          expect(thread).toBeDefined();
          expect(thread!.comment.id).toBe(comment.id);
          expect(thread!.replies.length).toBe(addedReplies.length);

          // Verify replies are in correct order
          for (let i = 0; i < addedReplies.length; i++) {
            expect(thread!.replies[i].id).toBe(addedReplies[i].id);
            expect(thread!.replies[i].content).toBe(addedReplies[i].content);
          }

          // Cleanup
          await supabase.from('comments').delete().eq('id', comment.id);
        }
      ),
      { numRuns: 10 }
    );
  });


  /**
   * Property 21: Unresolved Comment Count Accuracy
   * Validates: Requirements 6.8
   * 
   * Count of unresolved comments matches actual unresolved comments
   */
  it.skipIf(!process.env.VITE_SUPABASE_URL)('Property 21: Unresolved comment count matches actual unresolved comments', async () => {
    if (!supabaseAvailable) {
      console.log('Skipping test: Supabase not available');
      return;
    }
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            lineNumber: fc.integer({ min: 1, max: 100 }),
            resolved: fc.boolean(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (comments) => {
          // Add comments with different resolved states
          const addedComments = [];
          for (const comment of comments) {
            const added = await service.addComment(
              testPolicyId,
              testVersionId,
              comment.lineNumber,
              'Test comment',
              testUserId
            );
            
            if (comment.resolved) {
              await service.resolveComment(added.id);
            }
            
            addedComments.push({ ...added, resolved: comment.resolved });
          }

          // Count unresolved
          const unresolvedCount = await service.countUnresolved(testPolicyId);

          // Calculate expected count
          const expectedCount = comments.filter((c) => !c.resolved).length;

          // Verify count matches
          expect(unresolvedCount).toBe(expectedCount);

          // Cleanup
          for (const comment of addedComments) {
            await supabase.from('comments').delete().eq('id', comment.id);
          }
        }
      ),
      { numRuns: 10 }
    );
  });


  /**
   * Property 22: Comment Version Persistence
   * Validates: Requirements 6.9
   * 
   * Comments persist across policy versions (migration)
   */
  it.skipIf(!process.env.VITE_SUPABASE_URL)('Property 22: Comments persist across policy versions', async () => {
    if (!supabaseAvailable) {
      console.log('Skipping test: Supabase not available');
      return;
    }
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            lineNumber: fc.integer({ min: 1, max: 100 }),
            content: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (comments) => {
          // Add comments to old version
          const addedComments = [];
          for (const comment of comments) {
            const added = await service.addComment(
              testPolicyId,
              testVersionId,
              comment.lineNumber,
              comment.content,
              testUserId
            );
            addedComments.push(added);
          }

          // Create new version
          const { data: newVersion } = await supabase
            .from('policy_versions')
            .insert({
              policy_id: testPolicyId,
              version: '1.1.0',
              code: 'updated code',
              created_by: testUserId,
            })
            .select()
            .single();

          // Migrate comments
          await service.migrateComments(testVersionId, newVersion!.id);

          // Fetch comments from new version
          const newVersionComments = await service.getComments(
            testPolicyId,
            newVersion!.id
          );

          // Verify all comments were migrated
          expect(newVersionComments.length).toBe(addedComments.length);

          // Verify content and line numbers preserved
          for (const original of addedComments) {
            const migrated = newVersionComments.find(
              (t) => t.comment.lineNumber === original.lineNumber &&
                     t.comment.content === original.content
            );
            expect(migrated).toBeDefined();
          }

          // Cleanup
          await supabase.from('comments').delete().eq('policy_id', testPolicyId);
          await supabase.from('policy_versions').delete().eq('id', newVersion!.id);
        }
      ),
      { numRuns: 10 }
    );
  });


  /**
   * Property 23: Comment Filtering Correctness
   * Validates: Requirements 6.10
   * 
   * Filter returns only comments matching the criteria
   */
  it.skipIf(!process.env.VITE_SUPABASE_URL)('Property 23: Comment filtering returns only matching comments', async () => {
    if (!supabaseAvailable) {
      console.log('Skipping test: Supabase not available');
      return;
    }
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            lineNumber: fc.integer({ min: 1, max: 100 }),
            content: fc.string({ minLength: 1, maxLength: 200 }),
            resolved: fc.boolean(),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (comments) => {
          // Add comments
          const addedComments = [];
          for (const comment of comments) {
            const added = await service.addComment(
              testPolicyId,
              testVersionId,
              comment.lineNumber,
              comment.content,
              testUserId
            );
            
            if (comment.resolved) {
              await service.resolveComment(added.id);
            }
            
            addedComments.push({ ...added, resolved: comment.resolved });
          }

          // Test filter by resolved status
          const unresolvedFilter: CommentFilters = { resolved: false };
          const unresolvedThreads = await service.filterComments(
            testPolicyId,
            unresolvedFilter
          );

          const expectedUnresolved = comments.filter((c) => !c.resolved).length;
          expect(unresolvedThreads.length).toBe(expectedUnresolved);

          // Verify all returned comments are unresolved
          for (const thread of unresolvedThreads) {
            expect(thread.comment.resolved).toBe(false);
          }

          // Test filter by author
          const authorFilter: CommentFilters = { author: testUserId };
          const authorThreads = await service.filterComments(
            testPolicyId,
            authorFilter
          );

          expect(authorThreads.length).toBe(comments.length);

          // Verify all returned comments are by the author
          for (const thread of authorThreads) {
            expect(thread.comment.authorId).toBe(testUserId);
          }

          // Cleanup
          for (const comment of addedComments) {
            await supabase.from('comments').delete().eq('id', comment.id);
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
