// Today dashboard — available to guests and signed-in riders alike.
import { navigate, reload, saveRide } from '../app.js'
import { guestDataCount } from '../lib/store.js'
import { rideType, rideLoad, isDone, sum } from '../lib/metrics.js'
import { esc, dateKey, addDays, startOfWeek, formatDate, formatDuration, toast, friendlyError } from '../lib/util.js'
import { openRideForm } from './RideForm.js'

const READINESS = [
  { id: 'sleep',    label: 'Sleep',     icon: 'moon',     low: 'Poor',  high: 'Great' },
  { id: 'energy',   label: 'Energy',    icon: 'zap',      low: 'Flat',  high: 'Fresh' },
  { id: 'soreness', label: 'Legs',      icon: 'activity', low: 'Sore',  high: 'Fresh' }
]

export function renderToday(state) {
  const today = dateKey()
  const todayRides = state.rides.filter(r => r.ride_date === today)
  const readiness = state.readiness[today] || {}
  const weekStart = startOfWeek()
  const weekDays = Array.from({ length: 7 }, (_, i) => dateKey(addDays(weekStart, i)))
  const weekRides = state.rides.filter(r => r.ride_date >= weekDays[0] && r.ride_date <= weekDays[6])
  const weekDone = weekRides.filter(isDone)
  const upNext = state.rides.find(r => r.ride_date > today && r.status === 'planned')
  const importable = state.user ? guestDataCount() : 0
  const firstName = state.profile?.full_name?.split(' ')[0]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const wrap = document.createElement('div')
  wrap.className = 'stack'
  wrap.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title" tabindex="-1">${greeting}${firstName ? ', ' + esc(firstName) : ''}</h1>
        <p class="page-sub">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>
      <div class="row">
        <button class="btn btn-ghost" id="plan-btn"><i data-lucide="calendar-plus" class="icon-sm" aria-hidden="true"></i> Plan a ride</button>
        <button class="btn btn-primary" id="log-btn"><i data-lucide="plus" class="icon-sm" aria-hidden="true"></i> Log a ride</button>
      </div>
    </div>

    ${importable ? `
      <div class="alert alert-info stack-sm">
        <div class="row-between">
          <span>You logged ${importable} ride${importable > 1 ? 's' : ''} on this device before signing in.</span>
          <button class="btn btn-primary btn-sm" id="import-btn">Add to my account</button>
        </div>
        <span class="inline-status" id="import-status" role="status"></span>
      </div>` : ''}

    <section class="card week-hero" aria-labelledby="week-h">
      <div>
        <div class="week-hero-head">
          <h2 id="week-h">This week's load</h2>
          <span class="faint small">${formatDate(weekDays[0], { month: 'short', day: 'numeric' })} to ${formatDate(weekDays[6], { month: 'short', day: 'numeric' })}, RPE × minutes per day</span>
        </div>
        ${weekProfile(weekDays, weekRides, today)}
      </div>
      <div class="week-hero-stats">
        <div class="stat-grid">
          ${stat('Rides', weekDone.length)}
          ${stat('Time', formatDuration(sum(weekDone, 'duration_min')))}
          ${stat('Distance', `${Math.round(sum(weekDone, 'distance_km'))} km`)}
          ${stat('Load', weekDone.reduce((a, r) => a + rideLoad(r), 0).toLocaleString())}
        </div>
        ${upNext ? `
          <div class="up-next">
            <span class="faint small">Up next, ${formatDate(upNext.ride_date)}</span>
            <span>${esc(upNext.title || rideType(upNext.ride_type).label)}${upNext.duration_min ? `, ${formatDuration(upNext.duration_min)}` : ''}</span>
          </div>` : ''}
      </div>
    </section>

    <div class="grid-2">
      <section class="section" aria-labelledby="today-h">
        <div class="section-head">
          <h2 id="today-h">Today's riding</h2>
          ${todayRides.length ? `<span class="faint small">${todayRides.filter(isDone).length} of ${todayRides.length} done</span>` : ''}
        </div>
        ${todayRides.length ? `
          <div class="stack-sm">${todayRides.map(rideCard).join('')}</div>
        ` : `
          <div class="empty card">
            <p>Nothing logged yet today.</p>
            <p>Log a ride when you're back, or plan one for later.</p>
          </div>
        `}
      </section>

      <section class="section" aria-labelledby="ready-h">
        <div class="section-head">
          <h2 id="ready-h">How are you feeling?</h2>
          <span class="small muted" id="readiness-score">${readinessScore(readiness)}</span>
        </div>
        <div class="stack-sm">
          ${READINESS.map(m => `
            <div class="readiness-row">
              <span class="readiness-label" id="rd-${m.id}"><i data-lucide="${m.icon}" class="icon-xs" aria-hidden="true"></i> ${m.label}</span>
              <div class="readiness-scale" role="radiogroup" aria-labelledby="rd-${m.id}">
                ${[1,2,3,4,5].map(n => `
                  <label class="readiness-pick ${readiness[m.id] >= n ? 'on' : ''}">
                    <input type="radio" name="rd-${m.id}" value="${n}" data-metric="${m.id}" ${readiness[m.id] === n ? 'checked' : ''}
                      aria-label="${n} of 5${n === 1 ? ', ' + m.low : n === 5 ? ', ' + m.high : ''}">
                    <span aria-hidden="true">${n}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          `).join('')}
          <div class="row-between faint small"><span>1 = rough</span><span>5 = great</span></div>
          <span class="inline-status" id="readiness-status" role="status"></span>
        </div>
      </section>
    </div>

    ${!state.user ? `
      <section class="card guest-cta row-between">
        <div>
          <h2>Keep your history</h2>
          <p class="muted small">You're in guest mode, so rides are saved only in this browser. Sign in to sync them and to use the calendar, ride log and progress charts.</p>
        </div>
        <button class="btn btn-primary" id="cta-signin">Sign in</button>
      </section>` : ''}
  `

  wrap.querySelector('#log-btn').addEventListener('click', () => openRideForm({ status: 'completed' }))
  wrap.querySelector('#plan-btn').addEventListener('click', () => openRideForm({ status: 'planned' }))
  wrap.querySelector('#cta-signin')?.addEventListener('click', () => navigate('login'))

  wrap.querySelector('#import-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget
    const status = wrap.querySelector('#import-status')
    btn.disabled = true
    btn.textContent = 'Adding…'
    status.textContent = ''
    const { error } = await state.store.importGuestData()
    if (error) {
      btn.disabled = false
      btn.textContent = 'Try again'
      status.className = 'inline-status is-error'
      status.textContent = friendlyError(error, 'add those rides to your account')
      return
    }
    await reload()
    toast(`${importable} ride${importable > 1 ? 's' : ''} added to your account`)
  })

  // Readiness — saves on every change.
  wrap.querySelectorAll('.readiness-pick input').forEach(input => {
    input.addEventListener('change', async () => {
      const metric = input.dataset.metric
      const values = { ...state.readiness[today], [metric]: Number(input.value) }
      state.readiness[today] = values
      wrap.querySelectorAll(`input[data-metric="${metric}"]`).forEach(i =>
        i.parentElement.classList.toggle('on', Number(i.value) <= values[metric])
      )
      wrap.querySelector('#readiness-score').textContent = readinessScore(values)
      const status = wrap.querySelector('#readiness-status')
      const { error } = await state.store.saveReadiness(today, values)
      status.className = `inline-status ${error ? 'is-error' : ''}`
      status.textContent = error ? friendlyError(error, 'save your check-in') : ''
    })
  })

  bindRideCards(wrap, state)
  return wrap
}

// Shared click handling for ride cards on Today and Rides. Clicking anywhere
// on a card edits it; the title is the keyboard-reachable edit button.
export function bindRideCards(container, state) {
  container.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-ride-id]')
    if (!card) return
    const ride = state.rides.find(r => r.id === card.dataset.rideId)
    const action = e.target.closest('[data-action]')?.dataset.action
    if (action === 'done') openRideForm({ ride: { ...ride, status: 'completed' } })
    else if (action === 'skip') {
      const { error } = await saveRide({ ...ride, status: 'skipped' })
      if (error) return toast(friendlyError(error, 'skip the ride'), { error: true })
      toast('Ride skipped', { action: { label: 'Undo', onClick: () => saveRide(ride) } })
    }
    else openRideForm({ ride })
  })
}

