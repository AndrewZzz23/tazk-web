import { supabase } from './supabaseClient'

function Login() {
  
  const handleGoogleLogin = async () => {
    console.log('Intentando login con Google...')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:5173'
      }
    })
    console.log('Respuesta:', data)
    if (error) console.error('Error:', error)
  }

const handleMicrosoftLogin = async () => {
  console.log('=== INICIANDO LOGIN MICROSOFT ===')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'openid email profile',
      queryParams: {
        prompt: 'select_account',
      }
    }
  })
  console.log('Data Microsoft:', data)
  if (error) console.error('Error Microsoft:', error)
}

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      gap: '20px'
    }}>
      <h1>Bienvenido a Tazk</h1>
      <button 
        onClick={handleGoogleLogin}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          backgroundColor: '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        Iniciar sesión con Google
      </button>
      
      <button 
        onClick={handleMicrosoftLogin}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          backgroundColor: '#00a4ef',
          color: 'white',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        Iniciar sesión con Microsoft
      </button>
    </div>
  )
}

export default Login