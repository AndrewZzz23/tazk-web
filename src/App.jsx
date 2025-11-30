import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import Dashboard from './Dashboard'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Sesión obtenida:', session) // ← AGREGADO
      setSession(session)
    })

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Cambio de auth:', event, session) // ← AGREGADO
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  console.log('Session actual:', session) // ← AGREGADO

  return session ? <Dashboard /> : <Login />
}

export default App