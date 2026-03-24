import { signOut } from '../../shared/apex-supabase.js'

const VIEW_TITLES = {
  'dashboard':   'Dashboard',
  'calendar':    'Calendar',
  'load-strain': 'Load & Strain Analysis',
}

export function renderHeader(currentView, user, profile) {
  const header = document.createElement('header')
  header.className = 'app-header'

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Coach'

  header.innerHTML = `
    <h1 style="font-size:var(--text-base);font-weight:600;color:var(--color-text)">
      ${VIEW_TITLES[currentView] || 'Apex Coach'}
    </h1>
    <div style="display:flex;align-items:center;gap:var(--space-4)">
      <span style="font-size:var(--text-sm);color:var(--color-text-muted)">${displayName}</span>
      <button class="btn btn-ghost" id="header-signout" style="padding:var(--space-2) var(--space-3);font-size:var(--text-xs)">
        Logout
      </button>
    </div>
  `

  header.querySelector('#header-signout').addEventListener('click', () => signOut())

  return header
}
