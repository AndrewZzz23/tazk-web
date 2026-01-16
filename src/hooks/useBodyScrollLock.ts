import { useEffect } from 'react'

/**
 * Hook para bloquear el scroll del body cuando un modal/bottom sheet está abierto
 * @param isLocked - Si el scroll debe estar bloqueado
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      // Guardar el scroll actual
      const scrollY = window.scrollY

      // Bloquear el scroll del body
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'

      return () => {
        // Restaurar el scroll
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isLocked])
}
