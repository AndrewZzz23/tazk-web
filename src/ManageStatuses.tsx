import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { TaskStatus, StatusCategory } from './types/database.types'
import { HexColorPicker } from 'react-colorful'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { LoadingZapIcon, XIcon, PaletteIcon, PlusIcon, EditIcon, TrashIcon, CheckIcon } from './components/iu/AnimatedIcons'
import Toast from './Toast'
import { logStatusCreated, logStatusUpdated, logStatusDeleted } from './lib/activityLogger'
import { useIsMobile } from './hooks/useIsMobile'
import { ChevronRight } from 'lucide-react'

interface ManageStatusesProps {
  currentUserId: string
  teamId: string | null
  userEmail?: string
  isOwnerOrAdmin: boolean
  onClose: () => void
  onStatusesChanged: () => void
}

const CATEGORIES: { id: StatusCategory; name: string; icon: React.ReactNode; color: string }[] = [
  {
    id: 'not_started',
    name: 'Sin Iniciar',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2} /></svg>,
    color: 'text-gray-400'
  },
  {
    id: 'in_progress',
    name: 'En Progreso',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    color: 'text-blue-400'
  },
  {
    id: 'completed',
    name: 'Completadas',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    color: 'text-emerald-400'
  }
]

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#6b7280'
]

// Tarjeta de estado arrastrable (Desktop)
function StatusCard({ status, onEdit, onDelete, onToggle }: {
  status: TaskStatus
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: status.id,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-yellow-400/50 transition-colors group ${
        isDragging ? 'opacity-0' : ''
      } ${!status.is_active ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: status.color }}
        />
        <span className={`flex-1 text-sm font-medium truncate ${
          status.is_active
            ? 'text-gray-700 dark:text-neutral-200'
            : 'text-gray-400 dark:text-neutral-500 line-through'
        }`}>
          {status.name}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit() }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-400/10 rounded transition-colors"
          >
            <EditIcon size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggle() }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`p-1.5 rounded transition-colors ${
              status.is_active
                ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-400/10'
                : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-400/10'
            }`}
          >
            {status.is_active ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            ) : (
              <CheckIcon size={14} />
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete() }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-400/10 rounded transition-colors"
          >
            <TrashIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// Tarjeta de estado para móvil (sin drag, táctil)
function MobileStatusCard({ status, onEdit, onDelete, onToggle, category }: {
  status: TaskStatus
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  category: typeof CATEGORIES[0]
}) {
  return (
    <div
      className={`bg-neutral-800/50 rounded-2xl p-4 ${!status.is_active ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: status.color }}
        >
          <span className="text-white/90">{category.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className={`font-medium block truncate ${
            status.is_active
              ? 'text-white'
              : 'text-neutral-500 line-through'
          }`}>
            {status.name}
          </span>
          <span className="text-xs text-neutral-500">{category.name}</span>
        </div>
        <button
          onClick={onEdit}
          className="p-2 text-neutral-400 active:bg-neutral-700 rounded-xl"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Acciones rápidas */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-700/50">
        <button
          onClick={onToggle}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            status.is_active
              ? 'bg-orange-500/20 text-orange-400'
              : 'bg-emerald-500/20 text-emerald-400'
          }`}
        >
          {status.is_active ? 'Desactivar' : 'Activar'}
        </button>
        <button
          onClick={onDelete}
          className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium"
        >
          Eliminar
        </button>
      </div>
    </div>
  )
}

