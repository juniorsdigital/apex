import { state, setState } from '../apex-coach-app.js'

export function renderCalendar(viewState) {
  const wrap = document.createElement('div')
  const athlete = viewState.athlete
  const allWorkouts = viewState.workouts || []

  const today = new Date()
  const startOfView = new Date(today)
  startOfView.setDate(today.getDate() - today.getDay()) // Sunday of current week

  const weeks = []
  for (let w = -1; w < 3; w++) { // Show prev week + current + 3 ahead = 5 weeks
    const week = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startOfView)
      date.setDate(startOfView.getDate() + w * 7 + d)
      week.push(date)
    }
    weeks.push({ offset: w, days: week })
  }

  const CYCLE_COLORS = {
    Endurance: { bg: '#1a6fa820', text: 'var(--color-blue)' },
    Power:     { bg: '#da710120', text: 'var(--color-orange)' },
    Strength:  { bg: '#d1990020', text: 'var(--color-gold)' },
    Racing:    { bg: '#a1354420', text: 'var(--color-notification)' }
  }

  const workoutsByDate = {}
  allWorkouts.forEach(wo => {
    const key = wo.workout_date
    if (!workoutsByDate[key]) workoutsByDate[key] = []
    workoutsByDate[key].push(wo)
  })

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  wrap.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-6)">
      <div>
        <h1 style="font-size:var(--text-lg);font-weight:700">Training Calendar</h1>
        <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-1)">
          ${athlete ? athlete.full_name : 'No athlete selected'} · Click a day to assign a workout
        </p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:48px repeat(7,1fr);gap:var(--space-2);margin-bottom:var(--space-2);padding:0 var(--space-1)">
      <div></div>
      ${dayLabels.map(d => `<div style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-align:center">${d}</div>`).join('')}
    </div>

    <div style="display:flex;flex-direction:column;gap:var(--space-2)">
      ${weeks.map(({ offset, days }) => {
        const weekLabel = offset === 0 ? 'This week' : offset === -1 ? 'Last week' : `+${offset}w`
        return `
          <div style="display:grid;grid-template-columns:48px repeat(7,1fr);gap:var(--space-2);align-items:start">
            <div style="font-size:10px;color:var(--color-text-faint);padding-top:var(--space-3);text-align:right;padding-right:var(--space-2)">${weekLabel}</div>
            ${days.map(date => {
              const key = date.toISOString().split('T')[0]
              const dayWorkouts = workoutsByDate[key] || []
              const isToday = key === today.toISOString().split('T')[0]
              const isPast = date < today && !isToday
              return `
                <div
                  class="calendar-day"
                  data-date="${key}"
                  style="
                    min-height:72px;
                    background:var(--color-surface);
                    border:1px solid ${isToday ? 'var(--color-primary)' : 'var(--color-border)'};
                    border-radius:var(--radius-md);
                    padding:var(--space-2);
                    cursor:pointer;
                    opacity:${isPast && dayWorkouts.length === 0 ? '0.5' : '1'};
                    transition:background var(--transition-interactive);
                  "
                >
                  <div style="font-size:var(--text-xs);font-weight:${isToday ? '700' : '500'};color:${isToday ? 'var(--color-primary)' : 'var(--color-text-muted)'};margin-bottom:var(--space-1);">
                    ${date.getDate()}
                  </div>
                  ${dayWorkouts.map(wo => {
                    const c = CYCLE_COLORS[wo.cycle_type] || { bg: 'var(--color-primary-highlight)', text: 'var(--color-primary)' }
                    return `
                      <div
                        data-workout-id="${wo.id}"
                        style="
                          font-size:10px;
                          background:${c.bg};
                          color:${c.text};
                          border-radius:var(--radius-sm);
                          padding:2px var(--space-2);
                          margin-bottom:2px;
                          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                          ${wo.status === 'completed' ? 'text-decoration:line-through;opacity:.7' : ''}
                        "
                      >${wo.title}</div>
                    `
                  }).join('')}
                </div>
              `
            }).join('')}
          </div>
        `
      }).join('')}
    </div>

    <div id="calendar-modal"></div>
  `

  wrap.querySelectorAll('.calendar-day').forEach(day => {
    day.addEventListener('mouseenter', () => { day.style.background = 'var(--color-surface-offset)' })
    day.addEventListener('mouseleave', () => { day.style.background = 'var(--color-surface)' })
    day.addEventListener('click', () => showAssignModal(day.dataset.date, viewState, wrap))
  })

  // Workout pill click → show detail
  wrap.querySelectorAll('[data-workout-id]').forEach(pill => {
    pill.addEventListener('click', e => {
      e.stopPropagation()
      const wo = allWorkouts.find(w => w.id === pill.dataset.workoutId)
      if (wo) showWorkoutDetail(wo, viewState, wrap)
    })
  })

  return wrap
}

function showAssignModal(date, viewState, wrap) {
  removeModal()
  const templates = state.templates || []
  const athlete = viewState.athlete

  const overlay = document.createElement('div')
  overlay.id = 'cal-overlay'
  overlay.style.cssText = `position:fixed;inset:0;background:oklch(0 0 0/0.6);display:flex;align-items:center;justify-content:center;z-index:200;padding:var(--space-6);overflow-y:auto`

  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:480px;padding:var(--space-8);margin:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6)">
        <h2 style="font-size:var(--text-base);font-weight:700">Assign Workout — ${date}</h2>
        <button id="modal-close" class="btn btn-ghost">✕</button>
      </div>

      <!-- Template picker -->
      <div style="margin-bottom:var(--space-4)">
        <label class="form-label">From Workout Bank (optional)</label>
        <select id="template-picker" class="input" style="font-size:var(--text-sm)">
          <option value="">— Custom workout —</option>
          ${templates.map(t => `<option value="${t.id}">${t.name} (${t.sport}, ${t.duration_minutes} min)</option>`).join('')}
        </select>
      </div>

      <form id="assign-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
        <div>
          <label class="form-label">Workout Title</label>
          <input type="text" class="input" name="title" placeholder="e.g. Zone 2 Base Ride" required>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3)">
          <div>
            <label class="form-label">Duration (min)</label>
            <input type="number" class="input" name="duration_minutes" placeholder="60" min="1" max="480">
          </div>
          <div>
            <label class="form-label">RPE</label>
            <input type="number" class="input" name="rpe" placeholder="5" min="1" max="10">
          </div>
          <div>
            <label class="form-label">Type</label>
            <select class="input" name="type">
              <option value="key">Key</option>
              <option value="support" selected>Support</option>
              <option value="recovery">Recovery</option>
            </select>
          </div>
        </div>
        <div>
          <label class="form-label">Cycle Phase</label>
          <select class="input" name="cycle_type">
            <option>Endurance</option><option>Power</option><option>Strength</option><option>Racing</option>
          </select>
        </div>
        <div>
          <label class="form-label">Notes</label>
          <textarea class="input" name="notes" rows="3" style="resize:vertical" placeholder="Intervals, targets, cues…"></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Assign Workout</button>
      </form>
    </div>
  `

  document.body.appendChild(overlay)

  overlay.querySelector('#modal-close').addEventListener('click', removeModal)
  overlay.addEventListener('click', e => { if (e.target === overlay) removeModal() })

  // Auto-fill from template
  overlay.querySelector('#template-picker').addEventListener('change', e => {
    const t = templates.find(x => x.id === e.target.value)
    if (!t) return
    const form = overlay.querySelector('#assign-form')
    form.querySelector('[name="title"]').value = t.name
    form.querySelector('[name="duration_minutes"]').value = t.duration_minutes
    form.querySelector('[name="rpe"]').value = t.rpe
    form.querySelector('[name="cycle_type"]').value = t.cycle_type
    form.querySelector('[name="notes"]').value = t.structure.map(s => `${s.label} (${s.duration_min}min): ${s.target}`).join('\n')
  })

  overlay.querySelector('#assign-form').addEventListener('submit', e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const newWorkout = {
      id: 'w-' + Date.now(),
      coach_id: 'coach-dev-001',
      athlete_id: athlete ? athlete.id : state.selectedAthleteId,
      title: fd.get('title'),
      workout_date: date,
      duration_minutes: parseInt(fd.get('duration_minutes')) || 60,
      rpe: parseInt(fd.get('rpe')) || 5,
      type: fd.get('type'),
      cycle_type: fd.get('cycle_type'),
      notes: fd.get('notes'),
      status: 'assigned'
    }
    setState({ workouts: [...state.workouts, newWorkout] })
    removeModal()
    // Refresh calendar in place
    const main = document.querySelector('.app-main')
    if (main) {
      main.innerHTML = ''
      import('../apex-coach-app.js').then(({ state: s, selectedAthlete, workoutsForAthlete }) => {
        const ath = selectedAthlete()
        const ws = ath ? workoutsForAthlete(ath.id) : []
        const { renderCalendar } = await import('./CalendarView.js').catch(() => ({}))
        // Simpler: re-run renderApp
      })
    }
    import('../apex-coach-app.js').then(m => m.renderApp())
  })
}

