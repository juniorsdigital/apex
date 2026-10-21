// Ride log — every ride, newest first, grouped by month.
import { saveRide } from '../app.js'
import { RIDE_FIELDS } from '../lib/store.js'
import { RIDE_TYPES, isDone, sum } from '../lib/metrics.js'
import { esc, dateKey, formatDate, formatDuration } from '../lib/util.js'
import { openRideForm } from './RideForm.js'
import { rideCard } from './TodayView.js'

const filters = { status: 'all', type: 'all', q: '' }

export function renderHistory(state) {
  const wrap = document.createElement('div')
  wrap.className = 'stack'
  wrap.innerHTML = `
    <div class="page-head">
      <div>
        <h2 class="page-title">Rides</h2>
        <p class="muted small">${state.rides.filter(isDone).length} completed · ${state.rides.filter(r => r.status === 'planned' && r.ride_date >= dateKey()).length} planned ahead</p>
      </div>
      <div class="row">
        <button class="btn btn-ghost" id="export-btn" ${state.rides.length ? '' : 'disabled'}><i data-lucide="download" class="icon-sm"></i> CSV</button>
        <button class="btn btn-primary" id="add-btn"><i data-lucide="plus" class="icon-sm"></i> Log ride</button>
      </div>
    </div>
    <div class="filters">
      <input type="search" class="input" id="f-q" placeholder="Search titles and notes…" value="${esc(filters.q)}">
      <select class="input" id="f-status" aria-label="Status">
        ${[['all', 'All statuses'], ['completed', 'Done'], ['planned', 'Planned'], ['skipped', 'Skipped']]
          .map(([v, l]) => `<option value="${v}" ${filters.status === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <select class="input" id="f-type" aria-label="Type">
        <option value="all">All types</option>
        ${RIDE_TYPES.map(t => `<option value="${t.id}" ${filters.type === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}
      </select>
    </div>
    <div id="ride-list" class="stack"></div>
  `

  const list = wrap.querySelector('#ride-list')

  function draw() {
    const q = filters.q.toLowerCase()
    const rides = state.rides
      .filter(r => filters.status === 'all' || r.status === filters.status)
      .filter(r => filters.type === 'all' || r.ride_type === filters.type)
      .filter(r => !q || `${r.title || ''} ${r.notes || ''}`.toLowerCase().includes(q))
      .slice()
      .reverse()

    if (!rides.length) {
      list.innerHTML = `<div class="card empty"><i data-lucide="bike" class="icon-lg"></i><p>${state.rides.length ? 'No rides match these filters.' : 'No rides yet. Log your first one.'}</p></div>`
    } else {
      const months = {}
      for (const r of rides) (months[r.ride_date.slice(0, 7)] ||= []).push(r)
      list.innerHTML = Object.entries(months).map(([m, rs]) => {
        const done = rs.filter(isDone)
        return `
          <section>
            <div class="month-head">
              <h3>${formatDate(m + '-01', { month: 'long', year: 'numeric' })}</h3>
              <span class="faint small">${done.length} rides · ${formatDuration(sum(done, 'duration_min'))} · ${Math.round(sum(done, 'distance_km'))} km</span>
            </div>
            <div class="stack-sm">
              ${rs.map(r => `<div class="dated"><span class="dated-date faint small">${formatDate(r.ride_date)}</span>${rideCard(r)}</div>`).join('')}
            </div>
          </section>`
      }).join('')
    }
    if (window.lucide) window.lucide.createIcons()
  }

  wrap.querySelector('#f-q').addEventListener('input', e => { filters.q = e.target.value; draw() })
  wrap.querySelector('#f-status').addEventListener('change', e => { filters.status = e.target.value; draw() })
  wrap.querySelector('#f-type').addEventListener('change', e => { filters.type = e.target.value; draw() })
  wrap.querySelector('#add-btn').addEventListener('click', () => openRideForm({ status: 'completed' }))
  wrap.querySelector('#export-btn').addEventListener('click', () => exportCsv(state.rides))

  list.addEventListener('click', e => {
    const card = e.target.closest('[data-ride-id]')
    if (!card) return
    const ride = state.rides.find(r => r.id === card.dataset.rideId)
    const action = e.target.closest('[data-action]')?.dataset.action
    if (action === 'skip') saveRide({ ...ride, status: 'skipped' })
    else openRideForm({ ride: action === 'done' ? { ...ride, status: 'completed' } : ride })
  })

  draw()
  return wrap
}

function exportCsv(rides) {
  const cell = v => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = [RIDE_FIELDS, ...rides.map(r => RIDE_FIELDS.map(f => r[f]))]
  const blob = new Blob([rows.map(row => row.map(cell).join(',')).join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `apex-rides-${dateKey()}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
