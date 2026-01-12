// Service Worker para recibir push notifications
console.log('[SW-Push] Service Worker push script loaded')

self.addEventListener('push', (event) => {
  console.log('[SW-Push] Push event received:', event)

  if (!event.data) {
    console.log('[SW-Push] No data in push event')
    return
  }

  let data
  try {
    data = event.data.json()
    console.log('[SW-Push] Push data parsed:', data)
  } catch (e) {
    console.error('[SW-Push] Error parsing push data:', e)
    // Try as text
    const text = event.data.text()
    console.log('[SW-Push] Raw push data:', text)
    data = { title: 'Tazk', body: text }
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/tazk.svg',
    badge: data.badge || '/tazk.svg',
    tag: data.tag || 'default',
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true
  }

  console.log('[SW-Push] Showing notification with options:', options)

  event.waitUntil(
    self.registration.showNotification(data.title || 'Tazk', options)
      .then(() => console.log('[SW-Push] Notification shown successfully'))
      .catch(err => console.error('[SW-Push] Error showing notification:', err))
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') return

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          // Navegar a la URL si es necesario
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen)
          }
          return
        }
      }
      // Si no hay ventana, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
