import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

interface CreateTeamProps {
  currentUserId: string
  onTeamCreated: () => void
  onClose: () => void
}

function CreateTeam({ currentUserId, onTeamCreated, onClose }: CreateTeamProps) {
  const [name, setName] = useState('')
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
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

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

    setLoading(false)

    if (memberError) {
      alert('Error al agregar miembro: ' + memberError.message)
    } else {
      onTeamCreated()
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-yellow-400">👥</span> Crear Equipo
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
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
              {loading ? 'Creando...' : '👥 Crear Equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTeam