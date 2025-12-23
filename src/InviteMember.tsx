import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { TeamInvitation, Profile } from './types/database.types'
import Toast from './Toast'
import ConfirmDialog from './ConfirmDialog'

interface InviteMemberProps {
  teamId: string
  onMemberInvited: () => void
  onClose: () => void
}

interface PendingInvitation extends TeamInvitation {
  inviter?: Profile
}

function InviteMember({ teamId, onMemberInvited, onClose }: InviteMemberProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])
  
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

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
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
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
          isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
        }`}
        onClick={handleClose}
      >
        <div
          className={`bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden transform transition-all duration-200 ${
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-yellow-400">✉️</span> Invitar al Equipo
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors text-2xl"
            >
              ×
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 border-b border-gray-200 dark:border-neutral-700">
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
                      <span className="text-xl">👤</span>
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
                      <span className="text-xl">🛡️</span>
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
                    <span>✉️</span> Enviar Invitación
                  </>
                )}
              </button>
            </form>

            {/* Invitaciones pendientes */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span>⏳</span> Invitaciones Pendientes
                {pendingInvitations.length > 0 && (
                  <span className="bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 text-xs px-2 py-0.5 rounded-full">
                    {pendingInvitations.length}
                  </span>
                )}
              </h3>

              {loadingInvitations ? (
                <div className="text-center py-6 text-yellow-400">⚡ Cargando...</div>
              ) : pendingInvitations.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-gray-400 dark:text-neutral-500 text-sm">No hay invitaciones pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvitations.map(invitation => (
                    <div
                      key={invitation.id}
                      className="bg-gray-100 dark:bg-neutral-700/50 rounded-xl p-4 flex items-center gap-4 group"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-gray-200 dark:bg-neutral-600 text-gray-500 dark:text-neutral-400 rounded-full flex items-center justify-center font-bold">
                        {invitation.email[0].toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-900 dark:text-white font-medium truncate">
                          {invitation.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-neutral-400 mt-1">
                          <span>{invitation.role === 'admin' ? '🛡️ Admin' : '👤 Miembro'}</span>
                          <span className="text-gray-300 dark:text-neutral-600">•</span>
                          <span>{formatDate(invitation.created_at)}</span>
                          <span className="text-gray-300 dark:text-neutral-600">•</span>
                          <span className={
                            new Date(invitation.expires_at) <= new Date() 
                              ? 'text-red-400' 
                              : 'text-gray-500 dark:text-neutral-400'
                          }>
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
                        className="px-3 py-1.5 bg-gray-200 dark:bg-neutral-600 text-gray-600 dark:text-neutral-300 rounded-lg text-sm hover:bg-red-500/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invitaciones rechazadas */}
            {rejectedInvitations.length > 0 && (
              <div className="p-6 border-t border-gray-200 dark:border-neutral-700">
                <h3 className="text-sm font-semibold text-red-400/70 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span>❌</span> Rechazadas
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
                          🗑️
                        </button>
                        <button
                          onClick={() => {
                            setEmail(invitation.email)
                            setRole(invitation.role as 'admin' | 'member')
                          }}
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