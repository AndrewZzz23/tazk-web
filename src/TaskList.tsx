import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { Task, TaskStatus, UserRole, TaskPriority, Profile } from './types/database.types'
import ConfirmDialog from './ConfirmDialog'
import TaskActivityLog from './TaskActivityLog'
import { LoadingZapIcon } from './components/iu/AnimatedIcons'
import { ChevronRight, Trash2, Calendar, AlertTriangle, Play, ClipboardList, Flag, History, Filter, X, User, Clock } from 'lucide-react'
import { sendTaskCompletedEmail } from './lib/emailNotifications'

// Tipos de filtros
interface TaskFilters {
  assignedTo: string | 'all' | 'unassigned'
  createdBy: string | 'all'
  priority: TaskPriority | 'all'
  status: string | 'all'
  dueDate: 'all' | 'overdue' | 'today' | 'week' | 'no-date'
}

// Configuración de colores de prioridad
const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string; flagColor: string }> = {
  high: { label: 'Alta', color: 'text-red-500', bgColor: 'bg-red-500', flagColor: '#ef4444' },
  medium: { label: 'Media', color: 'text-yellow-500', bgColor: 'bg-yellow-500', flagColor: '#eab308' },
  low: { label: 'Baja', color: 'text-green-500', bgColor: 'bg-green-500', flagColor: '#22c55e' },
}

interface TaskListProps {
  currentUserId: string
  teamId: string | null
  userRole: UserRole | null
  userEmail?: string
  onTaskUpdated: () => void
  searchTerm: string
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
  onOpenTask?: (task: Task) => void
}

