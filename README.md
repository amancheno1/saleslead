# Lead Tracker - Sistema de Gestión de Ventas Multi-Proyecto

Sistema completo de gestión de leads con arquitectura multi-proyecto, control de usuarios basado en roles y panel de administración avanzado.

## 🚀 Características Principales

### Sistema Multi-Proyecto
- **Proyectos Ilimitados**: Crea y gestiona múltiples proyectos independientes
- **Aislamiento Total**: Los datos de cada proyecto están completamente aislados
- **Gestión Centralizada**: Panel de administración para control total

### Sistema de Roles y Permisos
- **Super Admin**: Control total del sistema, todos los proyectos y usuarios
- **Admin Proyecto**: Gestiona su proyecto específico y sus miembros
- **Miembro**: Acceso solo a su proyecto asignado

### Panel de Administración
- **Estadísticas Globales**: Vista consolidada de todos los proyectos (Super Admin)
- **Gestión de Proyectos**: Crear, editar, activar/desactivar proyectos
- **Gestión de Usuarios**: Editar roles, asignar proyectos, administrar permisos
- **Códigos de Invitación**: Sistema seguro para incorporar usuarios

### Gestión de Leads
- **Dashboard Completo**: Métricas en tiempo real y visualización de progreso
- **Tabla de Leads**: Filtrado, búsqueda y gestión completa
- **Formulario Avanzado**: Captura detallada de información
- **Estados Personalizables**: Seguimiento del ciclo de vida del lead

### Módulos Adicionales
- **Facturación**: Control de ingresos y ventas
- **Comisiones**: Cálculo automático de comisiones
- **Leads Meta**: Registro semanal de leads de formularios Meta
- **Comparativa Mensual**: Análisis de rendimiento por mes

## 📋 Tecnologías

- **Frontend**: React + TypeScript + Vite
- **Estilos**: Tailwind CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Seguridad**: Row Level Security (RLS)
- **Iconos**: Lucide React

## 🔧 Instalación

1. **Clonar el repositorio**
```bash
git clone <tu-repositorio>
cd lead-tracker
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env` con tus credenciales de Supabase:
```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

4. **Ejecutar en desarrollo**
```bash
npm run dev
```

5. **Construir para producción**
```bash
npm run build
```

## 📊 Configuración de la Base de Datos

### Aplicar Migraciones

Las migraciones se encuentran en `/supabase/migrations/`. Ejecuta en orden:

1. `20251218142225_add_admin_roles_and_project_isolation.sql` - Sistema de roles y aislamiento

### Configuración Rápida

Usa el script `setup_super_admin.sql` para configuración automática:

1. Ve a tu proyecto en Supabase Dashboard
2. Abre "SQL Editor"
3. Copia y pega el contenido de `setup_super_admin.sql`
4. Ejecuta el script
5. Sigue las instrucciones en pantalla

## 👤 Configurar Super Administrador

### Método 1: Script SQL (Recomendado)

1. Ejecuta `setup_super_admin.sql` en Supabase
2. Registra tu cuenta con el código generado
3. Ejecuta el script de nuevo para promover a super admin

### Método 2: URL Especial

1. Registra tu cuenta normalmente
2. Ve a: `/?setup=super-admin`
3. Haz clic en "Promote to Super Admin"

### Método 3: SQL Manual

```sql
UPDATE user_profiles
SET role = 'super_admin', project_id = NULL
WHERE email = 'tu@email.com';
```

Para más detalles, consulta: `CONFIGURACION_SUPER_ADMIN.md`

## 🎯 Flujo de Trabajo

### 1. Como Super Admin

```
1. Crear Proyecto
   ↓
2. Generar Código de Invitación
   ↓
3. Compartir Código con Usuarios
   ↓
4. Usuarios se Registran Automáticamente
   ↓
5. Gestionar Roles y Permisos
```

### 2. Como Admin de Proyecto

```
1. Gestionar Leads de tu Proyecto
   ↓
2. Ver Estadísticas del Proyecto
   ↓
3. Generar Códigos para tu Proyecto
   ↓
