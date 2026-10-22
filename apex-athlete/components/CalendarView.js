// Month calendar — tap a day to plan or log, tap a ride to edit it.
import { renderApp } from '../app.js'
import { rideType, isDone, sum } from '../lib/metrics.js'
import { esc, dateKey, addDays, startOfWeek, formatDuration } from '../lib/util.js'
import { openRideForm } from './RideForm.js'

let monthOffset = 0

const STATUS_TEXT = { completed: 'done', planned: 'planned', skipped: 'skipped' }

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
        <h1 class="page-title" tabindex="-1">${month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h1>
        <p class="page-sub">${monthDone.length} rides done, ${formatDuration(sum(monthDone, 'duration_min'))}, ${Math.round(sum(monthDone, 'distance_km'))} km</p>
      </div>
      <div class="row">
        <button class="btn btn-ghost btn-icon" data-shift="-1" aria-label="Previous month"><i data-lucide="chevron-left" aria-hidden="true"></i></button>
        <button class="btn btn-ghost" data-shift="0">This month</button>
        <button class="btn btn-ghost btn-icon" data-shift="1" aria-label="Next month"><i data-lucide="chevron-right" aria-hidden="true"></i></button>
      </div>
    </div>

    <div class="calendar">
      ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
      ${days.map(d => {
        const key = dateKey(d)
        const rides = byDate[key] || []
        return `
          <div class="cal-day ${d.getMonth() !== month.getMonth() ? 'other' : ''} ${key === today ? 'today' : ''}" data-date="${key}">
            <button class="cal-num" data-add aria-label="Add a ride on ${d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}"
              ${key === today ? 'aria-current="date"' : ''}>${d.getDate()}</button>
            ${rides.map(r => {
              const name = esc(r.title || rideType(r.ride_type).label)
              return `
              <button class="cal-ride status-${r.status}" data-ride-id="${r.id}" style="--type-color:${rideType(r.ride_type).color}"
                title="${name}" aria-label="Edit ${name}, ${STATUS_TEXT[r.status]}">${name}</button>`
            }).join('')}
          </div>`
      }).join('')}
    </div>

    <div class="legend faint small">
      <span><i class="legend-dot done"></i>Done</span>
      <span><i class="legend-dot planned"></i>Planned</span>
      <span><i class="legend-dot skipped"></i>Skipped</span>
      <span>Select a date to add a ride</span>
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

  return wrap
}
