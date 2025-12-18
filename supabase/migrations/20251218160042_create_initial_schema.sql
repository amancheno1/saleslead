/*
  # Crear esquema inicial del sistema

  1. Nuevas Tablas
    - `projects`: Proyectos de cada usuario
      - `id` (uuid, primary key)
      - `user_id` (uuid, not null) - Propietario del proyecto
      - `name` (text, not null)
      - `description` (text)
      - `weekly_goal` (integer, default 50)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `leads`: Leads de los proyectos
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `user_id` (uuid) - Usuario que creó el lead
      - `first_name` (text, not null)
      - `last_name` (text, not null)
      - `form_type` (text, not null)
      - `entry_date` (date, default now)
      - `contact_date` (date)
      - `scheduled_call_date` (date)
      - `attended_meeting` (boolean)
      - `result` (text)
      - `sale_made` (boolean, default false)
      - `observations` (text)
      - `sale_amount` (numeric)
      - `payment_method` (text)
      - `cash_collected` (numeric)
      - `closer` (text)
      - `installment_count` (integer)
      - `initial_payment` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `meta_leads`: Registro semanal de leads de Meta
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `user_id` (uuid, not null)
      - `week_start_date` (date, not null)
      - `week_number` (integer, not null)
      - `year` (integer, not null)
      - `leads_count` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `settings`: Configuración global
      - `id` (uuid, primary key)
      - `weekly_goal` (integer, default 50)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas para que cada usuario solo acceda a sus propios datos
*/

-- Crear tabla projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  weekly_goal integer DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla leads
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  form_type text NOT NULL,
  entry_date date DEFAULT CURRENT_DATE,
  contact_date date,
  scheduled_call_date date,
  attended_meeting boolean,
  result text,
  sale_made boolean DEFAULT false,
  observations text,
  sale_amount numeric,
  payment_method text,
  cash_collected numeric,
  closer text,
  installment_count integer,
  initial_payment numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla meta_leads
CREATE TABLE IF NOT EXISTS meta_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  week_number integer NOT NULL,
  year integer NOT NULL,
  leads_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, week_start_date)
);

-- Crear tabla settings
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_goal integer DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_project_id ON leads(project_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_leads_project_id ON meta_leads(project_id);

-- Habilitar RLS en todas las tablas
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Políticas para projects: Los usuarios solo ven sus propios proyectos
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para leads: Los usuarios solo ven leads de sus proyectos
CREATE POLICY "Users can view own project leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert leads to own projects"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Políticas para meta_leads: Los usuarios solo ven meta_leads de sus proyectos
CREATE POLICY "Users can view own project meta_leads"
  ON meta_leads FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert meta_leads to own projects"
  ON meta_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project meta_leads"
  ON meta_leads FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project meta_leads"
  ON meta_leads FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Políticas para settings: Todos pueden ver y modificar (configuración global)
CREATE POLICY "Anyone can view settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meta_leads_updated_at BEFORE UPDATE ON meta_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
