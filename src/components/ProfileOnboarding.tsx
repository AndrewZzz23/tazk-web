import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { User, Phone, MapPin, Globe, Sun, Moon, Bell, BellOff, ArrowRight, Check, Sparkles } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { User as SupabaseUser } from '@supabase/supabase-js'

interface ProfileOnboardingProps {
  user: SupabaseUser
  onComplete: () => void
  onSkip?: () => void
}

type ThemeOption = 'dark' | 'light'

function ProfileOnboarding({ user, onComplete, onSkip }: ProfileOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [theme, setTheme] = useState<ThemeOption>('dark')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [notifyOnAssign, setNotifyOnAssign] = useState(true)
  const [notifyOnDue, setNotifyOnDue] = useState(true)

  const handleClose = async () => {
    setSaving(true)

    // Guardar perfil
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        country: country.trim() || null,
        city: city.trim() || null,
        theme: theme,
        notifications_enabled: notificationsEnabled,
        notify_on_assign: notifyOnAssign,
        notify_on_due: notifyOnDue,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) {
      console.error('Error guardando perfil:', error)
    }

    setSaving(false)
    setIsVisible(false)
    setTimeout(onComplete, 300)
  }

  const handleSkip = () => {
    setIsVisible(false)
    setTimeout(onSkip || onComplete, 300)
  }

  const steps = [
    {
      id: 'welcome',
      title: 'Completa tu perfil',
      content: (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-400/30"
          >
            <User className="w-12 h-12 text-neutral-900" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-white mb-2">Hola, {user.email?.split('@')[0]}!</h2>
            <p className="text-neutral-400">
              Personaliza tu experiencia en Tazk completando tu perfil
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-2 text-yellow-400"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">Solo te tomara un momento</span>
            <Sparkles className="w-4 h-4" />
          </motion.div>
        </div>
      )
    },
    {
      id: 'personal',
      title: 'Informacion personal',
      content: (
        <div className="space-y-5">
          <p className="text-neutral-400 text-center text-sm mb-4">
            Esta informacion es opcional pero ayuda a personalizar tu experiencia
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              <User className="inline w-4 h-4 mr-1.5 text-yellow-400" />
              Nombre completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              <Phone className="inline w-4 h-4 mr-1.5 text-blue-400" />
              Telefono (opcional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+57 300 123 4567"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 gap-3"
          >
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                <Globe className="inline w-4 h-4 mr-1.5 text-green-400" />
                Pais
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Colombia"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                <MapPin className="inline w-4 h-4 mr-1.5 text-red-400" />
                Ciudad
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bogota"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
              />
            </div>
          </motion.div>
        </div>
      )
    },
    {
      id: 'appearance',
      title: 'Apariencia',
      content: (
        <div className="space-y-6">
          <p className="text-neutral-400 text-center text-sm mb-4">
            Elige el tema que prefieras para la aplicacion
          </p>

          <div className="grid grid-cols-2 gap-4">
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setTheme('dark')}
              className={`relative p-5 rounded-2xl border-2 transition-all ${
                theme === 'dark'
                  ? 'bg-yellow-400/10 border-yellow-400'
                  : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-600'
              }`}
            >
              {theme === 'dark' && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-neutral-900" />
                </div>
              )}
              <div className="w-14 h-14 mx-auto mb-3 bg-neutral-900 rounded-xl flex items-center justify-center border border-neutral-600">
                <Moon className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-white font-medium">Oscuro</h4>
              <p className="text-neutral-500 text-xs mt-1">Reduce fatiga visual</p>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => setTheme('light')}
              className={`relative p-5 rounded-2xl border-2 transition-all ${
                theme === 'light'
                  ? 'bg-yellow-400/10 border-yellow-400'
                  : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-600'
              }`}
            >
              {theme === 'light' && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-neutral-900" />
                </div>
              )}
              <div className="w-14 h-14 mx-auto mb-3 bg-white rounded-xl flex items-center justify-center border border-gray-300">
                <Sun className="w-7 h-7 text-yellow-500" />
              </div>
              <h4 className="text-white font-medium">Claro</h4>
              <p className="text-neutral-500 text-xs mt-1">Clasico y limpio</p>
            </motion.button>
          </div>
        </div>
      )
    },
    {
      id: 'notifications',
      title: 'Notificaciones',
      content: (
        <div className="space-y-5">
          <p className="text-neutral-400 text-center text-sm mb-4">
            Configura como quieres recibir notificaciones
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              notificationsEnabled
                ? 'bg-yellow-400/10 border-yellow-400/50'
                : 'bg-neutral-800/50 border-neutral-700'
            }`}
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  notificationsEnabled ? 'bg-yellow-400/20' : 'bg-neutral-700'
                }`}>
                  {notificationsEnabled ? (
                    <Bell className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <BellOff className="w-5 h-5 text-neutral-500" />
                  )}
                </div>
                <div>
                  <h4 className="text-white font-medium">Notificaciones</h4>
                  <p className="text-neutral-500 text-xs">Recibir alertas de la app</p>
                </div>
              </div>
              <div className={`w-12 h-7 rounded-full transition-colors ${
                notificationsEnabled ? 'bg-yellow-400' : 'bg-neutral-700'
              }`}>
                <div className={`w-5 h-5 mt-1 rounded-full bg-white shadow transition-transform ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </div>
            </div>
          </motion.div>

          {notificationsEnabled && (
            <>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  notifyOnAssign
                    ? 'bg-blue-400/10 border-blue-400/30'
                    : 'bg-neutral-800/50 border-neutral-700'
                }`}
                onClick={() => setNotifyOnAssign(!notifyOnAssign)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium text-sm">Al asignarme tareas</h4>
                    <p className="text-neutral-500 text-xs">Recibir aviso cuando te asignen una tarea</p>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    notifyOnAssign ? 'bg-blue-400 border-blue-400' : 'border-neutral-600'
                  }`}>
                    {notifyOnAssign && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  notifyOnDue
                    ? 'bg-orange-400/10 border-orange-400/30'
                    : 'bg-neutral-800/50 border-neutral-700'
                }`}
                onClick={() => setNotifyOnDue(!notifyOnDue)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium text-sm">Fechas limite</h4>
                    <p className="text-neutral-500 text-xs">Recordatorio antes del vencimiento</p>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    notifyOnDue ? 'bg-orange-400 border-orange-400' : 'border-neutral-600'
                  }`}>
                    {notifyOnDue && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>
      )
    },
    {
      id: 'ready',
      title: 'Listo!',
      content: (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-400/30"
          >
            <Check className="w-10 h-10 text-white" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-white mb-2">Perfil configurado!</h2>
            <p className="text-neutral-400">
              Tu perfil ha sido configurado exitosamente
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-neutral-800/50 rounded-xl p-4 text-left space-y-2"
          >
            {fullName && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-yellow-400" />
                <span className="text-neutral-400">Nombre:</span>
                <span className="text-white">{fullName}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-4 h-4 rounded ${theme === 'dark' ? 'bg-neutral-700' : 'bg-white'}`} />
              <span className="text-neutral-400">Tema:</span>
              <span className="text-white">{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {notificationsEnabled ? (
                <Bell className="w-4 h-4 text-yellow-400" />
              ) : (
                <BellOff className="w-4 h-4 text-neutral-500" />
              )}
              <span className="text-neutral-400">Notificaciones:</span>
              <span className="text-white">{notificationsEnabled ? 'Activadas' : 'Desactivadas'}</span>
            </div>
          </motion.div>
        </div>
      )
    }
  ]

  const isLastStep = currentStep === steps.length - 1

  const nextStep = () => {
    if (isLastStep) {
      handleClose()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black/80 backdrop-blur-md' : 'bg-transparent pointer-events-none'
      }`}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: isVisible ? 1 : 0.9, opacity: isVisible ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-md bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden border border-neutral-800"
      >
        {/* Progress bar */}
        <div className="h-1 bg-neutral-800">
          <motion.div
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentStep
                      ? 'w-6 bg-yellow-400'
                      : i < currentStep
                      ? 'bg-yellow-400/50'
                      : 'bg-neutral-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-neutral-500 text-sm">
              {currentStep + 1} / {steps.length}
            </span>
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="min-h-[320px]"
            >
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          {currentStep > 0 ? (
            <button
              onClick={prevStep}
              className="px-4 py-2.5 text-neutral-400 hover:text-white transition-colors"
            >
              Anterior
            </button>
          ) : (
            <button
              onClick={handleSkip}
              className="px-4 py-2.5 text-neutral-500 hover:text-neutral-300 transition-colors text-sm"
            >
              Omitir
            </button>
          )}

          <button
            onClick={nextStep}
            disabled={saving}
            className="flex-1 max-w-[200px] px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-neutral-900 rounded-xl font-semibold hover:shadow-lg hover:shadow-yellow-400/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
            ) : isLastStep ? (
              <>
                <Check className="w-4 h-4" />
                Guardar
              </>
            ) : (
              <>
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default ProfileOnboarding
