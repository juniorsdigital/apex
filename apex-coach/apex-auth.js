// Re-exports auth helpers from shared Supabase client
export {
  sendMagicLink,
  signOut,
  getUser,
  onAuthStateChange
} from '../shared/apex-supabase.js'
