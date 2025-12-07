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

function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null)
  const [showActivityLogs, setShowActivityLogs] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [showMetrics, setShowMetrics] = useState(false)

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
    setRefreshKey(prev => prev + 1) // Recargar tareas al cambiar de equipo
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

  if (loading) return <div style={{ padding: '20px' }}>Cargando...</div>

  // Determinar si puede crear tareas:
  // - Siempre puede crear tareas personales (currentTeamId === null)
  // - En equipos: solo Owner y Admin pueden crear
  const canCreateTasks = currentTeamId === null || currentRole === 'owner' || currentRole === 'admin'

  // Determinar el título según el contexto
  const getContextTitle = () => {
    if (currentTeamId === null) {
      return '👤 Mis Tareas Personales'
    }
    return '👥 Tareas del Equipo'
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' ,backgroundColor: '#f9f9f9', minHeight: '100vh'}}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '2px solid #eee',
        paddingBottom: '20px'
      }}>
        <div>
          <h1 style={{ margin: '0 0 10px 0' }}>Tazk</h1>
          <p style={{ margin: 0, color: '#666' }}>👤 {user?.email}</p>
        </div>
        
       <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowMetrics(true)}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '5px'
            }}
          >
            📊 Métricas
          </button>

          <button 
            onClick={() => setShowActivityLogs(true)}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              backgroundColor: '#9c27b0',
              color: 'white',
              border: 'none',
              borderRadius: '5px'
            }}
          >
            📋 Actividad
          </button>
          
          <button 
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              backgroundColor: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '5px'
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Selector de equipo */}
      <TeamSelector 
        currentUserId={user!.id}
        onTeamChange={handleTeamChange}
      />

      {/* Contenido principal */}
      <div>
        <h2>{getContextTitle()}</h2>
        
        {/* Mostrar rol actual en el equipo */}
        {currentTeamId && currentRole && (
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Tu rol: <strong>{currentRole === 'owner' ? 'Propietario' : currentRole === 'admin' ? 'Administrador' : 'Miembro'}</strong>
          </p>
        )}

        {/* Formulario de crear tarea - solo si tiene permisos */}
        {canCreateTasks && (
          <CreateTask 
            currentUserId={user!.id}
            teamId={currentTeamId}
            onTaskCreated={handleTaskCreated}
          />
        )}

        {/* Si es member, mostrar mensaje */}
        {currentTeamId && currentRole === 'member' && (
          <div style={{
            backgroundColor: '#fff3cd',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#856404'
          }}>
            ℹ️ Como miembro, solo puedes ver y actualizar las tareas asignadas a ti.
          </div>
        )}
        
        {/* Lista de tareas */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0 }}>📋 {currentTeamId ? 'Tareas del Equipo' : 'Mis Tareas'}</h3>
            
            <input
              type="text"
              placeholder="🔍 Buscar tareas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px',
                width: '200px'
              }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: viewMode === 'list' ? '#4CAF50' : '#e0e0e0',
                  color: viewMode === 'list' ? 'white' : 'black',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ☰ Lista
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: viewMode === 'kanban' ? '#4CAF50' : '#e0e0e0',
                  color: viewMode === 'kanban' ? 'white' : 'black',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ▦ Kanban
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: viewMode === 'calendar' ? '#4CAF50' : '#e0e0e0',
                  color: viewMode === 'calendar' ? 'white' : 'black',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                📅 Calendario
              </button>
            </div>
          </div>

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
              onTaskUpdated={handleTaskCreated}
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
      </div>
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
    </div>
  )
}

export default Dashboard