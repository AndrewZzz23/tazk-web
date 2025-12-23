import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Team, UserRole } from './types/database.types'
import CreateTeam from './CreateTeam'
import InviteMember from './InviteMember'
import TeamMembers from './TeamMembers'

interface TeamWithRole extends Team {
  role: UserRole
}

interface SidebarProps {
  currentUserId: string
  currentView: string
  onViewChange: (view: string) => void
  onTeamChange: (teamId: string | null, role: UserRole | null, teamName?: string) => void
  notificationCount: number
  onShowNotifications: () => void
  onShowMetrics: () => void
  onShowActivityLogs: () => void
  onShowStatuses: () => void
  onLogout: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  refreshKey?: number
}

function Sidebar({
  currentUserId,
  currentView,
  onViewChange,
  onTeamChange,
  notificationCount,
  onShowNotifications,
  onShowMetrics,
  onShowActivityLogs,
  onShowStatuses,
  isCollapsed,
  onToggleCollapse,
  refreshKey
}: SidebarProps) {
  const [teams, setTeams] = useState<TeamWithRole[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [showTeamMenu, setShowTeamMenu] = useState(false)
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showInviteMember, setShowInviteMember] = useState(false)
  const [showTeamMembers, setShowTeamMembers] = useState(false)

  const loadTeams = async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        role,
        teams (*)
      `)
      .eq('user_id', currentUserId)
    if (!error && data) {
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
  }

  useEffect(() => {
    loadTeams()
  }, [currentUserId, refreshKey])  // <-- Agregar refreshKey aquí

  useEffect(() => {
    loadTeams()
  }, [currentUserId])

  const handleTeamSelect = (teamId: string | null) => {
    setShowTeamMenu(false)
    
    if (teamId === null) {
      setSelectedTeamId(null)
      setSelectedTeamName(null)
      setSelectedRole(null)
      onTeamChange(null, null)
    } else {
      const team = teams.find((t) => t.id === teamId)
      setSelectedTeamId(teamId)
      setSelectedTeamName(team?.name || null)
      setSelectedRole(team?.role || null)
      onTeamChange(teamId, team?.role || null, team?.name)
    }
  }

  const canManageTeam = selectedRole === 'owner' || selectedRole === 'admin'

  const navItems = [
    { id: 'list', icon: '☰', label: 'Lista' },
    { id: 'kanban', icon: '▦', label: 'Kanban' },
    { id: 'calendar', icon: '📅', label: 'Calendario' },
  ]

  const toolItems = [
    { id: 'metrics', icon: '📊', label: 'Métricas', onClick: onShowMetrics },
    { id: 'activity', icon: '📋', label: 'Actividad', onClick: onShowActivityLogs },
    { id: 'statuses', icon: '🎨', label: 'Estados', onClick: onShowStatuses },
  ]

  return (
    <>
      <div 
        className={`fixed left-0 top-0 h-full bg-neutral-900 border-r border-neutral-800 z-40 transition-all duration-300 flex flex-col ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            {isCollapsed ? (
              <button
                onClick={onToggleCollapse}
                className="w-full flex items-center justify-center p-2 text-neutral-500 hover:text-yellow-400 transition-colors"
              >
                <span>▶</span>
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <span className="text-xl font-bold text-yellow-400">Tazk</span>
                </div>
                <button
                  onClick={onToggleCollapse}
                  className="p-2 text-neutral-500 hover:text-white transition-colors"
                >
                  ◀
                </button>
              </>
            )}
          </div>
        </div>

        {/* Selector de Equipo */}
        <div className="p-2 border-b border-neutral-800">
          <div className="relative">
            <button
              onClick={() => {
                if (isCollapsed) {
                  onToggleCollapse()
                  setTimeout(() => setShowTeamMenu(true), 50)
                } else {
                  setShowTeamMenu(!showTeamMenu)
                }
              }}
              className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800 transition-colors ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title={isCollapsed ? (selectedTeamName || 'Personal') : undefined}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                selectedTeamId ? 'bg-yellow-400/20 text-yellow-400' : 'bg-neutral-700 text-neutral-400'
              }`}>
                {selectedTeamId ? '👥' : '👤'}
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 text-left">
                    <div className="text-white text-sm font-medium truncate">
                      {selectedTeamName || 'Personal'}
                    </div>
                    {selectedRole && (
                      <div className="text-neutral-500 text-xs">
                        {selectedRole === 'owner' ? 'Propietario' : selectedRole === 'admin' ? 'Admin' : 'Miembro'}
                      </div>
                    )}
                  </div>
                  <span className={`text-neutral-500 text-xs transition-transform ${showTeamMenu ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </>
              )}
            </button>

            {/* Dropdown de equipos */}
            {showTeamMenu && !isCollapsed && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTeamMenu(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl z-20 overflow-hidden">
                  {/* Personal */}
                  <button
                    onClick={() => handleTeamSelect(null)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-neutral-700 transition-colors ${
                      selectedTeamId === null ? 'bg-yellow-400/10' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-neutral-700 flex items-center justify-center">
                      👤
                    </div>
                    <span className="text-white text-sm">Personal</span>
                    {selectedTeamId === null && <span className="ml-auto text-yellow-400">✓</span>}
                  </button>

                  {teams.length > 0 && <div className="border-t border-neutral-700" />}

                  {/* Equipos */}
                  {teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSelect(team.id)}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-neutral-700 transition-colors ${
                        selectedTeamId === team.id ? 'bg-yellow-400/10' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-yellow-400/20 text-yellow-400 flex items-center justify-center">
                        👥
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-white text-sm">{team.name}</div>
                        <div className="text-neutral-500 text-xs">
                          {team.role === 'owner' ? 'Propietario' : team.role === 'admin' ? 'Admin' : 'Miembro'}
                        </div>
                      </div>
                      {selectedTeamId === team.id && <span className="text-yellow-400">✓</span>}
                    </button>
                  ))}

                  <div className="border-t border-neutral-700" />

                  {/* Crear equipo */}
                  <button
                    onClick={() => {
                      setShowTeamMenu(false)
                      setShowCreateTeam(true)
                    }}
                    className="w-full flex items-center gap-3 p-3 text-yellow-400 hover:bg-neutral-700 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg border-2 border-dashed border-yellow-400/50 flex items-center justify-center">
                      +
                    </div>
                    <span className="text-sm">Crear equipo</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Acciones del equipo */}
          {!isCollapsed && selectedTeamId && canManageTeam && (
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => setShowInviteMember(true)}
                className="flex-1 px-2 py-1.5 bg-neutral-800 text-neutral-400 rounded-lg text-xs hover:bg-yellow-400 hover:text-neutral-900 transition-colors"
              >
                + Invitar
              </button>
              <button
                onClick={() => setShowTeamMembers(true)}
                className="flex-1 px-2 py-1.5 bg-neutral-800 text-neutral-400 rounded-lg text-xs hover:bg-neutral-700 hover:text-white transition-colors"
              >
                👥 Miembros
              </button>
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <div className="p-2">
          <button
            onClick={onShowNotifications}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Notificaciones' : undefined}
          >
            <span className="text-lg relative">
              🔔
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-neutral-900 text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </span>
            {!isCollapsed && <span className="text-sm">Notificaciones</span>}
          </button>
        </div>

        {/* Navegación */}
        <div className=" flex-1 p-2 border-t border-neutral-800">
          {!isCollapsed && (
            <div className="text-[11px] text-neutral-600 uppercase tracking-wider px-3 mb-2">
              Vistas
            </div>
          )}
          <nav className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  isCollapsed ? 'justify-center' : ''
                } ${
                  currentView === item.id
                    ? 'bg-yellow-400/10 text-yellow-400'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="text-lg">{item.icon}</span>
                {!isCollapsed && <span className="text-sm">{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Herramientas */}
          <div className="mt-4 p-2 border-t border-neutral-800">
            {!isCollapsed && (
              <div className="text-[11px] text-neutral-600 uppercase tracking-wider px-3 mb-2">
                Herramientas
              </div>
            )}
            <nav className="space-y-1">
              {toolItems.map(item => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${
                    isCollapsed ? 'justify-center' : ''
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!isCollapsed && <span className="text-sm">{item.label}</span>}
                </button>
              ))}
            </nav>
          </div>
        </div>

        
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

      {showInviteMember && selectedTeamId && (
        <InviteMember
          teamId={selectedTeamId}
          onMemberInvited={() => {}}
          onClose={() => setShowInviteMember(false)}
        />
      )}

      {showTeamMembers && selectedTeamId && selectedRole && (
        <TeamMembers
          teamId={selectedTeamId}
          currentUserId={currentUserId}
          currentUserRole={selectedRole}
          onClose={() => setShowTeamMembers(false)}
        />
      )}
    </>
  )
}

export default Sidebar