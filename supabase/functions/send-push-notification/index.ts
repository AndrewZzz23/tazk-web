// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushPayload {
  user_id?: string
  user_ids?: string[]
  title: string
  body: string
  url?: string
  tag?: string
  data?: Record<string, unknown>
}

// ========== Web Push Implementation ==========

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  return uint8ArrayToBase64Url(new Uint8Array(buffer))
}

// Create unsigned JWT token
function createUnsignedToken(header: object, payload: object): string {
  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)))
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  return `${headerB64}.${payloadB64}`
}

// Import ECDSA private key using JWK format
async function importPrivateKey(privateKeyBase64: string, publicKeyBase64: string): Promise<CryptoKey> {
  // For VAPID, we need both private key (d) and public key point (x, y)
  // The public key is 65 bytes: 0x04 + x (32 bytes) + y (32 bytes)
  const publicKeyBytes = base64UrlToUint8Array(publicKeyBase64)

  // Extract x and y from uncompressed public key (skip 0x04 prefix)
  const x = publicKeyBytes.slice(1, 33)
  const y = publicKeyBytes.slice(33, 65)

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: uint8ArrayToBase64Url(x),
    y: uint8ArrayToBase64Url(y),
    d: privateKeyBase64, // Already in base64url format
  }

  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
}

// Sign JWT with ECDSA
async function signJwt(privateKey: CryptoKey, unsignedToken: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  )

  const sigBytes = new Uint8Array(signature)
  let r: Uint8Array, s: Uint8Array

  // Handle both raw (64 bytes) and DER format
  if (sigBytes.length === 64) {
    r = sigBytes.slice(0, 32)
    s = sigBytes.slice(32)
  } else {
    // DER format parsing
    let offset = 2
    const rLen = sigBytes[offset + 1]
    offset += 2
    let rBytes = sigBytes.slice(offset, offset + rLen)
    offset += rLen
    offset += 1
    const sLen = sigBytes[offset]
    offset += 1
    let sBytes = sigBytes.slice(offset, offset + sLen)

    // Remove leading zeros if present
    if (rBytes.length > 32) rBytes = rBytes.slice(rBytes.length - 32)
    if (sBytes.length > 32) sBytes = sBytes.slice(sBytes.length - 32)

    // Pad to 32 bytes if needed
    r = new Uint8Array(32)
    s = new Uint8Array(32)
    r.set(rBytes, 32 - rBytes.length)
    s.set(sBytes, 32 - sBytes.length)
  }

  const rawSig = new Uint8Array(64)
  rawSig.set(r, 0)
  rawSig.set(s, 32)

  return `${unsignedToken}.${uint8ArrayToBase64Url(rawSig)}`
}

// Create VAPID JWT
async function createVapidJwt(audience: string, subject: string, privateKey: CryptoKey): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject
  }

  const unsignedToken = createUnsignedToken(header, payload)
  return await signJwt(privateKey, unsignedToken)
}

// Encrypt payload using aes128gcm
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ encrypted: Uint8Array; localPublicKey: Uint8Array; salt: Uint8Array }> {
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
  const localPublicKey = new Uint8Array(localPublicKeyRaw)

  // Import subscriber's public key
  const subscriberPublicKeyBytes = base64UrlToUint8Array(p256dhKey)
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    subscriberPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Derive shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  )

  const sharedSecret = new Uint8Array(sharedSecretBits)
  const authSecretBytes = base64UrlToUint8Array(authSecret)

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // HKDF to derive IKM
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  )

  // Create info for auth
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0')
  const ikmBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSecretBytes, info: authInfo },
    sharedSecretKey,
    256
  )

  const ikmKey = await crypto.subtle.importKey(
    'raw',
    ikmBits,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  )

  // Derive CEK (Content Encryption Key)
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0')
  const cekBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: salt, info: cekInfo },
    ikmKey,
    128
  )

  // Derive nonce
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0')
  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: salt, info: nonceInfo },
    ikmKey,
    96
  )

  // Import CEK for AES-GCM
  const cek = await crypto.subtle.importKey(
    'raw',
    cekBits,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  // Prepare plaintext with padding delimiter
  const payloadBytes = new TextEncoder().encode(payload)
  const plaintext = new Uint8Array(payloadBytes.length + 1)
  plaintext.set(payloadBytes)
  plaintext[payloadBytes.length] = 2 // Padding delimiter

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonceBits, tagLength: 128 },
    cek,
    plaintext
  )

  // Build aes128gcm content
  const recordSize = 4096
  const headerSize = 16 + 4 + 1 + localPublicKey.length // salt + rs + idlen + keyid

  const encrypted = new Uint8Array(headerSize + ciphertext.byteLength)
  let offset = 0

  // Salt (16 bytes)
  encrypted.set(salt, offset)
  offset += 16

  // Record size (4 bytes, big endian)
  encrypted[offset++] = (recordSize >> 24) & 0xff
  encrypted[offset++] = (recordSize >> 16) & 0xff
  encrypted[offset++] = (recordSize >> 8) & 0xff
  encrypted[offset++] = recordSize & 0xff

  // Key ID length (1 byte)
  encrypted[offset++] = localPublicKey.length

  // Key ID (local public key)
  encrypted.set(localPublicKey, offset)
  offset += localPublicKey.length

  // Ciphertext
  encrypted.set(new Uint8Array(ciphertext), offset)

  return { encrypted, localPublicKey, salt }
}

