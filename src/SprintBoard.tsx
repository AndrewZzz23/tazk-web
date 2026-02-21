import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Task, TaskStatus, UserRole, TaskPriority, Sprint } from './types/database.types'
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
import { Calendar, Columns3, LayoutGrid, Flag, Timer, Target, ArrowRight } from 'lucide-react'
import { logTaskStatusChanged } from './lib/activityLogger'
import { sendTaskCompletedEmail } from './lib/emailNotifications'

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; flagColor: string }> = {
  high: { label: 'Alta', flagColor: '#ef4444' },
  medium: { label: 'Media', flagColor: '#eab308' },
  low: { label: 'Baja', flagColor: '#22c55e' },
}

interface SprintBoardProps {
  currentUserId: string
  teamId: string | null
  userRole: UserRole | null
  userEmail?: string
  searchTerm: string
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
  onOpenTask?: (task: Task) => void
  onNavigate?: (view: string) => void
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
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
          {task.assigned_user && (
            <span className="w-5 h-5 bg-yellow-400 text-neutral-900 rounded-full flex items-center justify-center text-xs font-bold">
              {task.assigned_user.full_name?.[0] || task.assigned_user.email?.[0] || '?'}
            </span>
          )}
          {task.priority && (
            <Flag
              className="w-3 h-3"
              style={{ color: PRIORITY_CONFIG[task.priority].flagColor }}
              fill={PRIORITY_CONFIG[task.priority].flagColor}
            />
          )}
          {task.story_points != null && (
            <span className="text-xs bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 font-semibold px-1.5 py-0.5 rounded">
              {task.story_points}pts
            </span>
          )}
        </div>
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

function TaskCardPreview({ task }: { task: Task }) {
  return (
    <div className="bg-gray-100 dark:bg-neutral-700 border-2 border-yellow-400 rounded-lg p-3 shadow-2xl rotate-3 w-64">
      <h4 className="text-gray-900 dark:text-white font-medium text-sm">{task.title}</h4>
    </div>
  )
}

function DroppableColumn({
  status,
  tasks,
  onTaskClick,
}: {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id })

