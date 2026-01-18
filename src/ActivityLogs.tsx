import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from './supabaseClient'
import { LoadingZapIcon, XIcon, ActivityIcon } from './components/iu/AnimatedIcons'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'

interface ActivityLog {
  id: string
  action: string
  entity_type: string
  entity_id: string
  changes: Record<string, unknown>
  user_id: string
  created_at: string
  user_email?: string
  performer?: {
    full_name?: string
    email?: string
  } | null
}

interface ActivityLogsProps {
  teamId: string | null
  onClose: () => void
}

type FilterAction = 'all' | 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned' | 'invited' | 'attachment'
type FilterEntity = 'all' | 'task' | 'team_member' | 'status' | 'attachment'
type FilterTime = 'all' | 'today' | 'week' | 'month'

// Componente Combobox simple
function FilterSelect({
  label,
  value,
  options,
  onChange,
  icon
}: {
  label: string
  value: string
  options: { id: string; label: string; count?: number }[]
  onChange: (value: string) => void
  icon?: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(o => o.id === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all border ${
          value !== 'all'
            ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-600 dark:text-yellow-400'
            : 'bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-neutral-300 hover:border-gray-300 dark:hover:border-neutral-600'
        }`}
      >
        {icon && <span className="text-gray-400 dark:text-neutral-500">{icon}</span>}
        <span className="font-medium">{label}:</span>
        <span>{selectedOption?.label || 'Todos'}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-xl z-50 py-1 max-h-64 overflow-auto">
          {options.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                value === option.id
                  ? 'bg-yellow-400/10 text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-700/50'
              }`}
            >
              <span>{option.label}</span>
              {option.count !== undefined && option.count > 0 && (
                <span className="text-xs text-gray-400 dark:text-neutral-500 bg-gray-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ActivityLogs({ teamId, onClose }: ActivityLogsProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const isMobile = useIsMobile()

  // Filtros
  const [filterAction, setFilterAction] = useState<FilterAction>('all')
  const [filterEntity, setFilterEntity] = useState<FilterEntity>('all')
  const [filterTime, setFilterTime] = useState<FilterTime>('all')
  const [filterUser, setFilterUser] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

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
    loadLogs()
  }, [teamId])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  // Swipe to close gesture para móvil
  const { dragStyle, isDragging, containerProps } = useBottomSheetGesture({
    onClose: handleClose
  })

  // Bloquear scroll del body cuando el bottom sheet está abierto (móvil)
  useBodyScrollLock(isMobile && isVisible)

  const loadLogs = async () => {
    setLoading(true)

    // First try with join, fallback to simple query if it fails
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
      console.error('Error loading logs:', error)
      setLogs([])
    } else {
      // Get unique user IDs
      const userIds = [...new Set((data || []).map(log => log.user_id).filter(Boolean))]

      // Fetch all profiles at once
      let profilesMap: Record<string, { full_name: string | null; email: string | null }> = {}

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)

        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = { full_name: p.full_name, email: p.email }
            return acc
          }, {} as Record<string, { full_name: string | null; email: string | null }>)
        }
      }

      // Map profiles to logs
      const logsWithPerformers = (data || []).map(log => ({
        ...log,
        performer: log.user_id ? profilesMap[log.user_id] : null
      }))

      setLogs(logsWithPerformers)
    }

    setLoading(false)
  }

  // Obtener usuarios únicos para el filtro (usando user_id y performer)
  const uniqueUsers = useMemo(() => {
    const usersMap = new Map<string, { id: string; name: string; email: string }>()
    logs.forEach(log => {
      if (log.user_id && !usersMap.has(log.user_id)) {
        usersMap.set(log.user_id, {
          id: log.user_id,
          name: log.performer?.full_name || 'Usuario',
          email: log.performer?.email || log.user_email || ''
        })
      }
    })
    return Array.from(usersMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [logs])

  // Aplicar filtros
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Filtro por acción
      if (filterAction !== 'all') {
        if (filterAction === 'invited') {
          if (!['invited', 'invitation_accepted', 'invitation_rejected', 'invitation_cancelled'].includes(log.action)) return false
        } else if (filterAction === 'attachment') {
          if (!['attachment_added', 'attachment_removed'].includes(log.action)) return false
        } else if (log.action !== filterAction) {
          return false
        }
      }

      // Filtro por entidad
      if (filterEntity !== 'all' && log.entity_type !== filterEntity) return false

      // Filtro por usuario (usando user_id)
      if (filterUser !== 'all' && log.user_id !== filterUser) return false

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
        const details = log.changes ? JSON.stringify(log.changes).toLowerCase() : ''
        const email = (log.performer?.email || log.user_email || '').toLowerCase()
        const name = (log.performer?.full_name || '').toLowerCase()
        const action = (log.action || '').toLowerCase()

        if (!details.includes(term) && !email.includes(term) && !name.includes(term) && !action.includes(term)) {
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
      assigned: logs.filter(l => l.action === 'assigned' || l.action === 'unassigned').length,
      invited: logs.filter(l => ['invited', 'invitation_accepted', 'invitation_rejected', 'invitation_cancelled'].includes(l.action)).length,
      attachment: logs.filter(l => ['attachment_added', 'attachment_removed'].includes(l.action)).length,
    },
    byEntity: {
      task: logs.filter(l => l.entity_type === 'task').length,
      team_member: logs.filter(l => l.entity_type === 'team_member').length,
      status: logs.filter(l => l.entity_type === 'status').length,
      attachment: logs.filter(l => l.entity_type === 'attachment').length,
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
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`

    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short'
    })
  }

  const getActionStyle = (action: string) => {
    const styles: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
      created: {
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        label: 'Creado'
      },
      updated: {
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        label: 'Editado'
      },
      deleted: {
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        label: 'Eliminado'
      },
      status_changed: {
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>,
        color: 'text-purple-500',
        bg: 'bg-purple-500/10',
        label: 'Estado'
      },
      assigned: {
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
        color: 'text-yellow-500',
        bg: 'bg-yellow-500/10',
        label: 'Asignado'
      },
      unassigned: {
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
        color: 'text-orange-500',
        bg: 'bg-orange-500/10',
        label: 'Desasignado'
      },
      joined: {
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        label: 'Unido'
      },
      left: {
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
        color: 'text-orange-500',
        bg: 'bg-orange-500/10',
        label: 'Salio'
      },
      role_changed: {
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        label: 'Rol'
      },
      invited: {
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
        color: 'text-cyan-500',
        bg: 'bg-cyan-500/10',
        label: 'Invitacion'
      },
      invitation_accepted: {
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        label: 'Aceptada'
      },
      invitation_rejected: {
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        label: 'Rechazada'
      },
      invitation_cancelled: {
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
        color: 'text-orange-500',
        bg: 'bg-orange-500/10',
        label: 'Cancelada'
      },
      attachment_added: {
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>,
        color: 'text-indigo-500',
        bg: 'bg-indigo-500/10',
        label: 'Adjunto'
      },
      attachment_removed: {
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        label: 'Adjunto eliminado'
      },
    }
    return styles[action] || {
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      color: 'text-gray-500',
      bg: 'bg-gray-500/10',
      label: action
    }
  }

  const getEntityLabel = (type: string) => {
    if (!type) return 'Elemento'
    const labels: Record<string, string> = {
      task: 'Tarea',
      team_member: 'Miembro',
      status: 'Estado',
      team: 'Equipo',
      attachment: 'Adjunto'
    }
    return labels[type] || type
  }

  const getDescription = (log: ActivityLog) => {
    const changes = log.changes || {}
    const title = (changes as Record<string, string>)?.title
      || (changes as Record<string, string>)?.name
      || (changes as Record<string, string>)?.task_title
      || (changes as Record<string, string>)?.file_name
      || 'elemento'

    const d = changes as Record<string, string>

    switch (log.action) {
      case 'created':
        return `Creo ${getEntityLabel(log.entity_type).toLowerCase()}: "${title}"`
      case 'updated':
        return `Actualizo ${getEntityLabel(log.entity_type).toLowerCase()}: "${title}"`
      case 'deleted':
        return `Elimino ${getEntityLabel(log.entity_type).toLowerCase()}: "${title}"`
      case 'status_changed':
        if (d?.old_status && d?.new_status) {
          return <span>Cambio estado: <span className="text-gray-400 dark:text-neutral-500 line-through">{d.old_status}</span> <span className="mx-1">→</span> <span className="text-yellow-500">{d.new_status}</span></span>
        }
        return 'Cambio estado'
      case 'assigned':
        if (d?.assigned_to_email) {
          return `Asigno tarea a ${d.assigned_to_email}`
        }
        return 'Asigno tarea'
      case 'unassigned':
        return 'Removio asignacion de tarea'
      case 'joined':
        if (d?.role) {
          return `Se unio al equipo como ${d.role}`
        }
        return 'Se unio al equipo'
      case 'left':
        return 'Salio del equipo'
      case 'role_changed':
        if (d?.old_role && d?.new_role) {
          return <span>Cambio rol: <span className="text-gray-400 dark:text-neutral-500">{d.old_role}</span> → <span className="text-yellow-500">{d.new_role}</span></span>
        }
        return 'Cambio rol'
      case 'invited':
        return `Invito a ${d?.email || 'alguien'} como ${d?.role || 'miembro'}`
      case 'invitation_accepted':
        return `${d?.email || 'Usuario'} acepto la invitacion`
      case 'invitation_rejected':
        return `${d?.email || 'Usuario'} rechazo la invitacion`
      case 'invitation_cancelled':
        return `Cancelo invitacion a ${d?.email || 'alguien'}`
      case 'attachment_added':
        return `Agrego archivo: "${d?.file_name || 'archivo'}"`
      case 'attachment_removed':
        return `Elimino archivo: "${d?.file_name || 'archivo'}"`
      default:
        return `${log.action || 'Accion'} en ${getEntityLabel(log.entity_type || 'unknown')}`
    }
  }

  // Agrupar logs por fecha
  const groupedLogs = useMemo(() => {
    const groups: { date: string; logs: ActivityLog[] }[] = []
    let currentDate = ''

    filteredLogs.forEach(log => {
      const logDate = new Date(log.created_at)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let dateLabel: string
      if (logDate.toDateString() === today.toDateString()) {
        dateLabel = 'Hoy'
      } else if (logDate.toDateString() === yesterday.toDateString()) {
        dateLabel = 'Ayer'
      } else {
        dateLabel = logDate.toLocaleDateString('es-CO', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        })
      }

      if (dateLabel !== currentDate) {
        currentDate = dateLabel
        groups.push({ date: dateLabel, logs: [] })
      }
      groups[groups.length - 1].logs.push(log)
    })

    return groups
  }, [filteredLogs])

  // Contenido de filtros
  const renderFilters = () => (
    <div className={`flex flex-wrap items-center gap-2 ${isMobile ? 'overflow-x-auto pb-2 -mx-4 px-4' : ''}`}>
      <FilterSelect
        label="Accion"
        value={filterAction}
        onChange={(v) => setFilterAction(v as FilterAction)}
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        options={[
          { id: 'all', label: 'Todas', count: logs.length },
          { id: 'created', label: 'Creados', count: counts.byAction.created },
          { id: 'updated', label: 'Editados', count: counts.byAction.updated },
          { id: 'deleted', label: 'Eliminados', count: counts.byAction.deleted },
          { id: 'status_changed', label: 'Cambios de estado', count: counts.byAction.status_changed },
          { id: 'assigned', label: 'Asignaciones', count: counts.byAction.assigned },
          { id: 'invited', label: 'Invitaciones', count: counts.byAction.invited },
          { id: 'attachment', label: 'Adjuntos', count: counts.byAction.attachment },
        ]}
      />

      <FilterSelect
        label="Tipo"
        value={filterEntity}
        onChange={(v) => setFilterEntity(v as FilterEntity)}
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
        options={[
          { id: 'all', label: 'Todos' },
          { id: 'task', label: 'Tareas', count: counts.byEntity.task },
          { id: 'team_member', label: 'Miembros', count: counts.byEntity.team_member },
          { id: 'status', label: 'Estados', count: counts.byEntity.status },
          { id: 'attachment', label: 'Adjuntos', count: counts.byEntity.attachment },
        ]}
      />

      <FilterSelect
        label="Periodo"
        value={filterTime}
        onChange={(v) => setFilterTime(v as FilterTime)}
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        options={[
          { id: 'all', label: 'Todo el tiempo' },
          { id: 'today', label: 'Hoy' },
          { id: 'week', label: 'Ultima semana' },
          { id: 'month', label: 'Ultimo mes' },
        ]}
      />

      {uniqueUsers.length > 1 && (
        <FilterSelect
          label="Usuario"
          value={filterUser}
          onChange={setFilterUser}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          options={[
            { id: 'all', label: 'Todos' },
            ...uniqueUsers.map(user => ({ id: user.id, label: user.name }))
          ]}
        />
      )}

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Limpiar
        </button>
      )}
    </div>
  )

  // Contenido de la lista de logs
  const renderLogsList = () => (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingZapIcon size={48} />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {hasActiveFilters ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
          </div>
          <p className="text-gray-500 dark:text-neutral-400 font-medium">
            {hasActiveFilters ? 'Sin resultados para estos filtros' : 'Sin actividad registrada'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="p-4">
          {groupedLogs.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-6 last:mb-0">
              {/* Fecha del grupo */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-wider">
                  {group.date}
                </span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-neutral-800" />
              </div>

              {/* Timeline de logs */}
              <div className="relative">
                {/* Linea vertical - a la izquierda de los iconos */}
                {group.logs.length > 1 && (
                  <div className="absolute left-1 top-8 bottom-8 w-0.5 bg-gray-200 dark:bg-neutral-700" />
                )}
                <div className="space-y-1">
                  {group.logs.map(log => {
                    const style = getActionStyle(log.action)
                    return (
                      <div
                        key={log.id}
                        className="relative flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors group"
                      >
                        {/* Icono */}
                        <div className={`relative z-10 w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center flex-shrink-0 ${style.color}`}>
                          {style.icon}
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {getDescription(log)}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs font-medium text-gray-600 dark:text-neutral-300">
                              {log.performer?.full_name || 'Usuario'}
                            </span>
                            {!isMobile && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-neutral-600" />
                                <span className="text-xs text-gray-400 dark:text-neutral-500">
                                  {log.performer?.email || log.user_email || 'Sin correo'}
                                </span>
                              </>
                            )}
                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-neutral-600" />
                            <span className="text-xs text-gray-400 dark:text-neutral-500">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Badge - solo en desktop */}
                        {!isMobile && (
                          <div className={`px-2 py-1 rounded-lg text-xs font-medium ${style.bg} ${style.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                            {style.label}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )

  // Vista móvil - Bottom Sheet
  if (isMobile) {
    return (
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          isVisible ? 'bg-black/60' : 'bg-transparent pointer-events-none'
        }`}
        onClick={handleClose}
      >
        <div
          className={`fixed bottom-0 left-0 right-0 top-8 z-50 bg-neutral-900 rounded-t-3xl shadow-2xl overflow-hidden safe-area-bottom transition-transform duration-300 ${
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
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-neutral-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400"><ActivityIcon size={24} /></span>
              <div>
                <h2 className="text-lg font-bold text-white">Actividad</h2>
                <p className="text-xs text-neutral-400">
                  {filteredLogs.length} {filteredLogs.length === 1 ? 'registro' : 'registros'}
                  {hasActiveFilters && ` de ${logs.length}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Buscador */}
          <div className="px-4 py-3 border-b border-neutral-800">
            <div className="relative mb-3">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar en actividad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-transparent transition-all"
              />
            </div>
            {renderFilters()}
          </div>

          {/* Lista */}
          <div className="overflow-y-auto flex-1" style={{ height: 'calc(100% - 180px)' }}>
            {renderLogsList()}
          </div>
        </div>
      </div>
    )
  }

  // Vista desktop - Modal centrado
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden transform transition-all duration-200 flex flex-col ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-neutral-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center">
                <ActivityIcon size={20} className="text-yellow-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Actividad</h2>
                <p className="text-sm text-gray-500 dark:text-neutral-400">
                  {filteredLogs.length} {filteredLogs.length === 1 ? 'registro' : 'registros'}
                  {hasActiveFilters && ` de ${logs.length}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Buscador */}
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar en actividad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-transparent transition-all"
            />
          </div>

          {/* Filtros */}
          {renderFilters()}
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1">
          {renderLogsList()}
        </div>
      </div>
    </div>
  )
}

export default ActivityLogs
