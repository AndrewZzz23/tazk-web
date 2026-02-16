import { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { supabase } from './supabaseClient'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import { Task, TaskStatus, Profile, UserRole, TaskPriority, Contact } from './types/database.types'
import { EditIcon, XIcon, TrashIcon, SaveIcon, LoadingZapIcon } from './components/iu/AnimatedIcons'
import TaskAttachments from './TaskAttachments'
import TaskActivityLog from './TaskActivityLog'
import ConfirmDialog from './ConfirmDialog'
import { logTaskUpdated, logTaskDeleted, logTaskStatusChanged, logTaskAssigned, logTaskUnassigned } from './lib/activityLogger'
import { notifyTaskAssigned } from './lib/sendPushNotification'
import { sendTaskAssignedEmail, sendTaskCompletedEmail } from './lib/emailNotifications'
import { Calendar, Clock, User, Tag, FileText, Type, AlertCircle, History, Maximize2, X, Phone, Building2, MapPin, BookUser, Mail, Navigation, StickyNote } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet marker icons for Vite
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function InvalidateSizeOnMount() {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 300)
  }, [map])
  return null
}

interface EditTaskProps {
  task: Task
  currentUserId: string
  userEmail?: string
  userRole?: UserRole | null
  showStartDate?: boolean
  showDueDate?: boolean
  showPriority?: boolean
  showContactInEdit?: boolean
  onTaskUpdated: () => void
  onClose: () => void
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}

