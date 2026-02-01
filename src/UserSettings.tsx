import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { User } from '@supabase/supabase-js'
import Toast from './Toast'
import { useTheme } from './ThemeContext'
import { SunMoonIcon, UserIcon, RabbitIcon, SettingsIcon, XIcon, BellIcon, TrashIcon } from './components/iu/AnimatedIcons';
import { NotificationToggle } from './components/NotificationSettings'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import { MapPin, Phone, Globe, Shield, AlertTriangle, ChevronRight, ChevronDown, Search } from 'lucide-react'
import DeleteAccountModal from './DeleteAccountModal'

// Datos de países y ciudades
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

interface UserSettingsProps {
  user: User
  onClose: () => void
  onProfileUpdated: () => void
  initialTab?: 'profile' | 'appearance' | 'notifications' | 'shortcuts' | 'account'
}

type Tab = 'profile' | 'appearance' | 'notifications' | 'shortcuts' | 'account'

function UserSettings({ user, onClose, onProfileUpdated, initialTab = 'profile' }: UserSettingsProps) {
  const { theme, setTheme } = useTheme()
  const isMobile = useIsMobile()
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'info' })
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Dropdown states
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [citySearch, setCitySearch] = useState('')

  // Get country and cities
  const selectedCountry = countryCode ? countriesData[countryCode] : null
  const availableCities = selectedCountry?.cities || []

  // Filter countries by search
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countries
    return countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
  }, [countrySearch])

  // Filter cities by search
  const filteredCities = useMemo(() => {
    if (!citySearch) return availableCities
    return availableCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
  }, [citySearch, availableCities])

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
    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone, country, city, theme')
      .eq('id', user.id)
      .single()
    if (data) {
      setFullName(data.full_name || '')
      setPhone(data.phone || '')
      setCountry(data.country || '')
      setCity(data.city || '')
      // Buscar el código del país si existe
      if (data.country) {
        const foundCountry = countries.find(c => c.name === data.country)
        if (foundCountry) {
          setCountryCode(foundCountry.code)
        }
      }
      // Sincronizar tema del perfil con el contexto
      if (data.theme && data.theme !== theme) {
        setTheme(data.theme as 'light' | 'dark')
      }
    }
  }

  const handleCountrySelect = (code: string) => {
    const selected = countriesData[code]
    setCountryCode(code)
    setCountry(selected?.name || '')
    setCity('') // Reset city when country changes
    setShowCountryDropdown(false)
    setCountrySearch('')
  }

  const handleCitySelect = (cityName: string) => {
    setCity(cityName)
    setShowCityDropdown(false)
    setCitySearch('')
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  // Swipe to close gesture
  const { dragStyle, isDragging, containerProps } = useBottomSheetGesture({
    onClose: handleClose
  })

  // Bloquear scroll del body cuando el bottom sheet está abierto (móvil)
  useBodyScrollLock(isMobile && isVisible)

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        country: country.trim() || null,
        city: city.trim() || null,
        theme: theme,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
    setLoading(false)
    if (error) showToast('Error: ' + error.message, 'error')
    else { showToast('Perfil actualizado', 'success'); onProfileUpdated() }
  }

  // Guardar tema en el perfil cuando cambie
  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    await supabase
      .from('profiles')
      .update({ theme: newTheme, updated_at: new Date().toISOString() })
      .eq('id', user.id)
  }

  const tabs = [
    { id: 'profile', icon: <UserIcon />, label: 'Perfil' },
    { id: 'appearance', icon: <SunMoonIcon />, label: 'Apariencia' },
    { id: 'notifications', icon: <BellIcon />, label: 'Notificaciones' },
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

  const userInitial = user?.email?.[0]?.toUpperCase() || '?'

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-end md:items-center justify-center transition-all duration-200 ${isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'}`}
        onClick={handleClose}
      >
        <div
          className={`bg-white dark:bg-neutral-800 shadow-2xl w-full overflow-hidden ${
            isMobile
              ? 'rounded-t-3xl max-h-[90vh]'
              : 'rounded-2xl max-w-2xl mx-4 max-h-[85vh] transform transition-all duration-200'
          } ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
          style={isMobile ? {
            ...dragStyle,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          } : undefined}
          onClick={(e) => e.stopPropagation()}
          {...(isMobile ? containerProps : {})}
        >
          {/* Handle (mobile only) */}
          {isMobile && (
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 dark:bg-neutral-600 rounded-full" />
            </div>
          )}

          {/* Header */}
          <div className={`flex items-center justify-between border-b border-gray-200 dark:border-neutral-700 ${isMobile ? 'px-4 pb-4' : 'p-6'}`}>
            <h2 className={`font-bold text-gray-900 dark:text-white flex items-center gap-2 ${isMobile ? 'text-lg mt-2' : 'text-xl'}`}>
              <span className="text-yellow-500 dark:text-yellow-400"><SettingsIcon size={isMobile ? 20 : 24} /></span>
              {isMobile ? 'Ajustes' : 'Configuración'}
            </h2>
            <button onClick={handleClose} className={`text-gray-400 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors ${isMobile ? 'mt-2' : ''}`}>
              <XIcon size={isMobile ? 20 : 24} />
            </button>
          </div>

          {/* Mobile: Tabs horizontales con iconos (sin atajos) */}
          {isMobile && (
            <div className="flex justify-around items-end border-b border-gray-200 dark:border-neutral-700 px-2 py-2 bg-gray-50 dark:bg-neutral-900/50 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {tabs.filter(tab => tab.id !== 'shortcuts').map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex flex-col items-center justify-end gap-1 px-4 py-2 rounded-xl transition-all h-14 ${
                    activeTab === tab.id
                      ? 'bg-yellow-400/20 text-yellow-600 dark:text-yellow-400'
                      : 'text-gray-500 dark:text-neutral-400'
                  }`}
                >
                  <span className="h-6 flex items-center justify-center">{tab.icon}</span>
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className={`flex ${isMobile ? 'flex-col' : ''} ${isMobile ? 'h-[calc(90vh-140px)]' : 'h-[calc(85vh-80px)]'}`}>
            {/* Desktop: Sidebar vertical */}
            {!isMobile && (
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
                    <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">{tab.icon}</span>
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
            )}

            <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-4' : 'p-6'}`}>
              {activeTab === 'profile' && (
                <div>
                  {!isMobile && <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Mi Perfil</h3>}
                  <div className={`flex items-center gap-4 ${isMobile ? 'mb-4' : 'mb-6'}`}>
                    <div className={`bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-neutral-900 font-bold ${isMobile ? 'w-14 h-14 text-xl' : 'w-20 h-20 text-3xl'}`}>
                      {fullName ? fullName[0].toUpperCase() : userInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium truncate">{user.email}</p>
                      <p className="text-gray-500 dark:text-neutral-500 text-sm">
                        Desde {new Date(user.created_at).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className={isMobile ? 'mb-4' : 'mb-6'}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Nombre</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Tu nombre"
                      className={`w-full bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-3'}`}
                    />
                  </div>
                  <div className={isMobile ? 'mb-4' : 'mb-6'}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={user.email || ''}
                      disabled
                      className={`w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg text-gray-400 dark:text-neutral-500 cursor-not-allowed ${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-3'}`}
                    />
                  </div>
                  <div className={isMobile ? 'mb-4' : 'mb-6'}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                      <Phone className="inline w-4 h-4 mr-1" />
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+57 300 123 4567"
                      className={`w-full bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-3'}`}
                    />
                  </div>
                  <div className={`grid ${isMobile ? 'grid-cols-1 gap-3 mb-4' : 'grid-cols-2 gap-4 mb-6'}`}>
                    {/* Country selector */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                        <Globe className="inline w-4 h-4 mr-1" />
                        País
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCountryDropdown(!showCountryDropdown)
                          setShowCityDropdown(false)
                        }}
                        className={`w-full bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-yellow-400 ${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-3'}`}
                      >
                        <span className={country ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-neutral-500'}>
                          {country || 'Selecciona un país'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-neutral-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showCountryDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-xl overflow-hidden">
                          <div className="p-2 border-b border-gray-200 dark:border-neutral-700">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-neutral-500" />
                              <input
                                type="text"
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                                placeholder="Buscar país..."
                                className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-600 rounded-md pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-yellow-400"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredCountries.map((c) => (
                              <button
                                key={c.code}
                                onClick={() => handleCountrySelect(c.code)}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors ${
                                  countryCode === c.code ? 'bg-yellow-50 dark:bg-yellow-400/10 text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'
                                }`}
                              >
                                {c.name}
                              </button>
                            ))}
                            {filteredCountries.length === 0 && (
                              <p className="px-4 py-3 text-sm text-gray-500 dark:text-neutral-500 text-center">No se encontraron países</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* City selector */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                        <MapPin className="inline w-4 h-4 mr-1" />
                        Ciudad
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (countryCode) {
                            setShowCityDropdown(!showCityDropdown)
                            setShowCountryDropdown(false)
                          }
                        }}
                        disabled={!countryCode}
                        className={`w-full bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-yellow-400 ${isMobile ? 'px-3 py-2.5 text-sm' : 'px-4 py-3'} ${
                          !countryCode ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <span className={city ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-neutral-500'}>
                          {city || (countryCode ? 'Selecciona una ciudad' : 'Primero selecciona un país')}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-neutral-400 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showCityDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-xl overflow-hidden">
                          <div className="p-2 border-b border-gray-200 dark:border-neutral-700">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-neutral-500" />
                              <input
                                type="text"
                                value={citySearch}
                                onChange={(e) => setCitySearch(e.target.value)}
                                placeholder="Buscar ciudad..."
                                className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-600 rounded-md pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-yellow-400"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredCities.map((cityName) => (
                              <button
                                key={cityName}
                                onClick={() => handleCitySelect(cityName)}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors ${
                                  city === cityName ? 'bg-yellow-50 dark:bg-yellow-400/10 text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'
                                }`}
                              >
                                {cityName}
                              </button>
                            ))}
                            {filteredCities.length === 0 && (
                              <p className="px-4 py-3 text-sm text-gray-500 dark:text-neutral-500 text-center">No se encontraron ciudades</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={handleSaveProfile} disabled={loading} className={`w-full md:w-auto bg-yellow-400 text-neutral-900 rounded-lg font-bold hover:bg-yellow-300 transition-colors disabled:opacity-50 ${isMobile ? 'py-3 text-sm' : 'px-6 py-3'}`}>
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div>
                  {!isMobile && <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Apariencia</h3>}
                  {!isMobile && <p className="text-gray-600 dark:text-neutral-400 text-sm mb-4">Selecciona el tema de la aplicación</p>}
                  <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
                    <button
                      onClick={() => handleThemeChange('dark')}
                      className={`w-full flex items-center gap-3 rounded-xl border-2 transition-all ${isMobile ? 'p-3' : 'p-4 gap-4'} ${
                        theme === 'dark' ? 'bg-yellow-100 dark:bg-yellow-400/10 border-yellow-400' : 'bg-gray-100 dark:bg-neutral-700/30 border-transparent hover:border-gray-300 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className={`bg-neutral-900 rounded-lg flex items-center justify-center border border-neutral-600 ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? 18 : 24} height={isMobile ? 18 : 24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-gray-900 dark:text-white font-medium">Oscuro</div>
                        {!isMobile && <div className="text-gray-500 dark:text-neutral-400 text-sm">Reduce fatiga visual</div>}
                      </div>
                      {theme === 'dark' && <span className="text-yellow-500 dark:text-yellow-400 text-xl">✓</span>}
                    </button>
                    <button
                      onClick={() => handleThemeChange('light')}
                      className={`w-full flex items-center gap-3 rounded-xl border-2 transition-all ${isMobile ? 'p-3' : 'p-4 gap-4'} ${
                        theme === 'light' ? 'bg-yellow-100 dark:bg-yellow-400/10 border-yellow-400' : 'bg-gray-100 dark:bg-neutral-700/30 border-transparent hover:border-gray-300 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className={`bg-white rounded-lg flex items-center justify-center border border-gray-300 ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? 18 : 24} height={isMobile ? 18 : 24} viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        {!isMobile && <div className="text-gray-500 dark:text-neutral-400 text-sm">Mejor en ambientes iluminados</div>}
                      </div>
                      {theme === 'light' && <span className="text-yellow-500 dark:text-yellow-400 text-xl">✓</span>}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div>
                  {!isMobile && <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Notificaciones</h3>}
                  {!isMobile && (
                    <p className="text-gray-600 dark:text-neutral-400 text-sm mb-6">
                      Recibe alertas cuando te asignen tareas o se acerquen fechas de vencimiento.
                    </p>
                  )}
                  <div className={`bg-gray-100 dark:bg-neutral-700/30 rounded-xl ${isMobile ? 'p-3' : 'p-4'}`}>
                    <NotificationToggle userId={user.id} showToast={showToast} />
                  </div>
                  <div className={`bg-blue-50 dark:bg-blue-400/10 border border-blue-200 dark:border-blue-400/30 rounded-lg ${isMobile ? 'mt-4 p-3' : 'mt-6 p-4'}`}>
                    <p className={`text-blue-800 dark:text-blue-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      💡 {isMobile ? 'Instala Tazk como app para mejores notificaciones.' : <><strong>Nota:</strong> Las notificaciones push funcionan mejor cuando instalas Tazk como aplicación desde tu navegador.</>}
                    </p>
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

              {activeTab === 'account' && (
                <div>
                  {!isMobile && <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Cuenta</h3>}

                  {/* Información de la cuenta */}
                  <div className={`bg-gray-100 dark:bg-neutral-800/50 rounded-xl border border-gray-200 dark:border-neutral-700 ${isMobile ? 'p-4 mb-4' : 'p-5 mb-6'}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <Shield className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Estado de la cuenta</p>
                        <p className="text-sm text-green-500">Activa y verificada</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-neutral-400">Creada</p>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {new Date(user.created_at).toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-neutral-400">Último acceso</p>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString('es-CO', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })
                            : 'Ahora'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Zona de peligro */}
                  <div className={`border-2 border-red-200 dark:border-red-500/30 rounded-xl overflow-hidden ${isMobile ? '' : ''}`}>
                    <div className="bg-red-50 dark:bg-red-500/10 px-4 py-3 border-b border-red-200 dark:border-red-500/30">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="font-semibold text-red-600 dark:text-red-400 text-sm">Zona de peligro</span>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white mb-1">
                            Eliminar cuenta permanentemente
                          </p>
                          <p className="text-sm text-gray-500 dark:text-neutral-400">
                            {isMobile
                              ? 'Se eliminarán todos tus datos. Esta acción no se puede deshacer.'
                              : 'Una vez eliminada, todos tus datos, tareas, equipos y configuraciones serán borrados permanentemente. Esta acción no se puede deshacer.'}
                          </p>
                        </div>
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className={`flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all hover:shadow-lg hover:shadow-red-500/25 flex-shrink-0 ${
                            isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2.5'
                          }`}
                        >
                          <TrashIcon size={isMobile ? 16 : 18} />
                          {!isMobile && <span>Eliminar</span>}
                          <ChevronRight className={`${isMobile ? 'w-4 h-4' : 'w-4 h-4'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Info adicional */}
                  <div className={`bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/30 rounded-xl ${isMobile ? 'mt-4 p-3' : 'mt-6 p-4'}`}>
                    <p className={`text-amber-800 dark:text-amber-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      💡 {isMobile
                        ? 'Si solo quieres cerrar sesión, usa el botón en el menú de usuario.'
                        : <><strong>Nota:</strong> Si solo deseas cerrar sesión temporalmente, puedes hacerlo desde el menú de usuario sin eliminar tu cuenta.</>}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}

      {/* Modal de eliminación de cuenta */}
      {showDeleteModal && (
        <DeleteAccountModal
          user={user}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => {
            // Recargar la página para cerrar sesión
            window.location.reload()
          }}
        />
      )}
    </>
  )
}

export default UserSettings
