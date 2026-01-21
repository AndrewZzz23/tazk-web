import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { User } from '@supabase/supabase-js'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import {
  XIcon,
  LoadingZapIcon,
  TrashIcon
} from './components/iu/AnimatedIcons'
import {
  AlertTriangle,
  ShieldX,
  Users,
  FileText,
  Clock,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Skull,
  HeartCrack,
  Flame
} from 'lucide-react'

interface DeleteAccountModalProps {
  user: User
  onClose: () => void
  onDeleted: () => void
}

type Step = 'warning' | 'consequences' | 'confirmation' | 'deleting' | 'farewell'

interface AccountStats {
  totalTasks: number
  teamsOwned: number
  teamsMember: number
}

function DeleteAccountModal({ user, onClose, onDeleted }: DeleteAccountModalProps) {
  const isMobile = useIsMobile()
  const [isVisible, setIsVisible] = useState(false)
  const [step, setStep] = useState<Step>('warning')
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<AccountStats>({ totalTasks: 0, teamsOwned: 0, teamsMember: 0 })
  const [countdown, setCountdown] = useState(5)
  const [canProceed, setCanProceed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const CONFIRM_PHRASE = 'ELIMINAR MI CUENTA'

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    loadAccountStats()
  }, [])

  // Countdown en el paso de consecuencias
  useEffect(() => {
    if (step === 'consequences' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (step === 'consequences' && countdown === 0) {
      setCanProceed(true)
    }
  }, [step, countdown])

  // Focus en input cuando llega al paso de confirmación
  useEffect(() => {
    if (step === 'confirmation' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [step])

  // ESC para cerrar (solo si no está en proceso de eliminación)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'deleting') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step])

  const loadAccountStats = async () => {
    // Cargar estadísticas de la cuenta
    // Nota: la tabla teams usa 'created_by' como el dueño del equipo
    const [tasksResult, teamsOwnedResult] = await Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
      supabase.from('teams').select('id', { count: 'exact', head: true }).eq('created_by', user.id)
    ])

    // Obtener los IDs de equipos donde soy dueño (created_by) para excluirlos de membresías
    const { data: ownedTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('created_by', user.id)

    const ownedTeamIds = ownedTeams?.map(t => t.id) || []

    // Contar membresías excluyendo los equipos donde soy dueño
    // Obtenemos todas las membresías y filtramos manualmente
    const { data: allMemberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)

    const teamsMemberCount = allMemberships
      ? allMemberships.filter(m => !ownedTeamIds.includes(m.team_id)).length
      : 0

    setStats({
      totalTasks: tasksResult.count || 0,
      teamsOwned: teamsOwnedResult.count || 0,
      teamsMember: teamsMemberCount
    })
  }

  const handleClose = () => {
    if (step === 'deleting') return // No cerrar durante eliminación
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const handleDeleteAccount = async () => {
    if (confirmText !== CONFIRM_PHRASE) {
      setError('La frase no coincide. Escribe exactamente: ' + CONFIRM_PHRASE)
      return
    }

    setStep('deleting')
    setLoading(true)
    setError(null)

    try {
      // Pausa visual para mostrar el proceso
      await new Promise(resolve => setTimeout(resolve, 1000))

      // ============================================
      // ELIMINACIÓN COMPLETA DE DATOS DEL USUARIO
      // Orden basado en las foreign keys de las tablas
      // ============================================

      console.log('🗑️ Iniciando eliminación de cuenta para usuario:', user.id)

      // 1. Obtener IDs de tareas personales (para eliminar attachments primero)
      const { data: personalTasks, error: personalTasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('created_by', user.id)
        .is('team_id', null)

      if (personalTasksError) console.error('Error obteniendo tareas personales:', personalTasksError)
      console.log('📋 Tareas personales encontradas:', personalTasks?.length || 0)

      // 2. Eliminar attachments de tareas personales
      if (personalTasks && personalTasks.length > 0) {
        const taskIds = personalTasks.map(t => t.id)
        const { error } = await supabase.from('task_attachments').delete().in('task_id', taskIds)
        if (error) console.error('Error eliminando attachments personales:', error)
      }

      // 3. Eliminar tareas personales (sin team_id)
      const { error: deletePersonalTasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('created_by', user.id)
        .is('team_id', null)
      if (deletePersonalTasksError) console.error('Error eliminando tareas personales:', deletePersonalTasksError)

      // 4. Eliminar estados personales (sin team_id)
      console.log('🏷️ Eliminando estados personales...')
      const { data: deletedStatuses, error: deletePersonalStatusesError } = await supabase
        .from('task_statuses')
        .delete()
        .eq('created_by', user.id)
        .is('team_id', null)
        .select()

      if (deletePersonalStatusesError) {
        console.error('Error eliminando estados personales:', deletePersonalStatusesError)
      } else {
        console.log('✅ Estados personales eliminados:', deletedStatuses?.length || 0)
      }

      // 5. Obtener equipos donde el usuario es dueño (created_by)
      const { data: ownedTeams, error: ownedTeamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('created_by', user.id)

      if (ownedTeamsError) console.error('Error obteniendo equipos propios:', ownedTeamsError)
      console.log('👥 Equipos propios encontrados:', ownedTeams?.length || 0)

      // 6. Para cada equipo propio, usar la función delete_team que ya existe
      // Esta función maneja correctamente el orden de eliminación y los triggers
      if (ownedTeams && ownedTeams.length > 0) {
        for (const team of ownedTeams) {
          console.log('🗑️ Eliminando equipo con RPC:', team.id)

          // Usar la función RPC delete_team que ya existe en la base de datos
          const { error: deleteTeamError } = await supabase.rpc('delete_team', {
            p_team_id: team.id
          })

          if (deleteTeamError) {
            console.error('Error eliminando equipo con RPC:', deleteTeamError)
            // Fallback: intentar eliminar manualmente
            console.log('Intentando fallback manual...')

            // Obtener tareas del equipo para eliminar attachments
            const { data: teamTasks } = await supabase
              .from('tasks')
              .select('id')
              .eq('team_id', team.id)

            if (teamTasks && teamTasks.length > 0) {
              const teamTaskIds = teamTasks.map(t => t.id)
              await supabase.from('task_attachments').delete().in('task_id', teamTaskIds)
            }

            // Eliminar en orden
            await supabase.from('email_logs').delete().eq('team_id', team.id)
            await supabase.from('tasks').delete().eq('team_id', team.id)
            await supabase.from('teams').delete().eq('id', team.id)
          } else {
            console.log('✅ Equipo eliminado:', team.id)
          }
        }
      }

      // 7. Eliminar membresías del usuario en otros equipos usando RPC (bypass RLS)
      console.log('🚪 Eliminando membresías del usuario...')
      const { error: membershipError } = await supabase.rpc('delete_user_memberships', {
        p_user_id: user.id
      })
      if (membershipError) {
        console.error('Error eliminando membresías:', membershipError)
      } else {
        console.log('✅ Membresías eliminadas')
      }

      // 8. Eliminar invitaciones pendientes enviadas por el usuario
      const { error: sentInvitationsError } = await supabase.from('team_invitations').delete().eq('invited_by', user.id)
      if (sentInvitationsError) console.error('Error eliminando invitaciones enviadas:', sentInvitationsError)

      // 9. Eliminar invitaciones pendientes al email del usuario
      if (user.email) {
        const { error: receivedInvitationsError } = await supabase.from('team_invitations').delete().eq('email', user.email)
        if (receivedInvitationsError) console.error('Error eliminando invitaciones recibidas:', receivedInvitationsError)
      }

      // 10. Eliminar activity_logs del usuario
      const { error: activityLogsError } = await supabase.from('activity_logs').delete().eq('user_id', user.id)
      if (activityLogsError) console.error('Error eliminando activity_logs:', activityLogsError)

      // 11. Eliminar email_logs del usuario
      const { error: emailLogsError } = await supabase.from('email_logs').delete().eq('user_id', user.id)
      if (emailLogsError) console.error('Error eliminando email_logs:', emailLogsError)

      // 12. Eliminar email_settings del usuario
      const { error: emailSettingsError } = await supabase.from('email_settings').delete().eq('user_id', user.id)
      if (emailSettingsError) console.error('Error eliminando email_settings:', emailSettingsError)

      // 13. Eliminar email_templates del usuario
      const { error: emailTemplatesError } = await supabase.from('email_templates').delete().eq('user_id', user.id)
      if (emailTemplatesError) console.error('Error eliminando email_templates:', emailTemplatesError)

      // 14. Eliminar suscripciones push
      const { error: pushError } = await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
      if (pushError) console.error('Error eliminando push_subscriptions:', pushError)

      // 15. Eliminar perfil del usuario
      console.log('👤 Eliminando perfil...')
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', user.id)
      if (profileError) console.error('Error eliminando perfil:', profileError)

      // 16. Eliminar usuario de auth.users usando función RPC
      console.log('🔐 Eliminando usuario de autenticación...')
      const { error: authDeleteError } = await supabase.rpc('delete_user_account')
      if (authDeleteError) {
        console.error('Error eliminando usuario de auth:', authDeleteError)
        // Si falla, intentamos cerrar sesión de todos modos
      } else {
        console.log('✅ Usuario eliminado de auth.users')
      }

      console.log('✅ Eliminación de cuenta completada')

      // Mostrar pantalla de despedida
      setStep('farewell')

      // Esperar y cerrar sesión
      setTimeout(async () => {
        await supabase.auth.signOut()
        onDeleted()
      }, 3000)

    } catch (err) {
      console.error('Error eliminando cuenta:', err)
      setError('Ocurrió un error al eliminar la cuenta. Por favor intenta de nuevo.')
      setStep('confirmation')
      setLoading(false)
    }
  }

  // Swipe to close gesture
  const { dragStyle, isDragging, containerProps } = useBottomSheetGesture({
    onClose: handleClose,
    disabled: step === 'deleting'
  })

  // Bloquear scroll del body
  useBodyScrollLock(isMobile && isVisible)

  const consequences = [
    {
      icon: <FileText className="w-5 h-5" />,
      title: 'Tareas personales',
      description: `${stats.totalTasks} tareas serán eliminadas permanentemente`,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20'
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: 'Equipos propios',
      description: stats.teamsOwned > 0
        ? `${stats.teamsOwned} equipo(s) y todos sus datos serán eliminados`
        : 'No tienes equipos propios',
      color: stats.teamsOwned > 0 ? 'text-red-400' : 'text-neutral-400',
      bg: stats.teamsOwned > 0 ? 'bg-red-500/20' : 'bg-neutral-500/20'
    },
    {
      icon: <ShieldX className="w-5 h-5" />,
      title: 'Membresías',
      description: stats.teamsMember > 0
        ? `Serás removido de ${stats.teamsMember} equipo(s)`
        : 'No eres miembro de ningún equipo',
      color: stats.teamsMember > 0 ? 'text-amber-400' : 'text-neutral-400',
      bg: stats.teamsMember > 0 ? 'bg-amber-500/20' : 'bg-neutral-500/20'
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: 'Historial y actividad',
      description: 'Todo tu historial de actividad será borrado',
      color: 'text-purple-400',
      bg: 'bg-purple-500/20'
    }
  ]

  const renderStep = () => {
    switch (step) {
      case 'warning':
        return (
          <div className="text-center">
            {/* Animated warning icon */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
              <div className="absolute inset-0 bg-red-500/30 rounded-full animate-pulse" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                <AlertTriangle className="w-12 h-12 text-white" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              ¿Eliminar tu cuenta?
            </h3>

            <p className="text-gray-600 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
              Esta acción es <span className="text-red-500 font-semibold">permanente e irreversible</span>.
              Todos tus datos serán eliminados para siempre.
            </p>

            {/* Stats preview */}
            <div className="bg-gray-100 dark:bg-neutral-800/50 rounded-2xl p-4 mb-6 text-left">
              <p className="text-sm text-gray-500 dark:text-neutral-400 mb-3">Tu cuenta incluye:</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTasks}</div>
                  <div className="text-xs text-gray-500 dark:text-neutral-500">Tareas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.teamsOwned}</div>
                  <div className="text-xs text-gray-500 dark:text-neutral-500">Equipos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.teamsMember}</div>
                  <div className="text-xs text-gray-500 dark:text-neutral-500">Membresías</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep('consequences')}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                Continuar
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )

      case 'consequences':
        return (
          <div>
            {/* Header con icono animado */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 transform rotate-3">
                <Flame className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Esto es lo que perderás
              </h3>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                Lee cuidadosamente antes de continuar
              </p>
            </div>

            {/* Lista de consecuencias */}
            <div className="space-y-3 mb-6">
              {consequences.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-100 dark:bg-neutral-800/50 rounded-xl border border-gray-200 dark:border-neutral-700/50"
                  style={{
                    animation: `slideIn 0.3s ease-out ${index * 0.1}s both`
                  }}
                >
                  <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                    <span className={item.color}>{item.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">{item.description}</p>
                  </div>
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                </div>
              ))}
            </div>

            {/* Warning box */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Skull className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium text-sm">Sin posibilidad de recuperación</p>
                  <p className="text-red-400/70 text-xs mt-1">
                    No podemos restaurar tu cuenta ni tus datos después de la eliminación.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('warning')}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={() => setStep('confirmation')}
                disabled={!canProceed}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  canProceed
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-200 dark:bg-neutral-700 text-gray-400 dark:text-neutral-500 cursor-not-allowed'
                }`}
              >
                {canProceed ? (
                  <>
                    Entiendo, continuar
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Espera {countdown}s
                    <Clock className="w-4 h-4 animate-pulse" />
                  </>
                )}
              </button>
            </div>
          </div>
        )

      case 'confirmation':
        return (
          <div>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
                <HeartCrack className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Confirmación final
              </h3>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                Escribe la frase para confirmar
              </p>
            </div>

            {/* Phrase to type */}
            <div className="bg-gray-100 dark:bg-neutral-800/50 rounded-xl p-4 mb-4 text-center">
              <p className="text-xs text-gray-500 dark:text-neutral-400 mb-2">Escribe exactamente:</p>
              <p className="text-lg font-mono font-bold text-red-500 tracking-wide">
                {CONFIRM_PHRASE}
              </p>
            </div>

            {/* Input */}
            <div className="mb-4">
              <input
                ref={inputRef}
                type="text"
                value={confirmText}
                onChange={(e) => {
                  setConfirmText(e.target.value.toUpperCase())
                  setError(null)
                }}
                placeholder="Escribe aquí..."
                className={`w-full px-4 py-3 bg-white dark:bg-neutral-900 border-2 rounded-xl text-gray-900 dark:text-white text-center font-mono tracking-wider placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none transition-colors ${
                  error
                    ? 'border-red-500 focus:border-red-500'
                    : confirmText === CONFIRM_PHRASE
                      ? 'border-green-500 focus:border-green-500'
                      : 'border-gray-200 dark:border-neutral-700 focus:border-red-400'
                }`}
              />
              {error && (
                <p className="text-red-500 text-xs mt-2 text-center">{error}</p>
              )}
              {confirmText === CONFIRM_PHRASE && (
                <div className="flex items-center justify-center gap-2 mt-2 text-green-500">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs">Frase correcta</span>
                </div>
              )}
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((confirmText.length / CONFIRM_PHRASE.length) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 dark:text-neutral-500">
                {confirmText.length}/{CONFIRM_PHRASE.length}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfirmText('')
                  setError(null)
                  setStep('consequences')
                }}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={confirmText !== CONFIRM_PHRASE || loading}
                className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  confirmText === CONFIRM_PHRASE
                    ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30'
                    : 'bg-gray-200 dark:bg-neutral-700 text-gray-400 dark:text-neutral-500 cursor-not-allowed'
                }`}
              >
                <TrashIcon size={18} />
                Eliminar cuenta
              </button>
            </div>
          </div>
        )

      case 'deleting':
        return (
          <div className="text-center py-8">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-red-500/30 rounded-full" />
              <div className="absolute inset-0 border-4 border-red-500 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-3 bg-red-500/10 rounded-full flex items-center justify-center">
                <LoadingZapIcon size={32} />
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Eliminando tu cuenta...
            </h3>
            <p className="text-gray-500 dark:text-neutral-400 text-sm">
              Por favor no cierres esta ventana
            </p>

            {/* Progress steps */}
            <div className="mt-8 space-y-3 text-left max-w-xs mx-auto">
              {[
                'Eliminando tareas personales...',
                'Removiendo datos de equipos...',
                'Limpiando historial...',
                'Finalizando...'
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  </div>
                  <span className="text-gray-600 dark:text-neutral-400">{text}</span>
                </div>
              ))}
            </div>
          </div>
        )

      case 'farewell':
        return (
          <div className="text-center py-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Hasta pronto
            </h3>
            <p className="text-gray-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
              Tu cuenta ha sido eliminada. Gracias por usar Tazk.
              Esperamos verte de nuevo algún día.
            </p>

            <div className="bg-gray-100 dark:bg-neutral-800/50 rounded-xl p-4">
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                Cerrando sesión automáticamente...
              </p>
            </div>
          </div>
        )
    }
  }

  // Estilos de animación
  const animationStyles = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `

  return (
    <>
      <style>{animationStyles}</style>
      <div
        className={`fixed inset-0 z-[70] flex items-center justify-center transition-all duration-200 ${
          isVisible ? 'bg-black/70 backdrop-blur-sm' : 'bg-transparent'
        }`}
        onClick={step !== 'deleting' ? handleClose : undefined}
      >
        <div
          className={`bg-white dark:bg-neutral-900 shadow-2xl w-full overflow-hidden ${
            isMobile
              ? 'rounded-t-3xl max-h-[90vh] fixed bottom-0 left-0 right-0'
              : 'rounded-2xl max-w-md mx-4 transform transition-all duration-300'
          } ${
            isVisible
              ? 'scale-100 opacity-100 translate-y-0'
              : isMobile
                ? 'translate-y-full'
                : 'scale-95 opacity-0 translate-y-4'
          }`}
          style={isMobile ? {
            ...dragStyle,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          } : undefined}
          onClick={(e) => e.stopPropagation()}
          {...(isMobile && step !== 'deleting' ? containerProps : {})}
        >
          {/* Handle (mobile only) */}
          {isMobile && step !== 'deleting' && (
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 dark:bg-neutral-700 rounded-full" />
            </div>
          )}

          {/* Close button (only if not deleting) */}
          {step !== 'deleting' && step !== 'farewell' && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors z-10"
            >
              <XIcon size={20} />
            </button>
          )}

          {/* Content */}
          <div className={`${isMobile ? 'p-5 pb-8' : 'p-6'}`}>
            {renderStep()}
          </div>
        </div>
      </div>
    </>
  )
}

export default DeleteAccountModal
