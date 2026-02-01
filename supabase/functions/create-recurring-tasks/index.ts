// Edge Function: create-recurring-tasks
// Esta función debe ejecutarse periódicamente (cada 15 minutos recomendado)
// Crea tareas basadas en las configuraciones de recurring_tasks

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RecurringTask {
  id: string
  user_id: string
  team_id: string | null
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  frequency: 'daily' | 'weekly' | 'monthly'
  time_of_day: string
  days_of_week: number[] | null
  day_of_month: number | null
  default_status_id: string | null
  assigned_to: string | null
  is_active: boolean
  last_created_at: string | null
  next_scheduled_at: string | null
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date()

    // Obtener rutinas activas cuya próxima ejecución ya pasó o es ahora
    const { data: recurringTasks, error: fetchError } = await supabase
      .from('recurring_tasks')
      .select('*')
      .eq('is_active', true)
      .lte('next_scheduled_at', now.toISOString())

    if (fetchError) {
      throw fetchError
    }

    if (!recurringTasks || recurringTasks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No hay rutinas pendientes de ejecutar', tasks_created: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let tasksCreated = 0
    const errors: string[] = []

    for (const recurring of recurringTasks as RecurringTask[]) {
      try {
        // Crear la tarea
        const { error: insertError } = await supabase
          .from('tasks')
          .insert({
            title: recurring.title,
            description: recurring.description,
            status_id: recurring.default_status_id,
            team_id: recurring.team_id,
            created_by: recurring.user_id,
            assigned_to: recurring.assigned_to,
            start_date: now.toISOString(),
            due_date: null, // Las rutinas no tienen fecha límite por defecto
            notify_email: null
          })

        if (insertError) {
          errors.push(`Error creando tarea para rutina ${recurring.id}: ${insertError.message}`)
          continue
        }

        tasksCreated++

        // Calcular la próxima ejecución
        const nextScheduled = calculateNextScheduled(recurring, now)

        // Actualizar la rutina con last_created_at y next_scheduled_at
        await supabase
          .from('recurring_tasks')
          .update({
            last_created_at: now.toISOString(),
            next_scheduled_at: nextScheduled.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('id', recurring.id)

      } catch (err) {
        errors.push(`Error procesando rutina ${recurring.id}: ${err.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        message: `Proceso completado`,
        tasks_created: tasksCreated,
        routines_processed: recurringTasks.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error en create-recurring-tasks:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function calculateNextScheduled(recurring: RecurringTask, fromDate: Date): Date {
  const [hours, minutes] = recurring.time_of_day.split(':').map(Number)

  let nextDate = new Date(fromDate)
  nextDate.setSeconds(0, 0)

  switch (recurring.frequency) {
    case 'daily':
      // Próximo día a la misma hora
      nextDate.setDate(nextDate.getDate() + 1)
      nextDate.setHours(hours, minutes, 0, 0)
      break

    case 'weekly':
      // Encontrar el próximo día de la semana configurado
      if (recurring.days_of_week && recurring.days_of_week.length > 0) {
        // Avanzar al día siguiente primero
        nextDate.setDate(nextDate.getDate() + 1)
        nextDate.setHours(hours, minutes, 0, 0)

        // Buscar el próximo día válido
        let found = false
        for (let i = 0; i < 7 && !found; i++) {
          if (recurring.days_of_week.includes(nextDate.getDay())) {
            found = true
          } else {
            nextDate.setDate(nextDate.getDate() + 1)
          }
        }
      } else {
        // Si no hay días configurados, usar el mismo día de la semana siguiente
        nextDate.setDate(nextDate.getDate() + 7)
        nextDate.setHours(hours, minutes, 0, 0)
      }
      break

    case 'monthly':
      // Próximo mes, mismo día
      const targetDay = recurring.day_of_month || 1
      nextDate.setMonth(nextDate.getMonth() + 1)
      nextDate.setDate(Math.min(targetDay, getDaysInMonth(nextDate.getFullYear(), nextDate.getMonth())))
      nextDate.setHours(hours, minutes, 0, 0)
      break
  }

  return nextDate
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}
