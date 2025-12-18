-- ============================================================================
-- SCRIPT DE CONFIGURACIÓN RÁPIDA - SUPER ADMINISTRADOR
-- ============================================================================
--
-- Este script configura automáticamente:
-- 1. Un proyecto inicial
-- 2. Un código de invitación temporal
-- 3. Promueve amancheno1979@gmail.com a super admin (si ya existe)
--
-- INSTRUCCIONES:
-- 1. Copia este script completo
-- 2. Ve a tu proyecto en Supabase Dashboard
-- 3. Abre "SQL Editor"
-- 4. Pega el script y ejecuta
-- 5. Sigue las instrucciones en pantalla
--
-- ============================================================================

DO $$
DECLARE
  v_project_id uuid;
  v_user_id uuid;
  v_invitation_code text := 'SUPER001';
BEGIN
  -- ========================================================================
  -- PASO 1: Verificar si amancheno1979@gmail.com ya existe
  -- ========================================================================
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'amancheno1979@gmail.com';

  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE '✓ Usuario amancheno1979@gmail.com encontrado';

    -- Promover a super admin
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = v_user_id) THEN
      UPDATE user_profiles
      SET role = 'super_admin',
          project_id = NULL,
          updated_at = NOW()
      WHERE id = v_user_id;
      RAISE NOTICE '✓ Usuario promovido a super_admin';
    ELSE
      INSERT INTO user_profiles (id, email, role, project_id)
      VALUES (v_user_id, 'amancheno1979@gmail.com', 'super_admin', NULL);
      RAISE NOTICE '✓ Perfil de super_admin creado';
    END IF;
  ELSE
    RAISE NOTICE '⚠ Usuario amancheno1979@gmail.com NO encontrado todavía';
    RAISE NOTICE '  Necesitas registrarte primero con el código de invitación que se creará';
  END IF;

  -- ========================================================================
  -- PASO 2: Crear proyecto inicial si no existe ninguno
  -- ========================================================================
  IF NOT EXISTS (SELECT 1 FROM projects LIMIT 1) THEN
    INSERT INTO projects (name, description, weekly_goal, user_id, owner_id, is_active)
    VALUES (
      'Proyecto Principal',
      'Primer proyecto del sistema - Configuración inicial',
      50,
      COALESCE(v_user_id, gen_random_uuid()),
      COALESCE(v_user_id, gen_random_uuid()),
      true
    )
    RETURNING id INTO v_project_id;

    RAISE NOTICE '✓ Proyecto inicial creado con ID: %', v_project_id;
  ELSE
    SELECT id INTO v_project_id FROM projects ORDER BY created_at ASC LIMIT 1;
    RAISE NOTICE '✓ Usando proyecto existente con ID: %', v_project_id;
  END IF;

  -- ========================================================================
  -- PASO 3: Crear código de invitación inicial
  -- ========================================================================
  IF NOT EXISTS (SELECT 1 FROM project_invitations WHERE invitation_code = v_invitation_code) THEN
    INSERT INTO project_invitations (
      project_id,
      invitation_code,
      role,
      created_by,
      expires_at,
      max_uses,
      current_uses,
      is_active
    )
    VALUES (
      v_project_id,
      v_invitation_code,
      'member',
      COALESCE(v_user_id, gen_random_uuid()),
      NOW() + INTERVAL '30 days',
      10,
      0,
      true
    );

    RAISE NOTICE '✓ Código de invitación creado: %', v_invitation_code;
    RAISE NOTICE '  Expira en: 30 días';
    RAISE NOTICE '  Máximo de usos: 10';
  ELSE
    RAISE NOTICE '✓ Código de invitación ya existe: %', v_invitation_code;
  END IF;

  -- ========================================================================
  -- RESUMEN FINAL
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'CONFIGURACIÓN COMPLETADA';
  RAISE NOTICE '============================================================';

  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Ya puedes iniciar sesión como super admin:';
    RAISE NOTICE '   Email: amancheno1979@gmail.com';
    RAISE NOTICE '   Rol: super_admin';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Acciones disponibles:';
    RAISE NOTICE '   - Ver estadísticas globales';
    RAISE NOTICE '   - Crear proyectos';
    RAISE NOTICE '   - Gestionar usuarios';
    RAISE NOTICE '   - Generar códigos de invitación';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '📝 SIGUIENTE PASO: Registrarte';
    RAISE NOTICE '   1. Ve a la aplicación';
    RAISE NOTICE '   2. Haz clic en "Regístrate"';
    RAISE NOTICE '   3. Email: amancheno1979@gmail.com';
    RAISE NOTICE '   4. Contraseña: (la que prefieras)';
    RAISE NOTICE '   5. Código de invitación: %', v_invitation_code;
    RAISE NOTICE '';
    RAISE NOTICE '   Después del registro, ejecuta este script de nuevo';
    RAISE NOTICE '   para ser promovido a super_admin';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🔑 Código de invitación activo: %', v_invitation_code;
  RAISE NOTICE '   Úsalo para registrar otros usuarios';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';

END $$;

-- ============================================================================
-- VERIFICACIÓN: Ver el estado actual
-- ============================================================================

-- Ver proyectos creados
SELECT
  id,
  name,
  description,
  is_active,
  created_at
FROM projects
ORDER BY created_at DESC
LIMIT 5;

-- Ver códigos de invitación activos
SELECT
  invitation_code,
  role,
  current_uses,
  max_uses,
  expires_at,
  is_active,
  p.name as project_name
FROM project_invitations pi
LEFT JOIN projects p ON p.id = pi.project_id
WHERE is_active = true
ORDER BY created_at DESC;

-- Ver usuarios (si existen)
SELECT
  email,
  role,
  p.name as project_name,
  up.created_at
FROM user_profiles up
LEFT JOIN projects p ON p.id = up.project_id
ORDER BY up.created_at DESC;
