/*
  # Enable Multi-Project System
  
  1. Changes
    - Remove single project restrictions
    - Allow users to create multiple projects
    - Add creator_id to track project owner
    - Update RLS policies to support multiple projects
    - Automatic owner assignment on project creation
  
  2. New Features
    - Users can create their own projects
    - Each project creator becomes the owner
    - Project members can belong to multiple projects
    - Settings restricted to project owners only
  
  3. Security
    - Users can only view projects they are members of
    - Only project owners can update project settings
    - Only owners and admins can manage members
    - All data access restricted by project membership
*/

-- Add creator_id column to projects table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN creator_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Update existing project to have a creator_id (set to first owner)
DO $$
DECLARE
  v_project_id uuid;
  v_owner_id uuid;
BEGIN
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Amz Kickstart by Pol Brullas'
  LIMIT 1;
  
  IF v_project_id IS NOT NULL THEN
    SELECT user_id INTO v_owner_id
    FROM project_members
    WHERE project_id = v_project_id AND role = 'owner'
    LIMIT 1;
    
    IF v_owner_id IS NOT NULL THEN
      UPDATE projects SET creator_id = v_owner_id WHERE id = v_project_id;
    END IF;
  END IF;
END $$;

-- Drop all policies that depend on get_single_project_id()
DROP POLICY IF EXISTS "Update project as owner or admin" ON projects;
DROP POLICY IF EXISTS "View all members" ON project_members;
DROP POLICY IF EXISTS "Insert members as owner or admin" ON project_members;
DROP POLICY IF EXISTS "Update members as owner or admin" ON project_members;
DROP POLICY IF EXISTS "Delete members as owner or admin" ON project_members;
DROP POLICY IF EXISTS "View leads as member" ON leads;
DROP POLICY IF EXISTS "Create leads as member" ON leads;
DROP POLICY IF EXISTS "Update leads as member" ON leads;
DROP POLICY IF EXISTS "Delete leads as member" ON leads;
DROP POLICY IF EXISTS "View meta leads as member" ON meta_leads;
DROP POLICY IF EXISTS "Create meta leads as member" ON meta_leads;
DROP POLICY IF EXISTS "Update meta leads as member" ON meta_leads;
DROP POLICY IF EXISTS "Delete meta leads as member" ON meta_leads;
DROP POLICY IF EXISTS "View invitation codes as member" ON invitation_codes;
DROP POLICY IF EXISTS "Create invitation codes as owner or admin" ON invitation_codes;
DROP POLICY IF EXISTS "Delete invitation codes as owner or admin" ON invitation_codes;
DROP POLICY IF EXISTS "Only owners and admins can update project" ON projects;
DROP POLICY IF EXISTS "All members can view leads" ON leads;
DROP POLICY IF EXISTS "All members can create leads" ON leads;
DROP POLICY IF EXISTS "All members can update leads" ON leads;
DROP POLICY IF EXISTS "All members can delete leads" ON leads;
DROP POLICY IF EXISTS "All members can view meta leads" ON meta_leads;
DROP POLICY IF EXISTS "All members can create meta leads" ON meta_leads;
DROP POLICY IF EXISTS "All members can update meta leads" ON meta_leads;
DROP POLICY IF EXISTS "All members can delete meta leads" ON meta_leads;
DROP POLICY IF EXISTS "All authenticated users can view all members" ON project_members;
DROP POLICY IF EXISTS "Owners and admins can insert members" ON project_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON project_members;
DROP POLICY IF EXISTS "Owners and admins can delete members" ON project_members;
DROP POLICY IF EXISTS "All members can view invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Owners and admins can create invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Owners and admins can delete invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Owners and admins can update invitation codes" ON invitation_codes;

-- Now drop the single project function
DROP FUNCTION IF EXISTS get_single_project_id() CASCADE;

-- Drop old project policies
DROP POLICY IF EXISTS "All authenticated users can view the single project" ON projects;
DROP POLICY IF EXISTS "Nobody can create projects" ON projects;
DROP POLICY IF EXISTS "Nobody can delete projects" ON projects;

-- Update trigger to add user as owner to their own projects only (not auto-add to all)
CREATE OR REPLACE FUNCTION add_user_as_project_owner()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a project is created, add the creator as owner
  IF NEW.creator_id IS NOT NULL THEN
    INSERT INTO project_members (project_id, user_id, role, email)
    SELECT 
      NEW.id,
      NEW.creator_id,
      'owner',
      u.email
    FROM auth.users u
    WHERE u.id = NEW.creator_id
    ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'owner';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_add_to_project ON auth.users;
DROP TRIGGER IF EXISTS on_project_created_add_owner ON projects;

-- Create new trigger for project creation
CREATE TRIGGER on_project_created_add_owner
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_user_as_project_owner();

-- Create RLS policies for projects table
CREATE POLICY "Users can view projects they are members of"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Project owners can update their projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
      AND project_members.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
      AND project_members.role = 'owner'
    )
  );

CREATE POLICY "Project owners can delete their projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
      AND project_members.role = 'owner'
    )
  );

-- Create RLS policies for project_members
CREATE POLICY "Users can view members of their projects"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can insert members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can delete members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    project_members.user_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

-- Create RLS policies for leads
CREATE POLICY "Project members can view leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = leads.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can create leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = leads.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = leads.project_id
      AND project_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = leads.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = leads.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Create RLS policies for meta_leads
CREATE POLICY "Project members can view meta leads"
  ON meta_leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = meta_leads.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can create meta leads"
  ON meta_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = meta_leads.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can update meta leads"
  ON meta_leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = meta_leads.project_id
      AND project_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = meta_leads.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can delete meta leads"
  ON meta_leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = meta_leads.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Create RLS policies for invitation_codes
CREATE POLICY "Project members can view invitation codes"
  ON invitation_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = invitation_codes.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can create invitation codes"
  ON invitation_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = invitation_codes.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update invitation codes"
  ON invitation_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = invitation_codes.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = invitation_codes.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can delete invitation codes"
  ON invitation_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = invitation_codes.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('owner', 'admin')
    )
  );