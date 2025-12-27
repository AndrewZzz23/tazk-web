import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Task, TaskStatus } from './types/database.types'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { LoadingZapIcon, ChartIcon, XIcon, ListIcon, CheckIcon, ClipboardIcon, UsersIcon } from './components/iu/AnimatedIcons'

interface MetricsProps {
  currentUserId: string
  teamId: string | null
  onClose: () => void
}

function Metrics({ currentUserId, teamId, onClose }: MetricsProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)

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

    setLoading(false)
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  // Calcular métricas usando categorías
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.task_statuses?.category === 'completed').length
  const inProgressTasks = tasks.filter(t => t.task_statuses?.category === 'in_progress').length
  const notStartedTasks = tasks.filter(t => t.task_statuses?.category === 'not_started').length
  const now = new Date()
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date) return false
    return new Date(t.due_date) < now && t.task_statuses?.category !== 'completed'
  }).length

  // Tareas próximas a vencer (próximos 7 días)
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcomingTasks = tasks.filter(t => {
    if (!t.due_date || t.task_statuses?.category === 'completed') return false
    const dueDate = new Date(t.due_date)
    return dueDate >= now && dueDate <= nextWeek
  }).length

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Datos para gráfico de torta (por estado)
  const statusData = statuses.map(status => ({
    name: status.name,
    value: tasks.filter(t => t.status_id === status.id).length,
    color: status.color
  })).filter(s => s.value > 0)

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

    const label = i === 0 ? 'Esta sem' : i === 1 ? 'Sem pasada' : `Hace ${i + 1} sem`
    return { name: label, tareas: count }
  }).reverse()

  // Datos para gráfico de barras (por usuario)
  const userTaskCounts: { [key: string]: { name: string; count: number } } = {}
  tasks.forEach(task => {
    if (task.assigned_user) {
      const name = task.assigned_user.full_name || task.assigned_user.email || 'Sin nombre'
      if (!userTaskCounts[name]) {
        userTaskCounts[name] = { name, count: 0 }
      }
      userTaskCounts[name].count++
    }
  })
  const userData = Object.values(userTaskCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

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
                  <svg className="w-[18px] h-[18px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth={2} />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-gray-600 dark:text-neutral-300">{notStartedTasks}</div>
                <div className="text-gray-500 dark:text-neutral-400 text-xs mt-1">Sin iniciar</div>
              </div>

              {/* En progreso */}
              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-[18px] h-[18px] text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
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
                  <svg className={`w-[18px] h-[18px] ${upcomingTasks > 0 ? 'text-amber-400' : 'text-gray-400 dark:text-neutral-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
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
                  <svg className={`w-[18px] h-[18px] ${overdueTasks > 0 ? 'text-red-400' : 'text-gray-400 dark:text-neutral-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className={`text-2xl font-bold ${overdueTasks > 0 ? 'text-red-400' : 'text-gray-500 dark:text-neutral-400'}`}>
                  {overdueTasks}
                </div>
                <div className={`text-xs mt-1 ${overdueTasks > 0 ? 'text-red-400/70' : 'text-gray-500 dark:text-neutral-400'}`}>
                  Vencidas
                </div>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-neutral-300 text-sm font-medium">Progreso general</span>
                <span className="text-yellow-400 font-bold">{completionRate}%</span>
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
                  <svg className="w-[18px] h-[18px] text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
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