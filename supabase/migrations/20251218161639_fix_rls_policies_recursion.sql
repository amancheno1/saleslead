/*
  # Corregir Políticas RLS - Eliminar Recursión Infinita

  ## Problema
  Las políticas RLS de project_members e invitation_codes causaban recursión infinita
  al intentar consultar la misma tabla que están protegiendo.

  ## Solución
  1. Eliminar todas las políticas problemáticas
  2. Crear nuevas políticas que no dependan de project_members para su evaluación
  3. Usar una estrategia diferente: verificar roles a través de la tabla projects
  4. Crear una función helper que no cause recursión

  ## Cambios
  - Elimina políticas recursivas de project_members
  - Elimina políticas recursivas de invitation_codes
  - Redefine políticas de projects, leads y meta_leads sin recursión
  - Crea función helper is_project_admin para verificar permisos
*/

-- Eliminar todas las políticas problemáticas de project_members
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Admins can add members" ON project_members;
DROP POLICY IF EXISTS "Admins can update member roles" ON project_members;
DROP POLICY IF EXISTS "Admins can remove members" ON project_members;

-- Eliminar todas las políticas problemáticas de invitation_codes
DROP POLICY IF EXISTS "Members can view invitation codes of their projects" ON invitation_codes;
DROP POLICY IF EXISTS "Admins can create invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Admins can update invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Admins can delete invitation codes" ON invitation_codes;

-- Eliminar políticas actualizadas de projects
DROP POLICY IF EXISTS "Users can view their projects" ON projects;
DROP POLICY IF EXISTS "Admins can update projects" ON projects;
DROP POLICY IF EXISTS "Owners can delete projects" ON projects;

-- Eliminar políticas actualizadas de leads
DROP POLICY IF EXISTS "Members can view project leads" ON leads;
DROP POLICY IF EXISTS "Members can insert project leads" ON leads;
DROP POLICY IF EXISTS "Members can update project leads" ON leads;
DROP POLICY IF EXISTS "Members can delete project leads" ON leads;

-- Eliminar políticas actualizadas de meta_leads
DROP POLICY IF EXISTS "Members can view project meta leads" ON meta_leads;
DROP POLICY IF EXISTS "Members can insert project meta leads" ON meta_leads;
DROP POLICY IF EXISTS "Members can update project meta leads" ON meta_leads;
DROP POLICY IF EXISTS "Members can delete project meta leads" ON meta_leads;

-- Crear función helper para verificar si un usuario es admin o propietario de un proyecto
CREATE OR REPLACE FUNCTION is_project_admin(proj_id uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = proj_id
    AND p.user_id = user_id_param
  ) OR EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = proj_id
    AND pm.user_id = user_id_param
    AND pm.role = 'admin'
  );
$$;

-- Crear función helper para verificar si un usuario es miembro de un proyecto
CREATE OR REPLACE FUNCTION is_project_member(proj_id uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = proj_id
    AND p.user_id = user_id_param
  ) OR EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = proj_id
    AND pm.user_id = user_id_param
  );
$$;

-- Nuevas políticas para project_members (sin recursión)
CREATE POLICY "Users can view members if they are project members"
  ON project_members FOR SELECT
  TO authenticated
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Admins can add members to their projects"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (is_project_admin(project_id, auth.uid()));

CREATE POLICY "Admins can update member roles in their projects"
  ON project_members FOR UPDATE
  TO authenticated
  USING (is_project_admin(project_id, auth.uid()))
  WITH CHECK (is_project_admin(project_id, auth.uid()));

CREATE POLICY "Admins can remove members from their projects"
  ON project_members FOR DELETE
  TO authenticated
  USING (is_project_admin(project_id, auth.uid()));

-- Nuevas políticas para invitation_codes (sin recursión)
CREATE POLICY "Members can view invitation codes of their projects"
  ON invitation_codes FOR SELECT
  TO authenticated
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Admins can create invitation codes"
  ON invitation_codes FOR INSERT
  TO authenticated
  WITH CHECK (is_project_admin(project_id, auth.uid()));

CREATE POLICY "Admins can update invitation codes"
  ON invitation_codes FOR UPDATE
  TO authenticated
  USING (is_project_admin(project_id, auth.uid()))
  WITH CHECK (is_project_admin(project_id, auth.uid()));

CREATE POLICY "Admins can delete invitation codes"
  ON invitation_codes FOR DELETE
  TO authenticated
  USING (is_project_admin(project_id, auth.uid()));

-- Recrear políticas de projects (sin recursión)
CREATE POLICY "Users can view their projects"
  ON projects FOR SELECT
  TO authenticated
  USING (is_project_member(id, auth.uid()));

CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (is_project_admin(id, auth.uid()))
  WITH CHECK (is_project_admin(id, auth.uid()));

CREATE POLICY "Owners can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Recrear políticas de leads (sin recursión)
CREATE POLICY "Members can view project leads"
  ON leads FOR SELECT
  TO authenticated
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Members can insert project leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (is_project_member(project_id, auth.uid()));

CREATE POLICY "Members can update project leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (is_project_member(project_id, auth.uid()))
  WITH CHECK (is_project_member(project_id, auth.uid()));

CREATE POLICY "Members can delete project leads"
  ON leads FOR DELETE
  TO authenticated
  USING (is_project_member(project_id, auth.uid()));

-- Recrear políticas de meta_leads (sin recursión)
CREATE POLICY "Members can view project meta leads"
  ON meta_leads FOR SELECT
  TO authenticated
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Members can insert project meta leads"
  ON meta_leads FOR INSERT
  TO authenticated
  WITH CHECK (is_project_member(project_id, auth.uid()));

CREATE POLICY "Members can update project meta leads"
  ON meta_leads FOR UPDATE
  TO authenticated
  USING (is_project_member(project_id, auth.uid()))
  WITH CHECK (is_project_member(project_id, auth.uid()));

CREATE POLICY "Members can delete project meta leads"
  ON meta_leads FOR DELETE
  TO authenticated
  USING (is_project_member(project_id, auth.uid()));