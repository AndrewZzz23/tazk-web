import { useState } from 'react'
import { supabase } from './supabaseClient'

interface InviteMemberProps {
  teamId: string
  teamName: string
  onMemberAdded: () => void
  onClose: () => void
}

function InviteMember({ teamId, teamName, onMemberAdded, onClose }: InviteMemberProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      alert('El email es obligatorio')
      return
    }

    setLoading(true)

    // 1. Buscar usuario por email
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (userError || !user) {
      alert('No se encontró un usuario con ese email. El usuario debe tener una cuenta en Tazk.')
      setLoading(false)
      return
    }

    // 2. Verificar que no sea ya miembro
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      alert('Este usuario ya es miembro del equipo')
      setLoading(false)
      return
    }

    // 3. Agregar como miembro
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: user.id,
        role: role
      })

    setLoading(false)

    if (memberError) {
      console.error('Error agregando miembro:', memberError)
      alert('Error al agregar miembro: ' + memberError.message)
    } else {
      alert(`¡${email} ha sido agregado como ${role === 'admin' ? 'Administrador' : 'Miembro'}!`)
      onMemberAdded()
      onClose()
    }
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
        maxWidth: '400px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <h2 style={{ marginTop: 0 }}>👥 Invitar a {teamName}</h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Email del usuario *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Rol
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                borderRadius: '6px',
                border: '1px solid #ccc'
              }}
            >
              <option value="member">Miembro - Solo ve y actualiza sus tareas</option>
              <option value="admin">Admin - Puede crear tareas e invitar</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '16px',
                backgroundColor: '#e0e0e0',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '16px',
                backgroundColor: loading ? '#ccc' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Invitando...' : 'Invitar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InviteMember