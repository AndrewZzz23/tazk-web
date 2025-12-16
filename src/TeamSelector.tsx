import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Team, UserRole } from './types/database.types'
import CreateTeam from './CreateTeam'
import InviteMember from './InviteMember'
import TeamMembers from './TeamMembers'

interface TeamSelectorProps {
  currentUserId: string
  onTeamChange: (teamId: string | null, role: UserRole | null, teamName?: string) => void
}

interface TeamWithRole extends Team {
  role: UserRole
}

function TeamSelector({ currentUserId, onTeamChange }: TeamSelectorProps) {
  const [teams, setTeams] = useState<TeamWithRole[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showInviteMember, setShowInviteMember] = useState(false)
  const [showTeamMembers, setShowTeamMembers] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const loadTeams = async () => {
    setLoading(true)

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
      const teamsWithRole: TeamWithRole[] = data
        .filter((item) => item.teams)
        .map((item) => {
          const team = item.teams as unknown as Team
          return {
            ...team,
            role: item.role as UserRole,
          }
        })
      setTeams(teamsWithRole)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadTeams()
  }, [currentUserId])

  const handleTeamSelect = (teamId: string | null) => {
    setSelectedTeamId(teamId)
    setIsOpen(false)

    if (teamId === null) {
      onTeamChange(null, null)
    } else {
      const team = teams.find((t) => t.id === teamId)
      onTeamChange(teamId, team?.role || null, team?.name)
    }
  }

  const selectedTeam = teams.find((t) => t.id === selectedTeamId)
  const currentRole = selectedTeam?.role || null
  const canManageTeam = currentRole === 'owner' || currentRole === 'admin'

  return (
    <div className="relative">
      {/* Selector principal */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-3 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl hover:border-yellow-400/50 transition-all min-w-[200px]"
          >
            <span className="text-xl">
              {selectedTeamId ? '👥' : '👤'}
            </span>
            <div className="flex-1 text-left">
              <div className="text-white font-medium">
                {selectedTeamId ? selectedTeam?.name : 'Tareas Personales'}
              </div>
              {selectedTeamId && currentRole && (
                <div className="text-xs text-neutral-400">
                  {currentRole === 'owner' ? 'Propietario' : currentRole === 'admin' ? 'Admin' : 'Miembro'}
                </div>
              )}
            </div>
            <span className={`text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {/* Dropdown menu */}
          {isOpen && (
            <>
              {/* Overlay para cerrar */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsOpen(false)} 
              />
              
              <div className="absolute top-full left-0 mt-2 w-72 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl z-20 overflow-hidden">
                {/* Opción personal */}
                <button
                  onClick={() => handleTeamSelect(null)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700 transition-colors ${
                    selectedTeamId === null ? 'bg-yellow-400/10 border-l-2 border-yellow-400' : ''
                  }`}
                >
                  <span className="text-xl">👤</span>
                  <div className="text-left">
                    <div className="text-white font-medium">Tareas Personales</div>
                    <div className="text-xs text-neutral-400">Solo tú</div>
                  </div>
                  {selectedTeamId === null && (
                    <span className="ml-auto text-yellow-400">✓</span>
                  )}
                </button>

                {/* Separador */}
                {teams.length > 0 && (
                  <div className="border-t border-neutral-700 my-1" />
                )}

                {/* Lista de equipos */}
                {loading ? (
                  <div className="px-4 py-3 text-neutral-400 text-sm">
                    Cargando equipos...
                  </div>
                ) : (
                  teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSelect(team.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700 transition-colors ${
                        selectedTeamId === team.id ? 'bg-yellow-400/10 border-l-2 border-yellow-400' : ''
                      }`}
                    >
                      <span className="text-xl">👥</span>
                      <div className="text-left flex-1">
                        <div className="text-white font-medium">{team.name}</div>
                        <div className="text-xs text-neutral-400">
                          {team.role === 'owner' ? 'Propietario' : team.role === 'admin' ? 'Admin' : 'Miembro'}
                        </div>
                      </div>
                      {selectedTeamId === team.id && (
                        <span className="text-yellow-400">✓</span>
                      )}
                    </button>
                  ))
                )}

                {/* Separador */}
                <div className="border-t border-neutral-700 my-1" />

                {/* Crear equipo */}
                <button
                  onClick={() => {
                    setIsOpen(false)
                    setShowCreateTeam(true)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-yellow-400 hover:bg-neutral-700 transition-colors"
                >
                  <span className="text-xl">➕</span>
                  <span className="font-medium">Crear nuevo equipo</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Botones de gestión del equipo */}
        {selectedTeamId && canManageTeam && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowInviteMember(true)}
              className="px-4 py-2.5 bg-yellow-400 text-neutral-900 rounded-xl font-medium hover:bg-yellow-300 transition-colors flex items-center gap-2"
            >
              <span>➕</span>
              <span className="hidden sm:inline">Invitar</span>
            </button>
            <button
              onClick={() => setShowTeamMembers(true)}
              className="px-4 py-2.5 bg-neutral-700 text-white rounded-xl font-medium hover:bg-neutral-600 transition-colors flex items-center gap-2"
            >
              <span>👥</span>
              <span className="hidden sm:inline">Miembros</span>
            </button>
          </div>
        )}
      </div>

      {/* Modales */}
      {showCreateTeam && (
        <CreateTeam
          currentUserId={currentUserId}
          onTeamCreated={() => {
            loadTeams()
            setShowCreateTeam(false)
          }}
          onClose={() => setShowCreateTeam(false)}
        />
      )}

      {showInviteMember && selectedTeamId && selectedTeam && (
        <InviteMember
          teamId={selectedTeamId}
          onMemberAdded={() => {
            loadTeams()
            setShowInviteMember(false)
          }}
          onClose={() => setShowInviteMember(false)}
        />
      )}

      {showTeamMembers && selectedTeamId && selectedTeam && currentRole && (
        <TeamMembers
          teamId={selectedTeamId}
          teamName={selectedTeam.name}
          currentUserId={currentUserId}
          currentUserRole={currentRole}
          onClose={() => setShowTeamMembers(false)}
          onMembersChanged={() => loadTeams()}
        />
      )}
    </div>
  )
}

export default TeamSelector