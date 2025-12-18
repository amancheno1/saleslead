/*
  # Fix Performance and Security Issues

  ## Descripción
  Esta migración soluciona problemas críticos de rendimiento y seguridad detectados
  por el análisis de Supabase.

  ## Cambios Implementados

  ### 1. Índices Faltantes para Foreign Keys
  - Agregar índice en `invitation_codes(created_by)` para mejorar rendimiento de consultas
  - Agregar índice en `meta_leads(user_id)` para mejorar rendimiento de consultas

  ### 2. Optimización de Políticas RLS
  Reemplazar `auth.uid()` con `(select auth.uid())` en todas las políticas RLS para
  evitar reevaluación en cada fila. Esto mejora significativamente el rendimiento
  en consultas con muchas filas.

  Políticas actualizadas:
  - Todas las políticas de `projects`
  - Todas las políticas de `project_members`
  - Todas las políticas de `invitation_codes`
  - Todas las políticas de `leads`
  - Todas las políticas de `meta_leads`

  ### 3. Seguridad de Funciones
  Configurar `search_path` explícito en todas las funciones para prevenir ataques
  de búsqueda de esquema:
  - `update_updated_at_column()`
  - `use_invitation_code()`
  - `is_project_admin()`
  - `is_project_member()`

  ## Notas Importantes
  - Los índices mejorarán el rendimiento de consultas que usan estas foreign keys
  - La optimización RLS puede mejorar el rendimiento hasta 10x en consultas grandes
  - Las funciones ahora son más seguras contra ataques de manipulación de esquema
*/

-- =============================================================================
-- 1. AGREGAR ÍNDICES FALTANTES PARA FOREIGN KEYS
-- =============================================================================

-- Índice para invitation_codes.created_by
CREATE INDEX IF NOT EXISTS idx_invitation_codes_created_by 
  ON invitation_codes(created_by);

-- Índice para meta_leads.user_id
CREATE INDEX IF NOT EXISTS idx_meta_leads_user_id 
  ON meta_leads(user_id);

-- =============================================================================
-- 2. OPTIMIZAR POLÍTICAS RLS - PROJECTS
-- =============================================================================

-- Drop y recrear políticas de projects con optimización
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
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can update projects" ON projects;
CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  )
  WITH CHECK (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Owners can delete projects" ON projects;
CREATE POLICY "Owners can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =============================================================================
-- 3. OPTIMIZAR POLÍTICAS RLS - PROJECT_MEMBERS
-- =============================================================================

DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Users can view members if they are project members" ON project_members;
CREATE POLICY "Users can view members if they are project members"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can add members" ON project_members;
DROP POLICY IF EXISTS "Admins can add members to their projects" ON project_members;
CREATE POLICY "Admins can add members to their projects"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update member roles" ON project_members;
DROP POLICY IF EXISTS "Admins can update member roles in their projects" ON project_members;
CREATE POLICY "Admins can update member roles in their projects"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can remove members" ON project_members;
DROP POLICY IF EXISTS "Admins can remove members from their projects" ON project_members;
CREATE POLICY "Admins can remove members from their projects"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  );

-- =============================================================================
-- 4. OPTIMIZAR POLÍTICAS RLS - INVITATION_CODES
-- =============================================================================

DROP POLICY IF EXISTS "Members can view invitation codes of their projects" ON invitation_codes;
CREATE POLICY "Members can view invitation codes of their projects"
  ON invitation_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can create invitation codes" ON invitation_codes;
CREATE POLICY "Admins can create invitation codes"
  ON invitation_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update invitation codes" ON invitation_codes;
CREATE POLICY "Admins can update invitation codes"
  ON invitation_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete invitation codes" ON invitation_codes;
CREATE POLICY "Admins can delete invitation codes"
  ON invitation_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = (select auth.uid())
      AND pm.role = 'admin'
    )
  );

-- =============================================================================
-- 5. OPTIMIZAR POLÍTICAS RLS - LEADS
-- =============================================================================

