import { useState, useEffect } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

function Toast({ message, type = 'info', onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }, 3000)

    return () => clearTimeout(timer)
  }, [onClose])

  const typeStyles = {
    success: {
      icon: '✅',
      bg: 'bg-green-500/20 border-green-500/50',
      text: 'text-green-400'
    },
    error: {
      icon: '❌',
      bg: 'bg-red-500/20 border-red-500/50',
      text: 'text-red-400'
    },
    info: {
      icon: 'ℹ️',
      bg: 'bg-blue-500/20 border-blue-500/50',
      text: 'text-blue-400'
    }
  }

  const style = typeStyles[type]

  return (
    <div
      className={`fixed bottom-6 left-6 z-[200] transform transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className={`flex items-center gap-3 px-4 py-3 ${style.bg} border rounded-xl shadow-lg`}>
        <span className="text-lg">{style.icon}</span>
        <span className={`${style.text} font-medium`}>{message}</span>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white ml-2"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default Toast