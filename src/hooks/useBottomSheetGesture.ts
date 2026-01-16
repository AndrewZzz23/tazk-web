import { useState, useCallback, useRef } from 'react'

interface UseBottomSheetGestureOptions {
  onClose: () => void
  threshold?: number // pixels to drag before closing (default: 100)
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
  scrollRef: React.RefObject<HTMLDivElement>
}

export function useBottomSheetGesture({
  onClose,
  threshold = 100
}: UseBottomSheetGestureOptions): UseBottomSheetGestureReturn {
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [canDrag, setCanDrag] = useState(true)
  const startY = useRef(0)
  const currentY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
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
  }, [])

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
