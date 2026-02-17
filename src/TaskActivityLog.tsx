import { useState, useEffect, JSX } from 'react'
import { supabase } from './supabaseClient'
import { LoadingZapIcon, XIcon } from './components/iu/AnimatedIcons'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import { History, User, Tag, FileText, Paperclip, ArrowRight, Clock, Type, Calendar, AlertTriangle } from 'lucide-react'

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

interface TaskActivityLogProps {
  taskId: string
  taskTitle: string
  onClose: () => void
}

function TaskActivityLog({ taskId, taskTitle, onClose }: TaskActivityLogProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const isMobile = useIsMobile()

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
  }, [taskId])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const { dragStyle, isDragging, containerProps } = useBottomSheetGesture({
    onClose: handleClose
  })

  useBodyScrollLock(isMobile && isVisible)

  const loadLogs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        performer:profiles!activity_logs_user_id_fkey(full_name, email)
      `)
      .eq('entity_id', taskId)
      .eq('entity_type', 'task')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setLogs(data)
    }
    setLoading(false)
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center"><FileText className="w-4 h-4 text-green-500" /></div>
      case 'updated':
        return <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center"><FileText className="w-4 h-4 text-blue-500" /></div>
      case 'deleted':
        return <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center"><FileText className="w-4 h-4 text-red-500" /></div>
      case 'status_changed':
        return <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center"><Tag className="w-4 h-4 text-purple-500" /></div>
      case 'assigned':
        return <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center"><User className="w-4 h-4 text-yellow-500" /></div>
      case 'unassigned':
        return <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center"><User className="w-4 h-4 text-orange-500" /></div>
      default:
        if (action.includes('attachment') || action.includes('comment')) {
          return <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center"><Paperclip className="w-4 h-4 text-cyan-500" /></div>
        }
        return <div className="w-8 h-8 rounded-full bg-neutral-500/20 flex items-center justify-center"><Clock className="w-4 h-4 text-neutral-500" /></div>
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta'
      case 'medium': return 'Media'
      case 'low': return 'Baja'
      default: return priority
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-500'
      case 'medium': return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
      case 'low': return 'bg-green-500/20 text-green-500'
      default: return 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
    }
  }

  const renderChangeDetails = (changes: Record<string, unknown>) => {
    const details: JSX.Element[] = []

    // Title change
    if (changes.title_changed) {
      const titleChange = changes.title_changed as { from: string; to: string }
      details.push(
        <div key="title" className="flex items-start gap-2 mt-2">
          <Type className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <span className="text-neutral-500">Título: </span>
            <span className="line-through text-neutral-400">{titleChange.from}</span>
            <ArrowRight className="w-3 h-3 inline mx-1 text-neutral-400" />
            <span className="text-neutral-900 dark:text-white font-medium">{titleChange.to}</span>
          </div>
        </div>
      )
    }

    // Priority change
    if (changes.priority_changed) {
      const priorityChange = changes.priority_changed as { from: string; to: string }
      details.push(
        <div key="priority" className="flex items-center gap-2 mt-2">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
          <div className="flex items-center gap-1 text-xs">
            <span className="text-neutral-500">Prioridad: </span>
            <span className={`px-1.5 py-0.5 rounded ${getPriorityColor(priorityChange.from)}`}>
              {getPriorityLabel(priorityChange.from)}
            </span>
            <ArrowRight className="w-3 h-3 text-neutral-400" />
            <span className={`px-1.5 py-0.5 rounded font-medium ${getPriorityColor(priorityChange.to)}`}>
              {getPriorityLabel(priorityChange.to)}
            </span>
          </div>
        </div>
      )
    }

    // Start date change
    if (changes.start_date_changed) {
      const dateChange = changes.start_date_changed as { from: string; to: string }
      details.push(
        <div key="start_date" className="flex items-center gap-2 mt-2">
          <Calendar className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
          <div className="text-xs">
            <span className="text-neutral-500">Fecha inicio: </span>
            <span className="text-neutral-400">{dateChange.from}</span>
            <ArrowRight className="w-3 h-3 inline mx-1 text-neutral-400" />
            <span className="text-neutral-900 dark:text-white">{dateChange.to}</span>
          </div>
        </div>
      )
    }

    // Due date change
    if (changes.due_date_changed) {
      const dateChange = changes.due_date_changed as { from: string; to: string }
      details.push(
        <div key="due_date" className="flex items-center gap-2 mt-2">
          <Clock className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <div className="text-xs">
            <span className="text-neutral-500">Fecha límite: </span>
            <span className="text-neutral-400">{dateChange.from}</span>
            <ArrowRight className="w-3 h-3 inline mx-1 text-neutral-400" />
            <span className="text-neutral-900 dark:text-white">{dateChange.to}</span>
          </div>
        </div>
      )
    }

    // Description change
    if (changes.description_changed) {
      details.push(
        <div key="description" className="flex items-center gap-2 mt-2">
          <FileText className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
          <span className="text-xs text-neutral-500">Descripción modificada</span>
        </div>
      )
    }

    return details.length > 0 ? <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2 mt-2">{details}</div> : null
  }

  const getActionText = (log: ActivityLog) => {
    const changes = log.changes || {}

    switch (log.action) {
      case 'created':
        return 'Creada'
      case 'updated':
        if (changes.attachment_added) return `Adjunto agregado: ${changes.attachment_added}`
        if (changes.attachment_removed) return `Adjunto eliminado: ${changes.attachment_removed}`
        if (changes.comment_added) return `Comentario agregado${changes.has_attachment ? ' con adjunto' : ''}`
        if (changes.comment_removed) return `Comentario eliminado`
        // Check for specific changes
        const hasSpecificChanges = changes.title_changed || changes.priority_changed ||
          changes.start_date_changed || changes.due_date_changed || changes.description_changed
        return hasSpecificChanges ? 'Campos actualizados' : 'Actualizada'
      case 'deleted':
        return 'Eliminada'
      case 'status_changed':
        return (
          <span className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-xs">
              {String(changes.old_status || '?')}
            </span>
            <ArrowRight className="w-3 h-3 text-neutral-400" />
            <span className="px-2 py-0.5 bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 rounded text-xs font-medium">
              {String(changes.new_status || '?')}
            </span>
          </span>
        )
      case 'assigned':
        return `Asignada a ${changes.assigned_to_email || 'usuario'}`
      case 'unassigned':
        return 'Desasignada'
      default:
        return log.action
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'Ahora'
    if (diffMin < 60) return `Hace ${diffMin}m`
    if (diffHours < 24) return `Hace ${diffHours}h`
    if (diffDays < 7) return `Hace ${diffDays}d`

    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center py-16">
          <LoadingZapIcon size={40} />
        </div>
      )
    }

    if (logs.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <History className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            Sin historial
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-[280px]">
            No hay actividad registrada para esta tarea.
          </p>
        </div>
      )
    }

    return (
      <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-4 pb-8' : 'px-6 pb-6'}`}>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-4 bottom-4 w-px bg-neutral-200 dark:bg-neutral-700" />

          {/* Timeline items */}
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div
                key={log.id}
                className={`relative pl-12 py-3 group ${
                  index === 0 ? '' : ''
                }`}
              >
                {/* Icon */}
                <div className="absolute left-0 top-3">
                  {getActionIcon(log.action)}
                </div>

                {/* Content */}
                <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {getActionText(log)}
                    </span>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                      {formatTimeAgo(log.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <User className="w-3 h-3" />
                    <span>{log.performer?.full_name || log.performer?.email || log.user_email || 'Usuario'}</span>
                  </div>

                  {/* Detailed changes */}
                  {log.action === 'updated' && renderChangeDetails(log.changes || {})}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
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
          className={`fixed inset-x-0 bottom-0 top-16 z-50 bg-white dark:bg-neutral-900 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col safe-area-bottom ${
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
            <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <History className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white truncate">
                  Historial
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {taskTitle}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex-shrink-0"
            >
              <XIcon size={20} />
            </button>
          </div>

          {renderContent()}
        </div>
      </>
    )
  }

  // Desktop: Side Panel
  return (
    <>
      <div
        className={`fixed inset-0 z-50 transition-all duration-200 ${
          isVisible ? 'bg-black/40 backdrop-blur-sm' : 'bg-transparent'
        }`}
        onClick={handleClose}
      />
      <div
        className={`fixed right-0 top-0 bottom-0 w-[400px] max-w-full z-50 bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden flex flex-col transform transition-transform duration-300 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
              <History className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Historial
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                {taskTitle}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <XIcon size={20} />
          </button>
        </div>

        {renderContent()}
      </div>
    </>
  )
}

export default TaskActivityLog
