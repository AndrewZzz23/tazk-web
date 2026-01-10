import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { UserRole } from './types/database.types'
import { HexColorPicker } from 'react-colorful'
import Toast from './Toast'
import { XIcon, LoadingZapIcon } from './components/iu/AnimatedIcons'
import { Settings, AlertTriangle, Trash2, Users, Shield, Edit3, Check, X, Crown, User, ClipboardList, Palette } from 'lucide-react'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#6b7280'
]

interface TeamSettingsProps {
  teamId: string
  teamName: string
  teamColor: string | null
  currentUserId: string
  currentUserRole: UserRole
  onClose: () => void
  onTeamDeleted: () => void
  onTeamUpdated: (newName: string, newColor?: string) => void
}

function TeamSettings({
  teamId,
  teamName,
  teamColor,
  currentUserId: _currentUserId,
  currentUserRole,
  onClose,
  onTeamDeleted,
  onTeamUpdated
}: TeamSettingsProps) {
  // _currentUserId kept for potential future use
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [memberCount, setMemberCount] = useState(0)
  const [taskCount, setTaskCount] = useState(0)

  // Edit name
  const [isEditingName, setIsEditingName] = useState(false)
  const [newName, setNewName] = useState(teamName)
  const [savingName, setSavingName] = useState(false)

  // Color
  const [currentColor, setCurrentColor] = useState(teamColor || '#facc15')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [tempColor, setTempColor] = useState(teamColor || '#facc15')
  const [savingColor, setSavingColor] = useState(false)

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Toast
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({ show: false, message: '', type: 'info' })

  const isOwner = currentUserRole === 'owner'

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    loadStats()
  }, [])

  // ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showColorPicker) {
          setShowColorPicker(false)
          setTempColor(currentColor)
        } else if (showDeleteConfirm) {
          setShowDeleteConfirm(false)
          setDeleteConfirmText('')
        } else if (isEditingName) {
          setIsEditingName(false)
          setNewName(teamName)
        } else {
          handleClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showColorPicker, showDeleteConfirm, isEditingName, teamName, currentColor])

  const loadStats = async () => {
    setLoading(true)

    // Count members
    const { count: members } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)

    // Count tasks
    const { count: tasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)

    setMemberCount(members || 0)
    setTaskCount(tasks || 0)
    setLoading(false)
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
  }

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim() === teamName) {
      setIsEditingName(false)
      setNewName(teamName)
      return
    }

    setSavingName(true)

    const { error } = await supabase
      .from('teams')
      .update({ name: newName.trim() })
      .eq('id', teamId)

    if (error) {
      showToast('Error al actualizar nombre', 'error')
      setNewName(teamName)
    } else {
      showToast('Nombre actualizado', 'success')
      onTeamUpdated(newName.trim())
    }

    setSavingName(false)
    setIsEditingName(false)
  }

  const handleSaveColor = async (color: string) => {
    setSavingColor(true)

    const { error } = await supabase
      .from('teams')
      .update({ color })
      .eq('id', teamId)

    if (error) {
      showToast('Error al actualizar color', 'error')
    } else {
      setCurrentColor(color)
      showToast('Color actualizado', 'success')
      onTeamUpdated(teamName, color)
    }

    setSavingColor(false)
    setShowColorPicker(false)
  }

  const handleDeleteTeam = async () => {
    if (deleteConfirmText !== teamName) {
      showToast('El nombre no coincide', 'error')
      return
    }

    setDeleting(true)

    try {
      // Use RPC function to delete team (bypasses RLS recursion issues)
      const { error } = await supabase.rpc('delete_team', { p_team_id: teamId })

      if (error) throw error

      // Remove from localStorage if selected
      const savedTeamId = localStorage.getItem('tazk_selected_team')
      if (savedTeamId === teamId) {
        localStorage.removeItem('tazk_selected_team')
      }

      showToast('Equipo eliminado', 'success')

      setTimeout(() => {
        onTeamDeleted()
      }, 500)

    } catch (error: any) {
      console.error('Error deleting team:', error)
      showToast('Error al eliminar equipo: ' + error.message, 'error')
      setDeleting(false)
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
          isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
        }`}
        onClick={handleClose}
      >
        <div
          className={`bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden transform transition-all duration-200 ${
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-yellow-500" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configuración</h2>
                <p className="text-sm text-gray-500 dark:text-neutral-400">{teamName}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl transition-all"
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingZapIcon size={48} />
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-blue-500" />
                      <span className="text-xs font-medium text-gray-500 dark:text-neutral-400">Miembros</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{memberCount}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardList className="w-5 h-5 text-yellow-500" />
                      <span className="text-xs font-medium text-gray-500 dark:text-neutral-400">Tareas</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{taskCount}</p>
                  </div>
                </div>

                {/* Team Name */}
                <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">
                      Nombre del equipo
                    </label>
                    {isOwner && !isEditingName && (
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-xs text-yellow-500 hover:text-yellow-400 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        Editar
                      </button>
                    )}
                  </div>

                  {isEditingName ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                        placeholder="Nombre del equipo"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={savingName}
                        className="px-3 py-2 bg-yellow-400 text-neutral-900 rounded-lg hover:bg-yellow-300 transition-colors"
                      >
                        {savingName ? '...' : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingName(false)
                          setNewName(teamName)
                        }}
                        className="px-3 py-2 bg-gray-200 dark:bg-neutral-600 text-gray-600 dark:text-neutral-300 rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-900 dark:text-white font-medium">{teamName}</p>
                  )}
                </div>

                {/* Team Color */}
                <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">
                      Color del equipo
                    </label>
                    {isOwner && (
                      <button
                        onClick={() => {
                          setTempColor(currentColor)
                          setShowColorPicker(true)
                        }}
                        className="text-xs text-yellow-500 hover:text-yellow-400 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        Editar
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <div
                      className="w-10 h-10 rounded-xl shadow-lg"
                      style={{
                        backgroundColor: currentColor,
                        boxShadow: `0 4px 14px -3px ${currentColor}50`
                      }}
                    />
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium font-mono text-sm">{currentColor}</p>
                      {!isOwner && (
                        <p className="text-xs text-gray-400 dark:text-neutral-500">
                          Solo el propietario puede cambiar el color
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Your Role */}
                <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-neutral-300 block mb-2">
                    Tu rol
                  </label>
                  <div className="flex items-center gap-3">
                    {currentUserRole === 'owner' ? (
                      <Crown className="w-6 h-6 text-yellow-500" />
                    ) : currentUserRole === 'admin' ? (
                      <Shield className="w-6 h-6 text-blue-500" />
                    ) : (
                      <User className="w-6 h-6 text-gray-500" />
                    )}
                    <div>
                      <span className="text-gray-900 dark:text-white font-medium block">
                        {currentUserRole === 'owner' ? 'Propietario' : currentUserRole === 'admin' ? 'Administrador' : 'Miembro'}
                      </span>
                      <span className="text-gray-500 dark:text-neutral-400 text-xs">
                        {currentUserRole === 'owner'
                          ? 'Control total del equipo'
                          : currentUserRole === 'admin'
                            ? 'Puede gestionar miembros y tareas'
                            : 'Puede ver y editar tareas asignadas'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Danger Zone - Only for owners */}
                {isOwner && (
                  <div className="border-2 border-red-200 dark:border-red-500/30 rounded-xl overflow-hidden">
                    <div className="bg-red-50 dark:bg-red-500/10 px-4 py-3 border-b border-red-200 dark:border-red-500/30">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-semibold text-red-700 dark:text-red-400">Zona de peligro</span>
                      </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-neutral-900">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="text-gray-900 dark:text-white font-medium mb-1">Eliminar este equipo</h4>
                          <p className="text-gray-500 dark:text-neutral-400 text-sm">
                            Una vez eliminado, se borrarán todas las tareas, miembros y configuraciones. Esta acción no se puede deshacer.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-4 py-2 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-lg font-medium hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors flex-shrink-0"
                        >
                          Eliminar equipo
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setShowDeleteConfirm(false)
            setDeleteConfirmText('')
          }}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                ¿Eliminar "{teamName}"?
              </h3>

              <p className="text-gray-500 dark:text-neutral-400 text-center text-sm mb-6">
                Esta acción eliminará permanentemente el equipo, incluyendo:
              </p>

              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-gray-600 dark:text-neutral-300 text-sm">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                  {taskCount} tarea{taskCount !== 1 ? 's' : ''}
                </li>
                <li className="flex items-center gap-2 text-gray-600 dark:text-neutral-300 text-sm">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                  {memberCount} miembro{memberCount !== 1 ? 's' : ''}
                </li>
                <li className="flex items-center gap-2 text-gray-600 dark:text-neutral-300 text-sm">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                  Todas las configuraciones y plantillas
                </li>
              </ul>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                  Escribe <span className="font-bold text-red-500">"{teamName}"</span> para confirmar:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400"
                  placeholder={teamName}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-neutral-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteTeam}
                disabled={deleteConfirmText !== teamName || deleting}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <LoadingZapIcon size={20} />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar equipo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Color Picker Modal */}
      {showColorPicker && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowColorPicker(false)
            setTempColor(currentColor)
          }}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-2xl w-full max-w-xs mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium text-gray-700 dark:text-neutral-300 mb-3">Seleccionar color</h3>

            {/* Preset colors */}
            <div className="flex flex-wrap gap-2 mb-4">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setTempColor(color)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    tempColor === color
                      ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-neutral-800 ring-yellow-400 scale-110'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Custom color picker */}
            <HexColorPicker color={tempColor} onChange={setTempColor} className="!w-full" />

            <div className="flex gap-2 mt-4">
              <input
                type="text"
                value={tempColor}
                onChange={(e) => setTempColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg text-center font-mono text-sm text-gray-900 dark:text-white"
              />
              <button
                onClick={() => handleSaveColor(tempColor)}
                disabled={savingColor}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                style={{ backgroundColor: tempColor, color: '#171717' }}
              >
                {savingColor ? '...' : 'Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </>
  )
}

export default TeamSettings
