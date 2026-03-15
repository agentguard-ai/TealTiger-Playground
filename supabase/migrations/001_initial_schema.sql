-- TealTiger Playground Enterprise - Initial Database Schema
-- Migration 001: Create all tables with indexes
-- Requirements: 1.1, 3.1, 5.1, 10.7

-- ============================================================================
-- 1. Users Table
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_email ON users(email);

COMMENT ON TABLE users IS 'User profiles linked to GitHub accounts';
COMMENT ON COLUMN users.github_id IS 'GitHub user ID for OAuth authentication';
COMMENT ON COLUMN users.metadata IS 'Additional user metadata (preferences, settings)';

-- ============================================================================
-- 2. Workspaces Table
-- ============================================================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);

COMMENT ON TABLE workspaces IS 'Team workspaces for policy collaboration';
COMMENT ON COLUMN workspaces.slug IS 'URL-friendly workspace identifier';
COMMENT ON COLUMN workspaces.settings IS 'Workspace configuration (approvers, rate limits, budget alerts)';

-- ============================================================================
-- 3. Workspace Members Table
-- ============================================================================
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'editor', 'viewer')) NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);

COMMENT ON TABLE workspace_members IS 'Team membership with role-based access control';
COMMENT ON COLUMN workspace_members.role IS 'owner: full control, editor: manage policies, viewer: read-only';

-- ============================================================================
-- 4. Policies Table
-- ============================================================================
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  current_version TEXT NOT NULL,
  state TEXT CHECK (state IN ('draft', 'review', 'approved', 'production')) DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_policies_workspace_id ON policies(workspace_id);
CREATE INDEX idx_policies_state ON policies(state);
CREATE INDEX idx_policies_created_by ON policies(created_by);
CREATE INDEX idx_policies_created_at ON policies(created_at DESC);

COMMENT ON TABLE policies IS 'Policy registry with versioning and governance workflow';
COMMENT ON COLUMN policies.state IS 'Governance workflow: draft → review → approved → production';
COMMENT ON COLUMN policies.current_version IS 'Semantic version (e.g., 1.0.0)';

-- ============================================================================
-- 5. Policy Versions Table (Immutable)
-- ============================================================================
CREATE TABLE policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  code TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(policy_id, version)
);

CREATE INDEX idx_policy_versions_policy_id ON policy_versions(policy_id);
CREATE INDEX idx_policy_versions_version ON policy_versions(version);
CREATE INDEX idx_policy_versions_created_at ON policy_versions(created_at DESC);

COMMENT ON TABLE policy_versions IS 'Immutable policy version history';
COMMENT ON COLUMN policy_versions.metadata IS 'Tags, category, providers, models, cost, test coverage';

-- ============================================================================
-- 6. Comments Table
-- ============================================================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  version_id UUID REFERENCES policy_versions(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id),
  resolved BOOLEAN DEFAULT FALSE,
  mentions UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_policy_id ON comments(policy_id);
