import { useState, useEffect } from 'react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  const handleCancel = () => {
    setIsVisible(false)
    setTimeout(onCancel, 200)
  }

  const handleConfirm = () => {
    setIsVisible(false)
    setTimeout(onConfirm, 200)
  }

  const typeStyles = {
    danger: {
      icon: '🗑️',
      buttonBg: 'bg-red-500 hover:bg-red-600',
      iconBg: 'bg-red-500/10'
    },
    warning: {
      icon: '⚠️',
      buttonBg: 'bg-orange-500 hover:bg-orange-600',
      iconBg: 'bg-orange-500/10'
    },
    info: {
      icon: 'ℹ️',
      buttonBg: 'bg-blue-500 hover:bg-blue-600',
      iconBg: 'bg-blue-500/10'
    }
  }

  const style = typeStyles[type]

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-200 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={handleCancel}
    >
      <div
        className={`bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 transform transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Icono */}
          <div className={`w-12 h-12 ${style.iconBg} rounded-full flex items-center justify-center text-2xl mx-auto mb-4`}>
            {style.icon}
          </div>

          {/* Título */}
          <h3 className="text-lg font-bold text-white text-center mb-2">
            {title}
          </h3>

          {/* Mensaje */}
          <p className="text-neutral-400 text-center text-sm">
            {message}
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-3 p-4 border-t border-neutral-700">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2.5 bg-neutral-700 text-neutral-300 rounded-lg font-medium hover:bg-neutral-600 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2.5 ${style.buttonBg} text-white rounded-lg font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog