import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { Task, TaskStatus, UserRole } from './types/database.types'
import EditTask from './EditTask'
import { LoadingZapIcon } from './components/iu/AnimatedIcons'
import { ChevronRight, Pencil, Trash2, Calendar, AlertTriangle, Play } from 'lucide-react'

interface TaskListProps {
  currentUserId: string
  teamId: string | null
  userRole: UserRole | null
  onTaskUpdated: () => void
  searchTerm: string
}

function TaskList({ currentUserId, teamId, userRole, onTaskUpdated, searchTerm }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(new Set())

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

  useEffect(() => {
    loadTasks()
    loadStatuses()
  }, [teamId, currentUserId])

  // Filtrar tareas por búsqueda
  const filteredTasks = useMemo(() => {
    if (!searchTerm.trim()) return tasks

    const term = searchTerm.toLowerCase()
    return tasks.filter(task =>
      task.title.toLowerCase().includes(term) ||
      task.description?.toLowerCase().includes(term) ||
      task.assigned_user?.full_name?.toLowerCase().includes(term) ||
      task.assigned_user?.email?.toLowerCase().includes(term)
    )
  }, [tasks, searchTerm])

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
      alert('Error al actualizar estado')
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return

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
      alert('Error al eliminar')
    } else {
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

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

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
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 bg-gray-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">📭</span>
        </div>
        <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-1">
          {searchTerm ? 'Sin resultados' : 'Sin tareas'}
        </h3>
        <p className="text-gray-500 dark:text-neutral-400 text-sm text-center max-w-xs">
          {searchTerm
            ? `No encontramos tareas que coincidan con "${searchTerm}"`
            : 'Comienza creando tu primera tarea con el botón +'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {statuses.map(status => {
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
                    onClick={() => setEditingTask(task)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Indicador de color del estado */}
                      <div
                        className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0 self-stretch"
                        style={{ backgroundColor: status.color }}
                      />

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="text-gray-900 dark:text-white font-medium group-hover:text-yellow-500 transition-colors duration-200 line-clamp-1">
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1.5 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingTask(task) }}
                              className="p-2 text-gray-400 dark:text-neutral-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 rounded-lg transition-all duration-200"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(task.id) }}
                              className="p-2 text-gray-400 dark:text-neutral-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all duration-200"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
                              {statuses.map(s => (
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

                          {/* Fechas (derecha inferior) */}
                          <div className="flex items-center gap-2">
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

      {/* Modal de edición */}
      {editingTask && (
        <EditTask
          task={editingTask}
          currentUserId={currentUserId}
          onTaskUpdated={() => {
            loadTasks()
            onTaskUpdated()
          }}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  )
}

export default TaskList