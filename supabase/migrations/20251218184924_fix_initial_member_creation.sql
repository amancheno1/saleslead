/*
  # Arreglar Creación Inicial de Miembros

  ## Descripción
  Permite que el owner del proyecto agregue el primer miembro
  incluso si no hay registros en project_members todavía

  ## Cambios
  - Modifica la política de INSERT en project_members para permitir
    al owner del proyecto agregar miembros, incluso como primera acción
*/

-- Política especial que permite al owner agregar miembros
DROP POLICY IF EXISTS "Owners and admins can add members" ON project_members;
CREATE POLICY "Owners and admins can add members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Permitir si ya eres admin/owner en project_members
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
    OR
    -- O si eres el owner del proyecto en la tabla projects
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id
      AND p.user_id = auth.uid()
    )
  );
