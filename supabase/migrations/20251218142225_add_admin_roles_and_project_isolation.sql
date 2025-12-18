/*
  # Add Admin Roles and Project-Based Isolation

  ## Overview
  Implements a comprehensive role-based access control system with project isolation.
  
  ## New Tables
  
  ### `user_profiles`
  Stores extended user information including roles.
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'super_admin', 'project_admin', or 'member'
  - `project_id` (uuid, nullable) - Assigned project (null for super_admin)
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### `project_invitations`
  Stores invitation codes for users to join projects.
  - `id` (uuid, primary key) - Unique identifier
  - `project_id` (uuid) - The project this invitation is for
  - `invitation_code` (text, unique) - Unique code to join the project
  - `role` (text) - Role to assign: 'project_admin' or 'member'
  - `created_by` (uuid) - User who created the invitation
  - `expires_at` (timestamptz) - When the invitation expires
  - `max_uses` (integer, nullable) - Maximum number of times this code can be used
  - `current_uses` (integer) - Current number of uses
  - `is_active` (boolean) - Whether the invitation is still active
  - `created_at` (timestamptz) - Record creation timestamp

  ## Modified Tables
  
  ### `projects`
  - Add `is_active` (boolean) - Whether the project is active
  - Add `owner_id` (uuid) - The super admin or project admin who owns this project
  
  ## Security Changes
  
  ### Role Hierarchy
  1. **super_admin**: Can create/manage all projects and users
  2. **project_admin**: Can manage their own project and its members
  3. **member**: Can only view/edit data within their assigned project
  
  ### RLS Policies
  - Super admins can access all data
  - Project admins can access all data in their project
  - Members can only access data in their assigned project
  - All policies enforce project isolation
  
  ## Important Notes
  1. Users must be assigned to a project (except super_admins)
  2. Project data is completely isolated between projects
  3. Super admins have system-wide access
  4. Project admins are the owners of their projects
  5. Members can only see their project's data
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('super_admin', 'project_admin', 'member')),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns to projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE projects ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update existing projects to set owner_id from user_id
UPDATE projects SET owner_id = user_id WHERE owner_id IS NULL;

-- Create project_invitations table
CREATE TABLE IF NOT EXISTS project_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  invitation_code text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('project_admin', 'member')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  max_uses integer,
  current_uses integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with role-based access
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON leads;

-- User Profiles Policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Project admins can view members in their project"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'project_admin'
      AND up.project_id = user_profiles.project_id
    )
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Super admins can update any profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Projects Policies
CREATE POLICY "Users can view projects they belong to"
  ON projects FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    -- Project admins and members can see their project
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.project_id = projects.id
    )
    OR
    -- Project owners can see their projects
    owner_id = auth.uid()
  );

CREATE POLICY "Super admins and project admins can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'project_admin')
    )
  );

CREATE POLICY "Project owners and super admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Project owners and super admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Leads Policies (project-based isolation)
CREATE POLICY "Users can view leads in their project"
  ON leads FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    -- Users can see leads in their project
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.project_id = leads.project_id
    )
  );

CREATE POLICY "Users can insert leads in their project"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        user_profiles.role = 'super_admin'
        OR user_profiles.project_id = leads.project_id
      )
    )
  );

CREATE POLICY "Users can update leads in their project"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        user_profiles.role = 'super_admin'
        OR user_profiles.project_id = leads.project_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        user_profiles.role = 'super_admin'
        OR user_profiles.project_id = leads.project_id
      )
    )
  );

CREATE POLICY "Project admins and super admins can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'project_admin')
      AND (
        user_profiles.role = 'super_admin'
        OR user_profiles.project_id = leads.project_id
      )
    )
  );

-- Project Invitations Policies
CREATE POLICY "Project admins can view invitations for their project"
  ON project_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        user_profiles.role = 'super_admin'
        OR (user_profiles.role = 'project_admin' AND user_profiles.project_id = project_invitations.project_id)
      )
    )
  );

CREATE POLICY "Project admins can create invitations for their project"
  ON project_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        user_profiles.role = 'super_admin'
        OR (user_profiles.role = 'project_admin' AND user_profiles.project_id = project_invitations.project_id)
      )
    )
  );

CREATE POLICY "Project admins can update invitations for their project"
  ON project_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        user_profiles.role = 'super_admin'
        OR (user_profiles.role = 'project_admin' AND user_profiles.project_id = project_invitations.project_id)
      )
    )
  );

-- Meta Leads Policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meta_leads') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own meta leads" ON meta_leads';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own meta leads" ON meta_leads';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own meta leads" ON meta_leads';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own meta leads" ON meta_leads';
    
    EXECUTE 'CREATE POLICY "Users can view meta leads in their project"
      ON meta_leads FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND (
            user_profiles.role = ''super_admin''
            OR user_profiles.project_id = meta_leads.project_id
          )
        )
      )';
    
    EXECUTE 'CREATE POLICY "Users can insert meta leads in their project"
      ON meta_leads FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND (
            user_profiles.role = ''super_admin''
            OR user_profiles.project_id = meta_leads.project_id
          )
        )
      )';
    
    EXECUTE 'CREATE POLICY "Users can update meta leads in their project"
      ON meta_leads FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND (
            user_profiles.role = ''super_admin''
            OR user_profiles.project_id = meta_leads.project_id
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND (
            user_profiles.role = ''super_admin''
            OR user_profiles.project_id = meta_leads.project_id
          )
        )
      )';
    
    EXECUTE 'CREATE POLICY "Project admins can delete meta leads in their project"
      ON meta_leads FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN (''super_admin'', ''project_admin'')
          AND (
            user_profiles.role = ''super_admin''
            OR user_profiles.project_id = meta_leads.project_id
          )
        )
      )';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_project_id ON user_profiles(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);
CREATE INDEX IF NOT EXISTS idx_project_invitations_code ON project_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);

-- Create trigger for user_profiles updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate random invitation codes
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS text AS $$
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
$$ LANGUAGE plpgsql;