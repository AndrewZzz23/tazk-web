import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { Sprint, Task, UserRole } from './types/database.types'
import { useIsMobile } from './hooks/useIsMobile'
import CreateSprint from './CreateSprint'
import ConfirmDialog from './ConfirmDialog'
import {
  logSprintStarted, logSprintCompleted, logSprintDeleted,
  logTaskAddedToSprint, logTaskRemovedFromSprint
} from './lib/activityLogger'
import { notifySprintStarted, notifyTaskAddedToSprint } from './lib/sendPushNotification'
import {
  Timer, Calendar, CheckCircle2, Clock, Play,
  Plus, Trash2, Edit3, ChevronDown, ChevronRight, Hash,
  ArrowRight, Inbox, AlertCircle
} from 'lucide-react'
import { LoadingZapIcon } from './components/iu/AnimatedIcons'

interface SprintsProps {
  currentUserId: string
  teamId: string | null
  userRole: UserRole | null
  userEmail?: string
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
  onOpenTask?: (task: Task) => void
}

type SprintTab = 'sprints' | 'backlog'

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planificando',
  active: 'Activo',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700 dark:bg-blue-400/20 dark:text-blue-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-400/20 dark:text-green-300',
  completed: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-400/20 dark:text-red-300',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SprintsView({ currentUserId, teamId, userRole, userEmail, showToast, onOpenTask }: SprintsProps) {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<SprintTab>('sprints')
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([])
  const [sprintTasks, setSprintTasks] = useState<Record<string, Task[]>>({})
  const [loading, setLoading] = useState(true)
  const [backlogLoading, setBacklogLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null)
  const [deletingSprint, setDeletingSprint] = useState<Sprint | null>(null)
  const [historyCollapsed, setHistoryCollapsed] = useState(true)

  const canManageSprints = !teamId || userRole === 'owner' || userRole === 'admin'

  const loadSprints = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('sprints')
      .select('*')
      .order('created_at', { ascending: false })

    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      query = query.is('team_id', null).eq('created_by', currentUserId)
    }

    const { data } = await query
    const sprintList = (data || []) as Sprint[]
    setSprints(sprintList)

    // Load tasks for active/planning sprints
    const activeSprints = sprintList.filter(s => s.status === 'active' || s.status === 'planning')
    if (activeSprints.length > 0) {
      const ids = activeSprints.map(s => s.id)
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, task_statuses(*), assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, email)')
        .in('sprint_id', ids)
        .order('created_at', { ascending: false })

      if (taskData) {
        const grouped: Record<string, Task[]> = {}
        for (const t of taskData) {
          const sid = (t as any).sprint_id
          if (!grouped[sid]) grouped[sid] = []
          grouped[sid].push(t as Task)
        }
        setSprintTasks(grouped)
      }
    }

    setLoading(false)
  }, [currentUserId, teamId])

  const loadBacklog = useCallback(async () => {
    setBacklogLoading(true)
    let query = supabase
      .from('tasks')
      .select('*, task_statuses(*), assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, email)')
      .is('sprint_id', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      query = query.is('team_id', null).eq('created_by', currentUserId)
    }

    const { data } = await query
    setBacklogTasks((data || []) as Task[])
    setBacklogLoading(false)
  }, [currentUserId, teamId])

  useEffect(() => {
    loadSprints()
  }, [loadSprints])

  useEffect(() => {
    if (activeTab === 'backlog') loadBacklog()
  }, [activeTab, loadBacklog])

  const activeSprint = sprints.find(s => s.status === 'active') || null
  const planningSprints = sprints.filter(s => s.status === 'planning')
  const historySprints = sprints.filter(s => s.status === 'completed' || s.status === 'cancelled')

  const handleStartSprint = async (sprint: Sprint) => {
    if (activeSprint) {
      showToast?.('Ya hay un sprint activo. Completalo primero.', 'error')
      return
    }
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('sprints')
      .update({ status: 'active', start_date: sprint.start_date || now, updated_at: now })
      .eq('id', sprint.id)

    if (error) { showToast?.('Error al iniciar sprint', 'error'); return }

    logSprintStarted(sprint.id, sprint.name, teamId, currentUserId, userEmail)
    showToast?.(`Sprint "${sprint.name}" iniciado`, 'success')

    if (teamId) {
      const { data: members } = await supabase
        .from('team_members').select('user_id').eq('team_id', teamId)
      if (members) {
        const ids = members.map((m: any) => m.user_id).filter((id: string) => id !== currentUserId)
        if (ids.length) notifySprintStarted(ids, sprint.name, userEmail || 'Alguien', sprint.id)
      }
    }
    loadSprints()
  }

  const handleCompleteSprint = async (sprint: Sprint) => {
    const { error } = await supabase
      .from('sprints')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', sprint.id)

    if (error) { showToast?.('Error al completar sprint', 'error'); return }

    logSprintCompleted(sprint.id, sprint.name, teamId, currentUserId, userEmail)
    showToast?.(`Sprint "${sprint.name}" completado`, 'success')
    loadSprints()
  }

  const handleDeleteSprint = async () => {
    if (!deletingSprint) return
    const { error } = await supabase.from('sprints').delete().eq('id', deletingSprint.id)
    setDeletingSprint(null)
    if (error) { showToast?.('Error al eliminar sprint', 'error'); return }
    logSprintDeleted(deletingSprint.id, deletingSprint.name, teamId, currentUserId, userEmail)
    showToast?.('Sprint eliminado', 'success')
    loadSprints()
  }

  const handleAddToSprint = async (task: Task) => {
    if (!activeSprint) return
    const { error } = await supabase
      .from('tasks')
      .update({ sprint_id: activeSprint.id, updated_at: new Date().toISOString() })
      .eq('id', task.id)

    if (error) { showToast?.('Error al agregar tarea', 'error'); return }

    logTaskAddedToSprint(task.id, task.title, activeSprint.name, teamId, currentUserId, userEmail)
    if (task.assigned_to && task.assigned_to !== currentUserId) {
      notifyTaskAddedToSprint(task.assigned_to, task.title, activeSprint.name, task.id)
    }
    showToast?.('Tarea agregada al sprint', 'success')
    loadBacklog()
    loadSprints()
  }

  const handleRemoveFromSprint = async (task: Task, sprint: Sprint) => {
    const { error } = await supabase
      .from('tasks')
      .update({ sprint_id: null, updated_at: new Date().toISOString() })
      .eq('id', task.id)

    if (error) { showToast?.('Error al quitar tarea', 'error'); return }

    logTaskRemovedFromSprint(task.id, task.title, sprint.name, teamId, currentUserId, userEmail)
    showToast?.('Tarea movida al backlog', 'success')
    loadSprints()
    if (activeTab === 'backlog') loadBacklog()
  }

  const getPriorityColor = (p: string | null) => {
    if (p === 'high') return 'text-red-500'
    if (p === 'medium') return 'text-yellow-500'
    if (p === 'low') return 'text-green-500'
    return 'text-neutral-400'
  }

  // Sprint progress
  const getSprintProgress = (sprintId: string) => {
    const tasks = sprintTasks[sprintId] || []
    const total = tasks.reduce((s, t) => s + (t.story_points || 0), 0)
    const done = tasks
      .filter(t => t.task_statuses?.category === 'completed')
      .reduce((s, t) => s + (t.story_points || 0), 0)
    return { total, done, taskCount: tasks.length, doneCount: tasks.filter(t => t.task_statuses?.category === 'completed').length }
  }

  // ─── Sprint Card ────────────────────────────────────────────────────────────
  const renderSprintCard = (sprint: Sprint, isActive = false) => {
    const { total, done, taskCount, doneCount } = getSprintProgress(sprint.id)
    const progress = total > 0 ? Math.round((done / total) * 100) : (taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0)
    const tasks = sprintTasks[sprint.id] || []

    return (
      <div
        key={sprint.id}
        className={`rounded-2xl border transition-all ${
          isActive
            ? 'border-yellow-400/50 bg-yellow-50 dark:bg-yellow-400/5 shadow-lg shadow-yellow-400/10'
            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
        }`}
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {isActive && <span className="flex items-center gap-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400"><span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />Activo</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[sprint.status]}`}>
                  {STATUS_LABELS[sprint.status]}
                </span>
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-1 truncate">{sprint.name}</h3>
              {sprint.goal && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">{sprint.goal}</p>
              )}
              {(sprint.start_date || sprint.end_date) && (
                <div className="flex items-center gap-1 mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(sprint.start_date)} → {formatDate(sprint.end_date)}</span>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {sprint.status === 'planning' && canManageSprints && (
                <button
                  onClick={() => handleStartSprint(sprint)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-400 transition-colors"
                >
                  <Play className="w-3 h-3" />
                  Iniciar
                </button>
              )}
              {sprint.status === 'active' && canManageSprints && (
                <button
                  onClick={() => handleCompleteSprint(sprint)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-700 text-white text-xs font-semibold rounded-lg hover:bg-neutral-600 transition-colors"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Completar
                </button>
              )}
              {canManageSprints && sprint.status !== 'active' && (
                <>
                  <button
                    onClick={() => { setEditingSprint(sprint); setShowCreateModal(true) }}
                    className="p-1.5 text-neutral-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-400/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingSprint(sprint)}
                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {canManageSprints && sprint.status === 'active' && (
                <button
                  onClick={() => { setEditingSprint(sprint); setShowCreateModal(true) }}
                  className="p-1.5 text-neutral-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-400/10 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              <span>{doneCount}/{taskCount} tareas</span>
              {total > 0 && <span className="font-medium">{done}/{total} pts</span>}
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tasks (only active/planning sprints) */}
        {(isActive || sprint.status === 'planning') && tasks.length > 0 && (
          <div className="border-t border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-100 dark:divide-neutral-700/50">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 group">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onOpenTask?.(task)}
                >
                  <p className={`text-sm truncate ${task.task_statuses?.category === 'completed' ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-white'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.task_statuses && (
                      <span className="text-xs text-neutral-400" style={{ color: task.task_statuses.color }}>{task.task_statuses.name}</span>
                    )}
                    {task.story_points && (
                      <span className="flex items-center gap-0.5 text-xs text-neutral-400">
                        <Hash className="w-3 h-3" />{task.story_points}
                      </span>
                    )}
                    {task.priority && (
                      <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFromSprint(task, sprint)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-all rounded"
                  title="Quitar del sprint"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            ))}
          </div>
        )}

        {(isActive || sprint.status === 'planning') && tasks.length === 0 && (
          <div className="px-4 pb-4 pt-1 text-xs text-neutral-400 dark:text-neutral-500 italic">
            Sin tareas — agregalas desde el Backlog
          </div>
        )}
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col h-full ${isMobile ? '' : ''}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${isMobile ? 'px-4 pt-4 pb-3' : 'px-6 pt-6 pb-4'}`}>
        <div className="flex items-center gap-3">
          <Timer className="w-6 h-6 text-yellow-400" />
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Sprints</h1>
        </div>
        {canManageSprints && (
          <button
            onClick={() => { setEditingSprint(null); setShowCreateModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-neutral-900 rounded-xl font-semibold text-sm hover:bg-yellow-300 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {!isMobile && 'Nuevo sprint'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 ${isMobile ? 'px-4' : 'px-6'} mb-4`}>
        {(['sprints', 'backlog'] as SprintTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-yellow-400 text-neutral-900'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
            }`}
          >
            {tab === 'sprints' ? 'Sprints' : 'Backlog'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-4 pb-6' : 'px-6 pb-6'}`}>

        {/* ── Tab Sprints ── */}
        {activeTab === 'sprints' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <LoadingZapIcon size={32} />
              </div>
            ) : sprints.filter(s => s.status !== 'completed' && s.status !== 'cancelled').length === 0 && historySprints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Timer className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mb-4" />
                <p className="text-neutral-500 dark:text-neutral-400 font-medium">No hay sprints aún</p>
                {canManageSprints && (
                  <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                    Crea tu primer sprint para comenzar
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Sprint activo */}
                {activeSprint && renderSprintCard(activeSprint, true)}

                {/* Sprints en planificación */}
                {planningSprints.length > 0 && (
                  <div className="space-y-3">
                    {planningSprints.length > 0 && (
                      <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        Planificando
                      </p>
                    )}
                    {planningSprints.map(s => renderSprintCard(s))}
                  </div>
                )}

                {/* Historial */}
                {historySprints.length > 0 && (
                  <div>
                    <button
                      onClick={() => setHistoryCollapsed(!historyCollapsed)}
                      className="flex items-center gap-2 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors mb-3"
                    >
                      {historyCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      Historial ({historySprints.length})
                    </button>
                    {!historyCollapsed && (
                      <div className="space-y-3">
                        {historySprints.map(s => (
                          <div key={s.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>
                                    {STATUS_LABELS[s.status]}
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-1">{s.name}</p>
                                {(s.start_date || s.end_date) && (
                                  <p className="text-xs text-neutral-400 mt-0.5">{formatDate(s.start_date)} → {formatDate(s.end_date)}</p>
                                )}
                              </div>
                              {canManageSprints && (
                                <button
                                  onClick={() => setDeletingSprint(s)}
                                  className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-400/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Tab Backlog ── */}
        {activeTab === 'backlog' && (
          <div>
            {!activeSprint && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/30 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  No hay sprint activo. Inicia uno para mover tareas al sprint.
                </p>
              </div>
            )}

            {backlogLoading ? (
              <div className="flex items-center justify-center py-16">
                <LoadingZapIcon size={32} />
              </div>
            ) : backlogTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mb-4" />
                <p className="text-neutral-500 dark:text-neutral-400 font-medium">Backlog vacío</p>
                <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                  Todas las tareas están en un sprint
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">
                  {backlogTasks.length} tarea{backlogTasks.length !== 1 ? 's' : ''} sin sprint
                </p>
                {backlogTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 group transition-all"
                  >
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpenTask?.(task)}>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {task.task_statuses && (
                          <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${task.task_statuses.color}20`, color: task.task_statuses.color }}>
                            {task.task_statuses.name}
                          </span>
                        )}
                        {task.priority && (
                          <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority === 'high' ? '↑ Alta' : task.priority === 'medium' ? '→ Media' : '↓ Baja'}
                          </span>
                        )}
                        {task.story_points && (
                          <span className="flex items-center gap-0.5 text-xs text-neutral-400">
                            <Hash className="w-3 h-3" />{task.story_points}pts
                          </span>
                        )}
                        {task.due_date && (
                          <span className="flex items-center gap-0.5 text-xs text-neutral-400">
                            <Clock className="w-3 h-3" />
                            {new Date(task.due_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddToSprint(task)}
                      disabled={!activeSprint}
                      title={activeSprint ? `Agregar a "${activeSprint.name}"` : 'Inicia un sprint primero'}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-yellow-50 dark:bg-yellow-400/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-400/20 border border-yellow-200 dark:border-yellow-400/20 flex-shrink-0"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Al sprint</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreateSprint
          currentUserId={currentUserId}
          teamId={teamId}
          userEmail={userEmail}
          editingSprint={editingSprint}
          onClose={() => { setShowCreateModal(false); setEditingSprint(null) }}
          onSaved={() => { setShowCreateModal(false); setEditingSprint(null); loadSprints() }}
          showToast={showToast}
        />
      )}

      {/* Delete Confirm */}
      {deletingSprint && (
        <ConfirmDialog
          title="Eliminar sprint"
          message={`¿Eliminar "${deletingSprint.name}"? Las tareas volverán al backlog.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          type="danger"
          onConfirm={handleDeleteSprint}
          onCancel={() => setDeletingSprint(null)}
        />
      )}
    </div>
  )
}

export default SprintsView