function readinessScore(r) {
  const vals = READINESS.map(m => r[m.id]).filter(Boolean)
  if (vals.length < READINESS.length) return `Rate all three (${vals.length} of 3)`
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  if (avg >= 4) return 'Ready to push'
  if (avg >= 3) return 'Good to train'
  if (avg >= 2) return 'Keep it easy'
  return 'Consider resting'
}

// The week drawn like a route's elevation profile: each day's completed load
// is the height, so a hard Tuesday reads as a climb.
function weekProfile(weekDays, weekRides, today) {
  const W = 700, H = 150, base = 138
  const loads = weekDays.map(d => weekRides.filter(r => r.ride_date === d).reduce((a, r) => a + rideLoad(r), 0))
  const max = Math.max(...loads)
  const x = i => ((i + 0.5) / 7) * W
  const y = i => (max ? base - (loads[i] / max) * (base - 14) : base)
  // Cubic segments with horizontal handles: smooth like terrain, never overshoots.
  const pts = [[0, y(0)], ...loads.map((_, i) => [x(i), y(i)]), [W, y(6)]]
  const line = pts.reduce((d, [px, py], i) => {
    if (i === 0) return `M${px},${py.toFixed(1)}`
    const [qx, qy] = pts[i - 1]
    const mx = ((qx + px) / 2).toFixed(1)
    return `${d} C${mx},${qy.toFixed(1)} ${mx},${py.toFixed(1)} ${px.toFixed(1)},${py.toFixed(1)}`
  }, '')
  const todayIdx = weekDays.indexOf(today)

  const summary = weekDays.map((d, i) => {
    const rides = weekRides.filter(r => r.ride_date === d)
    const desc = rides.some(isDone) ? `load ${loads[i].toLocaleString()}` : rides.some(r => r.status === 'planned') ? 'ride planned' : 'no ride'
    return `${formatDate(d, { weekday: 'long' })}: ${desc}`
  }).join('. ')

  return `
    <svg class="profile-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Daily training load this week. ${summary}">
      <line class="profile-base" x1="0" y1="${base}" x2="${W}" y2="${base}"/>
      <path class="profile-area" d="${line} L${W},${base} L0,${base} Z"/>
      <path class="profile-line" d="${line}"/>
      ${todayIdx >= 0 ? `<line class="profile-today" x1="${x(todayIdx)}" y1="0" x2="${x(todayIdx)}" y2="${base}"/>` : ''}
    </svg>
    <div class="profile-days" aria-hidden="true">
      ${weekDays.map((d, i) => {
        const rides = weekRides.filter(r => r.ride_date === d)
        const cls = rides.some(isDone) ? 'done' : rides.some(r => r.status === 'planned') ? 'planned' : ''
        return `
          <div class="profile-day ${d === today ? 'today' : ''}" title="${rides.map(r => esc(r.title || rideType(r.ride_type).label)).join(', ')}">
            <span class="profile-mark ${cls}"></span>
            <b>${formatDate(d, { weekday: 'short' })}</b>
            <span class="tabular">${loads[i] ? loads[i].toLocaleString() : ''}</span>
          </div>`
      }).join('')}
    </div>
    ${max ? '' : `<p class="faint small" style="margin-top:var(--space-2)">No completed rides with an effort rating this week yet.</p>`}`
}

