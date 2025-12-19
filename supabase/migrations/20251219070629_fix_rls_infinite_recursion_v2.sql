/*
  # Fix RLS Infinite Recursion Issue

  1. Problem
    - Current RLS policies on project_members reference themselves
    - This creates infinite recursion when checking permissions
    - Users cannot view or create projects

  2. Solution
    - Create helper function with SECURITY DEFINER to check membership
    - This function bypasses RLS policies to avoid recursion
    - Update all policies to use this helper function
    - Simplify project_members policies

  3. Security
    - Helper function only checks membership, doesn't expose data
    - All policies still enforce proper access control
    - Users can only access projects they are members of
*/

-- Drop all existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view projects they are members of" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
DROP POLICY IF EXISTS "Project owners can update their projects" ON projects;
DROP POLICY IF EXISTS "Project owners can delete their projects" ON projects;
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Owners and admins can insert members" ON project_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON project_members;
DROP POLICY IF EXISTS "Owners and admins can delete members" ON project_members;
DROP POLICY IF EXISTS "Project members can view leads" ON leads;
DROP POLICY IF EXISTS "Project members can create leads" ON leads;
DROP POLICY IF EXISTS "Project members can update leads" ON leads;
DROP POLICY IF EXISTS "Project members can delete leads" ON leads;
DROP POLICY IF EXISTS "Project members can view meta leads" ON meta_leads;
DROP POLICY IF EXISTS "Project members can create meta leads" ON meta_leads;
DROP POLICY IF EXISTS "Project members can update meta leads" ON meta_leads;
DROP POLICY IF EXISTS "Project members can delete meta leads" ON meta_leads;
DROP POLICY IF EXISTS "Project members can view invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Owners and admins can create invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Owners and admins can update invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Owners and admins can delete invitation codes" ON invitation_codes;

-- Drop existing helper functions
DROP FUNCTION IF EXISTS is_project_member(uuid, uuid);
DROP FUNCTION IF EXISTS is_project_owner_or_admin(uuid, uuid);

-- Create helper functions with SECURITY DEFINER to avoid RLS recursion
CREATE FUNCTION is_project_member(project_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_uuid
    AND user_id = user_uuid
  );
$$;

CREATE FUNCTION is_project_owner_or_admin(project_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_uuid
    AND user_id = user_uuid
    AND role IN ('owner', 'admin')
  );
$$;

-- Projects policies using helper functions
CREATE POLICY "Users can view projects they are members of"
  ON projects FOR SELECT
  TO authenticated
  USING (is_project_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Project owners can update their projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (is_project_owner_or_admin(id, auth.uid()))
  WITH CHECK (is_project_owner_or_admin(id, auth.uid()));

CREATE POLICY "Project owners can delete their projects"
  ON projects FOR DELETE
  TO authenticated
  USING (is_project_owner_or_admin(id, auth.uid()));

-- Simplified project_members policies (no self-reference)
CREATE POLICY "Users can view members of their projects"
  ON project_members FOR SELECT
  TO authenticated
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Owners and admins can insert members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (is_project_owner_or_admin(project_id, auth.uid()));

CREATE POLICY "Owners and admins can update members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (is_project_owner_or_admin(project_id, auth.uid()))
  WITH CHECK (is_project_owner_or_admin(project_id, auth.uid()));

CREATE POLICY "Owners and admins can delete members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    user_id != auth.uid()
    AND is_project_owner_or_admin(project_id, auth.uid())
  );

-- Leads policies
CREATE POLICY "Project members can view leads"
  ON leads FOR SELECT
  TO authenticated
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project members can create leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project members can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (is_project_member(project_id, auth.uid()))
  WITH CHECK (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project members can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (is_project_member(project_id, auth.uid()));

-- Meta leads policies
CREATE POLICY "Project members can view meta leads"
  ON meta_leads FOR SELECT
  TO authenticated
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project members can create meta leads"
  ON meta_leads FOR INSERT
  TO authenticated
  WITH CHECK (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project members can update meta leads"
  ON meta_leads FOR UPDATE
  TO authenticated
  USING (is_project_member(project_id, auth.uid()))
  WITH CHECK (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project members can delete meta leads"
  ON meta_leads FOR DELETE
  TO authenticated
  USING (is_project_member(project_id, auth.uid()));

-- Invitation codes policies
CREATE POLICY "Project members can view invitation codes"
  ON invitation_codes FOR SELECT
  TO authenticated
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Owners and admins can create invitation codes"
  ON invitation_codes FOR INSERT
  TO authenticated
  WITH CHECK (is_project_owner_or_admin(project_id, auth.uid()));

CREATE POLICY "Owners and admins can update invitation codes"
  ON invitation_codes FOR UPDATE
  TO authenticated
  USING (is_project_owner_or_admin(project_id, auth.uid()))
  WITH CHECK (is_project_owner_or_admin(project_id, auth.uid()));

CREATE POLICY "Owners and admins can delete invitation codes"
  ON invitation_codes FOR DELETE
  TO authenticated
  USING (is_project_owner_or_admin(project_id, auth.uid()));
