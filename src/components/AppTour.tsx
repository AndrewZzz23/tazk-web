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
  isMobile?: boolean
}

// Pasos para desktop
const desktopSteps: TourStep[] = [
  {
    id: 'welcome',
    target: null,
    title: '¡Bienvenido a Tazk!',
    description: 'Tu nuevo espacio para organizar tareas de forma simple y eficiente. Puedes interactuar con los elementos destacados.',
    position: 'center'
  },
  {
    id: 'sidebar',
    target: '[data-tour="sidebar"]',
    title: 'Navegación',
    description: 'Alterna entre tus tareas personales y equipos de trabajo. Aquí puedes ver o crear nuevos equipos.',
    position: 'right'
  },
  {
    id: 'view-modes',
    target: '[data-tour="view-modes"]',
    title: 'Vistas',
    description: 'Organiza tus tareas como prefieras: Lista, Kanban o Calendario.',
    position: 'right'
  },
  {
    id: 'tools',
    target: '[data-tour="tools"]',
    title: 'Herramientas',
    description: 'Accede a métricas, historial de actividad, estados personalizados y configuración de correos.',
    position: 'right'
  },
  {
    id: 'search',
    target: '[data-tour="search"]',
    title: 'Búsqueda',
    description: 'Encuentra cualquier tarea al instante. También puedes usar Ctrl+K.',
    position: 'bottom'
  },
  {
    id: 'user-menu',
    target: '[data-tour="user-menu"]',
    title: 'Tu perfil',
    description: 'Personaliza tu cuenta, cambia el tema y gestiona tu configuración.',
    position: 'left'
  },
  {
    id: 'create-task',
    target: '[data-tour="create-task"]',
    title: 'Crear tareas',
    description: 'Crea nuevas tareas con título, descripción, prioridad y fecha límite.',
    position: 'top'
  }
]

// Pasos para móvil - más completos
const mobileSteps: TourStep[] = [
  {
    id: 'welcome',
    target: null,
    title: '¡Bienvenido a Tazk!',
    description: 'Tu espacio para organizar tareas. Puedes interactuar con los elementos destacados.',
    position: 'center'
  },
  {
    id: 'teams',
    target: '[data-tour-mobile="teams"]',
    title: 'Equipos',
    description: 'Alterna entre tareas personales y equipos. Aquí puedes ver o crear nuevos equipos.',
    position: 'top'
  },
  {
    id: 'views',
    target: '[data-tour-mobile="views"]',
    title: 'Vistas',
    description: 'Elige cómo organizar tus tareas: Lista, Kanban o Calendario.',
    position: 'top'
  },
  {
    id: 'notifications',
    target: '[data-tour-mobile="notifications"]',
    title: 'Notificaciones',
    description: 'Recibe alertas de invitaciones a equipos y actualizaciones importantes.',
    position: 'top'
  },
  {
    id: 'tools',
    target: '[data-tour-mobile="tools"]',
    title: 'Herramientas',
    description: 'Accede a métricas, actividad, estados personalizados y configuración.',
    position: 'top'
  },
  {
    id: 'create-task',
    target: '[data-tour="create-task"]',
    title: 'Crear tareas',
    description: 'Crea nuevas tareas con título, prioridad y fecha límite.',
    position: 'top'
  }
]

