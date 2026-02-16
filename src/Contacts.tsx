import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { Contact, ContactLabel, UserRole } from './types/database.types'
import { useIsMobile } from './hooks/useIsMobile'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import CreateContact from './CreateContact'
import ConfirmDialog from './ConfirmDialog'
import { LoadingZapIcon } from './components/iu/AnimatedIcons'
import { logContactDeleted, logContactLabelCreated, logContactLabelDeleted } from './lib/activityLogger'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Building2,
  Tag,
  X,
  ChevronDown,
  BookUser,
} from 'lucide-react'

// Leaflet icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Fix: Leaflet no calcula bien el tamaño dentro de modales/paneles
function InvalidateSizeOnMount() {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 300)
  }, [map])
  return null
}

const PRESET_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
]

interface ContactsProps {
  currentUserId: string
  teamId: string | null
  userRole: UserRole | null
  userEmail?: string
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}

function Contacts({ currentUserId, teamId, userRole, userEmail, showToast }: ContactsProps) {
  const isMobile = useIsMobile()
  const canManage = !teamId || userRole === 'owner' || userRole === 'admin'

  // State
  const [contacts, setContacts] = useState<Contact[]>([])
  const [labels, setLabels] = useState<ContactLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLabelFilter, setSelectedLabelFilter] = useState<string | 'all'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null)
  const [viewingContact, setViewingContact] = useState<Contact | null>(null)
  const [showLabelManager, setShowLabelManager] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0])
  const [confirmDeleteLabelId, setConfirmDeleteLabelId] = useState<string | null>(null)

  // Lock body scroll when detail view is open
  useBodyScrollLock(!!viewingContact)

  // Load data
  useEffect(() => {
    loadContacts()
    loadLabels()
  }, [currentUserId, teamId])

  const loadContacts = async () => {
    setLoading(true)

    let query = supabase
      .from('contacts')
      .select('*, contact_labels(*)')
      .order('name')

    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      query = query.eq('user_id', currentUserId).is('team_id', null)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading contacts:', error)
      showToast?.('Error al cargar contactos', 'error')
    } else {
      setContacts(data || [])
    }

    setLoading(false)
  }

  const loadLabels = async () => {
    let query = supabase
      .from('contact_labels')
      .select('*')
      .order('name')

    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      query = query.eq('user_id', currentUserId).is('team_id', null)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading labels:', error)
    } else {
      setLabels(data || [])
    }
  }

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    let result = contacts

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.phone?.toLowerCase().includes(term) ||
          c.company?.toLowerCase().includes(term)
      )
    }

    // Filter by label
    if (selectedLabelFilter !== 'all') {
      result = result.filter((c) => c.label_id === selectedLabelFilter)
    }

    return result
  }, [contacts, searchTerm, selectedLabelFilter])

  // Label CRUD
  const handleAddLabel = async () => {
    if (!newLabelName.trim()) return

    const { data, error } = await supabase
      .from('contact_labels')
      .insert({
        user_id: currentUserId,
        team_id: teamId,
        name: newLabelName.trim(),
        color: newLabelColor,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating label:', error)
      showToast?.('Error al crear etiqueta', 'error')
    } else {
      setLabels((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewLabelName('')
      setNewLabelColor(PRESET_COLORS[0])
      showToast?.('Etiqueta creada', 'success')
      logContactLabelCreated(data.id, data.name, teamId, currentUserId, userEmail)
    }
  }

  const handleDeleteLabel = async (labelId: string) => {
    const labelName = labels.find(l => l.id === labelId)?.name || ''
    const { error } = await supabase
      .from('contact_labels')
      .delete()
      .eq('id', labelId)

    if (error) {
      console.error('Error deleting label:', error)
      showToast?.('Error al eliminar etiqueta', 'error')
    } else {
      setLabels((prev) => prev.filter((l) => l.id !== labelId))
      if (selectedLabelFilter === labelId) {
        setSelectedLabelFilter('all')
      }
      showToast?.('Etiqueta eliminada', 'success')
      logContactLabelDeleted(labelId, labelName, teamId, currentUserId, userEmail)
    }
  }

  // Contact delete
  const handleDeleteContact = async () => {
    if (!deletingContact) return

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', deletingContact.id)

    if (error) {
      console.error('Error deleting contact:', error)
      showToast?.('Error al eliminar contacto', 'error')
    } else {
      setContacts((prev) => prev.filter((c) => c.id !== deletingContact.id))
      showToast?.('Contacto eliminado', 'success')
      logContactDeleted(deletingContact.id, deletingContact.name, teamId, currentUserId, userEmail)
    }

    setDeletingContact(null)
  }

  // Helper: get label for a contact
  const getLabelForContact = (contact: Contact): ContactLabel | null => {
    if (contact.contact_labels) return contact.contact_labels as ContactLabel
    if (contact.label_id) return labels.find((l) => l.id === contact.label_id) || null
    return null
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingZapIcon size={48} />
      </div>
    )
  }

  return (
    <div className={`${isMobile ? 'pb-24' : ''}`}>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <BookUser className="w-6 h-6 text-yellow-400" />
            Contactos
          </h2>
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => setShowLabelManager(!showLabelManager)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                <Tag className="w-4 h-4" />
                {!isMobile && <span>Etiquetas</span>}
              </button>
            )}
            {canManage && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 text-neutral-900 rounded-xl font-semibold hover:bg-yellow-300 transition-all active:scale-95 shadow-lg shadow-yellow-400/20"
              >
                <Plus className="w-5 h-5" />
                {!isMobile && <span>Nuevo</span>}
              </button>
            )}
          </div>
        </div>

        {/* Search and filter row */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar contactos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-colors"
            />
          </div>
          <div className="relative">
            <select
              value={selectedLabelFilter}
              onChange={(e) => setSelectedLabelFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-colors cursor-pointer"
            >
              <option value="all">Todas</option>
              {labels.map((label) => (
                <option key={label.id} value={label.id}>
                  {label.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Label Manager Modal */}
      {showLabelManager && canManage && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLabelManager(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-yellow-400" />
                  Gestionar Etiquetas
                </h3>
                <button
                  onClick={() => setShowLabelManager(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Add new label */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nombre de etiqueta"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddLabel()
                    }}
                    autoFocus
                    className="flex-1 px-3 py-2.5 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                  />
                  <button
                    onClick={handleAddLabel}
                    disabled={!newLabelName.trim()}
                    className="px-4 py-2.5 bg-yellow-400 text-neutral-900 rounded-xl text-sm font-semibold hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Agregar
                  </button>
                </div>

                {/* Color picker */}
                <div className="flex items-center gap-1.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewLabelColor(color)}
                      className={`w-7 h-7 rounded-full transition-all ${
                        newLabelColor === color
                          ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-neutral-800 ring-neutral-900 dark:ring-white scale-110'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                {/* Existing labels */}
                {labels.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {labels.map((label) => (
                      <div
                        key={label.id}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                          confirmDeleteLabelId === label.id
                            ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30'
                            : 'bg-neutral-50 dark:bg-neutral-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            {label.name}
                          </span>
                        </div>

                        {confirmDeleteLabelId === label.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-red-500 dark:text-red-400 mr-1">Eliminar?</span>
                            <button
                              onClick={() => {
                                handleDeleteLabel(label.id)
                                setConfirmDeleteLabelId(null)
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setConfirmDeleteLabelId(null)}
                              className="px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-200 dark:bg-neutral-600 hover:bg-neutral-300 dark:hover:bg-neutral-500 rounded-lg transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteLabelId(label.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-4">
                    No hay etiquetas creadas
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Contact Grid or Empty State */}
      {filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <BookUser className="w-10 h-10 text-neutral-400 dark:text-neutral-500" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            {searchTerm || selectedLabelFilter !== 'all'
              ? 'No se encontraron contactos'
              : canManage
                ? 'Agrega tu primer contacto'
                : 'No hay contactos en este equipo'}
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mb-6">
            {searchTerm || selectedLabelFilter !== 'all'
              ? 'Intenta con otros filtros o busca algo diferente.'
              : canManage
                ? 'Organiza a tus clientes, proveedores y colaboradores en un solo lugar.'
                : 'Los contactos del equipo aparecerán aquí cuando sean agregados.'}
          </p>
          {canManage && !searchTerm && selectedLabelFilter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-yellow-400 text-neutral-900 rounded-xl font-semibold hover:bg-yellow-300 transition-all"
            >
              <Plus className="w-5 h-5" />
              Agregar contacto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => {
            const label = getLabelForContact(contact)

            return (
              <div
                key={contact.id}
                onClick={() => setViewingContact(contact)}
                className="group relative bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm hover:shadow-md hover:border-yellow-400/50 dark:hover:border-yellow-400/30 transition-all cursor-pointer"
              >
                {/* Label pill */}
                {label && (
                  <span
                    className="absolute top-3 right-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${label.color}20`,
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </span>
                )}

                {/* Name */}
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white truncate pr-20">
                  {contact.name}
                </h3>

                {/* Details */}
                <div className="mt-2 space-y-1">
                  {contact.email && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </p>
                  )}
                  {contact.phone && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      {contact.phone}
                    </p>
                  )}
                  {contact.company && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{contact.company}</span>
                    </p>
                  )}
                  {contact.location_address && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{contact.location_address}</span>
                    </p>
                  )}
                </div>

                {/* Action buttons - visible on mobile, show on hover for desktop */}
                {canManage && (
                  <div
                    className={`flex items-center gap-1 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700 ${
                      isMobile ? '' : 'opacity-0 group-hover:opacity-100'
                    } transition-opacity`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingContact(contact)
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-yellow-500 hover:bg-yellow-400/10 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingContact(contact)
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-red-500 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Detail View */}
      {viewingContact && (
        <ContactDetailView
          contact={viewingContact}
          label={getLabelForContact(viewingContact)}
          isMobile={isMobile}
          onClose={() => setViewingContact(null)}
        />
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingContact) && (
        <CreateContact
          currentUserId={currentUserId}
          teamId={teamId}
          editingContact={editingContact}
          labels={labels}
          onClose={() => {
            setShowCreateModal(false)
            setEditingContact(null)
          }}
          onSaved={() => {
            setShowCreateModal(false)
            setEditingContact(null)
            loadContacts()
            showToast?.(editingContact ? 'Contacto actualizado' : 'Contacto creado', 'success')
          }}
          userEmail={userEmail}
          showToast={showToast}
        />
      )}

      {/* Confirm Delete */}
      {deletingContact && (
        <ConfirmDialog
          title="Eliminar contacto"
          message={`¿Estás seguro de eliminar a "${deletingContact.name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          type="danger"
          onConfirm={handleDeleteContact}
          onCancel={() => setDeletingContact(null)}
        />
      )}
    </div>
  )
}

// ============================================================
// Contact Detail View (bottom sheet on mobile, modal on desktop)
// ============================================================
interface ContactDetailViewProps {
  contact: Contact
  label: ContactLabel | null
  isMobile: boolean
  onClose: () => void
}

function ContactDetailView({ contact, label, isMobile, onClose }: ContactDetailViewProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  const hasMap = contact.location_lat != null && contact.location_lng != null

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={handleClose}
    >
      {isMobile ? (
        // Bottom sheet on mobile
        <div
          className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 rounded-t-3xl max-h-[85vh] overflow-y-auto transform transition-transform duration-300 ${
            isVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
          </div>

          <ContactDetailContent
            contact={contact}
            label={label}
            hasMap={hasMap}
            onClose={handleClose}
          />
        </div>
      ) : (
        // Modal / side panel on desktop
        <div
          className={`absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-neutral-800 shadow-2xl overflow-y-auto transform transition-transform duration-300 ${
            isVisible ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <ContactDetailContent
            contact={contact}
            label={label}
            hasMap={hasMap}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  )
}

// ============================================================
// Contact Detail Content (shared between mobile / desktop views)
// ============================================================
interface ContactDetailContentProps {
  contact: Contact
  label: ContactLabel | null
  hasMap: boolean
  onClose: () => void
}

function ContactDetailContent({ contact, label, hasMap, onClose }: ContactDetailContentProps) {
  return (
    <div className="p-6">
      {/* Close button */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0">
          {label && (
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2"
              style={{
                backgroundColor: `${label.color}20`,
                color: label.color,
              }}
            >
              {label.name}
            </span>
          )}
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {contact.name}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Contact info */}
      <div className="space-y-4">
        {contact.email && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Email</p>
              <a
                href={`mailto:${contact.email}`}
                className="text-sm text-neutral-900 dark:text-white hover:text-yellow-500 transition-colors truncate block"
              >
                {contact.email}
              </a>
            </div>
          </div>
        )}

        {contact.phone && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 dark:bg-green-500/10 rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Telefono</p>
              <a
                href={`tel:${contact.phone}`}
                className="text-sm text-neutral-900 dark:text-white hover:text-yellow-500 transition-colors"
              >
                {contact.phone}
              </a>
            </div>
          </div>
        )}

        {contact.company && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Empresa</p>
              <p className="text-sm text-neutral-900 dark:text-white">
                {contact.company}
              </p>
            </div>
          </div>
        )}

        {contact.location_address && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-500/10 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Direccion</p>
              <p className="text-sm text-neutral-900 dark:text-white truncate">
                {contact.location_address}
              </p>
            </div>
          </div>
        )}

        {contact.notes && (
          <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">Notas</p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
              {contact.notes}
            </p>
          </div>
        )}
      </div>

      {/* Map */}
      {hasMap && contact.location_lat != null && contact.location_lng != null && (
        <div className="mt-6">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">Ubicacion</p>
          <div className="h-[250px] rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700" data-no-swipe>
            <MapContainer
              center={[contact.location_lat, contact.location_lng]}
              zoom={15}
              scrollWheelZoom={false}
              dragging={false}
              zoomControl={false}
              doubleClickZoom={false}
              touchZoom={false}
              style={{ height: '100%', width: '100%' }}
            >
              <InvalidateSizeOnMount />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[contact.location_lat, contact.location_lng]} />
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  )
}

export default Contacts
