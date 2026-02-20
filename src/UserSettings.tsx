import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { User } from '@supabase/supabase-js'
import Toast from './Toast'
import { useTheme } from './ThemeContext'
import { SunMoonIcon, UserIcon, RabbitIcon, SettingsIcon, XIcon, BellIcon, TrashIcon, ListIcon } from './components/iu/AnimatedIcons';
import { NotificationToggle, NotificationPreferences } from './components/NotificationSettings'
import { usePushNotifications } from './hooks/usePushNotifications'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import {
  MapPin, Phone, Globe, Shield, AlertTriangle, ChevronRight, ChevronDown, Search,
  List, Columns, Calendar, CheckCircle2, BarChart3, Users, Clock
} from 'lucide-react'
import DeleteAccountModal from './DeleteAccountModal'

// ─── Datos de países ──────────────────────────────────────────────────────────
const countriesData: Record<string, { name: string; code: string; cities: string[] }> = {
  CO: { name: 'Colombia', code: 'CO', cities: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta', 'Bucaramanga', 'Pereira', 'Santa Marta', 'Ibagué', 'Manizales', 'Villavicencio', 'Pasto', 'Montería', 'Neiva'] },
  MX: { name: 'México', code: 'MX', cities: ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Cancún', 'Mérida', 'Querétaro', 'San Luis Potosí', 'Aguascalientes', 'Hermosillo', 'Chihuahua', 'Morelia'] },
  AR: { name: 'Argentina', code: 'AR', cities: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'San Miguel de Tucumán', 'Mar del Plata', 'Salta', 'Santa Fe', 'San Juan', 'Resistencia', 'Neuquén', 'Corrientes', 'Posadas', 'Bahía Blanca'] },
  ES: { name: 'España', code: 'ES', cities: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Granada', 'Oviedo'] },
  US: { name: 'Estados Unidos', code: 'US', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Miami', 'Seattle', 'Denver', 'Boston'] },
  PE: { name: 'Perú', code: 'PE', cities: ['Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Iquitos', 'Cusco', 'Huancayo', 'Tacna', 'Pucallpa', 'Chimbote', 'Juliaca', 'Ica', 'Ayacucho', 'Cajamarca'] },
  CL: { name: 'Chile', code: 'CL', cities: ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta', 'Temuco', 'Rancagua', 'Talca', 'Arica', 'Chillán', 'Iquique', 'Puerto Montt', 'Coquimbo', 'Valdivia', 'Osorno'] },
  EC: { name: 'Ecuador', code: 'EC', cities: ['Quito', 'Guayaquil', 'Cuenca', 'Santo Domingo', 'Machala', 'Durán', 'Manta', 'Portoviejo', 'Loja', 'Ambato', 'Esmeraldas', 'Riobamba', 'Ibarra', 'Latacunga', 'Babahoyo'] },
  VE: { name: 'Venezuela', code: 'VE', cities: ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay', 'Ciudad Guayana', 'Barcelona', 'Maturín', 'Petare', 'Turmero', 'Ciudad Bolívar', 'Cumaná', 'Mérida', 'Barinas', 'Cabimas'] },
  BR: { name: 'Brasil', code: 'BR', cities: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre', 'Belém', 'Goiânia', 'Guarulhos', 'Campinas', 'São Luís'] },
  BO: { name: 'Bolivia', code: 'BO', cities: ['La Paz', 'Santa Cruz', 'Cochabamba', 'Sucre', 'Oruro', 'Tarija', 'Potosí', 'Trinidad', 'Cobija', 'Riberalta'] },
  PY: { name: 'Paraguay', code: 'PY', cities: ['Asunción', 'Ciudad del Este', 'San Lorenzo', 'Luque', 'Capiatá', 'Lambaré', 'Fernando de la Mora', 'Encarnación', 'Caaguazú', 'Coronel Oviedo'] },
  UY: { name: 'Uruguay', code: 'UY', cities: ['Montevideo', 'Salto', 'Ciudad de la Costa', 'Paysandú', 'Las Piedras', 'Rivera', 'Maldonado', 'Tacuarembó', 'Melo', 'Mercedes'] },
  PA: { name: 'Panamá', code: 'PA', cities: ['Ciudad de Panamá', 'San Miguelito', 'Tocumen', 'David', 'Arraiján', 'Colón', 'Las Cumbres', 'La Chorrera', 'Pacora', 'Santiago'] },
  CR: { name: 'Costa Rica', code: 'CR', cities: ['San José', 'Limón', 'Alajuela', 'Heredia', 'Puntarenas', 'Cartago', 'Liberia', 'Paraíso', 'San Francisco', 'Desamparados'] },
  GT: { name: 'Guatemala', code: 'GT', cities: ['Ciudad de Guatemala', 'Mixco', 'Villa Nueva', 'Petapa', 'San Juan Sacatepéquez', 'Quetzaltenango', 'Villa Canales', 'Escuintla', 'Chinautla', 'Chimaltenango'] },
  HN: { name: 'Honduras', code: 'HN', cities: ['Tegucigalpa', 'San Pedro Sula', 'Choloma', 'La Ceiba', 'El Progreso', 'Choluteca', 'Comayagua', 'Puerto Cortés', 'Danlí', 'Siguatepeque'] },
  SV: { name: 'El Salvador', code: 'SV', cities: ['San Salvador', 'Soyapango', 'Santa Ana', 'San Miguel', 'Mejicanos', 'Santa Tecla', 'Apopa', 'Delgado', 'Ilopango', 'Usulután'] },
  NI: { name: 'Nicaragua', code: 'NI', cities: ['Managua', 'León', 'Masaya', 'Tipitapa', 'Chinandega', 'Matagalpa', 'Estelí', 'Granada', 'Ciudad Sandino', 'Jinotega'] },
  DO: { name: 'República Dominicana', code: 'DO', cities: ['Santo Domingo', 'Santiago', 'Santo Domingo Este', 'Santo Domingo Norte', 'Los Alcarrizos', 'San Pedro de Macorís', 'La Romana', 'Bella Vista', 'San Cristóbal', 'Puerto Plata'] },
  PR: { name: 'Puerto Rico', code: 'PR', cities: ['San Juan', 'Bayamón', 'Carolina', 'Ponce', 'Caguas', 'Guaynabo', 'Arecibo', 'Mayagüez', 'Toa Baja', 'Trujillo Alto'] },
  CU: { name: 'Cuba', code: 'CU', cities: ['La Habana', 'Santiago de Cuba', 'Camagüey', 'Holguín', 'Santa Clara', 'Guantánamo', 'Bayamo', 'Las Tunas', 'Cienfuegos', 'Pinar del Río'] }
}

const countries = Object.values(countriesData).sort((a, b) => a.name.localeCompare(b.name))

// ─── Avatar con iniciales coloreadas ─────────────────────────────────────────
const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
  'from-yellow-400 to-orange-500',
  'from-teal-500 to-green-600',
]

function getAvatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[6]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0][0].toUpperCase()
  }
  return (email?.[0] || '?').toUpperCase()
}

// ─── Mini toggle reutilizable ─────────────────────────────────────────────────
function Toggle({ value, onChange, disabled }: { value: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-yellow-400' : 'bg-gray-300 dark:bg-neutral-600'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface UserSettingsProps {
  user: User
  onClose: () => void
  onProfileUpdated: () => void
  initialTab?: 'profile' | 'appearance' | 'notifications' | 'tasks' | 'shortcuts' | 'account'
}

type Tab = 'profile' | 'appearance' | 'notifications' | 'tasks' | 'shortcuts' | 'account'

// ─── Componente principal ─────────────────────────────────────────────────────
function UserSettings({ user, onClose, onProfileUpdated, initialTab = 'profile' }: UserSettingsProps) {
  const { theme, setTheme } = useTheme()
  const isMobile = useIsMobile()
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  // Profile
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)

  // Task prefs
  const [showStartDate, setShowStartDate] = useState(true)
  const [showDueDate, setShowDueDate] = useState(true)
  const [showPriority, setShowPriority] = useState(true)
  const [showContactInEdit, setShowContactInEdit] = useState(true)
  const [defaultPriority, setDefaultPriority] = useState<string | null>(null)
  const [defaultView, setDefaultView] = useState<string>('list')

  // Account stats
  const [stats, setStats] = useState({ created: 0, completed: 0, teams: 0, daysActive: 0 })

  // UI
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'info' })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [citySearch, setCitySearch] = useState('')

  const { isSubscribed } = usePushNotifications({ userId: user.id })

  const selectedCountry = countryCode ? countriesData[countryCode] : null
  const availableCities = selectedCountry?.cities || []

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countries
    return countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
  }, [countrySearch])

  const filteredCities = useMemo(() => {
    if (!citySearch) return availableCities
    return availableCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
  }, [citySearch, availableCities])

  // Progreso del perfil
  const profileCompletion = useMemo(() => {
    let filled = 0
    if (fullName.trim()) filled++
    if (phone.trim()) filled++
    if (country) filled++
    if (city) filled++
    return Math.round((filled / 4) * 100)
  }, [fullName, phone, country, city])

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    loadProfile()
  }, [])

  useEffect(() => {
    if (activeTab === 'account') loadStats()
  }, [activeTab])

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone, country, city, theme, show_start_date, show_due_date, show_priority, show_contact_in_edit, default_priority, default_view')
      .eq('id', user.id)
      .single()
    if (data) {
      setFullName(data.full_name || '')
      setPhone(data.phone || '')
      setCountry(data.country || '')
      setCity(data.city || '')
      if (data.country) {
        const found = countries.find(c => c.name === data.country)
        if (found) setCountryCode(found.code)
      }
      if (data.theme && data.theme !== theme) setTheme(data.theme as 'light' | 'dark')
      if (data.show_start_date !== undefined) setShowStartDate(data.show_start_date)
      if (data.show_due_date !== undefined) setShowDueDate(data.show_due_date)
      if (data.show_priority !== undefined) setShowPriority(data.show_priority)
      if (data.show_contact_in_edit !== undefined) setShowContactInEdit(data.show_contact_in_edit)
      setDefaultPriority((data as any).default_priority ?? null)
      setDefaultView((data as any).default_view ?? 'list')
    }
  }

  const loadStats = async () => {
    const [created, completed, teams] = await Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('created_by', user.id).eq('task_statuses.category', 'completed'),
      supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    const days = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
    setStats({
      created: created.count ?? 0,
      completed: completed.count ?? 0,
      teams: teams.count ?? 0,
      daysActive: days,
    })
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const { dragStyle, isDragging, containerProps } = useBottomSheetGesture({ onClose: handleClose })
  useBodyScrollLock(isMobile && isVisible)

  const showToast = (message: string, type: 'success' | 'error' | 'info') => setToast({ show: true, message, type })

  const handleSaveProfile = async () => {
    setLoading(true)
    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      country: country.trim() || null,
      city: city.trim() || null,
      theme,
      updated_at: new Date().toISOString()
    }).eq('id', user.id)
    setLoading(false)
    if (error) showToast('Error: ' + error.message, 'error')
    else { showToast('Perfil actualizado', 'success'); onProfileUpdated() }
  }

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    await supabase.from('profiles').update({ theme: newTheme, updated_at: new Date().toISOString() }).eq('id', user.id)
  }

  const handleTaskPrefChange = async (field: string, value: boolean) => {
    await supabase.from('profiles').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', user.id)
  }

  const handleDefaultChange = async (field: string, value: string | null) => {
    await supabase.from('profiles').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', user.id)
  }

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'profile', icon: <UserIcon />, label: 'Perfil' },
    { id: 'appearance', icon: <SunMoonIcon />, label: 'Apariencia' },
    { id: 'notifications', icon: <BellIcon />, label: 'Notificaciones' },
    { id: 'tasks', icon: <ListIcon />, label: 'Tareas' },
    { id: 'shortcuts', icon: <RabbitIcon />, label: 'Atajos' },
    { id: 'account', icon: <Shield className="w-5 h-5" />, label: 'Cuenta' },
  ]

  const shortcuts = [
    { keys: ['Ctrl', 'K'], description: 'Buscar tareas y funciones' },
    { keys: ['Alt', 'N'], description: 'Nueva tarea' },
    { keys: ['1'], description: 'Vista Lista' },
    { keys: ['2'], description: 'Vista Kanban' },
    { keys: ['3'], description: 'Vista Calendario' },
    { keys: ['Esc'], description: 'Cerrar modal / Limpiar búsqueda' },
  ]

  // ─── Renderizado de tabs ────────────────────────────────────────────────────
  const renderTabContent = () => (
    <>
      {/* ── PERFIL ── */}
      {activeTab === 'profile' && (
        <div>
          {!isMobile && <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Mi Perfil</h3>}

          {/* Avatar + info */}
          <div className={`flex items-center gap-4 ${isMobile ? 'mb-5' : 'mb-6'}`}>
            <div className={`bg-gradient-to-br ${getAvatarColor(fullName || user.email || '')} rounded-2xl flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0 ${isMobile ? 'w-14 h-14 text-xl' : 'w-16 h-16 text-2xl'}`}>
              {getInitials(fullName, user.email || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 dark:text-white font-semibold truncate">{fullName || 'Sin nombre'}</p>
              <p className="text-gray-500 dark:text-neutral-400 text-sm truncate">{user.email}</p>
              {/* Barra de progreso */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400 dark:text-neutral-500">Perfil completado</span>
                  <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">{profileCompletion}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Campos */}
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 gap-4'}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Nombre completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
                className={`w-full bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all ${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-3'}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Email</label>
              <input
                type="email"
                value={user.email || ''}
                disabled
                className={`w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-400 dark:text-neutral-500 cursor-not-allowed ${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-3'}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">
                <Phone className="inline w-3.5 h-3.5 mr-1 mb-0.5" />Teléfono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+57 300 123 4567"
                className={`w-full bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all ${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-3'}`}
              />
            </div>

            <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {/* País */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">
                  <Globe className="inline w-3.5 h-3.5 mr-1 mb-0.5" />País
                </label>
                <button
                  type="button"
                  onClick={() => { setShowCountryDropdown(!showCountryDropdown); setShowCityDropdown(false) }}
                  className={`w-full bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-xl text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-yellow-400 ${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-3'}`}
                >
                  <span className={country ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-neutral-500'}>
                    {country || 'Selecciona un país'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showCountryDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-gray-200 dark:border-neutral-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} placeholder="Buscar país..." autoFocus onClick={(e) => e.stopPropagation()}
                          className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-600 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredCountries.map((c) => (
                        <button key={c.code} onClick={() => { setCountryCode(c.code); setCountry(c.name); setCity(''); setShowCountryDropdown(false); setCountrySearch('') }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors ${countryCode === c.code ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-400/10' : 'text-gray-900 dark:text-white'}`}
                        >{c.name}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Ciudad */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">
                  <MapPin className="inline w-3.5 h-3.5 mr-1 mb-0.5" />Ciudad
                </label>
                <button
                  type="button"
                  onClick={() => { if (countryCode) { setShowCityDropdown(!showCityDropdown); setShowCountryDropdown(false) } }}
                  disabled={!countryCode}
                  className={`w-full bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-xl text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-yellow-400 ${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-3'} ${!countryCode ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={city ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-neutral-500'}>
                    {city || (countryCode ? 'Selecciona ciudad' : 'Primero elige país')}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showCityDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-gray-200 dark:border-neutral-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" value={citySearch} onChange={(e) => setCitySearch(e.target.value)} placeholder="Buscar ciudad..." autoFocus onClick={(e) => e.stopPropagation()}
                          className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-600 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredCities.map((cityName) => (
                        <button key={cityName} onClick={() => { setCity(cityName); setShowCityDropdown(false); setCitySearch('') }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors ${city === cityName ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-400/10' : 'text-gray-900 dark:text-white'}`}
                        >{cityName}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className={`mt-5 w-full bg-yellow-400 text-neutral-900 rounded-xl font-bold hover:bg-yellow-300 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-yellow-400/20 ${isMobile ? 'py-3 text-sm' : 'py-3 px-6'}`}
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}

      {/* ── APARIENCIA ── */}
      {activeTab === 'appearance' && (
        <div>
          {!isMobile && <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Apariencia</h3>}
          {!isMobile && <p className="text-gray-500 dark:text-neutral-400 text-sm mb-5">Selecciona el tema de la aplicación</p>}
          <div className={isMobile ? 'space-y-3' : 'space-y-3'}>
            {[
              { id: 'dark', label: 'Oscuro', desc: 'Reduce la fatiga visual en entornos oscuros', icon: (
                <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center border border-neutral-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                </div>
              )},
              { id: 'light', label: 'Claro', desc: 'Ideal para ambientes con buena iluminación', icon: (
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-200">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v1M12 20v1M3 12h1M20 12h1m-2.636-6.364-.707.707M6.343 17.657l-.707.707m0-12.728.707.707m11.314 11.314-.707.707"/></svg>
                </div>
              )},
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => handleThemeChange(opt.id as 'light' | 'dark')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${theme === opt.id ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-400/10' : 'border-transparent bg-gray-100 dark:bg-neutral-700/30 hover:border-gray-300 dark:hover:border-neutral-600'}`}
              >
                {opt.icon}
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{opt.label}</p>
                  {!isMobile && <p className="text-sm text-gray-500 dark:text-neutral-400">{opt.desc}</p>}
                </div>
                {theme === opt.id && <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0"><div className="w-2 h-2 bg-white rounded-full" /></div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── NOTIFICACIONES ── */}
      {activeTab === 'notifications' && (
        <div>
          {!isMobile && <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Notificaciones</h3>}

          {/* Sección Push */}
          <div className="rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden mb-4">
            <div className="p-4">
              <NotificationToggle userId={user.id} showToast={showToast} />
            </div>

            {isSubscribed && (
              <div className="border-t border-gray-100 dark:border-neutral-700/50 px-4 pb-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mt-3 mb-2">Cuándo notificarte</p>
                <NotificationPreferences userId={user.id} isSubscribed={isSubscribed} />
              </div>
            )}

            {!isSubscribed && (
              <div className="border-t border-gray-100 dark:border-neutral-700/50 px-4 py-3">
                <p className="text-xs text-gray-400 dark:text-neutral-500">
                  Activa las notificaciones push para configurar cuándo quieres recibir alertas.
                </p>
              </div>
            )}
          </div>

          {/* Nota PWA */}
          <div className={`bg-blue-50 dark:bg-blue-400/10 border border-blue-200 dark:border-blue-400/30 rounded-xl p-3 mt-4`}>
            <p className="text-blue-800 dark:text-blue-200 text-xs">
              💡 {isMobile
                ? 'Instala Tazk como app para mejores notificaciones.'
                : <><strong>Consejo:</strong> Las notificaciones push funcionan mejor cuando instalas Tazk como aplicación desde tu navegador (Compartir → Añadir a inicio).</>
              }
            </p>
          </div>
        </div>
      )}

      {/* ── TAREAS ── */}
      {activeTab === 'tasks' && (
        <div>
          {!isMobile && <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Configuración de tareas</h3>}
          {!isMobile && <p className="text-gray-500 dark:text-neutral-400 text-sm mb-5">Personaliza cómo se crean y se muestran tus tareas.</p>}

          {/* Campos visibles */}
          <div className="rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden mb-4">
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-neutral-700/50 border-b border-gray-200 dark:border-neutral-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Campos visibles</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-neutral-700/50">
              {[
                { key: 'show_start_date', label: 'Fecha de inicio', desc: 'Mostrar el campo al crear y editar', value: showStartDate, setter: setShowStartDate },
                { key: 'show_due_date', label: 'Fecha límite', desc: 'Mostrar fecha de vencimiento', value: showDueDate, setter: setShowDueDate },
                { key: 'show_priority', label: 'Prioridad', desc: 'Mostrar selector de prioridad', value: showPriority, setter: setShowPriority },
                { key: 'show_contact_in_edit', label: 'Contacto asociado', desc: 'Mostrar contacto al editar', value: showContactInEdit, setter: setShowContactInEdit },
              ].map((pref) => (
                <div key={pref.key} className={`flex items-center justify-between px-4 ${isMobile ? 'py-3' : 'py-3.5'}`}>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{pref.label}</p>
                    {!isMobile && <p className="text-xs text-gray-500 dark:text-neutral-400">{pref.desc}</p>}
                  </div>
                  <Toggle
                    value={pref.value}
                    onChange={() => {
                      const newVal = !pref.value
                      pref.setter(newVal)
                      handleTaskPrefChange(pref.key, newVal)
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Valores por defecto */}
          <div className="rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden mb-4">
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-neutral-700/50 border-b border-gray-200 dark:border-neutral-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Valores por defecto</p>
            </div>
            <div className="px-4 py-4 space-y-4">
              {/* Default priority */}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2.5">Prioridad predeterminada</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: null, label: 'Sin prioridad', color: 'text-gray-500 dark:text-neutral-400', bg: 'bg-gray-100 dark:bg-neutral-700', activeBg: 'bg-gray-300 dark:bg-neutral-600' },
                    { value: 'low', label: '↓ Baja', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-400/10', activeBg: 'bg-emerald-200 dark:bg-emerald-400/30' },
                    { value: 'medium', label: '→ Media', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-400/10', activeBg: 'bg-amber-200 dark:bg-amber-400/30' },
                    { value: 'high', label: '↑ Alta', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-400/10', activeBg: 'bg-red-200 dark:bg-red-400/30' },
                  ].map(opt => {
                    const isActive = defaultPriority === opt.value
                    return (
                      <button
                        key={String(opt.value)}
                        onClick={() => {
                          setDefaultPriority(opt.value)
                          handleDefaultChange('default_priority', opt.value)
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${opt.color} ${
                          isActive
                            ? `${opt.activeBg} border-current`
                            : `${opt.bg} border-transparent hover:border-gray-300 dark:hover:border-neutral-600`
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Default view */}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2.5">Vista predeterminada</p>
                <div className="flex gap-2">
                  {[
                    { value: 'list', label: 'Lista', icon: <List className="w-4 h-4" /> },
                    { value: 'kanban', label: 'Kanban', icon: <Columns className="w-4 h-4" /> },
                    { value: 'calendar', label: 'Calendario', icon: <Calendar className="w-4 h-4" /> },
                  ].map(opt => {
                    const isActive = defaultView === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setDefaultView(opt.value)
                          handleDefaultChange('default_view', opt.value)
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                          isActive
                            ? 'bg-yellow-100 dark:bg-yellow-400/20 border-yellow-400 text-yellow-700 dark:text-yellow-300'
                            : 'bg-gray-100 dark:bg-neutral-700 border-transparent text-gray-600 dark:text-neutral-300 hover:border-gray-300 dark:hover:border-neutral-600'
                        }`}
                      >
                        {opt.icon}{opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ATAJOS ── */}
      {activeTab === 'shortcuts' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Atajos de teclado</h3>
          <p className="text-gray-500 dark:text-neutral-400 text-sm mb-5">Navega más rápido con estos atajos</p>
          <div className="space-y-2">
            {shortcuts.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-neutral-700/30 rounded-xl">
                <span className="text-sm text-gray-700 dark:text-neutral-300">{s.description}</span>
                <div className="flex items-center gap-1">
                  {s.keys.map((key, j) => (
                    <span key={j} className="flex items-center gap-1">
                      <kbd className="px-2 py-1 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-xs text-gray-900 dark:text-white font-mono shadow-sm">{key}</kbd>
                      {j < s.keys.length - 1 && <span className="text-gray-400 text-xs">+</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-200 dark:border-yellow-400/30 rounded-xl">
            <p className="text-yellow-800 dark:text-yellow-200 text-xs">
              💡 Los atajos numéricos solo funcionan cuando no estás escribiendo en un campo de texto.
            </p>
          </div>
        </div>
      )}

      {/* ── CUENTA ── */}
      {activeTab === 'account' && (
        <div>
          {!isMobile && <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Cuenta</h3>}

          {/* Stats de actividad */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { icon: <BarChart3 className="w-4 h-4" />, value: stats.created, label: 'Creadas', color: 'text-blue-500' },
              { icon: <CheckCircle2 className="w-4 h-4" />, value: stats.completed, label: 'Completadas', color: 'text-emerald-500' },
              { icon: <Users className="w-4 h-4" />, value: stats.teams, label: 'Equipos', color: 'text-purple-500' },
              { icon: <Clock className="w-4 h-4" />, value: stats.daysActive, label: 'Días activo', color: 'text-orange-500' },
            ].map((stat, i) => (
              <div key={i} className="bg-gray-100 dark:bg-neutral-700/50 rounded-xl p-3 text-center">
                <div className={`flex justify-center mb-1 ${stat.color}`}>{stat.icon}</div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-[10px] text-gray-500 dark:text-neutral-400 leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Info de cuenta */}
          <div className="bg-gray-100 dark:bg-neutral-800/50 rounded-xl border border-gray-200 dark:border-neutral-700 p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Cuenta activa y verificada</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-neutral-400 text-xs mb-0.5">Creada</p>
                <p className="text-gray-900 dark:text-white font-medium">
                  {new Date(user.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-neutral-400 text-xs mb-0.5">Último acceso</p>
                <p className="text-gray-900 dark:text-white font-medium">
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
                    : 'Ahora'}
                </p>
              </div>
            </div>
          </div>

          {/* Zona de peligro */}
          <div className="border-2 border-red-200 dark:border-red-500/30 rounded-xl overflow-hidden">
            <div className="bg-red-50 dark:bg-red-500/10 px-4 py-2.5 border-b border-red-200 dark:border-red-500/30 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-red-600 dark:text-red-400 text-sm">Zona de peligro</span>
            </div>
            <div className="p-4 flex items-start gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white text-sm mb-1">Eliminar cuenta permanentemente</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400">
                  {isMobile ? 'Se eliminarán todos tus datos. Irreversible.' : 'Todos tus datos, tareas y equipos serán borrados. Esta acción no se puede deshacer.'}
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl px-3 py-2 text-sm transition-all hover:shadow-lg hover:shadow-red-500/25 flex-shrink-0"
              >
                <TrashIcon size={16} />
                {!isMobile && 'Eliminar'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/30 rounded-xl">
            <p className="text-amber-800 dark:text-amber-200 text-xs">
              💡 Para cerrar sesión temporalmente, usa el menú de usuario sin necesidad de eliminar tu cuenta.
            </p>
          </div>
        </div>
      )}
    </>
  )

  const renderExtras = () => (
    <>
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}
      {showDeleteModal && <DeleteAccountModal user={user} onClose={() => setShowDeleteModal(false)} onDeleted={() => window.location.reload()} />}
    </>
  )

  // ─── Mobile: Bottom Sheet ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div className={`fixed inset-0 z-50 transition-all duration-300 ${isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'}`} onClick={handleClose} />
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-neutral-800 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden safe-area-bottom ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ ...dragStyle, transition: isDragging ? 'none' : 'transform 0.3s ease-out' }}
          onClick={(e) => e.stopPropagation()}
          {...containerProps}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 dark:bg-neutral-600 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-neutral-700">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-lg mt-2">
              <span className="text-yellow-500"><SettingsIcon size={20} /></span>Ajustes
            </h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mt-2"><XIcon size={20} /></button>
          </div>
          <div className="flex justify-around items-end border-b border-gray-200 dark:border-neutral-700 px-2 py-2 bg-gray-50 dark:bg-neutral-900/50 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {tabs.filter(t => t.id !== 'shortcuts').map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all h-14 ${activeTab === tab.id ? 'bg-yellow-400/20 text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-neutral-400'}`}
              >
                <span className="h-6 flex items-center">{tab.icon}</span>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4 max-h-[calc(90vh-140px)]">
            {renderTabContent()}
          </div>
        </div>
        {renderExtras()}
      </>
    )
  }

  // ─── Desktop: Side Panel ───────────────────────────────────────────────────
  return (
    <>
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'}`} onClick={handleClose} />
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white dark:bg-neutral-800 shadow-2xl transition-transform duration-300 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-yellow-500"><SettingsIcon size={22} /></span>Configuración
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><XIcon size={22} /></button>
        </div>

        <div className="flex h-[calc(100vh-65px)]">
          <div className="w-44 border-r border-gray-200 dark:border-neutral-700 py-2 px-2 flex-shrink-0">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5 ${activeTab === tab.id ? 'bg-yellow-100 dark:bg-yellow-400/10 text-yellow-700 dark:text-yellow-400' : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">{tab.icon}</span>
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
      {renderExtras()}
    </>
  )
}

export default UserSettings
