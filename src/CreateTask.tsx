import { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { supabase } from './supabaseClient'
import { TaskStatus, Profile } from './types/database.types'

interface CreateTaskProps {
  onTaskCreated?: () => void
  currentUserId: string
  teamId?: string | null
}

function CreateTask({ onTaskCreated, currentUserId, teamId }: CreateTaskProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [statusId, setStatusId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [dueDate, setDueDate] = useState<Date | null>(null)
  
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)

  const loadStatuses = async () => {
    const { data } = await supabase
      .from('task_statuses')
      .select('*')
      .eq('is_active', true)
      .order('order_position')
    
    if (data && data.length > 0) {
      setStatuses(data)
      if (!statusId) {
        setStatusId(data[0].id)
      }
    }
  }

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .order('email')
    
    setUsers((data as Profile[]) || [])
  }

  useEffect(() => {
    loadStatuses()
    loadUsers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      alert('El título es obligatorio')
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        status_id: statusId,
        assigned_to: assignedTo || null,
        start_date: startDate?.toISOString() || null,
        due_date: dueDate?.toISOString() || null,
        created_by: currentUserId,
        team_id: teamId || null
      })

    setLoading(false)

    if (error) {
      console.error('Error creando tarea:', error)
      alert('Error al crear la tarea: ' + error.message)
    } else {
      alert('¡Tarea creada exitosamente!')
      setTitle('')
      setDescription('')
      setAssignedTo('')
      setStartDate(null)
      setDueDate(null)
      if (onTaskCreated) onTaskCreated()
    }
  }


  return (
    <div style={{
      backgroundColor: '#f5f5f5',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '30px'
    }}>
      <h3>➕ Crear Nueva Tarea</h3>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Título *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Revisar inventario bodega"
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '16px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles de la tarea..."
            rows={3}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '16px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Estado
            </label>
            <select
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '16px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            >
              {statuses.map(status => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Asignar a
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '16px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            >
              <option value="">Sin asignar</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Fecha y hora de inicio
            </label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="dd/MM/yyyy HH:mm"
              placeholderText="Seleccionar fecha y hora"
              className="datepicker-input"
              isClearable
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Fecha y hora límite
            </label>
            <DatePicker
              selected={dueDate}
              onChange={(date) => setDueDate(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="dd/MM/yyyy HH:mm"
              placeholderText="Seleccionar fecha y hora"
              className="datepicker-input"
              minDate={startDate || undefined}
              isClearable
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 30px',
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Creando...' : 'Crear Tarea'}
        </button>
      </form>
    </div>
  )
}

export default CreateTask