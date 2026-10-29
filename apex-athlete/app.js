import { getSessionUser, onAuthStateChange } from './lib/supabase.js'
import { createGuestStore, createCloudStore } from './lib/store.js'
import { parsePlan } from './lib/plan.js'
import { parseNutrition } from './lib/nutrition.js'
import { esc, refreshIcons } from './lib/util.js'
import { enterPage, grow } from './lib/motion.js'
import { renderLogin } from './components/LoginView.js'
import { renderSidebar, NAV_ITEMS, LOGO_SVG } from './components/Sidebar.js'
import { renderHeader } from './components/Header.js'
import { renderToday } from './components/TodayView.js'
import { renderPlan } from './components/PlanView.js'
import { renderJournal } from './components/JournalView.js'
import { renderJourney } from './components/JourneyView.js'
import { renderProfile } from './components/ProfileView.js'
import { renderFuelToday } from './components/FuelToday.js'
import { renderGroceries } from './components/GroceryView.js'
import { renderFuelPlan } from './components/FuelPlan.js'

// Views a guest can open without signing in.
export const GUEST_VIEWS = ['today', 'login', 'fuel-today', 'fuel-groceries', 'fuel-plan']

// Two apps in one: Train (the training plan) and Fuel (meals and groceries).
// Fuel's views start with "fuel-"; each mode remembers the page it was on.
const MODE_KEY = 'apex.mode'
export const modeOf = view => (view.startsWith('fuel-') ? 'fuel' : 'train')
const lastView = { train: 'today', fuel: 'fuel-today' }
function savedMode() {
  try { return localStorage.getItem(MODE_KEY) === 'fuel' ? 'fuel' : 'train' } catch { return 'train' }
}

export const state = {
  user: null,
  store: createGuestStore(),
  profile: {},
  readiness: {},
  journal: {},
  plan: null,        // parsed plan (see lib/plan.js), or null
  planMeta: null,    // { file_name, uploaded_at }
  nutrition: null,   // parsed nutrition plan (see lib/nutrition.js), or null
  nutritionMeta: null,
  checks: {},        // meals eaten and groceries in the cart, by key
  currentView: lastView[savedMode()],
  loading: true,
  error: null
}

const root = document.getElementById('app')
let shownView = null  // the view on screen, so only a change of page animates
let growing = false   // a mode switch brings its own motion

export function navigate(view) {
  state.currentView = !state.user && !GUEST_VIEWS.includes(view) ? 'login' : view
  if (state.currentView !== 'login') lastView[modeOf(state.currentView)] = state.currentView
  renderApp()
  window.scrollTo(0, 0)
}

/** Swap between Train and Fuel, growing the other one out of `origin`. */
export function switchMode(origin) {
  const next = modeOf(state.currentView) === 'fuel' ? 'train' : 'fuel'
  try { localStorage.setItem(MODE_KEY, next) } catch {}
  growing = true
  grow(origin, () => {
    navigate(lastView[next])
    // Keep focus on the switch so keyboard users stay where they were.
    const sw = [...document.querySelectorAll('[data-mode-switch]')].find(b => b.offsetParent !== null)
    sw?.focus({ preventScroll: true })
    growing = false
  })
}

function applyPlan(row) {
  const parsed = row?.csv ? parsePlan(row.csv) : null
  state.plan = parsed && !parsed.error ? parsed : null
  state.planMeta = row ? { file_name: row.file_name, uploaded_at: row.uploaded_at } : null
}

function applyNutrition(row) {
  const parsed = row?.csv ? parseNutrition(row.csv) : null
  state.nutrition = parsed && !parsed.error ? parsed : null
  state.nutritionMeta = row ? { file_name: row.file_name, uploaded_at: row.uploaded_at } : null
  state.checks = row?.checks || {}
}

export async function reload() {
  const data = await state.store.load()
  state.profile = data.profile || {}
  state.readiness = data.readiness || {}
  state.journal = data.journal || {}
  applyPlan(data.plan)
  applyNutrition(data.nutrition)
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

/** Validate and save a nutrition CSV. Returns { error } with a sentence on failure. */
export async function saveNutrition(fileName, csv) {
  const parsed = parseNutrition(csv)
  if (parsed.error) return { error: new Error(parsed.error) }
  const { data, error } = await state.store.saveNutrition(fileName, csv)
  if (error) return { error }
  applyNutrition(data)
  renderApp()
  return { nutrition: state.nutrition }
}

/** Tick a meal eaten or a grocery in the cart (or untick it). Saved in the background. */
export function setCheck(key, on) {
  return setChecks([key], on)
}

export async function setChecks(keys, on) {
  for (const k of keys) {
    if (on) state.checks[k] = true
    else delete state.checks[k]
  }
  return state.store.saveChecks({ ...state.checks })
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

  const mode = modeOf(state.currentView)
  document.documentElement.dataset.mode = mode
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
    profile: renderProfile,
    'fuel-today': renderFuelToday,
    'fuel-groceries': renderGroceries,
    'fuel-plan': renderFuelPlan
  }
  const view = (views[state.currentView] || renderToday)(state)
  main.appendChild(view)
  shell.appendChild(main)

  root.replaceChildren(shell)
  document.title = `${NAV_ITEMS.find(n => n.id === state.currentView)?.label || 'Profile'} · Apex${mode === 'fuel' ? ' Fuel' : ''}`
  refreshIcons()
  if (shownView !== state.currentView && !growing) enterPage(view)
  shownView = state.currentView
}

async function setUser(user) {
  if ((user?.id || null) === (state.user?.id || null)) return
  state.user = user
  state.store = user ? createCloudStore(user) : createGuestStore()
  if (!user && !GUEST_VIEWS.includes(state.currentView)) state.currentView = modeOf(state.currentView) === 'fuel' ? 'fuel-today' : 'today'
  if (user && state.currentView === 'login') state.currentView = lastView[savedMode()]
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
