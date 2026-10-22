import { navigate } from '../app.js'
import { sendMagicLink, verifyEmailCode } from '../lib/supabase.js'
import { esc, validateForm, clearErrorsOnInput, setFieldError } from '../lib/util.js'
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
          <div class="muted small">Your road to race day</div>
        </div>
      </div>
      <div class="card login-card">
        <h1>Sign in</h1>
        <p class="muted small">
          Enter your email and we'll send you a sign-in link and code. Signing in syncs your plan
          and journal across devices and opens the full plan, journal and journey.
        </p>
        <form id="login-form" novalidate>
          <label class="label" for="login-email">Email address</label>
          <input id="login-email" name="email" type="email" class="input" placeholder="you@example.com" autocomplete="email" required>
          <button type="submit" class="btn btn-primary btn-block" id="login-btn">Send sign-in link</button>
        </form>
        <div id="login-status" class="inline-status" role="status"></div>
        <form id="code-form" novalidate hidden>
          <label class="label" for="login-code">Code from the email</label>
          <input id="login-code" name="code" type="text" class="input" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" maxlength="10" required>
          <button type="submit" class="btn btn-primary btn-block" id="code-btn">Sign in with code</button>
        </form>
      </div>
      <button class="btn btn-ghost btn-block" id="login-skip">
        <i data-lucide="arrow-left" class="icon-sm" aria-hidden="true"></i> Back to Today
      </button>
    </div>
  `
  const form = wrap.querySelector('#login-form')
  const btn = wrap.querySelector('#login-btn')
  const status = wrap.querySelector('#login-status')
  const codeForm = wrap.querySelector('#code-form')
  const codeBtn = wrap.querySelector('#code-btn')
  let sentTo = ''

  clearErrorsOnInput(form)
  clearErrorsOnInput(codeForm)
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
      sentTo = email
      status.className = 'inline-status is-success'
      status.innerHTML = `Sent to <strong>${esc(email)}</strong>. Open the link on this device, or enter the code from the email below.`
      btn.textContent = 'Link sent'
      codeForm.hidden = false
    }
  })

  codeForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const input = wrap.querySelector('#login-code')
    input.value = input.value.replace(/\s/g, '')
    if (!validateForm(codeForm, { code: 'Enter the code from the email.' })) return
    if (!/^\d{6,10}$/.test(input.value)) {
      setFieldError(input, 'The code is the 6-digit number in the email.')
      input.focus()
      return
    }
    codeBtn.disabled = true
    codeBtn.textContent = 'Signing in…'
    const { error } = await verifyEmailCode(sentTo, input.value)
    if (error) {
      setFieldError(input, /expired|invalid/i.test(error.message)
        ? 'That code is wrong or has expired. Check the latest email, or send a new one.'
        : error.message)
      input.focus()
      codeBtn.disabled = false
      codeBtn.textContent = 'Sign in with code'
    }
    // On success the auth listener in app.js opens Today.
  })

  wrap.querySelector('#login-skip').addEventListener('click', () => navigate('today'))
  return wrap
}
