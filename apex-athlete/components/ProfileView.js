// Profile — rider details used by the dashboard and progress metrics.
import { esc } from '../lib/util.js'

const FIELDS = [
  { name: 'full_name',  label: 'Name',            type: 'text',   placeholder: 'Your name' },
  { name: 'ftp_watts',  label: 'FTP',             type: 'number', unit: 'W',   min: 50,  max: 600 },
  { name: 'weight_kg',  label: 'Weight',          type: 'number', unit: 'kg',  min: 30,  max: 200, step: 0.1 },
  { name: 'max_hr',     label: 'Max heart rate',  type: 'number', unit: 'bpm', min: 120, max: 230 },
  { name: 'goal_event', label: 'Goal event',      type: 'text',   placeholder: 'e.g. Gran Fondo, first century' },
  { name: 'goal_date',  label: 'Goal date',       type: 'date' }
]

export function renderProfile(state) {
  const p = state.profile || {}
  const wrap = document.createElement('div')
  wrap.className = 'stack narrow'
  wrap.innerHTML = `
    <div class="page-head">
      <div>
        <h2 class="page-title">Profile</h2>
        <p class="muted small">Signed in as ${esc(state.user?.email)}</p>
      </div>
    </div>
    <form class="card form-grid" id="profile-form">
      ${FIELDS.map(f => `
        <div class="field ${f.name === 'full_name' || f.name === 'goal_event' ? 'span-2' : ''}">
          <label class="label" for="pf-${f.name}">${f.label}${f.unit ? ` <span class="faint">(${f.unit})</span>` : ''}</label>
          <input class="input" id="pf-${f.name}" name="${f.name}" type="${f.type}" value="${esc(p[f.name] ?? '')}"
            ${f.placeholder ? `placeholder="${f.placeholder}"` : ''} ${f.min ? `min="${f.min}"` : ''} ${f.max ? `max="${f.max}"` : ''} ${f.step ? `step="${f.step}"` : ''}>
        </div>
      `).join('')}
      <div class="span-2 row-between">
        <span id="profile-status" class="small" role="status"></span>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  `

  wrap.querySelector('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const updates = {}
    for (const f of FIELDS) {
      const v = fd.get(f.name).trim()
      updates[f.name] = v === '' ? null : f.type === 'number' ? Number(v) : v
    }
    const status = wrap.querySelector('#profile-status')
    status.textContent = 'Saving…'
    status.style.color = 'var(--color-text-muted)'
    const { error } = await state.store.saveProfile(updates)
    status.style.color = error ? 'var(--color-error)' : 'var(--color-success)'
    status.textContent = error ? error.message : '✓ Saved'
    if (!error) Object.assign(state.profile, updates)
  })

  return wrap
}
