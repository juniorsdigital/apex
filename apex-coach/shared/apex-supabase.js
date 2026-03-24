// Apex Training — Supabase client (shared by both apps)
// Project: xcvicaszlowmnyjrslvp | Region: us-east-2
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://xcvicaszlowmnyjrslvp.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_nerCwwTWxCCvAZJP9wotgQ_lTVvvfYR'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── AUTH ────────────────────────────────────────────────────────────────────

export async function sendMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin }
  })
  return { error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}

// ─── PROFILES ────────────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  return { data, error }
}

export async function upsertProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single()
  return { data, error }
}

// ─── WORKOUTS ────────────────────────────────────────────────────────────────

export async function getWorkoutsForAthlete(athleteId) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('workout_date')
  return { data, error }
}

export async function getWorkoutsForCoach(coachId) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*, profiles!workouts_athlete_id_fkey(full_name, avatar_url)')
    .eq('coach_id', coachId)
    .order('workout_date')
  return { data, error }
}

export async function assignWorkout(payload) {
  // payload: { coach_id, athlete_id, title, description, workout_date,
  //            duration_minutes, type, notes }
  const { data, error } = await supabase
    .from('workouts')
    .insert({ ...payload, status: 'assigned' })
    .select()
    .single()
  return { data, error }
}

export async function updateWorkoutStatus(workoutId, status) {
  const { data, error } = await supabase
    .from('workouts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', workoutId)
    .select()
    .single()
  return { data, error }
}

export async function deleteWorkout(workoutId) {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId)
  return { error }
}

// ─── MESSAGES ────────────────────────────────────────────────────────────────

export async function getConversation(userId, otherUserId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),` +
      `and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
    )
    .order('created_at')
  return { data, error }
}

export async function sendMessage(senderId, receiverId, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, content })
    .select()
    .single()
  return { data, error }
}

export async function markMessagesRead(receiverId) {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('receiver_id', receiverId)
    .eq('is_read', false)
  return { error }
}

export function subscribeToMessages(receiverId, callback) {
  return supabase
    .channel(`messages:${receiverId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `receiver_id=eq.${receiverId}`
    }, callback)
    .subscribe()
}

// ─── PACKAGES ────────────────────────────────────────────────────────────────

export async function getActivePackages() {
  const { data, error } = await supabase
    .from('packages')
    .select('*, profiles(full_name, avatar_url)')
    .eq('is_active', true)
  return { data, error }
}

export async function createPackage(coachId, pkg) {
  const { data, error } = await supabase
    .from('packages')
    .insert({ coach_id: coachId, ...pkg })
    .select()
    .single()
  return { data, error }
}

// ─── REQUESTS ────────────────────────────────────────────────────────────────

export async function sendRequest(athleteId, coachId, packageId, message) {
  const { data, error } = await supabase
    .from('requests')
    .insert({ athlete_id: athleteId, coach_id: coachId, package_id: packageId, message, status: 'pending' })
    .select()
    .single()
  return { data, error }
}

export async function updateRequestStatus(requestId, status) {
  const { data, error } = await supabase
    .from('requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single()
  return { data, error }
}

export async function getCoachRequests(coachId) {
  const { data, error } = await supabase
    .from('requests')
    .select('*, profiles!requests_athlete_id_fkey(full_name, avatar_url), packages(title)')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// ─── NEWS ─────────────────────────────────────────────────────────────────────

export async function getPublishedNews() {
  const { data, error } = await supabase
    .from('news')
    .select('*, profiles(full_name)')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
  return { data, error }
}

// ─── STORAGE ──────────────────────────────────────────────────────────────────

export async function uploadAvatar(userId, file) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) return { url: null, error }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

export async function uploadWorkoutMedia(workoutId, file) {
  const path = `${workoutId}/${file.name}`
  const { error } = await supabase.storage.from('workout-media').upload(path, file)
  if (error) return { url: null, error }
  const { data } = await supabase.storage.from('workout-media').createSignedUrl(path, 3600)
  return { url: data.signedUrl, error: null }
}
