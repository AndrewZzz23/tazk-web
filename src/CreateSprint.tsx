import { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { supabase } from './supabaseClient'
import { Sprint } from './types/database.types'
import { LoadingZapIcon, XIcon } from './components/iu/AnimatedIcons'
import { useIsMobile } from './hooks/useIsMobile'
import { useBottomSheetGesture } from './hooks/useBottomSheetGesture'
import { useBodyScrollLock } from './hooks/useBodyScrollLock'
import { Timer, Target, Calendar, FileText } from 'lucide-react'
import { logSprintCreated, logSprintUpdated } from './lib/activityLogger'

interface CreateSprintProps {
  currentUserId: string
  teamId: string | null
  userEmail?: string
  editingSprint: Sprint | null
  onClose: () => void
  onSaved: (sprint: Sprint) => void
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}

function CreateSprint({ currentUserId, teamId, userEmail, editingSprint, onClose, onSaved, showToast }: CreateSprintProps) {
  const isMobile = useIsMobile()
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState(editingSprint?.name || '')
  const [goal, setGoal] = useState(editingSprint?.goal || '')
  const [startDate, setStartDate] = useState<Date | null>(
    editingSprint?.start_date ? new Date(editingSprint.start_date) : null
  )
  const [endDate, setEndDate] = useState<Date | null>(
    editingSprint?.end_date ? new Date(editingSprint.end_date) : null
  )

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  const { dragStyle, isDragging, containerProps } = useBottomSheetGesture({ onClose: handleClose })
  useBodyScrollLock(isMobile && isVisible)

  const handleSave = async () => {
    if (!name.trim()) {
      showToast?.('El nombre del sprint es obligatorio', 'error')
      return
    }
    if (startDate && endDate && endDate <= startDate) {
      showToast?.('La fecha de fin debe ser posterior a la de inicio', 'error')
      return
    }

    setLoading(true)
    const payload = {
      name: name.trim(),
      goal: goal.trim() || null,
      team_id: teamId,
      created_by: currentUserId,
      start_date: startDate?.toISOString() || null,
      end_date: endDate?.toISOString() || null,
      updated_at: new Date().toISOString(),
    }

    if (editingSprint) {
      const { data, error } = await supabase
        .from('sprints')
        .update(payload)
        .eq('id', editingSprint.id)
        .select()
        .single()

      setLoading(false)
      if (error) {
        showToast?.('Error al actualizar sprint', 'error')
      } else {
        logSprintUpdated(data.id, data.name, teamId, currentUserId, userEmail)
        showToast?.('Sprint actualizado', 'success')
        onSaved(data as Sprint)
        handleClose()
      }
    } else {
      const { data, error } = await supabase
        .from('sprints')
        .insert({ ...payload, status: 'planning' })
        .select()
        .single()

      setLoading(false)
      if (error) {
        showToast?.('Error al crear sprint', 'error')
      } else {
        logSprintCreated(data.id, data.name, teamId, currentUserId, userEmail)
        showToast?.('Sprint creado', 'success')
        onSaved(data as Sprint)
        handleClose()
      }
    }
  }

  const datePickerStyles = `
    .dark .react-datepicker { background-color: #262626; border: 1px solid #404040; border-radius: 12px; font-family: inherit; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
    .dark .react-datepicker__header { background-color: #1f1f1f; border-bottom: 1px solid #404040; border-radius: 12px 12px 0 0; padding-top: 12px; }
    .dark .react-datepicker__current-month, .dark .react-datepicker__day-name { color: #fff; }
    .dark .react-datepicker__day { color: #e5e5e5; border-radius: 8px; }
    .dark .react-datepicker__day:hover { background-color: #404040; border-radius: 8px; }
    .dark .react-datepicker__day--selected { background-color: #facc15 !important; color: #171717 !important; font-weight: 600; }
    .dark .react-datepicker__day--today { background-color: #404040; font-weight: 600; }
    .dark .react-datepicker__day--outside-month { color: #525252; }
    .dark .react-datepicker__navigation-icon::before { border-color: #a3a3a3; }
    .react-datepicker-popper { z-index: 9999 !important; }
  `

  const formContent = (
    <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-4 pt-2 pb-8' : 'p-6'}`}>
      {/* Nombre */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          <Timer className="w-4 h-4" />
          Nombre del sprint *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Sprint 1 — Autenticación"
          maxLength={80}
          className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-base"
          autoFocus
        />
      </div>

      {/* Objetivo */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
          <Target className="w-4 h-4" />
          Objetivo
          <span className="text-xs text-neutral-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="¿Qué querés lograr en este sprint?"
          rows={3}
          maxLength={300}
          className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all resize-none text-sm"
        />
      </div>

      {/* Fechas */}
      <div className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
            <Calendar className="w-4 h-4" />
            Fecha inicio
          </label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            dateFormat="dd/MM/yyyy"
            placeholderText="Seleccionar"
            className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-base"
            isClearable
            popperPlacement="top-start"
            portalId="root"
            onFocus={(e) => isMobile && e.target.blur()}
          />
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
            <FileText className="w-4 h-4" />
            Fecha fin
          </label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            dateFormat="dd/MM/yyyy"
            placeholderText="Seleccionar"
            minDate={startDate || undefined}
            className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-base"
            isClearable
            popperPlacement="top-start"
            portalId="root"
            onFocus={(e) => isMobile && e.target.blur()}
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <button
          type="button"
          onClick={handleClose}
          className="flex-1 px-4 py-3 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-medium hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-all"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="flex-1 px-4 py-3 bg-yellow-400 text-neutral-900 rounded-xl font-bold hover:bg-yellow-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20"
        >
          {loading ? <LoadingZapIcon size={20} /> : (editingSprint ? 'Guardar' : 'Crear sprint')}
        </button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <>
        <style>{datePickerStyles}</style>
        <div className={`fixed inset-0 z-50 transition-all duration-200 ${isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'}`} onClick={handleClose} />
        <div
          className={`fixed inset-x-0 bottom-0 top-16 z-50 bg-white dark:bg-neutral-900 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col safe-area-bottom ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ ...dragStyle, transition: isDragging ? 'none' : 'transform 0.3s ease-out' }}
          onClick={(e) => e.stopPropagation()}
          {...containerProps}
        >
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-4 pb-3 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingSprint ? 'Editar sprint' : 'Nuevo sprint'}
              </h2>
            </div>
            <button onClick={handleClose} className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-full">
              <XIcon size={20} />
            </button>
          </div>
          {formContent}
        </div>
      </>
    )
  }

  return (
    <>
      <style>{datePickerStyles}</style>
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'}`} onClick={handleClose}>
        <div
          className={`absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden flex flex-col transform transition-transform duration-300 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                {editingSprint ? 'Editar sprint' : 'Nuevo sprint'}
              </h2>
            </div>
            <button onClick={handleClose} className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg">
              <XIcon size={20} />
            </button>
          </div>
          {formContent}
        </div>
      </div>
    </>
  )
}

export default CreateSprint
