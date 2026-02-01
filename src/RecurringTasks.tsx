import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { RecurringTask, RecurringFrequency, RecurringPriority } from './types/database.types'
import { LoadingZapIcon } from './components/iu/AnimatedIcons'
import { Plus, Clock, Calendar, Repeat, Trash2, Edit3, Play, Pause, AlertCircle, CheckCircle } from 'lucide-react'
import { useIsMobile } from './hooks/useIsMobile'
import CreateRecurringTask from './CreateRecurringTask'
import ConfirmDialog from './ConfirmDialog'

interface RecurringTasksProps {
  currentUserId: string
  teamId: string | null
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const PRIORITY_CONFIG: Record<RecurringPriority, { label: string; color: string; bgColor: string }> = {
  high: { label: 'Alta', color: 'text-red-400', bgColor: 'bg-red-400/10' },
  medium: { label: 'Media', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
  low: { label: 'Baja', color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
}

const FREQUENCY_CONFIG: Record<RecurringFrequency, { label: string; icon: typeof Repeat }> = {
  daily: { label: 'Diario', icon: Repeat },
  weekly: { label: 'Semanal', icon: Calendar },
  monthly: { label: 'Mensual', icon: Calendar },
}

function RecurringTasks({ currentUserId, teamId, showToast }: RecurringTasksProps) {
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null)
  const [deletingTask, setDeletingTask] = useState<RecurringTask | null>(null)

  useEffect(() => {
    loadRecurringTasks()
  }, [currentUserId, teamId])

  const loadRecurringTasks = async () => {
    setLoading(true)

    let query = supabase
      .from('recurring_tasks')
      .select(`
        *,
        assigned_user:profiles!recurring_tasks_assigned_to_fkey(id, email, full_name),
        default_status:task_statuses!recurring_tasks_default_status_id_fkey(id, name, color)
      `)
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })

    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      query = query.is('team_id', null)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading recurring tasks:', error)
      showToast?.('Error al cargar rutinas', 'error')
    } else {
      setRecurringTasks(data || [])
    }