function stat(label, value) {
  return `<div class="stat"><span class="faint small">${label}</span><span class="kpi-value stat-value">${value}</span></div>`
}

export function rideCard(r) {
  const type = rideType(r.ride_type)
  const details = [
    r.duration_min && formatDuration(r.duration_min),
    r.distance_km && `${Number(r.distance_km).toLocaleString()} km`,
    r.elevation_m && `${Number(r.elevation_m).toLocaleString()} m ↑`,
    r.avg_power_w && `${r.avg_power_w} W`,
    r.avg_hr && `${r.avg_hr} bpm`,
    r.rpe && `RPE ${r.rpe}`
  ].filter(Boolean)

  return `
    <div class="ride-card status-${r.status}" data-ride-id="${r.id}" style="--type-color:${type.color}">
      <div class="ride-main">
        <button class="ride-title" data-action="edit" aria-label="Edit ${esc(r.title || type.label)}, ${formatDate(r.ride_date)}">${esc(r.title || type.label)}</button>
        <div class="ride-meta">
          <span class="type-chip">${type.label}</span>
          ${details.map(d => `<span>${d}</span>`).join('')}
        </div>
        ${r.notes ? `<div class="ride-notes">${esc(r.notes)}</div>` : ''}
      </div>
      <div class="ride-actions">
        ${r.status === 'completed' ? `<span class="badge badge-success">Done</span>`
          : r.status === 'skipped' ? `<span class="badge badge-error">Skipped</span>`
          : `<button class="btn btn-ghost btn-sm" data-action="skip">Skip</button>
             <button class="btn btn-primary btn-sm" data-action="done">Mark done</button>`}
      </div>
    </div>`
}
