// Data layer. Guests keep everything in localStorage; signed-in riders sync
// to Supabase. Both stores expose the same methods so views don't care which.
import { getClient } from './supabase.js'

const GUEST_KEY = 'apex.guest.v1'

export const RIDE_FIELDS = [
  'ride_date', 'title', 'ride_type', 'status', 'duration_min', 'distance_km',
  'elevation_m', 'avg_power_w', 'avg_hr', 'rpe', 'notes'
]

function pickRide(ride) {
  const out = {}
  for (const f of RIDE_FIELDS) out[f] = ride[f] ?? null
  return out
}

function byDate(a, b) {
  return a.ride_date.localeCompare(b.ride_date) || (a.created_at || '').localeCompare(b.created_at || '')
}

// ─── GUEST (this browser only) ───────────────────────────────────────────────

function readGuest() {
  try {
    const data = JSON.parse(localStorage.getItem(GUEST_KEY))
    if (data && Array.isArray(data.rides)) return { profile: {}, readiness: {}, ...data }
  } catch {}
  return { profile: {}, rides: [], readiness: {} }
}

function writeGuest(data) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(data)) } catch {}
}

export function guestDataCount() {
  return readGuest().rides.length
}

export function clearGuestData() {
  try { localStorage.removeItem(GUEST_KEY) } catch {}
}

export function createGuestStore() {
  return {
    kind: 'guest',

    async load() {
      const data = readGuest()
      return { profile: data.profile, rides: data.rides.sort(byDate), readiness: data.readiness }
    },

    async saveRide(ride) {
      const data = readGuest()
      const now = new Date().toISOString()
      let saved
      if (ride.id) {
        const i = data.rides.findIndex(r => r.id === ride.id)
        saved = { ...data.rides[i], ...pickRide(ride), updated_at: now }
        data.rides[i] = saved
      } else {
        saved = { id: crypto.randomUUID(), ...pickRide(ride), created_at: now, updated_at: now }
        data.rides.push(saved)
      }
      writeGuest(data)
      return { data: saved, error: null }
    },

    async deleteRide(id) {
      const data = readGuest()
      data.rides = data.rides.filter(r => r.id !== id)
      writeGuest(data)
      return { error: null }
    },

    async saveReadiness(date, values) {
      const data = readGuest()
      data.readiness[date] = values
      writeGuest(data)
      return { error: null }
    },

    async saveProfile(updates) {
      const data = readGuest()
      data.profile = { ...data.profile, ...updates }
      writeGuest(data)
      return { data: data.profile, error: null }
    }
  }
}

// ─── CLOUD (Supabase, signed in) ─────────────────────────────────────────────

export function createCloudStore(user) {
  const uid = user.id

  return {
    kind: 'cloud',

    async load() {
      const sb = await getClient()
      const since = new Date()
      since.setDate(since.getDate() - 60)
      const [profile, rides, readiness] = await Promise.all([
        sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
        sb.from('rides').select('*').eq('user_id', uid).order('ride_date'),
        sb.from('readiness').select('*').eq('user_id', uid).gte('check_date', since.toISOString().slice(0, 10))
      ])
      const error = profile.error || rides.error || readiness.error
      const readinessMap = {}
      for (const r of readiness.data || []) {
        readinessMap[r.check_date] = { sleep: r.sleep, energy: r.energy, soreness: r.soreness }
      }
      return {
        profile: profile.data || {},
        rides: (rides.data || []).sort(byDate),
        readiness: readinessMap,
        error
      }
    },

    async saveRide(ride) {
      const sb = await getClient()
      const row = { ...pickRide(ride), user_id: uid, updated_at: new Date().toISOString() }
      const query = ride.id
        ? sb.from('rides').update(row).eq('id', ride.id).eq('user_id', uid)
        : sb.from('rides').insert(row)
      const { data, error } = await query.select().single()
      return { data, error }
    },

    async deleteRide(id) {
      const sb = await getClient()
      const { error } = await sb.from('rides').delete().eq('id', id).eq('user_id', uid)
      return { error }
    },

    async saveReadiness(date, values) {
      const sb = await getClient()
      const { error } = await sb.from('readiness')
        .upsert({ user_id: uid, check_date: date, ...values }, { onConflict: 'user_id,check_date' })
      return { error }
    },

    async saveProfile(updates) {
      const sb = await getClient()
      const { data, error } = await sb.from('profiles')
        .upsert({ id: uid, ...updates, updated_at: new Date().toISOString() })
        .select()
        .single()
      return { data, error }
    },

    // Copy anything logged as a guest on this device into the account.
    async importGuestData() {
      const sb = await getClient()
      const guest = readGuest()
      if (guest.rides.length) {
        const { error } = await sb.from('rides').insert(guest.rides.map(r => ({ ...pickRide(r), user_id: uid })))
        if (error) return { error }
      }
      const readinessRows = Object.entries(guest.readiness)
        .map(([check_date, v]) => ({ user_id: uid, check_date, ...v }))
      if (readinessRows.length) {
        const { error } = await sb.from('readiness').upsert(readinessRows, { onConflict: 'user_id,check_date' })
        if (error) return { error }
      }
      clearGuestData()
      return { error: null }
    }
  }
}
