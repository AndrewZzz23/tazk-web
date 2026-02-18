import { useRef, useState, useCallback } from 'react'

interface PullToRefreshOptions {
  onRefresh: () => void | Promise<void>
  threshold?: number // px to trigger refresh (default 80)
}

interface PullToRefreshReturn {
  pullDistance: number
  isRefreshing: boolean
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: PullToRefreshOptions): PullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return
    // Only start pull if page is scrolled to top
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY
      pulling.current = true
    }
  }, [isRefreshing])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || isRefreshing) return
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0) {
      // Apply resistance: distance grows slower as you pull more
      setPullDistance(Math.min(diff * 0.4, 120))
    } else {
      pulling.current = false
      setPullDistance(0)
    }
  }, [isRefreshing])

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current || isRefreshing) return
    pulling.current = false

    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      setPullDistance(threshold * 0.5) // Keep a small indicator while refreshing
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, threshold, onRefresh, isRefreshing])

  return {
    pullDistance,
    isRefreshing,
    handlers: { onTouchStart, onTouchMove, onTouchEnd }
  }
}
