# 🚀 INICIO RÁPIDO - Lead Tracker Multi-Proyecto

## ✅ ¿Qué se ha implementado?

Tu sistema ahora incluye:

### 🎯 Panel de Administración Completo
- ✅ Estadísticas globales de todos los proyectos
- ✅ Gestión de proyectos (crear, editar, activar/desactivar, eliminar)
- ✅ Gestión de usuarios (editar roles, asignar proyectos, eliminar)
- ✅ Sistema de códigos de invitación
- ✅ Tres niveles de roles: Super Admin, Admin Proyecto, Miembro

### 🔐 Sistema de Seguridad
- ✅ Row Level Security (RLS) en todas las tablas
- ✅ Aislamiento total entre proyectos
- ✅ Permisos granulares por rol
- ✅ Códigos de invitación con límites y expiración

### 📊 Funcionalidades por Rol

**Super Admin** (amancheno1979@gmail.com)
- Ver estadísticas de todos los proyectos
- Crear y gestionar proyectos ilimitados
- Gestionar todos los usuarios del sistema
- Cambiar roles y asignar proyectos
- Generar códigos de invitación para cualquier proyecto

**Admin Proyecto**
- Gestionar su proyecto específico
- Ver miembros de su proyecto
- Generar códigos para su proyecto
- Acceder a todas las funciones de leads de su proyecto

**Miembro**
- Ver y gestionar leads de su proyecto
- Acceder al dashboard de su proyecto
- Ver facturación y comisiones
- No puede ver otros proyectos

---

## 🎬 COMENZAR EN 3 PASOS

### PASO 1: Configurar Base de Datos

1. Ve a **Supabase Dashboard** → Tu Proyecto
2. Abre **SQL Editor**
3. Copia y pega TODO el contenido de `setup_super_admin.sql`
4. Haz clic en **RUN** o presiona `Ctrl + Enter`
5. Lee las instrucciones que aparecen en los "NOTICES"

El script creará automáticamente:
- ✅ Un proyecto inicial llamado "Proyecto Principal"
- ✅ Un código de invitación: `SUPER001` (válido 30 días, 10 usos)
- ✅ Te promoverá a super admin (si ya estás registrado)

### PASO 2: Registrar tu Cuenta

**Si es tu primera vez:**

1. Abre la aplicación
2. Haz clic en **"Regístrate"**
3. Completa:
   - **Email**: `amancheno1979@gmail.com`
   - **Contraseña**: La que prefieras (mínimo 6 caracteres)
   - **Código de Invitación**: `SUPER001`
4. Haz clic en **"Crear Cuenta"**
5. Inicia sesión con tus credenciales

**Si ya estás registrado:**

Ve directamente al Paso 3.

### PASO 3: Promover a Super Admin

**Opción A - Automática (Recomendada):**

1. Vuelve a ejecutar el script `setup_super_admin.sql` en Supabase
2. El script detectará tu cuenta y te promoverá automáticamente
3. Cierra sesión y vuelve a iniciar
4. ¡Ya eres super admin!

**Opción B - URL Especial:**

1. Después de iniciar sesión, ve a: `/?setup=super-admin`
2. Haz clic en **"Promote to Super Admin"**
3. Espera la confirmación
4. Serás redirigido automáticamente

**Opción C - SQL Manual:**

```sql
UPDATE user_profiles
SET role = 'super_admin', project_id = NULL
WHERE email = 'amancheno1979@gmail.com';
```

---

## 🎯 USAR EL SISTEMA

### 1️⃣ Como Super Admin - Primera Configuración

Una vez promovido a super admin:

**A. Ver Estadísticas Globales**
1. Ve a **"Administración"** en el menú lateral (icono de escudo)
2. Verás la pestaña **"Estadísticas"** (solo para super admins)
3. Aquí ves:
   - Total de proyectos
   - Total de leads
   - Leads convertidos
   - Ingresos totales
   - Desglose por proyecto

**B. Crear un Nuevo Proyecto**
1. En Administración → Pestaña **"Proyectos"**
2. Haz clic en **"Nuevo Proyecto"**
3. Completa:
   - Nombre del proyecto
   - Descripción (opcional)
   - Meta semanal de leads
4. Haz clic en **"Crear"**

**C. Generar Código de Invitación**
1. En Administración → Pestaña **"Invitaciones"**
2. Haz clic en **"Nueva Invitación"**
3. Selecciona:
   - **Proyecto**: El proyecto al que se asignará el usuario
   - **Rol**: "Miembro" o "Admin Proyecto"
   - **Máximo de usos**: Cuántas personas pueden usar este código
   - **Días de validez**: Cuándo expira el código
4. Haz clic en **"Crear"**
5. Copia el código (botón de copiar)
6. Comparte el código con el usuario

