// Edge Function: send-push-notification
// Envía Web Push notifications usando VAPID + AES-128-GCM (RFC 8188)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@tazk.app'

// ─── Utilidades base64 ───────────────────────────────────────────────────────

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (padded.length % 4)) % 4
  const b64 = padded + '='.repeat(padding)
  const binary = atob(b64)
  return Uint8Array.from(binary, c => c.charCodeAt(0))
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function concatBuffers(...bufs: Uint8Array[]): Uint8Array {
  const total = bufs.reduce((s, b) => s + b.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const b of bufs) { out.set(b, offset); offset += b.length }
  return out
}

// ─── VAPID JWT ───────────────────────────────────────────────────────────────

async function createVapidJwt(audience: string): Promise<string> {
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const now = Math.floor(Date.now() / 1000)
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: now + 43200, // 12 horas
    sub: VAPID_SUBJECT,
  })))

  const signingInput = `${header}.${payload}`

  // Importar clave privada VAPID
  const privateKeyBytes = base64UrlDecode(VAPID_PRIVATE_KEY)
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    toPkcs8(privateKeyBytes),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  )

  return `${signingInput}.${base64UrlEncode(signature)}`
}

// Convierte raw 32-byte EC private key a PKCS#8
function toPkcs8(rawKey: Uint8Array): ArrayBuffer {
  // PKCS#8 header para P-256
  const prefix = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06,
    0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01,
    0x01, 0x04, 0x20,
  ])
  return concatBuffers(prefix, rawKey).buffer
}

// ─── Cifrado AES-128-GCM (RFC 8291 / RFC 8188) ──────────────────────────────

async function encryptPayload(
  plaintext: string,
  subscriptionPublicKeyB64: string,
  authB64: string
): Promise<{ body: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const encoder = new TextEncoder()
  const plaintextBytes = encoder.encode(plaintext)

  // Clave pública del suscriptor
  const subscriptionPublicKey = base64UrlDecode(subscriptionPublicKeyB64)

  // Auth secret del suscriptor
  const auth = base64UrlDecode(authB64)

  // Generar par de claves efémeras del servidor (P-256)
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )

  // Exportar clave pública del servidor (uncompressed, 65 bytes)
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  )

  // Importar clave pública del suscriptor para ECDH
  const recipientPublicKey = await crypto.subtle.importKey(
    'raw',
    subscriptionPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // ECDH → shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: recipientPublicKey },
      serverKeyPair.privateKey,
      256
    )
  )

  // Generar salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // HKDF para derivar PRK (RFC 8291 §3.3)
  const keyInfo = concatBuffers(
    encoder.encode('WebPush: info\0'),
    subscriptionPublicKey,
    serverPublicKeyRaw
  )

  const hkdfKey = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveBits'])

  const prk = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: auth, info: keyInfo },
    hkdfKey,
    256
  ))

  // Derivar Content Encryption Key (CEK) 16 bytes
  const cekInfo = encoder.encode('Content-Encoding: aes128gcm\0')
  const prkKey = await crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveBits'])
  const cek = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo },
    prkKey,
    128
  ))

  // Derivar Nonce 12 bytes
  const nonceInfo = encoder.encode('Content-Encoding: nonce\0')
  const prkKey2 = await crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveBits'])
  const nonce = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
    prkKey2,
    96
  ))

  // Cifrar con AES-128-GCM
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])

  // Padding: 1 byte delimitador + payload
  const paddedPlaintext = concatBuffers(plaintextBytes, new Uint8Array([2])) // delimiter = 2

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, tagLength: 128 },
      aesKey,
      paddedPlaintext
    )
  )

  // Construir cuerpo RFC 8188:
  // salt (16) + rs (4, BE) + idlen (1) + keyid (serverPublicKey 65) + ciphertext
  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096, false)

  const body = concatBuffers(
    salt,
    rs,
    new Uint8Array([serverPublicKeyRaw.length]),
    serverPublicKeyRaw,
    ciphertext
  )

  return { body, salt, serverPublicKey: serverPublicKeyRaw }
}

// ─── Enviar push a un endpoint ───────────────────────────────────────────────

async function sendPushToEndpoint(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: object
): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const payloadStr = JSON.stringify(payload)

    // Cifrar
    const { body } = await encryptPayload(payloadStr, p256dh, auth)

    // Extraer origen del endpoint para el JWT audience
    const url = new URL(endpoint)
    const audience = `${url.protocol}//${url.host}`

    // Crear JWT VAPID
    const jwt = await createVapidJwt(audience)

    // Cabeceras
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, status: res.status, error: text }
    }

    return { ok: true, status: res.status }
  } catch (err) {
    return { ok: false, status: 0, error: String(err) }
  }
}

// ─── Handler principal ───────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const body = await req.json()
    const {
      user_id,
      user_ids,
      title,
      body: notifBody,
      url: notifUrl = '/',
      tag = 'default',
      data = {},
    } = body

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Construir lista de user IDs
    const targetIds: string[] = []
    if (user_ids && Array.isArray(user_ids)) targetIds.push(...user_ids)
    if (user_id && !targetIds.includes(user_id)) targetIds.push(user_id)

    if (targetIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'user_id or user_ids required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener suscripciones push de los usuarios
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .in('user_id', targetIds)

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      return new Response(
        JSON.stringify({ error: subError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = { title, body: notifBody, icon: '/tazk.svg', badge: '/tazk.svg', tag, data: { url: notifUrl, ...data } }

    // Enviar a todas las suscripciones
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const result = await sendPushToEndpoint(sub.endpoint, sub.p256dh, sub.auth, payload)

        // Si el endpoint devuelve 410 Gone, eliminar la suscripción
        if (result.status === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
          console.log('Removed expired subscription:', sub.endpoint)
        }

        return { user_id: sub.user_id, ...result }
      })
    )

    const sent = results.filter(r => r.ok).length
    const failed = results.filter(r => !r.ok).length

    console.log(`Push sent: ${sent}, failed: ${failed}`)

    return new Response(
      JSON.stringify({ sent, failed, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-push-notification:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
