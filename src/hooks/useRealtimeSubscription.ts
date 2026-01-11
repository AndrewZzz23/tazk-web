import { useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface SubscriptionConfig {
  table: string
  schema?: string
  event?: PostgresChangeEvent
  filter?: string
}

interface UseRealtimeSubscriptionOptions {
  subscriptions: SubscriptionConfig[]
  onchange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  enabled?: boolean
}

/**
 * Hook para suscribirse a cambios en tiempo real de Supabase
 *
 * @example
 * useRealtimeSubscription({
 *   subscriptions: [
 *     { table: 'team_members', filter: `user_id=eq.${userId}` },
 *     { table: 'team_invitations', filter: `email=eq.${userEmail}` }
 *   ],
 *   onchange: (payload) => {
 *     console.log('Cambio detectado:', payload)
 *     reloadData()
 *   }
 * })
 */
export function useRealtimeSubscription({
  subscriptions,
  onchange,
  enabled = true
}: UseRealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled || subscriptions.length === 0) return

    // Crear un nombre único para el canal
    const channelName = `realtime-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Crear el canal
    let channel = supabase.channel(channelName)

    // Agregar cada suscripción al canal
    subscriptions.forEach((config) => {
      const { table, schema = 'public', event = '*', filter } = config

      channel = channel.on(
        'postgres_changes',
        {
          event,
          schema,
          table,
          filter
        },
        (payload) => {
          onchange(payload as RealtimePostgresChangesPayload<Record<string, unknown>>)
        }
      )
    })

    // Suscribirse
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Suscrito a: ${subscriptions.map(s => s.table).join(', ')}`)
      }
    })

    channelRef.current = channel

    // Cleanup: desuscribirse cuando el componente se desmonte
    return () => {
      if (channelRef.current) {
        console.log(`[Realtime] Desuscribiendo de: ${subscriptions.map(s => s.table).join(', ')}`)
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enabled, JSON.stringify(subscriptions)])

  return channelRef
}

/**
 * Hook simplificado para suscribirse a una sola tabla
 */
export function useTableSubscription(
  table: string,
  onchange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
  filter?: string,
  enabled = true
) {
  return useRealtimeSubscription({
    subscriptions: [{ table, filter }],
    onchange,
    enabled
  })
}
