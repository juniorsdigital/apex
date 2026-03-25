import { onAuthStateChange, getUser } from '../shared/apex-supabase.js'
import { renderLogin } from './components/LoginView.js'
import { renderSidebar } from './components/Sidebar.js'
import { renderHeader } from './components/Header.js'
import { renderToday } from './components/TodayView.js'
import { renderCalendar } from './components/CalendarView.js'
import { renderProgress } from './components/ProgressView.js'
import { renderMessages } from './components/MessagesView.js'
import { renderProfile } from './components/ProfileView.js'
import { getWorkoutsForAthlete } from '../shared/apex-supabase.js'
import { renderCoachProfile } from './components/CoachProfileView.js'


const state = {
  user: null,
  profile: null,
  currentView: 'today',
  workouts: [],
  loading: true
}

const root = document.getElementById('app')

export function navigate(view) {
  state.currentView = view
  renderApp()
}

async function renderApp() {
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
    case 'today':    main.appendChild(renderToday(state)); break
    case 'calendar': main.appendChild(renderCalendar(state)); break
    case 'progress': main.appendChild(renderProgress(state)); break
    case 'messages': main.appendChild(renderMessages(state)); break
    case 'profile':  main.appendChild(renderProfile(state)); break
    case 'coach':    main.appendChild(renderCoachProfile(state)); break
  }

  shell.appendChild(main)
  root.appendChild(shell)
  if (window.lucide) window.lucide.createIcons()
}

async function init() {
  const lucideScript = document.createElement('script')
  lucideScript.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js'
  document.head.appendChild(lucideScript)

  const chartScript = document.createElement('script')
  chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js'
  document.head.appendChild(chartScript)

  onAuthStateChange(async (event, session) => {
    state.loading = false
    if (session?.user) {
      state.user = session.user
      const { data } = await getWorkoutsForAthlete(session.user.id)
      state.workouts = data || []
    } else {
      state.user = null
      state.workouts = []
    }
    renderApp()
  })

  const user = await getUser()
  if (!user) { state.loading = false; renderApp() }
}

init()
