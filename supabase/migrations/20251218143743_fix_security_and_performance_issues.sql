/*
  # Fix Security and Performance Issues

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes
  - Add index on `leads.user_id` to improve foreign key query performance
  - Add index on `project_invitations.created_by` to improve foreign key query performance

  ### 2. Optimize RLS Policies (Auth Function Initialization)
  - Recreate all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
  - This prevents re-evaluation of auth functions for each row, dramatically improving query performance at scale

  ### 3. Remove Unused Indexes
  - Drop unused indexes that add overhead without providing benefits:
    - `idx_meta_leads_user_id`
    - `idx_user_profiles_role`
    - `idx_user_profiles_project_id`
    - `idx_projects_owner_id`
    - `idx_projects_is_active`
    - `idx_project_invitations_code`
    - `idx_project_invitations_project_id`

  ### 4. Consolidate Duplicate RLS Policies
  - Remove duplicate permissive policies on `meta_leads` table
  - Remove duplicate policies on `user_profiles` table
  - Keep only the most comprehensive policy for each action

  ### 5. Fix Function Search Paths
  - Set immutable search_path for all functions to prevent security vulnerabilities:
    - `update_updated_at_column`
    - `generate_invitation_code`
    - `check_and_create_first_super_admin`

  ## Security Notes
  - All changes maintain existing security restrictions
  - Performance improvements do not compromise data protection
  - RLS policies remain restrictive and secure
*/

-- =====================================================
-- 1. Add Missing Foreign Key Indexes
-- =====================================================

-- Index for leads.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_leads_user_id_fk 
ON leads(user_id);

-- Index for project_invitations.created_by foreign key
CREATE INDEX IF NOT EXISTS idx_project_invitations_created_by_fk 
ON project_invitations(created_by);

-- =====================================================
-- 2. Remove Unused Indexes
-- =====================================================

DROP INDEX IF EXISTS idx_meta_leads_user_id;
DROP INDEX IF EXISTS idx_user_profiles_role;
DROP INDEX IF EXISTS idx_user_profiles_project_id;
DROP INDEX IF EXISTS idx_projects_owner_id;
DROP INDEX IF EXISTS idx_projects_is_active;
DROP INDEX IF EXISTS idx_project_invitations_code;
DROP INDEX IF EXISTS idx_project_invitations_project_id;

-- =====================================================
-- 3. Consolidate Duplicate RLS Policies on meta_leads
-- =====================================================

-- Drop all existing meta_leads policies
DROP POLICY IF EXISTS "Users can view meta leads in their project" ON meta_leads;
DROP POLICY IF EXISTS "Users can view meta leads from their projects" ON meta_leads;
DROP POLICY IF EXISTS "Users can insert meta leads in their project" ON meta_leads;
DROP POLICY IF EXISTS "Users can insert meta leads to their projects" ON meta_leads;
DROP POLICY IF EXISTS "Users can update meta leads in their project" ON meta_leads;
DROP POLICY IF EXISTS "Users can update meta leads from their projects" ON meta_leads;
DROP POLICY IF EXISTS "Project admins can delete meta leads in their project" ON meta_leads;
DROP POLICY IF EXISTS "Users can delete meta leads from their projects" ON meta_leads;

-- Create consolidated policies with optimized auth function calls
CREATE POLICY "Users can view meta leads in their project" 
ON meta_leads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = meta_leads.project_id
  )
);

CREATE POLICY "Users can insert meta leads in their project" 
ON meta_leads FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = meta_leads.project_id
  )
);

CREATE POLICY "Users can update meta leads in their project" 
ON meta_leads FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = meta_leads.project_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = meta_leads.project_id
  )
);

CREATE POLICY "Project admins can delete meta leads in their project" 
ON meta_leads FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = meta_leads.project_id
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- =====================================================
-- 4. Optimize user_profiles RLS Policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Project admins can view members in their project" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view own profile" 
ON user_profiles FOR SELECT
TO authenticated
USING (id = (select auth.uid()));

