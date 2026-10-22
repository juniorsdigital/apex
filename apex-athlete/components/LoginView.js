import { navigate } from '../app.js'
import { sendMagicLink } from '../lib/supabase.js'
import { esc, validateForm, clearErrorsOnInput } from '../lib/util.js'
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
        <form id="login-form" novalidate>
          <label class="label" for="login-email">Email address</label>
          <input id="login-email" name="email" type="email" class="input" placeholder="you@example.com" autocomplete="email" required>
          <button type="submit" class="btn btn-primary btn-block" id="login-btn">Send sign-in link</button>
        </form>
        <div id="login-status" class="inline-status" role="status"></div>
      </div>
      <button class="btn btn-ghost btn-block" id="login-skip">
        <i data-lucide="arrow-left" class="icon-sm" aria-hidden="true"></i> Back to Today
      </button>
    </div>
  `
  const form = wrap.querySelector('#login-form')
  const btn = wrap.querySelector('#login-btn')
  const status = wrap.querySelector('#login-status')

  clearErrorsOnInput(form)
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const input = wrap.querySelector('#login-email')
    input.value = input.value.trim()
    if (!validateForm(form, { email: 'Enter the email address to send your sign-in link to.' })) return
    const email = input.value
    btn.disabled = true
    btn.textContent = 'Sending…'
    const { error } = await sendMagicLink(email)
    if (error) {
      status.className = 'inline-status is-error'
      status.textContent = error.message
      btn.disabled = false
      btn.textContent = 'Send sign-in link'
    } else {
      status.className = 'inline-status is-success'
      status.innerHTML = `Link sent. Check <strong>${esc(email)}</strong> and open the link on this device.`
      btn.textContent = 'Link sent'
    }
  })
  wrap.querySelector('#login-skip').addEventListener('click', () => navigate('today'))
  return wrap
}
