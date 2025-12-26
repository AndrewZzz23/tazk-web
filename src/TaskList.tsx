import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { Task, TaskStatus, UserRole } from './types/database.types'
import EditTask from './EditTask'
import { LoadingZapIcon } from './components/iu/AnimatedIcons'

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
      <div className="flex items-center justify-center py-12">
        <LoadingZapIcon size={48} />
      </div>
    )
  }

  if (filteredTasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📭</div>
        <p className="text-gray-500 dark:text-neutral-400 text-lg">
          {searchTerm ? 'No se encontraron tareas' : 'No hay tareas aún'}
        </p>
        <p className="text-gray-400 dark:text-neutral-500 text-sm mt-2">
          {!searchTerm && 'Haz clic en el botón + para crear una'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {statuses.map(status => {
        const statusTasks = tasksByStatus[status.id] || []
        const isCollapsed = collapsedStatuses.has(status.id)

        if (statusTasks.length === 0) return null

        return (
          <div key={status.id} className="bg-white dark:bg-neutral-800/30 rounded-xl overflow-hidden">
            {/* Header del estado */}
            <button
              onClick={() => toggleCollapse(status.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-neutral-700/30 transition-colors"
            >
              <span className={`text-gray-500 dark:text-neutral-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>
                ▶
              </span>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              <span className="text-gray-900 dark:text-white font-medium">{status.name}</span>
              <span className="text-gray-400 dark:text-neutral-500 text-sm">({statusTasks.length})</span>
            </button>

            {/* Lista de tareas */}
            {!isCollapsed && (
              <div className="px-2 pb-2">
                {statusTasks.map(task => (
                  <div
                    key={task.id}
                    className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 mx-2 mb-2 hover:border-gray-300 dark:hover:border-neutral-500 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3
                              className="text-gray-900 dark:text-white font-medium cursor-pointer hover:text-yellow-400 transition-colors"
                              onClick={() => setEditingTask(task)}
                            >
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingTask(task)}
                              className="p-2 text-gray-500 dark:text-neutral-400 hover:text-yellow-400 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-all"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(task.id)}
                              className="p-2 text-gray-500 dark:text-neutral-400 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-all"
                              title="Eliminar"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                          {/* Cambiar estado */}
                          <select
                            value={task.status_id}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className="bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 text-gray-900 dark:text-white text-xs px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          >
                            {statuses.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>

                          {/* Asignado a */}
                          {task.assigned_user && (
                            <span className="flex items-center gap-1 text-gray-500 dark:text-neutral-400">
                              <span className="w-5 h-5 bg-yellow-400 text-neutral-900 rounded-full flex items-center justify-center text-xs font-bold">
                                {task.assigned_user.full_name?.[0] || task.assigned_user.email?.[0] || '?'}
                              </span>
                              <span className="truncate max-w-[120px]">
                                {task.assigned_user.full_name || task.assigned_user.email}
                              </span>
                            </span>
                          )}

                          {/* Fecha límite */}
                          {task.due_date && (
                            <span className={`flex items-center gap-1 ${
                              isOverdue(task.due_date) ? 'text-red-400' : 'text-gray-500 dark:text-neutral-400'
                            }`}>
                              <span>📅</span>
                              <span>{formatDate(task.due_date)}</span>
                              {isOverdue(task.due_date) && <span className="text-red-400">⚠️</span>}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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