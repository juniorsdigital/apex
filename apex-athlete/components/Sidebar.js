import { signOut } from '../shared/apex-supabase.js'

const NAV_ITEMS = [
  { id: 'today',    label: 'Today',      icon: 'sun' },
  { id: 'calendar', label: 'Schedule',   icon: 'calendar-days' },
  { id: 'progress', label: 'Progress',   icon: 'trending-up' },
  { id: 'messages', label: 'Messages',   icon: 'message-circle', badge: true },
  { id: 'coach',    label: 'My Coach',   icon: 'user-check' },
  { id: 'profile',  label: 'Profile',    icon: 'user' },
]

export function renderSidebar(currentView, navigate, unreadMessages = 0) {
  const sidebar = document.createElement('aside')
  sidebar.className = 'app-sidebar'
  sidebar.setAttribute('role', 'navigation')
  sidebar.setAttribute('aria-label', 'Main navigation')

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div style="display:flex;align-items:center;gap:var(--space-2)">
        <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-label="Apex Athlete">
          <rect width="36" height="36" rx="8" fill="var(--color-primary)"/>
          <circle cx="18" cy="13" r="5" fill="var(--color-text-inverse)" fill-opacity="0.9"/>
          <path d="M8 28c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="var(--color-text-inverse)" stroke-width="2.5" fill="none" stroke-opacity="0.8"/>
        </svg>
        <span style="font-size:var(--text-sm);font-weight:700;color:var(--color-text)">Apex Athlete</span>
      </div>
    </div>
    <nav class="sidebar-nav" aria-label="Views">
      ${NAV_ITEMS.map(item => `
        <button
          class="nav-item ${currentView === item.id ? 'active' : ''}"
          data-view="${item.id}"
          aria-current="${currentView === item.id ? 'page' : 'false'}"
        >
          <i data-lucide="${item.icon}" class="nav-icon" aria-hidden="true"></i>
          <span style="flex:1;text-align:left">${item.label}</span>
          ${item.badge && unreadMessages > 0 ? `
            <span style="
              background:var(--color-error);color:#fff;
              font-size:10px;font-weight:700;min-width:18px;height:18px;
              border-radius:var(--radius-full);display:flex;align-items:center;
              justify-content:center;padding:0 var(--space-1)
            ">${unreadMessages}</span>
          ` : ''}
        </button>
      `).join('')}
    </nav>
    <div style="padding:var(--space-4);border-top:1px solid var(--color-divider)">
      <button class="nav-item" id="signout-btn" style="width:100%">
        <i data-lucide="log-out" class="nav-icon" aria-hidden="true"></i>
        Sign out
      </button>
    </div>
  `

  sidebar.querySelectorAll('.nav-item[data-view]').forEach(btn =>
    btn.addEventListener('click', () => navigate(btn.dataset.view))
  )
  sidebar.querySelector('#signout-btn').addEventListener('click', () => signOut())
  return sidebar
}
