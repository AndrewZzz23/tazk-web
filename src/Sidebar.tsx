import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Team, UserRole } from './types/database.types'
import CreateTeam from './CreateTeam'
import InviteMember from './InviteMember'
import TeamMembers from './TeamMembers'
import {
  ZapIcon,
  ListIcon,
  KanbanIcon,
  CalendarIcon,
  ChartIcon,
  ActivityIcon,
  PaletteIcon,
  BellIcon,
  PanelLeftCloseIcon,
  MailIcon
} from './components/iu/AnimatedIcons';
import { ChevronDown, Check, Plus, Users, User, UserPlus, Crown, Shield } from 'lucide-react'

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
  onShowEmails: () => void
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
  onShowEmails
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

      // Restaurar equipo seleccionado desde localStorage
      const savedTeamId = localStorage.getItem('tazk_selected_team')
      if (savedTeamId) {
        const savedTeam = teamsWithRole.find(t => t.id === savedTeamId)
        if (savedTeam) {
          setSelectedTeamId(savedTeam.id)
          setSelectedTeamName(savedTeam.name)
          setSelectedRole(savedTeam.role)
          onTeamChange(savedTeam.id, savedTeam.role, savedTeam.name)
        }
      }
    }
  }

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

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3 text-yellow-400" />
      case 'admin':
        return <Shield className="w-3 h-3 text-blue-400" />
      default:
        return null
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return 'Propietario'
      case 'admin':
        return 'Admin'
      default:
        return 'Miembro'
    }
  }

  const navItems = [
    { id: 'list', icon: <ListIcon size={20} />, label: 'Lista' },
    { id: 'kanban', icon: <KanbanIcon size={20} />, label: 'Kanban' },
    { id: 'calendar', icon: <CalendarIcon size={20} />, label: 'Calendario' },
  ]

  const toolItems = [
    { id: 'metrics', icon: <ChartIcon size={20} />, label: 'Métricas', onClick: onShowMetrics },
    { id: 'activity', icon: <ActivityIcon size={20} />, label: 'Actividad', onClick: onShowActivityLogs },
    { id: 'statuses', icon: <PaletteIcon size={20} />, label: 'Estados', onClick: onShowStatuses },
    { id: 'emails', icon: <MailIcon size={20} />, label: 'Correos', onClick: onShowEmails },
  ]

  return (
    <>
      <div
        className={`fixed left-0 top-0 h-full bg-neutral-900 border-r border-neutral-800 z-40 transition-all duration-300 flex flex-col ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Header */}
        <div className="h-[73px] px-4 border-b border-neutral-800 flex items-center">
          <div className="flex items-center justify-between w-full">
            {isCollapsed ? (
              <button
                onClick={onToggleCollapse}
                className="w-full flex items-center justify-center text-yellow-400 hover:text-yellow-300 transition-colors"
                title="Expandir sidebar"
              >
                <ZapIcon size={32} />
              </button>
            ) : (
              <>
                <div className="flex items-center">
                  <ZapIcon size={32} />
                  <span className="text-xl font-bold text-yellow-400">Tazk</span>
                </div>
                <button
                  onClick={onToggleCollapse}
                  className="p-1.5 text-neutral-500 hover:text-yellow-400 hover:bg-neutral-800 rounded-lg transition-colors"
                  title="Colapsar sidebar"
                >
                  <PanelLeftCloseIcon size={20} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Selector de Equipo */}
        <div className="p-3 border-b border-neutral-800">
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
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-800/80 transition-all duration-200 ${
                isCollapsed ? 'justify-center' : ''
              } ${showTeamMenu ? 'bg-neutral-800 ring-1 ring-yellow-400/30' : ''}`}
              title={isCollapsed ? (selectedTeamName || 'Personal') : undefined}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                selectedTeamId
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-400/20'
                  : 'bg-neutral-700'
              }`}>
                {selectedTeamId ? (
                  <Users className="w-4.5 h-4.5 text-white" />
                ) : (
                  <User className="w-4.5 h-4.5 text-neutral-400" />
                )}
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {selectedTeamName || 'Personal'}
                    </div>
                    {selectedRole ? (
                      <div className="flex items-center gap-1 text-neutral-500 text-xs">
                        {getRoleIcon(selectedRole)}
                        <span>{getRoleLabel(selectedRole)}</span>
                      </div>
                    ) : (
                      <div className="text-neutral-500 text-xs">Solo tú</div>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${showTeamMenu ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>

            {/* Dropdown de equipos */}
            {showTeamMenu && !isCollapsed && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTeamMenu(false)} />
                <div className="absolute left-0 right-0 top-full mt-2 bg-neutral-800 border border-neutral-700 rounded-2xl shadow-2xl z-20 overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-2.5 border-b border-neutral-700/50">
                    <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Espacios de trabajo</p>
                  </div>

                  <div className="py-1.5">
                    {/* Personal */}
                    <button
                      onClick={() => handleTeamSelect(null)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-700/50 transition-all duration-150 ${
                        selectedTeamId === null ? 'bg-yellow-400/10' : ''
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        selectedTeamId === null
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-400/30'
                          : 'bg-neutral-700'
                      }`}>
                        <User className={`w-4.5 h-4.5 ${selectedTeamId === null ? 'text-white' : 'text-neutral-400'}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className={`text-sm font-medium ${selectedTeamId === null ? 'text-yellow-400' : 'text-white'}`}>
                          Tareas Personales
                        </div>
                        <div className="text-neutral-500 text-xs">Solo tú</div>
                      </div>
                      {selectedTeamId === null && (
                        <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                          <Check className="w-3 h-3 text-neutral-900" />
                        </div>
                      )}
                    </button>

                    {teams.length > 0 && (
                      <div className="px-4 py-2 mt-1">
                        <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider">Equipos</p>
                      </div>
                    )}

                    {/* Equipos */}
                    <div className="max-h-[200px] overflow-y-auto">
                      {teams.map(team => (
                        <button
                          key={team.id}
                          onClick={() => handleTeamSelect(team.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-700/50 transition-all duration-150 ${
                            selectedTeamId === team.id ? 'bg-yellow-400/10' : ''
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                            selectedTeamId === team.id
                              ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-400/30'
                              : 'bg-neutral-700'
                          }`}>
                            <Users className={`w-4.5 h-4.5 ${selectedTeamId === team.id ? 'text-white' : 'text-neutral-400'}`} />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className={`text-sm font-medium truncate ${selectedTeamId === team.id ? 'text-yellow-400' : 'text-white'}`}>
                              {team.name}
                            </div>
                            <div className="flex items-center gap-1 text-neutral-500 text-xs">
                              {getRoleIcon(team.role)}
                              <span>{getRoleLabel(team.role)}</span>
                            </div>
                          </div>
                          {selectedTeamId === team.id && (
                            <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-neutral-900" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Crear equipo */}
                  <div className="border-t border-neutral-700/50 p-1.5">
                    <button
                      onClick={() => {
                        setShowTeamMenu(false)
                        setShowCreateTeam(true)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-yellow-400 hover:bg-yellow-400/10 rounded-xl transition-all duration-150"
                    >
                      <div className="w-9 h-9 rounded-xl bg-yellow-400/20 flex items-center justify-center">
                        <Plus className="w-4.5 h-4.5 text-yellow-400" />
                      </div>
                      <span className="text-sm font-medium">Crear nuevo equipo</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Acciones del equipo */}
          {!isCollapsed && selectedTeamId && canManageTeam && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowInviteMember(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-neutral-900 rounded-lg text-xs font-medium hover:shadow-lg hover:shadow-yellow-400/20 transition-all duration-200"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invitar</span>
              </button>
              <button
                onClick={() => setShowTeamMembers(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium hover:bg-neutral-700 hover:text-white transition-all duration-200"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Miembros</span>
              </button>
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <div className="p-2 border-t border-neutral-800">
          <button
            onClick={onShowNotifications}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Notificaciones' : undefined}
          >
            <span className="relative">
              <BellIcon size={20} />
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
        <div className="flex-1 p-2 border-t border-neutral-800">
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
                <span>{item.icon}</span>
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
                  <span>{item.icon}</span>
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
