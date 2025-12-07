import { useState, useEffect } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { supabase } from './supabaseClient'
import { Task, TaskStatus, Profile, UserRole } from './types/database.types'
import EditTask from './EditTask'

const locales = { es }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

interface TaskWithRelations extends Task {
  task_statuses: TaskStatus
  assigned_user: Profile | null
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  task: TaskWithRelations
}

interface CalendarViewProps {
  currentUserId: string
  teamId?: string | null
  userRole?: UserRole | null
  searchTerm?: string
}

function CalendarView({ currentUserId, teamId, searchTerm = '' }: CalendarViewProps) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)
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

    if (teamId === null || teamId === undefined) {
      query = query.is('team_id', null).eq('created_by', currentUserId)
    } else {
      query = query.eq('team_id', teamId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error cargando tareas:', error)
    } else {
      setTasks(data as TaskWithRelations[] || [])
    }
    
    setLoading(false)
  }

  useEffect(() => {
    loadTasks()
  }, [currentUserId, teamId])

  const getFilteredTasks = () => {
    if (!searchTerm.trim()) return tasks
    
    const term = searchTerm.toLowerCase()
    return tasks.filter(task => 
      task.title.toLowerCase().includes(term) ||
      task.description?.toLowerCase().includes(term)
    )
  }

  const events: CalendarEvent[] = getFilteredTasks()
    .filter(task => task.due_date || task.start_date)
    .map(task => ({
      id: task.id,
      title: task.title,
      start: new Date(task.start_date || task.due_date!),
      end: new Date(task.due_date || task.start_date!),
      task
    }))

  const eventStyleGetter = (event: CalendarEvent) => {
    const color = event.task.task_statuses?.color || '#4CAF50'
    return {
      style: {
        backgroundColor: color,
        borderRadius: '4px',
        border: 'none',
        color: 'white',
        fontSize: '12px'
      }
    }
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setEditingTask(event.task)
  }

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando calendario...</div>
  }

  return (
    <div>
      <div style={{ height: '600px', backgroundColor: 'white', padding: '16px', borderRadius: '8px' }}>
       <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
          view={currentView}
          date={currentDate}
          views={['month', 'week', 'day', 'agenda']}
          onNavigate={(date) => setCurrentDate(date)}
          onView={(view) => {
            if (view === 'month' || view === 'week' || view === 'day' || view === 'agenda') {
              setCurrentView(view)
            }
          }}
          messages={{
            next: 'Siguiente',
            previous: 'Anterior',
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            agenda: 'Agenda',
            date: 'Fecha',
            time: 'Hora',
            event: 'Evento',
            noEventsInRange: 'No hay tareas en este rango'
          }}
        />
      </div>

      {editingTask && (
        <EditTask
          task={editingTask}
          onTaskUpdated={() => loadTasks()}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  )
}

export default CalendarView