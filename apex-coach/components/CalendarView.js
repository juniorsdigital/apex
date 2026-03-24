import { getWorkoutsForCoach, assignWorkout, deleteWorkout } from '../../shared/apex-supabase.js'

export function renderCalendar(state) {
  const wrap = document.createElement('div')

  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())

  const weeks = []
  for (let w = 0; w < 4; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + w * 7 + d)
      week.push(date)
    }
    weeks.push(week)
  }

  const workoutsByDate = {}
  ;(state.workouts || []).forEach(wo => {
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
          4-week view — click a day to assign a workout
        </p>
      </div>
    </div>

    <!-- Day header -->
    <div style="display:grid;grid-template-columns:auto repeat(7,1fr);gap:var(--space-2);margin-bottom:var(--space-2)">
      <div style="font-size:var(--text-xs);color:var(--color-text-faint)">Week</div>
      ${dayLabels.map(d => `<div style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-align:center">${d}</div>`).join('')}
    </div>

    <!-- Weeks -->
    <div id="calendar-weeks" style="display:flex;flex-direction:column;gap:var(--space-2)">
      ${weeks.map((week, wi) => `
        <div style="display:grid;grid-template-columns:auto repeat(7,1fr);gap:var(--space-2)">
          <div style="font-size:var(--text-xs);color:var(--color-text-faint);padding-top:var(--space-3);min-width:40px">
            W${wi + 1}
          </div>
          ${week.map(date => {
            const key = date.toISOString().split('T')[0]
            const dayWorkouts = workoutsByDate[key] || []
            const isToday = key === today.toISOString().split('T')[0]
            return `
              <div
                class="calendar-day"
                data-date="${key}"
                style="
                  min-height: 80px;
                  background: var(--color-surface);
                  border: 1px solid ${isToday ? 'var(--color-primary)' : 'var(--color-border)'};
                  border-radius: var(--radius-md);
                  padding: var(--space-2);
                  cursor: pointer;
                  transition: background var(--transition);
                "
              >
                <div style="font-size:var(--text-xs);font-weight:${isToday ? '700' : '400'};color:${isToday ? 'var(--color-primary)' : 'var(--color-text-muted)'};margin-bottom:var(--space-1)">
                  ${date.getDate()}
                </div>
                ${dayWorkouts.map(wo => `
                  <div style="
                    font-size:10px;background:var(--color-primary-highlight);color:var(--color-primary);
                    border-radius:var(--radius-sm);padding:2px var(--space-2);margin-bottom:2px;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                  ">${wo.title || 'Session'}</div>
                `).join('')}
              </div>
            `
          }).join('')}
        </div>
      `).join('')}
    </div>

    <!-- Workout assignment modal placeholder -->
    <div id="calendar-modal" style="display:none"></div>
  `

  // Day click → show assignment modal
  wrap.querySelectorAll('.calendar-day').forEach(day => {
    day.addEventListener('mouseenter', () => { day.style.background = 'var(--color-surface-offset)' })
    day.addEventListener('mouseleave', () => { day.style.background = 'var(--color-surface)' })
    day.addEventListener('click', () => showAssignModal(day.dataset.date, state, wrap))
  })

  return wrap
}

function showAssignModal(date, state, wrap) {
  const existing = wrap.querySelector('#calendar-modal-inner')
  if (existing) existing.remove()

  const overlay = document.createElement('div')
  overlay.id = 'calendar-modal-inner'
  overlay.style.cssText = `
    position:fixed;inset:0;background:oklch(0 0 0 / 0.6);display:flex;
    align-items:center;justify-content:center;z-index:100;padding:var(--space-6)
  `
  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:440px;padding:var(--space-8)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6)">
        <h2 style="font-size:var(--text-base);font-weight:700">Assign Workout — ${date}</h2>
        <button id="modal-close" class="btn btn-ghost" style="padding:var(--space-2)">✕</button>
      </div>
      <form id="assign-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
        <div>
          <label style="display:block;font-size:var(--text-sm);font-weight:500;margin-bottom:var(--space-2)">Workout Title</label>
          <input type="text" class="input" name="title" placeholder="e.g. Zone 2 Base Ride" required>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
          <div>
            <label style="display:block;font-size:var(--text-sm);font-weight:500;margin-bottom:var(--space-2)">Duration (min)</label>
            <input type="number" class="input" name="duration_minutes" placeholder="60" min="1" max="480">
          </div>
          <div>
            <label style="display:block;font-size:var(--text-sm);font-weight:500;margin-bottom:var(--space-2)">Type</label>
            <select class="input" name="type">
              <option value="key">Key session</option>
              <option value="support">Support</option>
              <option value="recovery">Recovery</option>
            </select>
          </div>
        </div>
        <div>
          <label style="display:block;font-size:var(--text-sm);font-weight:500;margin-bottom:var(--space-2)">Notes</label>
          <textarea class="input" name="notes" rows="3" placeholder="Intervals, targets, cues…" style="resize:vertical"></textarea>
        </div>
        <div id="assign-error" style="display:none;color:var(--color-error);font-size:var(--text-sm)"></div>
        <button type="submit" class="btn btn-primary">Assign Workout</button>
      </form>
    </div>
  `

  document.body.appendChild(overlay)

  overlay.querySelector('#modal-close').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })

  overlay.querySelector('#assign-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const payload = {
      coach_id: state.user.id,
      athlete_id: state.user.id, // replace with selected athlete in full impl
      title: fd.get('title'),
      workout_date: date,
      duration_minutes: parseInt(fd.get('duration_minutes')) || null,
      type: fd.get('type'),
      notes: fd.get('notes')
    }
    const { data, error } = await assignWorkout(payload)
    if (error) {
      overlay.querySelector('#assign-error').style.display = 'block'
      overlay.querySelector('#assign-error').textContent = error.message
    } else {
      state.workouts = [...(state.workouts || []), data]
      overlay.remove()
      // Re-render calendar section
      const main = document.querySelector('.app-main')
      if (main) {
        main.innerHTML = ''
        const { renderCalendar } = await import('./CalendarView.js')
        main.appendChild(renderCalendar(state))
      }
    }
  })
}
