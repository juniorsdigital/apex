// Supabase client — loaded lazily so the guest dashboard never depends on it.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js'

let clientPromise = null

export function getClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('https://esm.sh/@supabase/supabase-js@2.45.4')
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY))
      .catch(err => { console.warn('Supabase unavailable:', err); return null })
  }
  return clientPromise
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

export async function sendMagicLink(email) {
  const sb = await getClient()
  if (!sb) return { error: new Error('Sign-in is not configured. See config.js.') }
  const unreachable = new Error("Couldn't reach the sign-in server. Check your connection, or that the Supabase project in config.js is running.")
  try {
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    })
    if (error && (error.status === 0 || /fetch/i.test(error.name + error.message))) return { error: unreachable }
    return { error }
  } catch {
    return { error: unreachable }
  }
}

// The installed app (home screen) keeps its own storage, so a link opened from
// the mail app signs in the browser instead. The code from the same email
// signs in right here.
export async function verifyEmailCode(email, token) {
  const sb = await getClient()
  if (!sb) return { error: new Error('Sign-in is not configured. See config.js.') }
  try {
    const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' })
    return { error }
  } catch {
    return { error: new Error("Couldn't reach the sign-in server. Check your connection and try again.") }
  }
}

export async function signOut() {
  const sb = await getClient()
  if (sb) await sb.auth.signOut()
}

export async function getSessionUser() {
  const sb = await getClient()
  if (!sb) return null
  try {
    const { data } = await sb.auth.getSession()
    return data.session?.user || null
  } catch {
    return null
  }
}

export async function onAuthStateChange(callback) {
  const sb = await getClient()
  if (!sb) return
  sb.auth.onAuthStateChange((_event, session) => callback(session?.user || null))
}