CREATE POLICY "Super admins can view all profiles" 
ON user_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = (select auth.uid())
    AND up.role = 'super_admin'
  )
);

CREATE POLICY "Project admins can view members in their project" 
ON user_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles admin_profile
    WHERE admin_profile.id = (select auth.uid())
    AND admin_profile.project_id = user_profiles.project_id
    AND admin_profile.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Users can update own profile" 
ON user_profiles FOR UPDATE
TO authenticated
USING (id = (select auth.uid()))
WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Super admins can update any profile" 
ON user_profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = (select auth.uid())
    AND up.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = (select auth.uid())
    AND up.role = 'super_admin'
  )
);

CREATE POLICY "Users can insert own profile" 
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (id = (select auth.uid()));

-- =====================================================
-- 5. Optimize projects RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view projects they belong to" ON projects;
DROP POLICY IF EXISTS "Super admins and project admins can create projects" ON projects;
DROP POLICY IF EXISTS "Project owners and super admins can update projects" ON projects;
DROP POLICY IF EXISTS "Project owners and super admins can delete projects" ON projects;

CREATE POLICY "Users can view projects they belong to" 
ON projects FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.project_id = projects.id
    AND user_profiles.id = (select auth.uid())
  )
);

CREATE POLICY "Super admins and project admins can create projects" 
ON projects FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Project owners and super admins can update projects" 
ON projects FOR UPDATE
TO authenticated
USING (
  owner_id = (select auth.uid()) OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.role = 'super_admin'
  )
)
WITH CHECK (
  owner_id = (select auth.uid()) OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.role = 'super_admin'
  )
);

CREATE POLICY "Project owners and super admins can delete projects" 
ON projects FOR DELETE
TO authenticated
USING (
  owner_id = (select auth.uid()) OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.role = 'super_admin'
  )
);

-- =====================================================
-- 6. Optimize leads RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view leads in their project" ON leads;
DROP POLICY IF EXISTS "Users can insert leads in their project" ON leads;
DROP POLICY IF EXISTS "Users can update leads in their project" ON leads;
DROP POLICY IF EXISTS "Project admins and super admins can delete leads" ON leads;

CREATE POLICY "Users can view leads in their project" 
ON leads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = leads.project_id
  )
);

CREATE POLICY "Users can insert leads in their project" 
ON leads FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (select auth.uid()) AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = leads.project_id
  )
);

CREATE POLICY "Users can update leads in their project" 
ON leads FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = leads.project_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = leads.project_id
  )
);

CREATE POLICY "Project admins and super admins can delete leads" 
ON leads FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = leads.project_id
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- =====================================================
-- 7. Optimize project_invitations RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Project admins can view invitations for their project" ON project_invitations;
DROP POLICY IF EXISTS "Project admins can create invitations for their project" ON project_invitations;
DROP POLICY IF EXISTS "Project admins can update invitations for their project" ON project_invitations;

CREATE POLICY "Project admins can view invitations for their project" 
ON project_invitations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = project_invitations.project_id
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Project admins can create invitations for their project" 
ON project_invitations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = project_invitations.project_id
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Project admins can update invitations for their project" 
ON project_invitations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = project_invitations.project_id
    AND user_profiles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = project_invitations.project_id
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- =====================================================
-- 8. Fix Function Search Paths
-- =====================================================

-- Recreate update_updated_at_column with immutable search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate generate_invitation_code with immutable search_path
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  characters text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Recreate check_and_create_first_super_admin with immutable search_path
-- Note: This function needs to be dropped and recreated because we're changing the return type
DROP FUNCTION IF EXISTS check_and_create_first_super_admin() CASCADE;
CREATE FUNCTION check_and_create_first_super_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  super_admin_count integer;
BEGIN
  SELECT COUNT(*) INTO super_admin_count
  FROM user_profiles
  WHERE role = 'super_admin';
  
  IF super_admin_count = 0 THEN
    INSERT INTO user_profiles (id, email, role, project_id)
    VALUES (
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'super_admin',
      NULL
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'super_admin';
  END IF;
END;
$$;