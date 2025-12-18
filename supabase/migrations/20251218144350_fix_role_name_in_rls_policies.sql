/*
  # Fix Role Name in RLS Policies

  ## Issue
  Several RLS policies were checking for role 'admin' but the actual role name in the database is 'project_admin'.
  This prevented project admins from performing authorized actions.

  ## Changes
  Update all RLS policies to use the correct role name 'project_admin' instead of 'admin':
  - Projects table policies
  - Leads table policies  
  - Meta leads table policies
  - Project invitations table policies

  ## Security Notes
  - Maintains existing security model
  - Corrects authorization checks to match actual role names
*/

-- Fix projects policies
DROP POLICY IF EXISTS "Super admins and project admins can create projects" ON projects;
CREATE POLICY "Super admins and project admins can create projects" 
ON projects FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.role IN ('project_admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Project admins can view members in their project" ON user_profiles;
CREATE POLICY "Project admins can view members in their project" 
ON user_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles admin_profile
    WHERE admin_profile.id = (select auth.uid())
    AND admin_profile.project_id = user_profiles.project_id
    AND admin_profile.role IN ('project_admin', 'super_admin')
  )
);

-- Fix leads policies
DROP POLICY IF EXISTS "Project admins and super admins can delete leads" ON leads;
CREATE POLICY "Project admins and super admins can delete leads" 
ON leads FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = leads.project_id
    AND user_profiles.role IN ('project_admin', 'super_admin')
  )
);

-- Fix meta_leads policies
DROP POLICY IF EXISTS "Project admins can delete meta leads in their project" ON meta_leads;
CREATE POLICY "Project admins can delete meta leads in their project" 
ON meta_leads FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = meta_leads.project_id
    AND user_profiles.role IN ('project_admin', 'super_admin')
  )
);

-- Fix project_invitations policies
DROP POLICY IF EXISTS "Project admins can view invitations for their project" ON project_invitations;
CREATE POLICY "Project admins can view invitations for their project" 
ON project_invitations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = project_invitations.project_id
    AND user_profiles.role IN ('project_admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Project admins can create invitations for their project" ON project_invitations;
CREATE POLICY "Project admins can create invitations for their project" 
ON project_invitations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = project_invitations.project_id
    AND user_profiles.role IN ('project_admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Project admins can update invitations for their project" ON project_invitations;
CREATE POLICY "Project admins can update invitations for their project" 
ON project_invitations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = project_invitations.project_id
    AND user_profiles.role IN ('project_admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = (select auth.uid())
    AND user_profiles.project_id = project_invitations.project_id
    AND user_profiles.role IN ('project_admin', 'super_admin')
  )
);