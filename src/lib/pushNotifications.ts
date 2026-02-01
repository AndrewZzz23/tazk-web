import { supabase } from '../supabaseClient'

// Convertir base64 a Uint8Array para VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Verificar si el navegador soporta notificaciones push
export function isPushSupported(): boolean {
  return 'Notification' in window &&
         'serviceWorker' in navigator &&
         'PushManager' in window
}

// Obtener el estado actual del permiso
export function getNotificationPermission(): NotificationPermission {
  if (!isPushSupported()) return 'denied'
  return Notification.permission
}

// Solicitar permiso de notificaciones
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    console.log('Push notifications not supported')
    return 'denied'
  }

  const permission = await Notification.requestPermission()
  return permission
}

// Suscribirse a push notifications
export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  try {
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      console.log('Notification permission denied')
      return null
    }

    // Registrar service worker si no existe
    const registration = await navigator.serviceWorker.ready

    // Obtener VAPID key
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      console.error('VAPID public key not configured')
      return null
    }

    // Suscribirse
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
    })

    // Guardar suscripción en Supabase
    const subscriptionData = subscription.toJSON()

    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subscriptionData.endpoint,
      p256dh: subscriptionData.keys?.p256dh,
      auth: subscriptionData.keys?.auth,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,endpoint'
    })

    console.log('Push subscription saved')
    return subscription
  } catch (error) {
    console.error('Error subscribing to push:', error)
    return null
  }
}

// Cancelar suscripción
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()

      // Eliminar de Supabase
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)
    }

    return true
  } catch (error) {
    console.error('Error unsubscribing from push:', error)
    return false
  }
}

// Verificar si ya está suscrito
export async function isSubscribedToPush(): Promise<boolean> {
  try {
    if (!isPushSupported()) return false

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    return subscription !== null
  } catch {
    return false
  }
}

// Mostrar notificación local (para pruebas o cuando la app está en primer plano)
export function showLocalNotification(title: string, options?: NotificationOptions): void {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/tazk.svg',
      badge: '/tazk.svg',
      ...options
    })
  }
}
