import { supabase } from './supabaseClient'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRealtimeSubscription } from './hooks/useRealtimeSubscription'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { Task, UserRole } from './types/database.types'
import { useTheme } from './ThemeContext'
import Sidebar from './Sidebar'
import CreateTask from './CreateTask'
import TaskList from './TaskList'
import ActivityLogs from './ActivityLogs'
import KanbanBoard from './KanbanBoard'
import CalendarView from './CalendarView'
import Metrics from './Metrics'
import ManageStatuses from './ManageStatuses'
import Notifications from './Notifications'
import UserSettings from './UserSettings'
import EmailSettings from './EmailSettings'
import EditTask from './EditTask'
import {
  PlusIcon,
  LogoutIcon,
  SunMoonIcon,
  MoonIcon,
  SunMediumIcon,
  RabbitIcon,
  UserIcon,
  LoadingZapIcon,
  SearchIcon,
  ChartIcon,
  ActivityIcon,
  BellIcon,
  ListIcon,
  KanbanIcon,
  CalendarIcon,
  SettingsIcon,
  PaletteIcon,
  InfoIcon,
  XIcon
} from './components/iu/AnimatedIcons';
import Toast from './Toast'




function Dashboard() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { taskId } = useParams<{ taskId: string }>()
  const location = useLocation()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [profileName, setProfileName] = useState<string | null>(null)

  // Tarea abierta via URL
  const [openedTask, setOpenedTask] = useState<Task | null>(null)
  const [loadingTask, setLoadingTask] = useState(false)
  const isClosingTaskRef = useRef(false)

  // Equipo actual
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null)
  const [currentTeamName, setCurrentTeamName] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null)

  // UI
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>(() => {
    const saved = localStorage.getItem('tazk_view_mode')
    return (saved === 'list' || saved === 'kanban' || saved === 'calendar') ? saved : 'list'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userEmailRef = useRef<string | null>(null)

  // Modales
  const [showActivityLogs, setShowActivityLogs] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [showStatuses, setShowStatuses] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [userSettingsTab, setUserSettingsTab] = useState<'profile' | 'appearance' | 'shortcuts' | null>(null)
  const [showEmailSettings, setShowEmailSettings] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'info' })
  const [showMemberWelcome, setShowMemberWelcome] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ show: true, message, type })
  }

  // Función para abrir una tarea (navega a la URL)
  const openTask = useCallback((task: Task) => {
    setOpenedTask(task)
    navigate(`/task/${task.id}`, { state: { backgroundLocation: location } })
  }, [navigate, location])

  // Función para cerrar la tarea (vuelve atrás o va al inicio)
  const closeTask = useCallback(() => {
    isClosingTaskRef.current = true
    setOpenedTask(null)
    // Si hay estado con backgroundLocation, significa que navegamos desde la app
    // Si no hay historial previo o llegamos directamente a /task/:id, ir a /
    if (location.state?.backgroundLocation || window.history.length > 2) {
      navigate(-1)
    } else {
      navigate('/', { replace: true })
    }
  }, [navigate, location.state])

  // Cargar tarea cuando hay taskId en la URL
  useEffect(() => {
    const loadTaskFromUrl = async () => {
      // No recargar si estamos cerrando el modal
      if (isClosingTaskRef.current) {
        isClosingTaskRef.current = false
        return
      }

      if (!taskId || openedTask?.id === taskId) return

      setLoadingTask(true)
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_statuses (*),
          assigned_user:profiles!tasks_assigned_to_fkey (*),
          created_by_user:profiles!tasks_created_by_fkey (*)
        `)
        .eq('id', taskId)
        .single()

      if (error || !data) {
        showToast('Tarea no encontrada', 'error')
        navigate('/', { replace: true })
      } else {
        setOpenedTask(data)
      }
      setLoadingTask(false)
    }

    loadTaskFromUrl()
  }, [taskId])

  // Limpiar tarea abierta si la URL ya no tiene taskId
  useEffect(() => {
    if (!taskId && openedTask) {
      setOpenedTask(null)
    }
  }, [taskId])

  // Cerrar modales con ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Cerrar en orden de prioridad (el más reciente primero)
        if (openedTask) {
          closeTask()
        } else if (showEmailSettings) {
          setShowEmailSettings(false)
        } else if (userSettingsTab) {
          setUserSettingsTab(null)
        } else if (showCreateTask) {
          setShowCreateTask(false)
        } else if (showActivityLogs) {
          setShowActivityLogs(false)
        } else if (showMetrics) {
          setShowMetrics(false)
        } else if (showStatuses) {
          setShowStatuses(false)
        } else if (showNotifications) {
          setShowNotifications(false)
        } else if (showUserMenu) {
          setShowUserMenu(false)
        } else if (searchTerm) {
          setSearchTerm('')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openedTask, showEmailSettings, userSettingsTab, showCreateTask, showActivityLogs, showMetrics, showStatuses, showNotifications, showUserMenu, searchTerm, closeTask])

  //permisos
  const canCreateTasks = currentTeamId === null || currentRole === 'owner' || currentRole === 'admin'

  // Funcionalidades para búsqueda
  // Verificar si el usuario puede acceder a estados y correos (solo owner o tareas personales)
  const canAccessOwnerFeatures = currentRole === 'owner' || !currentTeamId

  const features = [
    { id: 'new-task', icon: <PlusIcon size={20} />, label: 'Nueva tarea', action: () => setShowCreateTask(true) },
    { id: 'metrics', icon: <ChartIcon size={20} />, label: 'Métricas', action: () => setShowMetrics(true) },
    { id: 'activity', icon: <ActivityIcon size={20} />, label: 'Actividad', action: () => setShowActivityLogs(true) },
    // Estados solo para owner o tareas personales
    ...(canAccessOwnerFeatures ? [
      { id: 'statuses', icon: <PaletteIcon size={20} />, label: 'Estados', action: () => setShowStatuses(true) },
    ] : []),
    { id: 'notifications', icon: <BellIcon size={20} />, label: 'Notificaciones', action: () => setShowNotifications(true) },
    { id: 'view-list', icon: <ListIcon size={20} />, label: 'Vista Lista', action: () => setViewMode('list') },
    { id: 'view-kanban', icon: <KanbanIcon size={20} />, label: 'Vista Kanban', action: () => setViewMode('kanban') },
    { id: 'view-calendar', icon: <CalendarIcon size={20} />, label: 'Vista Calendario', action: () => setViewMode('calendar') },
    { id: 'settings', icon: <SettingsIcon size={20} />, label: 'Configuración', action: () => setUserSettingsTab('profile') },
    { id: 'profile', icon: <UserIcon size={20} />, label: 'Mi perfil', action: () => setUserSettingsTab('profile') },
    { id: 'theme', icon: <SunMoonIcon size={20} />, label: 'Cambiar tema', action: () => setUserSettingsTab('appearance') },
    { id: 'shortcuts', icon: <RabbitIcon size={20} />, label: 'Atajos de teclado', action: () => setUserSettingsTab('shortcuts') },
  ]

  // Filtrar funcionalidades por búsqueda
  const filteredFeatures = useMemo(() => {
    if (!searchTerm.trim()) return []
    const term = searchTerm.toLowerCase()
    return features.filter(f => f.label.toLowerCase().includes(term))
  }, [searchTerm, canAccessOwnerFeatures])

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    
    // Cargar nombre del perfil
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      
      if (profile?.full_name) {
        setProfileName(profile.full_name)
      }
    }
    
    setLoading(false)
  }

  const loadNotificationCount = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const userEmail = userData.user?.email

    if (!userEmail) return

    // Guardar email para la suscripción realtime
    userEmailRef.current = userEmail

    const { count } = await supabase
      .from('team_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('email', userEmail)
      .eq('status', 'pending')

    setNotificationCount(count || 0)
  }

  const handleTeamChange = (teamId: string | null, role: UserRole | null, teamName?: string) => {
    setCurrentTeamId(teamId)
    setCurrentRole(role)
    setCurrentTeamName(teamName || null)
    setRefreshKey(prev => prev + 1)

    // Mostrar mensaje de bienvenida solo para miembros la primera vez
    if (teamId && role === 'member') {
      const welcomeKey = `tazk_member_welcome_${teamId}`
      if (!localStorage.getItem(welcomeKey)) {
        setShowMemberWelcome(true)
        localStorage.setItem(welcomeKey, 'true')
      }
    } else {
      setShowMemberWelcome(false)
    }

    // Persistir en localStorage
    if (teamId) {
      localStorage.setItem('tazk_selected_team', teamId)
    } else {
      localStorage.removeItem('tazk_selected_team')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const handleFeatureSelect = (feature: typeof features[0]) => {
    feature.action()
    setSearchTerm('')
    setSearchFocused(false)
  }

  useEffect(() => {
    loadUserData()
    loadNotificationCount()
  }, [])

  // Suscripción realtime para notificaciones de invitaciones
  useRealtimeSubscription({
    subscriptions: [
      { table: 'team_invitations' }
    ],
    onchange: useCallback(() => {
      console.log('[Dashboard] Cambio en invitaciones, actualizando contador...')
      loadNotificationCount()
    }, []),
    enabled: !!user
  })

  // Persistir viewMode en localStorage
  useEffect(() => {
    localStorage.setItem('tazk_view_mode', viewMode)
  }, [viewMode])

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // No ejecutar atajos si está escribiendo en un input
      const target = e.target as HTMLElement
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Ctrl/Cmd + K para buscar
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('global-search')?.focus()
      }

      // Alt + N para nueva tarea
      if (e.altKey && e.key === 'n' && canCreateTasks) {
        e.preventDefault()
        setShowCreateTask(true)
      }

      // Escape para cerrar modales/búsqueda
      if (e.key === 'Escape') {
        setSearchFocused(false)
        setSearchTerm('')
        setShowUserMenu(false)
      }

      // Solo si no está escribiendo
      if (!isTyping) {
        // 1, 2, 3 para cambiar vista
        if (e.key === '1') setViewMode('list')
        if (e.key === '2') setViewMode('kanban')
        if (e.key === '3') setViewMode('calendar')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canCreateTasks])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex items-center justify-center">
        <LoadingZapIcon size={64} />
      </div>
    )
  }

  const userInitial = profileName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'
  const userName = profileName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white">
      {/* Sidebar */}
      <Sidebar
        currentUserId={user!.id}
        currentView={viewMode}
        onViewChange={(view) => setViewMode(view as 'list' | 'kanban' | 'calendar')}
        onTeamChange={handleTeamChange}
        notificationCount={notificationCount}
        onShowNotifications={() => setShowNotifications(true)}
        onShowMetrics={() => setShowMetrics(true)}
        onShowActivityLogs={() => setShowActivityLogs(true)}
        onShowStatuses={() => setShowStatuses(true)}
        onLogout={handleLogout}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onShowEmails={() => setShowEmailSettings(true)}
      />

      {/* Main */}
      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 bg-gray-50 dark:bg-neutral-900/80 backdrop-blur-sm border-b border-gray-300 dark:border-neutral-800">
          <div className="px-6 py-3 flex items-center gap-4">
            {/* Título */}
            <div className="flex-shrink-0">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentTeamName || 'Mis Tareas'}
              </h1>
            </div>

            {/* Buscador centrado */}
            <div className="flex-1 flex justify-center">
              <div className="relative w-full max-w-md">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500">
                  <SearchIcon size={16} />
                </span>
                <input
                  id="global-search"
                  type="text"
                  placeholder="Buscar tareas o funciones... (Ctrl+K)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-transparent"
                />
                
                {/* Dropdown de resultados */}
                {searchFocused && (searchTerm.trim() || filteredFeatures.length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden z-50">
                    {/* Funcionalidades */}
                    {filteredFeatures.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-xs text-gray-400 dark:text-neutral-500 uppercase tracking-wide border-b border-gray-200 dark:border-neutral-700">
                          Acciones rápidas
                        </div>
                        {filteredFeatures.map(feature => (
                          <button
                            key={feature.id}
                            onClick={() => handleFeatureSelect(feature)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-left"
                          >
                            <span className="text-gray-600 dark:text-neutral-300">{feature.icon}</span>
                            <span className="text-gray-900 dark:text-white text-sm">{feature.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Hint de búsqueda de tareas */}
                    {searchTerm.trim() && (
                      <div className="px-4 py-3 border-t border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-neutral-400 text-sm">
                        <span className="text-yellow-400">Enter</span> para buscar "{searchTerm}" en tareas
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Perfil de usuario */}
            <div className="flex-shrink-0 relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-white dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-neutral-900 font-bold">
                  {userInitial}
                </div>
              </button>

              {/* Menu de usuario */}
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* Info usuario */}
                    <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-neutral-900 font-bold text-lg">
                          {userInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-900 dark:text-white font-medium truncate">{userName}</div>
                          <div className="text-gray-500 dark:text-neutral-400 text-sm truncate">{user?.email}</div>
                        </div>
                      </div>
                    </div>

                    {/* Opciones */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          setUserSettingsTab('profile')
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <span><UserIcon /></span>
                        <span className="text-sm">Mi perfil</span>
                      </button>

                      

                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          setUserSettingsTab('appearance')
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <span>{theme === 'dark' ? <MoonIcon /> : <SunMediumIcon />}</span>
                        <span className="text-sm">Tema</span>
                        <span className="ml-auto text-xs text-gray-400 dark:text-neutral-500">{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          setUserSettingsTab('shortcuts')
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <span><RabbitIcon /></span>
                        <span className="text-sm">Atajos de teclado</span>
                      </button>
                    </div>

                    {/* Separador */}
                    <div className="border-t border-gray-200 dark:border-neutral-700" />

                    {/* Cerrar sesión */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          handleLogout()
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <span> <LogoutIcon  size={22} /> </span>
                        <span className="text-sm">Cerrar sesión</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Bienvenida para miembros - solo se muestra una vez al unirse */}
          {showMemberWelcome && (
            <div className="bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-300 dark:border-yellow-400/20 text-yellow-800 dark:text-yellow-300 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-3">
              <span className="text-yellow-500 dark:text-yellow-400 flex-shrink-0"><InfoIcon size={20} /></span>
              <span className="flex-1">Bienvenido al equipo. Aquí verás las tareas que te asignen los administradores.</span>
              <button
                onClick={() => setShowMemberWelcome(false)}
                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors"
              >
                <XIcon size={18} />
              </button>
            </div>
          )}

          {/* Vista */}
          {viewMode === 'list' && (
            <TaskList
              key={refreshKey}
              currentUserId={user!.id}
              teamId={currentTeamId}
              userRole={currentRole}
              onTaskUpdated={() => setRefreshKey(prev => prev + 1)}
              searchTerm={searchTerm}
              showToast={showToast}
              onOpenTask={openTask}
            />
          )}

          {viewMode === 'kanban' && (
            <KanbanBoard
              key={refreshKey}
              currentUserId={user!.id}
              teamId={currentTeamId}
              userRole={currentRole}
              searchTerm={searchTerm}
              showToast={showToast}
              onOpenTask={openTask}
            />
          )}

          {viewMode === 'calendar' && (
            <CalendarView
              key={refreshKey}
              currentUserId={user!.id}
              teamId={currentTeamId}
              userRole={currentRole}
              searchTerm={searchTerm}
              showToast={showToast}
              onOpenTask={openTask}
            />
          )}
        </div>
      </main>

      {/* FAB */}
      {canCreateTasks && (
        <button
          onClick={() => setShowCreateTask(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-yellow-400 text-neutral-900 rounded-full shadow-lg hover:bg-yellow-300 hover:scale-105 transition-all flex items-center justify-center z-50"
          title="Nueva tarea (Alt+N)"
        >
          <PlusIcon size={32} />
        </button>
      )}

      {/* Modales */}
      {showCreateTask && (
        <CreateTask
          currentUserId={user!.id}
          teamId={currentTeamId}
          onTaskCreated={() => setRefreshKey(prev => prev + 1)}
          onClose={() => setShowCreateTask(false)}
          showToast={showToast}
        />
      )}

      {showNotifications && (
        <Notifications
          onClose={() => setShowNotifications(false)}
          onInvitationResponded={() => {
            loadNotificationCount()
            setRefreshKey(prev => prev + 1)
          }}
        />
      )}

      {showActivityLogs && (
        <ActivityLogs
          teamId={currentTeamId}
          onClose={() => setShowActivityLogs(false)}
        />
      )}

      {showMetrics && (
        <Metrics
          currentUserId={user!.id}
          teamId={currentTeamId}
          onClose={() => setShowMetrics(false)}
        />
      )}

      {showStatuses && (
        <ManageStatuses
          currentUserId={user!.id}
          teamId={currentTeamId}
          isOwnerOrAdmin={currentTeamId === null || currentRole === 'owner' || currentRole === 'admin'}
          onClose={() => setShowStatuses(false)}
          onStatusesChanged={() => setRefreshKey(prev => prev + 1)}
        />
      )}

      {userSettingsTab && (
        <UserSettings
          user={user!}
          onClose={() => setUserSettingsTab(null)}
          onProfileUpdated={loadUserData}
          initialTab={userSettingsTab}
        />
      )}

      {showEmailSettings && (
        <EmailSettings
          currentUserId={user!.id}
          teamId={currentTeamId}
          onClose={() => setShowEmailSettings(false)}
        />
      )}

      {/* Modal de tarea abierta via URL */}
      {openedTask && (
        <EditTask
          task={openedTask}
          currentUserId={user!.id}
          onTaskUpdated={() => {
            setRefreshKey(prev => prev + 1)
            // Recargar la tarea para reflejar cambios
            if (taskId) {
              supabase
                .from('tasks')
                .select(`
                  *,
                  task_statuses (*),
                  assigned_user:profiles!tasks_assigned_to_fkey (*),
                  created_by_user:profiles!tasks_created_by_fkey (*)
                `)
                .eq('id', taskId)
                .single()
                .then(({ data }) => {
                  if (data) setOpenedTask(data)
                })
            }
          }}
          onClose={closeTask}
          showToast={showToast}
        />
      )}

      {/* Toast Global */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </div>
  )
}

export default Dashboard