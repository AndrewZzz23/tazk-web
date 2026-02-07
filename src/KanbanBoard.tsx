import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Task, TaskStatus, UserRole, TaskPriority } from './types/database.types'
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
import { LoadingZapIcon } from './components/iu/AnimatedIcons'
import { Calendar, Columns3, LayoutGrid, Flag } from 'lucide-react'
import { logTaskStatusChanged } from './lib/activityLogger'
import { sendTaskCompletedEmail } from './lib/emailNotifications'

// Configuración de colores de prioridad
const PRIORITY_CONFIG: Record<TaskPriority, { label: string; flagColor: string }> = {
  high: { label: 'Alta', flagColor: '#ef4444' },
  medium: { label: 'Media', flagColor: '#eab308' },
  low: { label: 'Baja', flagColor: '#22c55e' },
}

interface KanbanBoardProps {
  currentUserId: string
  teamId: string | null
  userRole: UserRole | null
  userEmail?: string
  searchTerm: string
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
  onOpenTask?: (task: Task) => void
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
      className={`bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-yellow-400/50 transition-all ${
        isDragging ? 'opacity-50 rotate-2 scale-105' : ''
      }`}
      onClick={onClick}
    >
      <h4 className="text-gray-900 dark:text-white font-medium text-sm line-clamp-2">
        {task.title}
      </h4>

      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-2">
          {/* Asignado */}
          {task.assigned_user && (
            <span className="w-5 h-5 bg-yellow-400 text-neutral-900 rounded-full flex items-center justify-center text-xs font-bold">
              {task.assigned_user.full_name?.[0] || task.assigned_user.email?.[0] || '?'}
            </span>
          )}
          {/* Prioridad */}
          {task.priority && (
            <Flag
              className="w-3 h-3"
              style={{ color: PRIORITY_CONFIG[task.priority].flagColor }}
              fill={PRIORITY_CONFIG[task.priority].flagColor}
            />
          )}
        </div>

        {/* Fecha */}
        {task.due_date && (
          <span
            className={`text-xs flex items-center gap-1 ${
              isOverdue(task.due_date) ? 'text-red-400' : 'text-gray-500 dark:text-neutral-400'
            }`}
          >
            <Calendar className="w-3 h-3" />
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  )
}

// Preview de tarjeta al arrastrar
function TaskCardPreview({ task }: { task: Task }) {
  return (
    <div className="bg-gray-100 dark:bg-neutral-700 border-2 border-yellow-400 rounded-lg p-3 shadow-2xl rotate-3 w-64">
      <h4 className="text-gray-900 dark:text-white font-medium text-sm">{task.title}</h4>
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
      className={`bg-white dark:bg-neutral-800/50 rounded-xl p-4 min-h-[500px] min-w-[280px] w-[280px] flex-shrink-0 transition-all ${
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
          <h3 className="text-gray-900 dark:text-white font-semibold">{status.name}</h3>
        </div>
        <span className="bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 text-xs font-medium px-2 py-1 rounded-full">
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
          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-lg">
            <LayoutGrid className="w-6 h-6 text-gray-300 dark:text-neutral-600 mb-2" />
            <span className="text-gray-400 dark:text-neutral-500 text-sm">Sin tareas</span>
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanBoard({ currentUserId, teamId, userEmail, searchTerm, onOpenTask }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

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
    } else {
      // Log status change
      const oldStatus = statuses.find((s) => s.id === oldStatusId)
      const newStatus = statuses.find((s) => s.id === newStatusId)
      if (oldStatus && newStatus) {
        logTaskStatusChanged(taskId, task.title, teamId, currentUserId, oldStatus.name, newStatus.name, userEmail)

        // Send email notification if task was completed
        if (newStatus.category === 'completed' && oldStatus.category !== 'completed') {
          const emailsToNotify: string[] = []

          // Notify the task creator if different from current user
          if (task.created_by_user?.email && task.created_by !== currentUserId) {
            emailsToNotify.push(task.created_by_user.email)
          }

          // Notify the assigned user if different from current user and creator
          if (task.assigned_to && task.assigned_to !== currentUserId) {
            const assignedEmail = task.assigned_user?.email
            if (assignedEmail && !emailsToNotify.includes(assignedEmail)) {
              emailsToNotify.push(assignedEmail)
            }
          }

          if (emailsToNotify.length > 0) {
            sendTaskCompletedEmail(currentUserId, teamId, emailsToNotify, {
              taskId: task.id,
              taskTitle: task.title,
              taskDescription: task.description || undefined,
              statusName: newStatus.name,
              createdByName: userEmail,
              completedDate: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            })
          }
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingZapIcon size={48} />
      </div>
    )
  }

  if (statuses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 bg-gray-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
          <Columns3 className="w-10 h-10 text-gray-400 dark:text-neutral-500" />
        </div>
        <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-1">
          Sin estados configurados
        </h3>
        <p className="text-gray-500 dark:text-neutral-400 text-sm text-center max-w-xs">
          Ve a "Estados" para crear columnas en tu tablero
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
          className="flex gap-4 overflow-x-auto p-4"
          style={{ minHeight: '500px' }}
        >
          {[...statuses]
            .sort((a, b) => a.order_position - b.order_position)
            .map((status) => (
              <DroppableColumn
                key={status.id}
                status={status}
                tasks={filteredTasks.filter((t) => t.status_id === status.id)}
                onTaskClick={(task) => onOpenTask?.(task)}
              />
            ))}
        </div>

        <DragOverlay>
          {activeTask && <TaskCardPreview task={activeTask} />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export default KanbanBoard