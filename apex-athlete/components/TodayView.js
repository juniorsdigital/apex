// Today dashboard — available to guests and signed-in riders alike.
import { navigate, reload, saveRide } from '../app.js'
import { guestDataCount } from '../lib/store.js'
import { rideType, rideLoad, isDone, sum } from '../lib/metrics.js'
import { esc, dateKey, addDays, startOfWeek, formatDate, formatDuration } from '../lib/util.js'
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
        <h2 class="page-title">${greeting}${firstName ? ', ' + esc(firstName) : ''}</h2>
        <p class="muted small">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>
      <div class="row">
        <button class="btn btn-ghost" id="plan-btn"><i data-lucide="calendar-plus" class="icon-sm"></i> Plan</button>
        <button class="btn btn-primary" id="log-btn"><i data-lucide="plus" class="icon-sm"></i> Log ride</button>
      </div>
    </div>

    ${importable ? `
      <div class="alert alert-info row-between">
        <span>You logged ${importable} ride${importable > 1 ? 's' : ''} on this device before signing in.</span>
        <button class="btn btn-primary btn-sm" id="import-btn">Add to my account</button>
      </div>` : ''}

    <section class="card">
      <div class="card-head">
        <h3>Today's riding</h3>
        ${todayRides.length ? `<span class="faint small">${todayRides.filter(isDone).length}/${todayRides.length} done</span>` : ''}
      </div>
      ${todayRides.length ? `
        <div class="stack-sm">${todayRides.map(rideCard).join('')}</div>
      ` : `
        <div class="empty">
          <i data-lucide="bike" class="icon-lg"></i>
          <p>Nothing logged yet today.</p>
          <p class="faint small">Log a ride when you're back, or plan one for later.</p>
        </div>
      `}
    </section>

    <div class="grid-2">
      <section class="card">
        <div class="card-head">
          <h3>How are you feeling?</h3>
          <span class="faint small" id="readiness-score">${readinessScore(readiness)}</span>
        </div>
        <div class="stack-sm">
          ${READINESS.map(m => `
            <div class="readiness-row">
              <span class="readiness-label"><i data-lucide="${m.icon}" class="icon-xs"></i> ${m.label}</span>
              <div class="readiness-scale" role="radiogroup" aria-label="${m.label}">
                ${[1,2,3,4,5].map(n => `
                  <button class="readiness-btn ${readiness[m.id] >= n ? 'on' : ''}" data-metric="${m.id}" data-val="${n}"
                    role="radio" aria-checked="${readiness[m.id] === n}" aria-label="${m.label} ${n} of 5">${n}</button>
                `).join('')}
              </div>
            </div>
          `).join('')}
          <div class="row-between faint small"><span>1 = rough</span><span>5 = great</span></div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <h3>This week</h3>
          <span class="faint small">${formatDate(weekDays[0], { month: 'short', day: 'numeric' })} – ${formatDate(weekDays[6], { month: 'short', day: 'numeric' })}</span>
        </div>
        <div class="week-strip">
          ${weekDays.map(d => {
            const rides = weekRides.filter(r => r.ride_date === d)
            const cls = rides.some(isDone) ? 'done' : rides.some(r => r.status === 'planned') ? 'planned' : ''
            return `
              <div class="week-day ${d === today ? 'today' : ''}">
                <span class="faint">${formatDate(d, { weekday: 'narrow' })}</span>
                <span class="week-dot ${cls}" title="${rides.map(r => esc(r.title || rideType(r.ride_type).label)).join(', ')}"></span>
              </div>`
          }).join('')}
        </div>
        <div class="stat-grid">
          ${stat('Rides', weekDone.length)}
          ${stat('Time', formatDuration(sum(weekDone, 'duration_min')))}
          ${stat('Distance', `${Math.round(sum(weekDone, 'distance_km'))} km`)}
          ${stat('Load', weekDone.reduce((a, r) => a + rideLoad(r), 0).toLocaleString())}
        </div>
        ${upNext ? `
          <div class="up-next">
            <span class="faint small">Up next · ${formatDate(upNext.ride_date)}</span>
            <span>${esc(upNext.title || rideType(upNext.ride_type).label)}${upNext.duration_min ? ` · ${formatDuration(upNext.duration_min)}` : ''}</span>
          </div>` : ''}
      </section>
    </div>

    ${!state.user ? `
      <section class="card guest-cta row-between">
        <div>
          <h3>Keep your history</h3>
          <p class="muted small">You're in guest mode, so rides are saved only in this browser. Sign in to sync them and to use the calendar, ride log and progress charts.</p>
        </div>
        <button class="btn btn-primary" id="cta-signin">Sign in</button>
      </section>` : ''}
  `

  wrap.querySelector('#log-btn').addEventListener('click', () => openRideForm({ status: 'completed' }))
  wrap.querySelector('#plan-btn').addEventListener('click', () => openRideForm({ status: 'planned' }))
  wrap.querySelector('#cta-signin')?.addEventListener('click', () => navigate('login'))

  wrap.querySelector('#import-btn')?.addEventListener('click', async (e) => {
    e.target.disabled = true
    e.target.textContent = 'Importing…'
    const { error } = await state.store.importGuestData()
    if (error) { e.target.textContent = 'Import failed'; alert(error.message); return }
    await reload()
  })

  // Readiness — saves on every tap.
  wrap.querySelectorAll('.readiness-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const values = { ...state.readiness[today], [btn.dataset.metric]: Number(btn.dataset.val) }
      state.readiness[today] = values
      wrap.querySelectorAll(`.readiness-btn[data-metric="${btn.dataset.metric}"]`).forEach(b => {
        b.classList.toggle('on', Number(b.dataset.val) <= values[btn.dataset.metric])
        b.setAttribute('aria-checked', String(b === btn))
      })
      wrap.querySelector('#readiness-score').textContent = readinessScore(values)
      await state.store.saveReadiness(today, values)
    })
  })

  // Ride card actions
  wrap.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-ride-id]')
    if (!card) return
    const ride = state.rides.find(r => r.id === card.dataset.rideId)
    const action = e.target.closest('[data-action]')?.dataset.action
    if (action === 'done') openRideForm({ ride: { ...ride, status: 'completed' } })
    else if (action === 'skip') await saveRide({ ...ride, status: 'skipped' })
    else openRideForm({ ride })
  })

  return wrap
}

function readinessScore(r) {
  const vals = READINESS.map(m => r[m.id]).filter(Boolean)
  if (vals.length < READINESS.length) return 'Tap to rate'
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  if (avg >= 4) return 'Ready to push'
  if (avg >= 3) return 'Good to train'
  if (avg >= 2) return 'Keep it easy'
  return 'Consider resting'
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
    <div class="ride-card status-${r.status}" data-ride-id="${r.id}" role="button" tabindex="0" style="--type-color:${type.color}">
      <div class="ride-main">
        <div class="ride-title">${esc(r.title || type.label)}</div>
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