**D. Usuario se Registra**
1. El usuario abre la app
2. Hace clic en "Regístrate"
3. Ingresa su email, contraseña y el código que le compartiste
4. ¡Automáticamente queda asignado al proyecto con el rol especificado!

### 2️⃣ Gestionar Usuarios Existentes

Para cambiar el rol o proyecto de un usuario:

1. Administración → Pestaña **"Usuarios"**
2. Busca el usuario en la tabla
3. Haz clic en el **icono de lápiz** (editar)
4. Modifica:
   - Nombre completo
   - Rol (member, project_admin, super_admin)
   - Proyecto asignado
5. Haz clic en **"Guardar"**

Los cambios son **inmediatos**. El usuario verá los nuevos permisos la próxima vez que actualice la página.

### 3️⃣ Editar o Desactivar Proyectos

**Editar:**
1. Administración → Proyectos
2. Haz clic en el **icono de lápiz** junto al proyecto
3. Modifica la información
4. Marca/desmarca "Proyecto Activo"
5. Haz clic en "Guardar"

**Desactivar:**
- Desmarcar "Proyecto Activo" oculta el proyecto pero mantiene los datos

**Eliminar:**
- El botón de basura elimina el proyecto y **TODOS** sus datos
- Requiere confirmación
- ⚠️ Esta acción no se puede deshacer

### 4️⃣ Gestionar Códigos de Invitación

**Ver códigos activos:**
- Administración → Invitaciones
- Verás todos los códigos con su información

**Copiar código:**
- Haz clic en el icono de copiar junto al código

**Desactivar código:**
- Haz clic en el botón "Desactivar"
- El código ya no se podrá usar para nuevos registros

**Reactivar código:**
- Haz clic en "Activar" en un código desactivado

---

## 📚 ARCHIVOS DE REFERENCIA

### Documentación Principal
- **`README.md`** - Documentación completa del proyecto
- **`CONFIGURACION_SUPER_ADMIN.md`** - Guía detallada de configuración
- **`SUPER_ADMIN_SETUP.md`** - Setup original del super admin

### Scripts
- **`setup_super_admin.sql`** - Script de configuración automática

### Base de Datos
- **`supabase/migrations/`** - Migraciones de la base de datos

---

## 🆘 PROBLEMAS COMUNES

### ❌ No veo el panel de Administración
**Solución:**
```sql
-- Verifica tu rol en Supabase SQL Editor
SELECT email, role, project_id FROM user_profiles
WHERE email = 'amancheno1979@gmail.com';

-- Debe decir role = 'super_admin' y project_id = NULL
```

### ❌ No aparecen estadísticas
**Causa:** Solo los super_admin ven estadísticas globales

**Solución:**
1. Verifica que seas super_admin
2. Asegúrate de que existan proyectos activos
3. Recarga la página

### ❌ Código de invitación no funciona
**Posibles causas:**
- Código expirado
- Límite de usos alcanzado
- Código desactivado

**Solución:**
```sql
-- Ver estado del código
SELECT
  invitation_code,
  is_active,
  expires_at,
  current_uses,
  max_uses
FROM project_invitations
WHERE invitation_code = 'TU_CODIGO';
```

### ❌ No puedo editar usuarios
**Causa:** Solo super_admin puede cambiar roles

**Solución:** Verifica que tu rol sea 'super_admin'

### ❌ El usuario no ve su proyecto
**Solución:**
1. Verifica que el proyecto esté activo
2. Verifica que el usuario tenga project_id asignado
```sql
SELECT email, role, project_id FROM user_profiles
WHERE email = 'email_del_usuario';
```

---

## ✨ PRÓXIMOS PASOS RECOMENDADOS

1. **Crea tu primer proyecto de producción**
   - Dale un nombre descriptivo
   - Establece una meta realista

2. **Invita a tu equipo**
   - Genera códigos con roles apropiados
   - Comienza con "Miembro" y promueve según necesidad

3. **Configura los proyectos**
   - Personaliza las metas semanales
   - Activa solo los proyectos en uso

4. **Explora las estadísticas**
   - Revisa el dashboard de cada proyecto
   - Monitorea las conversiones
   - Analiza los ingresos

5. **Gestiona los permisos**
   - Revisa regularmente los usuarios activos
   - Ajusta roles según responsabilidades
   - Desactiva códigos no necesarios

---

## 🎉 ¡LISTO PARA USAR!

Tu sistema está completamente funcional con:
- ✅ Sistema multi-proyecto
- ✅ Gestión de usuarios y roles
- ✅ Códigos de invitación
- ✅ Estadísticas globales
- ✅ Seguridad con RLS

**Cualquier duda, consulta:** `CONFIGURACION_SUPER_ADMIN.md`

---

**Desarrollado por Alejandro Mancheño Rey**
© 2024 Todos los derechos reservados
