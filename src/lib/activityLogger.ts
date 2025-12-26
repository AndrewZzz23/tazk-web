import { supabase } from '../supabaseClient'

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'joined'
  | 'left'
  | 'role_changed'
  | 'invited'
  | 'invitation_accepted'
  | 'invitation_rejected'
  | 'invitation_cancelled'
  | 'attachment_added'
  | 'attachment_removed'

export type ActivityEntity = 'task' | 'team_member' | 'status' | 'team' | 'attachment'

interface LogActivityParams {
  action: ActivityAction
  entityType: ActivityEntity
  entityId: string
  teamId: string | null
  userId: string
  userEmail?: string
  details?: Record<string, unknown>
}

export async function logActivity({
  action,
  entityType,
  entityId,
  teamId,
  userId,
  userEmail,
  details = {}
}: LogActivityParams): Promise<void> {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        action,
        entity_type: entityType,
        entity_id: entityId,
        team_id: teamId,
        performed_by: userId,
        user_email: userEmail,
        details
      })

    if (error) {
      console.error('Error logging activity:', error)
    }
  } catch (err) {
    console.error('Error in logActivity:', err)
  }
}

// Helper functions for common actions
export const logTaskCreated = (
  taskId: string,
  taskTitle: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'created',
  entityType: 'task',
  entityId: taskId,
  teamId,
  userId,
  userEmail,
  details: { title: taskTitle }
})

export const logTaskUpdated = (
  taskId: string,
  taskTitle: string,
  teamId: string | null,
  userId: string,
  userEmail?: string,
  changes?: Record<string, unknown>
) => logActivity({
  action: 'updated',
  entityType: 'task',
  entityId: taskId,
  teamId,
  userId,
  userEmail,
  details: { title: taskTitle, ...changes }
})

export const logTaskDeleted = (
  taskId: string,
  taskTitle: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'deleted',
  entityType: 'task',
  entityId: taskId,
  teamId,
  userId,
  userEmail,
  details: { title: taskTitle }
})

export const logTaskStatusChanged = (
  taskId: string,
  taskTitle: string,
  teamId: string | null,
  userId: string,
  oldStatus: string,
  newStatus: string,
  userEmail?: string
) => logActivity({
  action: 'status_changed',
  entityType: 'task',
  entityId: taskId,
  teamId,
  userId,
  userEmail,
  details: { title: taskTitle, old_status: oldStatus, new_status: newStatus }
})

export const logTaskAssigned = (
  taskId: string,
  taskTitle: string,
  teamId: string | null,
  userId: string,
  assignedToEmail: string,
  userEmail?: string
) => logActivity({
  action: 'assigned',
  entityType: 'task',
  entityId: taskId,
  teamId,
  userId,
  userEmail,
  details: { title: taskTitle, assigned_to_email: assignedToEmail }
})

export const logTaskUnassigned = (
  taskId: string,
  taskTitle: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'unassigned',
  entityType: 'task',
  entityId: taskId,
  teamId,
  userId,
  userEmail,
  details: { title: taskTitle }
})

export const logStatusCreated = (
  statusId: string,
  statusName: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'created',
  entityType: 'status',
  entityId: statusId,
  teamId,
  userId,
  userEmail,
  details: { name: statusName }
})

export const logStatusUpdated = (
  statusId: string,
  statusName: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'updated',
  entityType: 'status',
  entityId: statusId,
  teamId,
  userId,
  userEmail,
  details: { name: statusName }
})

export const logStatusDeleted = (
  statusId: string,
  statusName: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'deleted',
  entityType: 'status',
  entityId: statusId,
  teamId,
  userId,
  userEmail,
  details: { name: statusName }
})

export const logAttachmentAdded = (
  attachmentId: string,
  fileName: string,
  taskId: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'attachment_added',
  entityType: 'attachment',
  entityId: attachmentId,
  teamId,
  userId,
  userEmail,
  details: { file_name: fileName, task_id: taskId }
})

export const logAttachmentRemoved = (
  attachmentId: string,
  fileName: string,
  taskId: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'attachment_removed',
  entityType: 'attachment',
  entityId: attachmentId,
  teamId,
  userId,
  userEmail,
  details: { file_name: fileName, task_id: taskId }
})
