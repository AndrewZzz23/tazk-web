import { useState, useEffect, useCallback } from 'react'
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush
} from '../lib/pushNotifications'

interface UsePushNotificationsProps {
  userId: string | null
}

export function usePushNotifications({ userId }: UsePushNotificationsProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  const isSupported = isPushSupported()

  // Verificar estado inicial
  useEffect(() => {
    if (isSupported) {
      setPermission(getNotificationPermission())

      isSubscribedToPush().then(subscribed => {
        setIsSubscribed(subscribed)
      })
    }
  }, [isSupported])

  // Suscribirse
  const subscribe = useCallback(async () => {
    if (!userId || !isSupported) return false

    setLoading(true)
    try {
      const subscription = await subscribeToPush(userId)
      if (subscription) {
        setIsSubscribed(true)
        setPermission('granted')
        return true
      }
      setPermission(getNotificationPermission())
      return false
    } finally {
      setLoading(false)
    }
  }, [userId, isSupported])

  // Desuscribirse
  const unsubscribe = useCallback(async () => {
    if (!userId) return false

    setLoading(true)
    try {
      const success = await unsubscribeFromPush(userId)
      if (success) {
        setIsSubscribed(false)
      }
      return success
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Toggle
  const toggle = useCallback(async () => {
    if (isSubscribed) {
      return unsubscribe()
    } else {
      return subscribe()
    }
  }, [isSubscribed, subscribe, unsubscribe])

  return {
    permission,
    isSubscribed,
    loading,
    isSupported,
    subscribe,
    unsubscribe,
    toggle
  }
}
