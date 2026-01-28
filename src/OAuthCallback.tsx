import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { LoadingZapIcon } from './components/iu/AnimatedIcons'
import { CheckCircle, XCircle } from 'lucide-react'

function OAuthCallback() {
  const navigate = useNavigate()
  const { provider } = useParams<{ provider: string }>()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const error = urlParams.get('error')

      if (error) {
        setStatus('error')
        setMessage('Autorización cancelada')
        setTimeout(() => navigate('/'), 2000)
        return
      }

      if (!code || !provider) {
        setStatus('error')
        setMessage('Parámetros inválidos')
        setTimeout(() => navigate('/'), 2000)
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('No hay sesión activa')

        const redirectUri = `${window.location.origin}/auth/${provider}/callback`
        const { data, error: fnError } = await supabase.functions.invoke(`email-oauth-${provider}`, {
          body: { action: 'exchange_code', code, redirect_uri: redirectUri },
          headers: { Authorization: `Bearer ${session.access_token}` }
        })

        if (fnError) throw fnError
        if (data.error) throw new Error(data.error)

        setStatus('success')
        setMessage(`Correo ${data.email} conectado`)

        // Guardar en localStorage para que EmailSettings lo detecte
        localStorage.setItem('oauth_connected', JSON.stringify({
          provider,
          email: data.email,
          timestamp: Date.now()
        }))

        // Redirigir y abrir modal de email
        setTimeout(() => navigate('/?openEmailSettings=true'), 1500)
      } catch (err: any) {
        setStatus('error')
        setMessage(err.message || 'Error al conectar')
        setTimeout(() => navigate('/'), 3000)
      }
    }

    handleCallback()
  }, [provider, navigate])

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <LoadingZapIcon size={64} />
            <p className="text-white mt-4 text-lg">Conectando tu correo...</p>
            <p className="text-neutral-400 mt-2 text-sm">Por favor espera</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <p className="text-white text-lg font-medium">{message}</p>
            <p className="text-neutral-400 mt-2 text-sm">Redirigiendo...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-400 to-red-500 rounded-2xl flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-white" />
            </div>
            <p className="text-white text-lg font-medium">{message}</p>
            <p className="text-neutral-400 mt-2 text-sm">Redirigiendo...</p>
          </>
        )}
      </div>
    </div>
  )
}

export default OAuthCallback
