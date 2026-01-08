/*
  # Fix RLS Infinite Recursion - Final Solution

  1. Problem
    - Infinite recursion detected in RLS policies
    - Projects and project_members policies are calling each other
    - This prevents users from seeing their projects

  2. Solution
    - Drop all existing policies
    - Create clean, non-recursive policies using SECURITY DEFINER functions
    - The functions break recursion because they bypass RLS when checking membership

  3. Security
    - All policies verify authenticated users
    - Projects: Only members can view/modify
    - Project_members: Only owners can manage members
*/

-- Drop all existing policies for projects
DROP POLICY IF EXISTS "Users can view projects they are members of" ON projects;
DROP POLICY IF EXISTS "Users can view their projects" ON projects;
DROP POLICY IF EXISTS "Project owners can update their projects" ON projects;
DROP POLICY IF EXISTS "Only owners can update projects" ON projects;
DROP POLICY IF EXISTS "Project owners can delete their projects" ON projects;
DROP POLICY IF EXISTS "Only owners can delete projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;

-- Drop all existing policies for project_members
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Members can view other members" ON project_members;
DROP POLICY IF EXISTS "Owners and admins can insert members" ON project_members;
DROP POLICY IF EXISTS "Only owners can add members" ON project_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON project_members;
DROP POLICY IF EXISTS "Only owners can update members" ON project_members;
DROP POLICY IF EXISTS "Owners and admins can delete members" ON project_members;
DROP POLICY IF EXISTS "Only owners can remove members" ON project_members;

-- Create simple, non-recursive policies for projects
CREATE POLICY "Members can view their projects"
  ON projects FOR SELECT
  TO authenticated
  USING (is_project_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Owners can update their projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (is_project_owner_or_admin(id, auth.uid()))
  WITH CHECK (is_project_owner_or_admin(id, auth.uid()));

CREATE POLICY "Owners can delete their projects"
  ON projects FOR DELETE
  TO authenticated
  USING (is_project_owner_or_admin(id, auth.uid()));

-- Create simple, non-recursive policies for project_members
CREATE POLICY "Members can view project members"
  ON project_members FOR SELECT
  TO authenticated
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Owners can add members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (is_project_owner_or_admin(project_id, auth.uid()));

CREATE POLICY "Owners can update members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (is_project_owner_or_admin(project_id, auth.uid()))
  WITH CHECK (is_project_owner_or_admin(project_id, auth.uid()));

CREATE POLICY "Owners can remove members"
  ON project_members FOR DELETE
  TO authenticated
  USING (is_project_owner_or_admin(project_id, auth.uid()));
