import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { TeamInvitation } from './types/database.types'
import Toast from './Toast'
import { LoadingZapIcon, BellIcon, XIcon, UsersIcon, CheckIcon } from './components/iu/AnimatedIcons'
import { BellOff } from 'lucide-react'

interface NotificationsProps {
  onClose: () => void
  onInvitationResponded: () => void
}

function Notifications({  onClose, onInvitationResponded }: NotificationsProps) {
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

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
  }

  const handleAccept = async (invitationId: string) => {
    setProcessingId(invitationId)
    
    const { data, error } = await supabase
      .rpc('accept_invitation', { invitation_id: invitationId })
      console.log('Accept result:', data, 'Error:', error)
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
    const days = Math.floor(diff / 86400000)

    if (days === 0) return 'Hoy'
    if (days === 1) return 'Ayer'
    if (days < 7) return `Hace ${days} días`

    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
  }

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
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-yellow-400"><BellIcon size={24} /></span> Notificaciones
              {invitations.length > 0 && (
                <span className="bg-yellow-400 text-neutral-900 text-xs font-bold px-2 py-0.5 rounded-full">
                  {invitations.length}
                </span>
              )}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <XIcon size={24} />
            </button>
          </div>

          {/* Lista */}
          <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingZapIcon size={48} />
              </div>
            ) : invitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-neutral-700 rounded-full flex items-center justify-center mb-4">
                  <BellOff className="w-8 h-8 text-gray-400 dark:text-neutral-500" />
                </div>
                <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-1">
                  Sin notificaciones
                </h3>
                <p className="text-gray-500 dark:text-neutral-400 text-sm text-center">
                  No tienes invitaciones pendientes
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {invitations.map(invitation => (
                  <div
                    key={invitation.id}
                    className="bg-gray-100 dark:bg-neutral-700/50 rounded-xl p-4 border border-gray-300 dark:border-neutral-600"
                  >
                    {/* Info */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-yellow-400 text-neutral-900 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                        <UsersIcon size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-white">
                          <span className="font-semibold">{invitation.inviter?.full_name || 'Alguien'}</span>
                          {' '}te invitó a unirte a{' '}
                          <span className="font-semibold text-yellow-400">{invitation.teams?.name}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-gray-500 dark:text-neutral-400 text-sm">
                            {formatDate(invitation.created_at)}
                          </span>
                          <span className="text-gray-300 dark:text-neutral-600">•</span>
                          <span className="text-gray-500 dark:text-neutral-400 text-sm">
                            Rol: {invitation.role === 'admin' ? '🛡️ Admin' : '👤 Miembro'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(invitation.id)}
                        disabled={processingId === invitation.id}
                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-neutral-600 text-gray-600 dark:text-neutral-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-neutral-500 transition-colors disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleAccept(invitation.id)}
                        disabled={processingId === invitation.id}
                        className="flex-1 px-4 py-2 bg-yellow-400 text-neutral-900 rounded-lg font-bold hover:bg-yellow-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {processingId === invitation.id ? 'Procesando...' : <><CheckIcon size={18} /> Aceptar</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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