import { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { supabase } from './supabaseClient'
import { Task, TaskStatus, Profile, UserRole } from './types/database.types'
import { EditIcon, XIcon, TrashIcon, SaveIcon } from './components/iu/AnimatedIcons'
import TaskAttachments from './TaskAttachments'
import ConfirmDialog from './ConfirmDialog'
import { logTaskUpdated, logTaskDeleted, logTaskStatusChanged, logTaskAssigned, logTaskUnassigned } from './lib/activityLogger'
import { notifyTaskAssigned } from './lib/sendPushNotification'

interface EditTaskProps {
  task: Task
  currentUserId: string
  userEmail?: string
  userRole?: UserRole | null
  onTaskUpdated: () => void
  onClose: () => void
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}

function EditTask({ task, currentUserId, userEmail, userRole, onTaskUpdated, onClose, showToast }: EditTaskProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [statusId, setStatusId] = useState(task.status_id)
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '')
  const [startDate, setStartDate] = useState<Date | null>(
    task.start_date ? new Date(task.start_date) : null
  )
  const [dueDate, setDueDate] = useState<Date | null>(
    task.due_date ? new Date(task.due_date) : null
  )
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
      let statusQuery = supabase
        .from('task_statuses')
        .select('*')
        .eq('is_active', true)
        .order('order_position')

      if (task.team_id) {
        statusQuery = statusQuery.eq('team_id', task.team_id)
      } else {
        statusQuery = statusQuery.is('team_id', null)
      }

      const { data: statusData } = await statusQuery
      if (statusData) setStatuses(statusData)

      // Cargar usuarios si es tarea de equipo
      if (task.team_id) {
        const { data: memberData } = await supabase
          .from('team_members')
          .select('user_id, profiles(*)')
          .eq('team_id', task.team_id)

        if (memberData) {
          const profiles = memberData
            .map((m) => m.profiles as unknown as Profile | null)
            .filter((p): p is Profile => p !== null)
          setUsers(profiles)
        }
      }
    }

    loadData()
  }, [task.team_id])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      showToast?.('El título es obligatorio', 'error')
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from('tasks')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        status_id: statusId,
        assigned_to: assignedTo || null,
        start_date: startDate?.toISOString() || null,
        due_date: dueDate?.toISOString() || null,
      })
      .eq('id', task.id)

    setLoading(false)

    if (error) {
      showToast?.('Error al actualizar tarea', 'error')
    } else {
      showToast?.('Tarea actualizada', 'success')
      // Log changes
      const oldStatus = statuses.find(s => s.id === task.status_id)
      const newStatus = statuses.find(s => s.id === statusId)

      if (task.status_id !== statusId && oldStatus && newStatus) {
        logTaskStatusChanged(task.id, title.trim(), task.team_id, currentUserId, oldStatus.name, newStatus.name, userEmail)
      } else {
        logTaskUpdated(task.id, title.trim(), task.team_id, currentUserId, userEmail)
      }

      // Log assignment changes and send push notification
      if (task.assigned_to !== assignedTo) {
        if (assignedTo) {
          const assignedUser = users.find(u => u.id === assignedTo)
          logTaskAssigned(task.id, title.trim(), task.team_id, currentUserId, assignedUser?.email || '', userEmail)
          // Send push notification to assigned user (don't notify yourself)
          if (assignedTo !== currentUserId) {
            notifyTaskAssigned(assignedTo, title.trim(), userEmail || 'Alguien', task.id)
          }
        } else if (task.assigned_to) {
          logTaskUnassigned(task.id, title.trim(), task.team_id, currentUserId, userEmail)
        }
      }

      onTaskUpdated()
      handleClose()
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false)
    setLoading(true)

    const { error } = await supabase.from('tasks').delete().eq('id', task.id)

    setLoading(false)

    if (error) {
      showToast?.('Error al eliminar tarea', 'error')
    } else {
      showToast?.('Tarea eliminada', 'success')
      logTaskDeleted(task.id, task.title, task.team_id, currentUserId, userEmail)
      onTaskUpdated()
      handleClose()
    }
  }

  return (
    <>
      {/* DatePicker Dark Mode Styles */}
      <style>{`
        .dark .react-datepicker {
          background-color: #262626;
          border: 1px solid #404040;
          border-radius: 12px;
          font-family: inherit;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .dark .react-datepicker__header {
          background-color: #1f1f1f;
          border-bottom: 1px solid #404040;
          border-radius: 12px 12px 0 0;
          padding-top: 12px;
        }
        .dark .react-datepicker__current-month,
        .dark .react-datepicker__day-name,
        .dark .react-datepicker-time__header {
          color: #fff;
        }
        .dark .react-datepicker__day {
          color: #e5e5e5;
          border-radius: 8px;
        }
        .dark .react-datepicker__day:hover {
          background-color: #404040;
          border-radius: 8px;
        }
        .dark .react-datepicker__day--selected,
        .dark .react-datepicker__day--keyboard-selected {
          background-color: #facc15 !important;
          color: #171717 !important;
          font-weight: 600;
        }
        .dark .react-datepicker__day--today {
          background-color: #404040;
          font-weight: 600;
        }
        .dark .react-datepicker__day--outside-month {
          color: #525252;
        }
        .dark .react-datepicker__day--disabled {
          color: #404040;
        }
        .dark .react-datepicker__navigation-icon::before {
          border-color: #a3a3a3;
        }
        .dark .react-datepicker__navigation:hover *::before {
          border-color: #facc15;
        }
        .dark .react-datepicker__time-container {
          border-left: 1px solid #404040;
        }
        .dark .react-datepicker__time {
          background-color: #262626;
          border-radius: 0 0 12px 0;
        }
        .dark .react-datepicker__time-box {
          border-radius: 0 0 12px 0;
        }
        .dark .react-datepicker__time-list-item {
          color: #e5e5e5;
          height: auto !important;
          padding: 8px 12px !important;
        }
        .dark .react-datepicker__time-list-item:hover {
          background-color: #404040 !important;
        }
        .dark .react-datepicker__time-list-item--selected {
          background-color: #facc15 !important;
          color: #171717 !important;
          font-weight: 600;
        }
        .dark .react-datepicker__triangle {
          display: none;
        }
        .dark .react-datepicker__month-container {
          background-color: #262626;
        }
        .dark .react-datepicker__year-dropdown,
        .dark .react-datepicker__month-dropdown {
          background-color: #262626;
          border: 1px solid #404040;
        }
        .dark .react-datepicker__year-option:hover,
        .dark .react-datepicker__month-option:hover {
          background-color: #404040;
        }
        .react-datepicker-popper {
          z-index: 9999 !important;
        }
        .react-datepicker__close-icon::after {
          background-color: #737373 !important;
        }
        .react-datepicker__close-icon:hover::after {
          background-color: #facc15 !important;
        }
      `}</style>
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
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-neutral-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-yellow-400"><EditIcon size={24} /></span> Editar Tarea
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <XIcon size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* Título */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="¿Qué necesitas hacer?"
              className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">
                Estado
              </label>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
              >
                {[...statuses]
                  .sort((a, b) => a.order_position - b.order_position)
                  .map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
              </select>
            </div>

            {task.team_id && users.length > 0 && (
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
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
                popperPlacement="top-start"
                portalId="root"
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
                popperPlacement="top-start"
                portalId="root"
              />
            </div>
          </div>

          {/* Adjuntos */}
          <TaskAttachments
            taskId={task.id}
            currentUserId={currentUserId}
            canEdit={true}
          />

          {/* Botones */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-neutral-700">
            {/* Eliminar - solo para owner/admin o tareas personales */}
            {(!task.team_id || userRole !== 'member') && (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={loading}
                className="px-4 py-3 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <TrashIcon size={18} /> Eliminar
              </button>
            )}
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
              {loading ? 'Guardando...' : <><SaveIcon size={18} /> Guardar</>}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="px-6 pb-4 text-xs text-gray-400 dark:text-neutral-500 flex items-center gap-2">
          <span>Creada: {new Date(task.created_at).toLocaleDateString('es-CO')}</span>
          {task.created_by_user && (
            <>
              <span>•</span>
              <span>por {task.created_by_user.full_name || task.created_by_user.email}</span>
            </>
          )}
        </div>
      </div>
    </div>

    {/* Confirm Delete Dialog */}
    {showDeleteConfirm && (
      <ConfirmDialog
        title="Eliminar tarea"
        message={`¿Estás seguro de eliminar "${task.title}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    )}

    </>
  )
}

export default EditTask