import { supabase } from '../supabaseClient'

interface PushNotificationPayload {
  user_id?: string
  user_ids?: string[]
  title: string
  body: string
  url?: string
  tag?: string
  data?: Record<string, unknown>
}

export async function sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: payload
    })
    if (error) {
      console.error('[Push] Error sending push notification:', error)
      return false
    }
    console.log('[Push] Function response:', data)
    return true
  } catch (err) {
    console.error('[Push] Error invoking push notification function:', err)
    return false
  }
}

// Chequear si el usuario tiene habilitada una preferencia de notificación
async function checkNotifPref(userId: string, field: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('notifications_enabled, notify_on_assign, notify_on_comment, notify_on_status_change, notify_on_due_soon, notify_on_complete')
      .eq('id', userId)
      .single()
    if (!data) return true
    if (!(data as any).notifications_enabled) return false
    const val = (data as any)[field]
    // Si la columna no existe aún (null/undefined), asumimos true por defecto
    return val !== false
  } catch {
    return true
  }
}

// Notificar cuando se asigna una tarea
export async function notifyTaskAssigned(
  assignedUserId: string,
  taskTitle: string,
  assignerName: string,
  taskId?: string
): Promise<void> {
  const allowed = await checkNotifPref(assignedUserId, 'notify_on_assign')
  if (!allowed) return
  await sendPushNotification({
    user_id: assignedUserId,
    title: 'Nueva tarea asignada',
    body: `${assignerName} te asignó: "${taskTitle}"`,
    url: taskId ? `/?task=${taskId}` : '/',
    tag: 'task-assigned'
  })
}

// Notificar cuando una tarea está próxima a vencer
export async function notifyTaskDueSoon(
  userId: string,
  taskTitle: string,
  dueDate: string,
  taskId?: string
): Promise<void> {
  const allowed = await checkNotifPref(userId, 'notify_on_due_soon')
  if (!allowed) return
  await sendPushNotification({
    user_id: userId,
    title: '⏰ Tarea próxima a vencer',
    body: `"${taskTitle}" vence ${dueDate}`,
    url: taskId ? `/?task=${taskId}` : '/',
    tag: 'task-due'
  })
}

// Notificar cuando se comenta en una tarea
export async function notifyTaskComment(
  userId: string,
  taskTitle: string,
  commenterName: string,
  taskId?: string
): Promise<void> {
  const allowed = await checkNotifPref(userId, 'notify_on_comment')
  if (!allowed) return
  await sendPushNotification({
    user_id: userId,
    title: 'Nuevo comentario',
    body: `${commenterName} comentó en "${taskTitle}"`,
    url: taskId ? `/?task=${taskId}` : '/',
    tag: 'task-comment'
  })
}

// Notificar cuando cambia el estado de una tarea
export async function notifyStatusChange(
  userId: string,
  taskTitle: string,
  newStatusName: string,
  changerName: string,
  taskId?: string
): Promise<void> {
  const allowed = await checkNotifPref(userId, 'notify_on_status_change')
  if (!allowed) return
  await sendPushNotification({
    user_id: userId,
    title: 'Estado actualizado',
    body: `"${taskTitle}" → ${newStatusName} (por ${changerName})`,
    url: taskId ? `/?task=${taskId}` : '/',
    tag: 'task-status'
  })
}

// Notificar cuando se completa una tarea
export async function notifyTaskCompleted(
  userId: string,
  taskTitle: string,
  taskId?: string
): Promise<void> {
  const allowed = await checkNotifPref(userId, 'notify_on_complete')
  if (!allowed) return
  await sendPushNotification({
    user_id: userId,
    title: '✅ Tarea completada',
    body: `"${taskTitle}" fue marcada como completada`,
    url: taskId ? `/?task=${taskId}` : '/',
    tag: 'task-complete'
  })
}

// Notificar invitación a equipo
export async function notifyTeamInvite(
  userId: string,
  teamName: string,
  inviterName: string
): Promise<void> {
  await sendPushNotification({
    user_id: userId,
    title: 'Invitación a equipo',
    body: `${inviterName} te invitó al equipo "${teamName}"`,
    url: '/',
    tag: 'team-invite'
  })
}

// ─── Sprint Notifications ─────────────────────────────────────────────────────

export async function notifySprintStarted(
  teamMemberUserIds: string[],
  sprintName: string,
  starterName: string,
  sprintId: string
): Promise<void> {
  if (!teamMemberUserIds.length) return
  await sendPushNotification({
    user_ids: teamMemberUserIds,
    title: '🚀 Sprint iniciado',
    body: `${starterName} inició el sprint "${sprintName}"`,
    url: '/',
    tag: `sprint-started-${sprintId}`,
    data: { sprint_id: sprintId }
  })
}

export async function notifyTaskAddedToSprint(
  assignedUserId: string | null,
  taskTitle: string,
  sprintName: string,
  taskId: string
): Promise<void> {
  if (!assignedUserId) return
  await sendPushNotification({
    user_id: assignedUserId,
    title: 'Tarea añadida al sprint',
    body: `"${taskTitle}" fue añadida al sprint "${sprintName}"`,
    url: '/',
    tag: `task-sprint-${taskId}`,
    data: { task_id: taskId }
  })
}
