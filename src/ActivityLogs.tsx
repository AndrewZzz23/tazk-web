import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

interface ActivityLog {
  id: string
  user_email: string
  action: string
  description: string
  team_id: string | null
  created_at: string
}

interface ActivityLogsProps {
  teamId: string | null
  onClose: () => void
}

function ActivityLogs({ teamId, onClose }: ActivityLogsProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    loadLogs()
  }, [])

  const loadLogs = async () => {
    setLoading(true)

    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      query = query.is('team_id', null)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error cargando logs:', error)
    } else {
      setLogs(data || [])
    }

    setLoading(false)
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const getActionStyle = (action: string) => {
    const styles: { [key: string]: { icon: string; bg: string; border: string; text: string } } = {
      created: {
        icon: '➕',
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400'
      },
      updated: {
        icon: '✏️',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400'
      },
      deleted: {
        icon: '🗑️',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400'
      },
      assigned: {
        icon: '👤',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-400'
      },
      status_changed: {
        icon: '🔄',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400'
      },
      member_added: {
        icon: '👥',
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400'
      },
      member_removed: {
        icon: '❌',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400'
      },
      role_changed: {
        icon: '🔑',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400'
      }
    }

    return styles[action] || {
      icon: '📝',
      bg: 'bg-neutral-700/50',
      border: 'border-neutral-600',
      text: 'text-neutral-400'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Ahora mismo'
    if (minutes < 60) return `Hace ${minutes} min`
    if (hours < 24) return `Hace ${hours}h`
    if (days < 7) return `Hace ${days}d`

    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionLabel = (action: string) => {
    const labels: { [key: string]: string } = {
      created: 'Creó',
      updated: 'Actualizó',
      deleted: 'Eliminó',
      assigned: 'Asignó',
      status_changed: 'Cambió estado',
      member_added: 'Agregó miembro',
      member_removed: 'Removió miembro',
      role_changed: 'Cambió rol'
    }
    return labels[action] || action
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden transform transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-yellow-400">📋</span> Actividad Reciente
          </h2>
          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-yellow-400">⚡ Cargando actividad...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-neutral-400">No hay actividad registrada</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {logs.map((log) => {
                const style = getActionStyle(log.action)
                return (
                  <div
                    key={log.id}
                    className={`${style.bg} ${style.border} border rounded-xl p-4 transition-all hover:scale-[1.01]`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icono */}
                      <div className={`text-xl flex-shrink-0`}>
                        {style.icon}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium ${style.text}`}>
                            {getActionLabel(log.action)}
                          </span>
                          <span className="text-neutral-500 text-sm">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        <p className="text-neutral-300 text-sm mt-1">
                          {log.description}
                        </p>
                        <p className="text-neutral-500 text-xs mt-2 truncate">
                          👤 {log.user_email}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {logs.length > 0 && (
          <div className="p-4 border-t border-neutral-700 text-center">
            <span className="text-neutral-500 text-sm">
              Mostrando últimas {logs.length} actividades
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityLogs