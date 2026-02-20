// Edge Function: send-push-notification
// Usa npm:web-push (implementación estándar probada)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@tazk.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error('[Push] VAPID keys not configured')
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { user_id, user_ids, title, body: notifBody, url: notifUrl = '/', tag, data = {} } = await req.json()
    const notifTag = tag || `tazk-${Date.now()}`

    if (!title) {
      return new Response(JSON.stringify({ error: 'title required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const targetIds: string[] = []
    if (Array.isArray(user_ids)) targetIds.push(...user_ids)
    if (user_id && !targetIds.includes(user_id)) targetIds.push(user_id)
    if (!targetIds.length) {
      return new Response(JSON.stringify({ error: 'user_id or user_ids required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[Push] Sending "${title}" to users:`, targetIds)

    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .in('user_id', targetIds)

    if (subErr) {
      console.error('[Push] DB error:', subErr)
      return new Response(JSON.stringify({ error: subErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[Push] Found ${subs?.length ?? 0} subscriptions`)

    if (!subs?.length) {
      return new Response(JSON.stringify({ message: 'No subscriptions found', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const pushPayload = JSON.stringify({
      title,
      body: notifBody,
      icon: '/tazk.svg',
      badge: '/tazk.svg',
      tag: notifTag,
      data: { url: notifUrl, ...data },
    })

    const results = await Promise.all(
      subs.map(async (sub) => {
        try {
          const subscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          }
          const response = await webpush.sendNotification(subscription, pushPayload, { TTL: 86400 })
          const status = response.statusCode ?? 200
          console.log(`[Push] status=${status} endpoint=${sub.endpoint.substring(0, 60)}...`)
          if (status === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
            console.log('[Push] Removed expired subscription')
          }
          return { user_id: sub.user_id, ok: true, status }
        } catch (err: any) {
          const status = err.statusCode || 0
          const body = err.body || err.message || String(err)
          console.error(`[Push] Error status=${status} endpoint=${sub.endpoint.substring(0, 60)}... body=${body}`)
          if (status === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
            console.log('[Push] Removed expired subscription')
          }
          return { user_id: sub.user_id, ok: false, status, error: body }
        }
      })
    )

    const sent = results.filter((r) => r.ok).length
    console.log(`[Push] Done: ${sent}/${results.length} sent`)

    return new Response(JSON.stringify({ sent, failed: results.length - sent, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[Push] Unexpected error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
