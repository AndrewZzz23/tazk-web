import { supabase } from './supabaseClient'
import { useState, useEffect } from 'react'

function Dashboard() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Obtener usuario actual
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (!user) return <div>Cargando...</div>

  return (
    <div style={{ padding: '20px' }}>
      <h1>¡Bienvenido a Tazk!</h1>
      <p>Email: {user.email}</p>
      <p>Nombre: {user.user_metadata?.full_name || 'Sin nombre'}</p>
      
      <button 
        onClick={handleLogout}
        style={{
          marginTop: '20px',
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
  )
}

export default Dashboard