/*
  # Simplificar Sistema de Proyectos y Miembros

  ## Descripción
  Implementa un sistema mucho más sencillo que elimina errores al crear proyectos:
  - Trigger automático que agrega al creador como miembro 'owner'
  - Políticas RLS simplificadas que solo verifican project_members
  - Migración de datos existentes

  ## Cambios

  1. Crear función trigger para auto-agregar miembros
  2. Migrar propietarios existentes a project_members
  3. Simplificar todas las políticas RLS

  ## Notas
  - El creador del proyecto automáticamente se convierte en miembro con rol 'owner'
  - Todo se maneja en una sola tabla (project_members)
  - Las políticas son mucho más simples y rápidas
*/

-- =============================================================================
-- 1. CREAR FUNCIÓN PARA AUTO-AGREGAR MIEMBRO AL CREAR PROYECTO
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_add_project_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Agregar automáticamente al creador como miembro 'owner'
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner');
  
  RETURN NEW;
END;
$$;

-- Crear trigger que se ejecuta después de insertar un proyecto
DROP TRIGGER IF EXISTS trigger_auto_add_project_owner ON projects;
CREATE TRIGGER trigger_auto_add_project_owner
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_project_owner();

-- =============================================================================
-- 2. MIGRAR PROPIETARIOS EXISTENTES A PROJECT_MEMBERS
-- =============================================================================

-- Agregar propietarios existentes como 'owner' en project_members si no están
INSERT INTO project_members (project_id, user_id, role)
SELECT p.id, p.user_id, 'owner'
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = p.id
  AND pm.user_id = p.user_id
);

-- =============================================================================
-- 3. SIMPLIFICAR POLÍTICAS RLS - PROJECTS
-- =============================================================================

-- Políticas simplificadas para projects
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view their projects" ON projects;
CREATE POLICY "Users can view their projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can update projects" ON projects;
DROP POLICY IF EXISTS "Project owners and admins can update member roles" ON projects;
CREATE POLICY "Owners and admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Owners can delete projects" ON projects;
CREATE POLICY "Only owners can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'owner'
    )
  );

-- =============================================================================
-- 4. SIMPLIFICAR POLÍTICAS RLS - PROJECT_MEMBERS
-- =============================================================================

DROP POLICY IF EXISTS "Project owners and admins can add members" ON project_members;
DROP POLICY IF EXISTS "Project members and owners can view members" ON project_members;
CREATE POLICY "Members can view other members"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Project owners and admins can add members" ON project_members;
CREATE POLICY "Owners and admins can add members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Project owners and admins can update member roles" ON project_members;
CREATE POLICY "Owners and admins can update members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Project owners and admins can remove members" ON project_members;
CREATE POLICY "Owners and admins can remove members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- 5. SIMPLIFICAR POLÍTICAS RLS - INVITATION_CODES
-- =============================================================================

DROP POLICY IF EXISTS "Project members and owners can view invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Project owners and admins can view invitation codes" ON invitation_codes;
CREATE POLICY "Members can view invitation codes"
  ON invitation_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Project owners and admins can create invitation codes" ON invitation_codes;
CREATE POLICY "Owners and admins can create invitation codes"
  ON invitation_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Project owners and admins can update invitation codes" ON invitation_codes;
CREATE POLICY "Owners and admins can update invitation codes"
  ON invitation_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Project owners and admins can delete invitation codes" ON invitation_codes;
CREATE POLICY "Owners and admins can delete invitation codes"
  ON invitation_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- 6. SIMPLIFICAR POLÍTICAS RLS - LEADS
-- =============================================================================

DROP POLICY IF EXISTS "Members can view project leads" ON leads;
CREATE POLICY "Members can view leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = leads.project_id
      AND pm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can insert project leads" ON leads;
CREATE POLICY "Members can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = leads.project_id
      AND pm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can update project leads" ON leads;
CREATE POLICY "Members can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = leads.project_id
      AND pm.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = leads.project_id
      AND pm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can delete project leads" ON leads;
CREATE POLICY "Members can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = leads.project_id
      AND pm.user_id = (select auth.uid())
    )
  );

-- =============================================================================
-- 7. SIMPLIFICAR POLÍTICAS RLS - META_LEADS
-- =============================================================================

DROP POLICY IF EXISTS "Members can view project meta leads" ON meta_leads;
CREATE POLICY "Members can view meta leads"
  ON meta_leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = meta_leads.project_id
      AND pm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can insert project meta leads" ON meta_leads;
CREATE POLICY "Members can insert meta leads"
  ON meta_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = meta_leads.project_id
      AND pm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can update project meta leads" ON meta_leads;
CREATE POLICY "Members can update meta leads"
  ON meta_leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = meta_leads.project_id
      AND pm.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = meta_leads.project_id
      AND pm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can delete project meta leads" ON meta_leads;
CREATE POLICY "Members can delete meta leads"
  ON meta_leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = meta_leads.project_id
      AND pm.user_id = (select auth.uid())
    )
  );
