-- Migration: Visual Policies Schema
-- Description: Database schema for visual policy builder, custom blocks, and NL generation
-- Created: 2026-03-06
-- Spec: playground-no-code-features
-- Requirements: 1.10, 18.1-18.10

-- ============================================================================
-- Visual Policies Table
-- ============================================================================
-- Stores visual policy structure (blocks, connections, viewport state)
-- Links to main policies table via policy_id

CREATE TABLE IF NOT EXISTS visual_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  
  -- Visual structure (JSONB for flexibility)
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  connections JSONB NOT NULL DEFAULT '[]'::jsonb,
  viewport JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  
  -- Custom blocks used in this policy
  custom_blocks JSONB DEFAULT '[]'::jsonb,
  
  -- Generation info (if created from natural language)
  generation_info JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast policy lookups
CREATE INDEX IF NOT EXISTS idx_visual_policies_policy_id ON visual_policies(policy_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_visual_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_visual_policies_updated_at
  BEFORE UPDATE ON visual_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_visual_policies_updated_at();

-- ============================================================================
-- Custom Block Definitions Table
-- ============================================================================
-- Stores user-defined custom blocks that extend the block library
-- Supports versioning and workspace-level sharing

CREATE TABLE IF NOT EXISTS custom_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Block metadata
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Full block definition (BlockDefinition interface)
  definition JSONB NOT NULL,
  
  -- Versioning
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  
  -- Ownership and sharing
  created_by UUID REFERENCES auth.users(id),
  is_public BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique block names per workspace and version
  UNIQUE(workspace_id, name, version)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_custom_blocks_workspace ON custom_blocks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_custom_blocks_category ON custom_blocks(category);
CREATE INDEX IF NOT EXISTS idx_custom_blocks_created_by ON custom_blocks(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_blocks_public ON custom_blocks(is_public) WHERE is_public = TRUE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_custom_blocks_updated_at
  BEFORE UPDATE ON custom_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_blocks_updated_at();

-- ============================================================================
-- Natural Language Generation Cache Table
-- ============================================================================
-- Caches LLM-generated policies to reduce API costs
-- 7-day TTL for cache entries

CREATE TABLE IF NOT EXISTS nl_generation_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Cache key (SHA-256 hash of prompt + context)
  cache_key VARCHAR(64) UNIQUE NOT NULL,
  
  -- Request details
  prompt TEXT NOT NULL,
  context JSONB NOT NULL,
  model VARCHAR(50) NOT NULL,
  
  -- Response
  result JSONB NOT NULL,
  
  -- Metadata
  tokens_used INTEGER NOT NULL,
  cost DECIMAL(10, 6) NOT NULL,
  generation_time INTEGER NOT NULL, -- milliseconds
  
  -- Cache management
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Validation
  CHECK (expires_at > created_at),
  CHECK (tokens_used >= 0),
  CHECK (cost >= 0),
  CHECK (generation_time >= 0)
);

-- Indexes for cache lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_nl_cache_key ON nl_generation_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_nl_cache_expires ON nl_generation_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_nl_cache_model ON nl_generation_cache(model);

-- ============================================================================
-- Natural Language Generation Usage Tracking Table
-- ============================================================================
-- Tracks all NL generation requests for cost analysis and quota management

CREATE TABLE IF NOT EXISTS nl_generation_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Request details
  prompt TEXT NOT NULL,
  model VARCHAR(50) NOT NULL,
  output_format VARCHAR(20) NOT NULL, -- 'code', 'visual', 'both'
  
  -- Result
  success BOOLEAN NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost DECIMAL(10, 6) NOT NULL,
  from_cache BOOLEAN DEFAULT FALSE,
  
  -- Generated policy reference
  policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
  
  -- Iteration tracking (for refinement)
  iteration_number INTEGER DEFAULT 1,
  parent_generation_id UUID REFERENCES nl_generation_usage(id),
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Validation
  CHECK (tokens_used >= 0),
  CHECK (cost >= 0),
  CHECK (iteration_number > 0)
);

-- Indexes for analytics and quota queries
CREATE INDEX IF NOT EXISTS idx_nl_usage_user ON nl_generation_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_nl_usage_workspace ON nl_generation_usage(workspace_id);
CREATE INDEX IF NOT EXISTS idx_nl_usage_created ON nl_generation_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_nl_usage_policy ON nl_generation_usage(policy_id);
CREATE INDEX IF NOT EXISTS idx_nl_usage_parent ON nl_generation_usage(parent_generation_id);

-- ============================================================================
-- Wizard Sessions Table
-- ============================================================================
-- Stores wizard session state for resumable workflows

CREATE TABLE IF NOT EXISTS wizard_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Session details
  type VARCHAR(50) NOT NULL, -- 'policy', 'template', 'compliance'
  current_step INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  
  -- Session data (wizard-specific)
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Lifecycle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Validation
  CHECK (current_step >= 0 AND current_step <= total_steps),
  CHECK (total_steps > 0)
);

-- Indexes for session management
CREATE INDEX IF NOT EXISTS idx_wizard_sessions_user ON wizard_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_wizard_sessions_workspace ON wizard_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wizard_sessions_expires ON wizard_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_wizard_sessions_type ON wizard_sessions(type);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wizard_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_wizard_sessions_updated_at
  BEFORE UPDATE ON wizard_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_wizard_sessions_updated_at();

-- ============================================================================
-- User Preferences for No-Code Features Table
-- ============================================================================
-- Stores user preferences for visual builder and NL generation

CREATE TABLE IF NOT EXISTS nocode_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Visual builder preferences
  preferred_view_mode VARCHAR(20) DEFAULT 'visual', -- 'visual', 'code', 'split'
  show_tutorials BOOLEAN DEFAULT TRUE,
  show_tooltips BOOLEAN DEFAULT TRUE,
  
  -- Natural language generation preferences
  preferred_nl_model VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
  byok_enabled BOOLEAN DEFAULT FALSE,
  byok_api_key_encrypted TEXT, -- Encrypted API key for BYOK users
  
  -- Recommendation preferences
  recommendation_profile JSONB,
  dismissed_suggestions JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamp
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_nocode_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_nocode_preferences_updated_at
  BEFORE UPDATE ON nocode_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_nocode_preferences_updated_at();

-- ============================================================================
-- No-Code Analytics Table
-- ============================================================================
-- Tracks usage analytics for no-code features

CREATE TABLE IF NOT EXISTS nocode_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Context
  policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_nocode_analytics_user ON nocode_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_nocode_analytics_workspace ON nocode_analytics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_nocode_analytics_event ON nocode_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_nocode_analytics_created ON nocode_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_nocode_analytics_policy ON nocode_analytics(policy_id);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE visual_policies IS 'Stores visual policy structure (blocks, connections, viewport) for the visual policy builder';
COMMENT ON TABLE custom_blocks IS 'User-defined custom blocks that extend the block library with versioning support';
COMMENT ON TABLE nl_generation_cache IS 'Caches LLM-generated policies to reduce API costs (7-day TTL)';
COMMENT ON TABLE nl_generation_usage IS 'Tracks all NL generation requests for cost analysis and quota management';
COMMENT ON TABLE wizard_sessions IS 'Stores wizard session state for resumable policy creation workflows';
COMMENT ON TABLE nocode_preferences IS 'User preferences for visual builder and natural language generation features';
COMMENT ON TABLE nocode_analytics IS 'Usage analytics for no-code features';

-- ============================================================================
-- End of Migration
-- ============================================================================
