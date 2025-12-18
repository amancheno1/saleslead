# Guía de Administración - Lead Tracker

## Sistema de Roles y Permisos

Lead Tracker implementa un sistema completo de roles y aislamiento de datos por proyecto.

### Tipos de Roles

1. **Super Admin**
   - Acceso completo a todos los proyectos
   - Puede crear y gestionar múltiples proyectos
   - Puede ver todos los usuarios del sistema
   - Puede crear códigos de invitación para cualquier proyecto

2. **Project Admin** (Administrador de Proyecto)
   - Puede gestionar su proyecto asignado
   - Puede ver y gestionar usuarios de su proyecto
   - Puede crear códigos de invitación para su proyecto
   - Acceso completo a los datos de su proyecto

3. **Member** (Miembro)
   - Acceso de lectura/escritura a los datos de su proyecto
   - Solo puede ver datos de su proyecto asignado
   - No puede gestionar usuarios ni crear invitaciones

## Inicialización del Sistema

### Primer Usuario (Super Admin)

El **primer usuario** que se registre en el sistema automáticamente se convertirá en **Super Admin**. Este usuario:
- No necesita código de invitación
- Tiene acceso completo al sistema
- Puede crear proyectos y gestionar usuarios

**Pasos para inicializar:**

1. Ve a la página de registro
2. Crea una cuenta sin código de invitación (déjalo en blanco)
3. El sistema automáticamente te asignará el rol de Super Admin
4. Inicia sesión y accede al Panel de Administración

### Usuarios Subsecuentes

Todos los usuarios después del primero **DEBEN** registrarse con un código de invitación válido:
- El Super Admin o Project Admin crea un código de invitación
- El usuario usa ese código al registrarse
- Se asigna automáticamente al proyecto correspondiente

## Gestión de Proyectos

### Crear un Proyecto

1. Accede al **Panel de Administración** (menú lateral)
2. Ve a la pestaña **Proyectos**
3. Haz clic en **Nuevo Proyecto**
4. Completa:
   - Nombre del proyecto
   - Descripción (opcional)
   - Meta semanal de leads
5. El proyecto se crea activo por defecto

### Editar un Proyecto

1. En la lista de proyectos, haz clic en el icono de **editar**
2. Modifica los campos necesarios
3. Puedes activar/desactivar el proyecto
4. Guarda los cambios

### Eliminar un Proyecto

⚠️ **ADVERTENCIA**: Al eliminar un proyecto, se eliminan TODOS los datos asociados (leads, usuarios, etc.)

1. En la lista de proyectos, haz clic en el icono de **eliminar**
2. Confirma la acción
3. El proyecto y todos sus datos se eliminarán permanentemente

## Gestión de Usuarios

### Ver Usuarios

1. Accede al **Panel de Administración**
2. Ve a la pestaña **Usuarios**
3. Verás la lista de usuarios según tu rol:
   - **Super Admin**: Ve todos los usuarios
   - **Project Admin**: Ve solo usuarios de su proyecto

### Información Mostrada

- Email del usuario
- Nombre completo
- Rol asignado
- Fecha de registro

## Códigos de Invitación

### Crear Código de Invitación

1. Accede al **Panel de Administración**
2. Ve a la pestaña **Invitaciones**
3. Haz clic en **Nueva Invitación**
4. Configura:
   - **Proyecto**: Selecciona el proyecto (solo Super Admin)
   - **Rol**: Member o Project Admin
   - **Máximo de Usos**: Cuántas personas pueden usar este código
   - **Días de Validez**: Cuántos días será válido el código
5. Se genera un código automático (ej: ABC12345)

### Gestionar Códigos

- **Copiar código**: Haz clic en el icono de copiar
- **Desactivar/Activar**: Usa el botón de estado
- **Ver detalles**: Proyecto, rol, usos restantes, fecha de expiración

### Estados de Códigos

- ✅ **Activo**: Puede ser usado
- 🔴 **Desactivado**: No puede ser usado
- ⚠️ **Expirado**: Pasó la fecha de validez

## Aislamiento de Datos

### Seguridad por Proyecto

El sistema implementa **Row Level Security (RLS)** que garantiza:

1. **Usuarios solo ven datos de su proyecto**
   - Leads, facturación, comisiones, etc.
   - Completamente aislados entre proyectos

2. **Super Admin tiene acceso total**
   - Puede ver y gestionar todos los proyectos
   - Útil para soporte y administración general

3. **Project Admin gestiona su proyecto**
   - Control total sobre su proyecto asignado
   - No puede acceder a otros proyectos

## Flujo de Registro de Nuevos Usuarios

1. **Admin crea código de invitación**
   - Selecciona proyecto y rol
   - Comparte el código con el nuevo usuario

2. **Usuario se registra**
   - Completa email y contraseña
   - Ingresa el código de invitación
   - Se asigna automáticamente al proyecto

3. **Usuario inicia sesión**
   - Ve solo los datos de su proyecto
   - Acceso según su rol asignado

## Mejores Prácticas

### Para Super Admins

1. **Crea proyectos separados** para cada cliente/departamento
2. **Asigna Project Admins** de confianza para gestionar cada proyecto
3. **Revisa periódicamente** los códigos de invitación activos
4. **Desactiva proyectos** en lugar de eliminarlos (para mantener historial)

### Para Project Admins

1. **Crea códigos con límites de uso** para control
2. **Establece fechas de expiración cortas** para seguridad
3. **Desactiva códigos** después de que el usuario se registre
4. **Monitorea usuarios activos** en tu proyecto

### Seguridad

1. **Nunca compartas tu contraseña** de administrador
2. **Códigos de invitación son sensibles** - compártelos de forma segura
3. **Revoca códigos** que ya no necesites
4. **Verifica nuevos usuarios** después del registro

## Troubleshooting

### "Código de invitación inválido"
- Verifica que el código esté activo
- Confirma que no haya expirado
- Verifica que no se hayan agotado los usos

### "No tienes permisos"
- Confirma tu rol actual
- Contacta a un administrador si necesitas más permisos

### "No puedo ver el Panel de Administración"
- Solo Super Admin y Project Admin tienen acceso
- Los Members no ven esta opción

## Soporte

Si tienes problemas o preguntas sobre el sistema de administración, contacta al Super Admin de tu organización.
