import { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { supabase } from './supabaseClient'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import { TaskStatus, Profile, TaskPriority, Sprint } from './types/database.types'
import { ZapIcon, XIcon, LoadingZapIcon } from './components/iu/AnimatedIcons'
import { notifyTaskAssigned } from './lib/sendPushNotification'
import { Calendar, Clock, User, Tag, Mail, FileText, Type, AlertCircle, Maximize2, X, Timer } from 'lucide-react'

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21]
import ContactPicker from './ContactPicker'
import ConfirmDialog from './ConfirmDialog'

interface CreateTaskProps {
  currentUserId: string
  teamId: string | null
  userEmail?: string
  showStartDate?: boolean
  showDueDate?: boolean
  showPriority?: boolean
  defaultPriority?: string | null
  activeSprint?: Sprint | null
  onTaskCreated: () => void
  onClose: () => void
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}

function CreateTask({ currentUserId, teamId, userEmail, showStartDate = true, showDueDate = true, showPriority = true, defaultPriority, activeSprint, onTaskCreated, onClose, showToast }: CreateTaskProps) {
  const isMobile = useIsMobile()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [statusId, setStatusId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [notifyEmails, setNotifyEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [priority, setPriority] = useState<TaskPriority | ''>((defaultPriority as TaskPriority) || '')
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [storyPoints, setStoryPoints] = useState<number | null>(null)
  const [sprintId, setSprintId] = useState<string | null>(activeSprint?.id || null)
  const [availableSprints, setAvailableSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [emailModuleEnabled, setEmailModuleEnabled] = useState(false)
  const [hasConnectedEmail, setHasConnectedEmail] = useState(false)
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  useEffect(() => {
    // Animación de entrada
    setTimeout(() => setIsVisible(true), 10)

    const loadData = async () => {
      setLoadingData(true)

      // Cargar estados filtrados por equipo o personales
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
        // Seleccionar el primer estado de categoría 'not_started', o el primero disponible
        const defaultStatus = statusData.find(s => s.category === 'not_started') || statusData[0]
        setStatusId(defaultStatus.id)
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

      // Verificar si el módulo de correos está habilitado
      let emailSettingsQuery = supabase
        .from('email_settings')
        .select('is_enabled')

      if (teamId) {
        emailSettingsQuery = emailSettingsQuery.eq('team_id', teamId)
      } else {
        emailSettingsQuery = emailSettingsQuery.eq('user_id', currentUserId).is('team_id', null)
      }

      const { data: emailSettings } = await emailSettingsQuery.maybeSingle()
      setEmailModuleEnabled(emailSettings?.is_enabled || false)

      // Verificar si tiene correo OAuth conectado
      if (emailSettings?.is_enabled) {
        const { data: oauthToken } = await supabase
          .from('email_oauth_tokens')
          .select('id')
          .eq('user_id', currentUserId)
          .limit(1)
          .maybeSingle()
        setHasConnectedEmail(!!oauthToken)
      }

      // Cargar sprints disponibles (planning + active)
      let sprintQuery = supabase
        .from('sprints')
        .select('id,name,status')
        .in('status', ['planning', 'active'])
        .order('created_at', { ascending: false })

      if (teamId) {
        sprintQuery = sprintQuery.eq('team_id', teamId)
      } else {
        sprintQuery = sprintQuery.is('team_id', null).eq('created_by', currentUserId)
      }

      const { data: sprintData } = await sprintQuery
      if (sprintData) setAvailableSprints(sprintData as Sprint[])

      setLoadingData(false)
    }

    loadData()
  }, [teamId, currentUserId])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  const isDirty = () => {
    return !!(title.trim() || description.trim() || startDate || dueDate || priority || notifyEmails.length > 0)
  }

  const tryClose = () => {
    if (isDirty()) {
      setShowDiscardConfirm(true)
    } else {
      handleClose()
    }
  }

  // ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false)
        } else {
          tryClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDiscardConfirm, title, description, startDate, dueDate, priority, notifyEmails])

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

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        status_id: statusId,
        team_id: teamId,
        created_by: currentUserId,
        assigned_to: assignedTo || null,
        priority: priority || null,
        start_date: startDate?.toISOString() || null,
        due_date: dueDate?.toISOString() || null,
        notify_email: notifyEmails.length > 0 ? notifyEmails.join(',') : null,
        story_points: storyPoints,
        sprint_id: sprintId || null
      })
      .select()
      .single()

    setLoading(false)

    if (error) {
      showToast?.('Error al crear tarea', 'error')
    } else {
      showToast?.('Tarea creada', 'success')

      // Recopilar emails a notificar
      const emailsToNotify = [...notifyEmails]

      // Agregar email del usuario asignado si existe y no está ya en la lista
      if (assignedTo) {
        const assignedUser = users.find(u => u.id === assignedTo)
        if (assignedUser?.email && !emailsToNotify.includes(assignedUser.email)) {
          emailsToNotify.push(assignedUser.email)
        }
        // Send push notification to assigned user (don't notify yourself)
        if (assignedTo !== currentUserId) {
          notifyTaskAssigned(assignedTo, title.trim(), userEmail || 'Alguien', data.id)
          // Insertar notificación en BD
          supabase.from('notifications').insert({
            user_id: assignedTo,
            type: 'task_assigned',
            title: `${userEmail || 'Alguien'} te asignó una tarea`,
            body: title.trim(),
            data: { task_id: data.id, team_id: teamId }
          }).then(() => {})
        }
      }

      // Enviar notificaciones por email
      if (emailsToNotify.length > 0) {
        sendNotificationEmails(data.id, title.trim(), description.trim(), emailsToNotify)
      }

      onTaskCreated()
      handleClose()
    }
  }

  const sendNotificationEmails = async (
    taskId: string,
    taskTitle: string,
    taskDescription: string,
    emails: string[]
  ) => {
    // Intentar obtener configuración del usuario
    let settingsQuery = supabase
      .from('email_settings')
      .select('*')
      .eq('user_id', currentUserId)

    if (teamId) {
      settingsQuery = settingsQuery.eq('team_id', teamId)
    } else {
      settingsQuery = settingsQuery.is('team_id', null)
    }

    const { data: settings } = await settingsQuery.maybeSingle()

    // Si el módulo de correos está desactivado, no enviar nada
    if (!settings?.is_enabled) return

    // Si notify_on_create está desactivado, no enviar
    if (!settings?.notify_on_create) return

    // Obtener nombre del estado
    const status = statuses.find(s => s.id === statusId)
    const statusName = status?.name || 'Sin estado'
    const assignedUserName = assignedTo ? (users.find(u => u.id === assignedTo)?.full_name || 'Asignado') : 'Sin asignar'
    const dueDateStr = dueDate ? dueDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha límite'

    // Intentar obtener plantilla personalizada
    let templateQuery = supabase
      .from('email_templates')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('type', 'task_created')
      .eq('is_active', true)

    if (teamId) {
      templateQuery = templateQuery.eq('team_id', teamId)
    } else {
      templateQuery = templateQuery.is('team_id', null)
    }

    const { data: template } = await templateQuery.maybeSingle()

    // Usar plantilla personalizada o plantilla por defecto
    let subject: string
    let html: string
    const fromName = settings.from_name || 'Tazk'

    if (template?.body_html) {
      // Usar plantilla personalizada
      html = template.body_html
        .replace(/\{\{task_title\}\}/g, taskTitle)
        .replace(/\{\{task_description\}\}/g, taskDescription || 'Sin descripción')
        .replace(/\{\{status_name\}\}/g, statusName)
        .replace(/\{\{due_date\}\}/g, dueDateStr)
        .replace(/\{\{created_by_name\}\}/g, userEmail || 'Usuario')
        .replace(/\{\{assigned_to_name\}\}/g, assignedUserName)
        .replace(/\{\{task_url\}\}/g, `${window.location.origin}/task/${taskId}`)

      subject = template.subject?.replace(/\{\{task_title\}\}/g, taskTitle) || `Nueva tarea: ${taskTitle}`
    } else {
      // Plantilla por defecto (cuando no hay plantilla o está vacía)
      subject = `Nueva tarea: ${taskTitle}`
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #facc15 0%, #f97316 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <div style="margin-bottom: 10px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
              </svg>
            </div>
            <h1 style="color: #1a1a1a; margin: 0; font-size: 28px;">Tazk</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 16px 16px;">
            <h2 style="color: #1a1a1a; margin: 0 0 15px;">Nueva tarea creada</h2>
            <p style="color: #666; line-height: 1.6; margin: 0 0 20px;">
              <strong>${taskTitle}</strong>
            </p>
            ${taskDescription ? `<p style="color: #888; line-height: 1.6; margin: 0 0 20px;">${taskDescription}</p>` : ''}
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="color: #666; margin: 5px 0;"><strong>Estado:</strong> ${statusName}</p>
              <p style="color: #666; margin: 5px 0;"><strong>Asignado a:</strong> ${assignedUserName}</p>
              <p style="color: #666; margin: 5px 0;"><strong>Fecha límite:</strong> ${dueDateStr}</p>
              <p style="color: #666; margin: 5px 0;"><strong>Creado por:</strong> ${userEmail || 'Usuario'}</p>
            </div>
          </div>
        </div>
      `
    }

    // Enviar a cada email
    for (const email of emails) {
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: email,
            subject,
            html,
            from_name: fromName,
            task_id: taskId,
            template_type: 'task_created',
            user_id: currentUserId,
            team_id: teamId
          }
        })
      } catch (err) {
        console.error('Error enviando email a', email, err)
      }
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
          placeholder="Agrega un título a tu Tazk"
          className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-base"
          autoFocus={!isMobile}
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
            {statuses.map(status => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </div>

        {teamId && users.length > 0 && (
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
              {users.map(user => (
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

      {/* Story Points */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          <span className="text-base font-bold text-neutral-500 dark:text-neutral-400">SP</span>
          Story Points
          <span className="text-xs text-neutral-400 font-normal">(opcional)</span>
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {FIBONACCI.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setStoryPoints(storyPoints === val ? null : val)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all border ${
                storyPoints === val
                  ? 'bg-yellow-400 text-neutral-900 border-yellow-400 shadow-sm shadow-yellow-400/30'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600 hover:border-yellow-400/60'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* Sprint */}
      {availableSprints.length > 0 && (
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
            <Timer className="w-4 h-4" />
            Sprint
          </label>
          <select
            value={sprintId || ''}
            onChange={(e) => setSprintId(e.target.value || null)}
            className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-base"
          >
            <option value="">Sin sprint (Backlog)</option>
            {availableSprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.status === 'active' ? ' (Activo)' : ''}
              </option>
            ))}
          </select>
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
            onFocus={(e) => isMobile && e.target.blur()}
            isClearable
            popperPlacement="top-start"
            portalId="root"
          />
        </div>
        )}
      </div>
      )}

      {/* Emails de notificación - solo si el módulo está habilitado */}
      {emailModuleEnabled && (
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
            <Mail className="w-4 h-4" />
            Notificar por email
            <span className="text-neutral-400 dark:text-neutral-500 font-normal">
              ({notifyEmails.length}/3)
            </span>
          </label>

          {/* Advertencia si no tiene correo conectado */}
          {!hasConnectedEmail && (
            <div className="flex items-start gap-2 p-3 mb-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-600/40 rounded-xl text-sm text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>No tienes un correo conectado. Las notificaciones no se enviarán hasta que conectes tu cuenta de correo en <strong>Configuración de correos</strong>.</span>
            </div>
          )}

          {/* Selector de contacto */}
          <ContactPicker
            currentUserId={currentUserId}
            teamId={teamId}
            selectedEmails={notifyEmails}
            maxEmails={3}
            onEmailsChange={setNotifyEmails}
          />

          <div className="flex items-center gap-2 my-3">
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
            <span className="text-xs text-neutral-400 dark:text-neutral-500">o escribir manualmente</span>
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
          </div>

          {/* Lista de emails agregados */}
          {notifyEmails.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {notifyEmails.map((email, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400/20 dark:bg-yellow-400/10 border border-yellow-400/30 rounded-full text-sm text-yellow-700 dark:text-yellow-400"
                >
                  <span className="max-w-[150px] truncate">{email}</span>
                  <button
                    type="button"
                    onClick={() => setNotifyEmails(notifyEmails.filter((_, i) => i !== index))}
                    className="ml-1 hover:text-red-500 transition-colors"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input para agregar email */}
          {notifyEmails.length < 3 && (
            <div className="relative">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const email = emailInput.trim()
                    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !notifyEmails.includes(email)) {
                      setNotifyEmails([...notifyEmails, email])
                      setEmailInput('')
                    }
                  }
                }}
                placeholder="correo@ejemplo.com"
                className="w-full px-4 py-3 pr-24 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-base"
              />
              <button
                type="button"
                onClick={() => {
                  const email = emailInput.trim()
                  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !notifyEmails.includes(email)) {
                    setNotifyEmails([...notifyEmails, email])
                    setEmailInput('')
                  }
                }}
                disabled={!emailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm font-medium bg-yellow-400 text-neutral-900 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Agregar
              </button>
            </div>
          )}
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
              <ZapIcon size={20} />
              <span>Crear</span>
            </>
          )}
        </button>
      </div>
    </form>
  )

  // Contenido de carga o sin estados
  const renderLoadingOrEmpty = () => {
    if (loadingData) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-16">
          <LoadingZapIcon size={48} />
        </div>
      )
    }

    if (statuses.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
          <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mb-4">
            <Tag className="w-8 h-8 text-yellow-500" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            No hay estados disponibles
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4 max-w-[280px]">
            Debes crear al menos un estado antes de poder crear tareas.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 bg-yellow-400 text-neutral-900 rounded-xl font-medium hover:bg-yellow-300 transition-colors"
          >
            Entendido
          </button>
        </div>
      )
    }

    return null
  }

  // Mobile: Bottom Sheet (casi pantalla completa)
  if (isMobile) {
    return (
      <>
        <style>{datePickerStyles}</style>
        <div
          className={`fixed inset-0 z-50 transition-all duration-200 ${
            isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
          }`}
          onClick={tryClose}
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
              <span className="text-yellow-400"><ZapIcon size={24} /></span>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Nueva Tarea
              </h2>
            </div>
            <button
              onClick={tryClose}
              className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Content */}
          {loadingData || statuses.length === 0 ? renderLoadingOrEmpty() : renderForm()}

          {showDiscardConfirm && (
            <ConfirmDialog
              title="Cambios sin guardar"
              message="Tienes cambios sin guardar. ¿Deseas descartarlos?"
              confirmText="Descartar"
              cancelText="Seguir editando"
              type="warning"
              onConfirm={handleClose}
              onCancel={() => setShowDiscardConfirm(false)}
            />
          )}
        </div>
      </>
    )
  }

  // Desktop: Side Panel
  return (
    <>
      <style>{datePickerStyles}</style>
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
        }`}
        onClick={tryClose}
      >
        <div
          className={`absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white dark:bg-neutral-800 shadow-2xl overflow-y-auto transform transition-transform duration-300 ${
            isVisible ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400"><ZapIcon size={24} /></span>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                Nueva Tarea
              </h2>
            </div>
            <button
              onClick={tryClose}
              className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Content */}
          {loadingData || statuses.length === 0 ? renderLoadingOrEmpty() : renderForm()}
        </div>
      </div>

      {/* Modal de descripción expandida */}
      {showDescriptionModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowDescriptionModal(false)}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Descripción</h3>
              </div>
              <button
                onClick={() => setShowDescriptionModal(false)}
                className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Agrega más detalles sobre la tarea..."
                className="w-full h-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none text-base min-h-[300px]"
                autoFocus
              />
            </div>
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-end">
              <button
                onClick={() => setShowDescriptionModal(false)}
                className="px-6 py-2.5 bg-yellow-400 text-neutral-900 rounded-xl font-medium hover:bg-yellow-300 transition-colors"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {showDiscardConfirm && (
        <ConfirmDialog
          title="Cambios sin guardar"
          message="Tienes cambios sin guardar. ¿Deseas descartarlos?"
          confirmText="Descartar"
          cancelText="Seguir editando"
          type="warning"
          onConfirm={handleClose}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </>
  )
}

export default CreateTask
