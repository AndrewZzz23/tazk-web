import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { UserRole } from './types/database.types'

interface Member {
  id: string
  user_id: string
  role: UserRole
  joined_at: string
  profile: {
    email: string
    full_name: string | null
  }
}

interface TeamMembersProps {
  teamId: string
  teamName: string
  currentUserId: string
  currentUserRole: UserRole
  onClose: () => void
  onMembersChanged: () => void
}

function TeamMembers({ teamId, teamName, currentUserId, currentUserRole, onClose, onMembersChanged }: TeamMembersProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const loadMembers = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        profile:profiles (email, full_name)
      `)
      .eq('team_id', teamId)
      .order('joined_at')

    if (error) {
      console.error('Error cargando miembros:', error)
    } else {
      setMembers(data as unknown as Member[])
    }
    
    setLoading(false)
  }

  useEffect(() => {
    loadMembers()
  }, [teamId])

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    const { error } = await supabase
      .from('team_members')
      .update({ role: newRole })
      .eq('id', memberId)

    if (error) {
      alert('Error al cambiar rol: ' + error.message)
    } else {
      loadMembers()
      onMembersChanged()
    }
  }

  const handleRemove = async (member: Member) => {
    const name = member.profile.full_name || member.profile.email
    
    if (!confirm(`¿Estás seguro de remover a ${name} del equipo?`)) {
      return
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', member.id)

    if (error) {
      alert('Error al remover miembro: ' + error.message)
    } else {
      loadMembers()
      onMembersChanged()
    }
  }

  const getRoleBadge = (role: UserRole) => {
    const config = {
      owner: { text: 'Owner', color: '#9b59b6' },
      admin: { text: 'Admin', color: '#3498db' },
      member: { text: 'Miembro', color: '#95a5a6' }
    }
    return config[role]
  }

  const canChangeRole = currentUserRole === 'owner'
  const canRemove = (member: Member) => {
    if (member.role === 'owner') return false
    if (currentUserRole === 'owner') return true
    if (currentUserRole === 'admin' && member.role === 'member') return true
    return false
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>👥 {teamName}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p>Cargando miembros...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {members.map(member => (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  gap: '10px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>
                    {member.profile.full_name || member.profile.email}
                    {member.user_id === currentUserId && ' (Tú)'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    {member.profile.email}
                  </div>
                </div>

                {/* Selector de rol o badge */}
                {canChangeRole && member.role !== 'owner' ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      backgroundColor: getRoleBadge(member.role).color,
                      color: 'white',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="admin" style={{ backgroundColor: 'white', color: 'black' }}>Admin</option>
                    <option value="member" style={{ backgroundColor: 'white', color: 'black' }}>Miembro</option>
                  </select>
                ) : (
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: getRoleBadge(member.role).color
                  }}>
                    {getRoleBadge(member.role).text}
                  </span>
                )}

                {/* Botón remover */}
                {canRemove(member) && (
                  <button
                    onClick={() => handleRemove(member)}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e0e0e0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default TeamMembers