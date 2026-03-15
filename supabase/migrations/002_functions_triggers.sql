-- TealTiger Playground Enterprise - Database Functions and Triggers
-- Migration 002: Validation functions, version management, and audit triggers
-- Requirements: 3.2, 5.4-5.6

-- ============================================================================
-- 1. Semantic Version Validation Function
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_semver(version_string TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validates semantic version format: MAJOR.MINOR.PATCH
  -- Examples: 1.0.0, 2.3.15, 10.20.30
  RETURN version_string ~ '^\d+\.\d+\.\d+$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_semver IS 'Validates semantic version format (MAJOR.MINOR.PATCH)';

-- Test the function
DO $$
BEGIN
  ASSERT validate_semver('1.0.0') = TRUE, 'Valid semver should pass';
  ASSERT validate_semver('2.3.15') = TRUE, 'Valid semver should pass';
  ASSERT validate_semver('10.20.30') = TRUE, 'Valid semver should pass';
  ASSERT validate_semver('1.0') = FALSE, 'Invalid semver should fail';
  ASSERT validate_semver('v1.0.0') = FALSE, 'Semver with prefix should fail';
  ASSERT validate_semver('1.0.0-beta') = FALSE, 'Semver with suffix should fail';
  RAISE NOTICE 'validate_semver tests passed';
END $$;

-- ============================================================================
-- 2. Version Increment Function
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_version(
  current_version TEXT,
  bump_type TEXT -- 'major', 'minor', or 'patch'
)
RETURNS TEXT AS $$
DECLARE
  version_parts TEXT[];
  major INT;
  minor INT;
  patch INT;
BEGIN
  -- Validate input version
  IF NOT validate_semver(current_version) THEN
    RAISE EXCEPTION 'Invalid semantic version format: %', current_version;
  END IF;

  -- Parse version components
  version_parts := string_to_array(current_version, '.');
  major := version_parts[1]::INT;
  minor := version_parts[2]::INT;
  patch := version_parts[3]::INT;

  -- Increment based on bump type
  CASE bump_type
    WHEN 'major' THEN
      major := major + 1;
      minor := 0;
      patch := 0;
    WHEN 'minor' THEN
      minor := minor + 1;
      patch := 0;
    WHEN 'patch' THEN
      patch := patch + 1;
    ELSE
      RAISE EXCEPTION 'Invalid bump type: %. Must be major, minor, or patch', bump_type;
  END CASE;

  -- Return new version
  RETURN format('%s.%s.%s', major, minor, patch);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION increment_version IS 'Increments semantic version (major, minor, or patch)';

-- Test the function
DO $$
BEGIN
  ASSERT increment_version('1.0.0', 'major') = '2.0.0', 'Major bump should work';
  ASSERT increment_version('1.5.3', 'minor') = '1.6.0', 'Minor bump should work';
  ASSERT increment_version('1.5.3', 'patch') = '1.5.4', 'Patch bump should work';
  ASSERT increment_version('10.20.30', 'major') = '11.0.0', 'Major bump should reset minor and patch';
  RAISE NOTICE 'increment_version tests passed';
END $$;

-- ============================================================================
-- 3. Workspace Role Permission Check Function
-- ============================================================================
CREATE OR REPLACE FUNCTION check_workspace_role(
  p_workspace_id UUID,
  p_user_id UUID,
  required_role TEXT -- 'owner', 'editor', or 'viewer'
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user's role in workspace
  SELECT role INTO user_role
  FROM workspace_members
  WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id;

  -- User not a member
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check role hierarchy: owner > editor > viewer
  CASE required_role
    WHEN 'viewer' THEN
      -- All roles can view
      RETURN TRUE;
    WHEN 'editor' THEN
      -- Editor and owner can edit
      RETURN user_role IN ('editor', 'owner');
    WHEN 'owner' THEN
      -- Only owner has owner permissions
      RETURN user_role = 'owner';
    ELSE
      RAISE EXCEPTION 'Invalid required role: %', required_role;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_workspace_role IS 'Checks if user has required role in workspace (owner > editor > viewer)';

-- ============================================================================
-- 4. Updated_at Timestamp Trigger Function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS 'Automatically updates updated_at timestamp on row modification';

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Audit Log Trigger Function
-- ============================================================================
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  workspace_id_val UUID;
  actor_id_val UUID;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := TG_TABLE_NAME || '_created';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := TG_TABLE_NAME || '_updated';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := TG_TABLE_NAME || '_deleted';
  END IF;

  -- Extract workspace_id and actor_id from the row
  -- This assumes tables have workspace_id and created_by/updated_by columns
  IF TG_OP = 'DELETE' THEN
    workspace_id_val := OLD.workspace_id;
    actor_id_val := COALESCE(OLD.created_by, auth.uid());
  ELSE
    workspace_id_val := NEW.workspace_id;
    actor_id_val := COALESCE(NEW.created_by, auth.uid());
  END IF;

  -- Insert audit log entry
  INSERT INTO audit_log (
    workspace_id,
    actor_id,
    action,
    resource_type,
    resource_id,
    metadata,
    created_at
  ) VALUES (
    workspace_id_val,
    actor_id_val,
    action_type,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', NOW()
    ),
    NOW()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_audit_event IS 'Automatically logs all table modifications to audit_log';

-- Apply audit trigger to key tables
CREATE TRIGGER audit_policies
  AFTER INSERT OR UPDATE OR DELETE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_policy_versions
  AFTER INSERT ON policy_versions
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_workspace_members
  AFTER INSERT OR UPDATE OR DELETE ON workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_policy_approvals
  AFTER INSERT OR UPDATE ON policy_approvals
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();

-- ============================================================================
-- 6. Policy Version Immutability Enforcement
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_policy_version_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'UPDATE operation not allowed on policy_versions table (immutable)';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DELETE operation not allowed on policy_versions table (immutable)';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prevent_policy_version_modification IS 'Enforces immutability of policy_versions table';

CREATE TRIGGER enforce_policy_version_immutability
  BEFORE UPDATE OR DELETE ON policy_versions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_policy_version_modification();

-- ============================================================================
-- 7. Audit Log Immutability Enforcement
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'UPDATE operation not allowed on audit_log table (immutable)';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DELETE operation not allowed on audit_log table (immutable)';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prevent_audit_log_modification IS 'Enforces immutability of audit_log table (append-only)';

CREATE TRIGGER enforce_audit_log_immutability
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- ============================================================================
-- 8. User Last Seen Update Function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET last_seen = NOW()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_user_last_seen IS 'Updates user last_seen timestamp on activity';

-- ============================================================================
-- 9. Workspace Slug Generation Function
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_workspace_slug(workspace_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(workspace_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  -- Ensure slug is not empty
  IF base_slug = '' THEN
    base_slug := 'workspace';
  END IF;

  -- Check for uniqueness and append counter if needed
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM workspaces WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_workspace_slug IS 'Generates unique URL-friendly slug from workspace name';

-- Test the function
DO $$
BEGIN
  ASSERT generate_workspace_slug('My Team Workspace') = 'my-team-workspace', 'Slug generation should work';
  ASSERT generate_workspace_slug('Test@#$%Workspace!!!') = 'testworkspace', 'Special chars should be removed';
  ASSERT generate_workspace_slug('   Multiple   Spaces   ') = 'multiple-spaces', 'Multiple spaces should collapse';
  RAISE NOTICE 'generate_workspace_slug tests passed';
END $$;

-- ============================================================================
-- 10. Policy Name Uniqueness Validation Function
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_policy_name_unique()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM policies
    WHERE workspace_id = NEW.workspace_id
      AND name = NEW.name
      AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Policy name "%" already exists in workspace', NEW.name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_policy_name_unique IS 'Enforces unique policy names within workspace';

CREATE TRIGGER enforce_policy_name_uniqueness
  BEFORE INSERT OR UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION validate_policy_name_unique();

-- ============================================================================
-- 11. Semantic Version Validation Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_policy_version_format()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT validate_semver(NEW.version) THEN
    RAISE EXCEPTION 'Invalid semantic version format: %. Must be MAJOR.MINOR.PATCH', NEW.version;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_policy_version_format IS 'Validates semantic version format on policy_versions insert';

CREATE TRIGGER enforce_semver_format
  BEFORE INSERT ON policy_versions
  FOR EACH ROW
  EXECUTE FUNCTION validate_policy_version_format();

-- ============================================================================
-- 12. Helper Function: Get User Workspaces
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_workspaces(p_user_id UUID)
RETURNS TABLE (
  workspace_id UUID,
  workspace_name TEXT,
  workspace_slug TEXT,
  user_role TEXT,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.slug,
    wm.role,
    wm.joined_at
  FROM workspaces w
  INNER JOIN workspace_members wm ON w.id = wm.workspace_id
  WHERE wm.user_id = p_user_id
  ORDER BY wm.joined_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_workspaces IS 'Returns all workspaces for a user with their role';

-- ============================================================================
-- 13. Helper Function: Get Policy Version History
-- ============================================================================
CREATE OR REPLACE FUNCTION get_policy_version_history(p_policy_id UUID)
RETURNS TABLE (
  version_id UUID,
  version TEXT,
  created_by UUID,
  created_by_username TEXT,
  created_at TIMESTAMPTZ,
  code_length INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pv.id,
    pv.version,
    pv.created_by,
    u.username,
    pv.created_at,
    length(pv.code)
  FROM policy_versions pv
  LEFT JOIN users u ON pv.created_by = u.id
  WHERE pv.policy_id = p_policy_id
  ORDER BY pv.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_policy_version_history IS 'Returns version history for a policy with author details';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Functions created: 13
-- Triggers created: 11
-- Immutability enforced: policy_versions, audit_log
-- Automatic timestamps: workspaces, policies, comments
-- Automatic audit logging: policies, policy_versions, workspace_members, policy_approvals
