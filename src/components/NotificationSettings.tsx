import { useState } from 'react'
import { Bell, BellOff, Check, X, Loader2 } from 'lucide-react'
import { usePushNotifications } from '../hooks/usePushNotifications'

interface NotificationSettingsProps {
  userId: string
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}

function NotificationSettings({ userId, showToast }: NotificationSettingsProps) {
  const [showBanner, setShowBanner] = useState(true)

  const {
    permission,
    isSubscribed,
    loading,
    isSupported,
    subscribe
  } = usePushNotifications({ userId })

  const handleEnable = async () => {
    const success = await subscribe()
    if (success) {
      showToast?.('Notificaciones activadas', 'success')
      setShowBanner(false)
    } else if (permission === 'denied') {
      showToast?.('Debes habilitar notificaciones en la configuración del navegador', 'error')
    }
  }

  // No mostrar si no es soportado, ya está suscrito, o el banner está cerrado
  if (!isSupported || isSubscribed || !showBanner) {
    return null
  }

  // No mostrar si ya fue denegado
  if (permission === 'denied') {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-yellow-400/10 to-yellow-500/10 border border-yellow-400/30 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-yellow-500" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-gray-900 dark:text-white font-medium text-sm">
            Activa las notificaciones
          </h3>
          <p className="text-gray-500 dark:text-neutral-400 text-xs mt-1">
            Recibe alertas cuando te asignen tareas o se acerquen las fechas de vencimiento.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowBanner(false)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            onClick={handleEnable}
            disabled={loading}
            className="px-3 py-1.5 bg-yellow-400 text-neutral-900 rounded-lg text-sm font-medium hover:bg-yellow-300 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Activar
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente para mostrar en configuración
export function NotificationToggle({ userId, showToast }: NotificationSettingsProps) {
  const {
    permission,
    isSubscribed,
    loading,
    isSupported,
    toggle
  } = usePushNotifications({ userId })

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-gray-900 dark:text-white font-medium text-sm">Notificaciones</p>
            <p className="text-gray-500 dark:text-neutral-400 text-xs">No soportado en este navegador</p>
          </div>
        </div>
      </div>
    )
  }

  const handleToggle = async () => {
    const success = await toggle()
    if (success) {
      showToast?.(isSubscribed ? 'Notificaciones desactivadas' : 'Notificaciones activadas', 'success')
    } else if (permission === 'denied') {
      showToast?.('Debes habilitar notificaciones en la configuración del navegador', 'error')
    }
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        {isSubscribed ? (
          <Bell className="w-5 h-5 text-yellow-500" />
        ) : (
          <BellOff className="w-5 h-5 text-gray-400" />
        )}
        <div>
          <p className="text-gray-900 dark:text-white font-medium text-sm">Notificaciones push</p>
          <p className="text-gray-500 dark:text-neutral-400 text-xs">
            {isSubscribed ? 'Activadas' : permission === 'denied' ? 'Bloqueadas por el navegador' : 'Desactivadas'}
          </p>
        </div>
      </div>

      <button
        onClick={handleToggle}
        disabled={loading || permission === 'denied'}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          isSubscribed
            ? 'bg-yellow-400'
            : 'bg-gray-300 dark:bg-neutral-600'
        } ${loading || permission === 'denied' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            isSubscribed ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default NotificationSettings
