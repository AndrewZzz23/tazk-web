import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRight, ArrowLeft, X, Sparkles, CheckCircle, Zap } from 'lucide-react'

interface TourStep {
  id: string
  target: string | null
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

interface AppTourProps {
  onComplete: () => void
  onSkip?: () => void
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    target: null,
    title: '¡Bienvenido a Tazk!',
    description: 'Tu nuevo espacio para organizar tareas de forma simple y eficiente. Te mostraremos las funciones principales.',
    position: 'center'
  },
  {
    id: 'sidebar',
    target: '[data-tour="sidebar"]',
    title: 'Navegación',
    description: 'Alterna entre tus tareas personales y equipos de trabajo. Crea nuevos equipos e invita colaboradores.',
    position: 'right'
  },
  {
    id: 'view-modes',
    target: '[data-tour="view-modes"]',
    title: 'Vistas',
    description: 'Organiza tus tareas como prefieras: Lista, Kanban o Calendario. Usa los atajos 1, 2, 3 para cambiar rápidamente.',
    position: 'right'
  },
  {
    id: 'tools',
    target: '[data-tour="tools"]',
    title: 'Herramientas',
    description: 'Accede a métricas de productividad, historial de actividad, personalización de estados y correos.',
    position: 'right'
  },
  {
    id: 'search',
    target: '[data-tour="search"]',
    title: 'Búsqueda inteligente',
    description: 'Encuentra cualquier tarea al instante. También puedes acceder a funciones rápidas. Usa Ctrl+K.',
    position: 'bottom'
  },
  {
    id: 'user-menu',
    target: '[data-tour="user-menu"]',
    title: 'Tu perfil',
    description: 'Personaliza tu cuenta, cambia el tema de la aplicación y gestiona tu configuración personal.',
    position: 'left'
  },
  {
    id: 'create-task',
    target: '[data-tour="create-task"]',
    title: 'Crear tareas',
    description: 'Crea nuevas tareas con un clic. Asigna título, descripción, prioridad, fecha límite y más. Atajo: Alt+N',
    position: 'top'
  }
]

