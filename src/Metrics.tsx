import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface MetricsProps {
  currentUserId: string
  teamId: string | null
  onClose: () => void
}

interface TaskStats {
  total: number
  completed: number
  overdue: number
  byStatus: { name: string; count: number; color: string }[]
  byUser: { name: string; count: number }[]
}

function Metrics({ currentUserId, teamId, onClose }: MetricsProps) {
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStats = async () => {
    setLoading(true)

    // Cargar tareas
    let query = supabase
      .from('tasks')
      .select(`
        *,
        task_statuses (*),
        assigned_user:profiles!tasks_assigned_to_fkey (*)
      `)

    if (teamId === null) {
      query = query.is('team_id', null).eq('created_by', currentUserId)
    } else {
      query = query.eq('team_id', teamId)
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error('Error cargando estadísticas:', error)
      setLoading(false)
      return
    }

    // Calcular estadísticas
    const now = new Date()
    const completed = tasks?.filter(t => t.task_statuses?.name?.toLowerCase().includes('complet')) || []
    const overdue = tasks?.filter(t => t.due_date && new Date(t.due_date) < now && !t.task_statuses?.name?.toLowerCase().includes('complet')) || []

    // Agrupar por estado
    const statusMap = new Map<string, { name: string; count: number; color: string }>()
    tasks?.forEach(task => {
      const statusName = task.task_statuses?.name || 'Sin estado'
      const statusColor = task.task_statuses?.color || '#999'
      const existing = statusMap.get(statusName)
      if (existing) {
        existing.count++
      } else {
        statusMap.set(statusName, { name: statusName, count: 1, color: statusColor })
      }
    })

    // Agrupar por usuario asignado
    const userMap = new Map<string, { name: string; count: number }>()
    tasks?.forEach(task => {
      const userName = task.assigned_user?.full_name || task.assigned_user?.email || 'Sin asignar'
      const existing = userMap.get(userName)
      if (existing) {
        existing.count++
      } else {
        userMap.set(userName, { name: userName, count: 1 })
      }
    })

    setStats({
      total: tasks?.length || 0,
      completed: completed.length,
      overdue: overdue.length,
      byStatus: Array.from(statusMap.values()),
      byUser: Array.from(userMap.values()).sort((a, b) => b.count - a.count).slice(0, 5)
    })

    setLoading(false)
  }

  useEffect(() => {
    loadStats()
  }, [currentUserId, teamId])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>📊 Métricas</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center' }}>Cargando métricas...</p>
        ) : stats ? (
          <div>
            {/* Tarjetas de resumen */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                backgroundColor: '#e3f2fd',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, fontSize: '36px', fontWeight: 'bold', color: '#1976d2' }}>
                  {stats.total}
                </p>
                <p style={{ margin: '8px 0 0 0', color: '#666' }}>Total tareas</p>
              </div>

              <div style={{
                backgroundColor: '#e8f5e9',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, fontSize: '36px', fontWeight: 'bold', color: '#4CAF50' }}>
                  {stats.completed}
                </p>
                <p style={{ margin: '8px 0 0 0', color: '#666' }}>Completadas</p>
              </div>

              <div style={{
                backgroundColor: stats.overdue > 0 ? '#ffebee' : '#f5f5f5',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, fontSize: '36px', fontWeight: 'bold', color: stats.overdue > 0 ? '#f44336' : '#666' }}>
                  {stats.overdue}
                </p>
                <p style={{ margin: '8px 0 0 0', color: '#666' }}>Vencidas</p>
              </div>
            </div>

            {/* Gráficos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Gráfico de torta - Por estado */}
              <div>
                <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Por Estado</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.byStatus}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}                    >
                      {stats.byStatus.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico de barras - Por usuario */}
              <div>
                <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Por Asignado</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.byUser} layout="vertical">
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Porcentaje de completadas */}
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <p style={{ color: '#666', marginBottom: '8px' }}>Progreso general</p>
              <div style={{
                backgroundColor: '#eee',
                borderRadius: '10px',
                height: '20px',
                overflow: 'hidden'
              }}>
                <div style={{
                  backgroundColor: '#4CAF50',
                  height: '100%',
                  width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`,
                  transition: 'width 0.5s'
                }}></div>
              </div>
              <p style={{ marginTop: '8px', fontWeight: 'bold' }}>
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completado
              </p>
            </div>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#666' }}>No hay datos disponibles</p>
        )}

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              backgroundColor: '#e0e0e0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default Metrics