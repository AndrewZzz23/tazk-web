import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { TaskStatus } from './types/database.types'
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
import { CSS } from '@dnd-kit/utilities'

interface ManageStatusesProps {
  currentUserId: string
  teamId: string | null
  isOwnerOrAdmin: boolean
  onClose: () => void
  onStatusesChanged: () => void
}

// Componente de estado arrastrable
function SortableStatus({ 
  status, 
  isOwnerOrAdmin,
  isEditing,
  editName,
  editColor,
  colores,
  onEditNameChange,
  onSelectColor,
  onOpenPicker,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggle,
  onDelete
}: {
  status: TaskStatus
  isOwnerOrAdmin: boolean
  isEditing: boolean
  editName: string
  editColor: string
  colores: string[]
  onEditNameChange: (name: string) => void
  onSelectColor: (color: string) => void
  onOpenPicker: () => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onToggle: () => void
  onDelete: () => void
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
    opacity: isDragging ? 0.5 : (status.is_active ? 1 : 0.5)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '12px',
        backgroundColor: isEditing ? '#f0f7ff' : (status.is_active ? '#fff' : '#f9f9f9'),
        borderRadius: '8px',
        border: isEditing ? '2px solid #2196F3' : '1px solid #eee',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      {/* Grip para arrastrar */}
      {isOwnerOrAdmin && !isEditing && (
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            color: '#999',
            fontSize: '16px',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Arrastrar para reordenar"
        >
          ⋮⋮
        </div>
      )}

      {isEditing ? (
        // Modo edición
        <div style={{ flex: 1 }}>
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit()
              if (e.key === 'Escape') onCancelEdit()
            }}
            autoFocus
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              boxSizing: 'border-box',
              marginBottom: '10px'
            }}
          />
          
          {/* Colores */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {colores.map(c => (
              <div
                key={c}
                onClick={() => onSelectColor(c)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: c,
                  cursor: 'pointer',
                  border: editColor === c ? '3px solid #333' : '2px solid transparent'
                }}
              />
            ))}
            <div
              onClick={onOpenPicker}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: '2px dashed #999',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backgroundColor: '#fff',
                fontSize: '12px'
              }}
            >
              🎨
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onSaveEdit}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: editColor,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✓ Guardar
            </button>
            <button
              onClick={onCancelEdit}
              style={{
                padding: '8px 16px',
                backgroundColor: '#e0e0e0',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        // Modo vista
        <>
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: status.color,
              flexShrink: 0
            }}
          />
          <span 
            style={{ flex: 1, fontWeight: '500', cursor: isOwnerOrAdmin ? 'pointer' : 'default' }}
            onClick={() => isOwnerOrAdmin && onStartEdit()}
          >
            {status.name}
          </span>
          
          {isOwnerOrAdmin && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={onStartEdit}
                title="Editar"
                style={{
                  padding: '6px 8px',
                  backgroundColor: 'transparent',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ✏️
              </button>
              <button
                onClick={onToggle}
                title={status.is_active ? 'Desactivar' : 'Activar'}
                style={{
                  padding: '6px 8px',
                  backgroundColor: 'transparent',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {status.is_active ? '🚫' : '✓'}
              </button>
              <button
                onClick={onDelete}
                title="Eliminar"
                style={{
                  padding: '6px 8px',
                  backgroundColor: 'transparent',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🗑️
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ManageStatuses({ currentUserId, teamId, isOwnerOrAdmin, onClose, onStatusesChanged }: ManageStatusesProps) {
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  
  // Crear nuevo
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#4CAF50')
  const [isCreating, setIsCreating] = useState(false)
  
  // Editar
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  
  // Color picker
  const [pickerFor, setPickerFor] = useState<'new' | 'edit' | null>(null)
  const [tempColor, setTempColor] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  )

  const colores = [
    '#9c27b0', '#3f51b5', '#2196F3', '#00bcd4', '#009688', 
    '#4CAF50', '#8bc34a', '#ffeb3b', '#ff9800', '#f44336', 
    '#e91e63', '#795548', '#607d8b', '#9e9e9e'
  ]

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

    const { data, error } = await query
    if (!error) setStatuses(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadStatuses()
  }, [teamId])

  // Drag end - reordenar
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return

    const oldIndex = statuses.findIndex(s => s.id === active.id)
    const newIndex = statuses.findIndex(s => s.id === over.id)

    // Reordenar en UI
    const newStatuses = arrayMove(statuses, oldIndex, newIndex)
    setStatuses(newStatuses)

    // Actualizar order_position en BD
    const updates = newStatuses.map((status, index) => ({
      id: status.id,
      order_position: index + 1
    }))

    for (const update of updates) {
      await supabase
        .from('task_statuses')
        .update({ order_position: update.order_position })
        .eq('id', update.id)
    }

    onStatusesChanged()
  }

  // Crear estado
  const handleCreate = async () => {
    if (!newName.trim()) return

    const maxOrder = statuses.reduce((max, s) => Math.max(max, s.order_position), 0)
    const tempId = 'temp-' + Date.now()
    
    const newStatus: TaskStatus = {
      id: tempId,
      name: newName.trim(),
      color: newColor,
      order_position: maxOrder + 1,
      team_id: teamId,
      created_by: currentUserId,
      is_active: true
    }

    setStatuses(prev => [...prev, newStatus])
    setNewName('')
    setNewColor('#4CAF50')
    setIsCreating(false)
    onStatusesChanged()

    const { data, error } = await supabase
      .from('task_statuses')
      .insert({
        name: newStatus.name,
        color: newStatus.color,
        order_position: newStatus.order_position,
        team_id: teamId,
        created_by: currentUserId,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      setStatuses(prev => prev.filter(s => s.id !== tempId))
      alert('Error: ' + error.message)
    } else if (data) {
      setStatuses(prev => prev.map(s => s.id === tempId ? data : s))
    }
  }

  // Guardar edición
  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return

    const oldStatus = statuses.find(s => s.id === editingId)
    
    setStatuses(prev => prev.map(s => 
      s.id === editingId ? { ...s, name: editName.trim(), color: editColor } : s
    ))
    setEditingId(null)
    onStatusesChanged()

    const { error } = await supabase
      .from('task_statuses')
      .update({ name: editName.trim(), color: editColor })
      .eq('id', editingId)

    if (error && oldStatus) {
      setStatuses(prev => prev.map(s => s.id === editingId ? oldStatus : s))
      alert('Error: ' + error.message)
    }
  }

  // Toggle activo
  const handleToggle = async (status: TaskStatus) => {
    if (status.is_active) {
      const firstActiveStatus = statuses.find(s => s.id !== status.id && s.is_active)
      
      if (firstActiveStatus) {
        await supabase
          .from('tasks')
          .update({ status_id: firstActiveStatus.id })
          .eq('status_id', status.id)
      }
    }

    setStatuses(prev => prev.map(s => 
      s.id === status.id ? { ...s, is_active: !s.is_active } : s
    ))

    const { error } = await supabase
      .from('task_statuses')
      .update({ is_active: !status.is_active })
      .eq('id', status.id)

    if (error) {
      setStatuses(prev => prev.map(s => 
        s.id === status.id ? status : s
      ))
      alert('Error: ' + error.message)
    } else {
      onStatusesChanged()
    }
  }

  // Eliminar
  const handleDelete = async (status: TaskStatus) => {
    if (!confirm(`¿Eliminar "${status.name}"? Las tareas se moverán al primer estado.`)) return

    const firstActiveStatus = statuses.find(s => s.id !== status.id && s.is_active)
    
    if (firstActiveStatus) {
      await supabase
        .from('tasks')
        .update({ status_id: firstActiveStatus.id })
        .eq('status_id', status.id)
    }

    setStatuses(prev => prev.filter(s => s.id !== status.id))

    const { error } = await supabase
      .from('task_statuses')
      .delete()
      .eq('id', status.id)

    if (error) {
      setStatuses(prev => [...prev, status])
      alert('Error: ' + error.message)
    } else {
      onStatusesChanged()
    }
  }

  // Iniciar edición
  const startEdit = (status: TaskStatus) => {
    setEditingId(status.id)
    setEditName(status.name)
    setEditColor(status.color)
  }

  // Cancelar edición
  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditColor('')
  }

  // Abrir picker
  const openPicker = (type: 'new' | 'edit') => {
    setPickerFor(type)
    setTempColor(type === 'new' ? newColor : editColor)
  }

  // Guardar color del picker
  const savePickerColor = () => {
    if (pickerFor === 'new') {
      setNewColor(tempColor)
    } else if (pickerFor === 'edit') {
      setEditColor(tempColor)
    }
    setPickerFor(null)
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>🎨 {teamId ? 'Estados del Equipo' : 'Mis Estados'}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}
          >
            ✕
          </button>
        </div>

        {/* Indicador de jerarquía */}
        {isOwnerOrAdmin && statuses.length > 1 && (
          <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⋮⋮</span> Arrastra para ordenar. El primero es el estado por defecto.
          </p>
        )}

        {/* Crear nuevo - Modo compacto */}
        {isOwnerOrAdmin && !isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#f5f5f5',
              border: '2px dashed #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#666',
              marginBottom: '16px'
            }}
          >
            + Agregar estado
          </button>
        )}

        {/* Crear nuevo - Modo expandido */}
        {isOwnerOrAdmin && isCreating && (
          <div 
            tabIndex={0}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node) && !pickerFor) {
                setTimeout(() => {
                  setIsCreating(false)
                  setNewName('')
                  setNewColor('#4CAF50')
                }, 150)
              }
            }}
            style={{
              backgroundColor: '#f5f5f5',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
              outline: 'none'
            }}
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Nombre del estado..."
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                boxSizing: 'border-box',
                fontSize: '14px',
                marginBottom: '12px'
              }}
            />

            {/* Colores */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {colores.map(c => (
                <div
                  key={c}
                  onClick={() => setNewColor(c)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: newColor === c ? '3px solid #333' : '2px solid transparent',
                    transition: 'transform 0.1s',
                    transform: newColor === c ? 'scale(1.15)' : 'scale(1)'
                  }}
                />
              ))}
              <div
                onClick={() => openPicker('new')}
                title="Color personalizado"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '2px dashed #999',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#fff',
                  fontSize: '14px'
                }}
              >
                🎨
              </div>
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: newName.trim() ? newColor : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: newName.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold'
                }}
              >
                Crear
              </button>
              <button
                onClick={() => { setIsCreating(false); setNewName(''); setNewColor('#4CAF50') }}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#e0e0e0',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista de estados con drag & drop */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#666' }}>Cargando...</p>
        ) : statuses.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No hay estados</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={statuses.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {statuses.map(status => (
                  <SortableStatus
                    key={status.id}
                    status={status}
                    isOwnerOrAdmin={isOwnerOrAdmin}
                    isEditing={editingId === status.id}
                    editName={editName}
                    editColor={editColor}
                    colores={colores}
                    onEditNameChange={setEditName}
                    onSelectColor={setEditColor}
                    onOpenPicker={() => openPicker('edit')}
                    onStartEdit={() => startEdit(status)}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={cancelEdit}
                    onToggle={() => handleToggle(status)}
                    onDelete={() => handleDelete(status)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Color Picker Modal */}
      {pickerFor && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              width: '240px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: '600' }}>Color personalizado</span>
              <button
                onClick={() => setPickerFor(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <HexColorPicker 
              color={tempColor} 
              onChange={setTempColor}
            />
            
            <input
              type="text"
              value={tempColor}
              onChange={(e) => setTempColor(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                textAlign: 'center',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                marginTop: '12px'
              }}
            />

            <button
              onClick={savePickerColor}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '12px',
                backgroundColor: tempColor,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Aplicar color
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManageStatuses