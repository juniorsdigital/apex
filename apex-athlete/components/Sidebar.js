import { navigate, switchMode, modeOf, GUEST_VIEWS } from '../app.js'
import { signOut } from '../lib/supabase.js'
import { esc } from '../lib/util.js'

export const NAV = {
  train: [
    { id: 'today',    label: 'Today',    icon: 'sun' },
    { id: 'plan',     label: 'Plan',     icon: 'calendar-days' },
    { id: 'journal',  label: 'Journal',  icon: 'notebook-pen' },
    { id: 'journey',  label: 'Journey',  icon: 'mountain' },
    { id: 'profile',  label: 'Profile',  icon: 'user' }
  ],
  fuel: [
    { id: 'fuel-today',     label: 'Meals',     icon: 'utensils' },
    { id: 'fuel-groceries', label: 'Groceries', icon: 'shopping-basket' },
    { id: 'fuel-plan',      label: 'Plan',      icon: 'calendar-days' }
  ]
}
export const NAV_ITEMS = [...NAV.train, ...NAV.fuel]

/** The Train / Fuel switch: names the side it takes you to. */
export function modeSwitchHtml(mode) {
  const to = mode === 'fuel' ? { label: 'Train', icon: 'bike', what: 'training plan' } : { label: 'Fuel', icon: 'apple', what: 'meals and groceries' }
  return `
    <button class="mode-switch" type="button" data-mode-switch aria-label="Switch to ${to.label}: ${to.what}">
      <i data-lucide="${to.icon}" aria-hidden="true"></i><span>${to.label}</span><i data-lucide="arrow-right-left" class="mode-switch-swap" aria-hidden="true"></i>
    </button>`
}

export function bindModeSwitch(el) {
  el.querySelectorAll('[data-mode-switch]').forEach(btn => btn.addEventListener('click', () => switchMode(btn)))
}

export const LOGO_SVG = `
  <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-hidden="true">
    <rect width="36" height="36" rx="10" fill="#2747d9"/>
    <path d="M6 25h5l4-9 4 6 3-4 3 3 5 4" stroke="#e7f23c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`

export function renderSidebar(currentView, signedIn, account = '') {
  const sidebar = document.createElement('aside')
  sidebar.className = 'app-sidebar'
  sidebar.setAttribute('aria-label', 'Main navigation')

  const mode = modeOf(currentView)
  sidebar.innerHTML = `
    <div class="sidebar-logo">
      ${LOGO_SVG}
      <span class="brand-name">Apex${mode === 'fuel' ? '<span class="brand-mode">Fuel</span>' : ''}</span>
    </div>
    <div class="sidebar-switch">${modeSwitchHtml(mode)}</div>
    <nav class="sidebar-nav">
      ${NAV[mode].map(item => {
        const locked = !signedIn && !GUEST_VIEWS.includes(item.id)
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
        : `<span class="sidebar-account">Guest mode. ${mode === 'fuel' ? 'Your meals and groceries are' : 'Your plan and journal are'} saved in this browser only.</span>
           <button class="btn btn-primary btn-block" data-view="login">Sign in</button>`}
    </div>
  `

  sidebar.querySelectorAll('[data-view]').forEach(btn =>
    btn.addEventListener('click', () => navigate(btn.dataset.view))
  )
  bindModeSwitch(sidebar)
  sidebar.querySelector('#signout-btn')?.addEventListener('click', () => signOut())
  return sidebar
}
