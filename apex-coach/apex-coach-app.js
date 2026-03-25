import { onAuthStateChange, getUser } from './apex-auth.js'
import { renderLogin } from './components/LoginView.js'
import { renderSidebar } from './components/Sidebar.js'
import { renderHeader } from './components/Header.js'
import { renderDashboard } from './components/DashboardView.js'
import { renderCalendar } from './components/CalendarView.js'
import { renderLoadStrain } from './components/LoadStrainView.js'
import { renderWorkoutBank } from './components/WorkoutBankView.js'
import { renderPrograms } from './components/ProgramsView.js'
import { renderAthletes } from './components/AthletesView.js'
import { SEED_ATHLETES, SEED_SESSIONS, SEED_TEMPLATES, SEED_PROGRAMS } from './apex-seed-data.js'

// ─── App State ───────────────────────────────────────────────────────────────
// All mutations go through setState() to keep state changes traceable.
export const state = {
  user: null,
  profile: null,
  currentView: 'dashboard',
  // Data — seeded locally, will be replaced by Supabase calls in prod
  athletes: [],
  selectedAthleteId: null,
  workouts: [],      // scheduled/completed sessions for selected athlete
  templates: [],     // workout bank templates
  programs: [],      // training programs
  loading: true
}

export function setState(patch) {
  Object.assign(state, patch)
}

const root = document.getElementById('app')

// ─── Derived helper ──────────────────────────────────────────────────────────
export function selectedAthlete() {
  return state.athletes.find(a => a.id === state.selectedAthleteId) || state.athletes[0] || null
}

export function workoutsForAthlete(athleteId) {
  return state.workouts.filter(w => w.athlete_id === athleteId)
}

// ─── Router ──────────────────────────────────────────────────────────────────
export function navigate(view) {
  state.currentView = view
  renderApp()
}

// ─── Render ───────────────────────────────────────────────────────────────────
export function renderApp() {
  if (state.loading) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100dvh;color:var(--color-text-muted);font-size:var(--text-sm)">Loading…</div>`
    return
  }

  if (!state.user) {
    root.innerHTML = ''
    root.appendChild(renderLogin())
    return
  }

  root.innerHTML = ''
  const shell = document.createElement('div')
  shell.className = 'app-shell'

  shell.appendChild(renderSidebar(state.currentView, navigate, state))
  shell.appendChild(renderHeader(state.currentView, state.user, state.profile, state, navigate))

  const main = document.createElement('main')
  main.className = 'app-main'

  const athlete = selectedAthlete()
  const athleteWorkouts = athlete ? workoutsForAthlete(athlete.id) : []
  const viewState = { ...state, workouts: athleteWorkouts, athlete }

  switch (state.currentView) {
    case 'dashboard':
      main.appendChild(renderDashboard(viewState))
      break
    case 'calendar':
      main.appendChild(renderCalendar(viewState))
      break
    case 'load-strain':
      main.appendChild(renderLoadStrain(viewState))
      break
    case 'workout-bank':
      main.appendChild(renderWorkoutBank(viewState))
      break
    case 'programs':
      main.appendChild(renderPrograms(viewState))
      break
    case 'athletes':
      main.appendChild(renderAthletes(viewState))
      break
    default:
      main.innerHTML = `<p style="padding:var(--space-8);color:var(--color-text-muted)">View not found.</p>`
  }

  shell.appendChild(main)
  root.appendChild(shell)

  if (window.lucide) window.lucide.createIcons()
}

// ─── Init ────────────────────────────────────────────────────────────────────
async function init() {
  const lucideScript = document.createElement('script')
  lucideScript.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js'
  document.head.appendChild(lucideScript)

  const chartScript = document.createElement('script')
  chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js'
  document.head.appendChild(chartScript)

  // DEV: bypass Supabase auth
  state.user = { id: 'coach-dev-001', email: 'admin@apex.dev' }
  state.profile = { full_name: 'Dev Coach', role: 'coach' }

  // Seed local data
  state.athletes = [...SEED_ATHLETES]
  state.workouts = [...SEED_SESSIONS]
  state.templates = [...SEED_TEMPLATES]
  state.programs = [...SEED_PROGRAMS]
  state.selectedAthleteId = SEED_ATHLETES[0].id

  state.loading = false
  renderApp()
}

init()
