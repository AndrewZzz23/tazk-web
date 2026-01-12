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
    console.log('[Push] Invoking send-push-notification function with payload:', payload)
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

// Notificar cuando se asigna una tarea
export async function notifyTaskAssigned(
  assignedUserId: string,
  taskTitle: string,
  assignerName: string,
  taskId?: string
): Promise<void> {
  console.log('[Push] Sending task assignment notification to:', assignedUserId)
  const result = await sendPushNotification({
    user_id: assignedUserId,
    title: 'Nueva tarea asignada',
    body: `${assignerName} te asignó: "${taskTitle}"`,
    url: taskId ? `/?task=${taskId}` : '/',
    tag: 'task-assigned'
  })
  console.log('[Push] Task assignment notification result:', result)
}

// Notificar cuando una tarea está próxima a vencer
export async function notifyTaskDueSoon(
  userId: string,
  taskTitle: string,
  dueDate: string,
  taskId?: string
): Promise<void> {
  await sendPushNotification({
    user_id: userId,
    title: 'Tarea próxima a vencer',
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
  await sendPushNotification({
    user_id: userId,
    title: 'Nuevo comentario',
    body: `${commenterName} comentó en "${taskTitle}"`,
    url: taskId ? `/?task=${taskId}` : '/',
    tag: 'task-comment'
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
