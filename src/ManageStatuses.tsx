import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { TaskStatus, StatusCategory } from './types/database.types'
import { HexColorPicker } from 'react-colorful'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface ManageStatusesProps {
  currentUserId: string
  teamId: string | null
  isOwnerOrAdmin: boolean
  onClose: () => void
  onStatusesChanged: () => void
}

const CATEGORIES: { id: StatusCategory; name: string; icon: string }[] = [
  { id: 'not_started', name: 'Sin Iniciar', icon: '⏸️' },
  { id: 'in_progress', name: 'En Progreso', icon: '▶️' },
  { id: 'completed', name: 'Completadas', icon: '✅' }
]

const PRESET_COLORS = [
  '#9c27b0', '#3f51b5', '#2196F3', '#00bcd4', '#009688',
  '#4CAF50', '#8bc34a', '#ffeb3b', '#ff9800', '#f44336',
  '#e91e63', '#795548', '#607d8b', '#9e9e9e'
]

// Componente de estado arrastrable
function SortableStatus({
  status,
  isOwnerOrAdmin,
  onEdit,
  onDelete,
  onToggle
}: {
  status: TaskStatus
  isOwnerOrAdmin: boolean
  onEdit: (status: TaskStatus) => void
  onDelete: (status: TaskStatus) => void
  onToggle: (status: TaskStatus) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: status.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : status.is_active ? 1 : 0.5
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 py-2 px-3 rounded-lg group hover:bg-neutral-700/50 transition-all ${
        isDragging ? 'bg-neutral-700 ring-2 ring-yellow-400' : ''
      }`}
    >
      {isOwnerOrAdmin && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-neutral-600 hover:text-neutral-400 text-sm"
        >
          ⋮⋮
        </div>
      )}

      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: status.color }}
      />

      <span className={`flex-1 text-sm truncate ${status.is_active ? 'text-white' : 'text-neutral-500 line-through'}`}>
        {status.name}
      </span>

      {isOwnerOrAdmin && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(status)}
            className="p-1 text-neutral-500 hover:text-yellow-400 transition-colors text-xs"
          >
            ✏️
          </button>
          <button
            onClick={() => onToggle(status)}
            className="p-1 text-neutral-500 hover:text-orange-400 transition-colors text-xs"
          >
            {status.is_active ? '🚫' : '✓'}
          </button>
          <button
            onClick={() => onDelete(status)}
            className="p-1 text-neutral-500 hover:text-red-400 transition-colors text-xs"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  )
}

// Sección de categoría droppable
function CategorySection({
  category,
  statuses,
  isOwnerOrAdmin,
  onEdit,
  onDelete,
  onToggle
}: {
  category: typeof CATEGORIES[0]
  statuses: TaskStatus[]
  isOwnerOrAdmin: boolean
  onEdit: (status: TaskStatus) => void
  onDelete: (status: TaskStatus) => void
  onToggle: (status: TaskStatus) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `category-${category.id}` })

  return (
    <div ref={setNodeRef} className="mb-4">
      {/* Título de categoría */}
      <div className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${
        isOver ? 'bg-yellow-400/10' : ''
      }`}>
        <span className="text-base">{category.icon}</span>
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
          {category.name}
        </span>
        <span className="text-xs text-neutral-600">({statuses.length})</span>
      </div>

      {/* Estados */}
      <SortableContext items={statuses.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className={`ml-2 border-l-2 transition-colors ${
          isOver ? 'border-yellow-400' : 'border-neutral-700'
        }`}>
          {statuses.map(status => (
            <SortableStatus
              key={status.id}
              status={status}
              isOwnerOrAdmin={isOwnerOrAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
            />
          ))}

          {statuses.length === 0 && (
            <div className={`py-3 px-4 text-xs text-neutral-600 italic ${
              isOver ? 'text-yellow-400' : ''
            }`}>
              Arrastra estados aquí
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

function ManageStatuses({ currentUserId, teamId, isOwnerOrAdmin, onClose, onStatusesChanged }: ManageStatusesProps) {
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#4CAF50')
  const [newCategory, setNewCategory] = useState<StatusCategory>('not_started')

  const [editingStatus, setEditingStatus] = useState<TaskStatus | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const [showColorPicker, setShowColorPicker] = useState(false)
  const [colorPickerFor, setColorPickerFor] = useState<'new' | 'edit'>('new')
  const [tempColor, setTempColor] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    loadStatuses()
  }, [])

  const loadStatuses = async () => {
    setLoading(true)
    let query = supabase
      .from('task_statuses')
      .select('*')
      .order('order_position')

    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      query = query.is('team_id', null)
    }

    const { data } = await query
    if (data) setStatuses(data)
    setLoading(false)
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Si se soltó sobre una categoría
    if (overId.startsWith('category-')) {
      const newCategory = overId.replace('category-', '') as StatusCategory
      const status = statuses.find(s => s.id === activeId)

      if (status && status.category !== newCategory) {
        setStatuses(prev => prev.map(s =>
          s.id === activeId ? { ...s, category: newCategory } : s
        ))

        await supabase
          .from('task_statuses')
          .update({ category: newCategory })
          .eq('id', activeId)

        onStatusesChanged()
      }
      return
    }

    // Si se soltó sobre otro estado
    const activeStatus = statuses.find(s => s.id === activeId)
    const overStatus = statuses.find(s => s.id === overId)

    if (!activeStatus || !overStatus) return

    // Cambiar categoría si es diferente
    if (activeStatus.category !== overStatus.category) {
      setStatuses(prev => prev.map(s =>
        s.id === activeId ? { ...s, category: overStatus.category } : s
      ))

      await supabase
        .from('task_statuses')
        .update({ category: overStatus.category })
        .eq('id', activeId)
    }

    // Reordenar
    const oldIndex = statuses.findIndex(s => s.id === activeId)
    const newIndex = statuses.findIndex(s => s.id === overId)

    if (oldIndex !== newIndex) {
      const newStatuses = arrayMove(statuses, oldIndex, newIndex)
      setStatuses(newStatuses)

      for (let i = 0; i < newStatuses.length; i++) {
        await supabase
          .from('task_statuses')
          .update({ order_position: i + 1 })
          .eq('id', newStatuses[i].id)
      }
    }

    onStatusesChanged()
  }

  const handleCreate = async () => {
    if (!newName.trim()) return

    const maxOrder = statuses.reduce((max, s) => Math.max(max, s.order_position), 0)

    const { data, error } = await supabase
      .from('task_statuses')
      .insert({
        name: newName.trim(),
        color: newColor,
        category: newCategory,
        order_position: maxOrder + 1,
        team_id: teamId,
        created_by: currentUserId,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      alert('Error: ' + error.message)
    } else if (data) {
      setStatuses(prev => [...prev, data])
      setNewName('')
      setNewColor('#4CAF50')
      setShowCreateForm(false)
      onStatusesChanged()
    }
  }

  const handleSaveEdit = async () => {
    if (!editingStatus || !editName.trim()) return

    setStatuses(prev => prev.map(s =>
      s.id === editingStatus.id ? { ...s, name: editName.trim(), color: editColor } : s
    ))
    setEditingStatus(null)

    await supabase
      .from('task_statuses')
      .update({ name: editName.trim(), color: editColor })
      .eq('id', editingStatus.id)

    onStatusesChanged()
  }

  const handleToggle = async (status: TaskStatus) => {
    if (status.is_active) {
      const firstActive = statuses.find(s => s.id !== status.id && s.is_active)
      if (firstActive) {
        await supabase
          .from('tasks')
          .update({ status_id: firstActive.id })
          .eq('status_id', status.id)
      }
    }

    setStatuses(prev => prev.map(s =>
      s.id === status.id ? { ...s, is_active: !s.is_active } : s
    ))

    await supabase
      .from('task_statuses')
      .update({ is_active: !status.is_active })
      .eq('id', status.id)

    onStatusesChanged()
  }

  const handleDelete = async (status: TaskStatus) => {
    if (!confirm(`¿Eliminar "${status.name}"?`)) return

    const firstActive = statuses.find(s => s.id !== status.id && s.is_active)
    if (firstActive) {
      await supabase
        .from('tasks')
        .update({ status_id: firstActive.id })
        .eq('status_id', status.id)
    }

    setStatuses(prev => prev.filter(s => s.id !== status.id))

    await supabase
      .from('task_statuses')
      .delete()
      .eq('id', status.id)

    onStatusesChanged()
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

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] overflow-hidden transform transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-yellow-400">🎨</span> Estados
          </h2>
          <div className="flex items-center gap-2">
            {isOwnerOrAdmin && !showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-3 py-1.5 bg-yellow-400 text-neutral-900 rounded-lg font-medium hover:bg-yellow-300 transition-colors text-sm"
              >
                + Nuevo
              </button>
            )}
            <button onClick={handleClose} className="text-neutral-400 hover:text-white text-xl">×</button>
          </div>
        </div>

        {/* Formulario crear */}
        {showCreateForm && (
          <div
            className="p-4 border-b border-neutral-700 bg-neutral-900/50"
            tabIndex={0}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node) && !showColorPicker) {
                setTimeout(() => { setShowCreateForm(false); setNewName('') }, 150)
              }
            }}
          >
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) handleCreate()
                  if (e.key === 'Escape') { setShowCreateForm(false); setNewName('') }
                }}
                placeholder="Nombre..."
                className="flex-1 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                autoFocus
              />
              <div
                className="w-10 h-10 rounded-lg cursor-pointer border-2 border-neutral-600 hover:border-yellow-400"
                style={{ backgroundColor: newColor }}
                onClick={() => openColorPicker('new')}
              />
            </div>
            <div className="flex gap-2">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as StatusCategory)}
                className="flex-1 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-4 py-2 bg-yellow-400 text-neutral-900 rounded-lg font-medium hover:bg-yellow-300 disabled:opacity-50 text-sm"
              >
                Crear
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-130px)]">
          {loading ? (
            <div className="text-center py-8 text-yellow-400">⚡ Cargando...</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              {CATEGORIES.map(category => (
                <CategorySection
                  key={category.id}
                  category={category}
                  statuses={statuses.filter(s => s.category === category.id)}
                  isOwnerOrAdmin={isOwnerOrAdmin}
                  onEdit={(s) => { setEditingStatus(s); setEditName(s.name); setEditColor(s.color) }}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </DndContext>
          )}
        </div>
      </div>

      {/* Modal editar */}
      {editingStatus && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setEditingStatus(null)}>
          <div className="bg-neutral-800 rounded-xl p-5 w-full max-w-xs mx-4 border border-neutral-700" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white mb-4">Editar Estado</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingStatus(null) }}
              className="w-full px-3 py-2 mb-4 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              autoFocus
            />
            <div className="flex flex-wrap gap-2 mb-4">
              {PRESET_COLORS.map(color => (
                <div
                  key={color}
                  onClick={() => setEditColor(color)}
                  className={`w-7 h-7 rounded cursor-pointer hover:scale-110 transition-transform ${editColor === color ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-neutral-800' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <div onClick={() => openColorPicker('edit')} className="w-7 h-7 rounded cursor-pointer border-2 border-dashed border-neutral-500 flex items-center justify-center hover:border-yellow-400 text-xs">🎨</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingStatus(null)} className="flex-1 px-3 py-2 bg-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-600 text-sm">Cancelar</button>
              <button onClick={handleSaveEdit} className="flex-1 px-3 py-2 bg-yellow-400 text-neutral-900 rounded-lg font-medium hover:bg-yellow-300 text-sm">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Color picker */}
      {showColorPicker && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={() => setShowColorPicker(false)}>
          <div className="bg-neutral-800 rounded-xl p-5 border border-neutral-700" onClick={(e) => e.stopPropagation()}>
            <HexColorPicker color={tempColor} onChange={setTempColor} />
            <input
              type="text"
              value={tempColor}
              onChange={(e) => setTempColor(e.target.value)}
              className="w-full mt-3 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button onClick={saveColor} className="w-full mt-3 px-4 py-2 rounded-lg font-medium text-sm" style={{ backgroundColor: tempColor, color: '#171717' }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManageStatuses