/*
  # Fix Security and Performance Issues

  1. **Add Missing Indexes for Foreign Keys**
     - Add index on `meta_leads.user_id`
     - Add index on `project_invitations.project_id`
     - Add index on `projects.owner_id`
     - Add index on `user_profiles.project_id`

  2. **Remove Duplicate Indexes**
     - Drop `idx_leads_user_id` (keeping `idx_leads_user_id_fk`)
     - Drop `idx_project_invitations_created_by` (keeping `idx_project_invitations_created_by_fk`)

  3. **Optimize RLS Policies with auth.uid() Initialization**
     - Update `user_profiles` policies to use `(select auth.uid())`
     - Update `projects` policies to use `(select auth.uid())`

  4. **Fix Function Search Path**
     - Update `get_user_role` with stable search_path
     - Update `get_user_project_id` with stable search_path

  ## Notes
  - All indexes are created with IF NOT EXISTS to prevent errors
  - Duplicate indexes are dropped to improve write performance
  - Auth function calls are optimized to prevent re-evaluation per row
  - Function search paths are secured to prevent privilege escalation
*/

-- =====================================================
-- 1. ADD MISSING INDEXES FOR FOREIGN KEYS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_meta_leads_user_id ON meta_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_project_id ON user_profiles(project_id);

-- =====================================================
-- 2. REMOVE DUPLICATE INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_leads_user_id;
DROP INDEX IF EXISTS idx_project_invitations_created_by;

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES WITH AUTH INITIALIZATION
-- =====================================================

-- Drop and recreate user_profiles policies with optimized auth.uid()
-- Note: user_profiles uses 'id' as the primary key that references auth.users.id
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- Drop and recreate projects policies with optimized auth.uid()
DROP POLICY IF EXISTS "Project owners and super admins can update projects" ON projects;
DROP POLICY IF EXISTS "Project owners and super admins can delete projects" ON projects;

CREATE POLICY "Project owners and super admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    owner_id = (select auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Project owners and super admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    owner_id = (select auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'super_admin'
    )
  );

-- =====================================================
-- 4. FIX FUNCTION SEARCH PATH
-- =====================================================

-- Replace functions with secure search_path (using CREATE OR REPLACE to avoid dropping)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM user_profiles 
    WHERE id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_user_project_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN (
    SELECT project_id 
    FROM user_profiles 
    WHERE id = auth.uid()
  );
END;
$$;