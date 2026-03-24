import { sendMagicLink } from '../../shared/apex-supabase.js'

export function renderLogin() {
  const wrap = document.createElement('div')
  wrap.style.cssText = `
    min-height: 100dvh; display: flex; align-items: center; justify-content: center;
    background: var(--color-bg); padding: var(--space-6);
  `
  wrap.innerHTML = `
    <div style="width: 100%; max-width: 400px;">
      <!-- Logo -->
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-8)">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-label="Apex Coach">
          <rect width="36" height="36" rx="8" fill="var(--color-primary)"/>
          <path d="M18 6L28 28H8L18 6Z" fill="var(--color-text-inverse)" fill-opacity="0.9"/>
          <rect x="13" y="22" width="10" height="3" rx="1.5" fill="var(--color-text-inverse)" fill-opacity="0.5"/>
        </svg>
        <div>
          <div style="font-size:var(--text-lg);font-weight:700;color:var(--color-text)">Apex Coach</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Evidence-based coaching platform</div>
        </div>
      </div>

      <div class="card" style="padding:var(--space-8)">
        <h1 style="font-size:var(--text-lg);font-weight:700;margin-bottom:var(--space-2)">Sign in</h1>
        <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-6)">
          Enter your email and we'll send you a magic link to sign in instantly — no password needed.
        </p>

        <form id="login-form">
          <label for="email-input" style="display:block;font-size:var(--text-sm);font-weight:500;margin-bottom:var(--space-2)">
            Email address
          </label>
          <input
            id="email-input"
            type="email"
            class="input"
            placeholder="you@example.com"
            autocomplete="email"
            required
            style="margin-bottom:var(--space-4)"
          >
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center" id="login-btn">
            Send login link
          </button>
        </form>

        <div id="login-status" style="margin-top:var(--space-4);font-size:var(--text-sm);display:none"></div>
      </div>
    </div>
  `

  const form = wrap.querySelector('#login-form')
  const btn = wrap.querySelector('#login-btn')
  const status = wrap.querySelector('#login-status')
  const emailInput = wrap.querySelector('#email-input')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = emailInput.value.trim()
    if (!email) return

    btn.disabled = true
    btn.textContent = 'Sending…'
    status.style.display = 'none'

    const { error } = await sendMagicLink(email)

    if (error) {
      status.style.display = 'block'
      status.style.color = 'var(--color-error)'
      status.textContent = `Error: ${error.message}`
      btn.disabled = false
      btn.textContent = 'Send login link'
    } else {
      status.style.display = 'block'
      status.style.color = 'var(--color-success)'
      status.innerHTML = `✓ Login link sent to <strong>${email}</strong>. Check your inbox.`
      btn.textContent = 'Link sent'
    }
  })

  return wrap
}
