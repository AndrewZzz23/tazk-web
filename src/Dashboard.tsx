import { supabase } from './supabaseClient'
import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Profile, UserRole } from './types/database.types'
import CreateTask from './CreateTask'
import TaskList from './TaskList'
import TeamSelector from './TeamSelector'
import ActivityLogs from './ActivityLogs'
import KanbanBoard from './KanbanBoard'
import CalendarView from './CalendarView'
import Metrics from './Metrics'
import ManageStatuses from './ManageStatuses'

function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Estado del contexto de equipo
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null)
  
  // Modales
  const [showActivityLogs, setShowActivityLogs] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [showStatuses, setShowStatuses] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  
  // Vista
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list')
  const [searchTerm, setSearchTerm] = useState('')

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

  const handleTeamChange = (teamId: string | null, role: UserRole | null) => {
    setCurrentTeamId(teamId)
    setCurrentRole(role)
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
      {/* Header */}
      <header className="bg-neutral-800 border-b border-neutral-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-yellow-400">⚡Tazk</h1>
              <span className="text-neutral-400 text-sm hidden sm:block">
                {user?.email}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowMetrics(true)}
                className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors flex items-center gap-2"
              >
                <span>📊</span>
                <span className="hidden sm:inline">Métricas</span>
              </button>
              <button 
                onClick={() => setShowActivityLogs(true)}
                className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors flex items-center gap-2"
              >
                <span>📋</span>
                <span className="hidden sm:inline">Actividad</span>
              </button>
              <button 
                onClick={() => setShowStatuses(true)}
                className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors flex items-center gap-2"
              >
                <span>🎨</span>
                <span className="hidden sm:inline">Estados</span>
              </button>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Team Selector */}
        <TeamSelector 
          currentUserId={user!.id}
          onTeamChange={handleTeamChange}
        />

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mt-6 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              {currentTeamId ? '👥 Tareas del Equipo' : '👤 Mis Tareas'}
            </h2>
            {currentTeamId && currentRole && (
              <p className="text-neutral-400 text-sm mt-1">
                Tu rol: <span className="text-yellow-400 font-medium">
                  {currentRole === 'owner' ? 'Propietario' : currentRole === 'admin' ? 'Administrador' : 'Miembro'}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Búsqueda */}
            <input
              type="text"
              placeholder="🔍 Buscar tareas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent w-48"
            />

            {/* Toggle de vista */}
            <div className="flex bg-neutral-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-yellow-400 text-neutral-900' 
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                ☰ Lista
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'kanban' 
                    ? 'bg-yellow-400 text-neutral-900' 
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                ▦ Kanban
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'calendar' 
                    ? 'bg-yellow-400 text-neutral-900' 
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                📅 Calendario
              </button>
            </div>
          </div>
        </div>

        {/* Mensaje para miembros */}
        {currentTeamId && currentRole === 'member' && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 px-4 py-3 rounded-lg mb-4 text-sm">
            ℹ️ Como miembro, solo puedes ver y actualizar las tareas asignadas a ti.
          </div>
        )}

        {/* Contenido según vista */}
        <div className="mt-4">
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
          className="fixed bottom-8 right-8 w-16 h-16 bg-yellow-400 text-neutral-900 rounded-full shadow-lg hover:bg-yellow-300 hover:scale-110 transition-all duration-200 flex items-center justify-center text-3xl font-bold z-50"
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