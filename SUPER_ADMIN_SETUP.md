# Configuración del Super Administrador

Este documento explica cómo configurar el super administrador en Lead Tracker.

## Primer Paso: Registro

1. Regístrate en la aplicación con el email: **amancheno1979@gmail.com**
2. Necesitarás un código de invitación inicial. Para el primer registro, sigue estos pasos:

## Configuración Manual del Super Admin

Una vez que hayas creado tu cuenta con amancheno1979@gmail.com, sigue estos pasos:

### Opción 1: Usando la Interfaz Web

1. Inicia sesión con tu cuenta
2. Accede a la URL: `https://tu-dominio.com/?setup=super-admin`
3. Haz clic en el botón "Promote to Super Admin"
4. Espera la confirmación y serás redirigido al dashboard

### Opción 2: Usando la Consola de Supabase

Si no tienes un código de invitación inicial, puedes ejecutar esto directamente en la base de datos:

1. Ve a tu proyecto en Supabase Dashboard
2. Abre el "SQL Editor"
3. Ejecuta el siguiente código SQL:

```sql
-- Primero, encuentra tu user_id
SELECT id, email FROM auth.users WHERE email = 'amancheno1979@gmail.com';

-- Luego, actualiza tu perfil (reemplaza 'TU_USER_ID' con el ID obtenido arriba)
UPDATE user_profiles
SET role = 'super_admin', project_id = NULL
WHERE id = 'TU_USER_ID';
```

## Funcionalidades del Super Admin

Como super administrador tendrás acceso a:

### Panel de Estadísticas
- Vista global de todos los proyectos
- Métricas totales: proyectos, leads, conversiones e ingresos
- Estadísticas detalladas por proyecto

### Gestión de Proyectos
- Crear nuevos proyectos
- Editar proyectos existentes
- Activar/desactivar proyectos
- Eliminar proyectos

### Gestión de Usuarios
- Ver todos los usuarios del sistema
- Editar roles de usuarios (member, project_admin, super_admin)
- Asignar usuarios a proyectos específicos
- Eliminar usuarios

### Códigos de Invitación
- Crear códigos de invitación para nuevos usuarios
- Asignar roles a través de códigos
- Establecer límites de uso y fecha de expiración
- Activar/desactivar códigos

## Creando Proyectos y Usuarios

### 1. Crear un Proyecto
1. Ve a la pestaña "Proyectos" en el panel de administración
2. Haz clic en "Nuevo Proyecto"
3. Completa el formulario:
   - Nombre del proyecto
   - Descripción
   - Meta semanal de leads
4. Haz clic en "Crear"

### 2. Generar Código de Invitación
1. Ve a la pestaña "Invitaciones"
2. Haz clic en "Nueva Invitación"
3. Selecciona:
   - Proyecto al que se asignará el usuario
   - Rol (Miembro o Admin Proyecto)
   - Número máximo de usos
   - Días de validez
4. Haz clic en "Crear"
5. Copia el código generado y compártelo con el nuevo usuario

### 3. Usuario se Registra
1. El usuario accede a la aplicación
2. Hace clic en "Regístrate"
3. Ingresa su email, contraseña y el código de invitación
4. Automáticamente será asignado al proyecto y rol especificados

## Gestión de Usuarios Existentes

Para cambiar el rol o proyecto de un usuario existente:

1. Ve a la pestaña "Usuarios"
2. Haz clic en el botón de editar (lápiz) junto al usuario
3. Modifica:
   - Nombre completo
   - Rol
   - Proyecto asignado
4. Haz clic en "Guardar"

## Notas Importantes

- Los super admins no necesitan estar asignados a un proyecto específico
- Los super admins tienen acceso a todos los proyectos y datos
- Solo los super admins pueden promover otros usuarios a super admin
- Los usuarios solo pueden ver los datos de su proyecto asignado
- Los códigos de invitación pueden ser reutilizados hasta alcanzar el límite establecido

## Seguridad

- **NUNCA** compartas tu cuenta de super admin
- Crea códigos de invitación con límites de uso apropiados
- Revisa regularmente los usuarios y sus permisos
- Desactiva códigos de invitación cuando ya no sean necesarios
- Los usuarios eliminados perderán acceso inmediatamente

## Solución de Problemas

### No puedo ver el panel de administración
- Verifica que tu rol sea 'super_admin' o 'project_admin'
- Cierra sesión y vuelve a iniciar sesión

### No aparecen estadísticas
- Las estadísticas solo están disponibles para super admins
- Asegúrate de que existan proyectos activos con datos

### No puedo editar un usuario
- Solo los super admins pueden editar roles y proyectos
- No puedes eliminar tu propia cuenta

### Código de invitación inválido
- Verifica que el código no haya expirado
- Verifica que no haya alcanzado el límite de usos
- Verifica que el código esté activo