4. Ver Miembros del Proyecto
```

### 3. Como Miembro

```
1. Ver Leads del Proyecto
   ↓
2. Agregar/Editar Leads
   ↓
3. Ver Estadísticas del Proyecto
   ↓
4. Gestionar Facturación y Comisiones
```

## 🔐 Seguridad

### Row Level Security (RLS)

Todas las tablas implementan RLS con políticas estrictas:

- **Proyectos**: Los usuarios solo ven sus proyectos asignados
- **Leads**: Aislamiento total entre proyectos
- **Usuarios**: Super admins ven todos, otros solo su proyecto
- **Invitaciones**: Solo creadores y super admins

### Códigos de Invitación

- Códigos únicos de 8 caracteres
- Límites de uso configurables
- Fecha de expiración automática
- Pueden desactivarse en cualquier momento

### Autenticación

- Email y contraseña con Supabase Auth
- Sesiones seguras con tokens JWT
- Verificación de permisos en cada operación

## 📁 Estructura del Proyecto

```
lead-tracker/
├── src/
│   ├── components/          # Componentes de React
│   │   ├── AdminDashboard.tsx       # Panel de administración
│   │   ├── Auth.tsx                 # Autenticación
│   │   ├── Dashboard.tsx            # Dashboard principal
│   │   ├── LeadsTable.tsx           # Tabla de leads
│   │   ├── LeadForm.tsx             # Formulario de leads
│   │   ├── SuperAdminSetup.tsx      # Setup super admin
│   │   └── ...
│   ├── context/             # Contextos de React
│   │   ├── AuthContext.tsx          # Contexto de autenticación
│   │   └── ProjectContext.tsx       # Contexto de proyecto
│   ├── lib/                 # Utilidades
│   │   ├── supabase.ts              # Cliente de Supabase
│   │   ├── adminSetup.ts            # Funciones de setup
│   │   └── database.types.ts        # Tipos TypeScript
│   └── App.tsx              # Componente principal
├── supabase/
│   └── migrations/          # Migraciones SQL
├── setup_super_admin.sql    # Script de configuración
└── CONFIGURACION_SUPER_ADMIN.md  # Guía detallada

```

## 🎨 Características de Diseño

- **Diseño Responsivo**: Funciona perfectamente en móviles y desktop
- **Tema Moderno**: Interfaz limpia con gradientes y sombras
- **Iconografía Consistente**: Lucide React para todos los iconos
- **Feedback Visual**: Estados de carga, confirmaciones y mensajes claros
- **Modo Móvil**: Menú desplegable optimizado para móviles

## 📈 Métricas y Estadísticas

### Dashboard General
- Leads totales y por estado
- Progreso semanal
- Tasa de conversión
- Ingresos del mes

### Panel de Administración (Super Admin)
- Total de proyectos activos
- Leads consolidados de todos los proyectos
- Conversiones globales
- Ingresos totales
- Desglose detallado por proyecto

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Preview
npm run preview

# Lint
npm run lint

# Type check
npm run typecheck
```

## 📝 Documentación Adicional

- `CONFIGURACION_SUPER_ADMIN.md` - Guía completa de configuración
- `SUPER_ADMIN_SETUP.md` - Setup rápido del super admin
- `ADMIN_GUIDE.md` - Guía para administradores

## 🤝 Contribución

Este es un proyecto privado. Para contribuir:

1. Fork del proyecto
2. Crea una rama para tu feature
3. Commit de cambios
4. Push a la rama
5. Crea un Pull Request

## 📄 Licencia

© 2024 Alejandro Mancheño Rey. Todos los derechos reservados.

## 🆘 Soporte

Para problemas o preguntas:
- Revisa `CONFIGURACION_SUPER_ADMIN.md` para problemas comunes
- Verifica los permisos en la base de datos
- Asegúrate de que RLS esté habilitado

## 🎉 Características Futuras

- [ ] Exportación de reportes en PDF
- [ ] Notificaciones por email
- [ ] Integración con WhatsApp
- [ ] Dashboard personalizable
- [ ] Análisis predictivo con IA
- [ ] App móvil nativa

---

**Desarrollado con ❤️ por Alejandro Mancheño Rey**
