# DOCUMENTACIÓN TÉCNICA COMPLETA - TAZK-WEB

## Índice

1. [Visión General](#1-visión-general)
2. [Estructura del Proyecto](#2-estructura-del-proyecto)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Configuración del Entorno](#4-configuración-del-entorno)
5. [Arquitectura de Componentes](#5-arquitectura-de-componentes)
6. [Base de Datos (Supabase)](#6-base-de-datos-supabase)
7. [Edge Functions](#7-edge-functions)
8. [Sistema de Autenticación](#8-sistema-de-autenticación)
9. [Sistema de Temas](#9-sistema-de-temas)
10. [Hooks Personalizados](#10-hooks-personalizados)
11. [Sistema de Notificaciones](#11-sistema-de-notificaciones)
12. [Integración OAuth para Email](#12-integración-oauth-para-email)
13. [PWA y Service Workers](#13-pwa-y-service-workers)
14. [Flujos Principales](#14-flujos-principales)
15. [Tipos TypeScript](#15-tipos-typescript)
16. [Guía de Desarrollo](#16-guía-de-desarrollo)

---

## 1. Visión General

**Tazk** es una aplicación web moderna de gestión de tareas diseñada para uso personal y colaborativo en equipos. Permite organizar tareas con múltiples vistas (lista, kanban, calendario), asignar responsables, establecer fechas límite y recibir notificaciones.

### Características Principales

- **Gestión de Tareas**: Crear, editar, eliminar y organizar tareas
- **Múltiples Vistas**: Lista, Kanban (drag & drop) y Calendario
- **Equipos**: Crear equipos, invitar miembros, asignar roles
- **Estados Personalizables**: Crear estados con colores y categorías
- **Notificaciones Push**: Alertas en tiempo real
- **Email Integrado**: Notificaciones por email con plantillas personalizables
- **OAuth Email**: Enviar emails desde la cuenta personal del usuario (Gmail/Outlook)
- **Métricas**: Dashboard con analytics y gráficos
- **Tema Claro/Oscuro**: Personalización visual
- **PWA**: Instalable como aplicación nativa
- **Tiempo Real**: Sincronización instantánea entre usuarios

---

## 2. Estructura del Proyecto

```
tazk-web/
├── public/                           # Assets públicos
│   ├── tazk.svg                      # Logo de la aplicación
│   └── sw-push.js                    # Service Worker para push
│
├── src/                              # Código fuente
│   ├── assets/                       # Recursos estáticos
│   │
│   ├── components/                   # Componentes reutilizables
│   │   ├── ui/                       # Componentes UI base
│   │   │   ├── AnimatedIcons.tsx     # 50+ iconos animados
│   │   │   └── button.tsx            # Botón base con variantes
│   │   ├── NotificationSettings.tsx  # Toggle de notificaciones
│   │   ├── Onboarding.tsx            # Tutorial inicial
│   │   ├── ProfileOnboarding.tsx     # Onboarding de perfil
│   │   ├── PrivacyPolicy.tsx         # Política de privacidad
│   │   └── TermsOfService.tsx        # Términos de servicio
│   │
│   ├── hooks/                        # Hooks personalizados
│   │   ├── useBodyScrollLock.ts      # Bloqueo de scroll
│   │   ├── useBottomSheetGesture.ts  # Gestos para bottom sheet
│   │   ├── useIsMobile.ts            # Detección de dispositivo
│   │   ├── usePushNotifications.ts   # Gestión de notificaciones push
│   │   └── useRealtimeSubscription.ts# Suscripciones en tiempo real
│   │
│   ├── lib/                          # Utilidades y servicios
│   │   ├── activityLogger.ts         # Sistema de logs de actividad
│   │   ├── pushNotifications.ts      # Funciones de push notifications
│   │   ├── sendPushNotification.ts   # Envío de notificaciones
│   │   └── utils.ts                  # Utilidades generales (cn)
│   │
│   ├── types/                        # Definiciones de tipos
│   │   └── database.types.ts         # Tipos de Supabase
│   │
│   ├── App.tsx                       # Componente raíz y router
│   ├── main.tsx                      # Entry point
│   ├── index.css                     # Estilos globales y variables CSS
│   ├── supabaseClient.ts             # Cliente de Supabase
│   ├── ThemeContext.tsx              # Contexto de tema
│   │
│   ├── Login.tsx                     # Pantalla de login
│   ├── OAuthCallback.tsx             # Callback de OAuth
│   ├── Dashboard.tsx                 # Panel principal
│   ├── Sidebar.tsx                   # Barra lateral de navegación
│   │
│   ├── TaskList.tsx                  # Vista de lista de tareas
│   ├── KanbanBoard.tsx               # Vista kanban con drag & drop
│   ├── CalendarView.tsx              # Vista de calendario
│   │
│   ├── CreateTask.tsx                # Modal crear tarea
│   ├── EditTask.tsx                  # Modal editar tarea
│   ├── TaskAttachments.tsx           # Gestión de adjuntos
│   ├── ManageStatuses.tsx            # Gestión de estados
│   │
│   ├── CreateTeam.tsx                # Crear equipo
│   ├── TeamMembers.tsx               # Gestión de miembros
│   ├── TeamSettings.tsx              # Configuración de equipo
│   ├── InviteMember.tsx              # Invitar miembros
│   │
│   ├── UserSettings.tsx              # Configuración de usuario
│   ├── EmailSettings.tsx             # Configuración de email
│   ├── DeleteAccountModal.tsx        # Eliminar cuenta
│   │
│   ├── Metrics.tsx                   # Dashboard de métricas
│   ├── ActivityLogs.tsx              # Historial de actividad
│   ├── Notifications.tsx             # Centro de notificaciones
│   │
│   ├── Toast.tsx                     # Notificaciones toast
│   ├── ConfirmDialog.tsx             # Diálogos de confirmación
│   └── vite-env.d.ts                 # Declaraciones Vite
│
├── .env                              # Variables de entorno
├── index.html                        # HTML principal
├── package.json                      # Dependencias
├── vite.config.js                    # Configuración de Vite
├── tailwind.config.js                # Configuración de Tailwind
├── tsconfig.json                     # Configuración TypeScript
├── postcss.config.js                 # Configuración PostCSS
└── eslint.config.js                  # Configuración ESLint
```

---

## 3. Stack Tecnológico

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19.2.0 | Framework UI |
| TypeScript | 5.9.3 | Tipado estático |
| Vite | 7.2.4 | Build tool y dev server |
| Tailwind CSS | 3.4.19 | Framework de estilos |
| React Router | 7.12.0 | Enrutamiento SPA |

### UI/UX

| Librería | Versión | Propósito |
|----------|---------|-----------|
| Lucide React | 0.560.0 | Iconos |
| Motion (Framer) | 12.23.26 | Animaciones |
| @dnd-kit | 6.3.1 / 10.0.0 | Drag & Drop |
| react-big-calendar | 1.19.4 | Calendario |
| react-datepicker | 8.10.0 | Selector de fecha |
| react-colorful | 5.6.1 | Selector de color |
| Recharts | 3.5.1 | Gráficos |

### Backend

| Servicio | Propósito |
|----------|-----------|
| Supabase | Base de datos PostgreSQL |
| Supabase Auth | Autenticación OAuth |
| Supabase Realtime | Suscripciones en tiempo real |
| Supabase Edge Functions | Funciones serverless |
| Supabase Storage | Almacenamiento de archivos |

### Utilidades

| Librería | Propósito |
|----------|-----------|
| date-fns | Manipulación de fechas |
| clsx | Clases condicionales |
| tailwind-merge | Merge de clases Tailwind |
| class-variance-authority | Variantes de componentes |

---

## 4. Configuración del Entorno

### Variables de Entorno (.env)

```env
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key

# Push Notifications
VITE_VAPID_PUBLIC_KEY=tu-vapid-public-key
```

### Configuración de Vite (vite.config.js)

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Tazk - Gestión de Tareas',
        short_name: 'Tazk',
        description: 'Aplicación de gestión de tareas y equipos',
        theme_color: '#facc15',
        background_color: '#171717',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'tazk.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'tazk.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        importScripts: ['/sw-push.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 86400 // 24 horas
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

### Configuración de Tailwind (tailwind.config.js)

```javascript
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        // ... más colores
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}
```

---

## 5. Arquitectura de Componentes

### Jerarquía de Componentes

```
App.tsx
├── ThemeProvider
│   ├── Login.tsx (ruta: /login)
│   ├── OAuthCallback.tsx (ruta: /auth/:provider/callback)
│   └── Dashboard.tsx (ruta: /)
│       ├── Sidebar.tsx
│       │   ├── Logo y navegación
│       │   ├── Selector de equipos
│       │   └── Menú de usuario
│       │
│       ├── [Vista Principal]
│       │   ├── TaskList.tsx (viewMode: 'list')
│       │   ├── KanbanBoard.tsx (viewMode: 'kanban')
│       │   └── CalendarView.tsx (viewMode: 'calendar')
│       │
│       └── [Modales]
│           ├── CreateTask.tsx
│           ├── EditTask.tsx
│           ├── UserSettings.tsx
│           ├── EmailSettings.tsx
│           ├── CreateTeam.tsx
│           ├── TeamMembers.tsx
│           ├── TeamSettings.tsx
│           ├── InviteMember.tsx
│           ├── ManageStatuses.tsx
│           ├── Metrics.tsx
│           └── ActivityLogs.tsx
```

### Componentes Principales

#### App.tsx
- **Responsabilidad**: Router principal y gestión de sesión
- **Estado**: `session`, `loading`
- **Hooks**: `useEffect` para auth listener

```typescript
function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
          <Route path="/auth/:provider/callback" element={<OAuthCallback />} />
          <Route path="/*" element={session ? <Dashboard /> : <Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
```

#### Dashboard.tsx
- **Responsabilidad**: Orquestación de la aplicación principal
- **Estado**: Usuario, equipo actual, vista, modales, búsqueda
- **Características**:
  - Carga de datos de usuario y equipos
  - Gestión de vistas (list/kanban/calendar)
  - Control de modales
  - Suscripciones en tiempo real

#### TaskList.tsx / KanbanBoard.tsx / CalendarView.tsx
- **Responsabilidad**: Renderizar tareas en diferentes formatos
- **Props**: `tasks`, `statuses`, `onTaskClick`, `onStatusChange`
- **Características**:
  - Filtrado y ordenamiento
  - Drag & drop (Kanban)
  - Integración con calendario

---

## 6. Base de Datos (Supabase)

### Diagrama de Relaciones

```
┌─────────────────┐      ┌─────────────────┐
│    profiles     │      │     teams       │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │◄────┐│ id (PK)         │
│ email           │     ││ name            │
│ full_name       │     ││ color           │
│ phone           │     │└──────┬──────────┘
│ country         │     │       │
│ city            │     │       │
│ theme           │     │       ▼
│ role            │     │┌─────────────────┐
└────────┬────────┘     ││  team_members   │
         │              │├─────────────────┤
         │              ││ id (PK)         │
         │              ││ user_id (FK)────┘
         │              ││ team_id (FK)────┐
         │              ││ role            │
         │              │└─────────────────┘
         │              │
         │              ▼
         │       ┌─────────────────┐
         │       │     tasks       │
         │       ├─────────────────┤
         └──────►│ id (PK)         │
                 │ title           │
                 │ description     │
                 │ status_id (FK)──┼──────►┌─────────────────┐
                 │ team_id (FK)    │       │  task_statuses  │
                 │ created_by (FK) │       ├─────────────────┤
                 │ assigned_to(FK) │       │ id (PK)         │
                 │ start_date      │       │ name            │
                 │ due_date        │       │ color           │
                 └────────┬────────┘       │ order_position  │
                          │                │ category        │
                          ▼                └─────────────────┘
                 ┌─────────────────┐
                 │task_attachments │
                 ├─────────────────┤
                 │ id (PK)         │
                 │ task_id (FK)    │
                 │ file_name       │
                 │ file_path       │
                 └─────────────────┘
```

### Tablas Detalladas

#### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  country TEXT,
  city TEXT,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  notifications_enabled BOOLEAN DEFAULT true,
  notify_on_assign BOOLEAN DEFAULT true,
  notify_on_due BOOLEAN DEFAULT true,
  role TEXT DEFAULT 'basic' CHECK (role IN ('admin', 'basic')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### teams
```sql
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT, -- Hex color (#RRGGBB)
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### team_members
```sql
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);
```

#### tasks
```sql
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status_id UUID REFERENCES task_statuses(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  start_date DATE,
  due_date DATE,
  notify_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### task_statuses
```sql
CREATE TABLE task_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL, -- Hex color
  order_position INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('not_started', 'in_progress', 'completed'))
);
```

#### activity_logs
```sql
CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  user_email TEXT NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'task', 'team', 'team_member', 'status', 'invitation', 'profile'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'assigned', 'status_changed', etc.
  changes JSONB, -- Cambios realizados
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### team_invitations
```sql
CREATE TABLE team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ
);
```

#### email_oauth_tokens
```sql
CREATE TABLE email_oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);
```

#### email_settings
```sql
CREATE TABLE email_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  from_name TEXT,
  notify_on_create BOOLEAN DEFAULT false,
  notify_on_assign BOOLEAN DEFAULT true,
  notify_on_due BOOLEAN DEFAULT true,
  notify_on_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### email_templates
```sql
CREATE TABLE email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task_created', 'task_assigned', 'task_due', 'task_completed')),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### email_logs
```sql
CREATE TABLE email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  template_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  external_id TEXT,
  sent_via TEXT, -- 'gmail_oauth', 'resend'
  from_email TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### push_subscriptions
```sql
CREATE TABLE push_subscriptions (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, endpoint)
);
```

#### task_attachments
```sql
CREATE TABLE task_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Edge Functions

### send-push-notification

Envía notificaciones push a usuarios específicos.

```typescript
// Invocación
await supabase.functions.invoke('send-push-notification', {
  body: {
    user_id: 'uuid',        // Usuario único
    user_ids: ['uuid'],     // O múltiples usuarios
    title: 'Título',
    body: 'Mensaje',
    url: '/ruta',           // URL al hacer click
    tag: 'tipo',            // Para agrupar notificaciones
    data: {}                // Datos adicionales
  }
})
```

### email-oauth-google

Intercambia código OAuth de Google por tokens.

```typescript
// Invocación
await supabase.functions.invoke('email-oauth-google', {
  body: {
    action: 'exchange_code',
    code: 'authorization_code',
    redirect_uri: 'http://localhost:5173/auth/google/callback'
  },
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
})

// Respuesta exitosa
{ success: true, email: 'usuario@gmail.com' }
```

### email-oauth-microsoft

Intercambia código OAuth de Microsoft por tokens.

```typescript
// Similar a email-oauth-google
await supabase.functions.invoke('email-oauth-microsoft', {
  body: {
    action: 'exchange_code',
    code: 'authorization_code',
    redirect_uri: 'http://localhost:5173/auth/microsoft/callback'
  },
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
})
```

### send-email

Envía emails usando OAuth (Gmail/Outlook) o Resend como fallback.

```typescript
await supabase.functions.invoke('send-email', {
  body: {
    to: 'destinatario@email.com',
    subject: 'Asunto',
    html: '<p>Contenido HTML</p>',
    from_name: 'Nombre del remitente',
    template_type: 'task_assigned',
    user_id: 'uuid',
    team_id: 'uuid' // opcional
  }
})

// Respuesta
{ success: true, sent_via: 'gmail' | 'resend' }
```

---

## 8. Sistema de Autenticación

### Flujo de Login con OAuth

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Login.tsx │     │   Provider  │     │   Supabase  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ signInWithOAuth   │                   │
       │──────────────────►│                   │
       │                   │                   │
       │    Redirect to    │                   │
       │◄──────────────────│                   │
       │                   │                   │
       │ User authenticates│                   │
       │                   │                   │
       │   Callback with   │                   │
       │      code         │                   │
       │◄──────────────────│                   │
       │                   │                   │
       │        Exchange code for session      │
       │──────────────────────────────────────►│
       │                   │                   │
       │             Session                   │
       │◄──────────────────────────────────────│
       │                   │                   │
```

### Implementación en Login.tsx

```typescript
const handleGoogleLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      scopes: 'openid email profile',
      queryParams: {
        prompt: 'select_account'
      }
    }
  })
}

const handleMicrosoftLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'openid email profile',
      queryParams: {
        prompt: 'select_account'
      }
    }
  })
}
```

### Listener de Sesión en App.tsx

```typescript
useEffect(() => {
  // Obtener sesión inicial
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
    setLoading(false)
  })

  // Escuchar cambios
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session)
    }
  )

  return () => subscription.unsubscribe()
}, [])
```

---

## 9. Sistema de Temas

### ThemeContext.tsx

```typescript
type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Leer de localStorage o default 'dark'
    const saved = localStorage.getItem('tazk-theme')
    return (saved as Theme) || 'dark'
  })

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('tazk-theme', newTheme)

    // Aplicar clase al documento
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
```

### Variables CSS (index.css)

```css
:root {
  --radius: 0.5rem;

  /* Light mode colors */
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --accent: 0 0% 96.1%;
  --accent-foreground: 0 0% 9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 89.8%;
  --input: 0 0% 89.8%;
  --ring: 0 0% 3.9%;
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  --card: 0 0% 3.9%;
  --card-foreground: 0 0% 98%;
  --popover: 0 0% 3.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 0 0% 9%;
  --secondary: 0 0% 14.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 0 0% 14.9%;
  --muted-foreground: 0 0% 63.9%;
  --accent: 0 0% 14.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 14.9%;
  --input: 0 0% 14.9%;
  --ring: 0 0% 83.1%;
}
```

---

## 10. Hooks Personalizados

### useRealtimeSubscription

Suscripción a cambios en tiempo real de Supabase.

```typescript
interface Subscription {
  table: string
  schema?: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
}

interface Options {
  subscriptions: Subscription[]
  onchange: (payload: RealtimePayload) => void
  enabled?: boolean
}

function useRealtimeSubscription({ subscriptions, onchange, enabled = true }: Options) {
  useEffect(() => {
    if (!enabled || subscriptions.length === 0) return

    const channel = supabase.channel('realtime-changes')

    subscriptions.forEach(({ table, schema = 'public', event = '*', filter }) => {
      channel.on(
        'postgres_changes',
        { event, schema, table, filter },
        (payload) => onchange(payload)
      )
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [subscriptions, onchange, enabled])
}

// Uso
useRealtimeSubscription({
  subscriptions: [
    { table: 'tasks', filter: `team_id=eq.${teamId}` },
    { table: 'task_statuses', filter: `team_id=eq.${teamId}` }
  ],
  onchange: (payload) => {
    if (payload.table === 'tasks') loadTasks()
    if (payload.table === 'task_statuses') loadStatuses()
  },
  enabled: !!teamId
})
```

### usePushNotifications

Gestión completa de notificaciones push.

```typescript
interface UsePushNotificationsProps {
  userId: string | null
}

function usePushNotifications({ userId }: UsePushNotificationsProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  const isSupported = 'Notification' in window && 'serviceWorker' in navigator

  const subscribe = async () => {
    if (!userId || !isSupported) return false

    setLoading(true)
    try {
      const result = await subscribeToPush(userId)
      setIsSubscribed(result)
      setPermission(Notification.permission)
      return result
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    if (!userId) return false

    setLoading(true)
    try {
      await unsubscribeFromPush(userId)
      setIsSubscribed(false)
      return true
    } finally {
      setLoading(false)
    }
  }

  const toggle = async () => {
    return isSubscribed ? unsubscribe() : subscribe()
  }

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission)
      isSubscribedToPush().then(setIsSubscribed)
    }
  }, [])

  return { permission, isSubscribed, loading, isSupported, subscribe, unsubscribe, toggle }
}
```

### useIsMobile

Detección de dispositivo móvil.

```typescript
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint)

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [breakpoint])

  return isMobile
}

// Uso
const isMobile = useIsMobile() // Default: < 768px
const isTablet = useIsMobile(1024) // < 1024px
```

### useBodyScrollLock

Bloquea el scroll del body (útil para modales).

```typescript
function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
    } else {
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, parseInt(scrollY || '0') * -1)
    }
  }, [isLocked])
}

// Uso
useBodyScrollLock(isModalOpen)
```

### useBottomSheetGesture

Gestos para bottom sheets en móvil.

```typescript
interface Options {
  onClose: () => void
  enabled?: boolean
  threshold?: number
}

function useBottomSheetGesture({ onClose, enabled = true, threshold = 100 }: Options) {
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enabled) return
    setIsDragging(true)
    setStartY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    setCurrentY(e.touches[0].clientY)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return

    const diff = currentY - startY
    if (diff > threshold) {
      onClose()
    }

    setIsDragging(false)
    setStartY(0)
    setCurrentY(0)
  }

  return {
    isDragging,
    dragOffset: Math.max(0, currentY - startY),
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  }
}
```

---

## 11. Sistema de Notificaciones

### Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Notificaciones                        │
├──────────────────┬──────────────────┬───────────────────┤
│   Toast (UI)     │   Push (Native)  │   Email           │
├──────────────────┼──────────────────┼───────────────────┤
│ Toast.tsx        │ usePushNotif...  │ EmailSettings.tsx │
│ showToast()      │ pushNotif.ts     │ send-email func   │
│ Temporal (3s)    │ Service Worker   │ Gmail/Resend      │
└──────────────────┴──────────────────┴───────────────────┘
```

### Toast Notifications

```typescript
// Toast.tsx
interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

function Toast({ message, type = 'info', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white ${colors[type]}`}
    >
      {message}
    </motion.div>
  )
}
```

### Push Notifications

```typescript
// lib/pushNotifications.ts

// Verificar soporte
export const isPushSupported = () =>
  'Notification' in window && 'serviceWorker' in navigator

// Solicitar permiso
export const requestNotificationPermission = async () => {
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

// Suscribir usuario
export const subscribeToPush = async (userId: string) => {
  const registration = await navigator.serviceWorker.ready

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  })

  const { endpoint, keys } = subscription.toJSON()

  await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    updated_at: new Date().toISOString()
  })

  return true
}

// Enviar notificación
export const notifyTaskAssigned = async (
  assignedToId: string,
  taskTitle: string,
  assignerName: string
) => {
  await supabase.functions.invoke('send-push-notification', {
    body: {
      user_id: assignedToId,
      title: 'Nueva tarea asignada',
      body: `${assignerName} te asignó: ${taskTitle}`,
      url: '/',
      tag: 'task-assigned'
    }
  })
}
```

### Email Notifications

```typescript
// Envío de email de prueba
const sendTestEmail = async () => {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: testEmail,
      subject: 'Correo de prueba - Tazk',
      html: `<div>...</div>`,
      from_name: fromName,
      template_type: 'test',
      user_id: currentUserId,
      team_id: teamId
    }
  })

  if (error) {
    showToast('Error al enviar', 'error')
  } else {
    showToast(`Correo enviado vía ${data.sent_via}`, 'success')
  }
}
```

---

## 12. Integración OAuth para Email

### Flujo de Conexión Gmail

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│EmailSettings│     │   Google    │     │ Edge Func   │     │  Supabase   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │ Click "Gmail"     │                   │                   │
       │──────────────────►│                   │                   │
       │                   │                   │                   │
       │ Redirect to OAuth │                   │                   │
       │◄──────────────────│                   │                   │
       │                   │                   │                   │
       │ User consents     │                   │                   │
       │                   │                   │                   │
       │ Callback + code   │                   │                   │
       │◄──────────────────│                   │                   │
       │                   │                   │                   │
       │            Exchange code              │                   │
       │──────────────────────────────────────►│                   │
       │                   │                   │                   │
       │                   │    Get tokens     │                   │
       │                   │◄──────────────────│                   │
       │                   │                   │                   │
       │                   │    Tokens         │                   │
       │                   │──────────────────►│                   │
       │                   │                   │                   │
       │                   │                   │  Store tokens     │
       │                   │                   │──────────────────►│
       │                   │                   │                   │
       │         Success + email               │                   │
       │◄──────────────────────────────────────│                   │
```

### Implementación Frontend

```typescript
// EmailSettings.tsx

const connectEmail = async (provider: 'google' | 'microsoft') => {
  setConnectingProvider(provider)

  const baseUrl = window.location.origin
  const redirectUri = `${baseUrl}/auth/${provider}/callback`

  if (provider === 'google') {
    const clientId = 'YOUR_GOOGLE_CLIENT_ID'
    const scopes = encodeURIComponent(
      'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email'
    )

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${scopes}&` +
      `access_type=offline&` +
      `prompt=consent`

    window.location.href = authUrl
  } else {
    // Microsoft OAuth similar
  }
}

const disconnectEmail = async () => {
  await supabase
    .from('email_oauth_tokens')
    .delete()
    .eq('user_id', currentUserId)

  setConnectedEmail(null)
  showToast('Correo desconectado', 'success')
}
```

### OAuthCallback.tsx

```typescript
function OAuthCallback() {
  const { provider } = useParams<{ provider: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error) {
      setStatus('error')
      setMessage(`Error: ${error}`)
      return
    }

    if (!code) {
      setStatus('error')
      setMessage('No se recibió código de autorización')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('No hay sesión activa')
      }

      const redirectUri = `${window.location.origin}/auth/${provider}/callback`

      const { data, error: fnError } = await supabase.functions.invoke(
        `email-oauth-${provider}`,
        {
          body: { action: 'exchange_code', code, redirect_uri: redirectUri },
          headers: { Authorization: `Bearer ${session.access_token}` }
        }
      )

      if (fnError) throw fnError

      // Guardar resultado para que EmailSettings lo detecte
      localStorage.setItem('oauth_connected', JSON.stringify({
        provider,
        email: data.email,
        timestamp: Date.now()
      }))

      setStatus('success')
      setMessage(`Conectado: ${data.email}`)

      setTimeout(() => navigate('/'), 2000)

    } catch (err: any) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      {status === 'loading' && <Spinner />}
      {status === 'success' && <SuccessIcon />}
      {status === 'error' && <ErrorIcon />}
      <p>{message}</p>
    </div>
  )
}
```

### Edge Function: email-oauth-google

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  try {
    const { action, code, redirect_uri } = await req.json()

    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // Verificar usuario
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const { data: { user } } = await supabase.auth.getUser(token!)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers }
      )
    }

    if (action === 'exchange_code') {
      // Intercambiar código por tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri,
          grant_type: 'authorization_code',
        }),
      })

      const tokens = await tokenResponse.json()

      if (tokens.error) {
        return new Response(
          JSON.stringify({ error: tokens.error_description }),
          { status: 400, headers }
        )
      }

      // Obtener email del usuario
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      )
      const userInfo = await userInfoResponse.json()

      // Guardar tokens
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

      await supabase.from('email_oauth_tokens').upsert({
        user_id: user.id,
        provider: 'google',
        email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' })

      return new Response(
        JSON.stringify({ success: true, email: userInfo.email }),
        { headers }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Acción no válida' }),
      { status: 400, headers }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    )
  }
})
```

---

## 13. PWA y Service Workers

### Configuración PWA (vite.config.js)

```javascript
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Tazk - Gestión de Tareas',
    short_name: 'Tazk',
    description: 'Aplicación de gestión de tareas y equipos',
    theme_color: '#facc15',
    background_color: '#171717',
    display: 'standalone',
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    icons: [
      {
        src: 'tazk.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any'
      },
      {
        src: 'tazk.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable'
      }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    importScripts: ['/sw-push.js'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*supabase\.co\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 86400
          }
        }
      }
    ]
  }
})
```

### Service Worker para Push (public/sw-push.js)

```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}

  const options = {
    body: data.body || 'Nueva notificación',
    icon: '/tazk.svg',
    badge: '/tazk.svg',
    tag: data.tag || 'default',
    data: {
      url: data.url || '/'
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Tazk', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Si hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      // Si no, abrir nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
```

---

## 14. Flujos Principales

### Flujo: Crear Tarea

```
1. Usuario abre CreateTask modal
   └─ Dashboard: setShowCreateTask(true)

2. Usuario llena formulario
   └─ título, descripción, estado, asignado, fechas

3. Click "Crear"
   └─ handleSubmit()

4. INSERT en base de datos
   └─ supabase.from('tasks').insert(taskData)

5. Registrar actividad (trigger automático)
   └─ activity_logs: action='created'

6. Si hay asignado, notificar
   └─ notifyTaskAssigned(assignedTo, title, creatorName)

7. Callback al parent
   └─ onTaskCreated(newTask)

8. Recargar lista
   └─ loadTasks()

9. Cerrar modal
   └─ setShowCreateTask(false)

10. Mostrar toast
    └─ showToast('Tarea creada', 'success')
```

### Flujo: Cambiar Estado (Drag & Drop)

```
1. Usuario arrastra tarea en Kanban
   └─ DragStartEvent

2. Suelta en nueva columna
   └─ DragEndEvent

3. Determinar nuevo estado
   └─ const newStatusId = event.over.id

4. Actualizar optimistamente UI
   └─ setTasks(prev => updateTaskStatus(...))

5. UPDATE en base de datos
   └─ supabase.from('tasks').update({ status_id }).eq('id', taskId)

6. Registrar cambio
   └─ logTaskStatusChanged(task, oldStatus, newStatus)

7. Otros usuarios ven cambio (realtime)
   └─ useRealtimeSubscription detecta UPDATE
```

### Flujo: Invitar Miembro

```
1. Owner/Admin abre InviteMember
   └─ Dashboard: setShowInviteMember(true)

2. Ingresa email y rol
   └─ email, role: 'admin' | 'member'

3. Click "Invitar"
   └─ handleInvite()

4. Verificar que no sea miembro
   └─ SELECT FROM team_members WHERE email = ?

5. Crear invitación
   └─ INSERT INTO team_invitations

6. Enviar email de invitación
   └─ supabase.functions.invoke('send-email', { template: 'invitation' })

7. Notificar si está registrado
   └─ notifyTeamInvite(userId, teamName, inviterName)

8. Mostrar toast
   └─ showToast('Invitación enviada', 'success')
```

### Flujo: Aceptar Invitación

```
1. Usuario recibe email/notificación
   └─ Link con token: /invite?token=xxx

2. Verificar token válido
   └─ SELECT FROM team_invitations WHERE token = ? AND status = 'pending'

3. Verificar no expirado
   └─ expires_at > NOW()

4. Crear membresía
   └─ INSERT INTO team_members

5. Actualizar invitación
   └─ UPDATE team_invitations SET status = 'accepted'

6. Registrar actividad
   └─ logActivity('invitation', 'accepted')

7. Redirigir a equipo
   └─ navigate(`/?team=${teamId}`)
```

---

## 15. Tipos TypeScript

### Tipos Base

```typescript
// types/database.types.ts

// Roles
export type UserRole = 'owner' | 'admin' | 'member'
export type ProfileRole = 'admin' | 'basic'

// Estados
export type StatusCategory = 'not_started' | 'in_progress' | 'completed'
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired'
export type EmailLogStatus = 'pending' | 'sent' | 'failed'

// Entidades para logs
export type EntityType = 'task' | 'team' | 'team_member' | 'status' | 'invitation' | 'profile'
export type ActionType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'assigned'
  | 'reassigned'
  | 'unassigned'
  | 'status_changed'
  | 'completed'
  | 'invited'
  | 'joined'
  | 'left'
  | 'role_changed'

// Tema
export type Theme = 'light' | 'dark'

// OAuth Provider
export type OAuthProvider = 'google' | 'microsoft'
```

### Interfaces de Entidades

```typescript
export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  country: string | null
  city: string | null
  theme: Theme
  notifications_enabled: boolean
  notify_on_assign: boolean
  notify_on_due: boolean
  role: ProfileRole
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  color: string | null
  created_by: string | null
  created_at: string
}

export interface TeamMember {
  id: string
  user_id: string
  team_id: string
  role: UserRole
  joined_at: string
  // Joined
  profiles?: Profile
  teams?: Team
}

export interface Task {
  id: string
  title: string
  description: string | null
  status_id: string | null
  team_id: string | null
  created_by: string
  assigned_to: string | null
  start_date: string | null
  due_date: string | null
  notify_email: string | null
  created_at: string
  updated_at: string
  // Joined
  task_statuses?: TaskStatus
  profiles?: Profile
  assigned_profile?: Profile
}

export interface TaskStatus {
  id: string
  name: string
  color: string
  order_position: number
  is_active: boolean
  team_id: string | null
  created_by: string | null
  category: StatusCategory
}

export interface ActivityLog {
  id: string
  user_id: string
  user_email: string
  team_id: string | null
  entity_type: EntityType
  entity_id: string
  action: ActionType
  changes: Record<string, any> | null
  description: string
  created_at: string
}

export interface TeamInvitation {
  id: string
  team_id: string
  email: string
  role: 'admin' | 'member'
  invited_by: string
  status: InvitationStatus
  token: string
  created_at: string
  expires_at: string
  responded_at: string | null
}

export interface EmailOAuthToken {
  id: string
  user_id: string
  provider: OAuthProvider
  email: string
  access_token: string
  refresh_token: string
  expires_at: string
  created_at: string
  updated_at: string
}

export interface EmailSettings {
  id: string
  user_id: string | null
  team_id: string | null
  is_enabled: boolean
  from_name: string | null
  notify_on_create: boolean
  notify_on_assign: boolean
  notify_on_due: boolean
  notify_on_complete: boolean
  created_at: string
  updated_at: string
}

export interface EmailTemplate {
  id: string
  user_id: string | null
  team_id: string | null
  type: 'task_created' | 'task_assigned' | 'task_due' | 'task_completed'
  name: string
  subject: string
  body_html: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EmailLog {
  id: string
  user_id: string | null
  team_id: string | null
  task_id: string | null
  template_id: string | null
  to_email: string
  subject: string | null
  template_type: string | null
  status: EmailLogStatus
  error_message: string | null
  external_id: string | null
  sent_via: 'gmail_oauth' | 'resend' | null
  from_email: string | null
  sent_at: string | null
  created_at: string
}

export interface TaskAttachment {
  id: string
  task_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  uploaded_by: string
  created_at: string
}

export interface PushSubscription {
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  updated_at: string
}
```

---

## 16. Guía de Desarrollo

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/tazk-web.git
cd tazk-web

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar servidor de desarrollo
npm run dev
```

### Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo (Vite)
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # Ejecutar ESLint
```

### Estructura de Commits

```
feat: Nueva funcionalidad
fix: Corrección de bug
docs: Documentación
style: Formateo (no afecta lógica)
refactor: Refactorización
test: Tests
chore: Tareas de mantenimiento
```

### Agregar Nuevo Componente

1. Crear archivo en `src/` o `src/components/`
2. Exportar componente con tipado TypeScript
3. Importar en el componente padre
4. Agregar estilos con Tailwind CSS

```typescript
// src/components/MiComponente.tsx
import { useState } from 'react'

interface MiComponenteProps {
  titulo: string
  onAccion: () => void
}

export function MiComponente({ titulo, onAccion }: MiComponenteProps) {
  const [estado, setEstado] = useState(false)

  return (
    <div className="p-4 bg-card rounded-lg">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <button
        onClick={onAccion}
        className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded"
      >
        Acción
      </button>
    </div>
  )
}
```

### Agregar Nueva Tabla en Supabase

1. Crear migración SQL en Supabase Dashboard
2. Agregar tipos en `types/database.types.ts`
3. Configurar RLS (Row Level Security)
4. Crear funciones de acceso en el componente

```sql
-- Ejemplo de nueva tabla
CREATE TABLE mi_tabla (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE mi_tabla ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON mi_tabla FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
  ON mi_tabla FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Agregar Nueva Edge Function

1. Crear en Supabase Dashboard → Edge Functions
2. Implementar con CORS headers
3. Agregar secrets necesarios
4. Invocar desde frontend

```typescript
// Edge Function template
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const { param1, param2 } = await req.json()

    // Lógica aquí

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: corsHeaders }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})
```

---

## Apéndice: Comandos Útiles

### Supabase CLI

```bash
# Login
supabase login

# Link proyecto
supabase link --project-ref tu-project-ref

# Descargar función
supabase functions download nombre-funcion

# Desplegar función
supabase functions deploy nombre-funcion

# Ver logs
supabase functions logs nombre-funcion
```

### Git

```bash
# Estado
git status

# Agregar cambios
git add .

# Commit
git commit -m "feat: descripción"

# Push
git push origin main
```

### Debugging

```javascript
// En consola del navegador
localStorage.getItem('tazk-theme')
localStorage.getItem('oauth_connected')

// Ver sesión de Supabase
const { data } = await supabase.auth.getSession()
console.log(data.session)

// Ver usuario actual
const { data } = await supabase.auth.getUser()
console.log(data.user)
```

---

*Documentación generada el 27 de Enero de 2026*
*Versión: 1.0.0*
