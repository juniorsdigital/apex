import { onAuthStateChange, getUser, getProfile, getWorkoutsForAthlete } from './shared/apex-supabase.js'
import { renderLogin } from './components/LoginView.js'
import { renderSidebar } from './components/Sidebar.js'
import { renderHeader } from './components/Header.js'
import { renderToday } from './components/TodayView.js'
import { renderCalendar } from './components/CalendarView.js'
import { renderProgress } from './components/ProgressView.js'
import { renderMessages } from './components/MessagesView.js'
import { renderCoachProfile } from './components/CoachProfileView.js'
import { renderProfile } from './components/ProfileView.js'

const state = {
  user: null,
  profile: null,
  coachId: null,       // resolved from accepted request
  currentView: 'today',
  workouts: [],
  loading: true,
  unreadMessages: 0
}

const root = document.getElementById('app')

export function navigate(view) {
  state.currentView = view
  renderApp()
}

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

  shell.appendChild(renderSidebar(state.currentView, navigate, state.unreadMessages))
  shell.appendChild(renderHeader(state.currentView, state.user, state.profile))

  const main = document.createElement('main')
  main.className = 'app-main'

  switch (state.currentView) {
    case 'today':    main.appendChild(renderToday(state)); break
    case 'calendar': main.appendChild(renderCalendar(state)); break
    case 'progress': main.appendChild(renderProgress(state)); break
    case 'messages': main.appendChild(renderMessages(state)); break
    case 'coach':    main.appendChild(renderCoachProfile(state, state.coachId)); break
    case 'profile':  main.appendChild(renderProfile(state)); break
  }

  shell.appendChild(main)
  root.appendChild(shell)
  if (window.lucide) window.lucide.createIcons()
}

async function loadUserData(userId) {
  const [{ data: profile }, { data: workouts }, { data: requests }] = await Promise.all([
    getProfile(userId),
    getWorkoutsForAthlete(userId),
    // Find accepted coaching request to get coachId
    import('./shared/apex-supabase.js').then(m =>
      m.supabase.from('requests')
        .select('coach_id')
        .eq('athlete_id', userId)
        .eq('status', 'accepted')
        .maybeSingle()
    )
  ])
  state.profile = profile || null
  state.workouts = workouts || []
  state.coachId = requests?.data?.coach_id || null
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
      await loadUserData(session.user.id)
    } else {
      state.user = null
      state.profile = null
      state.workouts = []
      state.coachId = null
    }
    renderApp()
  })

  const user = await getUser()
  if (!user) { state.loading = false; renderApp() }
}

init()
