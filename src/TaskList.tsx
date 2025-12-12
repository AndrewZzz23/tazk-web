import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { Task, TaskStatus, UserRole } from './types/database.types'
import EditTask from './EditTask'

interface TaskListProps {
  currentUserId: string
  teamId: string | null
  userRole: UserRole | null
  onTaskUpdated: () => void
  searchTerm: string
}

function TaskList({ currentUserId, teamId, userRole: _userRole, onTaskUpdated, searchTerm }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [editingTask, setEditingTask] = useState<Task | null>(null)

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

  const filteredTasks = useMemo(() => {
    let result = tasks

    // Filtrar por estado
    if (filter !== 'all') {
      result = result.filter(task => task.status_id === filter)
    }

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(task =>
        task.title.toLowerCase().includes(term) ||
        task.description?.toLowerCase().includes(term) ||
        task.assigned_user?.full_name?.toLowerCase().includes(term) ||
        task.assigned_user?.email?.toLowerCase().includes(term)
      )
    }

    return result
  }, [tasks, filter, searchTerm])

  const handleStatusChange = async (taskId: string, newStatusId: string) => {
    const oldTask = tasks.find(t => t.id === taskId)
    const newStatus = statuses.find(s => s.id === newStatusId)

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status_id: newStatusId, task_statuses: newStatus } : t
    ))

    const { error } = await supabase
      .from('tasks')
      .update({ status_id: newStatusId })
      .eq('id', taskId)

    if (error) {
      // Revertir
      if (oldTask) {
        setTasks(prev => prev.map(t => t.id === taskId ? oldTask : t))
      }
      alert('Error al actualizar estado')
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return

    const oldTask = tasks.find(t => t.id === taskId)

    // Optimistic update
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
        <div className="text-yellow-400 text-lg">⚡ Cargando tareas...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Filtros por estado */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filter === 'all'
              ? 'bg-yellow-400 text-neutral-900'
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          Todas ({tasks.length})
        </button>
        {statuses.map(status => {
          const count = tasks.filter(t => t.status_id === status.id).length
          return (
            <button
              key={status.id}
              onClick={() => setFilter(status.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                filter === status.id
                  ? 'bg-yellow-400 text-neutral-900'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              {status.name} ({count})
            </button>
          )
        })}
      </div>

      {/* Lista de tareas */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-neutral-400 text-lg">
            {searchTerm ? 'No se encontraron tareas' : 'No hay tareas aún'}
          </p>
          <p className="text-neutral-500 text-sm mt-2">
            {!searchTerm && 'Haz clic en el botón + para crear una'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 hover:border-neutral-600 transition-all group"
            >
              <div className="flex items-start gap-4">
                {/* Indicador de estado */}
                <div
                  className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: task.task_statuses?.color || '#666' }}
                  title={task.task_statuses?.name}
                />

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3
                        className="text-white font-medium cursor-pointer hover:text-yellow-400 transition-colors"
                        onClick={() => setEditingTask(task)}
                      >
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-neutral-400 text-sm mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingTask(task)}
                        className="p-2 text-neutral-400 hover:text-yellow-400 hover:bg-neutral-700 rounded-lg transition-all"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded-lg transition-all"
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
                      className="bg-neutral-700 border border-neutral-600 text-white text-xs px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                      {statuses.map(status => (
                        <option key={status.id} value={status.id}>
                          {status.name}
                        </option>
                      ))}
                    </select>

                    {/* Asignado a */}
                    {task.assigned_user && (
                      <span className="flex items-center gap-1 text-neutral-400">
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
                        isOverdue(task.due_date) ? 'text-red-400' : 'text-neutral-400'
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

      {/* Modal de edición */}
      {editingTask && (
        <EditTask
          task={editingTask}
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