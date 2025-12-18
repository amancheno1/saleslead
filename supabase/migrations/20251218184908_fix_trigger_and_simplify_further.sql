/*
  # Arreglar Trigger y Simplificar Aún Más

  ## Descripción
  Simplifica completamente el sistema usando auth.uid() directamente
  y arregla el trigger para que no tenga problemas de seguridad

  ## Cambios
  1. Recrear función trigger sin SECURITY DEFINER
  2. Simplificar todas las políticas usando auth.uid() directamente
*/

-- =============================================================================
-- 1. RECREAR FUNCIÓN TRIGGER MÁS SIMPLE
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_auto_add_project_owner ON projects;
DROP FUNCTION IF EXISTS auto_add_project_owner();

CREATE OR REPLACE FUNCTION auto_add_project_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_add_project_owner
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_project_owner();

-- =============================================================================
-- 2. SIMPLIFICAR POLÍTICAS RLS - PROJECTS
-- =============================================================================

DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their projects" ON projects;
CREATE POLICY "Users can view their projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners and admins can update projects" ON projects;
CREATE POLICY "Owners and admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Only owners can delete projects" ON projects;
CREATE POLICY "Only owners can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- =============================================================================
-- 3. SIMPLIFICAR POLÍTICAS RLS - PROJECT_MEMBERS
-- =============================================================================

DROP POLICY IF EXISTS "Members can view other members" ON project_members;
CREATE POLICY "Members can view other members"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners and admins can add members" ON project_members;
CREATE POLICY "Owners and admins can add members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Owners and admins can update members" ON project_members;
CREATE POLICY "Owners and admins can update members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Owners and admins can remove members" ON project_members;
CREATE POLICY "Owners and admins can remove members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- 4. SIMPLIFICAR POLÍTICAS RLS - INVITATION_CODES
-- =============================================================================

DROP POLICY IF EXISTS "Members can view invitation codes" ON invitation_codes;
CREATE POLICY "Members can view invitation codes"
  ON invitation_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners and admins can create invitation codes" ON invitation_codes;
CREATE POLICY "Owners and admins can create invitation codes"
  ON invitation_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Owners and admins can update invitation codes" ON invitation_codes;
CREATE POLICY "Owners and admins can update invitation codes"
  ON invitation_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Owners and admins can delete invitation codes" ON invitation_codes;
CREATE POLICY "Owners and admins can delete invitation codes"
  ON invitation_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitation_codes.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- 5. SIMPLIFICAR POLÍTICAS RLS - LEADS
-- =============================================================================

DROP POLICY IF EXISTS "Members can view leads" ON leads;
CREATE POLICY "Members can view leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = leads.project_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert leads" ON leads;
CREATE POLICY "Members can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = leads.project_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update leads" ON leads;
CREATE POLICY "Members can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = leads.project_id
      AND pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = leads.project_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete leads" ON leads;
CREATE POLICY "Members can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = leads.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 6. SIMPLIFICAR POLÍTICAS RLS - META_LEADS
-- =============================================================================

DROP POLICY IF EXISTS "Members can view meta leads" ON meta_leads;
CREATE POLICY "Members can view meta leads"
  ON meta_leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = meta_leads.project_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert meta leads" ON meta_leads;
CREATE POLICY "Members can insert meta leads"
  ON meta_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = meta_leads.project_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update meta leads" ON meta_leads;
CREATE POLICY "Members can update meta leads"
  ON meta_leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = meta_leads.project_id
      AND pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = meta_leads.project_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete meta leads" ON meta_leads;
CREATE POLICY "Members can delete meta leads"
  ON meta_leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = meta_leads.project_id
      AND pm.user_id = auth.uid()
    )
  );
