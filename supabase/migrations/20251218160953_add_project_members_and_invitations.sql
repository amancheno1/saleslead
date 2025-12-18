/*
  # Sistema de Miembros e Invitaciones

  ## Descripción
  Esta migración implementa un sistema completo de gestión de miembros y códigos de invitación
  para que los administradores puedan invitar usuarios a sus proyectos.

  ## Nuevas Tablas

  ### `project_members`
  Gestiona la relación entre usuarios y proyectos con sus roles
  - `id` (uuid, PK) - Identificador único
  - `project_id` (uuid, FK) - Referencia al proyecto
  - `user_id` (uuid, FK) - Referencia al usuario de auth.users
  - `role` (text) - Rol del usuario: 'admin' o 'member'
  - `joined_at` (timestamptz) - Fecha de unión al proyecto
  - Constraint único en (project_id, user_id)

  ### `invitation_codes`
  Almacena códigos de invitación para unirse a proyectos
  - `id` (uuid, PK) - Identificador único
  - `project_id` (uuid, FK) - Referencia al proyecto
  - `code` (text, unique) - Código de invitación único
  - `created_by` (uuid, FK) - Usuario que creó el código
  - `created_at` (timestamptz) - Fecha de creación
  - `expires_at` (timestamptz, nullable) - Fecha de expiración opcional
  - `max_uses` (int, nullable) - Máximo de usos permitidos (null = ilimitado)
  - `uses_count` (int) - Contador de usos actuales
  - `is_active` (boolean) - Si el código está activo

  ## Datos Iniciales
  - Crea automáticamente registros en `project_members` para todos los propietarios actuales de proyectos
  - Los marca con rol 'admin'

  ## Seguridad (RLS)

  ### project_members
  - Los usuarios pueden ver miembros de proyectos donde ellos son miembros
  - Solo los admins pueden agregar/eliminar miembros
  - Los admins pueden actualizar roles de otros miembros

  ### invitation_codes
  - Los miembros pueden ver códigos de sus proyectos
  - Solo los admins pueden crear códigos
  - Solo los admins pueden actualizar/desactivar códigos
  - Cualquier usuario autenticado puede usar un código para unirse (con función especial)

  ## Índices
  - Índice en project_members(project_id) para búsquedas rápidas
  - Índice en project_members(user_id) para búsquedas por usuario
  - Índice único en invitation_codes(code) para validación rápida
  - Índice en invitation_codes(project_id) para búsquedas por proyecto
*/

-- Crear tabla de miembros del proyecto
CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Crear tabla de códigos de invitación
CREATE TABLE IF NOT EXISTS invitation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  max_uses int,
  uses_count int DEFAULT 0,
  is_active boolean DEFAULT true
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_project_id ON invitation_codes(project_id);

-- Migrar datos existentes: todos los propietarios de proyectos se convierten en admins
INSERT INTO project_members (project_id, user_id, role, joined_at)
SELECT id, user_id, 'admin', created_at
FROM projects
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Habilitar RLS en ambas tablas
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para project_members

-- Los usuarios pueden ver miembros de proyectos donde ellos son miembros
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

-- Solo los admins pueden agregar nuevos miembros
CREATE POLICY "Admins can add members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );

-- Solo los admins pueden actualizar roles
CREATE POLICY "Admins can update member roles"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );

-- Solo los admins pueden eliminar miembros
CREATE POLICY "Admins can remove members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );

-- Políticas RLS para invitation_codes

-- Los miembros pueden ver códigos de sus proyectos
CREATE POLICY "Members can view invitation codes of their projects"
  ON invitation_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Solo los admins pueden crear códigos
CREATE POLICY "Admins can create invitation codes"
  ON invitation_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );

-- Solo los admins pueden actualizar códigos
CREATE POLICY "Admins can update invitation codes"
  ON invitation_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );

-- Solo los admins pueden eliminar códigos
CREATE POLICY "Admins can delete invitation codes"
  ON invitation_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );

-- Función para validar y usar un código de invitación
CREATE OR REPLACE FUNCTION use_invitation_code(invitation_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id uuid;
  v_code_id uuid;
  v_max_uses int;
  v_uses_count int;
  v_expires_at timestamptz;
BEGIN
  -- Buscar el código de invitación activo
  SELECT id, project_id, max_uses, uses_count, expires_at
  INTO v_code_id, v_project_id, v_max_uses, v_uses_count, v_expires_at
  FROM invitation_codes
  WHERE code = invitation_code
  AND is_active = true;

  -- Verificar si el código existe
  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Código de invitación inválido o inactivo';
  END IF;

  -- Verificar si ha expirado
  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RAISE EXCEPTION 'El código de invitación ha expirado';
  END IF;

  -- Verificar si ha alcanzado el máximo de usos
  IF v_max_uses IS NOT NULL AND v_uses_count >= v_max_uses THEN
    RAISE EXCEPTION 'El código de invitación ha alcanzado su límite de usos';
  END IF;

  -- Verificar si el usuario ya es miembro
  IF EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = v_project_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Ya eres miembro de este proyecto';
  END IF;

  -- Agregar al usuario como miembro
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (v_project_id, auth.uid(), 'member');

  -- Incrementar el contador de usos
  UPDATE invitation_codes
  SET uses_count = uses_count + 1
  WHERE id = v_code_id;

  -- Retornar el ID del proyecto
  RETURN v_project_id;
END;
$$;

-- Actualizar la política de acceso a proyectos para considerar miembros
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view their projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
    )
  );

-- Solo los admins o propietarios pueden actualizar proyectos
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );

-- Solo los propietarios pueden eliminar proyectos
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Owners can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Actualizar políticas de leads para permitir acceso a miembros del proyecto
DROP POLICY IF EXISTS "Users can view own project leads" ON leads;
CREATE POLICY "Members can view project leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = leads.project_id
      AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert leads to own projects" ON leads;
CREATE POLICY "Members can insert project leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = leads.project_id
      AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own project leads" ON leads;
CREATE POLICY "Members can update project leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = leads.project_id
      AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = leads.project_id
      AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own project leads" ON leads;
CREATE POLICY "Members can delete project leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = leads.project_id
      AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
    )
  );

-- Actualizar políticas de meta_leads para permitir acceso a miembros del proyecto
DROP POLICY IF EXISTS "Users can view own project meta_leads" ON meta_leads;
CREATE POLICY "Members can view project meta leads"
  ON meta_leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = meta_leads.project_id
      AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert meta_leads to own projects" ON meta_leads;
CREATE POLICY "Members can insert project meta leads"
  ON meta_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = meta_leads.project_id
      AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own project meta_leads" ON meta_leads;
CREATE POLICY "Members can update project meta leads"
  ON meta_leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = meta_leads.project_id
      AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = meta_leads.project_id
      AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own project meta_leads" ON meta_leads;
CREATE POLICY "Members can delete project meta leads"
  ON meta_leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = meta_leads.project_id
      AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
    )
  );