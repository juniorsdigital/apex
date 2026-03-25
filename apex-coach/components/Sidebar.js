import { signOut } from '../../shared/apex-supabase.js'

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',        icon: 'layout-dashboard' },
  { id: 'calendar',     label: 'Calendar',          icon: 'calendar-days' },
  { id: 'load-strain',  label: 'Load & Strain',     icon: 'activity' },
  { id: 'workout-bank', label: 'Workout Bank',      icon: 'dumbbell' },
  { id: 'programs',     label: 'Programs',          icon: 'layers' },
  { id: 'athletes',     label: 'Athletes',          icon: 'users' },
]

export function renderSidebar(currentView, navigate, state) {
  const sidebar = document.createElement('aside')
  sidebar.className = 'app-sidebar'
  sidebar.setAttribute('role', 'navigation')
  sidebar.setAttribute('aria-label', 'Main navigation')

  // Athlete switcher
  const athletes = (state && state.athletes) || []
  const selectedId = state && state.selectedAthleteId
  const athleteOptions = athletes.map(a =>
    `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.full_name}</option>`
  ).join('')

  sidebar.innerHTML = `
    <!-- Logo -->
    <div class="sidebar-logo">
      <div style="display:flex;align-items:center;gap:var(--space-2)">
        <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-label="Apex logo">
          <rect width="36" height="36" rx="8" fill="var(--color-primary)"/>
          <path d="M18 6L28 28H8L18 6Z" fill="var(--color-text-inverse)" fill-opacity="0.9"/>
          <rect x="13" y="22" width="10" height="3" rx="1.5" fill="var(--color-text-inverse)" fill-opacity="0.5"/>
        </svg>
        <span style="font-size:var(--text-sm);font-weight:700;color:var(--color-text)">Apex Coach</span>
      </div>
    </div>

    <!-- Athlete Switcher -->
    ${athletes.length > 0 ? `
    <div style="padding:0 var(--space-3) var(--space-3)">
      <label style="font-size:var(--text-xs);color:var(--color-text-faint);font-weight:500;display:block;margin-bottom:var(--space-1);text-transform:uppercase;letter-spacing:.05em">Athlete</label>
      <select id="athlete-switcher" class="input" style="font-size:var(--text-xs);padding:var(--space-2) var(--space-3);height:auto">
        ${athleteOptions}
      </select>
    </div>
    ` : ''}

    <!-- Nav -->
    <nav class="sidebar-nav" aria-label="Views">
      ${NAV_ITEMS.map(item => `
        <button
          class="nav-item ${currentView === item.id ? 'active' : ''}"
          data-view="${item.id}"
          aria-current="${currentView === item.id ? 'page' : 'false'}"
        >
          <i data-lucide="${item.icon}" class="nav-icon" aria-hidden="true"></i>
          ${item.label}
        </button>
      `).join('')}
    </nav>

    <!-- Bottom -->
    <div style="padding:var(--space-4);border-top:1px solid var(--color-divider)">
      <button class="nav-item" id="signout-btn" style="width:100%">
        <i data-lucide="log-out" class="nav-icon" aria-hidden="true"></i>
        Sign out
      </button>
    </div>
  `

  sidebar.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view))
  })

  const switcher = sidebar.querySelector('#athlete-switcher')
  if (switcher) {
    switcher.addEventListener('change', async (e) => {
      const { setState, renderApp } = await import('../apex-coach-app.js')
      setState({ selectedAthleteId: e.target.value })
      renderApp()
    })
  }

  sidebar.querySelector('#signout-btn').addEventListener('click', async () => {
    await signOut()
  })

  return sidebar
}
