import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { useRealtimeSubscription } from './hooks/useRealtimeSubscription'
import { UserRole, Profile } from './types/database.types'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'
import { LoadingZapIcon, UsersIcon, XIcon, TrashIcon, ShieldIcon, UserIcon, CrownIcon } from './components/iu/AnimatedIcons'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'

interface TeamMember {
  id: string
  user_id: string
  role: UserRole
  joined_at: string
  profiles: Profile
}

interface TeamMembersProps {
  teamId: string
  currentUserId: string
  currentUserRole: UserRole
  onClose: () => void
}

function TeamMembers({ teamId, currentUserId, currentUserRole, onClose }: TeamMembersProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
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
  
  // Confirmación
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean
    memberId: string
    memberName: string
  }>({ show: false, memberId: '', memberName: '' })
  
  // Toast
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({ show: false, message: '', type: 'info' })

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    loadMembers()
  }, [])

  // Suscripción realtime para cambios en miembros del equipo
  useRealtimeSubscription({
    subscriptions: [
      { table: 'team_members', filter: `team_id=eq.${teamId}` }
    ],
    onchange: useCallback(() => {
      console.log('[TeamMembers] Cambio detectado, recargando miembros...')
      loadMembers()
    }, [teamId]),
    enabled: !!teamId
  })

  const loadMembers = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        profiles (*)
      `)
      .eq('team_id', teamId)
      .order('joined_at')

    if (error) {
      console.error('Error:', error)
      showToast('Error al cargar miembros', 'error')
    } else {
      setMembers(data || [])
    }

    setLoading(false)
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
  }

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    const oldMember = members.find(m => m.id === memberId)
    
    setMembers(prev => prev.map(m =>
      m.id === memberId ? { ...m, role: newRole } : m
    ))

    const { error } = await supabase
      .from('team_members')
      .update({ role: newRole })
      .eq('id', memberId)

    if (error) {
      if (oldMember) {
        setMembers(prev => prev.map(m =>
          m.id === memberId ? oldMember : m
        ))
      }
      showToast('Error al cambiar rol', 'error')
    } else {
      showToast('Rol actualizado', 'success')
    }
  }

  const handleRemoveClick = (memberId: string, memberName: string) => {
    setConfirmDialog({ show: true, memberId, memberName })
  }

  const handleRemoveConfirm = async () => {
    const { memberId } = confirmDialog
    setConfirmDialog({ show: false, memberId: '', memberName: '' })

    const oldMember = members.find(m => m.id === memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))

    const { data, error } = await supabase
      .rpc('delete_team_member', { member_id: memberId })

    if (error || data === false) {
      if (oldMember) {
        setMembers(prev => [...prev, oldMember])
      }
      showToast('Error al eliminar miembro', 'error')
    } else {
      showToast('Miembro eliminado', 'success')
    }
  }

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'owner': return <CrownIcon size={14} />
      case 'admin': return <ShieldIcon size={14} />
      default: return <UserIcon size={14} />
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'owner': return 'Dueño'
      case 'admin': return 'Admin'
      default: return 'Miembro'
    }
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
            ? `bottom-0 left-0 right-0 top-16 rounded-t-3xl safe-area-bottom ${
                isVisible ? 'translate-y-0' : 'translate-y-full'
              }`
            : `top-1/2 left-1/2 -translate-x-1/2 rounded-2xl w-full max-w-md mx-4 max-h-[80vh] ${
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
            <span className="text-yellow-400"><UsersIcon size={24} /></span> Miembros
            <span className="text-gray-400 dark:text-neutral-500 text-sm font-normal">({members.length})</span>
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <XIcon size={24} />
          </button>
        </div>

        {/* Lista */}
        <div className={`overflow-y-auto flex-1 ${isMobile ? 'pb-8' : ''}`}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingZapIcon size={48} />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">👻</div>
                <p className="text-gray-400 dark:text-neutral-500">No hay miembros</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {members.map(member => {
                  const isCurrentUser = member.user_id === currentUserId
                  const canModify = canManage && !isCurrentUser && member.role !== 'owner'

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-neutral-700/50 rounded-xl group hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-yellow-400 text-neutral-900 rounded-full flex items-center justify-center font-bold text-lg">
                        {member.profiles?.full_name?.[0] || member.profiles?.email?.[0] || '?'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-900 dark:text-white font-medium truncate flex items-center gap-2">
                          {member.profiles?.full_name || 'Sin nombre'}
                          {isCurrentUser && (
                            <span className="text-xs text-yellow-400">(tú)</span>
                          )}
                        </div>
                        <div className="text-gray-500 dark:text-neutral-400 text-sm truncate">
                          {member.profiles?.email}
                        </div>
                      </div>

                      {/* Rol */}
                      {canModify ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                          className="bg-gray-200 dark:bg-neutral-600 border border-neutral-500 text-gray-900 dark:text-white text-sm px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        >
                          <option value="member">Miembro</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className="text-gray-500 dark:text-neutral-400 text-sm flex items-center gap-1">
                          {getRoleIcon(member.role)} {getRoleLabel(member.role)}
                        </span>
                      )}

                      {/* Eliminar */}
                      {canModify && (
                        <button
                          onClick={() => handleRemoveClick(
                            member.id,
                            member.profiles?.full_name || member.profiles?.email || 'este miembro'
                          )}
                          className="p-2 text-gray-400 dark:text-neutral-500 hover:text-red-400 hover:bg-gray-200 dark:hover:bg-neutral-600 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Eliminar"
                        >
                          <TrashIcon size={18} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
      </div>

      {/* Dialog de confirmación */}
      {confirmDialog.show && (
        <ConfirmDialog
          title="Eliminar miembro"
          message={`¿Estás seguro de eliminar a ${confirmDialog.memberName} del equipo?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          type="danger"
          onConfirm={handleRemoveConfirm}
          onCancel={() => setConfirmDialog({ show: false, memberId: '', memberName: '' })}
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

export default TeamMembers