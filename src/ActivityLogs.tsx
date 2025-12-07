import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

interface ActivityLog {
  id: string
  user_email: string
  action: string
  description: string
  created_at: string
}

interface ActivityLogsProps {
  teamId: string | null
  onClose: () => void
}

function ActivityLogs({ teamId, onClose }: ActivityLogsProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  const loadLogs = async () => {
    setLoading(true)

    let query = supabase
      .from('activity_logs')
      .select('id, user_email, action, description, created_at')
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

  useEffect(() => {
    loadLogs()
  }, [teamId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      created: '➕',
      updated: '✏️',
      deleted: '🗑️',
      assigned: '👤',
      status_changed: '🔄',
      member_added: '👥',
      member_removed: '❌',
      role_changed: '🔑'
    }
    return icons[action] || '📝'
  }

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      created: '#4CAF50',
      updated: '#2196F3',
      deleted: '#f44336',
      assigned: '#9c27b0',
      status_changed: '#ff9800',
      member_added: '#4CAF50',
      member_removed: '#f44336',
      role_changed: '#673ab7'
    }
    return colors[action] || '#666'
  }

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
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>📋 Actividad Reciente</h2>
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

        <div style={{ overflow: 'auto', flex: 1 }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#666' }}>Cargando actividad...</p>
          ) : logs.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>No hay actividad registrada</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {logs.map(log => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${getActionColor(log.action)}`
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{getActionIcon(log.action)}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '14px' }}>{log.description}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#888' }}>
                      {log.user_email} • {formatDate(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
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

export default ActivityLogs