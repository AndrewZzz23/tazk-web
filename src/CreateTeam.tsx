import { useState } from 'react'
import { supabase } from './supabaseClient'

interface CreateTeamProps {
  currentUserId: string
  onTeamCreated: () => void
  onClose: () => void
}

function CreateTeam({ currentUserId, onTeamCreated, onClose }: CreateTeamProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      alert('El nombre del equipo es obligatorio')
      return
    }

    setLoading(true)

    // 1. Crear el equipo
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ name: name.trim(), created_by: currentUserId })
      .select()
      .single()

    if (teamError) {
      console.error('Error creando equipo:', teamError)
      alert('Error al crear el equipo: ' + teamError.message)
      setLoading(false)
      return
    }

    // 2. Agregar al creador como owner
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({ 
        team_id: team.id, 
        user_id: currentUserId, 
        role: 'owner' 
      })

    setLoading(false)

    if (memberError) {
      console.error('Error agregando owner:', memberError)
      alert('Error al configurar el equipo: ' + memberError.message)
    } else {
      alert('¡Equipo creado exitosamente!')
      onTeamCreated()
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
        <h2 style={{ marginTop: 0 }}>➕ Crear Nuevo Equipo</h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Nombre del equipo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Marketing, Desarrollo, Ventas..."
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
                backgroundColor: loading ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTeam