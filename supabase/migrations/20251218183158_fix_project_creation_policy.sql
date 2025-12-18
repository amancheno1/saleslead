/*
  # Fix Project Creation and Member Addition Policies

  ## Descripción
  Corrige las políticas RLS para permitir:
  - Creación de proyectos sin problemas
  - Propietarios de proyectos pueden agregar miembros
  - Propietarios automáticamente pueden ver sus proyectos

  ## Cambios

  1. Ajustar política INSERT de project_members para permitir a propietarios agregar miembros
  2. Asegurar que las políticas permitan el flujo correcto de creación

  ## Notas
  - El propietario del proyecto (user_id en tabla projects) debe poder agregar miembros
  - Los admins existentes también pueden agregar miembros
*/

-- Eliminar política restrictiva de INSERT en project_members
DROP POLICY IF EXISTS "Admins can add members to their projects" ON project_members;

-- Crear nueva política que permite a propietarios y admins agregar miembros
CREATE POLICY "Project owners and admins can add members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- El usuario es el propietario del proyecto
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id
      AND p.user_id = (select auth.uid())
    )
    OR
    -- O el usuario es un admin existente del proyecto
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  );

-- Actualizar política UPDATE para incluir propietarios
DROP POLICY IF EXISTS "Admins can update member roles in their projects" ON project_members;
CREATE POLICY "Project owners and admins can update member roles"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    -- El usuario es el propietario del proyecto
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id
      AND p.user_id = (select auth.uid())
    )
    OR
    -- O el usuario es un admin del proyecto
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id
      AND p.user_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  );

-- Actualizar política DELETE para incluir propietarios
DROP POLICY IF EXISTS "Admins can remove members from their projects" ON project_members;
CREATE POLICY "Project owners and admins can remove members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    -- El usuario es el propietario del proyecto
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id
      AND p.user_id = (select auth.uid())
    )
    OR
    -- O el usuario es un admin del proyecto
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  );

-- Actualizar política SELECT para incluir propietarios explícitamente
DROP POLICY IF EXISTS "Users can view members if they are project members" ON project_members;
CREATE POLICY "Project members and owners can view members"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    -- El usuario es el propietario del proyecto
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id
      AND p.user_id = (select auth.uid())
    )
    OR
    -- O el usuario es miembro del proyecto
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = (select auth.uid())
    )
  );

-- Actualizar políticas de invitation_codes para incluir propietarios
DROP POLICY IF EXISTS "Members can view invitation codes of their projects" ON invitation_codes;
CREATE POLICY "Project members and owners can view invitation codes"
  ON invitation_codes FOR SELECT
  TO authenticated
  USING (
    -- El usuario es el propietario del proyecto
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = invitation_codes.project_id
      AND p.user_id = (select auth.uid())
    )
    OR
    -- O el usuario es miembro del proyecto
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can create invitation codes" ON invitation_codes;
CREATE POLICY "Project owners and admins can create invitation codes"
  ON invitation_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    -- El usuario es el propietario del proyecto
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = invitation_codes.project_id
      AND p.user_id = (select auth.uid())
    )
    OR
    -- O el usuario es admin del proyecto
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update invitation codes" ON invitation_codes;
CREATE POLICY "Project owners and admins can update invitation codes"
  ON invitation_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = invitation_codes.project_id
      AND p.user_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = invitation_codes.project_id
      AND p.user_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete invitation codes" ON invitation_codes;
CREATE POLICY "Project owners and admins can delete invitation codes"
  ON invitation_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = invitation_codes.project_id
      AND p.user_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  );
