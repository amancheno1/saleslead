/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  The RLS policies on user_profiles and projects tables were causing infinite recursion
  because they query user_profiles to check roles, which triggers RLS policies that
  query user_profiles again.

  ## Solution
  1. Create helper functions with SECURITY DEFINER to bypass RLS
     - `get_user_role()`: Returns current user's role
     - `get_user_project_id()`: Returns current user's project_id
  
  2. Recreate all RLS policies using these helper functions
     - This breaks the recursion chain
     - Policies can now check roles without triggering more RLS checks

  ## Security Notes
  - SECURITY DEFINER functions run with creator privileges
  - These functions only return information about the current authenticated user
  - They cannot be exploited to access other users' data
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Project admins can view members in their project" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can view projects they belong to" ON projects;
DROP POLICY IF EXISTS "Super admins and project admins can create projects" ON projects;
DROP POLICY IF EXISTS "Project owners and super admins can update projects" ON projects;
DROP POLICY IF EXISTS "Project owners and super admins can delete projects" ON projects;

-- Create helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Create helper function to get current user's project_id
CREATE OR REPLACE FUNCTION get_user_project_id()
RETURNS UUID AS $$
  SELECT project_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Recreate user_profiles policies using helper functions
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Project admins can view members in their project"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('project_admin', 'super_admin')
    AND project_id = get_user_project_id()
  );

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Super admins can update any profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- Recreate projects policies using helper functions
CREATE POLICY "Users can view projects they belong to"
  ON projects FOR SELECT
  TO authenticated
  USING (id = get_user_project_id() OR get_user_role() = 'super_admin');

CREATE POLICY "Super admins and project admins can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('project_admin', 'super_admin'));

CREATE POLICY "Project owners and super admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR get_user_role() = 'super_admin')
  WITH CHECK (owner_id = auth.uid() OR get_user_role() = 'super_admin');

CREATE POLICY "Project owners and super admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR get_user_role() = 'super_admin');