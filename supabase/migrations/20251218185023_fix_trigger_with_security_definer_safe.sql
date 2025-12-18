/*
  # Arreglar Trigger con Permisos Correctos

  ## Descripción
  El trigger necesita SECURITY DEFINER para poder insertar en project_members
  a pesar de las políticas RLS, pero de forma segura

  ## Cambios
  - Recrear función trigger con SECURITY DEFINER de forma segura
  - Asegurar que solo inserta el owner correcto
*/

-- =============================================================================
-- RECREAR FUNCIÓN TRIGGER CON SECURITY DEFINER SEGURO
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_auto_add_project_owner ON projects;
DROP FUNCTION IF EXISTS auto_add_project_owner();

CREATE OR REPLACE FUNCTION auto_add_project_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo agregar si NEW.user_id está definido (seguridad extra)
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER trigger_auto_add_project_owner
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_project_owner();

-- Asegurar que los propietarios existentes están en project_members
INSERT INTO project_members (project_id, user_id, role)
SELECT p.id, p.user_id, 'owner'
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = p.id
  AND pm.user_id = p.user_id
)
ON CONFLICT DO NOTHING;
