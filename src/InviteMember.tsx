import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { useRealtimeSubscription } from './hooks/useRealtimeSubscription'
import { TeamInvitation, Profile } from './types/database.types'
import Toast from './Toast'
import ConfirmDialog from './ConfirmDialog'
import { LoadingZapIcon, MailIcon, XIcon, UserIcon, TrashIcon, ShieldIcon } from './components/iu/AnimatedIcons'
import { Clock, XCircle, Mail } from 'lucide-react'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { notifyTeamInvite } from './lib/sendPushNotification'
import { sendTeamInvitationEmail } from './lib/emailNotifications'

interface InviteMemberProps {
  teamId: string
  teamName: string
  inviterName: string
  onMemberInvited: () => void
  onClose: () => void
}

interface PendingInvitation extends TeamInvitation {
  inviter?: Profile
}

function InviteMember({ teamId, teamName, inviterName, onMemberInvited, onClose }: InviteMemberProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const isMobile = useIsMobile()

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const { dragStyle, isDragging, containerProps } = useBottomSheetGesture({
    onClose: handleClose,
    threshold: 100
  })

  // ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  // Invitaciones
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [rejectedInvitations, setRejectedInvitations] = useState<PendingInvitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(true)  
  
  // Toast
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({ show: false, message: '', type: 'info' })

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean
    invitationId: string
    email: string
    type: 'pending' | 'rejected'
  }>({ show: false, invitationId: '', email: '', type: 'pending' })

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    loadPendingInvitations()
  }, [])

  // Suscripción realtime para cambios en invitaciones del equipo
  useRealtimeSubscription({
    subscriptions: [
      { table: 'team_invitations', filter: `team_id=eq.${teamId}` }
    ],
    onchange: useCallback(() => {
      console.log('[InviteMember] Cambio detectado, recargando invitaciones...')
      loadPendingInvitations()
    }, [teamId]),
    enabled: !!teamId
  })

  const loadPendingInvitations = async () => {
    setLoadingInvitations(true)

    // Cargar pendientes
    const { data: pending } = await supabase
      .from('team_invitations')
      .select(`
        *,
        inviter:profiles!team_invitations_invited_by_fkey (*)
      `)
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (pending) setPendingInvitations(pending)

    // Cargar rechazadas (últimos 7 días)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: rejected } = await supabase
      .from('team_invitations')
      .select(`
        *,
        inviter:profiles!team_invitations_invited_by_fkey (*)
      `)
      .eq('team_id', teamId)
      .eq('status', 'rejected')
      .gte('responded_at', sevenDaysAgo.toISOString())
      .order('responded_at', { ascending: false })

    if (rejected) setRejectedInvitations(rejected)

    setLoadingInvitations(false)
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail) {
      showToast('El email es obligatorio', 'error')
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      showToast('Email inválido', 'error')
      return
    }

    setLoading(true)

    // Verificar si ya es miembro del equipo
    const { data: members } = await supabase
      .from('team_members')
      .select(`
        id,
        profiles!inner (email)
      `)
      .eq('team_id', teamId)

    const isMember = members?.some(m => 
      (m.profiles as unknown as Profile)?.email?.toLowerCase() === trimmedEmail
    )

    if (isMember) {
      showToast('Este usuario ya es miembro del equipo', 'error')
      setLoading(false)
      return
    }

    // Verificar si ya tiene invitación pendiente
    const hasPendingInvitation = pendingInvitations.some(
      inv => inv.email.toLowerCase() === trimmedEmail
    )

    if (hasPendingInvitation) {
      showToast('Ya existe una invitación pendiente para este email', 'error')
      setLoading(false)
      return
    }

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()

    // Crear invitación
    const { data: newInvitation, error: inviteError } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email: trimmedEmail,
        role: role,
        invited_by: user?.id
      })
      .select(`
        *,
        inviter:profiles!team_invitations_invited_by_fkey (*)
      `)
      .single()

    setLoading(false)

    if (inviteError) {
      showToast('Error al enviar invitación', 'error')
    } else {
      // Agregar a la lista de pendientes
      if (newInvitation) {
        setPendingInvitations(prev => [newInvitation, ...prev])
      }

      // Verificar si el email ya tiene cuenta en Tazk
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', trimmedEmail)
        .maybeSingle()

      if (existingUser) {
        // Usuario existente: push + email
        notifyTeamInvite(existingUser.id, teamName, inviterName)
        sendTeamInvitationEmail(trimmedEmail, teamName, inviterName, role, true, user!.id, teamId)
      } else {
        // Usuario nuevo: solo email
        sendTeamInvitationEmail(trimmedEmail, teamName, inviterName, role, false, user!.id, teamId)
      }

      setEmail('')
      setRole('member')
      showToast('✅ Invitación enviada correctamente', 'success')
      onMemberInvited()
    }
  }

  const handleDeleteInvitation = async () => {
    const { invitationId, type } = confirmDialog
    setConfirmDialog({ show: false, invitationId: '', email: '', type: 'pending' })

    // Optimistic update
    if (type === 'pending') {
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId))
    } else {
      setRejectedInvitations(prev => prev.filter(inv => inv.id !== invitationId))
    }

    const { error } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId)

    console.log('Delete invitation error:', error)

    if (error) {
      // Recargar para restaurar
      loadPendingInvitations()
      showToast('Error al eliminar invitación', 'error')
    } else {
      showToast('Invitación eliminada', 'success')
    }
  }

  const handleResendInvitation = async (invitation: PendingInvitation) => {
    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()

    // Optimistic update - remover de rechazadas
    setRejectedInvitations(prev => prev.filter(inv => inv.id !== invitation.id))

    // Eliminar la invitación rechazada
    const { error: deleteError } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitation.id)

    if (deleteError) {
      loadPendingInvitations()
      showToast('Error al reenviar invitación', 'error')
      return
    }

    // Crear nueva invitación
    const { data: newInvitation, error: inviteError } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email: invitation.email,
        role: invitation.role,
        invited_by: user?.id
      })
      .select(`
        *,
        inviter:profiles!team_invitations_invited_by_fkey (*)
      `)
      .single()

    if (inviteError) {
      loadPendingInvitations()
      showToast('Error al reenviar invitación', 'error')
    } else {
      if (newInvitation) {
        setPendingInvitations(prev => [newInvitation, ...prev])
      }
      showToast('Invitación reenviada correctamente', 'success')
      onMemberInvited()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getExpirationText = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = expires.getTime() - now.getTime()
    const days = Math.ceil(diff / 86400000)

    if (days <= 0) return 'Expirada'
    if (days === 1) return 'Expira mañana'
    return `Expira en ${days} días`
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-200 ${
          isVisible ? 'bg-black/60' : 'bg-transparent opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Modal/Bottom Sheet */}
      <div
        className={`fixed z-50 bg-white dark:bg-neutral-800 shadow-2xl overflow-hidden flex flex-col will-change-transform ${
          isMobile
            ? `bottom-0 left-0 right-0 top-8 rounded-t-3xl safe-area-bottom ${
                isVisible ? 'translate-y-0' : 'translate-y-full'
              }`
            : `top-1/2 left-1/2 -translate-x-1/2 rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] ${
                isVisible ? '-translate-y-1/2 opacity-100 scale-100' : '-translate-y-1/2 opacity-0 scale-95'
              }`
        }`}
        style={isMobile ? { ...dragStyle, transition: isDragging ? 'none' : 'transform 0.2s ease-out' } : undefined}
        onClick={(e) => e.stopPropagation()}
        {...(isMobile ? containerProps : {})}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-gray-200 dark:border-neutral-700 ${isMobile ? 'p-4' : 'p-6'}`}>
          {isMobile && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-neutral-600 rounded-full" />
          )}
          <h2 className={`font-bold text-gray-900 dark:text-white flex items-center gap-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
            <span className="text-yellow-400"><MailIcon size={24} /></span> Invitar al Equipo
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <XIcon size={24} />
          </button>
        </div>

        <div className={`overflow-y-auto flex-1 ${isMobile ? 'pb-8' : ''}`}>
          {/* Formulario */}
          <form onSubmit={handleSubmit} className={`border-b border-gray-200 dark:border-neutral-700 ${isMobile ? 'p-4' : 'p-6'}`}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                  autoFocus
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">
                  Rol
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('member')}
                    className={`px-4 py-3 rounded-xl font-medium transition-all text-left ${
                      role === 'member'
                        ? 'bg-yellow-400 text-neutral-900'
                        : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserIcon size={24} />
                      <div>
                        <div className="font-semibold">Miembro</div>
                        <div className="text-xs opacity-70">Ver y editar sus tareas</div>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`px-4 py-3 rounded-xl font-medium transition-all text-left ${
                      role === 'admin'
                        ? 'bg-yellow-400 text-neutral-900'
                        : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldIcon size={24} />
                      <div>
                        <div className="font-semibold">Admin</div>
                        <div className="text-xs opacity-70">Gestionar todo</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full px-4 py-3 bg-yellow-400 text-neutral-900 rounded-lg font-bold hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  'Enviando...'
                ) : (
                  <>
                    <MailIcon size={18} /> Enviar Invitación
                  </>
                )}
              </button>
            </form>

            {/* Invitaciones pendientes */}
            <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Invitaciones Pendientes
                {pendingInvitations.length > 0 && (
                  <span className="bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 text-xs px-2 py-0.5 rounded-full">
                    {pendingInvitations.length}
                  </span>
                )}
              </h3>

              {loadingInvitations ? (
                <div className="flex justify-center py-6">
                  <LoadingZapIcon size={40} />
                </div>
              ) : pendingInvitations.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-6 h-6 text-gray-400 dark:text-neutral-500" />
                  </div>
                  <p className="text-gray-400 dark:text-neutral-500 text-sm">No hay invitaciones pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvitations.map(invitation => {
                    const isExpired = new Date(invitation.expires_at) <= new Date()
                    return (
                      <div
                        key={invitation.id}
                        className="bg-gray-50 dark:bg-neutral-700/30 rounded-xl p-4 border border-gray-200 dark:border-neutral-600/50"
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-10 h-10 bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {invitation.email[0].toUpperCase()}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 dark:text-white font-medium truncate text-sm">
                              {invitation.email}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                                invitation.role === 'admin'
                                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                  : 'bg-gray-100 dark:bg-neutral-600 text-gray-600 dark:text-neutral-300'
                              }`}>
                                {invitation.role === 'admin' ? <><ShieldIcon size={10} /> Admin</> : <><UserIcon size={10} /> Miembro</>}
                              </span>
                              <span className={`text-xs ${isExpired ? 'text-red-500' : 'text-gray-500 dark:text-neutral-400'}`}>
                                {getExpirationText(invitation.expires_at)}
                              </span>
                            </div>
                          </div>

                          {/* Cancelar */}
                          <button
                            onClick={() => setConfirmDialog({
                              show: true,
                              invitationId: invitation.id,
                              email: invitation.email,
                              type: 'pending'
                            })}
                            className="p-2 text-gray-400 dark:text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                            title="Cancelar invitación"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Footer con fecha */}
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-neutral-600/50 flex items-center justify-between">
                          <span className="text-xs text-gray-400 dark:text-neutral-500">
                            Enviada {formatDate(invitation.created_at)}
                          </span>
                          {isExpired && (
                            <span className="text-xs text-red-500 font-medium">
                              Expirada
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Invitaciones rechazadas */}
            {rejectedInvitations.length > 0 && (
              <div className={`border-t border-gray-200 dark:border-neutral-700 ${isMobile ? 'p-4' : 'p-6'}`}>
                <h3 className="text-sm font-semibold text-red-400/70 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Rechazadas
                  <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
                    {rejectedInvitations.length}
                  </span>
                </h3>

                <div className="space-y-3">
                  {rejectedInvitations.map(invitation => (
                    <div
                      key={invitation.id}
                      className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-4"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center font-bold">
                        {invitation.email[0].toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-600 dark:text-neutral-300 font-medium truncate">
                          {invitation.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500 mt-1">
                          <span className="text-red-400">Rechazada</span>
                          <span className="text-gray-300 dark:text-neutral-600">•</span>
                          <span>
                            {invitation.responded_at && new Date(invitation.responded_at).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDialog({
                            show: true,
                            invitationId: invitation.id,
                            email: invitation.email,
                            type: 'rejected'
                          })}
                          className="p-2 text-gray-400 dark:text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <TrashIcon size={18} />
                        </button>
                        <button
                          onClick={() => handleResendInvitation(invitation)}
                          className="px-3 py-1.5 bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 rounded-lg text-sm hover:bg-yellow-400 hover:text-neutral-900 transition-colors"
                        >
                          Reenviar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog.show && (
        <ConfirmDialog
          title={confirmDialog.type === 'pending' ? 'Cancelar invitación' : 'Eliminar invitación'}
          message={`¿${confirmDialog.type === 'pending' ? 'Cancelar' : 'Eliminar'} la invitación de ${confirmDialog.email}?`}
          confirmText="Sí, eliminar"
          cancelText="No"
          type="danger"
          onConfirm={handleDeleteInvitation}
          onCancel={() => setConfirmDialog({ show: false, invitationId: '', email: '', type: 'pending' })}
        />
      )}

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

export default InviteMember