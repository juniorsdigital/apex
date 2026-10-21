// Month calendar — tap a day to plan or log, tap a ride to edit it.
import { renderApp } from '../app.js'
import { rideType, isDone, sum } from '../lib/metrics.js'
import { esc, dateKey, addDays, startOfWeek, formatDuration } from '../lib/util.js'
import { openRideForm } from './RideForm.js'

let monthOffset = 0

export function renderCalendar(state) {
  const now = new Date()
  const month = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const gridStart = startOfWeek(month)
  const today = dateKey()
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  // Drop a trailing week that belongs entirely to the next month.
  if (days[35].getMonth() !== month.getMonth()) days.length = 35

  const byDate = {}
  for (const r of state.rides) (byDate[r.ride_date] ||= []).push(r)

  const monthKeyPrefix = dateKey(month).slice(0, 7)
  const monthDone = state.rides.filter(r => isDone(r) && r.ride_date.startsWith(monthKeyPrefix))

  const wrap = document.createElement('div')
  wrap.className = 'stack'
  wrap.innerHTML = `
    <div class="page-head">
      <div>
        <h2 class="page-title">${month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <p class="muted small">${monthDone.length} rides · ${formatDuration(sum(monthDone, 'duration_min'))} · ${Math.round(sum(monthDone, 'distance_km'))} km</p>
      </div>
      <div class="row">
        <button class="btn btn-ghost btn-icon" data-shift="-1" aria-label="Previous month"><i data-lucide="chevron-left"></i></button>
        <button class="btn btn-ghost btn-sm" data-shift="0">Today</button>
        <button class="btn btn-ghost btn-icon" data-shift="1" aria-label="Next month"><i data-lucide="chevron-right"></i></button>
      </div>
    </div>

    <div class="calendar">
      ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
      ${days.map(d => {
        const key = dateKey(d)
        const rides = byDate[key] || []
        return `
          <div class="cal-day ${d.getMonth() !== month.getMonth() ? 'other' : ''} ${key === today ? 'today' : ''}"
            data-date="${key}" role="button" tabindex="0" aria-label="${d.toDateString()}, ${rides.length} rides">
            <span class="cal-num">${d.getDate()}</span>
            ${rides.map(r => `
              <span class="cal-ride status-${r.status}" data-ride-id="${r.id}" style="--type-color:${rideType(r.ride_type).color}"
                title="${esc(r.title || rideType(r.ride_type).label)}">${esc(r.title || rideType(r.ride_type).label)}</span>
            `).join('')}
          </div>`
      }).join('')}
    </div>

    <div class="legend faint small">
      <span><i class="legend-dot done"></i>Done</span>
      <span><i class="legend-dot planned"></i>Planned</span>
      <span><i class="legend-dot skipped"></i>Skipped</span>
      <span>Tap a day to add a ride</span>
    </div>
  `

  wrap.querySelectorAll('[data-shift]').forEach(btn => btn.addEventListener('click', () => {
    const n = Number(btn.dataset.shift)
    monthOffset = n === 0 ? 0 : monthOffset + n
    renderApp()
  }))

  const open = e => {
    const chip = e.target.closest('[data-ride-id]')
    if (chip) return openRideForm({ ride: state.rides.find(r => r.id === chip.dataset.rideId) })
    const day = e.target.closest('[data-date]')
    if (day) openRideForm({ date: day.dataset.date })
  }
  wrap.querySelector('.calendar').addEventListener('click', open)
  wrap.querySelector('.calendar').addEventListener('keydown', e => { if (e.key === 'Enter') open(e) })

  return wrap
}
