/*
  # Fix RLS Policies for Invitation Codes
  
  1. Changes
    - Add UPDATE policy for invitation_codes table
    - Ensure owners and admins can modify invitation codes
  
  2. Security
    - Only owners and admins can update invitation codes
    - Maintains existing SELECT, INSERT, and DELETE policies
*/

-- Drop existing UPDATE policy if exists
DROP POLICY IF EXISTS "Owners and admins can update invitation codes" ON invitation_codes;

-- Create UPDATE policy for invitation_codes
CREATE POLICY "Owners and admins can update invitation codes"
  ON invitation_codes FOR UPDATE
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