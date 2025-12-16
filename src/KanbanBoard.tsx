import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Task, TaskStatus, UserRole } from './types/database.types'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import EditTask from './EditTask'

interface KanbanBoardProps {
  currentUserId: string
  teamId: string | null
  userRole: UserRole | null
  searchTerm: string
}

// Componente de tarjeta arrastrable
function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-neutral-700 border border-neutral-600 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-yellow-400/50 transition-all ${
        isDragging ? 'opacity-50 rotate-2 scale-105' : ''
      }`}
      onClick={onClick}
    >
      <h4 className="text-white font-medium text-sm mb-2 line-clamp-2">
        {task.title}
      </h4>

      {task.description && (
        <p className="text-neutral-400 text-xs mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 mt-2">
        {/* Asignado */}
        {task.assigned_user && (
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 bg-yellow-400 text-neutral-900 rounded-full flex items-center justify-center text-xs font-bold">
              {task.assigned_user.full_name?.[0] || task.assigned_user.email?.[0] || '?'}
            </span>
          </div>
        )}

        {/* Fecha */}
        {task.due_date && (
          <span
            className={`text-xs flex items-center gap-1 ${
              isOverdue(task.due_date) ? 'text-red-400' : 'text-neutral-400'
            }`}
          >
            📅 {formatDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  )
}

// Preview de tarjeta al arrastrar
function TaskCardPreview({ task }: { task: Task }) {
  return (
    <div className="bg-neutral-700 border-2 border-yellow-400 rounded-lg p-3 shadow-2xl rotate-3 w-64">
      <h4 className="text-white font-medium text-sm">{task.title}</h4>
    </div>
  )
}

// Columna droppable
function DroppableColumn({
  status,
  tasks,
  onTaskClick,
}: {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`bg-neutral-800/50 rounded-xl p-4 min-h-[500px] min-w-[280px] w-[280px] flex-shrink-0 transition-all ${
        isOver ? 'ring-2 ring-yellow-400 bg-yellow-400/5' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <h3 className="text-white font-semibold">{status.name}</h3>
        </div>
        <span className="bg-neutral-700 text-neutral-300 text-xs font-medium px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Tareas */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
          />
        ))}

        {tasks.length === 0 && (
          <div className="text-neutral-500 text-sm text-center py-8 border-2 border-dashed border-neutral-700 rounded-lg">
            Sin tareas
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanBoard({ currentUserId, teamId, userRole, searchTerm }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const loadData = async () => {
    setLoading(true)

    // Cargar estados
    let statusQuery = supabase
      .from('task_statuses')
      .select('*')
      .eq('is_active', true)
      .order('order_position')

    if (teamId) {
      statusQuery = statusQuery.eq('team_id', teamId)
    } else {
      statusQuery = statusQuery.is('team_id', null)
    }

    const { data: statusData } = await statusQuery
    if (statusData) setStatuses(statusData)

    // Cargar tareas
    let taskQuery = supabase
      .from('tasks')
      .select(`
        *,
        task_statuses (*),
        assigned_user:profiles!tasks_assigned_to_fkey (*)
      `)
      .order('created_at', { ascending: false })

    if (teamId) {
      taskQuery = taskQuery.eq('team_id', teamId)
    } else {
      taskQuery = taskQuery.is('team_id', null).eq('created_by', currentUserId)
    }

    const { data: taskData } = await taskQuery
    if (taskData) setTasks(taskData)

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [teamId, currentUserId])

  // Filtrar por búsqueda
  const filteredTasks = tasks.filter((task) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      task.title.toLowerCase().includes(term) ||
      task.description?.toLowerCase().includes(term) ||
      task.assigned_user?.full_name?.toLowerCase().includes(term) ||
      task.assigned_user?.email?.toLowerCase().includes(term)
    )
  })

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const newStatusId = over.id as string

    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status_id === newStatusId) return

    // Optimistic update
    const oldStatusId = task.status_id
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status_id: newStatusId, task_statuses: statuses.find((s) => s.id === newStatusId) }
          : t
      )
    )

    const { error } = await supabase
      .from('tasks')
      .update({ status_id: newStatusId })
      .eq('id', taskId)

    if (error) {
      // Revertir
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status_id: oldStatusId, task_statuses: statuses.find((s) => s.id === oldStatusId) }
            : t
        )
      )
      alert('Error al mover tarea')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-yellow-400 text-lg">⚡ Cargando tablero...</div>
      </div>
    )
  }

  if (statuses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <p className="text-neutral-400 text-lg">No hay estados configurados</p>
        <p className="text-neutral-500 text-sm mt-2">
          Ve a "Estados" para crear algunos
        </p>
      </div>
    )
  }

  return (
    <div>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div 
          className="flex gap-4 overflow-x-auto pb-4"
          style={{ minHeight: '500px' }}
        >
          {statuses
            .sort((a, b) => a.order_position - b.order_position)
            .map((status) => (
            <DroppableColumn
              key={status.id}
              status={status}
              tasks={filteredTasks.filter((t) => t.status_id === status.id)}
              onTaskClick={setEditingTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <TaskCardPreview task={activeTask} />}
        </DragOverlay>
      </DndContext>

      {/* Modal de edición */}
      {editingTask && (
        <EditTask
          task={editingTask}
          onTaskUpdated={loadData}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  )
}

export default KanbanBoard