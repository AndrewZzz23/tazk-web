import { useState, useEffect } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { supabase } from './supabaseClient'
import { Task, UserRole } from './types/database.types'
import EditTask from './EditTask'

const locales = { es }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

const messages = {
  allDay: 'Todo el día',
  previous: '← Anterior',
  next: 'Siguiente →',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Tarea',
  noEventsInRange: 'No hay tareas en este rango',
  showMore: (total: number) => `+ ${total} más`,
}

interface CalendarViewProps {
  currentUserId: string
  teamId: string | null
  userRole: UserRole | null
  searchTerm: string
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  task: Task
  color: string
}

function CalendarView({ currentUserId, teamId, userRole, searchTerm }: CalendarViewProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'agenda'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())

  const loadTasks = async () => {
    setLoading(true)

    let query = supabase
      .from('tasks')
      .select(`
        *,
        task_statuses (*),
        assigned_user:profiles!tasks_assigned_to_fkey (*)
      `)
      .order('created_at', { ascending: false })

    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      query = query.is('team_id', null).eq('created_by', currentUserId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error cargando tareas:', error)
    } else {
      setTasks(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadTasks()
  }, [teamId, currentUserId])

  // Filtrar y convertir a eventos
  const events: CalendarEvent[] = tasks
    .filter((task) => {
      // Filtrar por búsqueda
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        return (
          task.title.toLowerCase().includes(term) ||
          task.description?.toLowerCase().includes(term) ||
          task.assigned_user?.full_name?.toLowerCase().includes(term) ||
          task.assigned_user?.email?.toLowerCase().includes(term)
        )
      }
      return true
    })
    .filter((task) => task.start_date || task.due_date)
    .map((task) => {
      const start = task.start_date ? new Date(task.start_date) : new Date(task.due_date!)
      const end = task.due_date ? new Date(task.due_date) : new Date(task.start_date!)

      return {
        id: task.id,
        title: task.title,
        start,
        end,
        task,
        color: task.task_statuses?.color || '#facc15',
      }
    })

  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: '6px',
        opacity: 0.9,
        color: '#000',
        border: 'none',
        display: 'block',
        fontWeight: '500',
        fontSize: '12px',
        padding: '2px 6px',
      },
    }
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setEditingTask(event.task)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-yellow-400 text-lg">⚡ Cargando calendario...</div>
      </div>
    )
  }

  return (
    <div>
      <style>{`
        /* Dark theme para react-big-calendar */
        .rbc-calendar {
          background: transparent;
        }
        
        .rbc-toolbar {
          margin-bottom: 20px;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .rbc-toolbar button {
          background: #404040;
          border: 1px solid #525252;
          color: #e5e5e5;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .rbc-toolbar button:hover {
          background: #525252;
          color: #fff;
        }
        
        .rbc-toolbar button.rbc-active {
          background: #facc15;
          color: #171717;
          border-color: #facc15;
        }
        
        .rbc-toolbar-label {
          color: #fff;
          font-weight: 600;
          font-size: 1.25rem;
        }
        
        .rbc-header {
          background: #262626;
          color: #a3a3a3;
          padding: 12px 8px;
          font-weight: 600;
          font-size: 0.875rem;
          border-bottom: 1px solid #404040 !important;
        }
        
        .rbc-month-view,
        .rbc-time-view,
        .rbc-agenda-view {
          background: #1f1f1f;
          border: 1px solid #404040;
          border-radius: 12px;
          overflow: hidden;
        }
        
        .rbc-month-row {
          border-top: 1px solid #333;
        }
        
        .rbc-day-bg {
          background: #1f1f1f;
        }
        
        .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid #333;
        }
        
        .rbc-off-range-bg {
          background: #171717;
        }
        
        .rbc-today {
          background: #facc1510 !important;
        }
        
        .rbc-date-cell {
          color: #a3a3a3;
          padding: 8px;
          font-size: 0.875rem;
        }
        
        .rbc-date-cell.rbc-now {
          color: #facc15;
          font-weight: 700;
        }
        
        .rbc-event {
          cursor: pointer;
        }
        
        .rbc-event:hover {
          opacity: 1 !important;
          transform: scale(1.02);
        }
        
        .rbc-show-more {
          color: #facc15;
          font-weight: 500;
          background: transparent;
        }
        
        /* Time view */
        .rbc-time-header {
          background: #262626;
        }
        
        .rbc-time-content {
          border-top: 1px solid #404040;
        }
        
        .rbc-time-slot {
          border-top: 1px solid #333;
        }
        
        .rbc-timeslot-group {
          border-bottom: 1px solid #333;
        }
        
        .rbc-time-gutter {
          color: #737373;
          background: #262626;
        }
        
        .rbc-current-time-indicator {
          background-color: #facc15;
          height: 2px;
        }
        
        /* Agenda view */
        .rbc-agenda-view table {
          color: #e5e5e5;
        }
        
        .rbc-agenda-date-cell,
        .rbc-agenda-time-cell {
          color: #a3a3a3;
          padding: 12px;
        }
        
        .rbc-agenda-event-cell {
          padding: 12px;
        }
        
        .rbc-agenda-table tbody > tr > td + td {
          border-left: 1px solid #404040;
        }
        
        .rbc-agenda-table tbody > tr + tr {
          border-top: 1px solid #333;
        }
      `}</style>

      <div className="bg-white dark:bg-neutral-800/50 rounded-xl p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          messages={messages}
          culture="es"
          view={currentView}
          date={currentDate}
          onNavigate={(date) => setCurrentDate(date)}
          onView={(view) => setCurrentView(view as typeof currentView)}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day', 'agenda']}
          popup
        />
      </div>

      {events.length === 0 && !loading && (
        <div className="text-center py-8 mt-4">
          <p className="text-gray-500 dark:text-neutral-400">
            📅 No hay tareas con fechas programadas
          </p>
          <p className="text-gray-400 dark:text-neutral-500 text-sm mt-1">
            Agrega fechas a tus tareas para verlas aquí
          </p>
        </div>
      )}

      {/* Modal de edición */}
      {editingTask && (
        <EditTask
          task={editingTask}
          onTaskUpdated={loadTasks}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  )
}

export default CalendarView