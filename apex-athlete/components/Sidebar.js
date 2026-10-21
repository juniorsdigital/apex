import { navigate } from '../app.js'
import { signOut } from '../lib/supabase.js'

export const NAV_ITEMS = [
  { id: 'today',    label: 'Today',    icon: 'sun' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar-days' },
  { id: 'history',  label: 'Rides',    icon: 'bike' },
  { id: 'progress', label: 'Progress', icon: 'trending-up' },
  { id: 'profile',  label: 'Profile',  icon: 'user' }
]

export const LOGO_SVG = `
  <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-hidden="true">
    <rect width="36" height="36" rx="8" fill="var(--color-primary)"/>
    <path d="M7 26 15 12l5 8 3-5 6 11" stroke="var(--color-text-inverse)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`

export function renderSidebar(currentView, signedIn) {
  const sidebar = document.createElement('aside')
  sidebar.className = 'app-sidebar'
  sidebar.setAttribute('aria-label', 'Main navigation')

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      ${LOGO_SVG}
      <span>Apex</span>
    </div>
    <nav class="sidebar-nav">
      ${NAV_ITEMS.map(item => {
        const locked = !signedIn && item.id !== 'today'
        return `
          <button class="nav-item ${currentView === item.id ? 'active' : ''}" data-view="${item.id}"
            aria-current="${currentView === item.id ? 'page' : 'false'}"
            ${locked ? 'title="Sign in to use this"' : ''}>
            <i data-lucide="${item.icon}" class="nav-icon" aria-hidden="true"></i>
            <span class="nav-label">${item.label}</span>
            ${locked ? '<i data-lucide="lock" class="nav-lock" aria-label="Requires sign-in"></i>' : ''}
          </button>`
      }).join('')}
    </nav>
    <div class="sidebar-footer">
      ${signedIn
        ? `<button class="nav-item" id="signout-btn"><i data-lucide="log-out" class="nav-icon" aria-hidden="true"></i><span class="nav-label">Sign out</span></button>`
        : `<button class="nav-item" data-view="login"><i data-lucide="log-in" class="nav-icon" aria-hidden="true"></i><span class="nav-label">Sign in</span></button>`}
    </div>
  `

  sidebar.querySelectorAll('[data-view]').forEach(btn =>
    btn.addEventListener('click', () => navigate(btn.dataset.view))
  )
  sidebar.querySelector('#signout-btn')?.addEventListener('click', () => signOut())
  return sidebar
}
