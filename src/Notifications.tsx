import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { useRealtimeSubscription } from './hooks/useRealtimeSubscription'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import { TeamInvitation } from './types/database.types'
import Toast from './Toast'
import { LoadingZapIcon, BellIcon, XIcon, UsersIcon, CheckIcon } from './components/iu/AnimatedIcons'
import { BellOff, Clock, Shield, User } from 'lucide-react'

interface NotificationsProps {
  onClose: () => void
  onInvitationResponded: () => void
}

function Notifications({ onClose, onInvitationResponded }: NotificationsProps) {
  const isMobile = useIsMobile()
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
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
    loadInvitations()
  }, [])

  // Suscripción realtime para invitaciones
  useRealtimeSubscription({
    subscriptions: [
      { table: 'team_invitations' }
    ],
    onchange: useCallback(() => {
      loadInvitations()
    }, []),
    enabled: true
  })

  const loadInvitations = async () => {
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    const userEmail = userData.user?.email

    if (!userEmail) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('team_invitations')
      .select(`
        *,
        teams (*),
        inviter:profiles!team_invitations_invited_by_fkey (*)
      `)
      .eq('email', userEmail)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error cargando invitaciones:', error)
    } else {
      setInvitations(data || [])
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

  // Contenido compartido
  const renderContent = () => (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingZapIcon size={48} />
        </div>
      ) : invitations.length === 0 ? (
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
          {invitations.map(invitation => (
            <div
              key={invitation.id}
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
              {invitations.length > 0 && (
                <span className="bg-yellow-400 text-neutral-900 text-xs font-bold px-2 py-0.5 rounded-full">
                  {invitations.length}
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
              {invitations.length > 0 && (
                <span className="bg-yellow-400 text-neutral-900 text-xs font-bold px-2 py-0.5 rounded-full">
                  {invitations.length}
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
