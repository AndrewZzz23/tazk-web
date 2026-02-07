// src/types/database.types.ts
// Tipos generados basados en tu esquema de Supabase

export type UserRole = 'owner' | 'admin' | 'member'
export type ProfileRole = 'admin' | 'basic'
export type EntityType = 'task' | 'team' | 'team_member' | 'recurring_task'
export type ActionType = 'created' | 'updated' | 'deleted' | 'assigned' | 'unassigned' | 'reassigned' | 'status_changed' | 'role_changed' | 'member_added' | 'member_removed' | 'activated' | 'deactivated'
export type StatusCategory = 'not_started' | 'in_progress' | 'completed'
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired'
export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  country: string | null
  city: string | null
  theme: 'light' | 'dark'
  notifications_enabled: boolean
  notify_on_assign: boolean
  notify_on_due: boolean
  role: ProfileRole
  created_at: string
  updated_at: string | null
}

export interface Team {
  id: string
  name: string
  color: string | null
  created_by: string
  created_at: string
}

export interface TeamMember {
  id: string
  user_id: string
  team_id: string
  role: UserRole
  joined_at: string
}

export interface TaskStatus {
  id: string
  name: string
  color: string
  order_position: number
  is_active: boolean
  team_id: string | null
  created_by: string | null
}

export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description: string | null
  status_id: string
  team_id: string | null
  created_by: string
  assigned_to: string | null
  priority: TaskPriority | null
  start_date: string | null
  due_date: string | null
  notify_email: string | null
  created_at: string
  updated_at: string
  // Relaciones (opcionales, vienen del JOIN)
  task_statuses?: TaskStatus
  assigned_user?: Profile | null
  created_by_user?: Profile | null
}

export interface ActivityLog {
  id: string
  user_id: string
  user_email: string
  team_id: string | null
  entity_type: EntityType
  entity_id: string
  action: ActionType
  changes: Record<string, unknown>
  description: string
  created_at: string
}

// Tipos extendidos con relaciones
export interface TaskWithStatus extends Task {
  status: TaskStatus
}

export interface TaskWithDetails extends Task {
  status: TaskStatus
  assigned_user: Profile | null
  created_user: Profile
}

export interface TeamMemberWithProfile extends TeamMember {
  profile: Profile
}

// Tipo para el contexto de la aplicación
export interface AppContext {
  currentTeamId: string | null
  userRole: UserRole | null
}

export interface TaskStatus {
  id: string
  name: string
  color: string
  order_position: number
  team_id: string | null
  created_by: string | null
  is_active: boolean
  category: StatusCategory
}
export interface TeamInvitation {
  id: string
  team_id: string
  email: string
  role: 'admin' | 'member'
  invited_by: string
  status: InvitationStatus
  token: string
  created_at: string
  expires_at: string
  responded_at: string | null
  // Relaciones
  teams?: Team
  inviter?: Profile
}

export interface TaskAttachment {
  id: string
  task_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  uploaded_by: string
  created_at: string
}

export interface EmailSettings {
  id: string
  user_id: string | null
  team_id: string | null
  is_enabled: boolean
  from_name: string
  notify_on_create: boolean
  notify_on_assign: boolean
  notify_on_due: boolean
  notify_on_complete: boolean
  created_at: string
  updated_at: string
}

export interface EmailTemplate {
  id: string
  user_id: string | null
  team_id: string | null
  type: 'task_created' | 'task_assigned' | 'task_due' | 'task_completed'
  name: string
  subject: string
  body_html: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EmailLog {
  id: string
  user_id: string | null
  team_id: string | null
  task_id: string | null
  template_id: string | null
  template_type: string | null
  to_email: string
  subject: string | null
  status: 'pending' | 'sent' | 'failed'
  error_message: string | null
  external_id: string | null
  sent_at: string | null
  created_at: string
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly'
export type RecurringPriority = 'low' | 'medium' | 'high'

export interface RecurringTask {
  id: string
  user_id: string
  team_id: string | null
  title: string
  description: string | null
  priority: RecurringPriority
  frequency: RecurringFrequency
  time_of_day: string // "HH:MM" format
  days_of_week: number[] | null // 0-6 (Sunday-Saturday) for weekly
  day_of_month: number | null // 1-31 for monthly
  default_status_id: string | null
  assigned_to: string | null
  is_active: boolean
  last_created_at: string | null
  next_scheduled_at: string | null
  created_at: string
  updated_at: string
  // Relations
  assigned_user?: Profile | null
  default_status?: TaskStatus | null
}