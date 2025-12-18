# Configuración del Super Administrador - Guía Paso a Paso

## Resumen del Sistema

Tu aplicación ahora cuenta con un sistema completo de administración multi-proyecto con los siguientes componentes:

### 🎯 Roles del Sistema
- **Super Admin**: Control total sobre todos los proyectos, usuarios y configuraciones
- **Admin Proyecto**: Gestiona su proyecto específico y sus miembros
- **Miembro**: Acceso solo a su proyecto asignado

### ✨ Funcionalidades del Panel de Administración

#### 1. Estadísticas Globales (Solo Super Admin)
- Vista consolidada de todos los proyectos
- Métricas totales: proyectos activos, leads totales, conversiones, ingresos
- Desglose detallado por proyecto

#### 2. Gestión de Proyectos
- Crear proyectos ilimitados
- Editar información y configuración
- Activar/desactivar proyectos
- Eliminar proyectos (con confirmación)

#### 3. Gestión de Usuarios
- Ver todos los usuarios del sistema
- Editar roles: member, project_admin, super_admin
- Asignar/reasignar usuarios a proyectos
- Eliminar usuarios

#### 4. Códigos de Invitación
- Generar códigos únicos de 8 caracteres
- Asignar automáticamente rol y proyecto
- Límites de uso configurables
- Fecha de expiración configurable
- Activar/desactivar códigos

---

## 📋 PASO A PASO: Configurar Super Administrador

### Opción A: Configuración Automática (Recomendada)

#### 1. Registra tu cuenta
1. Accede a tu aplicación
2. Haz clic en "Regístrate"
3. **IMPORTANTE**: Crea la primera cuenta con email: `amancheno1979@gmail.com`
4. Como no tienes código de invitación aún, necesitas crear un código temporal (ver Paso 2)

#### 2. Crear el primer código de invitación (Solo una vez)

Ve a la consola de Supabase y ejecuta este SQL:

```sql
-- Paso 1: Crear un proyecto inicial
INSERT INTO projects (name, description, weekly_goal, user_id, owner_id, is_active)
VALUES (
  'Proyecto Principal',
  'Primer proyecto del sistema',
  50,
  gen_random_uuid(),
  gen_random_uuid(),
  true
);

-- Paso 2: Obtener el ID del proyecto creado
SELECT id, name FROM projects ORDER BY created_at DESC LIMIT 1;

-- Paso 3: Crear código de invitación inicial (reemplaza PROJECT_ID_AQUI)
INSERT INTO project_invitations (
  project_id,
  invitation_code,
  role,
  created_by,
  expires_at,
  max_uses,
  is_active
)
VALUES (
  'PROJECT_ID_AQUI',  -- Reemplazar con el ID del proyecto
  'ADMIN001',
  'member',
  gen_random_uuid(),
  NOW() + INTERVAL '30 days',
  1,
  true
);
```

#### 3. Regístrate con el código
1. Usa el código `ADMIN001` para registrarte
2. Completa el registro

#### 4. Promover a Super Admin

**Opción 4A - Usando la URL especial:**
1. Después de iniciar sesión, ve a: `https://tu-dominio.com/?setup=super-admin`
2. Haz clic en "Promote to Super Admin"
3. ¡Listo! Ahora eres super admin

**Opción 4B - Usando SQL directo:**

```sql
-- Encuentra tu usuario
SELECT id, email, role FROM user_profiles
WHERE email = 'amancheno1979@gmail.com';

-- Promover a super admin (reemplaza TU_USER_ID)
UPDATE user_profiles
SET role = 'super_admin', project_id = NULL
WHERE email = 'amancheno1979@gmail.com';
```

---

### Opción B: Configuración Manual Completa en SQL

Si prefieres hacerlo todo desde SQL:

```sql
-- 1. Verificar que tu usuario existe en auth.users
SELECT id, email FROM auth.users WHERE email = 'amancheno1979@gmail.com';

-- 2. Si existe user_profile, actualizarlo
UPDATE user_profiles
SET
  role = 'super_admin',
  project_id = NULL,
  updated_at = NOW()
WHERE email = 'amancheno1979@gmail.com';

-- 3. Si NO existe user_profile, crearlo
-- (Reemplaza USER_ID_AQUI con el ID del paso 1)
INSERT INTO user_profiles (id, email, role, project_id)
VALUES (
  'USER_ID_AQUI',
  'amancheno1979@gmail.com',
  'super_admin',
  NULL
);

-- 4. Verificar que funcionó
SELECT id, email, role, project_id FROM user_profiles
WHERE email = 'amancheno1979@gmail.com';
```