function EditTask({ task, currentUserId, userEmail, userRole, showStartDate = true, showDueDate = true, showPriority = true, showContactInEdit = true, onTaskUpdated, onClose, showToast }: EditTaskProps) {
  const isMobile = useIsMobile()
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
  const [priority, setPriority] = useState<TaskPriority | ''>(task.priority || '')
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [notifyContacts, setNotifyContacts] = useState<Contact[]>([])
  const [viewingContact, setViewingContact] = useState<Contact | null>(null)

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

  // Load contacts matching notify emails
  useEffect(() => {
    if (!showContactInEdit || !task.notify_email) return
    const emails = task.notify_email.split(',').map(e => e.trim()).filter(Boolean)
    if (emails.length === 0) return

    const loadContacts = async () => {
      let query = supabase
        .from('contacts')
        .select('*, contact_labels(*)')
        .in('email', emails)

      if (task.team_id) {
        query = query.eq('team_id', task.team_id)
      } else {
        query = query.eq('user_id', currentUserId).is('team_id', null)
      }

      const { data } = await query
      if (data) setNotifyContacts(data)
    }
    loadContacts()
  }, [showContactInEdit, task.notify_email, task.team_id, currentUserId])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  // Swipe to close gesture
  const { dragStyle, isDragging, containerProps } = useBottomSheetGesture({
    onClose: handleClose
  })

  // Bloquear scroll del body cuando el bottom sheet está abierto (móvil)
  useBodyScrollLock(isMobile && isVisible)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      showToast?.('El título es obligatorio', 'error')
      return
    }

    // Validar que fecha límite sea posterior a fecha de inicio
    if (startDate && dueDate && dueDate < startDate) {
      showToast?.('La fecha límite debe ser posterior a la fecha de inicio', 'error')
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
        priority: priority || null,
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

      // Track all field changes
      const changes: Record<string, unknown> = {}

      // Title change
      if (task.title !== title.trim()) {
        changes.title_changed = { from: task.title, to: title.trim() }
      }

      // Description change
      if ((task.description || '') !== description.trim()) {
        changes.description_changed = true
      }

      // Priority change
      if ((task.priority || '') !== priority) {
        changes.priority_changed = { from: task.priority || 'sin prioridad', to: priority || 'sin prioridad' }
      }

      // Start date change
      const oldStartDate = task.start_date ? new Date(task.start_date).toDateString() : null
      const newStartDate = startDate ? startDate.toDateString() : null
      if (oldStartDate !== newStartDate) {
        changes.start_date_changed = {
          from: oldStartDate || 'sin fecha',
          to: newStartDate || 'sin fecha'
        }
      }

      // Due date change
      const oldDueDate = task.due_date ? new Date(task.due_date).toDateString() : null
      const newDueDate = dueDate ? dueDate.toDateString() : null
      if (oldDueDate !== newDueDate) {
        changes.due_date_changed = {
          from: oldDueDate || 'sin fecha',
          to: newDueDate || 'sin fecha'
        }
      }

      // Status change (log separately for specific tracking)
      if (task.status_id !== statusId && oldStatus && newStatus) {
        logTaskStatusChanged(task.id, title.trim(), task.team_id, currentUserId, oldStatus.name, newStatus.name, userEmail)
      }

      // Log general update with all changes if any (besides status which is logged separately)
      if (Object.keys(changes).length > 0) {
        logTaskUpdated(task.id, title.trim(), task.team_id, currentUserId, userEmail, changes)
      }

      // Log assignment changes and send notifications
      if (task.assigned_to !== assignedTo) {
        if (assignedTo) {
          const assignedUser = users.find(u => u.id === assignedTo)
          logTaskAssigned(task.id, title.trim(), task.team_id, currentUserId, assignedUser?.email || '', userEmail)
          // Send push notification to assigned user (don't notify yourself)
          if (assignedTo !== currentUserId) {
            notifyTaskAssigned(assignedTo, title.trim(), userEmail || 'Alguien', task.id)
            // Insertar notificación en BD
            supabase.from('notifications').insert({
              user_id: assignedTo,
              type: 'task_assigned',
              title: `${userEmail || 'Alguien'} te asignó una tarea`,
              body: title.trim(),
              data: { task_id: task.id, team_id: task.team_id }
            }).then(() => {})
            // Send email notification
            if (assignedUser?.email) {
              const dueDateStr = dueDate
                ? dueDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : undefined
              sendTaskAssignedEmail(currentUserId, task.team_id, [assignedUser.email], {
                taskId: task.id,
                taskTitle: title.trim(),
                taskDescription: description.trim() || undefined,
                statusName: newStatus?.name,
                assignedToName: assignedUser.full_name || assignedUser.email,
                dueDate: dueDateStr,
                createdByName: userEmail
              })
            }
          }
        } else if (task.assigned_to) {
          logTaskUnassigned(task.id, title.trim(), task.team_id, currentUserId, userEmail)
        }
      }

      // Check if task was completed (status changed to a 'completed' category)
      if (task.status_id !== statusId && newStatus?.category === 'completed' && oldStatus?.category !== 'completed') {
        // Get emails to notify - task creator and/or assigned user
        const emailsToNotify: string[] = []

        // Notify the task creator if different from current user
        if (task.created_by_user?.email && task.created_by !== currentUserId) {
          emailsToNotify.push(task.created_by_user.email)
        }

        // Notify the assigned user if different from current user and creator
        if (task.assigned_to && task.assigned_to !== currentUserId) {
          const assignedUser = users.find(u => u.id === task.assigned_to)
          if (assignedUser?.email && !emailsToNotify.includes(assignedUser.email)) {
            emailsToNotify.push(assignedUser.email)
          }
        }

        if (emailsToNotify.length > 0) {
          sendTaskCompletedEmail(currentUserId, task.team_id, emailsToNotify, {
            taskId: task.id,
            taskTitle: title.trim(),
            taskDescription: description.trim() || undefined,
            statusName: newStatus.name,
            createdByName: userEmail,
            completedDate: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          })
        }

        // Notificación en BD al creador de la tarea
        if (task.created_by && task.created_by !== currentUserId) {
          supabase.from('notifications').insert({
            user_id: task.created_by,
            type: 'task_completed',
            title: `${userEmail || 'Alguien'} completó una tarea`,
            body: title.trim(),
            data: { task_id: task.id, team_id: task.team_id }
          }).then(() => {})
        }
        // Notificación al asignado si es diferente al creador y al usuario actual
        if (task.assigned_to && task.assigned_to !== currentUserId && task.assigned_to !== task.created_by) {
          supabase.from('notifications').insert({
            user_id: task.assigned_to,
            type: 'task_completed',
            title: `${userEmail || 'Alguien'} completó una tarea`,
            body: title.trim(),
            data: { task_id: task.id, team_id: task.team_id }
          }).then(() => {})
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

  // Estilos del DatePicker
  const datePickerStyles = `
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
  `

  // Contenido del formulario
  const renderForm = () => (
    <form onSubmit={handleSubmit} className={`flex-1 overflow-y-auto ${isMobile ? 'px-4 pt-4 pb-8' : 'p-6'}`}>
      {/* Título */}
      <div className="mb-4">
        <label className="flex items-center justify-between text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          <span className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            Título *
          </span>
          <span className={`text-xs ${title.length > 90 ? 'text-yellow-500' : 'text-neutral-400'}`}>
            {title.length}/100
          </span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="Título de la tarea"
          className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-base"
          required
        />
      </div>

      {/* Descripción */}
      <div className="mb-4">
        <label className="flex items-center justify-between text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Descripción
          </span>
          <button
            type="button"
            onClick={() => setShowDescriptionModal(true)}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-yellow-500 transition-colors"
            title="Expandir"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Expandir</span>
          </button>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Agrega más detalles..."
          rows={isMobile ? 2 : 3}
          className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all resize-none text-base"
        />
      </div>

      {/* Estado y Asignar */}
      <div className={`grid gap-4 mb-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
            <Tag className="w-4 h-4" />
            Estado
          </label>
          <select
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-base"
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
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Prioridad */}
      {showPriority && (
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          <AlertCircle className="w-4 h-4" />
          Prioridad
        </label>
        <div className="flex gap-2">
          {[
            { value: 'low', label: 'Baja', color: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30' },
            { value: 'medium', label: 'Media', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30' },
            { value: 'high', label: 'Alta', color: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30' }
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPriority(priority === opt.value ? '' : opt.value as TaskPriority)}
              className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                priority === opt.value
                  ? opt.color
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Fechas */}
      {(showStartDate || showDueDate) && (
      <div className={`grid gap-4 mb-4 ${isMobile || (!showStartDate || !showDueDate) ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {showStartDate && (
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
            <Calendar className="w-4 h-4" />
            Fecha inicio
          </label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="dd/MM/yyyy HH:mm"
            placeholderText="Seleccionar fecha"
            className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-base"
            isClearable
            popperPlacement="top-start"
            portalId="root"
            onFocus={(e) => isMobile && e.target.blur()}
          />
        </div>
        )}

        {showDueDate && (
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
            <Clock className="w-4 h-4" />
            Fecha límite
          </label>
          <DatePicker
            selected={dueDate}
            onChange={(date) => setDueDate(date)}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="dd/MM/yyyy HH:mm"
            placeholderText="Seleccionar fecha"
            className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-base"
            minDate={startDate || undefined}
            isClearable
            popperPlacement="top-start"
            portalId="root"
            onFocus={(e) => isMobile && e.target.blur()}
          />
        </div>
        )}
      </div>
      )}

      {/* Contacto asociado */}
      {showContactInEdit && task.notify_email && (
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
            <User className="w-4 h-4" />
            Contacto notificado
          </label>
          <div className="flex flex-wrap gap-2">
            {task.notify_email.split(',').map((rawEmail, i) => {
              const email = rawEmail.trim()
              const contact = notifyContacts.find(c => c.email === email)

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => contact && setViewingContact(contact)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    contact
                      ? 'bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-300 dark:border-yellow-400/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-400/20 cursor-pointer'
                      : 'bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 cursor-default'
                  }`}
                >
                  {contact && <BookUser className="w-3.5 h-3.5" />}
                  {contact ? contact.name : email}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Adjuntos */}
      <div className="mb-6">
        <TaskAttachments
          taskId={task.id}
          currentUserId={currentUserId}
          teamId={task.team_id}
          userEmail={userEmail}
          canEdit={true}
        />
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        {/* Eliminar - solo para owner/admin o tareas personales */}
        {(!task.team_id || userRole !== 'member') && (
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={loading}
            className="px-4 py-3 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
          >
            <TrashIcon size={18} />
            {!isMobile && <span>Eliminar</span>}
          </button>
        )}
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
              <SaveIcon size={18} />
              <span>Guardar</span>
            </>
          )}
        </button>
      </div>

      {/* Info de creación */}
      <div className="mt-4 pt-3 text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-2 flex-wrap">
        <span>Creada: {new Date(task.created_at).toLocaleDateString('es-CO')}</span>
        {task.created_by_user && (
          <>
            <span>•</span>
            <span>por {task.created_by_user.full_name || task.created_by_user.email}</span>
          </>
        )}
      </div>
    </form>
  )

  // Mobile: Bottom Sheet (casi pantalla completa)
  if (isMobile) {
    return (
      <>
        <style>{datePickerStyles}</style>
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
              <span className="text-yellow-400"><EditIcon size={24} /></span>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Editar Tarea
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowActivityLog(true)}
                className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-yellow-500 transition-colors rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                title="Ver historial"
              >
                <History size={20} />
              </button>
              <button
                onClick={handleClose}
                className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <XIcon size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          {renderForm()}
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

        {/* Activity Log */}
        {showActivityLog && (
          <TaskActivityLog
            taskId={task.id}
            taskTitle={task.title}
            onClose={() => setShowActivityLog(false)}
          />
        )}
      </>
    )
  }

  // Desktop: Modal centrado
  return (
    <>
      <style>{datePickerStyles}</style>
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
              <span className="text-yellow-400"><EditIcon size={24} /></span>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                Editar Tarea
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowActivityLog(true)}
                className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-yellow-500 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
                title="Ver historial"
              >
                <History size={20} />
              </button>
              <button
                onClick={handleClose}
                className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <XIcon size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          {renderForm()}
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

      {/* Activity Log */}
      {showActivityLog && (
        <TaskActivityLog
          taskId={task.id}
          taskTitle={task.title}
          onClose={() => setShowActivityLog(false)}
        />
      )}

      {/* Description Modal */}
      {showDescriptionModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowDescriptionModal(false)}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Descripción
                </h3>
              </div>
              <button
                onClick={() => setShowDescriptionModal(false)}
                className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-hidden">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Agrega más detalles sobre la tarea..."
                className="w-full h-full min-h-[300px] px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all resize-none text-base"
                autoFocus
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setShowDescriptionModal(false)}
                className="px-6 py-2.5 bg-yellow-400 text-neutral-900 rounded-xl font-semibold hover:bg-yellow-300 transition-all"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Detail Panel */}
      {viewingContact && (
        <ContactDetailPanel
          contact={viewingContact}
          isMobile={isMobile}
          onClose={() => setViewingContact(null)}
        />
      )}
    </>
  )
}

// ============================================================
// Contact Detail Panel (side panel / bottom sheet)
// ============================================================
function ContactDetailPanel({ contact, isMobile, onClose }: { contact: Contact; isMobile: boolean; onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(false)
  const label = contact.contact_labels
  const hasMap = contact.location_lat != null && contact.location_lng != null

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  const openInMaps = () => {
    if (contact.location_lat != null && contact.location_lng != null) {
      window.open(
        `https://www.google.com/maps?q=${contact.location_lat},${contact.location_lng}`,
        '_blank'
      )
    }
  }

  const content = (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0">
          {label && (
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2"
              style={{ backgroundColor: `${label.color}20`, color: label.color }}
            >
              {label.name}
            </span>
          )}
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{contact.name}</h2>
        </div>
        <button
          onClick={handleClose}
          className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Info */}
      <div className="space-y-4">
        {contact.email && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Email</p>
              <a href={`mailto:${contact.email}`} className="text-sm text-neutral-900 dark:text-white hover:text-yellow-500 transition-colors truncate block">
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
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Teléfono</p>
              <a href={`tel:${contact.phone}`} className="text-sm text-neutral-900 dark:text-white hover:text-yellow-500 transition-colors">
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
              <p className="text-sm text-neutral-900 dark:text-white">{contact.company}</p>
            </div>
          </div>
        )}

        {contact.location_address && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-500/10 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Dirección</p>
              <p className="text-sm text-neutral-900 dark:text-white truncate">{contact.location_address}</p>
            </div>
          </div>
        )}

        {contact.notes && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
              <StickyNote className="w-5 h-5 text-neutral-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Notas</p>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      {hasMap && contact.location_lat != null && contact.location_lng != null && (
        <div className="mt-6">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">Ubicación</p>
          <div className="h-[200px] rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700" data-no-swipe>
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
          <button
            type="button"
            onClick={openInMaps}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Abrir en Maps
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div
      className={`fixed inset-0 z-[70] transition-all duration-300 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={handleClose}
    >
      {isMobile ? (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 rounded-t-3xl max-h-[85vh] overflow-y-auto transform transition-transform duration-300 ${
            isVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
          </div>
          {content}
        </div>
      ) : (
        <div
          className={`absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-neutral-800 shadow-2xl overflow-y-auto transform transition-transform duration-300 ${
            isVisible ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </div>
      )}
    </div>
  )
}

export default EditTask
