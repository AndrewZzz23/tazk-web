import { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { supabase } from './supabaseClient'
import { TaskStatus, Profile } from './types/database.types'
import { ZapIcon, XIcon } from './components/iu/AnimatedIcons'
import { logTaskCreated } from './lib/activityLogger'

interface CreateTaskProps {
  currentUserId: string
  teamId: string | null
  userEmail?: string
  onTaskCreated: () => void
  onClose: () => void
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}

function CreateTask({ currentUserId, teamId, userEmail, onTaskCreated, onClose, showToast }: CreateTaskProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [statusId, setStatusId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [notifyEmails, setNotifyEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')
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
      showToast?.('El título es obligatorio', 'error')
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
        start_date: startDate?.toISOString() || null,
        due_date: dueDate?.toISOString() || null,
        notify_email: notifyEmails.length > 0 ? notifyEmails.join(',') : null
      })
      .select()
      .single()

    setLoading(false)

    if (error) {
      showToast?.('Error al crear tarea', 'error')
    } else {
      showToast?.('Tarea creada', 'success')
      // Log activity
      logTaskCreated(data.id, title.trim(), teamId, currentUserId, userEmail)

      // Recopilar emails a notificar
      const emailsToNotify = [...notifyEmails]

      // Agregar email del usuario asignado si existe y no está ya en la lista
      if (assignedTo) {
        const assignedUser = users.find(u => u.id === assignedTo)
        if (assignedUser?.email && !emailsToNotify.includes(assignedUser.email)) {
          emailsToNotify.push(assignedUser.email)
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
        .replace(/\{\{task_url\}\}/g, `${window.location.origin}`)

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
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-neutral-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-yellow-400"><ZapIcon size={24} /></span> Nueva Tarea
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

          {/* Emails de notificación */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">
              Emails de notificación
              <span className="text-gray-400 dark:text-neutral-500 font-normal ml-2">
                ({notifyEmails.length}/3)
              </span>
            </label>

            {/* Lista de emails agregados */}
            {notifyEmails.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {notifyEmails.map((email, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400/20 dark:bg-yellow-400/10 border border-yellow-400/30 rounded-full text-sm text-yellow-700 dark:text-yellow-400"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="max-w-[180px] truncate">{email}</span>
                    <button
                      type="button"
                      onClick={() => setNotifyEmails(notifyEmails.filter((_, i) => i !== index))}
                      className="ml-1 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input para agregar email */}
            {notifyEmails.length < 3 && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
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
                  placeholder={notifyEmails.length === 0 ? "correo@ejemplo.com" : "Agregar otro correo..."}
                  className="w-full pl-12 pr-24 py-3 bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm font-medium bg-yellow-400 text-neutral-900 rounded-md hover:bg-yellow-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Agregar
                </button>
              </div>
            )}

            <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1.5 ml-1">
              {notifyEmails.length < 3
                ? "Opcional - Presiona Enter o clic en Agregar"
                : "Máximo de 3 correos alcanzado"}
            </p>
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
                  <ZapIcon size={18} /> Crear Tarea
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>

          </>
  )
}

export default CreateTask