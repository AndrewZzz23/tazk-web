import { useState, useEffect } from 'react'
import { X, Keyboard } from 'lucide-react'

interface KeyboardShortcutsProps {
  onClose: () => void
}

function KeyboardShortcuts({ onClose }: KeyboardShortcutsProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  const shortcuts = [
    { keys: ['Ctrl', 'K'], description: 'Búsqueda global' },
    { keys: ['Alt', 'N'], description: 'Nueva tarea' },
    { keys: ['1'], description: 'Vista Lista' },
    { keys: ['2'], description: 'Vista Kanban' },
    { keys: ['3'], description: 'Vista Calendario' },
    { keys: ['?'], description: 'Atajos de teclado' },
    { keys: ['Esc'], description: 'Cerrar panel / modal' },
  ]

  return (
    <>
      <div
        className={`fixed inset-0 z-[70] transition-all duration-200 ${
          isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
        }`}
        onClick={handleClose}
      />
      <div
        className={`fixed inset-0 z-[70] flex items-center justify-center pointer-events-none`}
      >
        <div
          className={`bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden pointer-events-auto transform transition-all duration-200 ${
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Atajos de teclado
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <X size={18} />
            </button>
          </div>

          {/* Shortcuts list */}
          <div className="p-4 space-y-2">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
              >
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  {shortcut.description}
                </span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-xs text-neutral-900 dark:text-white font-mono min-w-[28px] text-center">
                        {key}
                      </kbd>
                      {i < shortcut.keys.length - 1 && (
                        <span className="text-neutral-400 dark:text-neutral-500 text-xs">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 pb-4">
            <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">
              Los atajos numéricos solo funcionan fuera de campos de texto
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default KeyboardShortcuts