function showWorkoutDetail(wo, viewState, wrap) {
  removeModal()
  const overlay = document.createElement('div')
  overlay.id = 'cal-overlay'
  overlay.style.cssText = `position:fixed;inset:0;background:oklch(0 0 0/0.6);display:flex;align-items:center;justify-content:center;z-index:200;padding:var(--space-6)`

  const statusBadge = wo.status === 'completed'
    ? `<span class="badge badge-success">Completed</span>`
    : `<span class="badge badge-primary">Assigned</span>`

  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:440px;padding:var(--space-8)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-4)">
        <div>
          <h2 style="font-size:var(--text-base);font-weight:700;margin-bottom:var(--space-1)">${wo.title}</h2>
          <div style="display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap">
            ${statusBadge}
            <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${wo.workout_date}</span>
          </div>
        </div>
        <button id="modal-close" class="btn btn-ghost">✕</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-4);padding:var(--space-3);background:var(--color-surface-offset);border-radius:var(--radius-md)">
        <div style="text-align:center">
          <div style="font-size:var(--text-sm);font-weight:700">${wo.duration_minutes || '—'}</div>
          <div style="font-size:10px;color:var(--color-text-muted)">minutes</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:var(--text-sm);font-weight:700">${wo.rpe || '—'}</div>
          <div style="font-size:10px;color:var(--color-text-muted)">RPE</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:var(--text-sm);font-weight:700">${wo.avg_hr || '—'}</div>
          <div style="font-size:10px;color:var(--color-text-muted)">Avg HR</div>
        </div>
      </div>

      ${wo.notes ? `
        <div style="margin-bottom:var(--space-4)">
          <p style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:500;margin-bottom:var(--space-2)">Notes</p>
          <p style="font-size:var(--text-sm);white-space:pre-wrap">${wo.notes}</p>
        </div>
      ` : ''}

      <div style="display:flex;gap:var(--space-3);justify-content:flex-end;padding-top:var(--space-3);border-top:1px solid var(--color-divider)">
        <button id="delete-workout" class="btn btn-ghost" style="color:var(--color-error);margin-right:auto">
          Remove
        </button>
        ${wo.status !== 'completed' ? `
          <button id="mark-complete" class="btn btn-primary" style="font-size:var(--text-xs)">Mark Complete</button>
        ` : ''}
      </div>
    </div>
  `

  document.body.appendChild(overlay)
  overlay.querySelector('#modal-close').addEventListener('click', removeModal)
  overlay.addEventListener('click', e => { if (e.target === overlay) removeModal() })

  overlay.querySelector('#delete-workout')?.addEventListener('click', () => {
    import('../apex-coach-app.js').then(({ state: s, setState: ss, renderApp: ra }) => {
      ss({ workouts: s.workouts.filter(w => w.id !== wo.id) })
      removeModal()
      ra()
    })
  })

  overlay.querySelector('#mark-complete')?.addEventListener('click', () => {
    import('../apex-coach-app.js').then(({ state: s, setState: ss, renderApp: ra }) => {
      ss({ workouts: s.workouts.map(w => w.id === wo.id ? { ...w, status: 'completed' } : w) })
      removeModal()
      ra()
    })
  })
}

function removeModal() {
  document.getElementById('cal-overlay')?.remove()
}
