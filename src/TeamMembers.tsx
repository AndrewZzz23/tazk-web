import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { UserRole, Profile } from './types/database.types'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'

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

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
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
      case 'owner': return '👑'
      case 'admin': return '🛡️'
      default: return '👤'
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
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
          isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
        }`}
        onClick={handleClose}
      >
        <div
          className={`bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden transform transition-all duration-200 ${
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-700">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-yellow-400">👥</span> Miembros
              <span className="text-neutral-500 text-sm font-normal">({members.length})</span>
            </h2>
            <button
              onClick={handleClose}
              className="text-neutral-400 hover:text-white transition-colors text-2xl"
            >
              ×
            </button>
          </div>

          {/* Lista */}
          <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-yellow-400">⚡ Cargando...</div>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">👻</div>
                <p className="text-neutral-500">No hay miembros</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {members.map(member => {
                  const isCurrentUser = member.user_id === currentUserId
                  const canModify = canManage && !isCurrentUser && member.role !== 'owner'

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-neutral-700/50 rounded-xl group hover:bg-neutral-700 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-yellow-400 text-neutral-900 rounded-full flex items-center justify-center font-bold text-lg">
                        {member.profiles?.full_name?.[0] || member.profiles?.email?.[0] || '?'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate flex items-center gap-2">
                          {member.profiles?.full_name || 'Sin nombre'}
                          {isCurrentUser && (
                            <span className="text-xs text-yellow-400">(tú)</span>
                          )}
                        </div>
                        <div className="text-neutral-400 text-sm truncate">
                          {member.profiles?.email}
                        </div>
                      </div>

                      {/* Rol */}
                      {canModify ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                          className="bg-neutral-600 border border-neutral-500 text-white text-sm px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        >
                          <option value="member">👤 Miembro</option>
                          <option value="admin">🛡️ Admin</option>
                        </select>
                      ) : (
                        <span className="text-neutral-400 text-sm flex items-center gap-1">
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
                          className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-600 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
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