import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { User, Phone, MapPin, Globe, Sun, Moon, Bell, BellOff, ArrowRight, Check, Sparkles, ChevronDown, Search } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { useTheme } from '../ThemeContext'

interface ProfileOnboardingProps {
  user: SupabaseUser
  onComplete: () => void
}

type ThemeOption = 'dark' | 'light'

// Datos de países y ciudades
const countriesData: Record<string, { name: string; code: string; cities: string[] }> = {
  CO: {
    name: 'Colombia',
    code: 'CO',
    cities: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta', 'Bucaramanga', 'Pereira', 'Santa Marta', 'Ibagué', 'Manizales', 'Villavicencio', 'Pasto', 'Montería', 'Neiva']
  },
  MX: {
    name: 'México',
    code: 'MX',
    cities: ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Cancún', 'Mérida', 'Querétaro', 'San Luis Potosí', 'Aguascalientes', 'Hermosillo', 'Chihuahua', 'Morelia']
  },
  AR: {
    name: 'Argentina',
    code: 'AR',
    cities: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'San Miguel de Tucumán', 'Mar del Plata', 'Salta', 'Santa Fe', 'San Juan', 'Resistencia', 'Neuquén', 'Corrientes', 'Posadas', 'Bahía Blanca']
  },
  ES: {
    name: 'España',
    code: 'ES',
    cities: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Granada', 'Oviedo']
  },
  US: {
    name: 'Estados Unidos',
    code: 'US',
    cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Miami', 'Seattle', 'Denver', 'Boston']
  },
  PE: {
    name: 'Perú',
    code: 'PE',
    cities: ['Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Iquitos', 'Cusco', 'Huancayo', 'Tacna', 'Pucallpa', 'Chimbote', 'Juliaca', 'Ica', 'Ayacucho', 'Cajamarca']
  },
  CL: {
    name: 'Chile',
    code: 'CL',
    cities: ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta', 'Temuco', 'Rancagua', 'Talca', 'Arica', 'Chillán', 'Iquique', 'Puerto Montt', 'Coquimbo', 'Valdivia', 'Osorno']
  },
  EC: {
    name: 'Ecuador',
    code: 'EC',
    cities: ['Quito', 'Guayaquil', 'Cuenca', 'Santo Domingo', 'Machala', 'Durán', 'Manta', 'Portoviejo', 'Loja', 'Ambato', 'Esmeraldas', 'Riobamba', 'Ibarra', 'Latacunga', 'Babahoyo']
  },
  VE: {
    name: 'Venezuela',
    code: 'VE',
    cities: ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay', 'Ciudad Guayana', 'Barcelona', 'Maturín', 'Petare', 'Turmero', 'Ciudad Bolívar', 'Cumaná', 'Mérida', 'Barinas', 'Cabimas']
  },
  BR: {
    name: 'Brasil',
    code: 'BR',
    cities: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre', 'Belém', 'Goiânia', 'Guarulhos', 'Campinas', 'São Luís']
  },
  BO: {
    name: 'Bolivia',
    code: 'BO',
    cities: ['La Paz', 'Santa Cruz', 'Cochabamba', 'Sucre', 'Oruro', 'Tarija', 'Potosí', 'Trinidad', 'Cobija', 'Riberalta']
  },
  PY: {
    name: 'Paraguay',
    code: 'PY',
    cities: ['Asunción', 'Ciudad del Este', 'San Lorenzo', 'Luque', 'Capiatá', 'Lambaré', 'Fernando de la Mora', 'Encarnación', 'Caaguazú', 'Coronel Oviedo']
  },
  UY: {
    name: 'Uruguay',
    code: 'UY',
    cities: ['Montevideo', 'Salto', 'Ciudad de la Costa', 'Paysandú', 'Las Piedras', 'Rivera', 'Maldonado', 'Tacuarembó', 'Melo', 'Mercedes']
  },
  PA: {
    name: 'Panamá',
    code: 'PA',
    cities: ['Ciudad de Panamá', 'San Miguelito', 'Tocumen', 'David', 'Arraiján', 'Colón', 'Las Cumbres', 'La Chorrera', 'Pacora', 'Santiago']
  },
  CR: {
    name: 'Costa Rica',
    code: 'CR',
    cities: ['San José', 'Limón', 'Alajuela', 'Heredia', 'Puntarenas', 'Cartago', 'Liberia', 'Paraíso', 'San Francisco', 'Desamparados']
  },
  GT: {
    name: 'Guatemala',
    code: 'GT',
    cities: ['Ciudad de Guatemala', 'Mixco', 'Villa Nueva', 'Petapa', 'San Juan Sacatepéquez', 'Quetzaltenango', 'Villa Canales', 'Escuintla', 'Chinautla', 'Chimaltenango']
  },
  HN: {
    name: 'Honduras',
    code: 'HN',
    cities: ['Tegucigalpa', 'San Pedro Sula', 'Choloma', 'La Ceiba', 'El Progreso', 'Choluteca', 'Comayagua', 'Puerto Cortés', 'Danlí', 'Siguatepeque']
  },
  SV: {
    name: 'El Salvador',
    code: 'SV',
    cities: ['San Salvador', 'Soyapango', 'Santa Ana', 'San Miguel', 'Mejicanos', 'Santa Tecla', 'Apopa', 'Delgado', 'Ilopango', 'Usulután']
  },
  NI: {
    name: 'Nicaragua',
    code: 'NI',
    cities: ['Managua', 'León', 'Masaya', 'Tipitapa', 'Chinandega', 'Matagalpa', 'Estelí', 'Granada', 'Ciudad Sandino', 'Jinotega']
  },
  DO: {
    name: 'República Dominicana',
    code: 'DO',
    cities: ['Santo Domingo', 'Santiago', 'Santo Domingo Este', 'Santo Domingo Norte', 'Los Alcarrizos', 'San Pedro de Macorís', 'La Romana', 'Bella Vista', 'San Cristóbal', 'Puerto Plata']
  },
  PR: {
    name: 'Puerto Rico',
    code: 'PR',
    cities: ['San Juan', 'Bayamón', 'Carolina', 'Ponce', 'Caguas', 'Guaynabo', 'Arecibo', 'Mayagüez', 'Toa Baja', 'Trujillo Alto']
  },
  CU: {
    name: 'Cuba',
    code: 'CU',
    cities: ['La Habana', 'Santiago de Cuba', 'Camagüey', 'Holguín', 'Santa Clara', 'Guantánamo', 'Bayamo', 'Las Tunas', 'Cienfuegos', 'Pinar del Río']
  }
}