---

## 🚀 Flujo de Trabajo Normal

### Una vez que eres Super Admin:

#### 1. Crear un Proyecto
1. Ve a "Administración" en el menú lateral
2. Pestaña "Proyectos" → "Nuevo Proyecto"
3. Completa: nombre, descripción, meta semanal
4. Click "Crear"

#### 2. Generar Código de Invitación
1. Pestaña "Invitaciones" → "Nueva Invitación"
2. Selecciona:
   - Proyecto (de la lista de proyectos activos)
   - Rol: "Miembro" o "Admin Proyecto"
   - Máximo de usos (ej: 10)
   - Días de validez (ej: 7)
3. Click "Crear"
4. Copia el código generado (botón copiar)

#### 3. Compartir con Usuarios
1. Envía el código al usuario
2. El usuario se registra en la app
3. Usa el código durante el registro
4. ¡Automáticamente queda asignado!

#### 4. Gestionar Usuarios Existentes
1. Pestaña "Usuarios"
2. Click en el icono de lápiz junto al usuario
3. Modifica:
   - Nombre completo
   - Rol (member/project_admin/super_admin)
   - Proyecto asignado
4. Click "Guardar"

---

## 🔐 Seguridad y Permisos

### Aislamiento de Proyectos
- Los datos están completamente aislados entre proyectos
- Los miembros solo ven datos de su proyecto
- Los admins de proyecto solo gestionan su proyecto
- Solo super admins ven todos los proyectos

### Row Level Security (RLS)
- Implementado en todas las tablas
- Políticas estrictas basadas en roles
- Super admins tienen acceso global
- Verificación automática de permisos

### Códigos de Invitación
- Códigos únicos de 8 caracteres
- Expiración automática
- Límite de usos configurable
- Pueden desactivarse en cualquier momento

---

## 📊 Características del Panel de Estadísticas

### Vista Global (Super Admin)
- **Total Proyectos**: Cantidad de proyectos activos
- **Total Leads**: Suma de todos los leads del sistema
- **Convertidos**: Total de leads convertidos
- **Ingresos Totales**: Suma de todas las ventas

### Por Proyecto
- Total Leads
- Pendientes
- Contactados
- Convertidos
- Usuarios asignados
- Ingresos del proyecto

---

## ⚠️ Solución de Problemas

### No puedo acceder a Administración
✅ Verifica que tu role sea 'super_admin' en la tabla user_profiles
✅ Cierra sesión y vuelve a iniciar
✅ Verifica en Supabase: `SELECT * FROM user_profiles WHERE email = 'amancheno1979@gmail.com'`

### No aparecen estadísticas
✅ Solo los super_admin ven estadísticas globales
✅ Debe haber al menos un proyecto activo
✅ Actualiza la página

### No puedo crear proyectos
✅ Solo super_admin y project_admin pueden crear proyectos
✅ Verifica tu rol en la base de datos

### Código de invitación no funciona
✅ Verifica que no haya expirado
✅ Verifica que no haya alcanzado el límite de usos
✅ Verifica que esté activo (is_active = true)
✅ El código debe tener exactamente 8 caracteres

### No puedo editar usuarios
✅ Solo super_admin puede cambiar roles y proyectos
✅ No puedes eliminar tu propia cuenta

---

## 📞 Notas Importantes

1. **Primera cuenta**: La primera cuenta que registres con amancheno1979@gmail.com debe ser promovida manualmente a super_admin
2. **Códigos temporales**: Puedes crear códigos con muchos usos para incorporaciones masivas
3. **Eliminar usuarios**: Al eliminar un usuario, pierde acceso inmediatamente
4. **Super admins múltiples**: Puedes tener varios super admins
5. **Cambio de proyecto**: Cambiar el proyecto de un usuario es inmediato
6. **Seguridad**: NUNCA compartas tu cuenta de super admin

---

## 🎉 ¡Ya está todo listo!

Tu sistema completo de administración multi-proyecto está implementado y listo para usar. Con estas instrucciones, podrás:

✅ Configurar tu cuenta como super administrador
✅ Crear y gestionar múltiples proyectos
✅ Invitar y administrar usuarios
✅ Ver estadísticas globales
✅ Asignar permisos granulares

¡Disfruta de tu nuevo sistema de gestión de leads!
