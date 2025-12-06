import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Team, UserRole } from './types/database.types'
import CreateTeam from './CreateTeam'
import InviteMember from './InviteMember'
import TeamMembers from './TeamMembers'

interface TeamWithRole extends Team {
  role: UserRole
}

interface TeamSelectorProps {
  currentUserId: string
  onTeamChange: (teamId: string | null, role: UserRole | null) => void
}

function TeamSelector({ currentUserId, onTeamChange }: TeamSelectorProps) {
  const [teams, setTeams] = useState<TeamWithRole[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)

  const loadTeams = async () => {
    setLoading(true)

    // Cargar equipos donde el usuario es miembro, junto con su rol
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        role,
        teams (*)
      `)
      .eq('user_id', currentUserId)

    if (error) {
      console.error('Error cargando equipos:', error)
    } else if (data) {
      const teamsWithRole: TeamWithRole[] = data.map((item: any) => ({
        ...item.teams,
        role: item.role as UserRole
      }))
      setTeams(teamsWithRole)
    }

    setLoading(false)
  }
  const handleTeamCreated = () => {
      loadTeams()
    }
  useEffect(() => {
    loadTeams()
  }, [currentUserId])

  // Notificar al padre cuando cambia la selección
  useEffect(() => {
    if (selectedTeamId === null) {
      // Tareas personales - no hay rol de equipo
      onTeamChange(null, null)
    } else {
      const team = teams.find(t => t.id === selectedTeamId)
      onTeamChange(selectedTeamId, team?.role || null)
    }
  }, [selectedTeamId, teams])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSelectedTeamId(value === 'personal' ? null : value)
  }

  const getRoleBadge = (role: UserRole) => {
    const badges = {
      owner: { text: 'Owner', color: '#9b59b6' },
      admin: { text: 'Admin', color: '#3498db' },
      member: { text: 'Miembro', color: '#95a5a6' }
    }
    return badges[role]
  }

  if (loading) {
    return <div>Cargando equipos...</div>
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      padding: '15px 20px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      flexWrap: 'wrap'
    }}>
      <label style={{ fontWeight: 'bold', fontSize: '16px' }}>
        📁 Contexto:
      </label>
      
      <select
        value={selectedTeamId || 'personal'}
        onChange={handleChange}
        style={{
          padding: '10px 15px',
          fontSize: '16px',
          borderRadius: '6px',
          border: '2px solid #4CAF50',
          backgroundColor: 'white',
          cursor: 'pointer',
          minWidth: '200px'
        }}
      >
        <option value="personal">👤 Tareas Personales</option>
        
        {teams.length > 0 && (
          <optgroup label="Mis Equipos">
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                👥 {team.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {/* Mostrar rol en el equipo seleccionado */}
      {selectedTeamId && (
        <span style={{
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          color: 'white',
          backgroundColor: getRoleBadge(teams.find(t => t.id === selectedTeamId)?.role || 'member').color
        }}>
          {getRoleBadge(teams.find(t => t.id === selectedTeamId)?.role || 'member').text}
        </span>
      )}

      {/* Botón para crear equipo */}
      <button
        onClick={() => setShowCreateModal(true)}
        style={{
          padding: '10px 15px',
          fontSize: '14px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        + Nuevo Equipo
      </button>

      {/* Botón invitar - solo si hay equipo seleccionado y eres owner/admin */}
      {selectedTeamId && ['owner', 'admin'].includes(teams.find(t => t.id === selectedTeamId)?.role || '') && (
        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            padding: '10px 15px',
            fontSize: '14px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          + Invitar
        </button>
      )}

      {/* Botón ver miembros - solo si hay equipo seleccionado */}
      {selectedTeamId && (
        <button
          onClick={() => setShowMembersModal(true)}
          style={{
            padding: '10px 15px',
            fontSize: '14px',
            backgroundColor: '#9b59b6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          👥 Miembros
        </button>
      )}

      {teams.length === 0 && (
        <span style={{ color: '#666', fontSize: '14px' }}>
          No perteneces a ningún equipo todavía
        </span>
      )}

      {/* Modal crear equipo */}
      {showCreateModal && (
        <CreateTeam
          currentUserId={currentUserId}
          onTeamCreated={handleTeamCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Modal invitar miembro */}
      {showInviteModal && selectedTeamId && (
        <InviteMember
          teamId={selectedTeamId}
          teamName={teams.find(t => t.id === selectedTeamId)?.name || ''}
          onMemberAdded={handleTeamCreated}
          onClose={() => setShowInviteModal(false)}
        />
      )}
      {/* Modal ver miembros */}
      {showMembersModal && selectedTeamId && (
        <TeamMembers
          teamId={selectedTeamId}
          teamName={teams.find(t => t.id === selectedTeamId)?.name || ''}
          currentUserId={currentUserId}
          currentUserRole={teams.find(t => t.id === selectedTeamId)?.role || 'member'}
          onClose={() => setShowMembersModal(false)}
          onMembersChanged={handleTeamCreated}
        />
      )}
    </div>
  )
}

export default TeamSelector