  return (
    <div
      ref={setNodeRef}
      className={`bg-white dark:bg-neutral-800/50 rounded-xl p-4 min-h-[500px] min-w-[280px] w-[280px] flex-shrink-0 transition-all ${
        isOver ? 'ring-2 ring-yellow-400 bg-yellow-400/5' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
          <h3 className="text-gray-900 dark:text-white font-semibold">{status.name}</h3>
        </div>
        <span className="bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 text-xs font-medium px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div className="space-y-3">
        {tasks.map((task, index) => (
          <div key={task.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}>
            <TaskCard task={task} onClick={() => onTaskClick(task)} />
          </div>
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

function SprintBoard({ currentUserId, teamId, userEmail, searchTerm, showToast, onOpenTask, onNavigate }: SprintBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const loadData = async () => {
    setLoading(true)

    // Buscar sprint activo
    let sprintQuery = supabase
      .from('sprints')
      .select('*')
      .eq('status', 'active')

    if (teamId) {
      sprintQuery = sprintQuery.eq('team_id', teamId)
    } else {
      sprintQuery = sprintQuery.is('team_id', null).eq('created_by', currentUserId)
    }

    const { data: sprintData } = await sprintQuery.maybeSingle()

    if (!sprintData) {
      setActiveSprint(null)
      setLoading(false)
      return
    }

    setActiveSprint(sprintData as Sprint)

    // Cargar estados del equipo/personal
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

    // Cargar tareas del sprint activo
    const [{ data: statusData }, { data: taskData }] = await Promise.all([
      statusQuery,
      supabase
        .from('tasks')
        .select(`
          *,
          task_statuses (*),
          assigned_user:profiles!tasks_assigned_to_fkey (*),
          created_by_user:profiles!tasks_created_by_fkey (*)
        `)
        .eq('sprint_id', sprintData.id)
        .order('created_at', { ascending: false })
    ])

    if (statusData) setStatuses(statusData)
    if (taskData) setTasks(taskData)

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [teamId, currentUserId])

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
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status_id: oldStatusId, task_statuses: statuses.find((s) => s.id === oldStatusId) }
            : t
        )
      )
      showToast?.('Error al mover tarea', 'error')
    } else {
      const oldStatus = statuses.find((s) => s.id === oldStatusId)
      const newStatus = statuses.find((s) => s.id === newStatusId)
      if (oldStatus && newStatus) {
        logTaskStatusChanged(taskId, task.title, teamId, currentUserId, oldStatus.name, newStatus.name, userEmail)

        if (newStatus.category === 'completed' && oldStatus.category !== 'completed') {
          const emailsToNotify: string[] = []
          if (task.created_by_user?.email && task.created_by !== currentUserId) {
            emailsToNotify.push(task.created_by_user.email)
          }
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
          if (task.created_by && task.created_by !== currentUserId) {
            supabase.from('notifications').insert({
              user_id: task.created_by,
              type: 'task_completed',
              title: `${userEmail || 'Alguien'} completó una tarea`,
              body: task.title,
              data: { task_id: task.id, team_id: teamId }
            }).then(() => {})
          }
          if (task.assigned_to && task.assigned_to !== currentUserId && task.assigned_to !== task.created_by) {
            supabase.from('notifications').insert({
              user_id: task.assigned_to,
              type: 'task_completed',
              title: `${userEmail || 'Alguien'} completó una tarea`,
              body: task.title,
              data: { task_id: task.id, team_id: teamId }
            }).then(() => {})
          }
        }
      }
    }
  }

  // Progreso por story points
  const totalPts = tasks.reduce((s, t) => s + (t.story_points || 0), 0)
  const donePts = tasks
    .filter((t) => t.task_statuses?.category === 'completed')
    .reduce((s, t) => s + (t.story_points || 0), 0)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((col) => (
          <div key={col} className="flex-shrink-0 w-72 bg-gray-50 dark:bg-neutral-800 rounded-xl p-3 space-y-3 animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-neutral-700" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-neutral-700 rounded" />
              <div className="h-5 w-6 bg-gray-100 dark:bg-neutral-700/50 rounded-full ml-auto" />
            </div>
            {Array.from({ length: col <= 2 ? 3 : 2 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg p-3 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-neutral-600 rounded" />
                <div className="h-3 w-1/2 bg-gray-100 dark:bg-neutral-600/50 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (!activeSprint) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="w-20 h-20 bg-yellow-400/10 rounded-full flex items-center justify-center mb-4">
          <Timer className="w-10 h-10 text-yellow-400" />
        </div>
        <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-1">
          No hay un sprint activo
        </h3>
        <p className="text-gray-500 dark:text-neutral-400 text-sm text-center max-w-xs mb-6">
          Inicia un sprint desde la vista de Sprints para ver el tablero
        </p>
        <button
          onClick={() => onNavigate?.('sprints')}
          className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 text-neutral-900 rounded-xl font-semibold hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20"
        >
          Ir a Sprints
          <ArrowRight className="w-4 h-4" />
        </button>
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

  const progressPercent = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0

  return (
    <div>
      {/* Header del sprint */}
      <div className="px-4 pt-2 pb-4 mb-2">
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4">
          <div className="flex flex-wrap items-start gap-4">
            {/* Nombre + objetivo */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <h2 className="text-neutral-900 dark:text-white font-bold text-base truncate">
                  {activeSprint.name}
                </h2>
                <span className="flex-shrink-0 text-xs bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 font-semibold px-2 py-0.5 rounded-full">
                  Activo
                </span>
              </div>
              {activeSprint.goal && (
                <div className="flex items-start gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                  <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{activeSprint.goal}</span>
                </div>
              )}
            </div>

            {/* Fechas */}
            {(activeSprint.start_date || activeSprint.end_date) && (
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {activeSprint.start_date ? formatDate(activeSprint.start_date) : '—'}
                  {' → '}
                  {activeSprint.end_date ? formatDate(activeSprint.end_date) : '—'}
                </span>
              </div>
            )}
          </div>

          {/* Barra de progreso */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {totalPts > 0
                  ? `${donePts} / ${totalPts} pts`
                  : `${tasks.filter((t) => t.task_statuses?.category === 'completed').length} / ${tasks.length} tareas`}
              </span>
              <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                {totalPts > 0
                  ? `${progressPercent}%`
                  : tasks.length > 0
                    ? `${Math.round((tasks.filter((t) => t.task_statuses?.category === 'completed').length / tasks.length) * 100)}%`
                    : '0%'}
              </span>
            </div>
            <div className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                style={{
                  width: totalPts > 0
                    ? `${progressPercent}%`
                    : tasks.length > 0
                      ? `${Math.round((tasks.filter((t) => t.task_statuses?.category === 'completed').length / tasks.length) * 100)}%`
                      : '0%'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tablero Kanban */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto p-4" style={{ minHeight: '500px' }}>
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

export default SprintBoard
