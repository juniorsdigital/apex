// Data layer. Guests keep everything in localStorage; signed-in riders sync
// to Supabase. Both stores expose the same methods so views don't care which.
import { getClient } from './supabase.js'

const GUEST_KEY = 'apex.guest.v2'

export const JOURNAL_FIELDS = ['workout_feel', 'workout_note', 'headspace', 'headspace_note', 'note']

function pickJournal(entry) {
  const out = {}
  for (const f of JOURNAL_FIELDS) out[f] = entry[f] ?? null
  return out
}

// ─── GUEST (this browser only) ───────────────────────────────────────────────

function readGuest() {
  try {
    const data = JSON.parse(localStorage.getItem(GUEST_KEY))
    if (data) return { profile: {}, readiness: {}, journal: {}, plan: null, ...data }
  } catch {}
  return { profile: {}, readiness: {}, journal: {}, plan: null }
}

function writeGuest(data) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(data))
    return null
  } catch {
    return new Error('this browser is out of storage space')
  }
}

export function guestDataCount() {
  const g = readGuest()
  return Object.keys(g.journal).length + Object.keys(g.readiness).length + (g.plan ? 1 : 0)
}

export function clearGuestData() {
  try { localStorage.removeItem(GUEST_KEY) } catch {}
}

export function createGuestStore() {
  return {
    kind: 'guest',

    async load() {
      const { profile, readiness, journal, plan } = readGuest()
      return { profile, readiness, journal, plan }
    },

    async savePlan(file_name, csv) {
      const data = readGuest()
      data.plan = { file_name, csv, uploaded_at: new Date().toISOString() }
      return { data: data.plan, error: writeGuest(data) }
    },

    async saveJournal(date, entry) {
      const data = readGuest()
      data.journal[date] = { ...pickJournal(entry), updated_at: new Date().toISOString() }
      return { error: writeGuest(data) }
    },

    async saveReadiness(date, values) {
      const data = readGuest()
      data.readiness[date] = values
      return { error: writeGuest(data) }
    },

    async saveProfile(updates) {
      const data = readGuest()
      data.profile = { ...data.profile, ...updates }
      return { data: data.profile, error: writeGuest(data) }
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
      const [profile, readiness, journal, plan] = await Promise.all([
        sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
        sb.from('readiness').select('*').eq('user_id', uid),
        sb.from('journal').select('*').eq('user_id', uid),
        sb.from('training_plans').select('*').eq('user_id', uid).maybeSingle()
      ])
      const error = profile.error || readiness.error || journal.error || plan.error
      const readinessMap = {}
      for (const r of readiness.data || []) {
        readinessMap[r.check_date] = { sleep: r.sleep, energy: r.energy, soreness: r.soreness }
      }
      const journalMap = {}
      for (const j of journal.data || []) journalMap[j.entry_date] = j
      return { profile: profile.data || {}, readiness: readinessMap, journal: journalMap, plan: plan.data, error }
    },

    async savePlan(file_name, csv) {
      const sb = await getClient()
      const { data, error } = await sb.from('training_plans')
        .upsert({ user_id: uid, file_name, csv, uploaded_at: new Date().toISOString() }, { onConflict: 'user_id' })
        .select().single()
      return { data, error }
    },

    async saveJournal(date, entry) {
      const sb = await getClient()
      const { error } = await sb.from('journal')
        .upsert({ user_id: uid, entry_date: date, ...pickJournal(entry), updated_at: new Date().toISOString() }, { onConflict: 'user_id,entry_date' })
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
      const row = { ...updates, updated_at: new Date().toISOString() }
      // The signup trigger normally creates the profile row, so update it;
      // insert only if it's missing (e.g. a fresh project from schema.sql).
      let { data, error } = await sb.from('profiles').update(row).eq('id', uid).select().maybeSingle()
      if (!error && !data) {
        ({ data, error } = await sb.from('profiles').insert({ id: uid, ...row }).select().single())
      }
      return { data, error }
    },

    // Copy anything kept as a guest on this device into the account.
    async importGuestData() {
      const sb = await getClient()
      const guest = readGuest()
      if (guest.plan) {
        const { error } = await this.savePlan(guest.plan.file_name, guest.plan.csv)
        if (error) return { error }
      }
      const journalRows = Object.entries(guest.journal)
        .map(([entry_date, v]) => ({ user_id: uid, entry_date, ...pickJournal(v) }))
      if (journalRows.length) {
        const { error } = await sb.from('journal').upsert(journalRows, { onConflict: 'user_id,entry_date' })
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
