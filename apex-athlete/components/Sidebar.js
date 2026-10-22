import { navigate } from '../app.js'
import { signOut } from '../lib/supabase.js'
import { esc } from '../lib/util.js'

export const NAV_ITEMS = [
  { id: 'today',    label: 'Today',    icon: 'sun' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar-days' },
  { id: 'history',  label: 'Rides',    icon: 'bike' },
  { id: 'progress', label: 'Progress', icon: 'trending-up' },
  { id: 'profile',  label: 'Profile',  icon: 'user' }
]

export const LOGO_SVG = `
  <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-hidden="true">
    <rect width="36" height="36" rx="10" fill="#2747d9"/>
    <path d="M6 25h5l4-9 4 6 3-4 3 3 5 4" stroke="#e7f23c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`

export function renderSidebar(currentView, signedIn, account = '') {
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
            ${currentView === item.id ? 'aria-current="page"' : ''}
            ${locked ? 'title="Sign in to use this"' : ''}>
            <i data-lucide="${item.icon}" class="nav-icon" aria-hidden="true"></i>
            <span class="nav-label">${item.label}</span>
            ${locked ? '<i data-lucide="lock" class="nav-lock" aria-hidden="true"></i><span class="visually-hidden">(sign in required)</span>' : ''}
          </button>`
      }).join('')}
    </nav>
    <div class="sidebar-footer">
      ${signedIn
        ? `<span class="sidebar-account" title="${esc(account)}">${esc(account)}</span>
           <button class="nav-item" id="signout-btn"><i data-lucide="log-out" class="nav-icon" aria-hidden="true"></i><span class="nav-label">Sign out</span></button>`
        : `<span class="sidebar-account">Guest mode. Rides are saved in this browser only.</span>
           <button class="btn btn-primary btn-block" data-view="login">Sign in</button>`}
    </div>
  `

  sidebar.querySelectorAll('[data-view]').forEach(btn =>
    btn.addEventListener('click', () => navigate(btn.dataset.view))
  )
  sidebar.querySelector('#signout-btn')?.addEventListener('click', () => signOut())
  return sidebar
}
