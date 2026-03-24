import { signOut } from '../../shared/apex-supabase.js'

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',     icon: 'layout-dashboard' },
  { id: 'calendar',    label: 'Calendar',       icon: 'calendar-days' },
  { id: 'load-strain', label: 'Load & Strain',  icon: 'activity' },
]

export function renderSidebar(currentView, navigate) {
  const sidebar = document.createElement('aside')
  sidebar.className = 'app-sidebar'
  sidebar.setAttribute('role', 'navigation')
  sidebar.setAttribute('aria-label', 'Main navigation')

  sidebar.innerHTML = `
    <!-- Logo -->
    <div class="sidebar-logo">
      <div style="display:flex;align-items:center;gap:var(--space-2)">
        <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <rect width="36" height="36" rx="8" fill="var(--color-primary)"/>
          <path d="M18 6L28 28H8L18 6Z" fill="var(--color-text-inverse)" fill-opacity="0.9"/>
          <rect x="13" y="22" width="10" height="3" rx="1.5" fill="var(--color-text-inverse)" fill-opacity="0.5"/>
        </svg>
        <span style="font-size:var(--text-sm);font-weight:700;color:var(--color-text)">Apex Coach</span>
      </div>
    </div>

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

    <!-- Bottom: sign out -->
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

  sidebar.querySelector('#signout-btn').addEventListener('click', async () => {
    await signOut()
  })

  return sidebar
}
