import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Task, TaskStatus, Profile, UserRole } from './types/database.types'
import EditTask from './EditTask'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'

interface TaskWithRelations extends Task {
  task_statuses: TaskStatus
  assigned_user: Profile | null
}

interface KanbanBoardProps {
  currentUserId: string
  teamId?: string | null
  userRole?: UserRole | null
  onTaskUpdated?: () => void
  searchTerm?: string
}

// Componente de tarjeta arrastrable
function TaskCard({ task, onClick, isOverdue }: { 
  task: TaskWithRelations
  onClick: () => void
  isOverdue: (date: string | null) => boolean 
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })

  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: 'white',
        borderRadius: '6px',
        padding: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        cursor: 'grab'
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500' }}>
        {task.title}
      </p>

      {task.description && (
        <p style={{ 
          margin: '0 0 8px 0', 
          fontSize: '12px', 
          color: '#666',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {task.description}
        </p>
      )}

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        color: '#888'
      }}>
        <span>
          👤 {task.assigned_user?.full_name || task.assigned_user?.email || 'Sin asignar'}
        </span>
        {task.due_date && (
          <span style={{ color: isOverdue(task.due_date) ? '#e74c3c' : '#888' }}>
            📅 {new Date(task.due_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>
    </div>
  )
}

function KanbanBoard({ currentUserId, teamId, searchTerm = '' }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const loadStatuses = async () => {
    const { data } = await supabase
      .from('task_statuses')
      .select('*')
      .eq('is_active', true)
      .order('order_position')
    
    if (data) setStatuses(data)
  }

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
    loadStatuses()
  }, [])

  useEffect(() => {
    loadTasks()
  }, [currentUserId, teamId])

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const newStatusId = over.id as string

    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status_id === newStatusId) return

    // Verificar que over.id sea un status válido
    const isValidStatus = statuses.some(s => s.id === newStatusId)
    if (!isValidStatus) return

    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status_id: newStatusId, task_statuses: statuses.find(s => s.id === newStatusId)! }
        : t
    ))

    const { error } = await supabase
      .from('tasks')
      .update({ status_id: newStatusId })
      .eq('id', taskId)

    if (error) {
      console.error('Error actualizando estado:', error)
      loadTasks()
    }
  }

  const getTasksByStatus = (statusId: string) => {
    let result = tasks.filter(task => task.status_id === statusId)
    
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
  }

  const isOverdue = (dueDate: string | null): boolean => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando tablero...</div>
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{
        display: 'flex',
        gap: '16px',
        overflowX: 'auto',
        paddingBottom: '16px'
      }}>
        {statuses.map(status => (
          <DroppableColumn
            key={status.id}
            status={status}
            tasks={getTasksByStatus(status.id)}
            onTaskClick={setEditingTask}
            isOverdue={isOverdue}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '6px',
            padding: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            width: '256px'
          }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
              {activeTask.title}
            </p>
          </div>
        )}
      </DragOverlay>

      {editingTask && (
        <EditTask
          task={editingTask}
          onTaskUpdated={() => loadTasks()}
          onClose={() => setEditingTask(null)}
        />
      )}
    </DndContext>
  )
}

// Componente de columna donde se pueden soltar tareas
function DroppableColumn({ status, tasks, onTaskClick, isOverdue }: {
  status: TaskStatus
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
  isOverdue: (date: string | null) => boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        minWidth: '280px',
        maxWidth: '280px',
        backgroundColor: isOver ? '#e8f5e9' : '#f4f5f7',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '70vh',
        transition: 'background-color 0.2s'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: `3px solid ${status.color}`
      }}>
        <span style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: status.color
        }}></span>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
          {status.name}
        </h3>
        <span style={{
          backgroundColor: '#ddd',
          borderRadius: '10px',
          padding: '2px 8px',
          fontSize: '12px',
          marginLeft: 'auto'
        }}>
          {tasks.length}
        </span>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        overflowY: 'auto',
        flex: 1,
        minHeight: '100px'
      }}>
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            isOverdue={isOverdue}
          />
        ))}

        {tasks.length === 0 && (
          <p style={{ 
            textAlign: 'center', 
            color: '#999', 
            fontSize: '13px',
            padding: '20px 0'
          }}>
            Arrastra tareas aquí
          </p>
        )}
      </div>
    </div>
  )
}

export default KanbanBoard