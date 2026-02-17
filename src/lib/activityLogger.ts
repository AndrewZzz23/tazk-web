import { supabase } from '../supabaseClient'

// Valores permitidos según constraints de la BD
export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'assigned'
  | 'unassigned'
  | 'reassigned'
  | 'status_changed'
  | 'role_changed'
  | 'member_added'
  | 'member_removed'
  | 'invited'
  | 'invitation_accepted'
  | 'invitation_rejected'
  | 'invitation_cancelled'
  | 'profile_updated'
  | 'activated'
  | 'deactivated'

export type ActivityEntity = 'task' | 'team' | 'team_member' | 'status' | 'invitation' | 'profile' | 'recurring_task' | 'contact' | 'contact_label'

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
        user_id: userId,
        user_email: userEmail,
        changes: details,
        description: `${action} ${entityType}`
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

// Attachments se loguean como updates de task
export const logAttachmentAdded = (
  _attachmentId: string,
  fileName: string,
  taskId: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'updated',
  entityType: 'task',
  entityId: taskId,
  teamId,
  userId,
  userEmail,
  details: { attachment_added: fileName }
})

export const logAttachmentRemoved = (
  _attachmentId: string,
  fileName: string,
  taskId: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'updated',
  entityType: 'task',
  entityId: taskId,
  teamId,
  userId,
  userEmail,
  details: { attachment_removed: fileName }
})

// Comments
export const logCommentAdded = (
  _commentId: string,
  taskId: string,
  teamId: string | null,
  userId: string,
  userEmail?: string,
  hasFile?: boolean
) => logActivity({
  action: 'updated',
  entityType: 'task',
  entityId: taskId,
  teamId,
  userId,
  userEmail,
  details: { comment_added: true, has_attachment: hasFile || false }
})

export const logCommentRemoved = (
  _commentId: string,
  taskId: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'updated',
  entityType: 'task',
  entityId: taskId,
  teamId,
  userId,
  userEmail,
  details: { comment_removed: true }
})

// Recurring Tasks (Rutinas)
export const logRecurringTaskCreated = (
  recurringTaskId: string,
  title: string,
  frequency: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'created',
  entityType: 'recurring_task',
  entityId: recurringTaskId,
  teamId,
  userId,
  userEmail,
  details: { title, frequency }
})

export const logRecurringTaskUpdated = (
  recurringTaskId: string,
  title: string,
  teamId: string | null,
  userId: string,
  userEmail?: string,
  changes?: Record<string, unknown>
) => logActivity({
  action: 'updated',
  entityType: 'recurring_task',
  entityId: recurringTaskId,
  teamId,
  userId,
  userEmail,
  details: { title, ...changes }
})

export const logRecurringTaskDeleted = (
  recurringTaskId: string,
  title: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'deleted',
  entityType: 'recurring_task',
  entityId: recurringTaskId,
  teamId,
  userId,
  userEmail,
  details: { title }
})

export const logRecurringTaskActivated = (
  recurringTaskId: string,
  title: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'activated',
  entityType: 'recurring_task',
  entityId: recurringTaskId,
  teamId,
  userId,
  userEmail,
  details: { title }
})

export const logRecurringTaskDeactivated = (
  recurringTaskId: string,
  title: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'deactivated',
  entityType: 'recurring_task',
  entityId: recurringTaskId,
  teamId,
  userId,
  userEmail,
  details: { title }
})

// Contacts
export const logContactCreated = (
  contactId: string,
  name: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'created',
  entityType: 'contact',
  entityId: contactId,
  teamId,
  userId,
  userEmail,
  details: { name }
})

export const logContactUpdated = (
  contactId: string,
  name: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'updated',
  entityType: 'contact',
  entityId: contactId,
  teamId,
  userId,
  userEmail,
  details: { name }
})

export const logContactDeleted = (
  contactId: string,
  name: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'deleted',
  entityType: 'contact',
  entityId: contactId,
  teamId,
  userId,
  userEmail,
  details: { name }
})

// Contact Labels
export const logContactLabelCreated = (
  labelId: string,
  name: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'created',
  entityType: 'contact_label',
  entityId: labelId,
  teamId,
  userId,
  userEmail,
  details: { name }
})

export const logContactLabelDeleted = (
  labelId: string,
  name: string,
  teamId: string | null,
  userId: string,
  userEmail?: string
) => logActivity({
  action: 'deleted',
  entityType: 'contact_label',
  entityId: labelId,
  teamId,
  userId,
  userEmail,
  details: { name }
})