function AppTour({ onComplete, onSkip }: AppTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const highlightedElementRef = useRef<HTMLElement | null>(null)

  const step = tourSteps[currentStep]
  const isLastStep = currentStep === tourSteps.length - 1
  const isFirstStep = currentStep === 0
  const isCenteredStep = step.position === 'center'

  // Función para elevar el z-index del elemento y restaurarlo después
  const highlightElement = useCallback((element: HTMLElement | null) => {
    // Restaurar elemento anterior
    if (highlightedElementRef.current) {
      highlightedElementRef.current.style.removeProperty('position')
      highlightedElementRef.current.style.removeProperty('z-index')
      highlightedElementRef.current.style.removeProperty('pointer-events')
    }

    // Destacar nuevo elemento
    if (element) {
      const computedStyle = window.getComputedStyle(element)
      if (computedStyle.position === 'static') {
        element.style.position = 'relative'
      }
      element.style.zIndex = '201'
      element.style.pointerEvents = 'none'
      highlightedElementRef.current = element
    } else {
      highlightedElementRef.current = null
    }
  }, [])

  const updateTargetPosition = useCallback(() => {
    if (!step || !step.target) {
      setTargetRect(null)
      highlightElement(null)
      return
    }

    const element = document.querySelector(step.target) as HTMLElement
    if (element) {
      const rect = element.getBoundingClientRect()
      setTargetRect(rect)
      highlightElement(element)
    } else {
      if (!isLastStep) {
        setCurrentStep(prev => prev + 1)
      }
    }
  }, [step, isLastStep, highlightElement])

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    updateTargetPosition()

    window.addEventListener('scroll', updateTargetPosition, true)
    window.addEventListener('resize', updateTargetPosition)

    return () => {
      window.removeEventListener('scroll', updateTargetPosition, true)
      window.removeEventListener('resize', updateTargetPosition)
    }
  }, [currentStep, updateTargetPosition])

  // Restaurar estilos al desmontar
  useEffect(() => {
    return () => {
      if (highlightedElementRef.current) {
        highlightedElementRef.current.style.removeProperty('position')
        highlightedElementRef.current.style.removeProperty('z-index')
        highlightedElementRef.current.style.removeProperty('pointer-events')
      }
    }
  }, [])

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        e.preventDefault()
        handlePrev()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleSkip()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStep, isFirstStep, isLastStep])

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = () => {
    highlightElement(null)
    setIsVisible(false)
    setTimeout(onComplete, 300)
  }

  const handleSkip = () => {
    highlightElement(null)
    setIsVisible(false)
    setTimeout(onSkip || onComplete, 300)
  }

  const getTooltipPosition = (): React.CSSProperties => {
    if (isCenteredStep || !targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }
    }

    const padding = 16
    const tooltipWidth = 340
    const tooltipHeight = 260

    // Calcular posición base según la dirección
    let top: number | undefined
    let left: number | undefined
    let right: number | undefined
    let bottom: number | undefined

    switch (step.position) {
      case 'top':
        bottom = window.innerHeight - targetRect.top + padding
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        break
      case 'bottom':
        top = targetRect.bottom + padding
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        break
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
        right = window.innerWidth - targetRect.left + padding
        break
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
        left = targetRect.right + padding
        break
    }

    // Ajustar para mantener dentro de la pantalla
    if (left !== undefined) {
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding))
    }
    if (right !== undefined) {
      right = Math.max(padding, right)
      // Si el tooltip saldría de la pantalla por la izquierda, usar left en su lugar
      if (window.innerWidth - right - tooltipWidth < padding) {
        left = padding
        right = undefined
      }
    }
    if (top !== undefined) {
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding))
    }
    if (bottom !== undefined) {
      bottom = Math.max(padding, bottom)
      // Si el tooltip saldría de la pantalla por arriba, usar top en su lugar
      if (window.innerHeight - bottom - tooltipHeight < padding) {
        top = padding
        bottom = undefined
      }
    }

    return { top, left, right, bottom }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[200]">
          {/* Overlay con agujero para el spotlight */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
            onClick={handleSkip}
          >
            <svg className="w-full h-full">
              <defs>
                <mask id="tour-spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {targetRect && !isCenteredStep && (
                    <rect
                      x={targetRect.left - 10}
                      y={targetRect.top - 10}
                      width={targetRect.width + 20}
                      height={targetRect.height + 20}
                      rx="14"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.85)"
                mask="url(#tour-spotlight-mask)"
              />
            </svg>
          </motion.div>

          {/* Borde brillante alrededor del elemento */}
          {targetRect && !isCenteredStep && (
            <motion.div
              key={`highlight-${currentStep}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute pointer-events-none z-[202]"
              style={{
                top: targetRect.top - 10,
                left: targetRect.left - 10,
                width: targetRect.width + 20,
                height: targetRect.height + 20,
                borderRadius: 14,
                border: '3px solid rgba(250, 204, 21, 0.8)',
                boxShadow: '0 0 0 4px rgba(250, 204, 21, 0.2), 0 0 40px rgba(250, 204, 21, 0.4), inset 0 0 20px rgba(250, 204, 21, 0.1)'
              }}
            />
          )}

          {/* Tooltip */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.95, y: isCenteredStep ? 20 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`absolute bg-neutral-900 border border-neutral-700 shadow-2xl overflow-hidden z-[203] ${
              isCenteredStep ? 'w-[400px] rounded-3xl' : 'w-[340px] rounded-2xl'
            }`}
            style={getTooltipPosition()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`relative overflow-hidden ${isCenteredStep ? 'px-7 pt-7 pb-5' : 'px-5 py-4'}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-orange-500/5 to-transparent" />

              {isCenteredStep && (
                <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-yellow-400/20 to-orange-500/10 rounded-full blur-2xl" />
              )}

              <div className="relative">
                {isCenteredStep && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-yellow-400/20"
                  >
                    <Zap className="w-7 h-7 text-neutral-900" />
                  </motion.div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {!isCenteredStep && <Sparkles className="w-4 h-4 text-yellow-400" />}
                    <span className="text-yellow-400 text-sm font-medium">
                      {currentStep + 1} de {tourSteps.length}
                    </span>
                  </div>
                  <button
                    onClick={handleSkip}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    title="Cerrar (Esc)"
                  >
                    <X className="w-4 h-4 text-neutral-500 hover:text-neutral-300" />
                  </button>
                </div>

                <h3 className={`font-bold text-white ${isCenteredStep ? 'text-xl' : 'text-lg'}`}>
                  {step.title}
                </h3>
              </div>
            </div>

            {/* Contenido */}
            <div className={isCenteredStep ? 'px-7 pb-4' : 'px-5 pb-3'}>
              <p className="text-neutral-400 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Barra de progreso */}
            <div className={isCenteredStep ? 'px-7 pb-4' : 'px-5 pb-3'}>
              <div className="flex items-center gap-1">
                {tourSteps.map((_, i) => (
                  <motion.div
                    key={i}
                    initial={false}
                    animate={{
                      width: i === currentStep ? 20 : 6,
                      backgroundColor: i <= currentStep ? 'rgb(250, 204, 21)' : 'rgb(64, 64, 64)'
                    }}
                    transition={{ duration: 0.2 }}
                    className="h-1.5 rounded-full"
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between border-t border-neutral-800 ${
              isCenteredStep ? 'px-7 py-4' : 'px-5 py-3'
            }`}>
              {!isFirstStep ? (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1.5 px-3 py-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-all text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </button>
              ) : (
                <button
                  onClick={handleSkip}
                  className="px-3 py-2 text-neutral-500 hover:text-neutral-300 text-sm transition-colors"
                >
                  Omitir
                </button>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNext}
                className={`flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-neutral-900 rounded-xl font-semibold text-sm shadow-lg shadow-yellow-400/25 hover:shadow-yellow-400/40 transition-shadow ${
                  isCenteredStep ? 'px-5 py-2.5' : 'px-4 py-2'
                }`}
              >
                {isLastStep ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Comenzar
                  </>
                ) : (
                  <>
                    {isCenteredStep ? 'Iniciar tour' : 'Siguiente'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>

            {/* Hint de teclado - solo desktop */}
            <div className="px-5 pb-3 hidden sm:flex items-center justify-center gap-3 text-neutral-600 text-xs">
              <span>← → navegar</span>
              <span>·</span>
              <span>Enter continuar</span>
              <span>·</span>
              <span>Esc salir</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default AppTour
