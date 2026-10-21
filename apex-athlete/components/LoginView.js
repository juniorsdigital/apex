import { navigate } from '../app.js'
import { sendMagicLink } from '../lib/supabase.js'
import { esc } from '../lib/util.js'
import { LOGO_SVG } from './Sidebar.js'

export function renderLogin() {
  const wrap = document.createElement('div')
  wrap.className = 'center-screen'
  wrap.innerHTML = `
    <div class="login">
      <div class="login-brand">
        ${LOGO_SVG}
        <div>
          <div class="login-name">Apex</div>
          <div class="muted small">Your cycling training log</div>
        </div>
      </div>
      <div class="card login-card">
        <h1>Sign in</h1>
        <p class="muted small">
          Enter your email and we'll send you a sign-in link. Signing in syncs your rides
          and unlocks your calendar, ride history and progress charts.
        </p>
        <form id="login-form">
          <label class="label" for="login-email">Email address</label>
          <input id="login-email" type="email" class="input" placeholder="you@example.com" autocomplete="email" required>
          <button type="submit" class="btn btn-primary btn-block" id="login-btn">Send sign-in link</button>
        </form>
        <div id="login-status" class="small" role="status" hidden></div>
      </div>
      <button class="btn btn-ghost btn-block" id="login-skip">
        <i data-lucide="arrow-left" style="width:16px;height:16px"></i> Back to today's dashboard
      </button>
    </div>
  `
  const form = wrap.querySelector('#login-form')
  const btn = wrap.querySelector('#login-btn')
  const status = wrap.querySelector('#login-status')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = wrap.querySelector('#login-email').value.trim()
    btn.disabled = true
    btn.textContent = 'Sending…'
    const { error } = await sendMagicLink(email)
    status.hidden = false
    if (error) {
      status.style.color = 'var(--color-error)'
      status.textContent = error.message
      btn.disabled = false
      btn.textContent = 'Send sign-in link'
    } else {
      status.style.color = 'var(--color-success)'
      status.innerHTML = `✓ Check <strong>${esc(email)}</strong> for your sign-in link.`
      btn.textContent = 'Link sent'
    }
  })
  wrap.querySelector('#login-skip').addEventListener('click', () => navigate('today'))
  return wrap
}
