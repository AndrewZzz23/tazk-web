import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

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
      icon: CheckCircle,
      bg: 'bg-green-500/10 border-green-500/30',
      iconColor: 'text-green-500',
      text: 'text-green-400',
      glow: 'shadow-green-500/20'
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-500/10 border-red-500/30',
      iconColor: 'text-red-500',
      text: 'text-red-400',
      glow: 'shadow-red-500/20'
    },
    info: {
      icon: Info,
      bg: 'bg-blue-500/10 border-blue-500/30',
      iconColor: 'text-blue-500',
      text: 'text-blue-400',
      glow: 'shadow-blue-500/20'
    }
  }

  const style = typeStyles[type]
  const Icon = style.icon

  return (
    <div
      className={`fixed bottom-6 left-6 z-[200] transform transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'
      }`}
    >
      <div className={`flex items-center gap-3 px-4 py-3 ${style.bg} border rounded-xl shadow-lg ${style.glow} backdrop-blur-sm`}>
        <div className={`${style.iconColor} animate-[pulse_0.5s_ease-in-out]`}>
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <span className={`${style.text} font-medium text-sm`}>{message}</span>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="text-gray-400 hover:text-white ml-1 p-1 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default Toast
