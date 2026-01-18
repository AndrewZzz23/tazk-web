import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { UsersIcon, XIcon } from './components/iu/AnimatedIcons'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'

interface CreatedTeam {
  id: string
  name: string
  color: string | null
}

interface CreateTeamProps {
  currentUserId: string
  onTeamCreated: (team: CreatedTeam) => void
  onClose: () => void
}

function CreateTeam({ currentUserId, onTeamCreated, onClose }: CreateTeamProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const isMobile = useIsMobile()

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const { dragStyle, isDragging, containerProps } = useBottomSheetGesture({
    onClose: handleClose,
    threshold: 100
  })

  // ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      alert('El nombre es obligatorio')
      return
    }

    setLoading(true)

    // Crear equipo
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ name: name.trim(), created_by: currentUserId })
      .select()
      .single()

    if (teamError) {
      alert('Error al crear equipo: ' + teamError.message)
      setLoading(false)
      return
    }

    // Agregar al creador como owner
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: currentUserId,
        role: 'owner'
      })

    if (memberError) {
      alert('Error al agregar miembro: ' + memberError.message)
      setLoading(false)
      return
    }

    // Crear estados por defecto para el equipo
    const defaultStatuses = [
      { name: 'Pendiente', color: '#6b7280', category: 'not_started', order_position: 1 },
      { name: 'En progreso', color: '#3b82f6', category: 'in_progress', order_position: 2 },
      { name: 'En revisión', color: '#f59e0b', category: 'in_progress', order_position: 3 },
      { name: 'Completada', color: '#22c55e', category: 'completed', order_position: 4 },
    ]

    await supabase.from('task_statuses').insert(
      defaultStatuses.map(status => ({
        ...status,
        team_id: team.id,
        created_by: currentUserId,
        is_active: true
      }))
    )

    setLoading(false)
    onTeamCreated({ id: team.id, name: team.name, color: team.color })
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-200 ${
          isVisible ? 'bg-black/60' : 'bg-transparent opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Modal/Bottom Sheet */}
      <div
        className={`fixed z-50 bg-white dark:bg-neutral-800 shadow-2xl overflow-hidden flex flex-col will-change-transform ${
          isMobile
            ? `bottom-0 left-0 right-0 rounded-t-3xl safe-area-bottom ${
                isVisible ? 'translate-y-0' : 'translate-y-full'
              }`
            : `top-1/2 left-1/2 -translate-x-1/2 rounded-2xl w-full max-w-md mx-4 ${
                isVisible ? '-translate-y-1/2 opacity-100 scale-100' : '-translate-y-1/2 opacity-0 scale-95'
              }`
        }`}
        style={isMobile ? { ...dragStyle, transition: isDragging ? 'none' : 'transform 0.2s ease-out' } : undefined}
        onClick={(e) => e.stopPropagation()}
        {...(isMobile ? containerProps : {})}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-gray-200 dark:border-neutral-700 ${isMobile ? 'p-4' : 'p-6'}`}>
          {isMobile && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-neutral-600 rounded-full" />
          )}
          <h2 className={`font-bold text-gray-900 dark:text-white flex items-center gap-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
            <span className="text-yellow-400"><UsersIcon size={24} /></span> Crear Equipo
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <XIcon size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={`${isMobile ? 'p-4 pb-8' : 'p-6'}`}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">
              Nombre del equipo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Marketing, Desarrollo, Ventas..."
              className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
              autoFocus
              required
            />
          </div>

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
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-3 bg-yellow-400 text-neutral-900 rounded-lg font-bold hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Creando...' : <><UsersIcon size={18} /> Crear Equipo</>}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

export default CreateTeam