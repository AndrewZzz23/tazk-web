import { supabase } from '../supabaseClient'

interface EmailSettings {
  is_enabled: boolean
  notify_on_create: boolean
  notify_on_assign: boolean
  notify_on_complete: boolean
  from_name: string
}

interface TaskEmailData {
  taskId: string
  taskTitle: string
  taskDescription?: string
  statusName?: string
  assignedToName?: string
  assignedToEmail?: string
  dueDate?: string
  createdByName?: string
  completedDate?: string
}

// Obtener configuración de email del usuario
async function getEmailSettings(
  userId: string,
  teamId: string | null
): Promise<EmailSettings | null> {
  let query = supabase
    .from('email_settings')
    .select('*')
    .eq('user_id', userId)

  if (teamId) {
    query = query.eq('team_id', teamId)
  } else {
    query = query.is('team_id', null)
  }

  const { data } = await query.maybeSingle()
  return data
}

// Obtener plantilla de email
async function getEmailTemplate(
  userId: string,
  teamId: string | null,
  templateType: string
): Promise<{ subject: string; body_html: string } | null> {
  let query = supabase
    .from('email_templates')
    .select('subject, body_html')
    .eq('user_id', userId)
    .eq('type', templateType)
    .eq('is_active', true)

  if (teamId) {
    query = query.eq('team_id', teamId)
  } else {
    query = query.is('team_id', null)
  }

  const { data } = await query.maybeSingle()
  return data
}

// Reemplazar variables en plantilla
function replaceTemplateVariables(
  template: string,
  data: TaskEmailData
): string {
  return template
    .replace(/\{\{task_title\}\}/g, data.taskTitle)
    .replace(/\{\{task_description\}\}/g, data.taskDescription || 'Sin descripción')
    .replace(/\{\{status_name\}\}/g, data.statusName || 'Sin estado')
    .replace(/\{\{due_date\}\}/g, data.dueDate || 'Sin fecha límite')
    .replace(/\{\{created_by_name\}\}/g, data.createdByName || 'Usuario')
    .replace(/\{\{assigned_to_name\}\}/g, data.assignedToName || 'Sin asignar')
    .replace(/\{\{task_url\}\}/g, `${window.location.origin}/task/${data.taskId}`)
    .replace(/\{\{completed_date\}\}/g, data.completedDate || '')
}

// Plantilla por defecto para tarea asignada
function getDefaultAssignedTemplate(data: TaskEmailData): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <div style="margin-bottom: 10px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <polyline points="16 11 18 13 22 9"/>
          </svg>
        </div>
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Tazk</h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 16px 16px;">
        <h2 style="color: #1a1a1a; margin: 0 0 15px;">Te han asignado una tarea</h2>
        <p style="color: #666; line-height: 1.6; margin: 0 0 20px;">
          <strong>${data.taskTitle}</strong>
        </p>
        ${data.taskDescription ? `<p style="color: #888; line-height: 1.6; margin: 0 0 20px;">${data.taskDescription}</p>` : ''}
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #666; margin: 5px 0;"><strong>Estado:</strong> ${data.statusName || 'Sin estado'}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Fecha límite:</strong> ${data.dueDate || 'Sin fecha límite'}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Asignado por:</strong> ${data.createdByName || 'Usuario'}</p>
        </div>
      </div>
    </div>
  `
}

// Plantilla por defecto para tarea completada
function getDefaultCompletedTemplate(data: TaskEmailData): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <div style="margin-bottom: 10px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Tazk</h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 16px 16px;">
        <h2 style="color: #1a1a1a; margin: 0 0 15px;">Tarea completada</h2>
        <p style="color: #666; line-height: 1.6; margin: 0 0 20px;">
          <strong>${data.taskTitle}</strong>
        </p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #666; margin: 5px 0;"><strong>Completada por:</strong> ${data.createdByName || 'Usuario'}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Fecha:</strong> ${data.completedDate || new Date().toLocaleDateString('es-CO')}</p>
        </div>
      </div>
    </div>
  `
}

// Enviar email usando la Edge Function
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  fromName: string,
  taskId: string,
  templateType: string,
  userId: string,
  teamId: string | null
): Promise<void> {
  try {
    await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject,
        html,
        from_name: fromName,
        task_id: taskId,
        template_type: templateType,
        user_id: userId,
        team_id: teamId
      }
    })
  } catch (err) {
    console.error('Error enviando email:', err)
  }
}

// Enviar notificación de tarea asignada
export async function sendTaskAssignedEmail(
  userId: string,
  teamId: string | null,
  emails: string[],
  data: TaskEmailData
): Promise<void> {
  if (emails.length === 0) return

  const settings = await getEmailSettings(userId, teamId)
  if (!settings?.is_enabled || !settings?.notify_on_assign) return

  const template = await getEmailTemplate(userId, teamId, 'task_assigned')

  let subject: string
  let html: string
  const fromName = settings.from_name || 'Tazk'

  if (template?.body_html) {
    html = replaceTemplateVariables(template.body_html, data)
    subject = replaceTemplateVariables(template.subject || `Tarea asignada: ${data.taskTitle}`, data)
  } else {
    subject = `Te han asignado: ${data.taskTitle}`
    html = getDefaultAssignedTemplate(data)
  }

  for (const email of emails) {
    await sendEmail(email, subject, html, fromName, data.taskId, 'task_assigned', userId, teamId)
  }
}

// Enviar notificación de tarea completada
export async function sendTaskCompletedEmail(
  userId: string,
  teamId: string | null,
  emails: string[],
  data: TaskEmailData
): Promise<void> {
  if (emails.length === 0) return

  const settings = await getEmailSettings(userId, teamId)
  if (!settings?.is_enabled || !settings?.notify_on_complete) return

  const template = await getEmailTemplate(userId, teamId, 'task_completed')

  let subject: string
  let html: string
  const fromName = settings.from_name || 'Tazk'

  if (template?.body_html) {
    html = replaceTemplateVariables(template.body_html, data)
    subject = replaceTemplateVariables(template.subject || `Tarea completada: ${data.taskTitle}`, data)
  } else {
    subject = `Tarea completada: ${data.taskTitle}`
    html = getDefaultCompletedTemplate(data)
  }

  for (const email of emails) {
    await sendEmail(email, subject, html, fromName, data.taskId, 'task_completed', userId, teamId)
  }
}
