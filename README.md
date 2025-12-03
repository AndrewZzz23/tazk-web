# Tazk - Enterprise Task Management System

Sistema empresarial de gestión de tareas con arquitectura multi-tenant, control de acceso basado en roles (RBAC) y auditoría completa.

---

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Modelo de Datos](#modelo-de-datos)
4. [Sistema de Seguridad](#sistema-de-seguridad)
5. [Instalación](#instalación)
6. [Configuración](#configuración)
7. [Stack Tecnológico](#stack-tecnológico)

---

## Descripción General

Tazk es una aplicación web de gestión de tareas diseñada para equipos distribuidos con las siguientes características:

- **Multi-tenancy**: Aislamiento completo de datos entre organizaciones
- **RBAC (Role-Based Access Control)**: Tres niveles de permisos por equipo
- **Tareas Personales**: Los usuarios pueden gestionar tareas individuales sin pertenecer a un equipo
- **Auditoría Completa**: Registro automático de todas las acciones realizadas
- **OAuth 2.0**: Autenticación mediante Google y Microsoft
- **Row-Level Security**: Políticas de seguridad implementadas a nivel de base de datos

---

## Arquitectura

### Arquitectura General

```
┌─────────────────────────────────────────────────────┐
│                  Capa de Presentación                │
│              (React + Vite + JavaScript)             │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ HTTPS/OAuth
                      │
┌─────────────────────▼───────────────────────────────┐
│                  Capa de Servicios                   │
│              (Supabase Auth + REST API)              │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ PostgreSQL Protocol
                      │
┌─────────────────────▼───────────────────────────────┐
│                   Capa de Datos                      │
│    (PostgreSQL + RLS + Triggers + Functions)         │
└──────────────────────────────────────────────────────┘
```

### Principios de Diseño

1. **Separation of Concerns**: La lógica de negocio está dividida entre el frontend (UI/UX) y el backend (reglas de negocio, seguridad)
2. **Defense in Depth**: Múltiples capas de seguridad (OAuth, RLS, validaciones)
3. **Audit Trail**: Todas las operaciones críticas quedan registradas
4. **Data Isolation**: Los datos de diferentes equipos están completamente aislados

---

## Modelo de Datos

### Diagrama Entidad-Relación

```
┌──────────────┐         ┌──────────────┐
│   profiles   │────┐    │    teams     │
└──────────────┘    │    └──────────────┘
       │            │           │
       │            │           │
       │            └───────────┼──────┐
       │                        │      │
       │            ┌───────────▼──────▼──┐
       │            │   team_members      │
       │            └─────────────────────┘
       │                        │
       │                        │
       ▼                        ▼
┌──────────────┐         ┌──────────────┐
│    tasks     │────────▶│ task_statuses│
└──────────────┘         └──────────────┘
       │
       │
       ▼
┌──────────────┐
│activity_logs │
└──────────────┘
```

### Descripción de Tablas

#### profiles
Almacena información extendida de usuarios. Se conecta automáticamente con `auth.users` de Supabase mediante triggers.

**Campos principales:**
- `id` (PK, FK a auth.users)
- `email`
- `full_name`
- `role` (legacy field, mantener para compatibilidad)
- `created_at`

**Relaciones:**
- 1:N con `tasks` (created_by)
- 1:N con `tasks` (assigned_to)
- 1:N con `team_members`

---

#### teams
Representa organizaciones o equipos de trabajo. Implementa multi-tenancy a nivel de aplicación.

**Campos principales:**
- `id` (PK)
- `name`
- `created_by` (FK a profiles)
- `created_at`

**Relaciones:**
- 1:N con `team_members`
- 1:N con `tasks`

**Reglas de negocio:**
- Un equipo debe tener al menos un Owner
- El creador del equipo es automáticamente el primer Owner

---

#### team_members
Tabla de unión que implementa la relaciónMany-to-Many entre usuarios y equipos, incluyendo el rol específico del usuario en cada equipo.

**Campos principales:**
- `id` (PK)
- `user_id` (FK a profiles)
- `team_id` (FK a teams)
- `role` (owner | admin | member)
- `joined_at`

**Constraints:**
- `UNIQUE(user_id, team_id)`: Un usuario no puede tener múltiples membresías en el mismo equipo
- `UNIQUE INDEX WHERE role='owner'`: Solo un owner por equipo

**Relaciones:**
- N:1 con `profiles`
- N:1 con `teams`

---

#### task_statuses
Catálogo de estados personalizables para las tareas.

**Campos principales:**
- `id` (PK)
- `name`
- `color` (código hexadecimal)
- `order_position`
- `is_active`

**Estados por defecto:**
1. Pendiente (#9CA3AF)
2. En Progreso (#3B82F6)
3. Completada (#10B981)

---

#### tasks
Entidad principal del sistema. Puede ser personal (team_id = NULL) o pertenecer a un equipo.

**Campos principales:**
- `id` (PK)
- `title` (NOT NULL)
- `description`
- `status_id` (FK a task_statuses)
- `team_id` (FK a teams, NULLABLE)
- `start_date`
- `due_date`
- `created_by` (FK a profiles)
- `assigned_to` (FK a profiles)
- `created_at`
- `updated_at`

**Tipos de tareas:**
1. **Personal**: `team_id IS NULL`, solo visible para el creador
2. **De equipo**: `team_id NOT NULL`, visibilidad según rol

**Relaciones:**
- N:1 con `profiles` (created_by)
- N:1 con `profiles` (assigned_to)
- N:1 con `teams`
- N:1 con `task_statuses`

---

#### activity_logs
Registro de auditoría. Almacena todas las operaciones relevantes para trazabilidad y cumplimiento normativo.

**Campos principales:**
- `id` (PK)
- `user_id` (FK a profiles)
- `user_email` (denormalizado para retención)
- `team_id` (FK a teams, NULLABLE)
- `entity_type` (task | team | team_member)
- `entity_id`
- `action` (created | updated | deleted | assigned | etc.)
- `changes` (JSONB con detalles del cambio)
- `description` (texto legible)
- `created_at`

**Tipos de acciones:**
- `created`, `updated`, `deleted`
- `assigned`, `unassigned`, `reassigned`
- `status_changed`
- `role_changed`
- `member_added`, `member_removed`

**Población:**
Los registros se crean automáticamente mediante triggers de PostgreSQL.

---

## Sistema de Seguridad

### Autenticación

**OAuth 2.0 Providers:**
- Google (accounts.google.com)
- Microsoft (login.microsoftonline.com)

**Flujo de autenticación:**
1. Usuario hace click en "Sign in with Google/Microsoft"
2. Redirección al provider OAuth
3. Usuario autoriza la aplicación
4. Callback con authorization code
5. Supabase intercambia code por access token
6. Se crea/actualiza sesión
7. Trigger `handle_new_user()` crea perfil si es primera vez

---

### Autorización (RBAC)

#### Jerarquía de Roles

**1. Owner (Propietario)**

Permisos:
- Eliminar el equipo
- Transferir ownership
- Agregar/remover cualquier miembro
- Modificar roles de cualquier miembro
- Todas las operaciones de Admin

Restricciones:
- Solo uno por equipo (garantizado por unique index)
- No puede abandonar el equipo sin transferir ownership

**2. Admin (Administrador)**

Permisos:
- Agregar nuevos miembros al equipo
- Remover Members (no otros Admins ni Owner)
- Crear, ver, editar y eliminar todas las tareas del equipo
- Ver activity logs del equipo

Restricciones:
- No puede modificar roles
- No puede eliminar el equipo
- No puede remover a otros Admins

**3. Member (Miembro)**

Permisos:
- Ver tareas asignadas a él
- Actualizar estado de sus tareas
- Ver miembros del equipo

Restricciones:
- No puede crear tareas
- No puede ver tareas de otros miembros
- No puede ver activity logs

---

### Row-Level Security (RLS)

Todas las tablas implementan RLS mediante políticas de PostgreSQL.

#### Políticas por Tabla

**profiles:**
```sql
-- SELECT: Tu perfil + usuarios que comparten algún equipo contigo
USING (id = auth.uid() OR id IN (SELECT user_id FROM team_members WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())))

-- UPDATE: Solo tu propio perfil
USING (id = auth.uid())
```

**teams:**
```sql
-- SELECT: Equipos donde eres miembro
USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))

-- UPDATE: Si eres Owner o Admin
USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')))

-- DELETE: Solo Owner
USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'owner'))
```

**team_members:**
```sql
-- SELECT: Miembros de equipos donde participas
USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))

-- INSERT: Si eres Owner o Admin del equipo
WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')))

-- UPDATE: Solo Owner puede cambiar roles
USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'owner'))

-- DELETE: Owner cualquiera, Admin solo members, auto-salida
USING (condiciones complejas según rol)
```

**tasks:**
```sql
-- SELECT:
USING (
  (team_id IS NULL AND created_by = auth.uid()) OR  -- Personales
  (team_id IN (SELECT ... WHERE role IN ('owner', 'admin'))) OR  -- Admins ven todas
  (team_id IN (SELECT ... WHERE role = 'member') AND assigned_to = auth.uid())  -- Members solo las suyas
)

-- INSERT:
WITH CHECK (
  (team_id IS NULL AND created_by = auth.uid()) OR  -- Cualquiera crea personales
  (team_id IN (SELECT ... WHERE role IN ('owner', 'admin')))  -- Solo admins de equipo
)

-- Similar para UPDATE y DELETE
```

**activity_logs:**
```sql
-- SELECT: Solo Owner y Admin de equipos, todos ven sus logs personales
USING (
  (team_id IS NULL AND user_id = auth.uid()) OR
  (team_id IN (SELECT ... WHERE role IN ('owner', 'admin')))
)

-- INSERT: Permitido para triggers (sistema)
WITH CHECK (true)
```

---

### Triggers y Funciones

#### handle_new_user()
**Propósito:** Crear perfil automáticamente cuando un usuario se registra.

**Trigger:** `on_auth_user_created` (AFTER INSERT en auth.users)

**Lógica:**
```sql
INSERT INTO profiles (id, email, full_name, role)
VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'basic')
```

---

#### log_task_changes()
**Propósito:** Registrar cambios en tareas para auditoría.

**Trigger:** `task_changes_log` (AFTER INSERT/UPDATE/DELETE en tasks)

**Eventos registrados:**
- Creación de tarea
- Cambio de estado
- Asignación/reasignación
- Cambio de título
- Eliminación

**Ejemplo de log generado:**
```json
{
  "entity_type": "task",
  "action": "status_changed",
  "changes": {
    "status_id": {
      "from": "uuid-pendiente",
      "to": "uuid-completada"
    }
  },
  "description": "cambió el estado de la tarea \"Revisar bodega\""
}
```

---

#### log_team_member_changes()
**Propósito:** Registrar cambios en membresías y roles.

**Trigger:** `team_member_changes_log` (AFTER INSERT/UPDATE/DELETE en team_members)

**Eventos registrados:**
- Agregar miembro
- Cambiar rol
- Remover miembro

---

## Instalación

### Prerequisitos

- Node.js 18+ 
- npm o yarn
- Cuenta en Supabase
- Credenciales OAuth (Google Cloud Console / Azure Portal)

### Pasos

#### 1. Clonar repositorio

```bash
git clone https://github.com/tu-usuario/tazk-web.git
cd tazk-web
```

#### 2. Instalar dependencias

```bash
npm install
```

#### 3. Configurar Supabase

**3.1. Crear proyecto**
- Ir a [supabase.com](https://supabase.com)
- Crear nuevo proyecto
- Anotar URL y Anon Key

**3.2. Ejecutar scripts SQL**

En Supabase SQL Editor, ejecutar en orden:

```sql
-- 1. Crear tablas base
-- (ejecutar script completo de creación de tablas)

-- 2. Habilitar RLS y crear políticas
-- (ejecutar script de políticas)

-- 3. Crear triggers
-- (ejecutar script de triggers)

-- 4. Insertar datos iniciales
-- (estados de tareas por defecto)
```

**3.3. Configurar OAuth Providers**

Ver documentación específica en:
- [Google OAuth Setup](docs/oauth-google.md)
- [Microsoft OAuth Setup](docs/oauth-microsoft.md)

#### 4. Configurar aplicación

Crear archivo `src/supabaseClient.js`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tu-proyecto.supabase.co'
const supabaseAnonKey = 'tu-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

#### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Aplicación disponible en `http://localhost:5173`

---

## Configuración

### Variables de Entorno

Recomendado para producción, crear `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

Actualizar `src/supabaseClient.js`:

```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
```

### OAuth Callbacks

Configurar en Supabase Dashboard:
- Site URL: `http://localhost:5173` (dev) / `https://tu-dominio.com` (prod)
- Redirect URLs: 
  - `http://localhost:5173/**`
  - `https://tu-dominio.com/**`

---

## Stack Tecnológico

### Frontend
- **Framework:** React 18.2
- **Build Tool:** Vite 5.0
- **Language:** JavaScript (ES2022)
- **State Management:** React Hooks
- **HTTP Client:** Supabase JS Client

### Backend
- **BaaS:** Supabase
- **Database:** PostgreSQL 15
- **Authentication:** Supabase Auth (OAuth 2.0)
- **Storage:** Supabase Storage (futuro)
- **Real-time:** Supabase Realtime (futuro)

### Infraestructura
- **Hosting:** Por definir (Vercel/Netlify recomendado)
- **Database Hosting:** Supabase Cloud
- **CDN:** Integrado con hosting provider

---

## Estructura del Proyecto

```
tazk-web/
├── src/
│   ├── App.jsx                    # Root component, routing
│   ├── main.jsx                   # Entry point
│   ├── supabaseClient.js          # Supabase configuration
│   │
│   ├── components/
│   │   ├── Login.jsx              # Authentication screen
│   │   ├── Dashboard.jsx          # Main dashboard
│   │   └── CreateTask.jsx         # Task creation form
│   │
│   ├── hooks/                     # Custom React hooks (futuro)
│   ├── utils/                     # Utility functions (futuro)
│   └── styles/
│       └── index.css              # Global styles
│
├── database/
│   ├── schema/
│   │   ├── 01_tables.sql          # Table definitions
│   │   ├── 02_indexes.sql         # Index creation
│   │   └── 03_constraints.sql     # Constraints & checks
│   │
│   ├── security/
│   │   └── rls_policies.sql       # Row Level Security policies
│   │
│   ├── functions/
│   │   ├── triggers.sql           # Trigger functions
│   │   └── helpers.sql            # Helper functions
│   │
│   └── seeds/
│       └── initial_data.sql       # Default task statuses
│
├── docs/
│   ├── oauth-google.md            # Google OAuth setup
│   ├── oauth-microsoft.md         # Microsoft OAuth setup
│   └── database-schema.md         # Detailed schema docs
│
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
```

---

## Roadmap

### Fase 1: MVP (Completado)
- [x] Autenticación OAuth
- [x] Gestión básica de tareas
- [x] Sistema de roles
- [x] Multi-tenancy
- [x] Activity logs

### Fase 2: Core Features (En desarrollo)
- [ ] Lista de tareas con filtros avanzados
- [ ] Edición inline de tareas
- [ ] Selector de equipo activo
- [ ] Panel de activity feed
- [ ] Gestión de miembros del equipo
- [ ] Sistema de invitaciones

### Fase 3: Advanced Features
- [ ] Adjuntar archivos a tareas
- [ ] Comentarios en tareas
- [ ] Notificaciones en tiempo real
- [ ] Dashboard de métricas
- [ ] Exportación de reportes

### Fase 4: Mobile
- [ ] App móvil React Native
- [ ] Notificaciones push
- [ ] Modo offline

---

## Mantenimiento

### Backups
Los backups de la base de datos son gestionados automáticamente por Supabase:
- Daily backups (Plan Pro)
- Point-in-time recovery

### Monitoreo
Métricas disponibles en Supabase Dashboard:
- API requests
- Database connections
- Storage usage
- Authentication events

---

## Licencia

Proyecto privado. Todos los derechos reservados.

---

## Contacto

**Desarrollador:** Andrew Zubieta  
**Email:** jairozb23@gmail.com

---

**Última actualización:** Diciembre 2025