/*
  # Eliminar Rol de Administrador

  ## Descripción
  Simplifica el sistema de roles eliminando 'admin' y dejando solo 'owner' y 'member'

  ## Cambios
  1. Actualizar políticas RLS para eliminar referencias a 'admin'
  2. Convertir todos los 'admin' existentes a 'member'
  3. Simplificar permisos: solo owner puede gestionar miembros e invitaciones
*/

-- =============================================================================
-- 1. CONVERTIR TODOS LOS ADMIN EXISTENTES A MEMBER
-- =============================================================================

UPDATE project_members
SET role = 'member'
WHERE role = 'admin';

-- =============================================================================
-- 2. ACTUALIZAR POLÍTICAS RLS - PROJECTS
-- =============================================================================

DROP POLICY IF EXISTS "Owners and admins can update projects" ON projects;
CREATE POLICY "Only owners can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- =============================================================================
-- 3. ACTUALIZAR POLÍTICAS RLS - PROJECT_MEMBERS
-- =============================================================================

DROP POLICY IF EXISTS "Owners and admins can add members" ON project_members;
CREATE POLICY "Only owners can add members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners and admins can update members" ON project_members;
CREATE POLICY "Only owners can update members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Owners and admins can remove members" ON project_members;
CREATE POLICY "Only owners can remove members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- =============================================================================
-- 4. ACTUALIZAR POLÍTICAS RLS - INVITATION_CODES
-- =============================================================================

DROP POLICY IF EXISTS "Owners and admins can create invitation codes" ON invitation_codes;
CREATE POLICY "Only owners can create invitation codes"
  ON invitation_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Owners and admins can update invitation codes" ON invitation_codes;
CREATE POLICY "Only owners can update invitation codes"
  ON invitation_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Owners and admins can delete invitation codes" ON invitation_codes;
CREATE POLICY "Only owners can delete invitation codes"
  ON invitation_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );
