/*
  # Add project_tags table and fix lead_tags

  1. New Tables
    - `project_tags` - Available tags for a project
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `name` (text) - Tag name
      - `color` (text) - Tag color hex
      - `created_at` (timestamptz)

  2. Modifications
    - Add `project_id` column to `lead_tags` table

  3. Security
    - Enable RLS on project_tags
    - Add policies for project members
*/

-- Create project_tags table
CREATE TABLE IF NOT EXISTS project_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, name)
);

ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view project tags"
  ON project_tags FOR SELECT
  TO authenticated
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Members can create project tags"
  ON project_tags FOR INSERT
  TO authenticated
  WITH CHECK (is_project_member(project_id, auth.uid()));

CREATE POLICY "Owners can update project tags"
  ON project_tags FOR UPDATE
  TO authenticated
  USING (is_project_owner_or_admin(project_id, auth.uid()))
  WITH CHECK (is_project_owner_or_admin(project_id, auth.uid()));

CREATE POLICY "Owners can delete project tags"
  ON project_tags FOR DELETE
  TO authenticated
  USING (is_project_owner_or_admin(project_id, auth.uid()));

-- Add project_id to lead_tags if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_tags' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE lead_tags ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON project_tags(project_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead_id ON lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_status ON leads(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON appointments(lead_id);
