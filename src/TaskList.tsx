import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { Task, TaskStatus, Profile, UserRole } from './types/database.types'
import EditTask from './EditTask'

interface TaskWithRelations extends Task {
  task_statuses: TaskStatus
  assigned_user: Profile | null
}

interface TaskListProps {
  currentUserId: string
  teamId?: string | null
  userRole?: UserRole | null
  onTaskUpdated?: () => void
  searchTerm?: string
}

function TaskList({ currentUserId, teamId, searchTerm = '' }: TaskListProps) {
  const [allTasks, setAllTasks] = useState<TaskWithRelations[]>([]) // Todas las tareas
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)

  const loadStatuses = useCallback(async () => {
    const { data } = await supabase
      .from('task_statuses')
      .select('*')
      .eq('is_active', true)
      .order('order_position')
    
    if (data) setStatuses(data)
  }, [])

    const loadTasks = useCallback(async (showLoading = false) => {
    if (showLoading) setInitialLoading(true)
    
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

    // NO aplicamos el filtro aquí - cargamos TODAS las tareas
    const { data, error } = await query

    if (error) {
      console.error('Error cargando tareas:', error)
    } else {
      setAllTasks(data as TaskWithRelations[] || [])
    }
    
    setInitialLoading(false)
  }, [currentUserId, teamId])

  useEffect(() => {
    loadStatuses()
  }, [loadStatuses])

  useEffect(() => {
    loadTasks(true)
  }, [currentUserId, teamId])

  // Filtrar tareas localmente (sin llamar a la base de datos)
  const filteredTasks = useMemo(() => {
    let result = allTasks

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
  }, [allTasks, filter, searchTerm])

  // Contar tareas por estado
  const getTaskCountByStatus = useCallback((statusId: string): number => {
    return allTasks.filter(task => task.status_id === statusId).length
  }, [allTasks])

  const handleStatusChange = async (taskId: string, newStatusId: string) => {
    // Actualizar localmente primero (optimista)
    setAllTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, status_id: newStatusId, task_statuses: statuses.find(s => s.id === newStatusId)! }
        : task
    ))

    // Luego guardar en BD
    const { error } = await supabase
      .from('tasks')
      .update({ status_id: newStatusId })
      .eq('id', taskId)

    if (error) {
      console.error('Error actualizando estado:', error)
      alert('Error al actualizar el estado')
      loadTasks() // Recargar solo si hay error
    }
  }

  const handleDelete = async (taskId: string, taskTitle: string) => {
    if (!confirm(`¿Estás seguro de eliminar la tarea "${taskTitle}"?`)) {
      return
    }

    // Guardar copia por si falla
    const taskBackup = allTasks.find(t => t.id === taskId)
    
    // Eliminar de la UI inmediatamente
    setAllTasks(prev => prev.filter(task => task.id !== taskId))

    // Luego eliminar en BD
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('Error eliminando tarea:', error)
      alert('Error al eliminar la tarea: ' + error.message)
      // Restaurar si falló
      if (taskBackup) {
        setAllTasks(prev => [...prev, taskBackup])
      }
    }
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isOverdue = (dueDate: string | null): boolean => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  if (initialLoading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando tareas...</div>
  }

  return (
    <div>
      <div style={{ 
        marginBottom: '20px', 
        display: 'flex', 
        gap: '10px', 
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontWeight: 'bold' }}>Filtrar por estado:</span>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: filter === 'all' ? '#333' : '#e0e0e0',
            color: filter === 'all' ? 'white' : 'black'
          }}
        >
          Todas ({allTasks.length})
        </button>
        {statuses.map(status => (
          <button
            key={status.id}
            onClick={() => setFilter(status.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: filter === status.id ? status.color : '#e0e0e0',
              color: filter === status.id ? 'white' : 'black'
            }}
          >
            {status.name} ({getTaskCountByStatus(status.id)})
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          backgroundColor: '#f9f9f9',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '18px', color: '#666' }}>
            {filter === 'all' 
              ? 'No hay tareas creadas todavía' 
              : 'No hay tareas con este estado'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTasks.map(task => (
            <div
              key={task.id}
              style={{
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                borderLeft: `4px solid ${task.task_statuses?.color || '#ccc'}`
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                gap: '16px'
              }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                    {task.title}
                  </h4>
                  
                  {task.description && (
                    <p style={{ 
                      margin: '0 0 12px 0', 
                      color: '#666',
                      fontSize: '14px'
                    }}>
                      {task.description}
                    </p>
                  )}

                  <div style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    fontSize: '13px',
                    color: '#888',
                    flexWrap: 'wrap'
                  }}>
                    <span>
                      👤 {task.assigned_user 
                        ? (task.assigned_user.full_name || task.assigned_user.email)
                        : 'Sin asignar'}
                    </span>

                    {task.due_date && (
                      <span style={{ 
                        color: isOverdue(task.due_date) ? '#e74c3c' : '#888'
                      }}>
                        📅 {formatDate(task.due_date)}
                        {isOverdue(task.due_date) && ' (Vencida)'}
                      </span>
                    )}

                    <span>
                      {task.team_id ? '👥 Equipo' : '👤 Personal'}
                    </span>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px',
                  alignItems: 'flex-end'
                }}>
                  <select
                    value={task.status_id}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      backgroundColor: task.task_statuses?.color || '#eee',
                      color: 'white',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {statuses.map(status => (
                      <option 
                        key={status.id} 
                        value={status.id}
                        style={{ backgroundColor: 'white', color: 'black' }}
                      >
                        {status.name}
                      </option>
                    ))}
                  </select>

                  {/* Botón editar */}
                  <button
                    onClick={() => setEditingTask(task)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ✏️ Editar
                  </button>

                  <button
                    onClick={() => handleDelete(task.id, task.title)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Modal editar tarea */}
      {editingTask && (
        <EditTask
          task={editingTask}
          onTaskUpdated={() => {
            loadTasks()
          }}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  )
}

export default TaskList