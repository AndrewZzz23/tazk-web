import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Task, TaskStatus } from './types/database.types'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { LoadingZapIcon, ChartIcon, XIcon, ListIcon, CheckIcon, ClipboardIcon, UsersIcon } from './components/iu/AnimatedIcons'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import { TrendingUp, TrendingDown, Clock, AlertTriangle, Calendar, Target, Zap, BarChart3 } from 'lucide-react'

interface MetricsProps {
  currentUserId: string
  teamId: string | null
  onClose: () => void
}

// Categorías con colores
const CATEGORY_COLORS = {
  not_started: { bg: 'bg-neutral-500/20', text: 'text-neutral-400', border: 'border-neutral-500/30' },
  in_progress: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  unknown: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' }
}

function Metrics({ currentUserId, teamId, onClose }: MetricsProps) {
  const isMobile = useIsMobile()
  const [tasks, setTasks] = useState<Task[]>([])
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'resumen' | 'estados' | 'tiempo' | 'equipo'>('resumen')

  // ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)

    // Cargar tareas
    let taskQuery = supabase
      .from('tasks')
      .select(`
        *,
        task_statuses (*),
        assigned_user:profiles!tasks_assigned_to_fkey (*)
      `)

    if (teamId) {
      taskQuery = taskQuery.eq('team_id', teamId)
    } else {
      taskQuery = taskQuery.is('team_id', null).eq('created_by', currentUserId)
    }

    const { data: taskData } = await taskQuery
    if (taskData) setTasks(taskData)

    // Cargar TODOS los estados (activos e inactivos) para poder mostrar info de tareas con estados viejos
    let statusQuery = supabase
      .from('task_statuses')
      .select('*')
      .order('order_position')

    if (teamId) {
      statusQuery = statusQuery.eq('team_id', teamId)
    } else {
      statusQuery = statusQuery.is('team_id', null)
    }

    const { data: statusData } = await statusQuery
    if (statusData) setStatuses(statusData)

    setLoading(false)
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  // Swipe to close gesture
  const { dragStyle, isDragging, containerProps } = useBottomSheetGesture({
    onClose: handleClose
  })

  // Bloquear scroll del body cuando el bottom sheet está abierto (móvil)
  useBodyScrollLock(isMobile && isVisible)

  // Helper para obtener la categoría de una tarea (manejando estados nulos/eliminados)
  const getTaskCategory = (task: Task): 'not_started' | 'in_progress' | 'completed' | 'unknown' => {
    if (task.task_statuses?.category) {
      return task.task_statuses.category as 'not_started' | 'in_progress' | 'completed'
    }
    // Si no tiene status asociado, buscar en la lista de estados
    if (task.status_id) {
      const status = statuses.find(s => s.id === task.status_id)
      if (status?.category) {
        return status.category as 'not_started' | 'in_progress' | 'completed'
      }
    }
    return 'unknown' // Estado eliminado o no encontrado
  }

  // Calcular métricas usando la función helper
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => getTaskCategory(t) === 'completed').length
  const inProgressTasks = tasks.filter(t => getTaskCategory(t) === 'in_progress').length
  const notStartedTasks = tasks.filter(t => getTaskCategory(t) === 'not_started').length
  const unknownStatusTasks = tasks.filter(t => getTaskCategory(t) === 'unknown').length

  const now = new Date()
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date) return false
    return new Date(t.due_date) < now && getTaskCategory(t) !== 'completed'
  }).length

  // Tareas próximas a vencer (próximos 7 días)
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcomingTasks = tasks.filter(t => {
    if (!t.due_date || getTaskCategory(t) === 'completed') return false
    const dueDate = new Date(t.due_date)
    return dueDate >= now && dueDate <= nextWeek
  }).length

  // Tareas de hoy
  const todayTasks = tasks.filter(t => {
    if (!t.due_date) return false
    const dueDate = new Date(t.due_date)
    return dueDate.toDateString() === now.toDateString() && getTaskCategory(t) !== 'completed'
  }).length

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Datos para gráfico de torta (por estado activo)
  const activeStatuses = statuses.filter(s => s.is_active)
  const statusData = activeStatuses.map(status => ({
    name: status.name,
    value: tasks.filter(t => t.status_id === status.id).length,
    color: status.color
  })).filter(s => s.value > 0)

  // Agregar categoría de "Sin estado" si hay tareas con estados eliminados
  if (unknownStatusTasks > 0) {
    statusData.push({
      name: 'Sin estado válido',
      value: unknownStatusTasks,
      color: '#f97316' // orange
    })
  }

  // Tareas creadas por semana (últimas 4 semanas)
  const weeksData = Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7)
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() - i * 7)

    const count = tasks.filter(t => {
      const created = new Date(t.created_at)
      return created >= weekStart && created < weekEnd
    }).length

    const label = i === 0 ? 'Esta sem' : i === 1 ? 'Anterior' : `Hace ${i + 1}`
    return { name: label, tareas: count }
  }).reverse()

  // Calcular tendencia
  const thisWeekTasks = weeksData[weeksData.length - 1]?.tareas || 0
  const lastWeekTasks = weeksData[weeksData.length - 2]?.tareas || 0
  const trend = lastWeekTasks > 0 ? Math.round(((thisWeekTasks - lastWeekTasks) / lastWeekTasks) * 100) : 0

  // Datos para gráfico de barras (por usuario)
  const userTaskCounts: { [key: string]: { name: string; count: number; completed: number } } = {}
  tasks.forEach(task => {
    if (task.assigned_user) {
      const name = task.assigned_user.full_name || task.assigned_user.email || 'Sin nombre'
      if (!userTaskCounts[name]) {
        userTaskCounts[name] = { name, count: 0, completed: 0 }
      }
      userTaskCounts[name].count++
      if (getTaskCategory(task) === 'completed') {
        userTaskCounts[name].completed++
      }
    }
  })
  const userData = Object.values(userTaskCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Tareas sin asignar
  const unassignedTasks = tasks.filter(t => !t.assigned_to).length

  // Prioridad alta
  const highPriorityTasks = tasks.filter(t => t.priority === 'high' && getTaskCategory(t) !== 'completed').length

  // Contenido de tabs para móvil
  const renderMobileContent = () => {
    switch (activeTab) {
      case 'resumen':
        return (
          <div className="space-y-4">
            {/* Progress ring */}
            <div className="bg-neutral-800/50 rounded-2xl p-6 flex items-center gap-6">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#404040"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#facc15"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${completionRate * 2.51} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{completionRate}%</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Progreso general</h3>
                <p className="text-neutral-400 text-sm">{completedTasks} de {totalTasks} completadas</p>
                {trend !== 0 && (
                  <div className={`flex items-center gap-1 mt-2 text-sm ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{Math.abs(trend)}% vs semana anterior</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-xl p-4 ${CATEGORY_COLORS.not_started.bg} border ${CATEGORY_COLORS.not_started.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-600/50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-neutral-400" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">{notStartedTasks}</div>
                <div className="text-neutral-400 text-xs">Sin iniciar</div>
              </div>

              <div className={`rounded-xl p-4 ${CATEGORY_COLORS.in_progress.bg} border ${CATEGORY_COLORS.in_progress.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/30 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-400">{inProgressTasks}</div>
                <div className="text-blue-400/70 text-xs">En progreso</div>
              </div>

              <div className={`rounded-xl p-4 ${CATEGORY_COLORS.completed.bg} border ${CATEGORY_COLORS.completed.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/30 flex items-center justify-center">
                    <CheckIcon size={16} className="text-emerald-400" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-400">{completedTasks}</div>
                <div className="text-emerald-400/70 text-xs">Completadas</div>
              </div>

              <div className={`rounded-xl p-4 ${overdueTasks > 0 ? 'bg-red-500/20 border-red-500/30' : 'bg-neutral-700/30 border-neutral-600/30'} border`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${overdueTasks > 0 ? 'bg-red-500/30' : 'bg-neutral-600/30'}`}>
                    <AlertTriangle className={`w-4 h-4 ${overdueTasks > 0 ? 'text-red-400' : 'text-neutral-500'}`} />
                  </div>
                </div>
                <div className={`text-2xl font-bold ${overdueTasks > 0 ? 'text-red-400' : 'text-neutral-500'}`}>{overdueTasks}</div>
                <div className={`text-xs ${overdueTasks > 0 ? 'text-red-400/70' : 'text-neutral-500'}`}>Vencidas</div>
              </div>
            </div>

            {/* Alertas */}
            {(todayTasks > 0 || upcomingTasks > 0 || highPriorityTasks > 0 || unknownStatusTasks > 0) && (
              <div className="space-y-2">
                <h4 className="text-white font-medium text-sm px-1">Atención</h4>
                {todayTasks > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{todayTasks} tarea{todayTasks > 1 ? 's' : ''} para hoy</p>
                      <p className="text-amber-400/70 text-xs">Vencen hoy</p>
                    </div>
                  </div>
                )}
                {upcomingTasks > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{upcomingTasks} próximas a vencer</p>
                      <p className="text-yellow-400/70 text-xs">En los próximos 7 días</p>
                    </div>
                  </div>
                )}
                {highPriorityTasks > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{highPriorityTasks} de alta prioridad</p>
                      <p className="text-red-400/70 text-xs">Pendientes de completar</p>
                    </div>
                  </div>
                )}
                {unknownStatusTasks > 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{unknownStatusTasks} sin estado válido</p>
                      <p className="text-orange-400/70 text-xs">El estado fue eliminado</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'estados':
        return (
          <div className="space-y-4">
            {statusData.length > 0 ? (
              <>
                <div className="bg-neutral-800/50 rounded-2xl p-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#262626',
                          border: '1px solid #404040',
                          borderRadius: '12px',
                          color: '#fff'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Lista de estados */}
                <div className="space-y-2">
                  {statusData.map((status, i) => (
                    <div key={i} className="bg-neutral-800/50 rounded-xl p-3 flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: status.color + '30' }}
                      >
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: status.color }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{status.name}</p>
                        <p className="text-neutral-500 text-xs">{status.value} tarea{status.value !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-bold">
                          {totalTasks > 0 ? Math.round((status.value / totalTasks) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                  <ClipboardIcon size={32} className="text-neutral-600" />
                </div>
                <p className="text-neutral-400">No hay datos de estados</p>
              </div>
            )}
          </div>
        )

      case 'tiempo':
        return (
          <div className="space-y-4">
            <div className="bg-neutral-800/50 rounded-2xl p-4">
              <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-yellow-400" />
                Actividad semanal
              </h4>
              {weeksData.some(w => w.tareas > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeksData}>
                    <XAxis dataKey="name" stroke="#737373" fontSize={11} />
                    <YAxis stroke="#737373" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#262626',
                        border: '1px solid #404040',
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="tareas" fill="#facc15" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-neutral-500">Sin actividad reciente</p>
                </div>
              )}
            </div>

            {/* Stats de tiempo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-800/50 rounded-xl p-4">
                <p className="text-neutral-400 text-xs mb-1">Esta semana</p>
                <p className="text-2xl font-bold text-white">{thisWeekTasks}</p>
                <p className="text-neutral-500 text-xs">tareas creadas</p>
              </div>
              <div className="bg-neutral-800/50 rounded-xl p-4">
                <p className="text-neutral-400 text-xs mb-1">Promedio</p>
                <p className="text-2xl font-bold text-white">
                  {Math.round(weeksData.reduce((a, b) => a + b.tareas, 0) / 4)}
                </p>
                <p className="text-neutral-500 text-xs">por semana</p>
              </div>
            </div>
          </div>
        )

      case 'equipo':
        return (
          <div className="space-y-4">
            {userData.length > 0 ? (
              <>
                <div className="bg-neutral-800/50 rounded-2xl p-4">
                  <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <UsersIcon size={16} className="text-yellow-400" />
                    Tareas por miembro
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={userData} layout="vertical">
                      <XAxis type="number" stroke="#737373" fontSize={12} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#737373"
                        fontSize={11}
                        width={80}
                        tickFormatter={(value) => value.length > 10 ? value.slice(0, 10) + '...' : value}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#262626',
                          border: '1px solid #404040',
                          borderRadius: '12px',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="count" fill="#facc15" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Lista de miembros */}
                <div className="space-y-2">
                  {userData.map((user, i) => (
                    <div key={i} className="bg-neutral-800/50 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-neutral-900 font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{user.name}</p>
                        <p className="text-neutral-500 text-xs">{user.completed} completadas de {user.count}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">{user.count > 0 ? Math.round((user.completed / user.count) * 100) : 0}%</div>
                      </div>
                    </div>
                  ))}
                </div>

                {unassignedTasks > 0 && (
                  <div className="bg-neutral-700/30 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-600 flex items-center justify-center">
                      <span className="text-neutral-400">?</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-neutral-300 font-medium text-sm">Sin asignar</p>
                      <p className="text-neutral-500 text-xs">{unassignedTasks} tarea{unassignedTasks !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                  <UsersIcon size={32} className="text-neutral-600" />
                </div>
                <p className="text-neutral-400">Sin asignaciones</p>
              </div>
            )}
          </div>
        )
    }
  }

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <>
        <div
          className={`fixed inset-0 z-50 transition-all duration-200 ${
            isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
          }`}
          onClick={handleClose}
        />
        <div
          className={`fixed bottom-0 left-0 right-0 top-8 z-50 bg-neutral-900 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col safe-area-bottom ${
            isVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{
            ...dragStyle,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
          {...containerProps}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="w-10 h-1 bg-neutral-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-neutral-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400"><ChartIcon size={24} /></span>
              <div>
                <h2 className="text-lg font-bold text-white">Métricas</h2>
                <p className="text-xs text-neutral-500">{totalTasks} tareas · {completionRate}% completado</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-neutral-800"
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 px-4 py-3 border-b border-neutral-800 overflow-x-auto flex-shrink-0">
            {[
              { id: 'resumen' as const, label: 'Resumen', icon: <Target className="w-4 h-4" /> },
              { id: 'estados' as const, label: 'Estados', icon: <ClipboardIcon size={16} /> },
              { id: 'tiempo' as const, label: 'Tiempo', icon: <BarChart3 className="w-4 h-4" /> },
              ...(teamId ? [{ id: 'equipo' as const, label: 'Equipo', icon: <UsersIcon size={16} /> }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-yellow-400 text-neutral-900'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {tab.icon}
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <LoadingZapIcon size={48} />
              </div>
            ) : totalTasks === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                  <ClipboardIcon size={40} className="text-neutral-600" />
                </div>
                <p className="text-neutral-400 text-center">No hay tareas para mostrar métricas</p>
              </div>
            ) : (
              renderMobileContent()
            )}
          </div>
        </div>
      </>
    )
  }

  // Desktop: Modal centrado
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto transform transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-neutral-700 sticky top-0 bg-white dark:bg-neutral-800 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-yellow-500">
                <ChartIcon size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Métricas</h2>
                <p className="text-xs text-gray-500 dark:text-neutral-500">{totalTasks} tareas · {completionRate}% completado</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
              <XIcon size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingZapIcon size={48} />
          </div>
        ) : (
          <div className="p-6">
            {/* Cards de resumen */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
              {/* Total */}
              <div className="bg-gray-100 dark:bg-neutral-700/50 rounded-xl p-4 border border-gray-300 dark:border-neutral-600">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-gray-400 dark:text-neutral-500">
                    <ListIcon size={18} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalTasks}</div>
                <div className="text-gray-500 dark:text-neutral-400 text-xs mt-1">Total</div>
              </div>

              {/* Sin iniciar */}
              <div className="bg-neutral-500/10 rounded-xl p-4 border border-neutral-500/30">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-[18px] h-[18px] text-gray-400" />
                </div>
                <div className="text-2xl font-bold text-gray-600 dark:text-neutral-300">{notStartedTasks}</div>
                <div className="text-gray-500 dark:text-neutral-400 text-xs mt-1">Sin iniciar</div>
              </div>

              {/* En progreso */}
              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
                <div className="flex items-center justify-between mb-2">
                  <Zap className="w-[18px] h-[18px] text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-blue-400">{inProgressTasks}</div>
                <div className="text-blue-400/70 text-xs mt-1">En progreso</div>
              </div>

              {/* Completadas */}
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-emerald-400">
                    <CheckIcon size={18} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-400">{completedTasks}</div>
                <div className="text-emerald-400/70 text-xs mt-1">Completadas</div>
              </div>

              {/* Próximas */}
              <div className={`rounded-xl p-4 border ${
                upcomingTasks > 0
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-gray-100 dark:bg-neutral-700/50 border-gray-300 dark:border-neutral-600'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <Calendar className={`w-[18px] h-[18px] ${upcomingTasks > 0 ? 'text-amber-400' : 'text-gray-400 dark:text-neutral-500'}`} />
                </div>
                <div className={`text-2xl font-bold ${upcomingTasks > 0 ? 'text-amber-400' : 'text-gray-500 dark:text-neutral-400'}`}>
                  {upcomingTasks}
                </div>
                <div className={`text-xs mt-1 ${upcomingTasks > 0 ? 'text-amber-400/70' : 'text-gray-500 dark:text-neutral-400'}`}>
                  Próx. 7 días
                </div>
              </div>

              {/* Vencidas */}
              <div className={`rounded-xl p-4 border ${
                overdueTasks > 0
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-gray-100 dark:bg-neutral-700/50 border-gray-300 dark:border-neutral-600'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className={`w-[18px] h-[18px] ${overdueTasks > 0 ? 'text-red-400' : 'text-gray-400 dark:text-neutral-500'}`} />
                </div>
                <div className={`text-2xl font-bold ${overdueTasks > 0 ? 'text-red-400' : 'text-gray-500 dark:text-neutral-400'}`}>
                  {overdueTasks}
                </div>
                <div className={`text-xs mt-1 ${overdueTasks > 0 ? 'text-red-400/70' : 'text-gray-500 dark:text-neutral-400'}`}>
                  Vencidas
                </div>
              </div>
            </div>

            {/* Alerta de estados sin válido */}
            {unknownStatusTasks > 0 && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div>
                  <p className="text-orange-400 font-medium">
                    {unknownStatusTasks} tarea{unknownStatusTasks > 1 ? 's tienen' : ' tiene'} un estado que ya no existe
                  </p>
                  <p className="text-orange-400/70 text-sm">Considera asignarles un nuevo estado desde la vista de tareas</p>
                </div>
              </div>
            )}

            {/* Barra de progreso */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-neutral-300 text-sm font-medium">Progreso general</span>
                <div className="flex items-center gap-2">
                  {trend !== 0 && (
                    <span className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {Math.abs(trend)}%
                    </span>
                  )}
                  <span className="text-yellow-400 font-bold">{completionRate}%</span>
                </div>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            {/* Gráficos */}
            <div className={`grid gap-6 ${teamId ? 'md:grid-cols-2' : 'md:grid-cols-2'}`}>
              {/* Por estado */}
              <div className="bg-gray-100 dark:bg-neutral-700/30 rounded-xl p-4 border border-gray-300 dark:border-neutral-600">
                <h3 className="text-gray-900 dark:text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-yellow-500"><ClipboardIcon size={18} /></span> Por estado
                </h3>
                {statusData.length > 0 ? (
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#262626',
                            border: '1px solid #404040',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-gray-400 dark:text-neutral-500 text-center py-8">
                    Sin datos
                  </div>
                )}
                {/* Leyenda */}
                <div className="flex flex-wrap gap-3 mt-4 justify-center">
                  {statusData.map((status, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-gray-600 dark:text-neutral-300">{status.name}</span>
                      <span className="text-gray-400 dark:text-neutral-500">({status.value})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tendencia semanal */}
              <div className="bg-gray-100 dark:bg-neutral-700/30 rounded-xl p-4 border border-gray-300 dark:border-neutral-600">
                <h3 className="text-gray-900 dark:text-white font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-[18px] h-[18px] text-yellow-500" />
                  Actividad semanal
                </h3>
                {weeksData.some(w => w.tareas > 0) ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weeksData}>
                      <XAxis dataKey="name" stroke="#737373" fontSize={11} />
                      <YAxis stroke="#737373" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#262626',
                          border: '1px solid #404040',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="tareas" fill="#facc15" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-400 dark:text-neutral-500 text-center py-8">
                    Sin actividad reciente
                  </div>
                )}
              </div>

              {/* Por usuario - SOLO si hay equipo */}
              {teamId && (
                <div className="bg-gray-100 dark:bg-neutral-700/30 rounded-xl p-4 border border-gray-300 dark:border-neutral-600 md:col-span-2">
                  <h3 className="text-gray-900 dark:text-white font-semibold mb-4 flex items-center gap-2">
                    <span className="text-yellow-500"><UsersIcon size={18} /></span> Por asignado
                  </h3>
                  {userData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={userData} layout="vertical">
                        <XAxis type="number" stroke="#737373" fontSize={12} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="#737373"
                          fontSize={12}
                          width={100}
                          tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + '...' : value}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#262626',
                            border: '1px solid #404040',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                        <Bar dataKey="count" fill="#facc15" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-gray-400 dark:text-neutral-500 text-center py-8">
                      Sin asignaciones
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sin tareas */}
            {totalTasks === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-300 dark:text-neutral-600 mb-4 flex justify-center">
                  <ClipboardIcon size={64} />
                </div>
                <p className="text-gray-500 dark:text-neutral-400">No hay tareas para mostrar métricas</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Metrics
