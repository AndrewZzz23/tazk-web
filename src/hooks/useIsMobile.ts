import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768 // md breakpoint en Tailwind

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < MOBILE_BREAKPOINT
  })

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Escuchar cambios de tamaño
    window.addEventListener('resize', checkMobile)

    // Verificar al montar
    checkMobile()

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

// Hook adicional para detectar dispositivo táctil
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  return isTouch
}