// Preview para el DragOverlay
function StatusCardPreview({ status }: { status: TaskStatus }) {
  return (
    <div 
      className="bg-gray-100/50 dark:bg-neutral-700/70 border-2 border-yellow-400 rounded-lg p-3 shadow-xl backdrop-blur-sm"
      style={{ width: '450px' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
        <span className="text-sm font-medium text-gray-700 dark:text-neutral-200 truncate">{status.name}</span>
      </div>
    </div>
  )
}

// Columna droppable
function DroppableColumn({
  category,
  statuses,
  onEdit,
  onDelete,
  onToggle,
}: {
  category: typeof CATEGORIES[0]
  statuses: TaskStatus[]
  onEdit: (status: TaskStatus) => void
  onDelete: (status: TaskStatus) => void
  onToggle: (status: TaskStatus) => void
}) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: category.id,
  })

  const isDraggingFromThis = active && statuses.some(s => s.id === active.id)

  return (
    <div
      ref={setNodeRef}
      className={`bg-white dark:bg-neutral-800/50 rounded-xl p-4 min-h-[100px] transition-all duration-200 ${
        isOver && !isDraggingFromThis
          ? 'ring-2 ring-yellow-400 bg-yellow-400/5'
          : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={category.color}>{category.icon}</span>
          <h3 className="text-gray-900 dark:text-white font-semibold text-sm">{category.name}</h3>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full transition-colors ${
          isOver && !isDraggingFromThis
            ? 'bg-yellow-400/20 text-yellow-600 dark:text-yellow-400'
            : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300'
        }`}>
          {statuses.length}
        </span>
      </div>

      {/* Estados */}
      <div className="space-y-2">
        {statuses.map((status) => (
          <StatusCard
            key={status.id}
            status={status}
            onEdit={() => onEdit(status)}
            onDelete={() => onDelete(status)}
            onToggle={() => onToggle(status)}
          />
        ))}

        {statuses.length === 0 && (
          <div className={`text-center py-4 border-2 border-dashed rounded-lg transition-colors ${
            isOver
              ? 'border-yellow-400 bg-yellow-400/5 text-yellow-600 dark:text-yellow-400'
              : 'border-gray-200 dark:border-neutral-700 text-gray-400 dark:text-neutral-500'
          }`}>
            <span className="text-xs">
              {isOver ? 'Soltar aquí' : 'Sin estados'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Dropdown de categoria
function CategoryDropdown({ value, onChange }: { value: StatusCategory; onChange: (value: StatusCategory) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selected = CATEGORIES.find(c => c.id === value)

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-neutral-700/50 border border-gray-200 dark:border-neutral-600 rounded-lg text-sm text-gray-700 dark:text-neutral-200"
      >
        <span className={selected?.color}>{selected?.icon}</span>
        <span className="flex-1 text-left">{selected?.name}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-xl z-10 overflow-hidden">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => { onChange(cat.id); setIsOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                value === cat.id ? 'bg-yellow-400/10 text-yellow-600 dark:text-yellow-400' : 'text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-700/50'
              }`}
            >
              <span className={cat.color}>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Detección de colisión personalizada
const customCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) {
    return pointerCollisions
  }
  return rectIntersection(args)
}

function ManageStatuses({ currentUserId, teamId, userEmail, isOwnerOrAdmin, onClose, onStatusesChanged }: ManageStatusesProps) {
  const isMobile = useIsMobile()
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [activeStatus, setActiveStatus] = useState<TaskStatus | null>(null)
  const [mobileSelectedCategory, setMobileSelectedCategory] = useState<StatusCategory>('not_started')

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [newCategory, setNewCategory] = useState<StatusCategory>('not_started')
  const [creating, setCreating] = useState(false)

  const [editingStatus, setEditingStatus] = useState<TaskStatus | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [saving, setSaving] = useState(false)

  const [showColorPicker, setShowColorPicker] = useState(false)
  const [colorPickerFor, setColorPickerFor] = useState<'new' | 'edit'>('new')
  const [tempColor, setTempColor] = useState('')

  const [deletingStatus, setDeletingStatus] = useState<TaskStatus | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'info' })

  const createFormRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showColorPicker) setShowColorPicker(false)
        else if (showCreateForm) { setShowCreateForm(false); setNewName('') }
        else if (editingStatus) setEditingStatus(null)
        else if (deletingStatus) setDeletingStatus(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, showColorPicker, showCreateForm, editingStatus, deletingStatus])

  useEffect(() => {
    if (!showCreateForm || showColorPicker) return
    const handleClickOutside = (e: MouseEvent) => {
      if (createFormRef.current && !createFormRef.current.contains(e.target as Node)) {
        setShowCreateForm(false)
        setNewName('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCreateForm, showColorPicker])

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    loadStatuses()
  }, [])

  const showToast = (message: string, type: 'success' | 'error' | 'info') => setToast({ show: true, message, type })

  const loadStatuses = async () => {
    setLoading(true)
    let query = supabase.from('task_statuses').select('*').order('order_position')
    if (teamId) query = query.eq('team_id', teamId)
    else query = query.is('team_id', null)
    const { data } = await query
    setStatuses(data || [])
    setLoading(false)
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const status = statuses.find((s) => s.id === event.active.id)
    if (status) setActiveStatus(status)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveStatus(null)

    if (!over) return

    const statusId = active.id as string
    const newCategoryId = over.id as StatusCategory

    const status = statuses.find((s) => s.id === statusId)
    if (!status || status.category === newCategoryId) return

    const oldCategory = status.category
    const oldOrderPosition = status.order_position

    // Calcular nuevo order_position basado en la categoría de destino
    // Obtener el order_position más alto de la nueva categoría y sumar 1
    const statusesInNewCategory = statuses.filter(s => s.category === newCategoryId)
    const maxOrderInCategory = statusesInNewCategory.length > 0
      ? Math.max(...statusesInNewCategory.map(s => s.order_position))
      : 0
    const newOrderPosition = maxOrderInCategory + 1

    // Optimistic update
    setStatuses((prev) =>
      prev.map((s) =>
        s.id === statusId
          ? { ...s, category: newCategoryId, order_position: newOrderPosition }
          : s
      )
    )

    const { error } = await supabase
      .from('task_statuses')
      .update({ category: newCategoryId, order_position: newOrderPosition })
      .eq('id', statusId)

    if (error) {
      setStatuses((prev) =>
        prev.map((s) =>
          s.id === statusId
            ? { ...s, category: oldCategory, order_position: oldOrderPosition }
            : s
        )
      )
      showToast('Error al mover estado', 'error')
    } else {
      onStatusesChanged()
    }
  }

  const handleCreate = async () => {
    if (!newName.trim() || creating) return
    setCreating(true)
    const maxOrder = statuses.reduce((max, s) => Math.max(max, s.order_position), 0)
    const { data, error } = await supabase
      .from('task_statuses')
      .insert({ name: newName.trim(), color: newColor, category: newCategory, order_position: maxOrder + 1, team_id: teamId, created_by: currentUserId, is_active: true })
      .select()
      .single()
    setCreating(false)
    if (error) {
      showToast('Error al crear', 'error')
    } else if (data) {
      setStatuses(prev => [...prev, data])
      setNewName('')
      setNewColor('#3b82f6')
      setNewCategory('not_started')
      setShowCreateForm(false)
      showToast('Estado creado', 'success')
      logStatusCreated(data.id, data.name, teamId, currentUserId, userEmail)
      onStatusesChanged()
    }
  }

  const handleSaveEdit = async () => {
    if (!editingStatus || !editName.trim() || saving) return
    setSaving(true)
    const oldStatus = { ...editingStatus }
    setStatuses(prev => prev.map(s => s.id === editingStatus.id ? { ...s, name: editName.trim(), color: editColor } : s))
    setEditingStatus(null)
    const { error } = await supabase.from('task_statuses').update({ name: editName.trim(), color: editColor }).eq('id', editingStatus.id)
    setSaving(false)
    if (error) {
      setStatuses(prev => prev.map(s => s.id === oldStatus.id ? oldStatus : s))
      showToast('Error al actualizar', 'error')
    } else {
      showToast('Estado actualizado', 'success')
      logStatusUpdated(oldStatus.id, editName.trim(), teamId, currentUserId, userEmail)
      onStatusesChanged()
    }
  }

  const handleToggle = async (status: TaskStatus) => {
    const oldStatus = { ...status }
    if (status.is_active) {
      const firstActive = statuses.find(s => s.id !== status.id && s.is_active)
      if (firstActive) await supabase.from('tasks').update({ status_id: firstActive.id }).eq('status_id', status.id)
    }
    setStatuses(prev => prev.map(s => s.id === status.id ? { ...s, is_active: !s.is_active } : s))
    const { error } = await supabase.from('task_statuses').update({ is_active: !status.is_active }).eq('id', status.id)
    if (error) {
      setStatuses(prev => prev.map(s => s.id === oldStatus.id ? oldStatus : s))
      showToast('Error', 'error')
    } else {
      showToast(status.is_active ? 'Desactivado' : 'Activado', 'success')
      onStatusesChanged()
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingStatus || deleting) return
    setDeleting(true)
    const status = deletingStatus
    const firstActive = statuses.find(s => s.id !== status.id && s.is_active)
    if (firstActive) await supabase.from('tasks').update({ status_id: firstActive.id }).eq('status_id', status.id)
    const { error } = await supabase.from('task_statuses').delete().eq('id', status.id)
    setDeleting(false)
    setDeletingStatus(null)
    if (error) {
      showToast('Error al eliminar', 'error')
    } else {
      setStatuses(prev => prev.filter(s => s.id !== status.id))
      showToast('Eliminado', 'success')
      logStatusDeleted(status.id, status.name, teamId, currentUserId, userEmail)
      onStatusesChanged()
    }
  }

  const openColorPicker = (type: 'new' | 'edit') => {
    setColorPickerFor(type)
    setTempColor(type === 'new' ? newColor : editColor)
    setShowColorPicker(true)
  }

  const saveColor = () => {
    if (colorPickerFor === 'new') setNewColor(tempColor)
    else setEditColor(tempColor)
    setShowColorPicker(false)
  }

  // Filtrar estados por categoría seleccionada en móvil
  const filteredStatuses = statuses
    .filter(s => s.category === mobileSelectedCategory)
    .sort((a, b) => a.order_position - b.order_position)

  // Renderizar modales compartidos
  const renderModals = () => (
    <>
      {/* Modal editar */}
      {editingStatus && (
        isMobile ? (
          <>
            <div className={`fixed inset-0 z-[60] transition-all duration-200 ${isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'}`} onClick={() => setEditingStatus(null)} />
            <div className="fixed bottom-0 left-0 right-0 z-[60] bg-neutral-900 rounded-t-3xl overflow-hidden safe-area-bottom">
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-neutral-700 rounded-full" />
              </div>
              <div className="px-4 pb-8">
                <h3 className="text-lg font-bold text-white mb-4">Editar estado</h3>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nombre del estado"
                  className="w-full px-4 py-3 mb-4 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-base focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                  autoFocus
                />
                <div className="mb-4">
                  <p className="text-sm text-neutral-400 mb-3">Color</p>
                  <div className="flex flex-wrap gap-3">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditColor(color)}
                        className={`w-10 h-10 rounded-xl transition-all ${editColor === color ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-neutral-900 scale-110' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => openColorPicker('edit')}
                      className="w-10 h-10 rounded-xl border-2 border-dashed border-neutral-600 flex items-center justify-center text-neutral-400"
                    >
                      <PlusIcon size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setEditingStatus(null)} className="flex-1 py-3 bg-neutral-800 text-neutral-300 rounded-xl font-medium">Cancelar</button>
                  <button onClick={handleSaveEdit} disabled={saving || !editName.trim()} className="flex-1 py-3 bg-yellow-400 text-neutral-900 rounded-xl font-bold disabled:opacity-50">{saving ? '...' : 'Guardar'}</button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setEditingStatus(null)}>
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-5 w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Editar estado</h3>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingStatus(null) }} className="w-full px-3 py-2.5 mb-4 bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50" autoFocus />
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Color</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setEditColor(color)} className={`w-7 h-7 rounded-lg transition-all ${editColor === color ? 'ring-2 ring-yellow-400 scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: color }} />
                  ))}
                  <button type="button" onClick={() => openColorPicker('edit')} className="w-7 h-7 rounded-lg border-2 border-dashed border-gray-300 dark:border-neutral-600 flex items-center justify-center hover:border-yellow-400 text-gray-400">
                    <PlusIcon size={14} />
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingStatus(null)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 rounded-xl text-sm font-medium">Cancelar</button>
                <button onClick={handleSaveEdit} disabled={saving || !editName.trim()} className="flex-1 px-4 py-2.5 bg-yellow-400 text-neutral-900 rounded-xl font-medium disabled:opacity-50 text-sm">{saving ? '...' : 'Guardar'}</button>
              </div>
            </div>
          </div>
        )
      )}

      {/* Color picker */}
      {showColorPicker && (
        isMobile ? (
          <>
            <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={() => setShowColorPicker(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-[70] bg-neutral-900 rounded-t-3xl overflow-hidden safe-area-bottom">
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-neutral-700 rounded-full" />
              </div>
              <div className="px-4 pb-8 flex flex-col items-center">
                <h3 className="text-lg font-bold text-white mb-4 self-start">Seleccionar color</h3>
                <HexColorPicker color={tempColor} onChange={setTempColor} style={{ width: '100%', height: '200px' }} />
                <div className="flex gap-3 mt-4 w-full">
                  <input
                    type="text"
                    value={tempColor}
                    onChange={(e) => setTempColor(e.target.value)}
                    className="flex-1 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-center font-mono text-white"
                  />
                  <button
                    onClick={saveColor}
                    className="px-6 py-3 rounded-xl font-bold"
                    style={{ backgroundColor: tempColor, color: '#171717' }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={() => setShowColorPicker(false)}>
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <HexColorPicker color={tempColor} onChange={setTempColor} />
              <div className="flex gap-2 mt-4">
                <input type="text" value={tempColor} onChange={(e) => setTempColor(e.target.value)} className="flex-1 px-3 py-2 bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg text-center font-mono text-sm" />
                <button onClick={saveColor} className="px-4 py-2 rounded-lg font-medium text-sm" style={{ backgroundColor: tempColor, color: '#171717' }}>Aplicar</button>
              </div>
            </div>
          </div>
        )
      )}

      {/* Confirm delete */}
      {deletingStatus && (
        isMobile ? (
          <>
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setDeletingStatus(null)} />
            <div className="fixed bottom-0 left-0 right-0 z-[60] bg-neutral-900 rounded-t-3xl overflow-hidden safe-area-bottom">
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-neutral-700 rounded-full" />
              </div>
              <div className="px-4 pb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-500/20">
                    <TrashIcon size={24} className="text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Eliminar estado</h3>
                    <p className="text-sm text-neutral-400">Esta acción no se puede deshacer</p>
                  </div>
                </div>
                <div className="bg-neutral-800/50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: deletingStatus.color }} />
                    <span className="text-white font-medium">{deletingStatus.name}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setDeletingStatus(null)} disabled={deleting} className="flex-1 py-3 bg-neutral-800 text-neutral-300 rounded-xl font-medium">Cancelar</button>
                  <button onClick={handleDeleteConfirm} disabled={deleting} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">{deleting ? '...' : 'Eliminar'}</button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setDeletingStatus(null)}>
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-5 w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Eliminar estado</h3>
              <p className="text-sm text-gray-500 mb-4">¿Eliminar "{deletingStatus.name}"?</p>
              <div className="flex gap-2">
              <button onClick={() => setDeletingStatus(null)} disabled={deleting} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 rounded-xl text-sm font-medium">Cancelar</button>
              <button onClick={handleDeleteConfirm} disabled={deleting} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium text-sm">{deleting ? '...' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
        )
      )}

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}
    </>
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
          className={`fixed bottom-0 left-0 right-0 top-8 z-50 bg-neutral-900 rounded-t-3xl shadow-2xl overflow-hidden transform transition-all duration-300 safe-area-bottom ${
            isVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-neutral-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400"><PaletteIcon size={24} /></span>
              <div>
                <h2 className="text-lg font-bold text-white">Estados</h2>
                <p className="text-xs text-neutral-500">{statuses.filter(s => s.is_active).length} activos de {statuses.length}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-neutral-800"
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Tabs de categorías */}
          <div className="flex gap-2 px-4 py-3 border-b border-neutral-800 overflow-x-auto">
            {CATEGORIES.map(cat => {
              const count = statuses.filter(s => s.category === cat.id).length
              return (
                <button
                  key={cat.id}
                  onClick={() => setMobileSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                    mobileSelectedCategory === cat.id
                      ? 'bg-yellow-400 text-neutral-900'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  <span className={mobileSelectedCategory === cat.id ? 'text-neutral-900' : cat.color}>
                    {cat.icon}
                  </span>
                  <span className="text-sm font-medium">{cat.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    mobileSelectedCategory === cat.id
                      ? 'bg-neutral-900/20 text-neutral-900'
                      : 'bg-neutral-700 text-neutral-400'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Botón crear */}
          {isOwnerOrAdmin && !showCreateForm && (
            <div className="px-4 py-3">
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full py-3 bg-yellow-400 text-neutral-900 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <PlusIcon size={18} />
                Nuevo estado
              </button>
            </div>
          )}

          {/* Formulario crear */}
          {showCreateForm && (
            <div className="px-4 py-3 border-b border-neutral-800">
              <div className="bg-neutral-800/50 rounded-xl p-4">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre del estado..."
                  className="w-full px-4 py-3 mb-3 bg-neutral-700 border border-neutral-600 rounded-xl text-white text-base focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                  autoFocus
                />
                <div className="flex gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => openColorPicker('new')}
                    className="w-12 h-12 rounded-xl border-2 border-neutral-600 flex-shrink-0"
                    style={{ backgroundColor: newColor }}
                  />
                  <div className="flex-1">
                    <p className="text-xs text-neutral-400 mb-1">Categoría</p>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as StatusCategory)}
                      className="w-full px-3 py-2.5 bg-neutral-700 border border-neutral-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50 appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a3a3a3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        backgroundSize: '16px',
                        paddingRight: '40px'
                      }}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowCreateForm(false); setNewName('') }}
                    className="flex-1 py-2.5 bg-neutral-700 text-neutral-300 rounded-xl font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || creating}
                    className="flex-1 py-2.5 bg-yellow-400 text-neutral-900 rounded-xl font-bold disabled:opacity-50"
                  >
                    {creating ? '...' : 'Crear'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de estados */}
          <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3" style={{ maxHeight: 'calc(100vh - 320px)' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <LoadingZapIcon size={48} />
              </div>
            ) : filteredStatuses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                  <span className={CATEGORIES.find(c => c.id === mobileSelectedCategory)?.color}>
                    {CATEGORIES.find(c => c.id === mobileSelectedCategory)?.icon}
                  </span>
                </div>
                <p className="text-neutral-400 text-center">
                  No hay estados en esta categoría
                </p>
              </div>
            ) : (
              filteredStatuses.map(status => {
                const category = CATEGORIES.find(c => c.id === status.category)!
                return (
                  <MobileStatusCard
                    key={status.id}
                    status={status}
                    category={category}
                    onEdit={() => { setEditingStatus(status); setEditName(status.name); setEditColor(status.color) }}
                    onDelete={() => setDeletingStatus(status)}
                    onToggle={() => handleToggle(status)}
                  />
                )
              })
            )}
          </div>
        </div>

        {renderModals()}
      </>
    )
  }

  // Desktop: Modal con DnD
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Modal principal */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'}`} onClick={handleClose}>
        <div className={`bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden transform transition-all duration-200 flex flex-col ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="p-5 border-b border-gray-100 dark:border-neutral-800 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-yellow-500">
                  <PaletteIcon size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Estados</h2>
                  <p className="text-xs text-gray-500 dark:text-neutral-500">{statuses.filter(s => s.is_active).length} activos de {statuses.length}</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                <XIcon size={20} />
              </button>
            </div>

            {isOwnerOrAdmin && !showCreateForm && (
              <button onClick={() => setShowCreateForm(true)} className="w-full mt-4 px-4 py-2.5 bg-yellow-400 text-neutral-900 rounded-xl text-sm font-medium hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2">
                <PlusIcon size={16} />
                Nuevo estado
              </button>
            )}

            {showCreateForm && (
              <div ref={createFormRef} className="mt-4 p-4 bg-gray-50 dark:bg-neutral-800/50 rounded-xl">
                <div className="flex gap-2 mb-3">
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) handleCreate(); if (e.key === 'Escape') { setShowCreateForm(false); setNewName('') } }} placeholder="Nombre..." className="flex-1 px-3 py-2.5 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50" autoFocus />
                  <button type="button" onClick={() => openColorPicker('new')} className="w-11 h-11 rounded-lg border-2 border-gray-200 dark:border-neutral-600 hover:border-yellow-400 flex-shrink-0" style={{ backgroundColor: newColor }} />
                </div>
                <div className="flex gap-2">
                  <CategoryDropdown value={newCategory} onChange={setNewCategory} />
                  <button onClick={() => { setShowCreateForm(false); setNewName('') }} className="px-4 py-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg text-sm">Cancelar</button>
                  <button onClick={handleCreate} disabled={!newName.trim() || creating} className="px-4 py-2.5 bg-yellow-400 text-neutral-900 rounded-lg font-medium hover:bg-yellow-300 disabled:opacity-50 text-sm">{creating ? '...' : 'Crear'}</button>
                </div>
              </div>
            )}
          </div>

          {/* Lista */}
          <div className="p-4 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex justify-center py-12"><LoadingZapIcon size={48} /></div>
            ) : statuses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-neutral-400">No hay estados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {CATEGORIES.map(category => (
                  <DroppableColumn
                    key={category.id}
                    category={category}
                    statuses={statuses
                      .filter(s => s.category === category.id)
                      .sort((a, b) => a.order_position - b.order_position)}
                    onEdit={(s) => { setEditingStatus(s); setEditName(s.name); setEditColor(s.color) }}
                    onDelete={(s) => setDeletingStatus(s)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DragOverlay */}
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeStatus && <StatusCardPreview status={activeStatus} />}
      </DragOverlay>

      {renderModals()}
    </DndContext>
  )
}

export default ManageStatuses