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
}

export function useBottomSheetGesture({
  onClose,
  threshold = 100
}: UseBottomSheetGestureOptions): UseBottomSheetGestureReturn {
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startY = useRef(0)
  const currentY = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    currentY.current = e.touches[0].clientY
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return

    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current

    // Solo permitir arrastrar hacia abajo
    if (diff > 0) {
      setDragY(diff)
    }
  }, [isDragging])

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
  }, [dragY, threshold, onClose])

  const dragStyle: React.CSSProperties = {
    transform: `translateY(${dragY}px)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out'
  }

  return {
    dragY,
    isDragging,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    dragStyle
  }
}
