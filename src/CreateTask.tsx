import { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { supabase } from './supabaseClient'
import { TaskStatus, Profile } from './types/database.types'

interface CreateTaskProps {
  currentUserId: string
  teamId: string | null
  onTaskCreated: () => void
  onClose: () => void
}

function CreateTask({ currentUserId, teamId, onTaskCreated, onClose }: CreateTaskProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [statusId, setStatusId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    // Animación de entrada
    setTimeout(() => setIsVisible(true), 10)
    
    const loadData = async () => {
      // Cargar estados
      const { data: statusData } = await supabase
        .from('task_statuses')
        .select('*')
        .eq('is_active', true)
        .order('order_position')
      
      if (statusData && statusData.length > 0) {
        setStatuses(statusData)
        setStatusId(statusData[0].id)
      }

      // Cargar usuarios si es equipo
      if (teamId) {
        const { data: memberData } = await supabase
          .from('team_members')
          .select('user_id, profiles(*)')
          .eq('team_id', teamId)
        
        if (memberData) {
          const profiles = memberData
            .map(m => {
              const p = m.profiles as Profile | Profile[] | null
              return Array.isArray(p) ? p[0] : p
            })
            .filter((p): p is Profile => p !== null && p !== undefined)
          setUsers(profiles)
        }
      }
    }
    
    loadData()
  }, [teamId])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

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
        team_id: teamId,
        created_by: currentUserId,
        assigned_to: assignedTo || null,
        start_date: startDate?.toISOString() || null,
        due_date: dueDate?.toISOString() || null
      })

    setLoading(false)

    if (error) {
      alert('Error al crear tarea: ' + error.message)
    } else {
      onTaskCreated()
      handleClose()
    }
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 transform transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-yellow-400">⚡</span> Nueva Tarea
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Título */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Agrega un título a tu Tazk"
              className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
              autoFocus
              required
            />
          </div>

          {/* Descripción */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agrega detalles..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Estado y Asignar */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">
                Estado
              </label>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
              >
                {statuses.map(status => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>

            {teamId && users.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">
                  Asignar a
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                >
                  <option value="">Sin asignar</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">
                Fecha inicio
              </label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                placeholderText="Seleccionar"
                className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                isClearable
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">
                Fecha límite
              </label>
              <DatePicker
                selected={dueDate}
                onChange={(date) => setDueDate(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                placeholderText="Seleccionar"
                className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                minDate={startDate || undefined}
                isClearable
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 px-4 py-3 bg-yellow-400 text-neutral-900 rounded-lg font-bold hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                'Creando...'
              ) : (
                <>
                  <span>⚡</span> Crear Tarea
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTask