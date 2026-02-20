import { useState, useEffect } from 'react'
import { Bell, BellOff, Check, X, Loader2, Mail, ListTodo, MessageSquare, ChevronRight } from 'lucide-react'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { supabase } from '../supabaseClient'

interface NotificationSettingsProps {
  userId: string
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}

// ─── Banner de activación (usado en Dashboard) ────────────────────────────────
function NotificationSettings({ userId, showToast }: NotificationSettingsProps) {
  const [showBanner, setShowBanner] = useState(true)
  const { permission, isSubscribed, loading, isSupported, subscribe } = usePushNotifications({ userId })

  const handleEnable = async () => {
    const success = await subscribe()
    if (success) {
      showToast?.('Notificaciones activadas', 'success')
      setShowBanner(false)
    } else if (permission === 'denied') {
      showToast?.('Debes habilitar notificaciones en la configuración del navegador', 'error')
    }
  }

  if (!isSupported || isSubscribed || !showBanner || permission === 'denied') return null

  return (
    <div className="bg-gradient-to-r from-yellow-400/10 to-yellow-500/10 border border-yellow-400/30 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-yellow-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-gray-900 dark:text-white font-medium text-sm">Activa las notificaciones</h3>
          <p className="text-gray-500 dark:text-neutral-400 text-xs mt-1">
            Recibe alertas cuando te asignen tareas o se acerquen las fechas de vencimiento.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setShowBanner(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={handleEnable}
            disabled={loading}
            className="px-3 py-1.5 bg-yellow-400 text-neutral-900 rounded-lg text-sm font-medium hover:bg-yellow-300 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Activar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Toggle global de push (header de la sección) ─────────────────────────────
export function NotificationToggle({ userId, showToast }: NotificationSettingsProps) {
  const { permission, isSubscribed, loading, isSupported, toggle } = usePushNotifications({ userId })

  if (!isSupported) {
    return (
      <div className="flex items-center gap-3 py-3">
        <BellOff className="w-5 h-5 text-gray-400" />
        <div>
          <p className="text-gray-900 dark:text-white font-medium text-sm">Notificaciones</p>
          <p className="text-gray-500 dark:text-neutral-400 text-xs">No soportado en este navegador</p>
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
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isSubscribed ? <Bell className="w-5 h-5 text-yellow-500" /> : <BellOff className="w-5 h-5 text-gray-400" />}
        <div>
          <p className="text-gray-900 dark:text-white font-medium text-sm">Notificaciones push</p>
          <p className="text-gray-500 dark:text-neutral-400 text-xs">
            {isSubscribed ? 'Activadas en este dispositivo' : permission === 'denied' ? 'Bloqueadas por el navegador' : 'Desactivadas'}
          </p>
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading || permission === 'denied'}
        className={`relative w-11 h-6 rounded-full transition-colors ${isSubscribed ? 'bg-yellow-400' : 'bg-gray-300 dark:bg-neutral-600'} ${loading || permission === 'denied' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isSubscribed ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

// ─── Preferencias granulares por evento ──────────────────────────────────────
interface NotifPrefs {
  notify_on_assign: boolean
  notify_on_comment: boolean
  notify_on_status_change: boolean
  notify_on_due_soon: boolean
  notify_on_complete: boolean
}

interface PrefItemProps {
  label: string
  desc: string
  value: boolean
  onChange: (val: boolean) => void
  saving: boolean
}

function PrefToggle({ label, desc, value, onChange, saving }: PrefItemProps) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        disabled={saving}
        className={`relative flex-shrink-0 w-10 h-5.5 h-[22px] rounded-full transition-colors ${value ? 'bg-yellow-400' : 'bg-gray-300 dark:bg-neutral-600'} ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-[18px]' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

interface NotificationPreferencesProps {
  userId: string
  isSubscribed: boolean
}

export function NotificationPreferences({ userId, isSubscribed }: NotificationPreferencesProps) {
  const [prefs, setPrefs] = useState<NotifPrefs>({
    notify_on_assign: true,
    notify_on_comment: true,
    notify_on_status_change: true,
    notify_on_due_soon: true,
    notify_on_complete: true,
  })
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isSubscribed) return
    supabase
      .from('profiles')
      .select('notify_on_assign, notify_on_comment, notify_on_status_change, notify_on_due_soon, notify_on_complete')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            notify_on_assign: (data as any).notify_on_assign !== false,
            notify_on_comment: (data as any).notify_on_comment !== false,
            notify_on_status_change: (data as any).notify_on_status_change !== false,
            notify_on_due_soon: (data as any).notify_on_due_soon !== false,
            notify_on_complete: (data as any).notify_on_complete !== false,
          })
        }
        setLoaded(true)
      })
  }, [userId, isSubscribed])

  const handleChange = async (field: keyof NotifPrefs, value: boolean) => {
    setPrefs(prev => ({ ...prev, [field]: value }))
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', userId)
    setSaving(false)
  }

  if (!isSubscribed || !loaded) return null

  return (
    <div className="mt-4 space-y-1">
      {/* Grupo: Tareas */}
      <div className="rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-neutral-700/50 border-b border-gray-200 dark:border-neutral-700">
          <ListTodo className="w-4 h-4 text-gray-500 dark:text-neutral-400" />
          <span className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Tareas</span>
        </div>
        <div className="px-4 divide-y divide-gray-100 dark:divide-neutral-700/50">
          <PrefToggle
            label="Tarea asignada"
            desc="Cuando alguien te asigna una tarea"
            value={prefs.notify_on_assign}
            onChange={v => handleChange('notify_on_assign', v)}
            saving={saving}
          />
          <PrefToggle
            label="Cambio de estado"
            desc="Cuando cambia el estado de tus tareas"
            value={prefs.notify_on_status_change}
            onChange={v => handleChange('notify_on_status_change', v)}
            saving={saving}
          />
          <PrefToggle
            label="Tarea completada"
            desc="Cuando marcan como completada una tarea tuya"
            value={prefs.notify_on_complete}
            onChange={v => handleChange('notify_on_complete', v)}
            saving={saving}
          />
          <PrefToggle
            label="Fecha límite próxima"
            desc="Alerta 24 horas antes del vencimiento"
            value={prefs.notify_on_due_soon}
            onChange={v => handleChange('notify_on_due_soon', v)}
            saving={saving}
          />
        </div>
      </div>

      {/* Grupo: Colaboración */}
      <div className="rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-neutral-700/50 border-b border-gray-200 dark:border-neutral-700">
          <MessageSquare className="w-4 h-4 text-gray-500 dark:text-neutral-400" />
          <span className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Colaboración</span>
        </div>
        <div className="px-4">
          <PrefToggle
            label="Nuevo comentario"
            desc="En tareas donde eres creador o asignado"
            value={prefs.notify_on_comment}
            onChange={v => handleChange('notify_on_comment', v)}
            saving={saving}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Email notification prefs ─────────────────────────────────────────────────
interface EmailPrefs {
  is_enabled: boolean
  notify_on_assign: boolean
  notify_on_complete: boolean
}

interface EmailNotificationSectionProps {
  userId: string
  isMobile?: boolean
}

export function EmailNotificationSection({ userId, isMobile }: EmailNotificationSectionProps) {
  const [prefs, setPrefs] = useState<EmailPrefs>({ is_enabled: false, notify_on_assign: true, notify_on_complete: true })
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase
      .from('email_settings')
      .select('is_enabled, notify_on_assign, notify_on_complete')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            is_enabled: data.is_enabled ?? false,
            notify_on_assign: data.notify_on_assign !== false,
            notify_on_complete: data.notify_on_complete !== false,
          })
        }
        setLoaded(true)
      })
  }, [userId])

  const handleChange = async (field: keyof EmailPrefs, value: boolean) => {
    setPrefs(prev => ({ ...prev, [field]: value }))
    setSaving(true)
    await supabase
      .from('email_settings')
      .upsert({ user_id: userId, [field]: value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setSaving(false)
  }

  if (!loaded) return null

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden ${isMobile ? 'mt-3' : 'mt-4'}`}>
      {/* Header con toggle global */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-neutral-700/50">
        <div className="flex items-center gap-2.5">
          <Mail className="w-4 h-4 text-gray-500 dark:text-neutral-400" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Emails de notificación</p>
            <p className="text-xs text-gray-500 dark:text-neutral-400">
              {prefs.is_enabled ? 'Activados' : 'Desactivados'}
            </p>
          </div>
        </div>
        <button
          onClick={() => handleChange('is_enabled', !prefs.is_enabled)}
          disabled={saving}
          className={`relative w-11 h-6 rounded-full transition-colors ${prefs.is_enabled ? 'bg-yellow-400' : 'bg-gray-300 dark:bg-neutral-600'} ${saving ? 'opacity-50' : 'cursor-pointer'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs.is_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Sub-preferencias (solo si está habilitado) */}
      {prefs.is_enabled && (
        <div className="px-4 divide-y divide-gray-100 dark:divide-neutral-700/50">
          <PrefToggle
            label="Al asignarte una tarea"
            desc="Recibes un email cuando alguien te asigna trabajo"
            value={prefs.notify_on_assign}
            onChange={v => handleChange('notify_on_assign', v)}
            saving={saving}
          />
          <PrefToggle
            label="Al completar una tarea"
            desc="Email de confirmación cuando se completa"
            value={prefs.notify_on_complete}
            onChange={v => handleChange('notify_on_complete', v)}
            saving={saving}
          />
        </div>
      )}

      {prefs.is_enabled && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-neutral-700/50">
          <button className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 hover:underline">
            Configurar plantillas de email
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

export default NotificationSettings
