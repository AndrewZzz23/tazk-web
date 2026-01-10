import { useState, useEffect, useMemo } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, isToday, isTomorrow, addDays, addWeeks, addMonths, startOfDay, endOfDay, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { supabase } from './supabaseClient'
import { Task, UserRole } from './types/database.types'
import { LoadingZapIcon } from './components/iu/AnimatedIcons'
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange, Calendar as CalendarIcon, List, Clock, User } from 'lucide-react'

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
  previous: 'Anterior',
  next: 'Siguiente',
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
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
  onOpenTask?: (task: Task) => void
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  task: Task
  color: string
}

function CalendarView({ currentUserId, teamId, searchTerm, showToast, onOpenTask }: CalendarViewProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'agenda'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [agendaFilter, setAgendaFilter] = useState<'day' | 'week' | 'month' | 'all'>('all')

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
        borderRadius: '8px',
        opacity: 0.95,
        color: '#000',
        border: 'none',
        display: 'block',
        fontWeight: '500',
        fontSize: '12px',
        padding: '4px 8px',
        boxShadow: `0 2px 4px ${event.color}40`,
      },
    }
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    onOpenTask?.(event.task)
  }

  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    const newDate = new Date(currentDate)
    if (action === 'TODAY') {
      setCurrentDate(new Date())
    } else if (action === 'PREV') {
      if (currentView === 'month') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else if (currentView === 'week') {
        newDate.setDate(newDate.getDate() - 7)
      } else if (currentView === 'day') {
        newDate.setDate(newDate.getDate() - 1)
      }
      setCurrentDate(newDate)
    } else if (action === 'NEXT') {
      if (currentView === 'month') {
        newDate.setMonth(newDate.getMonth() + 1)
      } else if (currentView === 'week') {
        newDate.setDate(newDate.getDate() + 7)
      } else if (currentView === 'day') {
        newDate.setDate(newDate.getDate() + 1)
      }
      setCurrentDate(newDate)
    }
  }

  const formatCurrentPeriod = () => {
    if (currentView === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: es })
    } else if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return `${format(weekStart, 'd', { locale: es })} - ${format(weekEnd, 'd MMM yyyy', { locale: es })}`
    } else if (currentView === 'day') {
      return format(currentDate, "EEEE, d 'de' MMMM", { locale: es })
    }
    return format(currentDate, 'MMMM yyyy', { locale: es })
  }

  const viewOptions = [
    { id: 'month', label: 'Mes', icon: CalendarDays },
    { id: 'week', label: 'Semana', icon: CalendarRange },
    { id: 'day', label: 'Día', icon: CalendarIcon },
    { id: 'agenda', label: 'Agenda', icon: List },
  ]

  // Calcular rango de fechas según el filtro de agenda
  const getAgendaDateRange = () => {
    const today = startOfDay(new Date())
    switch (agendaFilter) {
      case 'day':
        return { start: today, end: endOfDay(today) }
      case 'week':
        return { start: today, end: endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }) }
      case 'month':
        return { start: today, end: addMonths(today, 1) }
      case 'all':
      default:
        return { start: null, end: null } // Sin filtro de fecha
    }
  }

  // Agrupar eventos por fecha para la vista de agenda personalizada
  const groupedEvents = useMemo(() => {
    const { start, end } = getAgendaDateRange()

    // Filtrar eventos según el rango
    let filtered = events
    if (start && end) {
      filtered = events.filter(e => e.start >= start && e.start <= end)
    }

    const sorted = filtered.sort((a, b) => a.start.getTime() - b.start.getTime())

    const groups: { [key: string]: CalendarEvent[] } = {}
    sorted.forEach(event => {
      const dateKey = format(event.start, 'yyyy-MM-dd')
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(event)
    })

    return Object.entries(groups).map(([dateKey, evts]) => ({
      date: new Date(dateKey),
      events: evts
    }))
  }, [events, agendaFilter])

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoy'
    if (isTomorrow(date)) return 'Mañana'
    return format(date, "EEEE d", { locale: es })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <LoadingZapIcon size={48} />
        <p className="text-gray-400 dark:text-neutral-500 text-sm animate-pulse">
          Cargando calendario...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Custom Toolbar */}
      <div className="bg-white dark:bg-neutral-800/50 rounded-2xl p-4 border border-gray-100 dark:border-neutral-700/50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Navigation - Hidden in agenda view */}
          {currentView !== 'agenda' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleNavigate('TODAY')}
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-neutral-900 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-yellow-400/20 transition-all duration-200"
              >
                Hoy
              </button>
              <div className="flex items-center bg-gray-100 dark:bg-neutral-700/50 rounded-xl p-1">
                <button
                  onClick={() => handleNavigate('PREV')}
                  className="p-2 text-gray-600 dark:text-neutral-300 hover:text-yellow-500 hover:bg-white dark:hover:bg-neutral-600 rounded-lg transition-all duration-200"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleNavigate('NEXT')}
                  className="p-2 text-gray-600 dark:text-neutral-300 hover:text-yellow-500 hover:bg-white dark:hover:bg-neutral-600 rounded-lg transition-all duration-200"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize ml-2">
                {formatCurrentPeriod()}
              </h2>
            </div>
          ) : (
            <div /> /* Empty spacer for flex justify-between */
          )}

          {/* View Selector */}
          <div className="flex items-center bg-gray-100 dark:bg-neutral-700/50 rounded-xl p-1">
            {viewOptions.map((view) => {
              const Icon = view.icon
              return (
                <button
                  key={view.id}
                  onClick={() => setCurrentView(view.id as typeof currentView)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentView === view.id
                      ? 'bg-white dark:bg-neutral-600 text-yellow-500 shadow-sm'
                      : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{view.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Calendar Styles */}
      <style>{`
        .rbc-calendar {
          background: transparent;
        }

        .rbc-toolbar {
          display: none;
        }

        .rbc-header {
          background: transparent;
          color: #a3a3a3;
          padding: 16px 8px;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(64, 64, 64, 0.5) !important;
        }

        .rbc-month-view,
        .rbc-time-view,
        .rbc-agenda-view {
          background: transparent;
          border: none;
          border-radius: 16px;
          overflow: hidden;
        }

        .rbc-month-view {
          border: 1px solid rgba(64, 64, 64, 0.3);
          border-radius: 16px;
        }

        .rbc-month-row {
          border-top: 1px solid rgba(64, 64, 64, 0.3);
        }

        .rbc-day-bg {
          background: transparent;
          transition: background-color 0.2s;
        }

        .rbc-day-bg:hover {
          background: rgba(250, 204, 21, 0.05);
        }

        .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid rgba(64, 64, 64, 0.3);
        }

        .rbc-off-range-bg {
          background: rgba(0, 0, 0, 0.15);
        }

        .rbc-today {
          background: rgba(250, 204, 21, 0.1) !important;
        }

        .rbc-date-cell {
          color: #a3a3a3;
          padding: 8px 12px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .rbc-date-cell.rbc-now {
          color: #facc15;
          font-weight: 700;
        }

        .rbc-date-cell.rbc-off-range {
          color: #525252;
        }

        .rbc-event {
          cursor: pointer;
          transition: all 0.2s;
        }

        .rbc-event:hover {
          opacity: 1 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .rbc-event-content {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rbc-show-more {
          color: #facc15;
          font-weight: 600;
          font-size: 0.75rem;
          background: transparent;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background-color 0.2s;
        }

        .rbc-show-more:hover {
          background: rgba(250, 204, 21, 0.1);
        }

        .rbc-row-segment {
          padding: 2px 4px;
        }

        /* Time view */
        .rbc-time-view {
          border: 1px solid rgba(64, 64, 64, 0.3);
          border-radius: 16px;
        }

        .rbc-time-header {
          background: transparent;
        }

        .rbc-time-header-content {
          border-left: 1px solid rgba(64, 64, 64, 0.3);
        }

        .rbc-time-content {
          border-top: 1px solid rgba(64, 64, 64, 0.3);
        }

        .rbc-time-slot {
          border-top: 1px solid rgba(64, 64, 64, 0.15);
        }

        .rbc-timeslot-group {
          border-bottom: 1px solid rgba(64, 64, 64, 0.3);
        }

        .rbc-time-gutter {
          color: #737373;
          background: rgba(38, 38, 38, 0.5);
          font-size: 0.75rem;
        }

        .rbc-time-column {
          background: transparent;
        }

        .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid rgba(64, 64, 64, 0.15);
        }

        .rbc-current-time-indicator {
          background: linear-gradient(90deg, #facc15, #f97316);
          height: 2px;
          box-shadow: 0 0 8px rgba(250, 204, 21, 0.5);
        }

        .rbc-allday-cell {
          background: transparent;
        }

        /* Agenda view - Complete redesign */
        .rbc-agenda-view {
          border: none !important;
          border-radius: 16px;
          overflow: hidden;
        }

        .rbc-agenda-view table {
          color: #e5e5e5;
          border-collapse: separate;
          border-spacing: 0;
          width: 100%;
        }

        .rbc-agenda-table {
          border: none;
          table-layout: fixed;
        }

        .rbc-agenda-table thead {
          display: none;
        }

        .rbc-agenda-content {
          border: none !important;
        }

        .rbc-agenda-date-cell {
          color: #fff;
          padding: 16px 20px;
          font-size: 0.875rem;
          font-weight: 600;
          white-space: nowrap;
          background: linear-gradient(135deg, rgba(250, 204, 21, 0.15), rgba(249, 115, 22, 0.1));
          border-left: 3px solid #facc15;
          width: 140px;
          vertical-align: top;
        }

        .rbc-agenda-time-cell {
          color: #a3a3a3;
          padding: 16px;
          font-size: 0.8rem;
          font-weight: 500;
          white-space: nowrap;
          width: 100px;
          vertical-align: top;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
        }

        .rbc-agenda-event-cell {
          padding: 12px 16px;
          font-weight: 500;
          vertical-align: middle;
        }

        .rbc-agenda-table tbody > tr {
          transition: all 0.2s ease;
          border-bottom: 1px solid rgba(64, 64, 64, 0.2);
        }

        .rbc-agenda-table tbody > tr > td {
          border: none !important;
        }

        .rbc-agenda-table tbody > tr > td + td {
          border-left: none !important;
        }

        .rbc-agenda-table tbody > tr + tr {
          border-top: none;
        }

        .rbc-agenda-table tbody > tr:hover {
          background: rgba(250, 204, 21, 0.08);
        }

        .rbc-agenda-table tbody > tr:hover .rbc-agenda-date-cell {
          background: linear-gradient(135deg, rgba(250, 204, 21, 0.25), rgba(249, 115, 22, 0.15));
        }

        .rbc-agenda-table tbody > tr:last-child {
          border-bottom: none;
        }

        /* Event styling in agenda */
        .rbc-agenda-event-cell .rbc-event {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          color: #fff !important;
          font-weight: 500;
        }

        .rbc-agenda-event-cell .rbc-event-content {
          color: #fff;
          font-size: 0.9rem;
        }

        .rbc-agenda-empty {
          color: #737373;
          padding: 60px 40px;
          text-align: center;
          font-size: 0.9rem;
        }

        /* Week header */
        .rbc-header + .rbc-header {
          border-left: 1px solid rgba(64, 64, 64, 0.3);
        }

        .rbc-header.rbc-today {
          background: rgba(250, 204, 21, 0.1);
        }

        /* Popup */
        .rbc-overlay {
          background: #262626;
          border: 1px solid #404040;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          padding: 8px;
          z-index: 100;
        }

        .rbc-overlay-header {
          color: #fff;
          font-weight: 600;
          padding: 8px 12px;
          border-bottom: 1px solid #404040;
          margin-bottom: 8px;
        }
      `}</style>

      {/* Calendar or Custom Agenda */}
      {currentView === 'agenda' ? (
        /* Custom Agenda View */
        <div className="bg-white dark:bg-neutral-800/50 rounded-2xl border border-gray-100 dark:border-neutral-700/50 overflow-hidden">
          {/* Agenda Filter Tabs */}
          <div className="px-5 py-3 border-b border-gray-100 dark:border-neutral-700/50 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-700/50 rounded-lg p-1">
              {[
                { id: 'day', label: 'Hoy' },
                { id: 'week', label: 'Esta semana' },
                { id: 'month', label: 'Este mes' },
                { id: 'all', label: 'Todas' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setAgendaFilter(filter.id as typeof agendaFilter)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    agendaFilter === filter.id
                      ? 'bg-white dark:bg-neutral-600 text-yellow-500 shadow-sm'
                      : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <span className="text-sm text-gray-500 dark:text-neutral-400">
              {groupedEvents.reduce((acc, g) => acc + g.events.length, 0)} tareas
            </span>
          </div>

          {groupedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-neutral-700 rounded-full flex items-center justify-center mb-4">
                <List className="w-8 h-8 text-gray-400 dark:text-neutral-500" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-1">
                Sin tareas programadas
              </h3>
              <p className="text-gray-500 dark:text-neutral-400 text-sm text-center">
                {agendaFilter === 'day' && 'No hay tareas programadas para hoy'}
                {agendaFilter === 'week' && 'No hay tareas programadas para esta semana'}
                {agendaFilter === 'month' && 'No hay tareas programadas para este mes'}
                {agendaFilter === 'all' && 'No hay tareas con fechas asignadas'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-neutral-700/50">
              {groupedEvents.map(({ date, events: dayEvents }) => (
                <div key={date.toISOString()} className="group">
                  {/* Date Header */}
                  <div className={`px-5 py-3 flex items-center gap-3 ${
                    isToday(date)
                      ? 'bg-gradient-to-r from-yellow-400/10 to-orange-500/5'
                      : 'bg-gray-50 dark:bg-neutral-800/50'
                  }`}>
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${
                      isToday(date)
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-neutral-900'
                        : 'bg-white dark:bg-neutral-700 text-gray-700 dark:text-neutral-300'
                    }`}>
                      <span className="text-[10px] font-semibold uppercase leading-none">
                        {format(date, 'EEE', { locale: es })}
                      </span>
                      <span className="text-lg font-bold leading-none mt-0.5">
                        {format(date, 'd')}
                      </span>
                    </div>
                    <div>
                      <p className={`font-semibold ${
                        isToday(date) ? 'text-yellow-500' : 'text-gray-900 dark:text-white'
                      }`}>
                        {getDateLabel(date)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-neutral-400 capitalize">
                        {format(date, "MMMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <span className="ml-auto bg-gray-200 dark:bg-neutral-600 text-gray-600 dark:text-neutral-300 text-xs font-medium px-2 py-1 rounded-full">
                      {dayEvents.length} {dayEvents.length === 1 ? 'tarea' : 'tareas'}
                    </span>
                  </div>

                  {/* Events for this date */}
                  <div className="divide-y divide-gray-50 dark:divide-neutral-700/30">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => onOpenTask?.(event.task)}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-neutral-700/30 cursor-pointer transition-all duration-200"
                      >
                        {/* Color indicator */}
                        <div
                          className="w-1.5 h-12 rounded-full flex-shrink-0"
                          style={{ backgroundColor: event.color }}
                        />

                        {/* Time */}
                        <div className="flex items-center gap-2 w-24 flex-shrink-0">
                          <Clock className="w-4 h-4 text-gray-400 dark:text-neutral-500" />
                          <span className="text-sm font-medium text-gray-600 dark:text-neutral-400">
                            {format(event.start, 'HH:mm')}
                          </span>
                        </div>

                        {/* Event info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-gray-900 dark:text-white font-medium truncate">
                            {event.title}
                          </h4>
                        </div>

                        {/* Assigned user */}
                        {event.task.assigned_user && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-7 h-7 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-neutral-900 text-xs font-bold">
                              {event.task.assigned_user.full_name?.[0]?.toUpperCase() ||
                               event.task.assigned_user.email?.[0]?.toUpperCase() ||
                               <User className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        )}

                        {/* Status badge */}
                        <div
                          className="px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0"
                          style={{
                            backgroundColor: `${event.color}20`,
                            color: event.color
                          }}
                        >
                          {event.task.task_statuses?.name || 'Sin estado'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Standard Calendar View */
        <div className="bg-white dark:bg-neutral-800/50 rounded-2xl p-4 border border-gray-100 dark:border-neutral-700/50">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 650 }}
            messages={messages}
            culture="es"
            view={currentView}
            date={currentDate}
            onNavigate={(date) => setCurrentDate(date)}
            onView={(view) => setCurrentView(view as typeof currentView)}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day']}
            popup
            selectable
          />
        </div>
      )}

      {/* Empty State */}
      {events.length === 0 && !loading && currentView !== 'agenda' && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-20 h-20 bg-gray-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <CalendarDays className="w-10 h-10 text-gray-400 dark:text-neutral-500" />
          </div>
          <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-1">
            Sin tareas programadas
          </h3>
          <p className="text-gray-500 dark:text-neutral-400 text-sm text-center max-w-xs">
            Agrega fechas de inicio o vencimiento a tus tareas para visualizarlas en el calendario
          </p>
        </div>
      )}

    </div>
  )
}

export default CalendarView
