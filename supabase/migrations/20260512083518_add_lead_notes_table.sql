/*
  # Add Lead Notes Table

  1. New Tables
    - `lead_notes`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, foreign key to leads)
      - `project_id` (uuid, foreign key to projects)
      - `user_id` (uuid, references auth.users)
      - `content` (text, the note content)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `lead_notes` table
    - Add policies for authenticated project members to manage notes
*/

CREATE TABLE IF NOT EXISTS lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view lead notes"
  ON lead_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = lead_notes.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can create lead notes"
  ON lead_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = lead_notes.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own notes"
  ON lead_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