function TaskList({ currentUserId, teamId, userRole, userEmail, onTaskUpdated, searchTerm, showToast, onOpenTask }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [teamMembers, setTeamMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<TaskFilters>({
    assignedTo: 'all',
    createdBy: 'all',
    priority: 'all',
    status: 'all',
    dueDate: 'all'
  })
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(() => {
    // Cargar estado inicial desde localStorage
    const storageKey = `tazk_collapsed_statuses_${teamId || 'personal'}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        return new Set(JSON.parse(saved))
      } catch {
        return new Set()
      }
    }
    return new Set()
  })
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const [taskForHistory, setTaskForHistory] = useState<Task | null>(null)

  const loadTasks = async () => {
    setLoading(true)

    let query = supabase
      .from('tasks')
      .select(`
        *,
        task_statuses (*),
        assigned_user:profiles!tasks_assigned_to_fkey (*),
        created_by_user:profiles!tasks_created_by_fkey (*)
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

  const loadStatuses = async () => {
    let query = supabase
      .from('task_statuses')
      .select('*')
      .eq('is_active', true)
      .order('order_position')

    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      query = query.is('team_id', null)
    }

    const { data } = await query
    if (data) setStatuses(data)
  }

  const loadTeamMembers = async () => {
    if (!teamId) {
      setTeamMembers([])
      return
    }

    const { data } = await supabase
      .from('team_members')
      .select('user_id, profiles(*)')
      .eq('team_id', teamId)

    if (data) {
      const profiles = data
        .map((m) => m.profiles as unknown as Profile | null)
        .filter((p): p is Profile => p !== null)
      setTeamMembers(profiles)
    }
  }

  useEffect(() => {
    loadTasks()
    loadStatuses()
    loadTeamMembers()
    // Reset filters when team changes
    setFilters({
      assignedTo: 'all',
      createdBy: 'all',
      priority: 'all',
      status: 'all',
      dueDate: 'all'
    })
  }, [teamId, currentUserId])

  // Persistir estado de listas contraídas en localStorage
  useEffect(() => {
    const storageKey = `tazk_collapsed_statuses_${teamId || 'personal'}`
    localStorage.setItem(storageKey, JSON.stringify([...collapsedStatuses]))
  }, [collapsedStatuses, teamId])

  // Recargar estado de listas contraídas cuando cambie el equipo
  useEffect(() => {
    const storageKey = `tazk_collapsed_statuses_${teamId || 'personal'}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        setCollapsedStatuses(new Set(JSON.parse(saved)))
      } catch {
        setCollapsedStatuses(new Set())
      }
    } else {
      setCollapsedStatuses(new Set())
    }
  }, [teamId])

  // Helpers para filtros de fecha
  const isToday = (dateStr: string | null) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isThisWeek = (dateStr: string | null) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const today = new Date()
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    return date >= today && date <= weekFromNow
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  // Contar filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.assignedTo !== 'all') count++
    if (filters.createdBy !== 'all') count++
    if (filters.priority !== 'all') count++
    if (filters.status !== 'all') count++
    if (filters.dueDate !== 'all') count++
    return count
  }, [filters])

  // Filtrar tareas por búsqueda y filtros
  const filteredTasks = useMemo(() => {
    let result = tasks

    // Filtro de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(task =>
        task.title.toLowerCase().includes(term) ||
        task.description?.toLowerCase().includes(term) ||
        task.assigned_user?.full_name?.toLowerCase().includes(term) ||
        task.assigned_user?.email?.toLowerCase().includes(term)
      )
    }

    // Filtro por asignado
    if (filters.assignedTo !== 'all') {
      if (filters.assignedTo === 'unassigned') {
        result = result.filter(task => !task.assigned_to)
      } else {
        result = result.filter(task => task.assigned_to === filters.assignedTo)
      }
    }

    // Filtro por creador (solo en equipos)
    if (filters.createdBy !== 'all' && teamId) {
      result = result.filter(task => task.created_by === filters.createdBy)
    }

    // Filtro por prioridad
    if (filters.priority !== 'all') {
      result = result.filter(task => task.priority === filters.priority)
    }

    // Filtro por estado
    if (filters.status !== 'all') {
      result = result.filter(task => task.status_id === filters.status)
    }

    // Filtro por fecha límite
    if (filters.dueDate !== 'all') {
      switch (filters.dueDate) {
        case 'overdue':
          result = result.filter(task => task.due_date && isOverdue(task.due_date))
          break
        case 'today':
          result = result.filter(task => isToday(task.due_date))
          break
        case 'week':
          result = result.filter(task => isThisWeek(task.due_date))
          break
        case 'no-date':
          result = result.filter(task => !task.due_date)
          break
      }
    }

    return result
  }, [tasks, searchTerm, filters, teamId])

  // Agrupar tareas por estado
  const tasksByStatus = useMemo(() => {
    const grouped: { [statusId: string]: Task[] } = {}
    
    statuses.forEach(status => {
      grouped[status.id] = filteredTasks.filter(t => t.status_id === status.id)
    })
    
    return grouped
  }, [filteredTasks, statuses])

  const handleStatusChange = async (taskId: string, newStatusId: string) => {
    const oldTask = tasks.find(t => t.id === taskId)
    const oldStatus = oldTask?.task_statuses
    const newStatus = statuses.find(s => s.id === newStatusId)

    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status_id: newStatusId, task_statuses: newStatus } : t
    ))

    const { error } = await supabase
      .from('tasks')
      .update({ status_id: newStatusId })
      .eq('id', taskId)

    if (error) {
      if (oldTask) {
        setTasks(prev => prev.map(t => t.id === taskId ? oldTask : t))
      }
      showToast?.('Error al actualizar estado', 'error')
      return
    }

    // Disparar email y notificación si la tarea se completó
    if (oldTask && newStatus?.category === 'completed' && oldStatus?.category !== 'completed') {
      const emailsToNotify: string[] = []

      // Notificar al creador si es diferente al usuario actual
      if (oldTask.created_by_user?.email && oldTask.created_by !== currentUserId) {
        emailsToNotify.push(oldTask.created_by_user.email)
      }

      // Notificar al asignado si es diferente al usuario actual y al creador
      if (oldTask.assigned_to && oldTask.assigned_to !== currentUserId) {
        const assignedEmail = oldTask.assigned_user?.email
        if (assignedEmail && !emailsToNotify.includes(assignedEmail)) {
          emailsToNotify.push(assignedEmail)
        }
      }

      if (emailsToNotify.length > 0) {
        sendTaskCompletedEmail(currentUserId, teamId, emailsToNotify, {
          taskId: oldTask.id,
          taskTitle: oldTask.title,
          taskDescription: oldTask.description || undefined,
          statusName: newStatus.name,
          createdByName: userEmail,
          completedDate: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        })
      }

      // Notificación en BD al creador
      if (oldTask.created_by && oldTask.created_by !== currentUserId) {
        supabase.from('notifications').insert({
          user_id: oldTask.created_by,
          type: 'task_completed',
          title: `${userEmail || 'Alguien'} completó una tarea`,
          body: oldTask.title,
          data: { task_id: oldTask.id, team_id: teamId }
        }).then(() => {})
      }
      // Notificación al asignado si es diferente
      if (oldTask.assigned_to && oldTask.assigned_to !== currentUserId && oldTask.assigned_to !== oldTask.created_by) {
        supabase.from('notifications').insert({
          user_id: oldTask.assigned_to,
          type: 'task_completed',
          title: `${userEmail || 'Alguien'} completó una tarea`,
          body: oldTask.title,
          data: { task_id: oldTask.id, team_id: teamId }
        }).then(() => {})
      }
    }
  }

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task)
  }

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return

    const taskId = taskToDelete.id
    setTaskToDelete(null)

    const oldTask = tasks.find(t => t.id === taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      if (oldTask) {
        setTasks(prev => [...prev, oldTask])
      }
      showToast?.('Error al eliminar tarea', 'error')
    } else {
      showToast?.('Tarea eliminada', 'success')
      onTaskUpdated()
    }
  }

  const toggleCollapse = (statusId: string) => {
    setCollapsedStatuses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(statusId)) {
        newSet.delete(statusId)
      } else {
        newSet.add(statusId)
      }
      return newSet
    })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const clearFilters = () => {
    setFilters({
      assignedTo: 'all',
      createdBy: 'all',
      priority: 'all',
      status: 'all',
      dueDate: 'all'
    })
  }

  // Renderizar barra de filtros
  const renderFilterBar = () => (
    <div className="mb-4">
      {/* Botón de filtros y chips activos */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            showFilters || activeFiltersCount > 0
              ? 'bg-yellow-400 text-neutral-900'
              : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <span className="bg-neutral-900 text-white text-xs px-1.5 py-0.5 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Chips de filtros activos */}
        {filters.assignedTo !== 'all' && (
          <span className="flex items-center gap-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs px-2 py-1 rounded-lg">
            <User className="w-3 h-3" />
            {filters.assignedTo === 'unassigned'
              ? 'Sin asignar'
              : teamMembers.find(m => m.id === filters.assignedTo)?.full_name || 'Usuario'}
            <button onClick={() => setFilters(f => ({ ...f, assignedTo: 'all' }))} className="ml-1 hover:text-blue-800">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {filters.priority !== 'all' && (
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
            filters.priority === 'high' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
            filters.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
            'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
          }`}>
            <Flag className="w-3 h-3" />
            {PRIORITY_CONFIG[filters.priority].label}
            <button onClick={() => setFilters(f => ({ ...f, priority: 'all' }))} className="ml-1">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {filters.dueDate !== 'all' && (
          <span className="flex items-center gap-1 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs px-2 py-1 rounded-lg">
            <Clock className="w-3 h-3" />
            {filters.dueDate === 'overdue' ? 'Vencidas' :
             filters.dueDate === 'today' ? 'Hoy' :
             filters.dueDate === 'week' ? 'Esta semana' : 'Sin fecha'}
            <button onClick={() => setFilters(f => ({ ...f, dueDate: 'all' }))} className="ml-1">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {activeFiltersCount > 1 && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 dark:text-neutral-400 hover:text-red-500 transition-colors"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {/* Panel de filtros expandido */}
      {showFilters && (
        <div className="mt-3 p-4 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Filtro por asignado (solo en equipos) */}
            {teamId && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                  Asignado a
                </label>
                <select
                  value={filters.assignedTo}
                  onChange={(e) => setFilters(f => ({ ...f, assignedTo: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 text-gray-700 dark:text-neutral-200 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                >
                  <option value="all">Todos</option>
                  <option value="unassigned">Sin asignar</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro por creador (solo en equipos) */}
            {teamId && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                  Creado por
                </label>
                <select
                  value={filters.createdBy}
                  onChange={(e) => setFilters(f => ({ ...f, createdBy: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 text-gray-700 dark:text-neutral-200 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                >
                  <option value="all">Todos</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro por prioridad */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                Prioridad
              </label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value as TaskPriority | 'all' }))}
                className="w-full bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 text-gray-700 dark:text-neutral-200 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              >
                <option value="all">Todas</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>

            {/* Filtro por estado */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 text-gray-700 dark:text-neutral-200 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              >
                <option value="all">Todos</option>
                {statuses.map(status => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por fecha */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                Fecha límite
              </label>
              <select
                value={filters.dueDate}
                onChange={(e) => setFilters(f => ({ ...f, dueDate: e.target.value as TaskFilters['dueDate'] }))}
                className="w-full bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 text-gray-700 dark:text-neutral-200 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              >
                <option value="all">Todas</option>
                <option value="overdue">Vencidas</option>
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="no-date">Sin fecha</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <LoadingZapIcon size={48} />
        <p className="text-gray-400 dark:text-neutral-500 text-sm animate-pulse">
          Cargando tareas...
        </p>
      </div>
    )
  }

  if (filteredTasks.length === 0) {
    const hasActiveFilters = activeFiltersCount > 0 || searchTerm.trim()
    return (
      <div>
        {tasks.length > 0 && renderFilterBar()}
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 bg-gray-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            {hasActiveFilters ? (
              <Filter className="w-10 h-10 text-gray-400 dark:text-neutral-500" />
            ) : (
              <ClipboardList className="w-10 h-10 text-gray-400 dark:text-neutral-500" />
            )}
          </div>
          <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-1">
            {hasActiveFilters ? 'Sin resultados' : 'Sin tareas'}
          </h3>
          <p className="text-gray-500 dark:text-neutral-400 text-sm text-center max-w-xs">
            {hasActiveFilters
              ? 'No encontramos tareas con los filtros aplicados'
              : teamId && userRole === 'member'
                ? 'Aún no hay tareas asignadas para ti'
                : 'Comienza creando tu primera tarea con el botón +'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => { clearFilters(); }}
              className="mt-4 px-4 py-2 bg-yellow-400 text-neutral-900 rounded-xl text-sm font-medium hover:bg-yellow-300 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>
    )
  }

  // Ordenar estados por order_position
  const sortedStatuses = [...statuses].sort((a, b) => a.order_position - b.order_position)

  return (
    <div>
      {renderFilterBar()}
      <div className="space-y-6">
      {sortedStatuses.map(status => {
        const statusTasks = tasksByStatus[status.id] || []
        const isCollapsed = collapsedStatuses.has(status.id)

        if (statusTasks.length === 0) return null

        return (
          <div key={status.id} className="bg-white dark:bg-neutral-800/50 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-neutral-700/50">
            {/* Header del estado */}
            <button
              onClick={() => toggleCollapse(status.id)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-neutral-700/30 transition-all duration-200"
            >
              <ChevronRight
                className={`w-4 h-4 text-gray-400 dark:text-neutral-500 transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`}
              />
              <div
                className="w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-neutral-800"
                style={{ backgroundColor: status.color, boxShadow: `0 0 8px ${status.color}40` }}
              />
              <span className="text-gray-900 dark:text-white font-semibold">{status.name}</span>
              <span className="ml-auto bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 text-xs font-medium px-2.5 py-1 rounded-full">
                {statusTasks.length}
              </span>
            </button>

            {/* Lista de tareas */}
            <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}>
              <div className="px-3 pb-3 space-y-2">
                {statusTasks.map(task => (
                  <div
                    key={task.id}
                    className="bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl p-4 hover:shadow-md hover:border-gray-200 dark:hover:border-neutral-600 transition-all duration-200 group cursor-pointer"
                    onClick={() => onOpenTask?.(task)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Indicador de color del estado */}
                      <div
                        className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0 self-stretch"
                        style={{ backgroundColor: status.color }}
                      />

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-gray-900 dark:text-white font-medium group-hover:text-yellow-500 transition-colors duration-200 truncate">
                              {task.title}
                            </h3>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Historial */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setTaskForHistory(task) }}
                              className="p-2 text-gray-400 dark:text-neutral-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 rounded-lg transition-all duration-200"
                              title="Ver historial"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            {/* Eliminar - solo para owner/admin o tareas personales */}
                            {(!teamId || userRole !== 'member') && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(task) }}
                                className="p-2 text-gray-400 dark:text-neutral-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Cambiar estado */}
                            <select
                              value={task.status_id}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
                              className="bg-white dark:bg-neutral-700/50 border border-gray-200 dark:border-neutral-600 text-gray-700 dark:text-neutral-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all duration-200 cursor-pointer hover:border-gray-300 dark:hover:border-neutral-500"
                            >
                              {sortedStatuses.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>

                            {/* Asignado a */}
                            {task.assigned_user && (
                              <span className="flex items-center gap-1.5 bg-white dark:bg-neutral-700/50 border border-gray-200 dark:border-neutral-600 text-gray-600 dark:text-neutral-300 text-xs px-2.5 py-1.5 rounded-lg">
                                <span className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-500 text-neutral-900 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                                  {task.assigned_user.full_name?.[0]?.toUpperCase() || task.assigned_user.email?.[0]?.toUpperCase() || '?'}
                                </span>
                                <span className="truncate max-w-[100px]">
                                  {task.assigned_user.full_name || task.assigned_user.email}
                                </span>
                              </span>
                            )}
                          </div>

                          {/* Prioridad y Fechas (derecha inferior) */}
                          <div className="flex items-center gap-2">
                            {/* Indicador de prioridad - Bandera */}
                            {task.priority && (
                              <span
                                className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg"
                                style={{
                                  backgroundColor: `${PRIORITY_CONFIG[task.priority].flagColor}15`,
                                  color: PRIORITY_CONFIG[task.priority].flagColor
                                }}
                                title={`Prioridad ${PRIORITY_CONFIG[task.priority].label}`}
                              >
                                <Flag
                                  className="w-3 h-3"
                                  fill={PRIORITY_CONFIG[task.priority].flagColor}
                                />
                              </span>
                            )}
                            {task.start_date && (
                              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border bg-white dark:bg-neutral-700/50 border-gray-200 dark:border-neutral-600 text-gray-600 dark:text-neutral-300">
                                <Play className="w-3.5 h-3.5" />
                                <span>{formatDate(task.start_date)}</span>
                              </span>
                            )}
                            {task.due_date && (
                              <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${
                                isOverdue(task.due_date)
                                  ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400'
                                  : 'bg-white dark:bg-neutral-700/50 border-gray-200 dark:border-neutral-600 text-gray-600 dark:text-neutral-300'
                              }`}>
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{formatDate(task.due_date)}</span>
                                {isOverdue(task.due_date) && <AlertTriangle className="w-3.5 h-3.5" />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
      </div>

      {/* Confirm Delete Dialog */}
      {taskToDelete && (
        <ConfirmDialog
          title="Eliminar tarea"
          message={`¿Estás seguro de eliminar "${taskToDelete.title}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          type="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setTaskToDelete(null)}
        />
      )}

      {/* Task Activity Log */}
      {taskForHistory && (
        <TaskActivityLog
          taskId={taskForHistory.id}
          taskTitle={taskForHistory.title}
          onClose={() => setTaskForHistory(null)}
        />
      )}
    </div>
  )
}

export default TaskList