// Send Web Push notification
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const url = new URL(subscription.endpoint)
    const audience = `${url.protocol}//${url.host}`
    console.log(`Audience: ${audience}`)

    // Import private key and create JWT
    console.log('Importing private key...')
    const privateKey = await importPrivateKey(vapidPrivateKey, vapidPublicKey)
    console.log('Creating VAPID JWT...')
    const jwt = await createVapidJwt(audience, 'mailto:hello@tazk.app', privateKey)
    console.log('JWT created successfully')

    // Encrypt payload
    console.log('Encrypting payload...')
    const payloadString = JSON.stringify(payload)
    const { encrypted } = await encryptPayload(
      payloadString,
      subscription.p256dh,
      subscription.auth
    )
    console.log(`Encrypted payload size: ${encrypted.length} bytes`)

    // Send request
    console.log(`Sending to endpoint: ${subscription.endpoint.substring(0, 60)}...`)
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: encrypted,
    })

    console.log(`Response status: ${response.status}`)

    if (response.status === 201 || response.status === 200) {
      return { success: true, status: response.status }
    } else {
      const text = await response.text()
      console.log(`Response body: ${text}`)
      return { success: false, status: response.status, error: text }
    }
  } catch (error) {
    console.error('sendWebPush error:', error)
    return { success: false, error: error.message || String(error) }
  }
}

// ========== Main Handler ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== Push notification function called ===')

    const payload: PushPayload = await req.json()
    console.log('Payload:', JSON.stringify(payload))

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured')
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

    // Get user IDs
    const userIds: string[] = payload.user_ids?.length ? payload.user_ids :
                              payload.user_id ? [payload.user_id] : []

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No user IDs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Target users:', userIds)

    // Get subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (subError) {
      console.error('DB error:', subError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions`)

    if (!subscriptions?.length) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Notification payload
    const notificationPayload = {
      title: payload.title,
      body: payload.body,
      icon: '/tazk.svg',
      badge: '/tazk.svg',
      tag: payload.tag || 'default',
      data: { url: payload.url || '/', ...payload.data }
    }

    let sent = 0
    let failed = 0
    const expiredIds: string[] = []

    for (const sub of subscriptions) {
      if (!sub.endpoint || !sub.p256dh || !sub.auth) {
        console.log(`Invalid subscription ${sub.id}`)
        expiredIds.push(sub.id)
        failed++
        continue
      }

      console.log(`Sending to ${sub.id}...`)

      const result = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        notificationPayload,
        vapidPublicKey,
        vapidPrivateKey
      )

      if (result.success) {
        console.log(`Success: ${sub.id}`)
        sent++
      } else {
        console.log(`Failed ${sub.id}: ${result.status} - ${result.error}`)
        failed++
        // 404 or 410 means subscription expired
        if (result.status === 404 || result.status === 410) {
          expiredIds.push(sub.id)
        }
      }
    }

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      console.log('Removing expired:', expiredIds)
      await supabase.from('push_subscriptions').delete().in('id', expiredIds)
    }

    console.log(`=== Complete: sent=${sent}, failed=${failed} ===`)

    return new Response(
      JSON.stringify({ message: 'Done', sent, failed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