CREATE INDEX idx_comments_version_id ON comments(version_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_comments_resolved ON comments(resolved);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

COMMENT ON TABLE comments IS 'Inline collaboration comments on policy code';
COMMENT ON COLUMN comments.line_number IS 'Line number in policy code (1-indexed)';
COMMENT ON COLUMN comments.mentions IS 'Array of user IDs mentioned with @username';

-- ============================================================================
-- 7. Comment Replies Table
-- ============================================================================
CREATE TABLE comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comment_replies_comment_id ON comment_replies(comment_id);
CREATE INDEX idx_comment_replies_author_id ON comment_replies(author_id);
CREATE INDEX idx_comment_replies_created_at ON comment_replies(created_at DESC);

COMMENT ON TABLE comment_replies IS 'Threaded replies to comments';

-- ============================================================================
-- 8. Policy Approvals Table
-- ============================================================================
CREATE TABLE policy_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  version_id UUID REFERENCES policy_versions(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX idx_policy_approvals_policy_id ON policy_approvals(policy_id);
CREATE INDEX idx_policy_approvals_version_id ON policy_approvals(version_id);
CREATE INDEX idx_policy_approvals_approver_id ON policy_approvals(approver_id);
CREATE INDEX idx_policy_approvals_status ON policy_approvals(status);
CREATE INDEX idx_policy_approvals_created_at ON policy_approvals(created_at DESC);

COMMENT ON TABLE policy_approvals IS 'Governance workflow approvals';
COMMENT ON COLUMN policy_approvals.comment IS 'Approver comment explaining decision';

-- ============================================================================
-- 9. Compliance Mappings Table
-- ============================================================================
CREATE TABLE compliance_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  framework_id TEXT NOT NULL,
  requirement_id TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(policy_id, framework_id, requirement_id)
);

CREATE INDEX idx_compliance_mappings_policy_id ON compliance_mappings(policy_id);
CREATE INDEX idx_compliance_mappings_framework_id ON compliance_mappings(framework_id);
CREATE INDEX idx_compliance_mappings_requirement_id ON compliance_mappings(requirement_id);

COMMENT ON TABLE compliance_mappings IS 'Policy mappings to compliance frameworks';
COMMENT ON COLUMN compliance_mappings.framework_id IS 'Framework identifier (e.g., owasp-asi-2024, nist-ai-rmf-1.0)';
COMMENT ON COLUMN compliance_mappings.requirement_id IS 'Requirement code (e.g., ASI01, GOVERN-1.1)';

-- ============================================================================
-- 10. Audit Log Table (Immutable, Append-Only)
-- ============================================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_workspace_id ON audit_log(workspace_id);
CREATE INDEX idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource_type ON audit_log(resource_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

COMMENT ON TABLE audit_log IS 'Immutable audit trail of all actions (append-only)';
COMMENT ON COLUMN audit_log.action IS 'Action type (e.g., policy_created, policy_approved, member_added)';
COMMENT ON COLUMN audit_log.resource_type IS 'Resource type (e.g., policy, workspace, user)';
COMMENT ON COLUMN audit_log.metadata IS 'Additional event data (redacted sensitive information)';

-- ============================================================================
-- 11. Policy Tests Table
-- ============================================================================
CREATE TABLE policy_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  suite_id UUID,
  name TEXT NOT NULL,
  scenario JSONB NOT NULL,
  assertions JSONB NOT NULL,
  fixtures JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_policy_tests_policy_id ON policy_tests(policy_id);
CREATE INDEX idx_policy_tests_suite_id ON policy_tests(suite_id);
CREATE INDEX idx_policy_tests_created_at ON policy_tests(created_at DESC);

COMMENT ON TABLE policy_tests IS 'Test scenarios for policy validation';
COMMENT ON COLUMN policy_tests.scenario IS 'Test input (prompt, provider, model, parameters)';
COMMENT ON COLUMN policy_tests.assertions IS 'Expected outcomes (decision, cost, latency)';
COMMENT ON COLUMN policy_tests.fixtures IS 'Reusable test data';

-- ============================================================================
-- 12. Analytics Events Table
-- ============================================================================
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  policy_id UUID REFERENCES policies(id),
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_workspace_id ON analytics_events(workspace_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_policy_id ON analytics_events(policy_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);

COMMENT ON TABLE analytics_events IS 'Usage analytics and metrics tracking';
COMMENT ON COLUMN analytics_events.event_type IS 'Event type (e.g., evaluation, approval, deployment)';
COMMENT ON COLUMN analytics_events.metadata IS 'Event data (provider, model, cost, latency, success)';

-- ============================================================================
-- 13. Policy Modules Table
-- ============================================================================
CREATE TABLE policy_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  code TEXT NOT NULL,
  exports TEXT[] NOT NULL,
  visibility TEXT CHECK (visibility IN ('public', 'private')) DEFAULT 'private',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name, version)
);

CREATE INDEX idx_policy_modules_workspace_id ON policy_modules(workspace_id);
CREATE INDEX idx_policy_modules_name ON policy_modules(name);
CREATE INDEX idx_policy_modules_visibility ON policy_modules(visibility);
CREATE INDEX idx_policy_modules_created_at ON policy_modules(created_at DESC);

COMMENT ON TABLE policy_modules IS 'Reusable policy modules (functions, constants)';
COMMENT ON COLUMN policy_modules.exports IS 'Array of exported symbols';
COMMENT ON COLUMN policy_modules.visibility IS 'public: discoverable by all, private: team-only';

-- ============================================================================
-- 14. Policy Dependencies Table
-- ============================================================================
CREATE TABLE policy_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  module_id UUID REFERENCES policy_modules(id) ON DELETE CASCADE,
  module_version TEXT NOT NULL,
  import_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(policy_id, module_id)
);

CREATE INDEX idx_policy_dependencies_policy_id ON policy_dependencies(policy_id);
CREATE INDEX idx_policy_dependencies_module_id ON policy_dependencies(module_id);

COMMENT ON TABLE policy_dependencies IS 'Policy module dependencies for impact analysis';
COMMENT ON COLUMN policy_dependencies.import_path IS 'ES6 import path used in policy code';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Total tables: 14
-- Total indexes: 47
-- Estimated storage: ~50MB for 1000 policies with full history
-- Free tier capacity: 500MB (supports ~10,000 policies)
