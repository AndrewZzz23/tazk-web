import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Task, TaskStatus } from './types/database.types'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { LoadingZapIcon, ChartIcon, XIcon } from './components/iu/AnimatedIcons'

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
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date) return false
    return new Date(t.due_date) < new Date() && t.task_statuses?.category !== 'completed'
  }).length

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Datos para gráfico de torta (por estado)
  const statusData = statuses.map(status => ({
    name: status.name,
    value: tasks.filter(t => t.status_id === status.id).length,
    color: status.color
  })).filter(s => s.value > 0)

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
        className={`bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto transform transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-700 sticky top-0 bg-white dark:bg-neutral-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-yellow-400"><ChartIcon size={24} /></span> Métricas
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <XIcon size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingZapIcon size={48} />
          </div>
        ) : (
          <div className="p-6">
           {/* Cards de resumen */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {/* Total */}
              <div className="bg-gray-100 dark:bg-neutral-700/50 rounded-xl p-4 border border-gray-300 dark:border-neutral-600">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalTasks}</div>
                <div className="text-gray-500 dark:text-neutral-400 text-sm mt-1">Total</div>
              </div>

              {/* Sin iniciar */}
              <div className="bg-neutral-500/10 rounded-xl p-4 border border-neutral-500/30">
                <div className="text-3xl font-bold text-gray-600 dark:text-neutral-300">{notStartedTasks}</div>
                <div className="text-gray-500 dark:text-neutral-400 text-sm mt-1">⏸️ Sin iniciar</div>
              </div>

              {/* En progreso */}
              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
                <div className="text-3xl font-bold text-blue-400">{inProgressTasks}</div>
                <div className="text-blue-400/70 text-sm mt-1">▶️ En progreso</div>
              </div>

              {/* Completadas */}
              <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                <div className="text-3xl font-bold text-green-400">{completedTasks}</div>
                <div className="text-green-400/70 text-sm mt-1">✅ Completadas</div>
              </div>

              {/* Vencidas */}
              <div className={`rounded-xl p-4 border ${
                overdueTasks > 0 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : 'bg-gray-100 dark:bg-neutral-700/50 border-gray-300 dark:border-neutral-600'
              }`}>
                <div className={`text-3xl font-bold ${overdueTasks > 0 ? 'text-red-400' : 'text-gray-500 dark:text-neutral-400'}`}>
                  {overdueTasks}
                </div>
                <div className={`text-sm mt-1 ${overdueTasks > 0 ? 'text-red-400/70' : 'text-gray-500 dark:text-neutral-400'}`}>
                  ⚠️ Vencidas
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
            <div className="grid md:grid-cols-2 gap-6">
              {/* Por estado */}
              <div className="bg-gray-100 dark:bg-neutral-700/30 rounded-xl p-4 border border-gray-300 dark:border-neutral-600">
                <h3 className="text-gray-900 dark:text-white font-semibold mb-4 flex items-center gap-2">
                  <span>🎯</span> Por estado
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

              {/* Por usuario */}
              <div className="bg-gray-100 dark:bg-neutral-700/30 rounded-xl p-4 border border-gray-300 dark:border-neutral-600">
                <h3 className="text-gray-900 dark:text-white font-semibold mb-4 flex items-center gap-2">
                  <span>👥</span> Por asignado
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
            </div>

            {/* Sin tareas */}
            {totalTasks === 0 && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📭</div>
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