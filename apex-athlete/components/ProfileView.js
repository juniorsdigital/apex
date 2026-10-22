// Profile — rider details (name, FTP, weight, max HR).
import { signOut } from '../lib/supabase.js'
import { esc, friendlyError, validateForm, clearErrorsOnInput } from '../lib/util.js'

const FIELDS = [
  { name: 'full_name',  label: 'Name',            type: 'text',   placeholder: 'Your name', autocomplete: 'name' },
  { name: 'ftp_watts',  label: 'FTP',             type: 'number', unit: 'W',   min: 50,  max: 600, hint: 'For your reference; your plan sets the targets.' },
  { name: 'weight_kg',  label: 'Weight',          type: 'number', unit: 'kg',  min: 30,  max: 200, step: 0.1, hint: 'Used for watts per kilo.' },
  { name: 'max_hr',     label: 'Max heart rate',  type: 'number', unit: 'bpm', min: 120, max: 230 }
]

export function renderProfile(state) {
  const p = state.profile || {}
  const wrap = document.createElement('div')
  wrap.className = 'stack narrow'
  wrap.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title" tabindex="-1">Profile</h1>
        <p class="page-sub">Signed in as ${esc(state.user?.email)}</p>
      </div>
    </div>
    <form class="card form-grid" id="profile-form" novalidate>
      ${FIELDS.map(f => `
        <div class="field ${f.name === 'full_name' ? 'span-2' : ''}">
          <label class="label" for="pf-${f.name}">${f.label} <span class="faint">${f.unit ? `(${f.unit}, optional)` : '(optional)'}</span></label>
          <input class="input" id="pf-${f.name}" name="${f.name}" type="${f.type}" value="${esc(p[f.name] ?? '')}"
            ${f.type === 'number' ? `inputmode="${f.step ? 'decimal' : 'numeric'}"` : ''}
            ${f.autocomplete ? `autocomplete="${f.autocomplete}"` : ''}
            ${f.placeholder ? `placeholder="${f.placeholder}"` : ''} ${f.min ? `min="${f.min}"` : ''} ${f.max ? `max="${f.max}"` : ''} ${f.step ? `step="${f.step}"` : ''}>
          ${f.hint ? `<p class="faint small" style="margin-top:var(--space-1)">${f.hint}</p>` : ''}
        </div>
      `).join('')}
      <div class="span-2 row-between">
        <span id="profile-status" class="inline-status" role="status"></span>
        <button type="submit" class="btn btn-primary" id="profile-save">Save profile</button>
      </div>
    </form>

    <section class="section" aria-labelledby="account-h">
      <div class="section-head"><h2 id="account-h">Account</h2></div>
      <div class="row-between">
        <p class="muted small">Your plan and journal stay in your account after you sign out.</p>
        <button class="btn btn-ghost" id="profile-signout"><i data-lucide="log-out" class="icon-sm" aria-hidden="true"></i> Sign out</button>
      </div>
    </section>
  `

  const form = wrap.querySelector('#profile-form')
  clearErrorsOnInput(form)
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const status = wrap.querySelector('#profile-status')
    status.textContent = ''
    if (!validateForm(form)) return
    const fd = new FormData(form)
    const updates = {}
    for (const f of FIELDS) {
      const v = fd.get(f.name).trim()
      updates[f.name] = v === '' ? null : f.type === 'number' ? Number(v) : v
    }
    const save = wrap.querySelector('#profile-save')
    save.disabled = true
    save.textContent = 'Saving…'
    const { error } = await state.store.saveProfile(updates)
    save.disabled = false
    save.textContent = 'Save profile'
    if (error) {
      status.className = 'inline-status is-error'
      status.textContent = friendlyError(error, 'save your profile')
      return
    }
    Object.assign(state.profile, updates)
    status.className = 'inline-status is-success'
    status.textContent = 'Profile saved'
  })

  wrap.querySelector('#profile-signout').addEventListener('click', () => signOut())
  return wrap
}
