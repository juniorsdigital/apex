import { onAuthStateChange, getUser } from './apex-auth.js'
import { renderLogin } from './components/LoginView.js'
import { renderSidebar } from './components/Sidebar.js'
import { renderHeader } from './components/Header.js'
import { renderDashboard } from './components/DashboardView.js'
import { renderCalendar } from './components/CalendarView.js'
import { renderLoadStrain } from './components/LoadStrainView.js'

// ─── App State ───────────────────────────────────────────────────────────────
const state = {
  user: null,
  profile: null,
  currentView: 'dashboard', // 'dashboard' | 'calendar' | 'load-strain'
  workouts: [],
  athletes: [],
  loading: true
}

const root = document.getElementById('app')

// ─── Router ──────────────────────────────────────────────────────────────────
export function navigate(view) {
  state.currentView = view
  renderApp()
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderApp() {
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

  shell.appendChild(renderSidebar(state.currentView, navigate))
  shell.appendChild(renderHeader(state.currentView, state.user, state.profile))

  const main = document.createElement('main')
  main.className = 'app-main'

  switch (state.currentView) {
    case 'dashboard':
      main.appendChild(renderDashboard(state))
      break
    case 'calendar':
      main.appendChild(renderCalendar(state))
      break
    case 'load-strain':
      main.appendChild(renderLoadStrain(state))
      break
  }

  shell.appendChild(main)
  root.appendChild(shell)

  // Init Lucide icons after DOM insert
  if (window.lucide) window.lucide.createIcons()
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  // Load Lucide icons
  const lucideScript = document.createElement('script')
  lucideScript.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js'
  document.head.appendChild(lucideScript)

  // Load Chart.js
  const chartScript = document.createElement('script')
  chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js'
  document.head.appendChild(chartScript)

  onAuthStateChange(async (event, session) => {
    state.loading = false
    if (session?.user) {
      state.user = session.user
      // Optionally fetch profile here
    } else {
      state.user = null
      state.profile = null
    }
    renderApp()
  })

  // Initial check
  const user = await getUser()
  if (!user) {
    state.loading = false
    renderApp()
  }
}

init()
