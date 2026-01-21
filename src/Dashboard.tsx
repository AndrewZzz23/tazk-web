import { supabase } from './supabaseClient'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRealtimeSubscription } from './hooks/useRealtimeSubscription'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
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
import Onboarding from './components/Onboarding'
import ProfileOnboarding from './components/ProfileOnboarding'
import {
  PlusIcon,
  LogoutIcon,
  SunMoonIcon,
  MoonIcon,
  SunMediumIcon,
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
  const isMobile = useIsMobile()

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
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
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showUserOnboarding, setShowUserOnboarding] = useState(false)
  const [showProfileOnboarding, setShowProfileOnboarding] = useState(false)

  // Swipe gesture para el menú de usuario móvil
  const userMenuGesture = useBottomSheetGesture({ onClose: () => setShowUserMenu(false) })

  // Bloquear scroll del body cuando hay un bottom sheet abierto (móvil)
  useBodyScrollLock(isMobile && (showUserMenu || bottomSheetOpen))

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

      // Verificar si el usuario ha visto el onboarding
      const onboardingKey = `tazk_onboarding_${user.id}`
      const hasSeenOnboarding = localStorage.getItem(onboardingKey)

      // Verificar si el usuario ha completado el profile onboarding
      const profileOnboardingKey = `tazk_profile_onboarding_${user.id}`
      const hasSeenProfileOnboarding = localStorage.getItem(profileOnboardingKey)

      // Mostrar profile onboarding si es un usuario nuevo (no ha visto el onboarding)
      if (!hasSeenProfileOnboarding) {
        setShowProfileOnboarding(true)
      }

      // Verificar si el usuario tiene estados personales activos, si no, crear los por defecto
      const { data: existingStatuses, error: statusError } = await supabase
        .from('task_statuses')
        .select('id, name')
        .is('team_id', null)
        .eq('created_by', user.id)

      if (statusError) {
        console.error('Error verificando estados:', statusError)
      }

      const hasStatuses = existingStatuses && existingStatuses.length > 0

      if (!hasStatuses) {
        // Crear estados por defecto para tareas personales
        const defaultStatuses = [
          { name: 'Pendiente', color: '#6b7280', category: 'not_started', order_position: 1 },
          { name: 'En progreso', color: '#3b82f6', category: 'in_progress', order_position: 2 },
          { name: 'En revisión', color: '#f59e0b', category: 'in_progress', order_position: 3 },
          { name: 'Completada', color: '#22c55e', category: 'completed', order_position: 4 },
        ]

        // Insertar estados uno por uno para manejar duplicados
        for (const status of defaultStatuses) {
          try {
            const { error: insertError } = await supabase.from('task_statuses').insert({
              ...status,
              team_id: null,
              created_by: user.id,
              is_active: true
            })

            // Solo loguear errores que no sean de duplicados
            if (insertError && !insertError.message?.toLowerCase().includes('duplicate') && !insertError.message?.toLowerCase().includes('conflict')) {
              console.error('Error creando estado por defecto:', insertError)
            }
          } catch {
            // Ignorar errores de conflicto silenciosamente
          }
        }
        console.log('Estados por defecto procesados para usuario nuevo')
      }

      // Mostrar onboarding si es nuevo usuario o no lo ha visto
      if (!hasSeenOnboarding) {
        setShowUserOnboarding(true)
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

  // Suscripción realtime para notificaciones de tareas asignadas (UPDATE y INSERT)
  useRealtimeSubscription({
    subscriptions: [
      { table: 'tasks', event: 'UPDATE', filter: user?.id ? `assigned_to=eq.${user.id}` : undefined },
      { table: 'tasks', event: 'INSERT', filter: user?.id ? `assigned_to=eq.${user.id}` : undefined }
    ],
    onchange: useCallback((payload) => {
      const newData = payload.new as Task | undefined
      const oldData = payload.old as { assigned_to?: string, created_by?: string } | undefined

      // No notificar si yo creé la tarea
      if (newData?.created_by === user?.id) return

      if (payload.eventType === 'INSERT' && newData && newData.assigned_to === user?.id) {
        // Nueva tarea creada y asignada a mí
        console.log('[Dashboard] Nueva tarea asignada (INSERT):', newData.title)
        showToast(`Nueva tarea: "${newData.title}"`, 'info')
        setRefreshKey(k => k + 1)
      } else if (payload.eventType === 'UPDATE' && newData && oldData) {
        // Tarea existente recién asignada a mí
        if (newData.assigned_to === user?.id && oldData.assigned_to !== user?.id) {
          console.log('[Dashboard] Tarea reasignada a mí (UPDATE):', newData.title)
          showToast(`Te asignaron: "${newData.title}"`, 'info')
          setRefreshKey(k => k + 1)
        }
      }
    }, [user?.id]),
    enabled: !!user?.id
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

  // Si no hay usuario autenticado, no renderizar nada (App.tsx redirigirá al login)
  if (!user) {
    return null
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
        isMobile={isMobile}
        onBottomSheetChange={setBottomSheetOpen}
        showFab={canCreateTasks}
      />

      {/* Main */}
      <main className={`transition-all duration-300 ${isMobile ? 'ml-0 pb-20' : sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
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

              {/* Menu de usuario - Desktop */}
              {showUserMenu && !isMobile && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    {/* Info usuario */}
                    <div className="p-4 bg-gradient-to-br from-yellow-400/10 to-orange-500/10 dark:from-yellow-400/5 dark:to-orange-500/5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-neutral-900 font-bold text-xl shadow-lg">
                          {userInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-900 dark:text-white font-semibold truncate">{userName}</div>
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
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-neutral-700 flex items-center justify-center">
                          <UserIcon />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">Mi perfil</div>
                          <div className="text-xs text-gray-400 dark:text-neutral-500">Editar información</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          setUserSettingsTab('appearance')
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-neutral-700 flex items-center justify-center">
                          {theme === 'dark' ? <MoonIcon /> : <SunMediumIcon />}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">Apariencia</div>
                          <div className="text-xs text-gray-400 dark:text-neutral-500">Tema {theme === 'dark' ? 'oscuro' : 'claro'}</div>
                        </div>
                      </button>
                    </div>

                    {/* Cerrar sesión */}
                    <div className="p-2 border-t border-gray-200 dark:border-neutral-700">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          setShowLogoutConfirm(true)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                          <LogoutIcon size={20} />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">Cerrar sesión</div>
                        </div>
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

      {/* FAB - Floating Action Button */}
      {canCreateTasks && !bottomSheetOpen && (
        <button
          onClick={() => setShowCreateTask(true)}
          className={`fixed bg-yellow-400 text-neutral-900 rounded-full shadow-xl hover:bg-yellow-300 hover:scale-105 active:scale-95 transition-all flex items-center justify-center z-40 ${
            isMobile
              ? 'right-4 w-14 h-14'
              : 'bottom-6 right-6 w-16 h-16'
          }`}
          style={isMobile ? {
            bottom: '1.3rem',
            boxShadow: '0 8px 24px rgba(250, 204, 21, 0.4), 0 4px 8px rgba(0,0,0,0.15)'
          } : undefined}
          title="Nueva tarea (Alt+N)"
        >
          <PlusIcon size={isMobile ? 28 : 32} />
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
          userRole={currentRole}
          onTaskUpdated={() => {
            setRefreshKey(prev => prev + 1)
          }}
          onClose={closeTask}
          showToast={showToast}
        />
      )}

      {/* Menu de usuario - Mobile Bottom Sheet */}
      {showUserMenu && isMobile && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setShowUserMenu(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 bg-neutral-900 rounded-t-3xl z-50 overflow-hidden safe-area-bottom"
            style={{
              ...userMenuGesture.dragStyle,
              transition: userMenuGesture.isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
            {...userMenuGesture.containerProps}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-neutral-700 rounded-full" />
            </div>

            {/* Info usuario */}
            <div className="px-4 pb-4">
              <div className="flex items-center gap-4 p-4 bg-neutral-800 rounded-2xl">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-neutral-900 font-bold text-2xl shadow-lg">
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-lg truncate">{userName}</div>
                  <div className="text-neutral-400 text-sm truncate">{user?.email}</div>
                </div>
              </div>
            </div>

            {/* Opciones */}
            <div className="px-4 pb-3 space-y-1">
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  setUserSettingsTab('profile')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white active:bg-neutral-800 transition-colors"
              >
                <UserIcon size={22} />
                <span className="font-medium">Mi perfil</span>
              </button>

              <button
                onClick={() => {
                  setShowUserMenu(false)
                  setUserSettingsTab('appearance')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white active:bg-neutral-800 transition-colors"
              >
                {theme === 'dark' ? <MoonIcon size={22} /> : <SunMediumIcon size={22} />}
                <span className="font-medium">Apariencia</span>
              </button>

              <button
                onClick={() => {
                  setShowUserMenu(false)
                  setUserSettingsTab('notifications')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white active:bg-neutral-800 transition-colors"
              >
                <BellIcon size={22} />
                <span className="font-medium">Notificaciones</span>
              </button>
            </div>

            {/* Cerrar sesión */}
            <div className="px-4 pb-6 pt-2">
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  setShowLogoutConfirm(true)
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-red-500/10 text-red-400 active:bg-red-500/20 transition-colors"
              >
                <LogoutIcon size={20} />
                <span className="font-medium">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast Global */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      {/* Modal de confirmación de cierre de sesión */}
      {/* Onboarding para usuarios nuevos */}
      {showUserOnboarding && user && (
        <Onboarding
          type="user"
          onComplete={() => {
            localStorage.setItem(`tazk_onboarding_${user.id}`, 'true')
            setShowUserOnboarding(false)
          }}
          onSkip={() => {
            localStorage.setItem(`tazk_onboarding_${user.id}`, 'true')
            setShowUserOnboarding(false)
          }}
        />
      )}

      {/* Profile Onboarding para nuevos usuarios */}
      {showProfileOnboarding && user && (
        <ProfileOnboarding
          user={user}
          onComplete={() => {
            localStorage.setItem(`tazk_profile_onboarding_${user.id}`, 'true')
            setShowProfileOnboarding(false)
            // Recargar datos del usuario para obtener el nombre actualizado
            loadUserData()
          }}
          onSkip={() => {
            localStorage.setItem(`tazk_profile_onboarding_${user.id}`, 'true')
            setShowProfileOnboarding(false)
          }}
        />
      )}

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogoutIcon size={28} className="text-red-500" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                ¿Cerrar sesión?
              </h3>

              <p className="text-gray-500 dark:text-neutral-400 text-center text-sm mb-6">
                Tendrás que volver a iniciar sesión para acceder a tu cuenta.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false)
                    handleLogout()
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard