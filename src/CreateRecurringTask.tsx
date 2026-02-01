import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { RecurringTask, RecurringFrequency, RecurringPriority, TaskStatus, Profile } from './types/database.types'
import { LoadingZapIcon, XIcon } from './components/iu/AnimatedIcons'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import { Repeat, Clock, Calendar, AlertCircle, User, Tag, FileText, Type, Check } from 'lucide-react'

interface CreateRecurringTaskProps {
  currentUserId: string
  teamId: string | null
  editingTask: RecurringTask | null
  onClose: () => void
  onSaved: () => void
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom', short: 'D' },
  { value: 1, label: 'Lun', short: 'L' },
  { value: 2, label: 'Mar', short: 'M' },
  { value: 3, label: 'Mié', short: 'X' },
  { value: 4, label: 'Jue', short: 'J' },
  { value: 5, label: 'Vie', short: 'V' },
  { value: 6, label: 'Sáb', short: 'S' },
]

function CreateRecurringTask({
  currentUserId,
  teamId,
  editingTask,
  onClose,
  onSaved,
  showToast
}: CreateRecurringTaskProps) {
  const isMobile = useIsMobile()
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  // Form state
  const [title, setTitle] = useState(editingTask?.title || '')
  const [description, setDescription] = useState(editingTask?.description || '')
  const [priority, setPriority] = useState<RecurringPriority>(editingTask?.priority || 'medium')
  const [frequency, setFrequency] = useState<RecurringFrequency>(editingTask?.frequency || 'daily')
  const [timeOfDay, setTimeOfDay] = useState(editingTask?.time_of_day?.substring(0, 5) || '08:00')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(editingTask?.days_of_week || [1, 2, 3, 4, 5])
  const [dayOfMonth, setDayOfMonth] = useState(editingTask?.day_of_month || 1)
  const [defaultStatusId, setDefaultStatusId] = useState(editingTask?.default_status_id || '')
  const [assignedTo, setAssignedTo] = useState(editingTask?.assigned_to || '')

  // Data
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [users, setUsers] = useState<Profile[]>([])

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    loadData()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadData = async () => {
    setLoadingData(true)

    // Load statuses
    let statusQuery = supabase
      .from('task_statuses')
      .select('*')
      .eq('is_active', true)
      .order('order_position')

    if (teamId) {
      statusQuery = statusQuery.eq('team_id', teamId)
    } else {
      statusQuery = statusQuery.is('team_id', null)
    }

    const { data: statusData } = await statusQuery

    if (statusData && statusData.length > 0) {
      setStatuses(statusData)
      if (!editingTask) {
        const defaultStatus = statusData.find(s => s.category === 'not_started') || statusData[0]
        setDefaultStatusId(defaultStatus.id)
      }
    }

    // Load users if team
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

    setLoadingData(false)
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const { dragStyle, isDragging, containerProps } = useBottomSheetGesture({
    onClose: handleClose
  })

  useBodyScrollLock(isMobile && isVisible)

  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    )
  }

  const calculateNextScheduled = (): string => {
    const now = new Date()
    const [hours, minutes] = timeOfDay.split(':').map(Number)

    let nextDate = new Date()
    nextDate.setHours(hours, minutes, 0, 0)

    // Si la hora ya pasó hoy, empezar desde mañana
    if (nextDate <= now) {
      nextDate.setDate(nextDate.getDate() + 1)
    }

    switch (frequency) {
      case 'daily':
        // Ya está configurado
        break
      case 'weekly':
        // Encontrar el próximo día de la semana seleccionado
        if (daysOfWeek.length > 0) {
          let found = false
          for (let i = 0; i < 7 && !found; i++) {
            const checkDate = new Date(nextDate)
            checkDate.setDate(checkDate.getDate() + i)
            if (daysOfWeek.includes(checkDate.getDay())) {
              nextDate = checkDate
              found = true
            }
          }
        }
        break
      case 'monthly':
        nextDate.setDate(dayOfMonth)
        if (nextDate <= now) {
          nextDate.setMonth(nextDate.getMonth() + 1)
        }
        break
    }

    return nextDate.toISOString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      showToast?.('El título es obligatorio', 'error')
      return
    }

    if (frequency === 'weekly' && daysOfWeek.length === 0) {
      showToast?.('Selecciona al menos un día', 'error')
      return
    }

    setLoading(true)

    const taskData = {
      user_id: currentUserId,
      team_id: teamId,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      frequency,
      time_of_day: `${timeOfDay}:00`,
      days_of_week: frequency === 'weekly' ? daysOfWeek : null,
      day_of_month: frequency === 'monthly' ? dayOfMonth : null,
      default_status_id: defaultStatusId || null,
      assigned_to: assignedTo || null,
      is_active: true,
      next_scheduled_at: calculateNextScheduled(),
      updated_at: new Date().toISOString()
    }

    let error

    if (editingTask) {
      const { error: updateError } = await supabase
        .from('recurring_tasks')
        .update(taskData)
        .eq('id', editingTask.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('recurring_tasks')
        .insert(taskData)
      error = insertError
    }

    setLoading(false)

    if (error) {
      showToast?.('Error al guardar', 'error')
      console.error('Error saving recurring task:', error)
    } else {
      onSaved()
    }
  }

  const renderForm = () => (
    <form onSubmit={handleSubmit} className={`flex-1 overflow-y-auto ${isMobile ? 'px-4 pt-4 pb-8' : 'p-6'}`}>
      {/* Título */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          <Type className="w-4 h-4" />
          Título *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Revisión diaria, Reporte semanal..."
          className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-base"
          autoFocus={!isMobile}
          required
        />
      </div>

      {/* Descripción */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          <FileText className="w-4 h-4" />
          Descripción
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalles de la rutina..."
          rows={2}
          className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all resize-none text-base"
        />
      </div>

      {/* Prioridad */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          <AlertCircle className="w-4 h-4" />
          Prioridad
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'low' as RecurringPriority, label: 'Baja', color: 'blue' },
            { value: 'medium' as RecurringPriority, label: 'Media', color: 'yellow' },
            { value: 'high' as RecurringPriority, label: 'Alta', color: 'red' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPriority(opt.value)}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                priority === opt.value
                  ? opt.color === 'blue'
                    ? 'bg-blue-400 text-white'
                    : opt.color === 'yellow'
                      ? 'bg-yellow-400 text-neutral-900'
                      : 'bg-red-400 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Frecuencia */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          <Repeat className="w-4 h-4" />
          Frecuencia
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'daily' as RecurringFrequency, label: 'Diario' },
            { value: 'weekly' as RecurringFrequency, label: 'Semanal' },
            { value: 'monthly' as RecurringFrequency, label: 'Mensual' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFrequency(opt.value)}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                frequency === opt.value
                  ? 'bg-purple-500 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Días de la semana (solo para semanal) */}
      {frequency === 'weekly' && (
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
            <Calendar className="w-4 h-4" />
            Días de la semana
          </label>
          <div className="flex gap-2">
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDayOfWeek(day.value)}
                className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  daysOfWeek.includes(day.value)
                    ? 'bg-purple-500 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                }`}
              >
                {day.short}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Día del mes (solo para mensual) */}
      {frequency === 'monthly' && (
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
            <Calendar className="w-4 h-4" />
            Día del mes
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={dayOfMonth}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1
              setDayOfMonth(Math.max(1, Math.min(31, val)))
            }}
            className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-base"
            placeholder="1-31"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            Si el mes tiene menos días, se creará el último día disponible
          </p>
        </div>
      )}

      {/* Hora */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          <Clock className="w-4 h-4" />
          Hora de creación
        </label>
        <input
          type="time"
          value={timeOfDay}
          onChange={(e) => setTimeOfDay(e.target.value)}
          className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-base"
        />
      </div>

      {/* Estado por defecto */}
      {statuses.length > 0 && (
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
            <Tag className="w-4 h-4" />
            Estado inicial
          </label>
          <select
            value={defaultStatusId}
            onChange={(e) => setDefaultStatusId(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-base"
          >
            {statuses.map(status => (
              <option key={status.id} value={status.id}>{status.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Asignar a (solo para equipos) */}
      {teamId && users.length > 0 && (
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
            <User className="w-4 h-4" />
            Asignar a
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-base"
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
          disabled={loading || !title.trim()}
          className="flex-1 px-4 py-3 bg-yellow-400 text-neutral-900 rounded-xl font-bold hover:bg-yellow-300 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20"
        >
          {loading ? (
            <LoadingZapIcon size={20} />
          ) : (
            <>
              <Check className="w-5 h-5" />
              <span>{editingTask ? 'Guardar' : 'Crear'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  )

  if (loadingData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <LoadingZapIcon size={48} />
      </div>
    )
  }

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
              <span className="text-purple-400"><Repeat size={24} /></span>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingTask ? 'Editar rutina' : 'Nueva rutina'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <XIcon size={20} />
            </button>
          </div>

          {renderForm()}
        </div>
      </>
    )
  }

  // Desktop: Modal
  return (
    <>
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
              <span className="text-purple-400"><Repeat size={24} /></span>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                {editingTask ? 'Editar rutina' : 'Nueva rutina'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <XIcon size={20} />
            </button>
          </div>

          {renderForm()}
        </div>
      </div>
    </>
  )
}

export default CreateRecurringTask
