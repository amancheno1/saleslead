/*
  # Add Meta Leads Tracking System

  1. New Tables
    - `meta_leads`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `user_id` (uuid, foreign key to auth.users)
      - `week_start_date` (date) - Start date of the week
      - `week_number` (integer) - Week number of the year
      - `year` (integer) - Year
      - `leads_count` (integer) - Number of leads from Meta for that week
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `meta_leads` table
    - Add policy for authenticated users to read their own project data
    - Add policy for authenticated users to insert their own project data
    - Add policy for authenticated users to update their own project data
    - Add policy for authenticated users to delete their own project data

  3. Indexes
    - Add index on project_id for faster queries
    - Add index on week_start_date for date-based queries
    - Add unique constraint on project_id + week_start_date
*/

CREATE TABLE IF NOT EXISTS meta_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  week_number integer NOT NULL,
  year integer NOT NULL,
  leads_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE meta_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meta leads from their projects"
  ON meta_leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = meta_leads.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert meta leads to their projects"
  ON meta_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = meta_leads.project_id
      AND projects.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update meta leads from their projects"
  ON meta_leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = meta_leads.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = meta_leads.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete meta leads from their projects"
  ON meta_leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = meta_leads.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_meta_leads_project_id ON meta_leads(project_id);
CREATE INDEX IF NOT EXISTS idx_meta_leads_week_start_date ON meta_leads(week_start_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_leads_project_week ON meta_leads(project_id, week_start_date);