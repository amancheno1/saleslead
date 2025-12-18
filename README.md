# Lead Tracker - Sistema de Gestión de Ventas

Sistema completo de gestión de leads con arquitectura multi-proyecto para organizar y dar seguimiento a tus oportunidades de negocio.

## Características Principales

### Sistema Multi-Proyecto
- Crea y gestiona múltiples proyectos independientes
- Cambia fácilmente entre proyectos desde el selector
- Datos completamente aislados entre proyectos

### Gestión de Leads
- Dashboard con métricas en tiempo real
- Tabla completa con filtrado y búsqueda
- Formulario detallado de captura
- Seguimiento del ciclo de vida del lead
- Estados: pendiente, contactado, convertido, no convertido

### Módulos Adicionales
- **Facturación**: Control de ingresos y ventas
- **Comisiones**: Cálculo automático de comisiones
- **Leads Meta**: Registro semanal de leads de formularios Meta
- **Comparativa Mensual**: Análisis de rendimiento por mes

## Tecnologías

- **Frontend**: React + TypeScript + Vite
- **Estilos**: Tailwind CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Seguridad**: Row Level Security (RLS)
- **Iconos**: Lucide React

## Instalación

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

Crea un archivo `.env`:
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

## Estructura de la Base de Datos

### Tablas Principales

**projects**
- Almacena información de cada proyecto
- Campos: name, description, weekly_goal, user_id

**leads**
- Todos los leads del sistema
- Relacionados a un proyecto específico
- Campos detallados para seguimiento completo

**meta_leads**
- Registro semanal de leads de Meta
- Útil para seguimiento de campañas

**settings**
- Configuración global del sistema

## Configuración de la Base de Datos

1. Crea las tablas necesarias en Supabase
2. Habilita Row Level Security (RLS) en todas las tablas
3. Configura las políticas de acceso para cada usuario

Políticas RLS sugeridas:

```sql
-- Projects: Los usuarios solo ven sus proyectos
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Leads: Los usuarios solo ven leads de sus proyectos
CREATE POLICY "Users can view project leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );
```

## Uso del Sistema

### Crear un Proyecto

1. Inicia sesión en la aplicación
2. Si no tienes proyectos, se te pedirá crear uno
3. Ve a "Proyectos" en el menú lateral
4. Haz clic en "Nuevo Proyecto"
5. Completa el formulario:
   - Nombre del proyecto
   - Descripción (opcional)
   - Meta semanal de leads
6. Haz clic en "Crear"

### Cambiar entre Proyectos

1. Usa el selector de proyectos en la barra lateral
2. Selecciona el proyecto deseado
3. Todos los datos se actualizarán automáticamente

### Gestionar Leads

1. **Agregar Lead**: Usa el formulario para capturar información
2. **Ver Leads**: La tabla muestra todos los leads del proyecto actual
3. **Editar Lead**: Haz clic en el icono de edición en la tabla
4. **Filtrar**: Usa los filtros por estado, mes y búsqueda

### Dashboard

El dashboard muestra:
- Total de leads
- Leads pendientes, contactados y convertidos
- Progreso semanal hacia la meta
- Tasa de conversión
- Ingresos del mes

### Facturación

- Vista consolidada de todas las ventas
- Exportación a Excel
- Filtrado por periodo
- Totales y promedios

### Comisiones

- Cálculo automático basado en ventas
- Configuración de porcentajes por closer
- Exportación de reportes

## Características de Diseño

- **Diseño Responsivo**: Funciona en móviles y desktop
- **Tema Moderno**: Gradientes y sombras elegantes
- **Iconografía Consistente**: Lucide React
- **Feedback Visual**: Estados de carga y mensajes claros
- **Menú Móvil**: Navegación optimizada para pantallas pequeñas

## Scripts Disponibles

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

## Seguridad

- Autenticación mediante Supabase Auth
- Row Level Security en todas las tablas
- Tokens JWT para sesiones seguras
- Datos aislados entre usuarios y proyectos

## Estructura del Proyecto

```
lead-tracker/
├── src/
│   ├── components/          # Componentes de React
│   │   ├── AdminDashboard.tsx       # Gestión de proyectos
│   │   ├── Auth.tsx                 # Autenticación
│   │   ├── Dashboard.tsx            # Dashboard principal
│   │   ├── LeadsTable.tsx           # Tabla de leads
│   │   ├── LeadForm.tsx             # Formulario de leads
│   │   ├── Billing.tsx              # Facturación
│   │   ├── Commissions.tsx          # Comisiones
│   │   ├── MetaLeads.tsx            # Leads Meta
│   │   └── ...
│   ├── context/             # Contextos de React
│   │   ├── AuthContext.tsx          # Autenticación
│   │   └── ProjectContext.tsx       # Proyectos
│   ├── lib/                 # Utilidades
│   │   ├── supabase.ts              # Cliente Supabase
│   │   └── database.types.ts        # Tipos TypeScript
│   └── App.tsx              # Componente principal
└── package.json
```

## Licencia

© 2024 Alejandro Mancheño Rey. Todos los derechos reservados.

## Soporte

Para problemas o preguntas:
- Verifica la configuración de Supabase
- Asegúrate de que RLS esté configurado correctamente
- Revisa las credenciales en el archivo .env

---

**Desarrollado por Alejandro Mancheño Rey**
