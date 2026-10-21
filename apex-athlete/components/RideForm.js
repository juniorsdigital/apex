// Modal for logging a ride, planning one, or editing either.
import { saveRide, deleteRide } from '../app.js'
import { RIDE_TYPES, RPE_LABELS } from '../lib/metrics.js'
import { esc, dateKey, openModal } from '../lib/util.js'

const STATUSES = [
  { id: 'completed', label: 'Done' },
  { id: 'planned',   label: 'Planned' },
  { id: 'skipped',   label: 'Skipped' }
]

/**
 * @param {Object} opts
 * @param {Object} [opts.ride]   existing ride to edit
 * @param {string} [opts.date]   date for a new ride (YYYY-MM-DD)
 * @param {string} [opts.status] initial status for a new ride
 */
export function openRideForm({ ride = null, date = dateKey(), status } = {}) {
  const r = ride || { ride_date: date, ride_type: 'endurance', status: status || (date > dateKey() ? 'planned' : 'completed') }
  const num = v => (v ?? '') === '' ? '' : esc(v)

  const { el, close } = openModal(`
    <div class="modal-head">
      <h2>${ride ? 'Edit ride' : r.status === 'planned' ? 'Plan a ride' : 'Log a ride'}</h2>
      <button class="btn btn-ghost btn-icon" data-close aria-label="Close"><i data-lucide="x"></i></button>
    </div>
    <form id="ride-form" class="form-grid">
      <div class="field span-2">
        <label class="label" for="rf-title">Title</label>
        <input class="input" id="rf-title" name="title" value="${esc(r.title || '')}" placeholder="e.g. Saturday hill loop" maxlength="120">
      </div>
      <div class="field">
        <label class="label" for="rf-date">Date</label>
        <input class="input" id="rf-date" name="ride_date" type="date" value="${esc(r.ride_date)}" required>
      </div>
      <div class="field">
        <label class="label" for="rf-type">Type</label>
        <select class="input" id="rf-type" name="ride_type">
          ${RIDE_TYPES.map(t => `<option value="${t.id}" ${r.ride_type === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
      </div>
      <div class="field span-2">
        <span class="label">Status</span>
        <div class="segmented" role="radiogroup">
          ${STATUSES.map(s => `
            <label><input type="radio" name="status" value="${s.id}" ${r.status === s.id ? 'checked' : ''}><span>${s.label}</span></label>
          `).join('')}
        </div>
      </div>
      <div class="field">
        <label class="label" for="rf-dur">Duration <span class="faint">(min)</span></label>
        <input class="input" id="rf-dur" name="duration_min" type="number" min="1" max="1440" inputmode="numeric" value="${num(r.duration_min)}">
      </div>
      <div class="field">
        <label class="label" for="rf-km">Distance <span class="faint">(km)</span></label>
        <input class="input" id="rf-km" name="distance_km" type="number" min="0" step="0.1" inputmode="decimal" value="${num(r.distance_km)}">
      </div>
      <div class="field done-only">
        <label class="label" for="rf-elev">Elevation <span class="faint">(m)</span></label>
        <input class="input" id="rf-elev" name="elevation_m" type="number" min="0" inputmode="numeric" value="${num(r.elevation_m)}">
      </div>
      <div class="field done-only">
        <label class="label" for="rf-pwr">Avg power <span class="faint">(W)</span></label>
        <input class="input" id="rf-pwr" name="avg_power_w" type="number" min="0" inputmode="numeric" value="${num(r.avg_power_w)}">
      </div>
      <div class="field done-only">
        <label class="label" for="rf-hr">Avg heart rate <span class="faint">(bpm)</span></label>
        <input class="input" id="rf-hr" name="avg_hr" type="number" min="0" max="250" inputmode="numeric" value="${num(r.avg_hr)}">
      </div>
      <div class="field span-2 done-only">
        <span class="label">Effort (RPE) <span class="faint">1 = very easy · 10 = maximal</span></span>
        <div class="rpe-row">
          ${[1,2,3,4,5,6,7,8,9,10].map(n => `
            <label class="rpe-pick"><input type="radio" name="rpe" value="${n}" ${Number(r.rpe) === n ? 'checked' : ''}><span>${n}</span></label>
          `).join('')}
        </div>
        <div class="faint small" id="rf-rpe-label"></div>
      </div>
      <div class="field span-2">
        <label class="label" for="rf-notes">Notes</label>
        <textarea class="input" id="rf-notes" name="notes" rows="2" placeholder="How it felt, route, conditions…">${esc(r.notes || '')}</textarea>
      </div>
      <div class="span-2 load-preview" id="rf-load" hidden></div>
      <div class="span-2 alert alert-error" id="rf-error" hidden></div>
      <div class="span-2 modal-actions">
        ${ride ? `<button type="button" class="btn btn-danger" id="rf-delete">Delete</button>` : ''}
        <span style="flex:1"></span>
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary" id="rf-save">Save</button>
      </div>
    </form>
  `, { width: 560 })

  const form = el.querySelector('#ride-form')

  function sync() {
    const fd = new FormData(form)
    const done = fd.get('status') === 'completed'
    form.querySelectorAll('.done-only').forEach(n => { n.hidden = !done })
    const rpe = Number(fd.get('rpe'))
    const dur = Number(fd.get('duration_min'))
    el.querySelector('#rf-rpe-label').textContent = rpe ? RPE_LABELS[rpe] : ''
    const preview = el.querySelector('#rf-load')
    preview.hidden = !(done && rpe && dur)
    if (!preview.hidden) preview.innerHTML = `Session load <strong class="kpi-value">${(rpe * dur).toLocaleString()}</strong> AU <span class="faint">(RPE × minutes)</span>`
  }
  form.addEventListener('input', sync)
  sync()

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(form)
    const done = fd.get('status') === 'completed'
    const n = key => {
      const v = fd.get(key)
      return v === null || v === '' ? null : Number(v)
    }
    const payload = {
      id: ride?.id,
      title: fd.get('title').trim() || null,
      ride_date: fd.get('ride_date'),
      ride_type: fd.get('ride_type'),
      status: fd.get('status'),
      duration_min: n('duration_min'),
      distance_km: n('distance_km'),
      elevation_m: done ? n('elevation_m') : null,
      avg_power_w: done ? n('avg_power_w') : null,
      avg_hr: done ? n('avg_hr') : null,
      rpe: done ? n('rpe') : null,
      notes: fd.get('notes').trim() || null
    }
    const save = el.querySelector('#rf-save')
    save.disabled = true
    save.textContent = 'Saving…'
    const { error } = await saveRide(payload)
    if (error) {
      const box = el.querySelector('#rf-error')
      box.hidden = false
      box.textContent = error.message
      save.disabled = false
      save.textContent = 'Save'
    } else {
      close()
    }
  })

  el.querySelector('#rf-delete')?.addEventListener('click', async () => {
    if (!confirm('Delete this ride? This cannot be undone.')) return
    const { error } = await deleteRide(ride.id)
    if (error) {
      const box = el.querySelector('#rf-error')
      box.hidden = false
      box.textContent = error.message
    } else {
      close()
    }
  })

  el.querySelector('#rf-title').focus()
}
