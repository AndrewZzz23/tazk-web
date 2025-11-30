import { supabase } from './supabaseClient'
import { useState, useEffect } from 'react'
import CreateTask from './CreateTask'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Declarar la función ANTES del useEffect
  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profile)
    }

    setLoading(false)
  }

  const handleTaskCreated = () => {
    console.log('¡Tarea creada! Aquí actualizaremos la lista de tareas')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  // Ahora sí llamar a la función
  useEffect(() => {
    loadUserData()
  }, [])

  if (loading) return <div style={{ padding: '20px' }}>Cargando...</div>

  const isAdmin = profile?.role === 'admin'

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        borderBottom: '2px solid #eee',
        paddingBottom: '20px'
      }}>
        <div>
          <h1>Tazk - Panel de Control</h1>
          <p>👤 {user?.email}</p>
          <p>🎭 Rol: <strong>{isAdmin ? 'Administrador' : 'Usuario Básico'}</strong></p>
        </div>
        
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

      {isAdmin ? (
        <div>
          <h2>👑 Panel de Administrador</h2>
          
          <CreateTask 
            currentUserId={user.id}
            onTaskCreated={handleTaskCreated}
          />
          
          <div style={{ marginTop: '30px' }}>
            <h3>📋 Todas las Tareas</h3>
            <p>Próximo paso: mostrar la lista de tareas</p>
          </div>
        </div>
      ) : (
        <div>
          <h2>📋 Mis Tareas Asignadas</h2>
          <p>Aquí verás las tareas que te asignaron</p>
        </div>
      )}
    </div>
  )
}

export default Dashboard