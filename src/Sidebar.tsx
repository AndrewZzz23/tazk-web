import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { useRealtimeSubscription } from './hooks/useRealtimeSubscription'
import { useTheme } from './ThemeContext'
import { Team, UserRole } from './types/database.types'
import CreateTeam from './CreateTeam'
import InviteMember from './InviteMember'
import TeamMembers from './TeamMembers'
import TeamSettings from './TeamSettings'
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
  MailIcon,
  SettingsIcon
} from './components/iu/AnimatedIcons';
import { ChevronDown, Check, Plus, Users, User, UserPlus, Crown, Shield, LayoutGrid } from 'lucide-react'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import Onboarding from './components/Onboarding'

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
  isMobile?: boolean
  onBottomSheetChange?: (isOpen: boolean) => void
  showFab?: boolean
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
  onShowEmails,
  isMobile = false,
  onBottomSheetChange,
  showFab = true
}: SidebarProps) {
  const { theme } = useTheme()
  const [teams, setTeams] = useState<TeamWithRole[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null)
  const [selectedTeamColor, setSelectedTeamColor] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [showTeamMenu, setShowTeamMenu] = useState(false)
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showInviteMember, setShowInviteMember] = useState(false)
  const [showTeamMembers, setShowTeamMembers] = useState(false)
  const [showTeamSettings, setShowTeamSettings] = useState(false)
  const [showViewsMenu, setShowViewsMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showTeamOnboarding, setShowTeamOnboarding] = useState(false)
  const [newTeamName, setNewTeamName] = useState<string | null>(null)

  // Swipe to close gestures para bottom sheets móviles
  const viewsGesture = useBottomSheetGesture({ onClose: () => setShowViewsMenu(false) })
  const teamGesture = useBottomSheetGesture({ onClose: () => setShowTeamMenu(false) })
  const moreGesture = useBottomSheetGesture({ onClose: () => setShowMoreMenu(false) })

  // Bloquear scroll del body cuando hay un bottom sheet abierto
  const isAnyBottomSheetOpen = showViewsMenu || showTeamMenu || showMoreMenu
  useBodyScrollLock(isMobile && isAnyBottomSheetOpen)

  // Notificar al Dashboard cuando hay un bottom sheet abierto (solo móvil)
  useEffect(() => {
    if (isMobile && onBottomSheetChange) {
      onBottomSheetChange(isAnyBottomSheetOpen)
    }
  }, [isMobile, isAnyBottomSheetOpen, onBottomSheetChange])

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
          setSelectedTeamColor(savedTeam.color)
          setSelectedRole(savedTeam.role)
          onTeamChange(savedTeam.id, savedTeam.role, savedTeam.name)
        }
      }
    }
  }

  useEffect(() => {
    loadTeams()
  }, [currentUserId])

  // Suscripción realtime para cambios en team_members (nuevo equipo, eliminado, rol cambiado)
  useRealtimeSubscription({
    subscriptions: [
      { table: 'team_members', filter: `user_id=eq.${currentUserId}` },
      { table: 'teams' } // Para detectar cambios en nombre/color del equipo o eliminación
    ],
    onchange: useCallback((payload) => {
      // Si se eliminó un equipo
      if (payload.eventType === 'DELETE' && payload.table === 'teams') {
        const deletedTeamId = payload.old?.id
        // Si el equipo eliminado es el seleccionado, cambiar a personal
        if (deletedTeamId && deletedTeamId === selectedTeamId) {
          setSelectedTeamId(null)
          setSelectedTeamName(null)
          setSelectedTeamColor(null)
          setSelectedRole(null)
          localStorage.removeItem('tazk_selected_team')
          onTeamChange(null, null)
        }
      }
      // Recargar la lista de equipos
      loadTeams()
    }, [currentUserId, selectedTeamId, onTeamChange]),
    enabled: !!currentUserId
  })

  const handleTeamSelect = (teamId: string | null) => {
    setShowTeamMenu(false)

    if (teamId === null) {
      setSelectedTeamId(null)
      setSelectedTeamName(null)
      setSelectedTeamColor(null)
      setSelectedRole(null)
      onTeamChange(null, null)
    } else {
      const team = teams.find((t) => t.id === teamId)
      setSelectedTeamId(teamId)
      setSelectedTeamName(team?.name || null)
      setSelectedTeamColor(team?.color || null)
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

  // Filtrar herramientas según el rol en el equipo
  // Owner: todo, Admin: métricas y actividad, Member: métricas y actividad
  const toolItems = [
    { id: 'metrics', icon: <ChartIcon size={20} />, label: 'Métricas', onClick: onShowMetrics },
    { id: 'activity', icon: <ActivityIcon size={20} />, label: 'Actividad', onClick: onShowActivityLogs },
    // Estados y Correos solo para owner (o si no hay equipo seleccionado = tareas personales)
    ...(selectedRole === 'owner' || !selectedTeamId ? [
      { id: 'statuses', icon: <PaletteIcon size={20} />, label: 'Estados', onClick: onShowStatuses },
      { id: 'emails', icon: <MailIcon size={20} />, label: 'Correos', onClick: onShowEmails },
    ] : []),
  ]

  // Mobile bottom navigation
  if (isMobile) {
    return (
      <>
        {/* Liquid Glass Bottom Navigation Bar - iOS 26 Style */}
        <div className={`fixed bottom-4 left-4 z-40 safe-area-bottom ${showFab ? 'right-20' : 'right-4'}`}>
          <div
            className="relative flex items-center justify-around px-2 py-2 rounded-[24px] overflow-hidden"
            style={{
              background: theme === 'dark'
                ? 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.08) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0.8) 100%)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: theme === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.18)'
                : '1px solid rgba(255, 255, 255, 0.6)',
              boxShadow: theme === 'dark'
                ? `
                  0 8px 32px rgba(0, 0, 0, 0.35),
                  0 2px 8px rgba(0, 0, 0, 0.2),
                  inset 0 1px 1px rgba(255, 255, 255, 0.15),
                  inset 0 -1px 1px rgba(0, 0, 0, 0.1)
                `
                : `
                  0 8px 32px rgba(0, 0, 0, 0.12),
                  0 2px 8px rgba(0, 0, 0, 0.08),
                  inset 0 1px 1px rgba(255, 255, 255, 0.9),
                  inset 0 -1px 1px rgba(0, 0, 0, 0.05)
                `
            }}
          >
            {/* Liquid highlight effect */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: theme === 'dark'
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.05) 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.3) 100%)',
                borderRadius: 'inherit'
              }}
            />
            {/* Team selector */}
            <button
              onClick={() => setShowTeamMenu(true)}
              className={`relative z-10 flex flex-col items-center justify-center p-1.5 rounded-xl transition-all active:scale-95 ${
                theme === 'dark'
                  ? 'text-white/70 hover:text-yellow-400'
                  : 'text-neutral-600 hover:text-yellow-600'
              }`}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md"
                style={selectedTeamId ? {
                  backgroundColor: selectedTeamColor || '#facc15'
                } : {
                  background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
                }}
              >
                {selectedTeamId ? (
                  <Users className="w-4 h-4 text-neutral-900" />
                ) : (
                  <User className={`w-4 h-4 ${theme === 'dark' ? 'text-white/60' : 'text-neutral-500'}`} />
                )}
              </div>
            </button>

            {/* Views selector */}
            <button
              onClick={() => setShowViewsMenu(true)}
              className={`relative z-10 flex items-center justify-center p-2 rounded-xl transition-all active:scale-95 ${
                theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
              }`}
            >
              {currentView === 'list' && <ListIcon size={22} />}
              {currentView === 'kanban' && <KanbanIcon size={22} />}
              {currentView === 'calendar' && <CalendarIcon size={22} />}
            </button>

            {/* Notifications */}
            <button
              onClick={onShowNotifications}
              className={`relative z-10 flex items-center justify-center p-2 rounded-xl transition-all active:scale-95 ${
                theme === 'dark'
                  ? 'text-white/70 hover:text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span className="relative">
                <BellIcon size={22} />
                {notificationCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-yellow-400 text-neutral-900 text-[9px] font-bold rounded-full flex items-center justify-center shadow-md">
                    {notificationCount}
                  </span>
                )}
              </span>
            </button>

            {/* More options */}
            <button
              onClick={() => setShowMoreMenu(true)}
              className={`relative z-10 flex items-center justify-center p-2 rounded-xl transition-all active:scale-95 ${
                theme === 'dark'
                  ? 'text-white/70 hover:text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <LayoutGrid className="w-[22px] h-[22px]" />
            </button>
          </div>
        </div>

        {/* Team selector modal for mobile */}
        {showTeamMenu && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowTeamMenu(false)} />
            <div
              className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 rounded-t-3xl z-50 max-h-[70vh] overflow-hidden safe-area-bottom"
              style={{
                ...teamGesture.dragStyle,
                transition: teamGesture.isDragging ? 'none' : 'transform 0.3s ease-out'
              }}
              {...teamGesture.containerProps}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-neutral-700 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-4 py-2 border-b border-neutral-800">
                <h3 className="text-white font-semibold">Espacios de trabajo</h3>
              </div>

              <div ref={teamGesture.scrollRef} className="overflow-y-auto max-h-[50vh] py-2">
                {/* Personal */}
                <button
                  onClick={() => handleTeamSelect(null)}
                  className={`w-full flex items-center gap-3 px-4 py-3 ${
                    selectedTeamId === null ? 'bg-yellow-400/10' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedTeamId === null
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                      : 'bg-neutral-700'
                  }`}>
                    <User className={`w-5 h-5 ${selectedTeamId === null ? 'text-white' : 'text-neutral-400'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${selectedTeamId === null ? 'text-yellow-400' : 'text-white'}`}>
                      Tareas Personales
                    </div>
                    <div className="text-neutral-500 text-sm">Solo tú</div>
                  </div>
                  {selectedTeamId === null && (
                    <Check className="w-5 h-5 text-yellow-400" />
                  )}
                </button>

                {/* Teams */}
                {teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => handleTeamSelect(team.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 ${
                      selectedTeamId === team.id ? 'bg-yellow-400/10' : ''
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: team.color || '#facc15' }}
                    >
                      <Users className="w-5 h-5 text-neutral-900" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className={`font-medium ${selectedTeamId === team.id ? 'text-yellow-400' : 'text-white'}`}>
                        {team.name}
                      </div>
                      <div className="flex items-center gap-1 text-neutral-500 text-sm">
                        {getRoleIcon(team.role)}
                        <span>{getRoleLabel(team.role)}</span>
                      </div>
                    </div>
                    {selectedTeamId === team.id && (
                      <Check className="w-5 h-5 text-yellow-400" />
                    )}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="border-t border-neutral-800 p-4 space-y-2">
                {/* Opciones del equipo seleccionado (solo para admin/owner) */}
                {selectedTeamId && canManageTeam && (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowTeamMenu(false)
                          setShowInviteMember(true)
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-neutral-800 text-white rounded-xl font-medium"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Invitar</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowTeamMenu(false)
                          setShowTeamMembers(true)
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-neutral-800 text-white rounded-xl font-medium"
                      >
                        <Users className="w-4 h-4" />
                        <span>Miembros</span>
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setShowTeamMenu(false)
                        setShowTeamSettings(true)
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-800 text-white rounded-xl font-medium"
                    >
                      <SettingsIcon size={16} />
                      <span>Configuración del equipo</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    setShowTeamMenu(false)
                    setShowCreateTeam(true)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-yellow-400 text-neutral-900 rounded-xl font-medium"
                >
                  <Plus className="w-5 h-5" />
                  <span>Crear nuevo equipo</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Views selector modal for mobile */}
        {showViewsMenu && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowViewsMenu(false)} />
            <div
              className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 rounded-t-3xl z-50 overflow-hidden safe-area-bottom"
              style={{
                ...viewsGesture.dragStyle,
                transition: viewsGesture.isDragging ? 'none' : 'transform 0.3s ease-out'
              }}
              {...viewsGesture.containerProps}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-neutral-700 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-4 py-2 border-b border-neutral-800">
                <h3 className="text-white font-semibold">Seleccionar vista</h3>
              </div>

              <div className="py-2 pb-6">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id)
                      setShowViewsMenu(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 ${
                      currentView === item.id ? 'bg-yellow-400/10' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      currentView === item.id
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-neutral-900'
                        : 'bg-neutral-700 text-neutral-400'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <div className={`font-medium ${currentView === item.id ? 'text-yellow-400' : 'text-white'}`}>
                        {item.label}
                      </div>
                      <div className="text-neutral-500 text-sm">
                        {item.id === 'list' && 'Ver tareas en lista'}
                        {item.id === 'kanban' && 'Organizar por estados'}
                        {item.id === 'calendar' && 'Ver por fechas'}
                      </div>
                    </div>
                    {currentView === item.id && (
                      <Check className="w-5 h-5 text-yellow-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* More options modal for mobile */}
        {showMoreMenu && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowMoreMenu(false)} />
            <div
              className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 rounded-t-3xl z-50 overflow-hidden safe-area-bottom"
              style={{
                ...moreGesture.dragStyle,
                transition: moreGesture.isDragging ? 'none' : 'transform 0.3s ease-out'
              }}
              {...moreGesture.containerProps}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-neutral-700 rounded-full" />
              </div>

              <div className="py-2 pb-6">
                {/* Métricas - disponible para todos */}
                <button
                  onClick={() => {
                    onShowMetrics()
                    setShowMoreMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-neutral-700 text-neutral-400">
                    <ChartIcon size={20} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-white">Métricas</div>
                    <div className="text-neutral-500 text-sm">Estadísticas y rendimiento</div>
                  </div>
                </button>

                {/* Actividad - disponible para todos */}
                <button
                  onClick={() => {
                    onShowActivityLogs()
                    setShowMoreMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-neutral-700 text-neutral-400">
                    <ActivityIcon size={20} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-white">Actividad</div>
                    <div className="text-neutral-500 text-sm">Historial de cambios</div>
                  </div>
                </button>

                {/* Estados - solo para owner o tareas personales */}
                {(selectedRole === 'owner' || !selectedTeamId) && (
                  <button
                    onClick={() => {
                      onShowStatuses()
                      setShowMoreMenu(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-neutral-700 text-neutral-400">
                      <PaletteIcon size={20} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-white">Estados</div>
                      <div className="text-neutral-500 text-sm">Personalizar estados de tareas</div>
                    </div>
                    <Crown className="w-4 h-4 text-yellow-400" />
                  </button>
                )}

              </div>
            </div>
          </>
        )}

        {/* Modales */}
        {showCreateTeam && (
          <CreateTeam
            currentUserId={currentUserId}
            onTeamCreated={(team) => {
              // Seleccionar el nuevo equipo
              setSelectedTeamId(team.id)
              setSelectedTeamName(team.name)
              setSelectedTeamColor(team.color)
              setSelectedRole('owner')
              localStorage.setItem('tazk_selected_team', team.id)
              onTeamChange(team.id, 'owner', team.name)
              loadTeams()
              setShowCreateTeam(false)
              // Mostrar onboarding del equipo
              setNewTeamName(team.name)
              setShowTeamOnboarding(true)
            }}
            onClose={() => setShowCreateTeam(false)}
          />
        )}

        {/* Onboarding para equipos nuevos */}
        {showTeamOnboarding && newTeamName && (
          <Onboarding
            type="team"
            teamName={newTeamName}
            onComplete={() => {
              setShowTeamOnboarding(false)
              setNewTeamName(null)
            }}
            onSkip={() => {
              setShowTeamOnboarding(false)
              setNewTeamName(null)
            }}
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

        {showTeamSettings && selectedTeamId && selectedRole && selectedTeamName && (
          <TeamSettings
            teamId={selectedTeamId}
            teamName={selectedTeamName}
            teamColor={selectedTeamColor}
            currentUserId={currentUserId}
            currentUserRole={selectedRole}
            onClose={() => setShowTeamSettings(false)}
            onTeamDeleted={() => {
              setShowTeamSettings(false)
              setSelectedTeamId(null)
              setSelectedTeamName(null)
              setSelectedTeamColor(null)
              setSelectedRole(null)
              onTeamChange(null, null)
              loadTeams()
            }}
            onTeamUpdated={(newName, newColor) => {
              setSelectedTeamName(newName)
              if (newColor) setSelectedTeamColor(newColor)
              loadTeams()
            }}
          />
        )}
      </>
    )
  }

  // Desktop sidebar
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
                <div className="flex items-center text-yellow-400">
                  <ZapIcon size={32} />
                  <span className="text-xl font-bold">Tazk</span>
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
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  !selectedTeamId ? 'bg-neutral-700' : ''
                }`}
                style={selectedTeamId ? {
                  backgroundColor: selectedTeamColor || '#facc15',
                  boxShadow: `0 10px 15px -3px ${selectedTeamColor || '#facc15'}33`
                } : undefined}
              >
                {selectedTeamId ? (
                  <Users className="w-4.5 h-4.5 text-neutral-900" />
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
                      {teams.map(team => {
                        const teamColor = team.color || '#facc15'
                        return (
                          <button
                            key={team.id}
                            onClick={() => handleTeamSelect(team.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-700/50 transition-all duration-150 ${
                              selectedTeamId === team.id ? 'bg-yellow-400/10' : ''
                            }`}
                          >
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                              style={{
                                backgroundColor: teamColor,
                                boxShadow: selectedTeamId === team.id ? `0 10px 15px -3px ${teamColor}40` : undefined
                              }}
                            >
                              <Users className="w-4.5 h-4.5 text-neutral-900" />
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
                        )
                      })}
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
              <button
                onClick={() => setShowTeamSettings(true)}
                className="flex items-center justify-center p-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium hover:bg-neutral-700 hover:text-white transition-all duration-200"
                title="Configuración del equipo"
              >
                <SettingsIcon size={14} />
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
          onTeamCreated={(team) => {
            // Seleccionar el nuevo equipo
            setSelectedTeamId(team.id)
            setSelectedTeamName(team.name)
            setSelectedTeamColor(team.color)
            setSelectedRole('owner')
            localStorage.setItem('tazk_selected_team', team.id)
            onTeamChange(team.id, 'owner', team.name)
            loadTeams()
            setShowCreateTeam(false)
            // Mostrar onboarding del equipo
            setNewTeamName(team.name)
            setShowTeamOnboarding(true)
          }}
          onClose={() => setShowCreateTeam(false)}
        />
      )}

      {/* Onboarding para equipos nuevos (desktop) */}
      {showTeamOnboarding && newTeamName && (
        <Onboarding
          type="team"
          teamName={newTeamName}
          onComplete={() => {
            setShowTeamOnboarding(false)
            setNewTeamName(null)
          }}
          onSkip={() => {
            setShowTeamOnboarding(false)
            setNewTeamName(null)
          }}
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

      {showTeamSettings && selectedTeamId && selectedRole && selectedTeamName && (
        <TeamSettings
          teamId={selectedTeamId}
          teamName={selectedTeamName}
          teamColor={selectedTeamColor}
          currentUserId={currentUserId}
          currentUserRole={selectedRole}
          onClose={() => setShowTeamSettings(false)}
          onTeamDeleted={() => {
            setShowTeamSettings(false)
            // Switch to personal tasks
            setSelectedTeamId(null)
            setSelectedTeamName(null)
            setSelectedTeamColor(null)
            setSelectedRole(null)
            onTeamChange(null, null)
            // Reload teams list
            loadTeams()
          }}
          onTeamUpdated={(newName, newColor) => {
            setSelectedTeamName(newName)
            if (newColor) {
              setSelectedTeamColor(newColor)
            }
            loadTeams()
          }}
        />
      )}
    </>
  )
}

export default Sidebar
