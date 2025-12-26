import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { User } from '@supabase/supabase-js'
import Toast from './Toast'
import { useTheme } from './ThemeContext'
import { MoonIcon, SunMediumIcon, SunMoonIcon, UserIcon, RabbitIcon, SettingsIcon, XIcon, SaveIcon } from './components/iu/AnimatedIcons';

interface UserSettingsProps {
  user: User
  onClose: () => void
  onProfileUpdated: () => void
  initialTab?: 'profile' | 'appearance' | 'shortcuts'
}

type Tab = 'profile' | 'appearance' | 'shortcuts'

function UserSettings({ user, onClose, onProfileUpdated, initialTab = 'profile' }: UserSettingsProps) {
  const { theme, setTheme } = useTheme()
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'info' })

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    loadProfile()
  }, [])

  // ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    if (data) setFullName(data.full_name || '')
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', user.id)
    setLoading(false)
    if (error) showToast('Error: ' + error.message, 'error')
    else { showToast('Perfil actualizado', 'success'); onProfileUpdated() }
  }

  const tabs = [
    { id: 'profile', icon: <UserIcon />, label: 'Perfil' },
    { id: 'appearance', icon: <SunMoonIcon />, label: 'Apariencia' },
    { id: 'shortcuts', icon: <RabbitIcon />, label: 'Atajos' },
  ]

  const shortcuts = [
    { keys: ['Ctrl', 'K'], description: 'Buscar tareas y funciones' },
    { keys: ['Alt', 'N'], description: 'Nueva tarea' },
    { keys: ['1'], description: 'Vista Lista' },
    { keys: ['2'], description: 'Vista Kanban' },
    { keys: ['3'], description: 'Vista Calendario' },
    { keys: ['Esc'], description: 'Cerrar modal / Limpiar búsqueda' },
  ]

  const userInitial = user?.email?.[0]?.toUpperCase() || '?'

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'}`}
        onClick={handleClose}
      >
        <div
          className={`bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden transform transition-all duration-200 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-yellow-500 dark:text-yellow-400"><SettingsIcon size={24} /></span> Configuración
            </h2>
            <button onClick={handleClose} className="text-gray-400 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors"><XIcon size={24} /></button>
          </div>

          <div className="flex h-[calc(85vh-80px)]">
            <div className="w-48 border-r border-gray-200 dark:border-neutral-700 p-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-yellow-100 dark:bg-yellow-400/10 text-yellow-600 dark:text-yellow-400'
                      : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'profile' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Mi Perfil</h3>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-neutral-900 font-bold text-3xl">
                      {fullName ? fullName[0].toUpperCase() : userInitial}
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">{user.email}</p>
                      <p className="text-gray-500 dark:text-neutral-500 text-sm">
                        Miembro desde {new Date(user.created_at).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Nombre completo</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={user.email || ''}
                      disabled
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg text-gray-400 dark:text-neutral-500 cursor-not-allowed"
                    />
                    <p className="text-gray-400 dark:text-neutral-600 text-xs mt-1">El email no se puede cambiar</p>
                  </div>
                  <button onClick={handleSaveProfile} disabled={loading} className="px-6 py-3 bg-yellow-400 text-neutral-900 rounded-lg font-bold hover:bg-yellow-300 transition-colors disabled:opacity-50">
                    {loading ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Apariencia</h3>
                  <p className="text-gray-600 dark:text-neutral-400 text-sm mb-4">Selecciona el tema de la aplicación</p>
                  <div className="space-y-4">
                    <button
                      onClick={() => setTheme('dark')}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        theme === 'dark' ? 'bg-yellow-100 dark:bg-yellow-400/10 border-yellow-400' : 'bg-gray-100 dark:bg-neutral-700/30 border-transparent hover:border-gray-300 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className="w-12 h-12 bg-neutral-900 rounded-lg flex items-center justify-center border border-neutral-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-gray-900 dark:text-white font-medium">Oscuro</div>
                        <div className="text-gray-500 dark:text-neutral-400 text-sm">Reduce fatiga visual</div>
                      </div>
                      {theme === 'dark' && <span className="text-yellow-500 dark:text-yellow-400 text-xl">✓</span>}
                    </button>
                    <button
                      onClick={() => setTheme('light')}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        theme === 'light' ? 'bg-yellow-100 dark:bg-yellow-400/10 border-yellow-400' : 'bg-gray-100 dark:bg-neutral-700/30 border-transparent hover:border-gray-300 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="4" />
                          <path d="M12 3v1" />
                          <path d="M12 20v1" />
                          <path d="M3 12h1" />
                          <path d="M20 12h1" />
                          <path d="m18.364 5.636-.707.707" />
                          <path d="m6.343 17.657-.707.707" />
                          <path d="m5.636 5.636.707.707" />
                          <path d="m17.657 17.657.707.707" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-gray-900 dark:text-white font-medium">Claro</div>
                        <div className="text-gray-500 dark:text-neutral-400 text-sm">Mejor en ambientes iluminados</div>
                      </div>
                      {theme === 'light' && <span className="text-yellow-500 dark:text-yellow-400 text-xl">✓</span>}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'shortcuts' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Atajos de teclado</h3>
                  <p className="text-gray-600 dark:text-neutral-400 text-sm mb-6">Usa estos atajos para navegar más rápido</p>
                  <div className="space-y-3">
                    {shortcuts.map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-neutral-700/30 rounded-lg">
                        <span className="text-gray-700 dark:text-neutral-300">{shortcut.description}</span>
                        <div className="flex gap-1">
                          {shortcut.keys.map((key, i) => (
                            <span key={i}>
                              <kbd className="px-2 py-1 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded text-sm text-gray-900 dark:text-white font-mono">{key}</kbd>
                              {i < shortcut.keys.length - 1 && <span className="text-gray-400 dark:text-neutral-500 mx-1">+</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-200 dark:border-yellow-400/30 rounded-lg">
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                      💡 <strong>Tip:</strong> Los atajos numéricos solo funcionan cuando no estás escribiendo en un campo de texto.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}
    </>
  )
}

export default UserSettings
