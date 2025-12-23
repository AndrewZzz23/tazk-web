import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'

interface ActivityLog {
  id: string
  action: string
  entity_type: string
  entity_id: string
  details: Record<string, unknown>
  performed_by: string
  created_at: string
  user_email?: string
}

interface ActivityLogsProps {
  teamId: string | null
  onClose: () => void
}

type FilterAction = 'all' | 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned'
type FilterEntity = 'all' | 'task' | 'team_member' | 'status'
type FilterTime = 'all' | 'today' | 'week' | 'month'

function ActivityLogs({ teamId, onClose }: ActivityLogsProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
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
  
  // Filtros
  const [filterAction, setFilterAction] = useState<FilterAction>('all')
  const [filterEntity, setFilterEntity] = useState<FilterEntity>('all')
  const [filterTime, setFilterTime] = useState<FilterTime>('all')
  const [filterUser, setFilterUser] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    loadLogs()
  }, [teamId])

  const loadLogs = async () => {
    setLoading(true)

    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      query = query.is('team_id', null)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error:', error)
    } else {
      setLogs(data || [])
    }

    setLoading(false)
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  // Obtener usuarios únicos para el filtro
  const uniqueUsers = useMemo(() => {
    const users = new Set<string>()
    logs.forEach(log => {
      if (log.user_email) users.add(log.user_email)
    })
    return Array.from(users).sort()
  }, [logs])

  // Aplicar filtros
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Filtro por acción
      if (filterAction !== 'all' && log.action !== filterAction) return false

      // Filtro por entidad
      if (filterEntity !== 'all' && log.entity_type !== filterEntity) return false

      // Filtro por usuario
      if (filterUser !== 'all' && log.user_email !== filterUser) return false

      // Filtro por tiempo
      if (filterTime !== 'all') {
        const logDate = new Date(log.created_at)
        const now = new Date()
        
        if (filterTime === 'today') {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          if (logDate < today) return false
        } else if (filterTime === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (logDate < weekAgo) return false
        } else if (filterTime === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          if (logDate < monthAgo) return false
        }
      }

      // Filtro por búsqueda
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const details = log.details ? JSON.stringify(log.details).toLowerCase() : ''
        const email = (log.user_email || '').toLowerCase()
        const action = (log.action || '').toLowerCase()
        
        if (!details.includes(term) && !email.includes(term) && !action.includes(term)) {
          return false
        }
      }

      return true
    })
  }, [logs, filterAction, filterEntity, filterTime, filterUser, searchTerm])

  // Contadores por filtro
  const counts = useMemo(() => ({
    total: logs.length,
    filtered: filteredLogs.length,
    byAction: {
      created: logs.filter(l => l.action === 'created').length,
      updated: logs.filter(l => l.action === 'updated').length,
      deleted: logs.filter(l => l.action === 'deleted').length,
      status_changed: logs.filter(l => l.action === 'status_changed').length,
      assigned: logs.filter(l => l.action === 'assigned').length,
      invited: logs.filter(l => ['invited', 'invitation_accepted', 'invitation_rejected', 'invitation_cancelled'].includes(l.action)).length,
    }
  }), [logs, filteredLogs])

  const hasActiveFilters = filterAction !== 'all' || filterEntity !== 'all' || filterTime !== 'all' || filterUser !== 'all' || searchTerm.trim()

  const clearFilters = () => {
    setFilterAction('all')
    setFilterEntity('all')
    setFilterTime('all')
    setFilterUser('all')
    setSearchTerm('')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `Hace ${minutes}m`
    if (hours < 24) return `Hace ${hours}h`
    if (days < 7) return `Hace ${days}d`

    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionStyle = (action: string) => {
    const styles: Record<string, { icon: string; color: string; bg: string; label: string }> = {
      created: { icon: '➕', color: 'text-green-400', bg: 'bg-green-500/10', label: 'Creado' },
      updated: { icon: '✏️', color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Actualizado' },
      deleted: { icon: '🗑️', color: 'text-red-400', bg: 'bg-red-500/10', label: 'Eliminado' },
      status_changed: { icon: '🔄', color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Estado' },
      assigned: { icon: '👤', color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Asignado' },
      unassigned: { icon: '👤', color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Desasignado' },
      joined: { icon: '🎉', color: 'text-green-400', bg: 'bg-green-500/10', label: 'Se unió' },
      left: { icon: '👋', color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Salió' },
      role_changed: { icon: '🛡️', color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Rol' },
      invited: { icon: '✉️', color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Invitación' },
      invitation_accepted: { icon: '✅', color: 'text-green-400', bg: 'bg-green-500/10', label: 'Aceptada' },
      invitation_rejected: { icon: '❌', color: 'text-red-400', bg: 'bg-red-500/10', label: 'Rechazada' },
      invitation_cancelled: { icon: '🚫', color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Cancelada' },
    }
    return styles[action] || { icon: '📝', color: 'text-gray-500 dark:text-neutral-400', bg: 'bg-neutral-500/10', label: action }
  }

  const getEntityLabel = (type: string) => {
    if (!type) return 'Elemento'
    const labels: Record<string, string> = {
      task: 'Tarea',
      team_member: 'Miembro',
      status: 'Estado',
      team: 'Equipo'
    }
    return labels[type] || type
  }

  const getDescription = (log: ActivityLog) => {
    const details = log.details || {}
    const title = (details as Record<string, string>)?.title 
      || (details as Record<string, string>)?.name 
      || (details as Record<string, string>)?.task_title 
      || 'elemento'
    
    const d = details as Record<string, string>

    switch (log.action) {
      case 'created':
        return `Creó ${getEntityLabel(log.entity_type).toLowerCase()}: "${title}"`
      case 'updated':
        return `Actualizó ${getEntityLabel(log.entity_type).toLowerCase()}: "${title}"`
      case 'deleted':
        return `Eliminó ${getEntityLabel(log.entity_type).toLowerCase()}: "${title}"`
      case 'status_changed':
        if (d?.old_status && d?.new_status) {
          return `Cambió estado: "${d.old_status}" → "${d.new_status}"`
        }
        return 'Cambió estado'
      case 'assigned':
        if (d?.assigned_to_email) {
          return `Asignó tarea a ${d.assigned_to_email}`
        }
        return 'Asignó tarea'
      case 'unassigned':
        return 'Removió asignación de tarea'
      case 'joined':
        if (d?.role) {
          return `Se unió al equipo como ${d.role}`
        }
        return 'Se unió al equipo'
      case 'left':
        return 'Salió del equipo'
      case 'role_changed':
        if (d?.old_role && d?.new_role) {
          return `Cambió rol: "${d.old_role}" → "${d.new_role}"`
        }
        return 'Cambió rol'
      case 'invited':
        return `Invitó a ${d?.email || 'alguien'} como ${d?.role || 'miembro'}`
      case 'invitation_accepted':
        return `${d?.email || 'Usuario'} aceptó la invitación`
      case 'invitation_rejected':
        return `${d?.email || 'Usuario'} rechazó la invitación`
      case 'invitation_cancelled':
        return `Canceló invitación a ${d?.email || 'alguien'}`
      default:
        return `${log.action || 'Acción'} en ${getEntityLabel(log.entity_type || 'unknown')}`
    }
  }
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden transform transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-yellow-400">📋</span> Actividad
              <span className="text-gray-400 dark:text-neutral-500 text-sm font-normal">
                ({filteredLogs.length}{hasActiveFilters ? ` de ${logs.length}` : ''})
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  showFilters || hasActiveFilters
                    ? 'bg-yellow-400 text-neutral-900'
                    : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-600/80'
                }`}
              >
                <span>🔍</span>
                Filtros
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              <button
                onClick={handleClose}
                className="text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xl"
              >
                ×
              </button>
            </div>
          </div>

          {/* Buscador */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500">🔍</span>
            <input
              type="text"
              placeholder="Buscar en actividad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
            />
          </div>

          {/* Filtros expandibles */}
          {showFilters && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-neutral-900/50 rounded-xl space-y-3">
              {/* Filtro por acción */}
              <div>
                <label className="text-xs text-gray-400 dark:text-neutral-500 uppercase tracking-wide mb-1.5 block">
                  Acción
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Todas', count: logs.length },
                    { id: 'created', label: '➕ Creado', count: counts.byAction.created },
                    { id: 'updated', label: '✏️ Actualizado', count: counts.byAction.updated },
                    { id: 'deleted', label: '🗑️ Eliminado', count: counts.byAction.deleted },
                    { id: 'status_changed', label: '🔄 Estado', count: counts.byAction.status_changed },
                    { id: 'assigned', label: '👤 Asignado', count: counts.byAction.assigned },
                    { id: 'invited', label: '✉️ Invitación', count: counts.byAction.invited },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setFilterAction(item.id as FilterAction)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                        filterAction === item.id
                          ? 'bg-yellow-400 text-neutral-900'
                          : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
                      }`}
                    >
                      {item.label}
                      {item.count > 0 && (
                        <span className="ml-1 opacity-60">({item.count})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro por entidad */}
              <div>
                <label className="text-xs text-gray-400 dark:text-neutral-500 uppercase tracking-wide mb-1.5 block">
                  Tipo
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'task', label: '📝 Tareas' },
                    { id: 'team_member', label: '👥 Miembros' },
                    { id: 'status', label: '🎨 Estados' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setFilterEntity(item.id as FilterEntity)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                        filterEntity === item.id
                          ? 'bg-yellow-400 text-neutral-900'
                          : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro por tiempo */}
              <div>
                <label className="text-xs text-gray-400 dark:text-neutral-500 uppercase tracking-wide mb-1.5 block">
                  Periodo
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Todo' },
                    { id: 'today', label: 'Hoy' },
                    { id: 'week', label: 'Última semana' },
                    { id: 'month', label: 'Último mes' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setFilterTime(item.id as FilterTime)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                        filterTime === item.id
                          ? 'bg-yellow-400 text-neutral-900'
                          : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro por usuario */}
              {uniqueUsers.length > 1 && (
                <div>
                  <label className="text-xs text-gray-400 dark:text-neutral-500 uppercase tracking-wide mb-1.5 block">
                    Usuario
                  </label>
                  <select
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="w-full px-3 py-1.5 bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                  >
                    <option value="all">Todos los usuarios</option>
                    {uniqueUsers.map(email => (
                      <option key={email} value={email}>{email}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Limpiar filtros */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-neutral-600/80 transition-colors"
                >
                  ✕ Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Lista */}
        <div className="overflow-y-auto max-h-[calc(85vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-yellow-400">⚡ Cargando...</div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">{hasActiveFilters ? '🔍' : '📭'}</div>
              <p className="text-gray-400 dark:text-neutral-500">
                {hasActiveFilters ? 'No hay actividad con estos filtros' : 'No hay actividad aún'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-3 px-4 py-2 bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-neutral-600/80 transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredLogs.map(log => {
                const style = getActionStyle(log.action)
                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-3 p-3 rounded-xl ${style.bg} border border-transparent hover:border-gray-300 dark:hover:border-neutral-600 transition-colors`}
                  >
                    {/* Icono */}
                    <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center text-lg flex-shrink-0`}>
                      {style.icon}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white text-sm">
                        {getDescription(log)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-400 dark:text-neutral-500 text-xs">
                          {log.user_email || 'Sistema'}
                        </span>
                        <span className="text-gray-300 dark:text-neutral-600">•</span>
                        <span className="text-gray-400 dark:text-neutral-500 text-xs">
                          {formatDate(log.created_at)}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${style.bg} ${style.color}`}>
                          {style.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActivityLogs