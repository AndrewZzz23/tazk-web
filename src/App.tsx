import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import Login from './Login'
import Dashboard from './Dashboard'
import OAuthCallback from './OAuthCallback'
import './index.css'
import { ThemeProvider } from './ThemeContext'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return null // O un spinner de carga
  }

  return (
    <ThemeProvider>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/auth/:provider/callback" element={<OAuthCallback />} />
        <Route path="/task/:taskId" element={session ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/*" element={session ? <Dashboard /> : <Navigate to="/login" replace />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App