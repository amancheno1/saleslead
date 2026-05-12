/*
  # Add Follow-ups and Automations System

  1. New Tables
    - `follow_ups`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `lead_id` (uuid, references leads)
      - `user_id` (uuid, references auth.users)
      - `type` (text) - tipo de seguimiento: call, whatsapp, email, manychat
      - `status` (text) - pending, completed, skipped
      - `scheduled_date` (date)
      - `scheduled_time` (time)
      - `completed_at` (timestamptz)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `automations`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `user_id` (uuid, references auth.users)
      - `name` (text) - nombre del flujo
      - `description` (text)
      - `trigger_type` (text) - new_lead, no_show, no_answer, post_sale
      - `channel` (text) - manychat, whatsapp, email
      - `is_active` (boolean)
      - `steps` (jsonb) - array of automation steps
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Policies for authenticated users who are project members
*/

CREATE TABLE IF NOT EXISTS follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL DEFAULT 'call',
  status text NOT NULL DEFAULT 'pending',
  scheduled_date date NOT NULL,
  scheduled_time time,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL DEFAULT 'new_lead',
  channel text NOT NULL DEFAULT 'manychat',
  is_active boolean DEFAULT false,
  steps jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view follow_ups"
  ON follow_ups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = follow_ups.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can insert follow_ups"
  ON follow_ups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = follow_ups.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can update follow_ups"
  ON follow_ups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = follow_ups.project_id
      AND project_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = follow_ups.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can delete follow_ups"
  ON follow_ups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = follow_ups.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can view automations"
  ON automations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = automations.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can insert automations"
  ON automations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = automations.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can update automations"
  ON automations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = automations.project_id
      AND project_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = automations.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can delete automations"
  ON automations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = automations.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_follow_ups_project_id ON follow_ups(project_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_date ON follow_ups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_automations_project_id ON automations(project_id);
