import { sendMagicLink } from '../../shared/apex-supabase.js'

export function renderLogin() {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'min-height:100dvh;display:flex;align-items:center;justify-content:center;background:var(--color-bg);padding:var(--space-6)'
  wrap.innerHTML = `
    <div style="width:100%;max-width:400px">
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-8)">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect width="36" height="36" rx="8" fill="var(--color-primary)"/>
          <circle cx="18" cy="13" r="5" fill="var(--color-text-inverse)" fill-opacity="0.9"/>
          <path d="M8 28c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="var(--color-text-inverse)" stroke-width="2.5" fill="none" stroke-opacity="0.8"/>
        </svg>
        <div>
          <div style="font-size:var(--text-lg);font-weight:700">Apex Athlete</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Follow your plan. Reach your goals.</div>
        </div>
      </div>
      <div class="card" style="padding:var(--space-8)">
        <h1 style="font-size:var(--text-lg);font-weight:700;margin-bottom:var(--space-2)">Sign in</h1>
        <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-6)">
          Enter your email and we'll send you a magic link — no password required.
        </p>
        <form id="athlete-login-form">
          <label for="athlete-email" style="display:block;font-size:var(--text-sm);font-weight:500;margin-bottom:var(--space-2)">Email address</label>
          <input id="athlete-email" type="email" class="input" placeholder="you@example.com" autocomplete="email" required style="margin-bottom:var(--space-4)">
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center" id="athlete-login-btn">Send login link</button>
        </form>
        <div id="athlete-login-status" style="margin-top:var(--space-4);font-size:var(--text-sm);display:none"></div>
      </div>
    </div>
  `
  const form = wrap.querySelector('#athlete-login-form')
  const btn = wrap.querySelector('#athlete-login-btn')
  const status = wrap.querySelector('#athlete-login-status')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = wrap.querySelector('#athlete-email').value.trim()
    btn.disabled = true; btn.textContent = 'Sending…'
    const { error } = await sendMagicLink(email)
    status.style.display = 'block'
    if (error) { status.style.color = 'var(--color-error)'; status.textContent = error.message; btn.disabled = false; btn.textContent = 'Send login link' }
    else { status.style.color = 'var(--color-success)'; status.innerHTML = `✓ Login link sent to <strong>${email}</strong>.`; btn.textContent = 'Link sent' }
  })
  return wrap
}
