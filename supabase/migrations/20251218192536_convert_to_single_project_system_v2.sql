/*
  # Convert to Single Project System - Amz Kickstart by Pol Brullas
  
  1. Changes
    - Make user_id nullable in projects table for system project
    - Create a single fixed project called "Amz Kickstart by Pol Brullas"
    - Add 'owner' role to project_members
    - Remove ability to create/delete projects
    - All users become members of the single project
    - Add profile management permissions for administrators
  
  2. New Functions
    - Function to ensure single project exists
    - Function to auto-add users to the project
  
  3. Security Updates
    - Update RLS policies for single project access
    - Ensure all members can access the single project data
*/

-- Make user_id nullable for system projects
ALTER TABLE projects ALTER COLUMN user_id DROP NOT NULL;

-- Update role check in project_members to include 'owner'
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_role_check;
ALTER TABLE project_members ADD CONSTRAINT project_members_role_check 
  CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text]));

-- Add email column to project_members if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_members' AND column_name = 'email'
  ) THEN
    ALTER TABLE project_members ADD COLUMN email text;
  END IF;
END $$;

-- Create the single fixed project if it doesn't exist
DO $$
DECLARE
  v_project_id uuid;
BEGIN
  -- Check if project exists
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Amz Kickstart by Pol Brullas'
  LIMIT 1;
  
  -- If not exists, create it (with NULL user_id as it's a system project)
  IF v_project_id IS NULL THEN
    INSERT INTO projects (name, description, weekly_goal, user_id)
    VALUES (
      'Amz Kickstart by Pol Brullas',
      'Sistema centralizado de gestión de leads y ventas',
      50,
      NULL
    )
    RETURNING id INTO v_project_id;
  END IF;
END $$;

-- Function to get the single project ID
CREATE OR REPLACE FUNCTION get_single_project_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM projects WHERE name = 'Amz Kickstart by Pol Brullas' LIMIT 1;
$$;

-- Function to auto-add new users to the single project
CREATE OR REPLACE FUNCTION add_user_to_single_project()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id uuid;
  v_member_count int;
BEGIN
  -- Get the single project ID
  SELECT get_single_project_id() INTO v_project_id;
  
  -- Count existing members
  SELECT COUNT(*) INTO v_member_count FROM project_members WHERE project_id = v_project_id;
  
  -- Add user as member (first user becomes owner, rest become members)
  INSERT INTO project_members (project_id, user_id, role, email)
  VALUES (
    v_project_id,
    NEW.id,
    CASE WHEN v_member_count = 0 THEN 'owner' ELSE 'member' END,
    NEW.email
  )
  ON CONFLICT (project_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created_add_to_project ON auth.users;
CREATE TRIGGER on_auth_user_created_add_to_project
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION add_user_to_single_project();

-- Update RLS policies for projects table
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "All authenticated users can view the single project" ON projects;
DROP POLICY IF EXISTS "Only owners and admins can update project" ON projects;
DROP POLICY IF EXISTS "Nobody can create projects" ON projects;
DROP POLICY IF EXISTS "Nobody can delete projects" ON projects;

CREATE POLICY "All authenticated users can view the single project"
  ON projects FOR SELECT
  TO authenticated
  USING (name = 'Amz Kickstart by Pol Brullas');

CREATE POLICY "Only owners and admins can update project"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    name = 'Amz Kickstart by Pol Brullas'
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    name = 'Amz Kickstart by Pol Brullas'
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Nobody can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Nobody can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (false);

-- Update RLS policies for project_members
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Project owners and admins can manage members" ON project_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON project_members;
DROP POLICY IF EXISTS "All authenticated users can view all members" ON project_members;
DROP POLICY IF EXISTS "Owners and admins can insert members" ON project_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON project_members;
DROP POLICY IF EXISTS "Owners and admins can delete members" ON project_members;

CREATE POLICY "All authenticated users can view all members"
  ON project_members FOR SELECT
  TO authenticated
  USING (project_id = get_single_project_id());

CREATE POLICY "Owners and admins can insert members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can delete members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    project_id = get_single_project_id()
    AND user_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Update RLS policies for leads
DROP POLICY IF EXISTS "Users can view project leads" ON leads;
DROP POLICY IF EXISTS "Users can create leads in their projects" ON leads;
DROP POLICY IF EXISTS "Users can update leads in their projects" ON leads;
DROP POLICY IF EXISTS "Users can delete leads in their projects" ON leads;
DROP POLICY IF EXISTS "All members can view leads" ON leads;
DROP POLICY IF EXISTS "All members can create leads" ON leads;
DROP POLICY IF EXISTS "All members can update leads" ON leads;
DROP POLICY IF EXISTS "All members can delete leads" ON leads;

CREATE POLICY "All members can view leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "All members can create leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "All members can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "All members can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
    )
  );

-- Update RLS policies for meta_leads
DROP POLICY IF EXISTS "Users can view meta leads from their projects" ON meta_leads;
DROP POLICY IF EXISTS "Users can create meta leads for their projects" ON meta_leads;
DROP POLICY IF EXISTS "Users can update meta leads in their projects" ON meta_leads;
DROP POLICY IF EXISTS "Users can delete meta leads in their projects" ON meta_leads;
DROP POLICY IF EXISTS "All members can view meta leads" ON meta_leads;
DROP POLICY IF EXISTS "All members can create meta leads" ON meta_leads;
DROP POLICY IF EXISTS "All members can update meta leads" ON meta_leads;
DROP POLICY IF EXISTS "All members can delete meta leads" ON meta_leads;

CREATE POLICY "All members can view meta leads"
  ON meta_leads FOR SELECT
  TO authenticated
  USING (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "All members can create meta leads"
  ON meta_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "All members can update meta leads"
  ON meta_leads FOR UPDATE
  TO authenticated
  USING (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "All members can delete meta leads"
  ON meta_leads FOR DELETE
  TO authenticated
  USING (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
    )
  );

-- Update RLS policies for invitation_codes
DROP POLICY IF EXISTS "Project members can view invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Project admins can create invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Project admins can delete invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "All members can view invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Owners and admins can create invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Owners and admins can delete invitation codes" ON invitation_codes;

CREATE POLICY "All members can view invitation codes"
  ON invitation_codes FOR SELECT
  TO authenticated
  USING (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can create invitation codes"
  ON invitation_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can delete invitation codes"
  ON invitation_codes FOR DELETE
  TO authenticated
  USING (
    project_id = get_single_project_id()
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = get_single_project_id()
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );