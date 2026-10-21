import { getSessionUser, onAuthStateChange } from './lib/supabase.js'
import { createGuestStore, createCloudStore } from './lib/store.js'
import { esc, refreshIcons } from './lib/util.js'
import { renderLogin } from './components/LoginView.js'
import { renderSidebar, NAV_ITEMS } from './components/Sidebar.js'
import { renderHeader } from './components/Header.js'
import { renderToday } from './components/TodayView.js'
import { renderCalendar } from './components/CalendarView.js'
import { renderHistory } from './components/HistoryView.js'
import { renderProgress } from './components/ProgressView.js'
import { renderProfile } from './components/ProfileView.js'

// Views a guest can open without signing in.
const GUEST_VIEWS = ['today', 'login']

export const state = {
  user: null,
  store: createGuestStore(),
  profile: {},
  rides: [],
  readiness: {},
  currentView: 'today',
  loading: true,
  error: null
}

const root = document.getElementById('app')

export function navigate(view) {
  state.currentView = !state.user && !GUEST_VIEWS.includes(view) ? 'login' : view
  renderApp()
  window.scrollTo(0, 0)
}

export async function reload() {
  const data = await state.store.load()
  state.profile = data.profile || {}
  state.rides = data.rides || []
  state.readiness = data.readiness || {}
  state.error = data.error ? data.error.message : null
  renderApp()
}

// Save a ride through the active store and keep local state in sync.
export async function saveRide(ride) {
  const { data, error } = await state.store.saveRide(ride)
  if (error) return { error }
  const i = state.rides.findIndex(r => r.id === data.id)
  if (i >= 0) state.rides[i] = data
  else state.rides.push(data)
  state.rides.sort((a, b) => a.ride_date.localeCompare(b.ride_date))
  renderApp()
  return { data }
}

export async function deleteRide(id) {
  const { error } = await state.store.deleteRide(id)
  if (error) return { error }
  state.rides = state.rides.filter(r => r.id !== id)
  renderApp()
  return {}
}

export function renderApp() {
  if (state.loading) {
    root.innerHTML = `<div class="center-screen muted">Loading…</div>`
    return
  }
  if (state.currentView === 'login') {
    root.replaceChildren(renderLogin())
    document.title = 'Sign in · Apex'
    refreshIcons()
    return
  }

  const shell = document.createElement('div')
  shell.className = 'app-shell'
  shell.appendChild(renderSidebar(state.currentView, !!state.user))
  shell.appendChild(renderHeader(state))

  const main = document.createElement('main')
  main.className = 'app-main'
  if (state.error) {
    main.insertAdjacentHTML('beforeend', `<div class="alert alert-error">Couldn't sync with your account: ${esc(state.error)}</div>`)
  }
  const views = {
    today: renderToday,
    calendar: renderCalendar,
    history: renderHistory,
    progress: renderProgress,
    profile: renderProfile
  }
  main.appendChild((views[state.currentView] || renderToday)(state))
  shell.appendChild(main)

  root.replaceChildren(shell)
  document.title = `${NAV_ITEMS.find(n => n.id === state.currentView)?.label || 'Today'} · Apex`
  refreshIcons()
}

async function setUser(user) {
  if ((user?.id || null) === (state.user?.id || null)) return
  state.user = user
  state.store = user ? createCloudStore(user) : createGuestStore()
  if (!user && !GUEST_VIEWS.includes(state.currentView)) state.currentView = 'today'
  if (user && state.currentView === 'login') state.currentView = 'today'
  await reload()
}

async function init() {
  renderApp()
  state.user = await getSessionUser()
  if (state.user) state.store = createCloudStore(state.user)
  state.loading = false
  await reload()
  onAuthStateChange(setUser)
}

init()
