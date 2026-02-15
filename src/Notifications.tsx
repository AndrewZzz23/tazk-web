import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { useRealtimeSubscription } from './hooks/useRealtimeSubscription'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import { TeamInvitation, AppNotification } from './types/database.types'
import Toast from './Toast'
import { LoadingZapIcon, BellIcon, XIcon, UsersIcon, CheckIcon } from './components/iu/AnimatedIcons'
import { BellOff, Clock, Shield, User, UserPlus, CheckCircle2, UserMinus, ArrowRightLeft, Trash2 } from 'lucide-react'

interface NotificationsProps {
  onClose: () => void
  onInvitationResponded: () => void
}

function Notifications({ onClose, onInvitationResponded }: NotificationsProps) {
  const isMobile = useIsMobile()
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
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
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({ show: false, message: '', type: 'info' })

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    loadData()
  }, [])

  // Suscripción realtime
  useRealtimeSubscription({
    subscriptions: [
      { table: 'team_invitations' },
      { table: 'notifications' }
    ],
    onchange: useCallback(() => {
      loadData()
    }, []),
    enabled: true
  })

  const loadData = async () => {
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    const userEmail = userData.user?.email
    const userId = userData.user?.id

    if (!userEmail || !userId) {
      setLoading(false)
      return
    }

    // Cargar invitaciones y notificaciones en paralelo
    const [invitationsRes, notificationsRes] = await Promise.all([
      supabase
        .from('team_invitations')
        .select(`
          *,
          teams (*),
          inviter:profiles!team_invitations_invited_by_fkey (*)
        `)
        .eq('email', userEmail)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
    ])

    if (!invitationsRes.error) setInvitations(invitationsRes.data || [])
    if (!notificationsRes.error) setNotifications(notificationsRes.data || [])

    // Marcar notificaciones como leídas
    if (notificationsRes.data?.some(n => !n.is_read)) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
    }

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

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
  }

  const handleAccept = async (invitationId: string) => {
    setProcessingId(invitationId)

    const { data, error } = await supabase
      .rpc('accept_invitation', { invitation_id: invitationId })
    setProcessingId(null)

    if (error || !data) {
      showToast('Error al aceptar invitación', 'error')
    } else {
      setInvitations(prev => prev.filter(i => i.id !== invitationId))
      showToast('¡Te uniste al equipo!', 'success')
      onInvitationResponded()
    }
  }

  const handleReject = async (invitationId: string) => {
    setProcessingId(invitationId)

    const { data, error } = await supabase
      .rpc('reject_invitation', { invitation_id: invitationId })

    setProcessingId(null)

    if (error || !data) {
      showToast('Error al rechazar invitación', 'error')
    } else {
      setInvitations(prev => prev.filter(i => i.id !== invitationId))
      showToast('Invitación rechazada', 'info')
    }
  }

  const handleDeleteNotification = async (notifId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId))
    await supabase.from('notifications').delete().eq('id', notifId)
  }

  const handleClearAll = async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user?.id) return
    setNotifications([])
    await supabase.from('notifications').delete().eq('user_id', userData.user.id)
    showToast('Notificaciones limpiadas', 'info')
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
    if (days === 1) return 'Ayer'
    if (days < 7) return `Hace ${days}d`

    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <UserPlus className="w-5 h-5 text-blue-400" />
      case 'task_completed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />
      case 'task_unassigned':
        return <UserMinus className="w-5 h-5 text-orange-400" />
      case 'task_status_changed':
        return <ArrowRightLeft className="w-5 h-5 text-purple-400" />
      default:
        return <BellIcon size={20} />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return 'from-blue-500/20 to-blue-500/5 border-blue-500/30'
      case 'task_completed':
        return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30'
      case 'task_unassigned':
        return 'from-orange-500/20 to-orange-500/5 border-orange-500/30'
      case 'task_status_changed':
        return 'from-purple-500/20 to-purple-500/5 border-purple-500/30'
      default:
        return 'from-neutral-500/20 to-neutral-500/5 border-neutral-500/30'
    }
  }

  const totalCount = invitations.length + notifications.filter(n => !n.is_read).length
  const hasItems = invitations.length > 0 || notifications.length > 0

  // Contenido compartido
  const renderContent = () => (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingZapIcon size={48} />
        </div>
      ) : !hasItems ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-700/50 rounded-full flex items-center justify-center mb-4">
            <BellOff className="w-10 h-10 text-neutral-400 dark:text-neutral-500" />
          </div>
          <h3 className="text-neutral-900 dark:text-white font-semibold text-lg mb-2">
            Todo al día
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm text-center max-w-[240px]">
            No tienes notificaciones pendientes. Te avisaremos cuando haya algo nuevo.
          </p>
        </div>
      ) : (
        <div className={`space-y-3 ${isMobile ? 'px-4 py-3 pb-8' : 'p-4'}`}>
          {/* Invitaciones pendientes */}
          {invitations.map(invitation => (
            <div
              key={`inv-${invitation.id}`}
              className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-700/60 dark:to-neutral-700/30 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-600/50 shadow-sm"
            >
              {/* Header con avatar y tiempo */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                  style={{ backgroundColor: invitation.teams?.color || '#facc15' }}
                >
                  <UsersIcon size={24} className="text-neutral-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-neutral-900 dark:text-white font-medium leading-snug">
                    Invitación a <span className="font-bold text-yellow-500">{invitation.teams?.name}</span>
                  </p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-0.5">
                    De {invitation.inviter?.full_name || 'Alguien'}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-500 text-xs flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(invitation.created_at)}</span>
                </div>
              </div>

              {/* Rol asignado */}
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-white/50 dark:bg-neutral-800/50 rounded-lg">
                {invitation.role === 'admin' ? (
                  <Shield className="w-4 h-4 text-blue-500" />
                ) : (
                  <User className="w-4 h-4 text-neutral-500" />
                )}
                <span className="text-sm text-neutral-600 dark:text-neutral-300">
                  Serás <span className="font-medium">{invitation.role === 'admin' ? 'Administrador' : 'Miembro'}</span> del equipo
                </span>
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleReject(invitation.id)}
                  disabled={processingId === invitation.id}
                  className="flex-1 px-4 py-2.5 bg-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200 rounded-xl font-medium hover:bg-neutral-300 dark:hover:bg-neutral-500 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => handleAccept(invitation.id)}
                  disabled={processingId === invitation.id}
                  className="flex-1 px-4 py-2.5 bg-yellow-400 text-neutral-900 rounded-xl font-bold hover:bg-yellow-300 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20"
                >
                  {processingId === invitation.id ? (
                    <LoadingZapIcon size={18} />
                  ) : (
                    <>
                      <CheckIcon size={18} />
                      <span>Unirme</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}

          {/* Separador si hay ambos */}
          {invitations.length > 0 && notifications.length > 0 && (
            <div className="border-t border-neutral-200 dark:border-neutral-700 my-1" />
          )}

          {/* Botón limpiar todo */}
          {notifications.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleClearAll}
                className="text-xs text-neutral-400 dark:text-neutral-500 hover:text-red-400 dark:hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Limpiar todo
              </button>
            </div>
          )}

          {/* Notificaciones generales */}
          {notifications.map(notif => (
            <div
              key={`notif-${notif.id}`}
              className={`bg-gradient-to-br ${getNotificationColor(notif.type)} rounded-2xl p-4 border shadow-sm group relative`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900/50 flex items-center justify-center flex-shrink-0">
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-neutral-900 dark:text-white font-medium text-sm leading-snug">
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1 line-clamp-2">
                      {notif.body}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-500 text-xs">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(notif.created_at)}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteNotification(notif.id)}
                    className="p-1 text-neutral-400 hover:text-red-400 transition-colors rounded-lg opacity-0 group-hover:opacity-100"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )

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
          className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-neutral-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden safe-area-bottom ${
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
            <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400"><BellIcon size={24} /></span>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Notificaciones
              </h2>
              {totalCount > 0 && (
                <span className="bg-yellow-400 text-neutral-900 text-xs font-bold px-2 py-0.5 rounded-full">
                  {totalCount}
                </span>
              )}
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
            {renderContent()}
          </div>
        </div>

        {/* Toast */}
        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, show: false })}
          />
        )}
      </>
    )
  }

  // Desktop: Modal centrado
  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
          isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
        }`}
        onClick={handleClose}
      >
        <div
          className={`bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden transform transition-all duration-200 ${
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400"><BellIcon size={24} /></span>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                Notificaciones
              </h2>
              {totalCount > 0 && (
                <span className="bg-yellow-400 text-neutral-900 text-xs font-bold px-2 py-0.5 rounded-full">
                  {totalCount}
                </span>
              )}
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </>
  )
}

export default Notifications