DROP POLICY IF EXISTS "Members can view project leads" ON leads;
CREATE POLICY "Members can view project leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = leads.project_id
      AND (p.user_id = (select auth.uid()) OR pm.user_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Members can insert project leads" ON leads;
CREATE POLICY "Members can insert project leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = leads.project_id
      AND (p.user_id = (select auth.uid()) OR pm.user_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Members can update project leads" ON leads;
CREATE POLICY "Members can update project leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = leads.project_id
      AND (p.user_id = (select auth.uid()) OR pm.user_id = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = leads.project_id
      AND (p.user_id = (select auth.uid()) OR pm.user_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Members can delete project leads" ON leads;
CREATE POLICY "Members can delete project leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = leads.project_id
      AND (p.user_id = (select auth.uid()) OR pm.user_id = (select auth.uid()))
    )
  );

-- =============================================================================
-- 6. OPTIMIZAR POLÍTICAS RLS - META_LEADS
-- =============================================================================

DROP POLICY IF EXISTS "Members can view project meta leads" ON meta_leads;
CREATE POLICY "Members can view project meta leads"
  ON meta_leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = meta_leads.project_id
      AND (p.user_id = (select auth.uid()) OR pm.user_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Members can insert project meta leads" ON meta_leads;
CREATE POLICY "Members can insert project meta leads"
  ON meta_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = meta_leads.project_id
      AND (p.user_id = (select auth.uid()) OR pm.user_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Members can update project meta leads" ON meta_leads;
CREATE POLICY "Members can update project meta leads"
  ON meta_leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = meta_leads.project_id
      AND (p.user_id = (select auth.uid()) OR pm.user_id = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = meta_leads.project_id
      AND (p.user_id = (select auth.uid()) OR pm.user_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Members can delete project meta leads" ON meta_leads;
CREATE POLICY "Members can delete project meta leads"
  ON meta_leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = meta_leads.project_id
      AND (p.user_id = (select auth.uid()) OR pm.user_id = (select auth.uid()))
    )
  );

-- =============================================================================
-- 7. CONFIGURAR SEARCH_PATH SEGURO EN FUNCIONES
-- =============================================================================

-- Recrear update_updated_at_column con search_path seguro
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Eliminar y recrear use_invitation_code con search_path seguro
DROP FUNCTION IF EXISTS use_invitation_code(text);
CREATE FUNCTION use_invitation_code(invitation_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_project_id uuid;
  v_code_id uuid;
  v_max_uses int;
  v_uses_count int;
  v_expires_at timestamptz;
BEGIN
  SELECT id, project_id, max_uses, uses_count, expires_at
  INTO v_code_id, v_project_id, v_max_uses, v_uses_count, v_expires_at
  FROM invitation_codes
  WHERE code = invitation_code
  AND is_active = true;

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Código de invitación inválido o inactivo';
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RAISE EXCEPTION 'El código de invitación ha expirado';
  END IF;

  IF v_max_uses IS NOT NULL AND v_uses_count >= v_max_uses THEN
    RAISE EXCEPTION 'El código de invitación ha alcanzado su límite de usos';
  END IF;

  IF EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = v_project_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Ya eres miembro de este proyecto';
  END IF;

  INSERT INTO project_members (project_id, user_id, role)
  VALUES (v_project_id, auth.uid(), 'member');

  UPDATE invitation_codes
  SET uses_count = uses_count + 1
  WHERE id = v_code_id;

  RETURN v_project_id;
END;
$$;

-- Eliminar y recrear is_project_admin con search_path seguro
DROP FUNCTION IF EXISTS is_project_admin(uuid, uuid);
CREATE FUNCTION is_project_admin(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id
    AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
    AND user_id = p_user_id
    AND role = 'admin'
  );
END;
$$;

-- Eliminar y recrear is_project_member con search_path seguro
DROP FUNCTION IF EXISTS is_project_member(uuid, uuid);
CREATE FUNCTION is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id
    AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
    AND user_id = p_user_id
  );
END;
$$;
