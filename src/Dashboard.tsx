import { supabase } from './supabaseClient'
import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Profile, UserRole } from './types/database.types'
import Sidebar from './Sidebar'
import CreateTask from './CreateTask'
import TaskList from './TaskList'
import TeamSelector from './TeamSelector'
import ActivityLogs from './ActivityLogs'
import KanbanBoard from './KanbanBoard'
import CalendarView from './CalendarView'
import Metrics from './Metrics'
import ManageStatuses from './ManageStatuses'
import Notifications from './Notifications'

function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Estado del contexto de equipo
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null)
  const [currentTeamName, setCurrentTeamName] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null)
  
  // Modales
  const [showActivityLogs, setShowActivityLogs] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [showStatuses, setShowStatuses] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  
  // Vista y búsqueda
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [notificationCount, setNotificationCount] = useState(0)

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)
    }

    setLoading(false)
  }

  const loadNotificationCount = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const userEmail = userData.user?.email

    if (!userEmail) return

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
  }

  const handleTaskCreated = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  useEffect(() => {
    loadUserData()
    loadNotificationCount()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-yellow-400 text-xl">⚡ Cargando...</div>
      </div>
    )
  }

  const canCreateTasks = currentTeamId === null || currentRole === 'owner' || currentRole === 'admin'

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      {/* Sidebar */}
      <Sidebar
        currentView={viewMode}
        onViewChange={(view) => setViewMode(view as 'list' | 'kanban' | 'calendar')}
        teamName={currentTeamName}
        userRole={currentRole}
        notificationCount={notificationCount}
        onShowNotifications={() => setShowNotifications(true)}
        onShowMetrics={() => setShowMetrics(true)}
        onShowActivityLogs={() => setShowActivityLogs(true)}
        onShowStatuses={() => setShowStatuses(true)}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="ml-60 transition-all duration-300">
        {/* Header */}
        <header className="bg-neutral-800/50 border-b border-neutral-800 sticky top-0 z-30 backdrop-blur-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Team Selector */}
              <TeamSelector 
                currentUserId={user!.id}
                onTeamChange={handleTeamChange}
              />

              {/* Búsqueda */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar tareas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent w-64"
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Info del contexto */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">
              {currentTeamId ? `👥 ${currentTeamName}` : '👤 Mis Tareas'}
            </h1>
            {currentTeamId && currentRole && (
              <p className="text-neutral-400 text-sm mt-1">
                {currentRole === 'owner' ? '👑 Propietario' : currentRole === 'admin' ? '🛡️ Administrador' : '👤 Miembro'}
              </p>
            )}
          </div>

          {/* Mensaje para miembros */}
          {currentTeamId && currentRole === 'member' && (
            <div className="bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 px-4 py-3 rounded-lg mb-6 text-sm">
              ℹ️ Como miembro, solo puedes ver y actualizar las tareas asignadas a ti.
            </div>
          )}

          {/* Contenido según vista */}
          {viewMode === 'list' && (
            <TaskList 
              key={refreshKey}
              currentUserId={user!.id}
              teamId={currentTeamId}
              userRole={currentRole}
              onTaskUpdated={handleTaskCreated}
              searchTerm={searchTerm}
            />
          )}
          
          {viewMode === 'kanban' && (
            <KanbanBoard
              key={refreshKey}
              currentUserId={user!.id}
              teamId={currentTeamId}
              userRole={currentRole}
              searchTerm={searchTerm}
            />
          )}

          {viewMode === 'calendar' && (
            <CalendarView
              key={refreshKey}
              currentUserId={user!.id}
              teamId={currentTeamId}
              userRole={currentRole}
              searchTerm={searchTerm}
            />
          )}
        </div>
      </main>

      {/* FAB - Floating Action Button */}
      {canCreateTasks && (
        <button
          onClick={() => setShowCreateTask(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-yellow-400 text-neutral-900 rounded-full shadow-lg hover:bg-yellow-300 hover:scale-110 transition-all duration-200 flex items-center justify-center text-2xl font-bold z-50"
          title="Crear nueva tarea"
        >
          +
        </button>
      )}

      {/* Modales */}
      {showCreateTask && (
        <CreateTask
          currentUserId={user!.id}
          teamId={currentTeamId}
          onTaskCreated={handleTaskCreated}
          onClose={() => setShowCreateTask(false)}
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
    </div>
  )
}

export default Dashboard