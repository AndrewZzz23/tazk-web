import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Contact, ContactLabel } from './types/database.types'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import { X, MapPin, Trash2 } from 'lucide-react'
import { LoadingZapIcon } from './components/iu/AnimatedIcons'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet marker icons for Vite
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Fix: Leaflet no calcula bien el tamaño dentro de modales
function InvalidateSizeOnMount() {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 300)
  }, [map])
  return null
}

// Componente para capturar clicks en el mapa
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

// Componente para mover el mapa cuando cambia la posición
function FlyToPosition({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 0.5 })
  }, [map, lat, lng])
  return null
}

interface CreateContactProps {
  currentUserId: string
  teamId: string | null
  editingContact: Contact | null
  labels: ContactLabel[]
  onClose: () => void
  onSaved: () => void
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}


function CreateContact({
  currentUserId,
  teamId,
  editingContact,
  labels,
  onClose,
  onSaved,
  showToast
}: CreateContactProps) {
  const isMobile = useIsMobile()
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [name, setName] = useState(editingContact?.name || '')
  const [email, setEmail] = useState(editingContact?.email || '')
  const [phone, setPhone] = useState(editingContact?.phone || '')
  const [company, setCompany] = useState(editingContact?.company || '')
  const [labelId, setLabelId] = useState(editingContact?.label_id || '')
  const [notes, setNotes] = useState(editingContact?.notes || '')

  // Location state
  const [locationAddress, setLocationAddress] = useState(editingContact?.location_address || '')
  const [locationLat, setLocationLat] = useState<number | null>(editingContact?.location_lat ?? null)
  const [locationLng, setLocationLng] = useState<number | null>(editingContact?.location_lng ?? null)
  const [showMap, setShowMap] = useState(!!(editingContact?.location_lat))
  const [reversingGeocode, setReversingGeocode] = useState(false)

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const { dragStyle, isDragging, containerProps } = useBottomSheetGesture({
    onClose: handleClose
  })

  useBodyScrollLock(isMobile && isVisible)

  // Reverse geocode: convierte lat/lng en dirección
  const reverseGeocode = async (lat: number, lng: number) => {
    setReversingGeocode(true)
    try {
      const res = await fetch(
        `/nominatim/reverse?format=json&lat=${lat}&lon=${lng}&email=jairozb23@gmail.com`
      )
      const data = await res.json()
      if (data?.display_name) {
        setLocationAddress(data.display_name)
      } else {
        setLocationAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
      }
    } catch {
      setLocationAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
    } finally {
      setReversingGeocode(false)
    }
  }

  // Click en el mapa: poner marker y hacer reverse geocode
  const handleMapClick = (lat: number, lng: number) => {
    setLocationLat(lat)
    setLocationLng(lng)
    reverseGeocode(lat, lng)
  }


  const clearLocation = () => {
    setLocationAddress('')
    setLocationLat(null)
    setLocationLng(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      showToast?.('El nombre es obligatorio', 'error')
      return
    }

    setLoading(true)

    const contactData = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      company: company.trim() || null,
      label_id: labelId || null,
      notes: notes.trim() || null,
      location_address: locationAddress || null,
      location_lat: locationLat,
      location_lng: locationLng,
      updated_at: new Date().toISOString()
    }

    let error

    if (editingContact) {
      const { error: updateError } = await supabase
        .from('contacts')
        .update(contactData)
        .eq('id', editingContact.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('contacts')
        .insert({
          user_id: currentUserId,
          team_id: teamId,
          ...contactData
        })
      error = insertError
    }

    setLoading(false)

    if (error) {
      showToast?.('Error al guardar el contacto', 'error')
      console.error('Error saving contact:', error)
    } else {
      showToast?.(editingContact ? 'Contacto actualizado' : 'Contacto creado', 'success')
      onSaved()
      handleClose()
    }
  }

  const inputClass = 'w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-base'

  const renderForm = () => (
    <form onSubmit={handleSubmit} className={`flex-1 overflow-y-auto overflow-x-hidden ${isMobile ? 'px-4 pt-4 pb-8' : 'p-6'}`}>
      {/* Nombre */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          Nombre *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del contacto"
          className={inputClass}
          autoFocus={!isMobile}
          required
        />
      </div>

      {/* Email */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          className={inputClass}
        />
      </div>

      {/* Teléfono */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          Teléfono
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 234 567 890"
          className={inputClass}
        />
      </div>

      {/* Empresa */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          Empresa
        </label>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Nombre de la empresa"
          className={inputClass}
        />
      </div>

      {/* Etiqueta */}
      {labels.length > 0 && (
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
            Etiqueta
          </label>
          <select
            value={labelId}
            onChange={(e) => setLabelId(e.target.value)}
            className={inputClass}
          >
            <option value="">Sin etiqueta</option>
            {labels.map(label => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
          </select>
          {/* Preview de la etiqueta seleccionada con color */}
          {labelId && (
            <div className="flex items-center gap-2 mt-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: labels.find(l => l.id === labelId)?.color || '#9ca3af' }}
              />
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {labels.find(l => l.id === labelId)?.name}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Notas */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          Notas
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionales..."
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Ubicación */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          <MapPin className="w-4 h-4" />
          Ubicación
        </label>

        {!showMap && !locationLat ? (
          <button
            type="button"
            onClick={() => setShowMap(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-500 dark:text-neutral-400 hover:border-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            Seleccionar en el mapa
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              Toca el mapa para seleccionar la ubicación
            </p>

            {/* Mapa interactivo */}
            <div className="h-[250px] rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
              <MapContainer
                center={locationLat !== null && locationLng !== null
                  ? [locationLat, locationLng]
                  : [4.6097, -74.0817] // Bogotá por defecto
                }
                zoom={locationLat !== null ? 15 : 6}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
              >
                <InvalidateSizeOnMount />
                <MapClickHandler onClick={handleMapClick} />
                {locationLat !== null && locationLng !== null && (
                  <FlyToPosition lat={locationLat} lng={locationLng} />
                )}
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {locationLat !== null && locationLng !== null && (
                  <Marker position={[locationLat, locationLng]} />
                )}
              </MapContainer>
            </div>

            {/* Dirección seleccionada */}
            {locationAddress && locationLat !== null && (
              <div className="flex items-start gap-2 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <MapPin className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-neutral-600 dark:text-neutral-300 flex-1 line-clamp-2">
                  {reversingGeocode ? 'Obteniendo dirección...' : locationAddress}
                </p>
              </div>
            )}

            {/* Botón limpiar */}
            <button
              type="button"
              onClick={() => {
                clearLocation()
                setShowMap(false)
              }}
              className="w-full px-4 py-2 text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Quitar ubicación
            </button>
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleClose}
          className="flex-1 px-4 py-3 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-medium hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-all active:scale-[0.98]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="flex-1 px-4 py-3 bg-yellow-400 text-neutral-900 rounded-xl font-bold hover:bg-yellow-300 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20"
        >
          {loading ? (
            <LoadingZapIcon size={20} />
          ) : (
            <span>{editingContact ? 'Guardar' : 'Crear contacto'}</span>
          )}
        </button>
      </div>
    </form>
  )

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <>
        <div
          className={`fixed inset-0 z-50 transition-all duration-200 ${
            isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
          }`}
          onClick={handleClose}
        />
        <div
          className={`fixed inset-x-0 bottom-0 top-4 z-50 bg-white dark:bg-neutral-900 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col safe-area-bottom ${
            isVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{
            ...dragStyle,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
          {...containerProps}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingContact ? 'Editar contacto' : 'Nuevo contacto'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X size={20} />
            </button>
          </div>

          {renderForm()}
        </div>
      </>
    )
  }

  // Desktop: Modal
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto transition-all duration-200 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg my-auto max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              {editingContact ? 'Editar contacto' : 'Nuevo contacto'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <X size={20} />
          </button>
        </div>

        {renderForm()}
      </div>
    </div>
  )
}

export default CreateContact
