import { navigate } from '../app.js'
import { esc } from '../lib/util.js'
import { NAV_ITEMS, LOGO_SVG } from './Sidebar.js'

export function renderHeader(state) {
  const h = document.createElement('header')
  h.className = 'app-header'
  const title = NAV_ITEMS.find(n => n.id === state.currentView)?.label || 'Today'
  const name = state.profile?.full_name || state.user?.email || ''

  h.innerHTML = `
    <div class="header-title">
      <span class="header-logo">${LOGO_SVG}</span>
      <h1>${title}</h1>
    </div>
    ${state.user
      ? `<span class="muted small" title="Signed in">${esc(name)}</span>`
      : `<div class="header-guest">
           <span class="badge badge-muted">Guest · saved on this device</span>
           <button class="btn btn-primary btn-sm" id="header-signin">Sign in</button>
         </div>`}
  `
  h.querySelector('#header-signin')?.addEventListener('click', () => navigate('login'))
  return h
}
