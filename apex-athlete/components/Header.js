import { navigate, modeOf } from '../app.js'
import { LOGO_SVG, modeSwitchHtml, bindModeSwitch } from './Sidebar.js'

// Top bar for small screens only (hidden on desktop, where the sidebar shows
// the brand and account). The page's own h1 names the current view.
export function renderHeader(state) {
  const h = document.createElement('header')
  h.className = 'app-header'
  const mode = modeOf(state.currentView)
  h.innerHTML = `
    <span class="header-brand">${LOGO_SVG}Apex${mode === 'fuel' ? '<span class="brand-mode">Fuel</span>' : ''}</span>
    <span class="row header-actions">
      ${modeSwitchHtml(mode)}
      ${state.user ? '' : `<button class="btn btn-primary btn-sm" id="header-signin">Sign in</button>`}
    </span>
  `
  bindModeSwitch(h)
  h.querySelector('#header-signin')?.addEventListener('click', () => navigate('login'))
  return h
}