const countries = Object.values(countriesData).sort((a, b) => a.name.localeCompare(b.name))

function ProfileOnboarding({ user, onComplete }: ProfileOnboardingProps) {
  const { setTheme: applyTheme } = useTheme()
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [city, setCity] = useState('')
  const [theme, setTheme] = useState<ThemeOption>('dark')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [notifyOnAssign, setNotifyOnAssign] = useState(true)

  // Dropdown states
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [citySearch, setCitySearch] = useState('')

  // Get country name and cities
  const selectedCountry = countryCode ? countriesData[countryCode] : null
  const availableCities = selectedCountry?.cities || []

  // Filter countries by search
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countries
    return countries.filter(c =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase())
    )
  }, [countrySearch])

  // Filter cities by search
  const filteredCities = useMemo(() => {
    if (!citySearch) return availableCities
    return availableCities.filter(c =>
      c.toLowerCase().includes(citySearch.toLowerCase())
    )
  }, [citySearch, availableCities])

  const handleClose = async () => {
    setSaving(true)

    // Aplicar el tema seleccionado al contexto
    applyTheme(theme)

    // Guardar perfil y marcar onboarding como completado
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        country: selectedCountry?.name || null,
        city: city.trim() || null,
        theme: theme,
        notifications_enabled: notificationsEnabled,
        notify_on_assign: notifyOnAssign,
        has_completed_profile_onboarding: true,
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


  const handleCountrySelect = (code: string) => {
    setCountryCode(code)
    setCity('') // Reset city when country changes
    setShowCountryDropdown(false)
    setCountrySearch('')
  }

  const handleCitySelect = (cityName: string) => {
    setCity(cityName)
    setShowCityDropdown(false)
    setCitySearch('')
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
            <h2 className="text-2xl font-bold text-white mb-2">¡Bienvenido a Tazk!</h2>
            <p className="text-neutral-400">
              Personaliza tu experiencia completando tu perfil
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-2 text-yellow-400"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">Solo te tomará un momento</span>
            <Sparkles className="w-4 h-4" />
          </motion.div>
        </div>
      )
    },
    {
      id: 'personal',
      title: 'Información personal',
      content: (
        <div className="space-y-4">
          <p className="text-neutral-400 text-center text-sm mb-4">
            Completa tu información para personalizar tu experiencia
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              <User className="inline w-4 h-4 mr-1.5 text-yellow-400" />
              Nombre completo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              className={`w-full bg-neutral-800 border rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 ${
                !fullName.trim() ? 'border-neutral-700' : 'border-green-500/50'
              }`}
            />
            {!fullName.trim() && (
              <p className="text-neutral-500 text-xs mt-1">Este campo es obligatorio</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              <Phone className="inline w-4 h-4 mr-1.5 text-blue-400" />
              Teléfono (opcional)
            </label>
            <input
              type="tel"
              name="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+57 300 123 4567"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
            />
          </motion.div>
        </div>
      )
    },
    {
      id: 'location',
      title: 'Ubicación',
      content: (
        <div className="space-y-4">
          <p className="text-neutral-400 text-center text-sm mb-4">
            ¿Dónde te encuentras?
          </p>

          {/* Country selector */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              <Globe className="inline w-4 h-4 mr-1.5 text-green-400" />
              País
            </label>
            <button
              type="button"
              onClick={() => {
                setShowCountryDropdown(!showCountryDropdown)
                setShowCityDropdown(false)
              }}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
            >
              <span className={selectedCountry ? 'text-white' : 'text-neutral-500'}>
                {selectedCountry?.name || 'Selecciona un país'}
              </span>
              <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCountryDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl overflow-hidden">
                <div className="p-2 border-b border-neutral-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Buscar país..."
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-400"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => handleCountrySelect(country.code)}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-700 transition-colors ${
                        countryCode === country.code ? 'bg-yellow-400/10 text-yellow-400' : 'text-white'
                      }`}
                    >
                      {country.name}
                    </button>
                  ))}
                  {filteredCountries.length === 0 && (
                    <p className="px-4 py-3 text-sm text-neutral-500 text-center">No se encontraron países</p>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* City selector */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              <MapPin className="inline w-4 h-4 mr-1.5 text-red-400" />
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
              className={`w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 ${
                !countryCode ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <span className={city ? 'text-white' : 'text-neutral-500'}>
                {city || (countryCode ? 'Selecciona una ciudad' : 'Primero selecciona un país')}
              </span>
              <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCityDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl overflow-hidden">
                <div className="p-2 border-b border-neutral-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="text"
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      placeholder="Buscar ciudad..."
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-400"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-28 overflow-y-auto">
                  {filteredCities.map((cityName) => (
                    <button
                      key={cityName}
                      onClick={() => handleCitySelect(cityName)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-neutral-700 transition-colors ${
                        city === cityName ? 'bg-yellow-400/10 text-yellow-400' : 'text-white'
                      }`}
                    >
                      {cityName}
                    </button>
                  ))}
                  {filteredCities.length === 0 && (
                    <p className="px-4 py-2 text-sm text-neutral-500 text-center">No se encontraron ciudades</p>
                  )}
                </div>
              </div>
            )}
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
            Elige el tema que prefieras para la aplicación
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
              <p className="text-neutral-500 text-xs mt-1">Clásico y limpio</p>
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
            Configura cómo quieres recibir notificaciones
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
            <div className="space-y-3">
              <div
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
              </div>

            </div>
          )}
        </div>
      )
    },
    {
      id: 'ready',
      title: '¡Listo!',
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
            <h2 className="text-2xl font-bold text-white mb-2">¡Perfil configurado!</h2>
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
            {selectedCountry && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-green-400" />
                <span className="text-neutral-400">País:</span>
                <span className="text-white">{selectedCountry.name}</span>
              </div>
            )}
            {city && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-red-400" />
                <span className="text-neutral-400">Ciudad:</span>
                <span className="text-white">{city}</span>
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
      onClick={() => {
        setShowCountryDropdown(false)
        setShowCityDropdown(false)
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: isVisible ? 1 : 0.9, opacity: isVisible ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-md bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden border border-neutral-800"
        onClick={(e) => e.stopPropagation()}
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
            <div /> // Placeholder para mantener el layout
          )}

          <button
            onClick={nextStep}
            disabled={saving || (steps[currentStep].id === 'personal' && !fullName.trim())}
            className="flex-1 max-w-[200px] px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-neutral-900 rounded-xl font-semibold hover:shadow-lg hover:shadow-yellow-400/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
