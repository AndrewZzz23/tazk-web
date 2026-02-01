import { useState, useCallback, useRef, useEffect } from 'react'

export interface UseBottomSheetGestureOptions {
  onClose: () => void
  threshold?: number // pixels to drag before closing (default: 100)
  disabled?: boolean // disable gesture handling
}

interface UseBottomSheetGestureReturn {
  dragY: number
  isDragging: boolean
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchMove: (e: React.TouchEvent) => void
  handleTouchEnd: () => void
  dragStyle: React.CSSProperties
  // Props para aplicar a todo el contenedor
  containerProps: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
  // Ref para el contenedor scrollable (opcional)
  scrollRef: React.RefObject<HTMLDivElement | null>
}

export function useBottomSheetGesture({
  onClose,
  threshold = 100,
  disabled = false
}: UseBottomSheetGestureOptions): UseBottomSheetGestureReturn {
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [canDrag, setCanDrag] = useState(true)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const startY = useRef(0)
  const currentY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Detectar cuando se abre/cierra un datepicker (portal)
  useEffect(() => {
    const checkDatePickerOpen = () => {
      const datePickerPopper = document.querySelector('.react-datepicker-popper')
      setIsDatePickerOpen(datePickerPopper !== null)
    }

    // Observer para detectar cambios en el DOM (cuando aparece el datepicker portal)
    const observer = new MutationObserver(checkDatePickerOpen)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Si está deshabilitado o hay un datepicker abierto, no hacer nada
    if (disabled || isDatePickerOpen) {
      setCanDrag(false)
      setIsDragging(false)
      return
    }

    const target = e.target as HTMLElement
    const tagName = target.tagName.toLowerCase()

    // Bloquear swipe para:
    // 1. react-datepicker (detectar por clase o ancestro)
    // 2. Selects, textareas e inputs
    // 3. Elementos marcados con data-no-swipe
    const isDatePicker = target.closest('.react-datepicker') !== null ||
                         target.closest('.react-datepicker-popper') !== null ||
                         target.closest('.react-datepicker-wrapper') !== null ||
                         target.closest('.react-datepicker__input-container') !== null

    const isInteractiveInput = (
      isDatePicker ||
      tagName === 'select' ||
      tagName === 'textarea' ||
      tagName === 'input' ||
      target.closest('[data-no-swipe]') !== null
    )

    if (isInteractiveInput) {
      setCanDrag(false)
      setIsDragging(false)
      return
    }

    startY.current = e.touches[0].clientY
    currentY.current = e.touches[0].clientY

    // Verificar si el contenido scrollable está en la parte superior
    const scrollElement = scrollRef.current
    if (scrollElement && scrollElement.scrollTop > 0) {
      setCanDrag(false)
    } else {
      setCanDrag(true)
    }

    setIsDragging(true)
  }, [isDatePickerOpen])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return

    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current

    // Solo permitir arrastrar hacia abajo si el scroll está arriba
    if (diff > 0 && canDrag) {
      setDragY(diff)
    }
  }, [isDragging, canDrag])

  const handleTouchEnd = useCallback(() => {
    if (dragY > threshold) {
      // Cerrar si se arrastró suficiente
      onClose()
      // Resetear después de un pequeño delay para que la animación de cierre se complete
      setTimeout(() => setDragY(0), 300)
    } else {
      // Volver a la posición original
      setDragY(0)
    }
    setIsDragging(false)
    setCanDrag(true)
  }, [dragY, threshold, onClose])

  const dragStyle: React.CSSProperties = {
    transform: `translateY(${dragY}px)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out'
  }

  const containerProps = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  }

  return {
    dragY,
    isDragging,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    dragStyle,
    containerProps,
    scrollRef
  }
}
