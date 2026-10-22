import { navigate } from '../app.js'
import { LOGO_SVG } from './Sidebar.js'

// Top bar for small screens only (hidden on desktop, where the sidebar shows
// the brand and account). The page's own h1 names the current view.
export function renderHeader(state) {
  const h = document.createElement('header')
  h.className = 'app-header'
  h.innerHTML = `
    <span class="header-brand">${LOGO_SVG}Apex</span>
    ${state.user ? '' : `<button class="btn btn-primary btn-sm" id="header-signin">Sign in</button>`}
  `
  h.querySelector('#header-signin')?.addEventListener('click', () => navigate('login'))
  return h
}
