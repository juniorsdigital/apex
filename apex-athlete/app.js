import { getSessionUser, onAuthStateChange } from './lib/supabase.js'
import { createGuestStore, createCloudStore } from './lib/store.js'
import { parsePlan } from './lib/plan.js'
import { esc, refreshIcons } from './lib/util.js'
import { enterPage } from './lib/motion.js'
import { renderLogin } from './components/LoginView.js'
import { renderSidebar, NAV_ITEMS, LOGO_SVG } from './components/Sidebar.js'
import { renderHeader } from './components/Header.js'
import { renderToday } from './components/TodayView.js'
import { renderPlan } from './components/PlanView.js'
import { renderJournal } from './components/JournalView.js'
import { renderJourney } from './components/JourneyView.js'
import { renderProfile } from './components/ProfileView.js'

// Views a guest can open without signing in.
const GUEST_VIEWS = ['today', 'login']

export const state = {
  user: null,
  store: createGuestStore(),
  profile: {},
  readiness: {},
  journal: {},
  plan: null,        // parsed plan (see lib/plan.js), or null
  planMeta: null,    // { file_name, uploaded_at }
  currentView: 'today',
  loading: true,
  error: null
}

const root = document.getElementById('app')
let shownView = null  // the view on screen, so only a change of page animates

export function navigate(view) {
  state.currentView = !state.user && !GUEST_VIEWS.includes(view) ? 'login' : view
  renderApp()
  window.scrollTo(0, 0)
}

function applyPlan(row) {
  const parsed = row?.csv ? parsePlan(row.csv) : null
  state.plan = parsed && !parsed.error ? parsed : null
  state.planMeta = row ? { file_name: row.file_name, uploaded_at: row.uploaded_at } : null
}

export async function reload() {
  const data = await state.store.load()
  state.profile = data.profile || {}
  state.readiness = data.readiness || {}
  state.journal = data.journal || {}
  applyPlan(data.plan)
  state.error = data.error ? data.error.message : null
  renderApp()
}

/** Validate and save a plan CSV. Returns { error } with a sentence on failure. */
export async function savePlan(fileName, csv) {
  const parsed = parsePlan(csv)
  if (parsed.error) return { error: new Error(parsed.error) }
  const { data, error } = await state.store.savePlan(fileName, csv)
  if (error) return { error }
  applyPlan(data)
  renderApp()
  return { plan: state.plan }
}

export async function saveJournal(date, entry) {
  const { error } = await state.store.saveJournal(date, entry)
  if (!error) state.journal[date] = { ...state.journal[date], ...entry, entry_date: date }
  return { error }
}

export function renderApp() {
  if (state.loading) {
    root.innerHTML = `
      <div class="center-screen">
        <div class="loading" role="status">${LOGO_SVG}<span>Loading your plan…</span></div>
      </div>`
    return
  }
  if (state.currentView === 'login') {
    root.replaceChildren(renderLogin())
    document.title = 'Sign in · Apex'
    refreshIcons()
    if (shownView !== 'login') enterPage(root.firstElementChild)
    shownView = 'login'
    return
  }

  const shell = document.createElement('div')
  shell.className = 'app-shell'
  shell.insertAdjacentHTML('beforeend', `<a class="skip-link" href="#main">Skip to content</a>`)
  shell.appendChild(renderSidebar(state.currentView, !!state.user, state.profile?.full_name || state.user?.email || ''))
  shell.appendChild(renderHeader(state))

  const main = document.createElement('main')
  main.className = 'app-main'
  main.id = 'main'
  main.tabIndex = -1
  if (state.error) {
    main.insertAdjacentHTML('beforeend', `
      <div class="alert alert-error" role="alert" style="margin-bottom:var(--space-6)">
        Couldn't sync with your account, so you may be seeing older entries. Reload the page to try again.
        <span class="faint small">(${esc(state.error)})</span>
      </div>`)
  }
  const views = {
    today: renderToday,
    plan: renderPlan,
    journal: renderJournal,
    journey: renderJourney,
    profile: renderProfile
  }
  const view = (views[state.currentView] || renderToday)(state)
  main.appendChild(view)
  shell.appendChild(main)

  root.replaceChildren(shell)
  document.title = `${NAV_ITEMS.find(n => n.id === state.currentView)?.label || 'Profile'} · Apex`
  refreshIcons()
  if (shownView !== state.currentView) enterPage(view)
  shownView = state.currentView
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