function AppTour({ onComplete, onSkip, isMobile = false }: AppTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const highlightedElementRef = useRef<HTMLElement | null>(null)

  const tourSteps = isMobile ? mobileSteps : desktopSteps
  const step = tourSteps[currentStep]
  const isLastStep = currentStep === tourSteps.length - 1
  const isFirstStep = currentStep === 0
  const isCenteredStep = step.position === 'center'

  const highlightElement = useCallback((element: HTMLElement | null) => {
    if (highlightedElementRef.current) {
      highlightedElementRef.current.style.removeProperty('position')
      highlightedElementRef.current.style.removeProperty('z-index')
    }

    if (element) {
      const computedStyle = window.getComputedStyle(element)
      if (computedStyle.position === 'static') {
        element.style.position = 'relative'
      }
      element.style.zIndex = '201'
      // Permitir interacción con el elemento destacado
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

  useEffect(() => {
    return () => {
      if (highlightedElementRef.current) {
        highlightedElementRef.current.style.removeProperty('position')
        highlightedElementRef.current.style.removeProperty('z-index')
      }
    }
  }, [])

  // Navegación con teclado (solo desktop)
  useEffect(() => {
    if (isMobile) return

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
  }, [currentStep, isFirstStep, isLastStep, isMobile])

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
    const safeMargin = 20 // Margen seguro desde los bordes
    const tooltipWidth = isMobile ? Math.min(260, window.innerWidth - 40) : 340
    const estimatedTooltipHeight = isMobile ? 180 : 220

    // Para móvil, calcular posición segura
    if (isMobile) {
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      // Espacio disponible arriba y abajo del elemento
      const spaceAbove = targetRect.top - safeMargin
      const spaceBelow = viewportHeight - targetRect.bottom - safeMargin

      // Determinar si mostrar arriba o abajo basado en espacio disponible
      const showAbove = spaceAbove > spaceBelow || spaceBelow < estimatedTooltipHeight

      // Calcular posición horizontal centrada pero sin salirse de la pantalla
      const leftPosition = Math.max(
        safeMargin,
        Math.min(
          (viewportWidth - tooltipWidth) / 2,
          viewportWidth - tooltipWidth - safeMargin
        )
      )

      if (showAbove) {
        // Mostrar arriba del elemento
        const bottomValue = viewportHeight - targetRect.top + padding
        // Asegurarse de que no se salga por arriba
        const maxBottom = viewportHeight - safeMargin - estimatedTooltipHeight

        return {
          bottom: Math.min(bottomValue, maxBottom),
          left: leftPosition,
          maxWidth: tooltipWidth,
          width: tooltipWidth
        }
      } else {
        // Mostrar abajo del elemento
        const topValue = targetRect.bottom + padding
        // Asegurarse de que no se salga por abajo
        const maxTop = viewportHeight - estimatedTooltipHeight - safeMargin

        return {
          top: Math.min(topValue, maxTop),
          left: leftPosition,
          maxWidth: tooltipWidth,
          width: tooltipWidth
        }
      }
    }

    // Desktop positioning
    const tooltipHeight = 260
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

    if (left !== undefined) {
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding))
    }
    if (right !== undefined) {
      right = Math.max(padding, right)
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
          {/* Contenedor de centrado para la tarjeta de bienvenida */}
          {isCenteredStep && (
            <div className="absolute inset-0 flex items-center justify-center p-4 z-[204] pointer-events-none">
              <motion.div
                key={`centered-${currentStep}`}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="w-full max-w-[400px] bg-neutral-900 border border-neutral-700 shadow-2xl rounded-3xl overflow-hidden pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header de bienvenida */}
                <div className="relative overflow-hidden px-6 pt-8 pb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-orange-500/5 to-transparent" />
                  <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-yellow-400/20 to-orange-500/10 rounded-full blur-2xl" />
                  <div className="absolute bottom-0 left-4 w-16 h-16 bg-gradient-to-br from-orange-500/15 to-yellow-400/5 rounded-full blur-xl" />

                  <div className="relative flex flex-col items-center text-center">
                    <motion.div
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', delay: 0.1, stiffness: 300 }}
                      className="w-16 h-16 mb-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-400/30"
                    >
                      <Zap className="w-8 h-8 text-neutral-900" />
                    </motion.div>

                    <h3 className="text-2xl font-bold text-white">
                      {step.title}
                    </h3>
                  </div>
                </div>

                {/* Contenido */}
                <div className="px-6 pb-4 text-center">
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Barra de progreso */}
                <div className="px-6 pb-5">
                  <div className="flex items-center gap-1.5 justify-center">
                    {tourSteps.map((_, i) => (
                      <motion.div
                        key={i}
                        initial={false}
                        animate={{
                          width: i === currentStep ? 24 : 8,
                          backgroundColor: i <= currentStep ? 'rgb(250, 204, 21)' : 'rgb(64, 64, 64)'
                        }}
                        transition={{ duration: 0.2 }}
                        className="h-2 rounded-full"
                      />
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col items-center gap-3 border-t border-neutral-800 px-6 py-5">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleNext}
                    className="flex items-center gap-2 px-8 py-3 text-base bg-gradient-to-r from-yellow-400 to-orange-500 text-neutral-900 font-semibold rounded-2xl shadow-lg shadow-yellow-400/25"
                  >
                    Comenzar tour
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>

                  <button
                    onClick={handleSkip}
                    className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    Omitir tour
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Overlay - no cierra al hacer clic, solo con botón Omitir */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pointer-events-none"
          >
            <svg className="w-full h-full">
              <defs>
                <mask id="tour-spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {targetRect && !isCenteredStep && (
                    <rect
                      x={targetRect.left - 6}
                      y={targetRect.top - 6}
                      width={targetRect.width + 12}
                      height={targetRect.height + 12}
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
                fill="rgba(0, 0, 0, 0.9)"
                mask="url(#tour-spotlight-mask)"
              />
            </svg>
          </motion.div>

          {/* Borde del spotlight */}
          {targetRect && !isCenteredStep && (
            <motion.div
              key={`highlight-${currentStep}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute pointer-events-none z-[202]"
              style={{
                top: targetRect.top - 6,
                left: targetRect.left - 6,
                width: targetRect.width + 12,
                height: targetRect.height + 12,
                borderRadius: 14,
                border: '3px solid rgba(250, 204, 21, 1)',
                boxShadow: '0 0 0 4px rgba(250, 204, 21, 0.3), 0 0 40px rgba(250, 204, 21, 0.6)'
              }}
            />
          )}

          {/* Tooltip para pasos no centrados */}
          {!isCenteredStep && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`absolute bg-neutral-900 border border-neutral-700 shadow-2xl overflow-hidden z-[203] ${
              isMobile ? 'rounded-2xl' : 'w-[340px] rounded-2xl'
            }`}
            style={getTooltipPosition()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`relative overflow-hidden ${isMobile ? 'px-4 py-3' : 'px-5 py-4'}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-orange-500/5 to-transparent" />

              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className={`text-yellow-400 ${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                    <span className={`text-yellow-400 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {currentStep + 1} de {tourSteps.length}
                    </span>
                  </div>
                  <button
                    onClick={handleSkip}
                    className="p-1 hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className={`text-neutral-500 ${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                  </button>
                </div>

                <h3 className={`font-bold text-white ${isMobile ? 'text-sm' : 'text-lg'}`}>
                  {step.title}
                </h3>
              </div>
            </div>

            {/* Contenido */}
            <div className={isMobile ? 'px-4 pb-2' : 'px-5 pb-3'}>
              <p className={`text-neutral-400 leading-relaxed ${isMobile ? 'text-xs' : 'text-sm'}`}>
                {step.description}
              </p>
            </div>

            {/* Barra de progreso */}
            <div className={isMobile ? 'px-4 pb-2' : 'px-5 pb-3'}>
              <div className="flex items-center gap-1.5">
                {tourSteps.map((_, i) => (
                  <motion.div
                    key={i}
                    initial={false}
                    animate={{
                      width: i === currentStep ? 24 : 8,
                      backgroundColor: i <= currentStep ? 'rgb(250, 204, 21)' : 'rgb(64, 64, 64)'
                    }}
                    transition={{ duration: 0.2 }}
                    className="h-2 rounded-full"
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between border-t border-neutral-800 ${isMobile ? 'px-4 py-2' : 'px-5 py-3'}`}>
              {currentStep > 1 ? (
                <button
                  onClick={handlePrev}
                  className={`flex items-center gap-1 px-2 py-1.5 text-neutral-400 hover:text-white active:bg-white/10 rounded-lg transition-all ${
                    isMobile ? 'text-xs' : 'text-sm'
                  }`}
                >
                  <ArrowLeft className={isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                  {!isMobile && 'Anterior'}
                </button>
              ) : (
                <button
                  onClick={handleSkip}
                  className={`px-2 py-1.5 text-neutral-500 hover:text-neutral-300 transition-colors ${
                    isMobile ? 'text-xs' : 'text-sm'
                  }`}
                >
                  Omitir
                </button>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleNext}
                className={`flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-neutral-900 font-semibold shadow-lg shadow-yellow-400/25 ${
                  isMobile ? 'px-3 py-1.5 text-xs rounded-xl' : 'px-4 py-2 text-sm rounded-xl'
                }`}
              >
                {isLastStep ? (
                  <>
                    <CheckCircle className={isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                    Listo
                  </>
                ) : (
                  <>
                    Siguiente
                    <ArrowRight className={isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                  </>
                )}
              </motion.button>
            </div>

            {/* Hint de teclado - solo desktop */}
            {!isMobile && !isLastStep && (
              <div className="px-5 pb-3 flex items-center justify-center gap-3 text-neutral-600 text-xs">
                <span>← → navegar</span>
                <span>·</span>
                <span>Enter continuar</span>
                <span>·</span>
                <span>Esc salir</span>
              </div>
            )}
          </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  )
}

export default AppTour
