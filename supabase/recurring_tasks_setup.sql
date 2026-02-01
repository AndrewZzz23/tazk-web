-- ============================================
-- SETUP DE TAREAS RECURRENTES (RUTINAS)
-- ============================================
-- Ejecutar este SQL en el SQL Editor de Supabase

-- 1. CREAR TABLA recurring_tasks
-- ============================================

CREATE TABLE IF NOT EXISTS public.recurring_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id UUID NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  time_of_day TIME NOT NULL DEFAULT '08:00:00',
  days_of_week INTEGER[] NULL, -- Array de 0-6 (Dom-Sáb) para frecuencia semanal
  day_of_month INTEGER NULL CHECK (day_of_month >= 1 AND day_of_month <= 31), -- Para frecuencia mensual
  default_status_id UUID NULL,
  assigned_to UUID NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_created_at TIMESTAMPTZ NULL,
  next_scheduled_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT recurring_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT recurring_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT recurring_tasks_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT recurring_tasks_default_status_id_fkey FOREIGN KEY (default_status_id) REFERENCES task_statuses(id) ON DELETE SET NULL,
  CONSTRAINT recurring_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL
);

-- 2. CREAR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_recurring_tasks_user ON public.recurring_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_team ON public.recurring_tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_active ON public.recurring_tasks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_next_scheduled ON public.recurring_tasks(next_scheduled_at) WHERE is_active = true;

-- 3. HABILITAR RLS (Row Level Security)
-- ============================================

ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver sus propias rutinas o las de sus equipos
CREATE POLICY "Users can view own recurring tasks" ON public.recurring_tasks
  FOR SELECT USING (
    auth.uid() = user_id
    OR team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Política: Los usuarios pueden crear rutinas para sí mismos o para sus equipos (si son owner/admin)
CREATE POLICY "Users can create recurring tasks" ON public.recurring_tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      team_id IS NULL
      OR team_id IN (
        SELECT team_id FROM team_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Política: Los usuarios pueden actualizar sus propias rutinas o las de sus equipos (si son owner/admin)
CREATE POLICY "Users can update own recurring tasks" ON public.recurring_tasks
  FOR UPDATE USING (
    auth.uid() = user_id
    OR (
      team_id IN (
        SELECT team_id FROM team_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Política: Los usuarios pueden eliminar sus propias rutinas o las de sus equipos (si son owner/admin)
CREATE POLICY "Users can delete own recurring tasks" ON public.recurring_tasks
  FOR DELETE USING (
    auth.uid() = user_id
    OR (
      team_id IN (
        SELECT team_id FROM team_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- 4. COMENTARIOS DE TABLA
-- ============================================

COMMENT ON TABLE public.recurring_tasks IS 'Configuraciones de tareas recurrentes (rutinas) que se crean automáticamente';
COMMENT ON COLUMN public.recurring_tasks.frequency IS 'Frecuencia: daily, weekly, monthly';
COMMENT ON COLUMN public.recurring_tasks.time_of_day IS 'Hora del día en que se crea la tarea';
COMMENT ON COLUMN public.recurring_tasks.days_of_week IS 'Días de la semana (0=Dom, 6=Sáb) para frecuencia weekly';
COMMENT ON COLUMN public.recurring_tasks.day_of_month IS 'Día del mes (1-31) para frecuencia monthly';
COMMENT ON COLUMN public.recurring_tasks.next_scheduled_at IS 'Próxima fecha/hora programada para crear la tarea';

-- ============================================
-- FIN DEL SETUP DE TABLA
-- ============================================


-- ============================================
-- SETUP DEL CRON JOB (pg_cron)
-- ============================================
-- NOTA: Esto requiere que pg_cron esté habilitado en tu proyecto Supabase
-- Ve a Database > Extensions y habilita pg_cron si no lo está

-- Opción A: Usar pg_cron directamente (si está disponible)
-- Esto ejecutará la Edge Function cada 15 minutos

/*
-- Primero, crear la extensión si no existe
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crear el cron job que llama a la Edge Function cada 15 minutos
SELECT cron.schedule(
  'create-recurring-tasks',  -- nombre del job
  '*/15 * * * *',            -- cada 15 minutos
  $$
  SELECT net.http_post(
    url := 'https://TU_PROJECT_REF.supabase.co/functions/v1/create-recurring-tasks',
    headers := '{"Authorization": "Bearer TU_ANON_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
*/

-- ============================================
-- ALTERNATIVA: Usar Supabase Cron (Dashboard)
-- ============================================
-- 1. Ve a tu proyecto en Supabase Dashboard
-- 2. Ve a "Database" > "Cron Jobs" (o "Scheduled" en el menú)
-- 3. Crea un nuevo cron job:
--    - Schedule: */15 * * * * (cada 15 minutos)
--    - HTTP Request: POST https://TU_PROJECT_REF.supabase.co/functions/v1/create-recurring-tasks
--    - Headers: Authorization: Bearer TU_ANON_KEY

-- ============================================
-- ALTERNATIVA: Webhook externo
-- ============================================
-- Si no puedes usar pg_cron, puedes usar servicios externos:
-- - cron-job.org (gratis)
-- - GitHub Actions con schedule
-- - Vercel Cron
-- - Cloudflare Workers con Cron Triggers
--
-- Configura para que hagan POST a:
-- https://TU_PROJECT_REF.supabase.co/functions/v1/create-recurring-tasks
-- Con header: Authorization: Bearer TU_ANON_KEY
