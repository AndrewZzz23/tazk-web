// src/types/database.types.ts
// Tipos generados basados en tu esquema de Supabase

export type UserRole = 'owner' | 'admin' | 'member'
export type ProfileRole = 'admin' | 'basic'
export type EntityType = 'task' | 'team' | 'team_member'
export type ActionType = 'created' | 'updated' | 'deleted' | 'assigned' | 'unassigned' | 'reassigned' | 'status_changed' | 'role_changed' | 'member_added' | 'member_removed'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: ProfileRole
  created_at: string
}

export interface Team {
  id: string
  name: string
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

export interface Task {
  id: string
  title: string
  description: string | null
  status_id: string
  team_id: string | null
  start_date: string | null
  due_date: string | null
  created_by: string
  assigned_to: string | null
  created_at: string
  updated_at: string
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