    setLoading(false)
  }

  const toggleActive = async (task: RecurringTask) => {
    const newIsActive = !task.is_active

    // Optimistic update
    setRecurringTasks(prev =>
      prev.map(t => t.id === task.id ? { ...t, is_active: newIsActive } : t)
    )

    const { error } = await supabase
      .from('recurring_tasks')
      .update({ is_active: newIsActive, updated_at: new Date().toISOString() })
      .eq('id', task.id)

    if (error) {
      // Revert
      setRecurringTasks(prev =>
        prev.map(t => t.id === task.id ? { ...t, is_active: !newIsActive } : t)
      )
      showToast?.('Error al actualizar', 'error')
    } else {
      showToast?.(newIsActive ? 'Rutina activada' : 'Rutina pausada', 'success')
    }
  }

  const handleDelete = async () => {
    if (!deletingTask) return

    const { error } = await supabase
      .from('recurring_tasks')
      .delete()
      .eq('id', deletingTask.id)

    if (error) {
      showToast?.('Error al eliminar', 'error')
    } else {
      setRecurringTasks(prev => prev.filter(t => t.id !== deletingTask.id))
      showToast?.('Rutina eliminada', 'success')
    }

    setDeletingTask(null)
  }

  const formatNextRun = (task: RecurringTask): string => {
    if (!task.next_scheduled_at) return 'Sin programar'

    const next = new Date(task.next_scheduled_at)
    const now = new Date()
    const diffMs = next.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffMs < 0) return 'Pendiente de ejecución'
    if (diffHours < 1) return 'En menos de 1 hora'
    if (diffHours < 24) return `En ${diffHours} horas`
    if (diffDays === 1) return 'Mañana'
    if (diffDays < 7) return `En ${diffDays} días`

    return next.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingZapIcon size={48} />
      </div>
    )
  }

  return (
    <div className={`${isMobile ? 'pb-24' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Repeat className="w-6 h-6 text-yellow-400" />
            Rutinas
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            Tareas que se crean automáticamente según tu horario
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 text-neutral-900 rounded-xl font-semibold hover:bg-yellow-300 transition-all active:scale-95 shadow-lg shadow-yellow-400/20"
        >
          <Plus className="w-5 h-5" />
          {!isMobile && <span>Nueva rutina</span>}
        </button>
      </div>

      {/* Lista de rutinas */}
      {recurringTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <Repeat className="w-10 h-10 text-neutral-400 dark:text-neutral-500" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            Sin rutinas configuradas
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mb-6">
            Crea rutinas para que tus tareas diarias, semanales o mensuales se generen automáticamente.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-yellow-400 text-neutral-900 rounded-xl font-semibold hover:bg-yellow-300 transition-all"
          >
            <Plus className="w-5 h-5" />
            Crear primera rutina
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {recurringTasks.map(task => {
            const priorityConfig = PRIORITY_CONFIG[task.priority]
            const frequencyConfig = FREQUENCY_CONFIG[task.frequency]
            const FreqIcon = frequencyConfig.icon

            return (
              <div
                key={task.id}
                className={`bg-white dark:bg-neutral-800 rounded-2xl border transition-all ${
                  task.is_active
                    ? 'border-neutral-200 dark:border-neutral-700'
                    : 'border-neutral-200 dark:border-neutral-800 opacity-60'
                }`}
              >
                <div className="p-4">
                  {/* Header de la tarjeta */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold truncate ${
                          task.is_active ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'
                        }`}>
                          {task.title}
                        </h3>
                        {!task.is_active && (
                          <span className="flex-shrink-0 px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 text-xs rounded-full">
                            Pausada
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(task)}
                        className={`p-2 rounded-lg transition-colors ${
                          task.is_active
                            ? 'text-yellow-500 hover:bg-yellow-400/10'
                            : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        }`}
                        title={task.is_active ? 'Pausar' : 'Activar'}
                      >
                        {task.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingTask(task)}
                        className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingTask(task)}
                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tags y metadata */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Prioridad */}
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                      <AlertCircle className="w-3 h-3" />
                      {priorityConfig.label}
                    </span>

                    {/* Frecuencia */}
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-400/10 text-purple-400 rounded-lg text-xs font-medium">
                      <FreqIcon className="w-3 h-3" />
                      {frequencyConfig.label}
                    </span>

                    {/* Hora */}
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg text-xs">
                      <Clock className="w-3 h-3" />
                      {task.time_of_day.substring(0, 5)}
                    </span>

                    {/* Días (para semanal) */}
                    {task.frequency === 'weekly' && task.days_of_week && task.days_of_week.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg text-xs">
                        {task.days_of_week.map(d => DAYS_OF_WEEK[d].charAt(0)).join('')}
                      </span>
                    )}

                    {/* Día del mes (para mensual) */}
                    {task.frequency === 'monthly' && task.day_of_month && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg text-xs">
                        Día {task.day_of_month}
                      </span>
                    )}
                  </div>

                  {/* Próxima ejecución */}
                  {task.is_active && (
                    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        Próxima creación: <span className="font-medium text-neutral-700 dark:text-neutral-300">{formatNextRun(task)}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal crear/editar */}
      {(showCreateModal || editingTask) && (
        <CreateRecurringTask
          currentUserId={currentUserId}
          teamId={teamId}
          editingTask={editingTask}
          onClose={() => {
            setShowCreateModal(false)
            setEditingTask(null)
          }}
          onSaved={() => {
            setShowCreateModal(false)
            setEditingTask(null)
            loadRecurringTasks()
            showToast?.(editingTask ? 'Rutina actualizada' : 'Rutina creada', 'success')
          }}
          showToast={showToast}
        />
      )}

      {/* Confirmar eliminación */}
      {deletingTask && (
        <ConfirmDialog
          title="Eliminar rutina"
          message={`¿Estás seguro de eliminar "${deletingTask.title}"? Las tareas ya creadas no se eliminarán.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          type="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeletingTask(null)}
        />
      )}
    </div>
  )
}

export default RecurringTasks
