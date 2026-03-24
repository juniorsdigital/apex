import { updateWorkoutStatus } from '../../shared/apex-supabase.js'

export function renderToday(state) {
  const today = new Date().toISOString().split('T')[0]
  const todayWorkouts = (state.workouts || []).filter(w => w.workout_date === today)

  const wrap = document.createElement('div')
  wrap.innerHTML = `
    <div style="margin-bottom:var(--space-6)">
      <h1 style="font-size:var(--text-lg);font-weight:700">Today</h1>
      <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-1)">
        ${new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
      </p>
    </div>

    <!-- Readiness Check -->
    <div class="card" style="margin-bottom:var(--space-4)">
      <h2 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-4)">Readiness Check</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3)" id="readiness-grid">
        ${['Sleep quality','Energy level','Muscle soreness'].map((label, i) => `
          <div>
            <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-2)">${label}</div>
            <div style="display:flex;gap:var(--space-1)">
              ${[1,2,3,4,5].map(n => `
                <button class="readiness-dot" data-metric="${i}" data-val="${n}"
                  style="width:28px;height:28px;border-radius:50%;border:1px solid var(--color-border);background:var(--color-surface-offset);cursor:pointer;font-size:10px;color:var(--color-text-muted);transition:background var(--transition)"
                >${n}</button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Today's Sessions -->
    <div class="card">
      <h2 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-4)">
        ${todayWorkouts.length > 0 ? `${todayWorkouts.length} Session${todayWorkouts.length > 1 ? 's' : ''} Today` : 'No Sessions Scheduled'}
      </h2>
      ${todayWorkouts.length === 0 ? `
        <div style="text-align:center;padding:var(--space-10) var(--space-6)">
          <i data-lucide="calendar-check" style="width:40px;height:40px;color:var(--color-text-faint);margin:0 auto var(--space-3)"></i>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted)">Rest day or no workouts assigned yet.</p>
          <p style="font-size:var(--text-xs);color:var(--color-text-faint);margin-top:var(--space-2)">Check your schedule or message your coach.</p>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:var(--space-3)">
          ${todayWorkouts.map(wo => `
            <div class="card card-sm" style="background:var(--color-surface-offset)" data-workout-id="${wo.id}">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
                <div style="flex:1">
                  <div style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-1)">${wo.title || 'Training Session'}</div>
                  ${wo.description ? `<div style="font-size:var(--text-xs);color:var(--color-text-muted)">${wo.description}</div>` : ''}
                  <div style="display:flex;gap:var(--space-3);margin-top:var(--space-2)">
                    ${wo.duration_minutes ? `<span style="font-size:var(--text-xs);color:var(--color-text-muted)"><i data-lucide="clock" style="width:12px;height:12px;display:inline;vertical-align:middle"></i> ${wo.duration_minutes} min</span>` : ''}
                    ${wo.type ? `<span style="font-size:var(--text-xs);color:var(--color-primary)">${wo.type}</span>` : ''}
                  </div>
                </div>
                <div style="display:flex;gap:var(--space-2);flex-shrink:0">
                  ${wo.status !== 'completed' ? `
                    <button class="btn btn-primary mark-done-btn" data-id="${wo.id}" style="font-size:var(--text-xs);padding:var(--space-2) var(--space-3)">
                      Mark Done
                    </button>
                  ` : `
                    <span class="badge badge-success">✓ Completed</span>
                  `}
                  <button class="btn btn-ghost skip-btn" data-id="${wo.id}" style="font-size:var(--text-xs);padding:var(--space-2) var(--space-3)">
                    Skip
                  </button>
                </div>
              </div>
              ${wo.notes ? `
                <div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--color-surface);border-radius:var(--radius-sm);font-size:var(--text-xs);color:var(--color-text-muted);border-left:2px solid var(--color-primary)">
                  ${wo.notes}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `

  // Readiness dots
  wrap.querySelectorAll('.readiness-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const metric = dot.dataset.metric
      wrap.querySelectorAll(`.readiness-dot[data-metric="${metric}"]`).forEach(d => {
        d.style.background = parseInt(d.dataset.val) <= parseInt(dot.dataset.val)
          ? 'var(--color-primary)' : 'var(--color-surface-offset)'
        d.style.color = parseInt(d.dataset.val) <= parseInt(dot.dataset.val)
          ? 'var(--color-text-inverse)' : 'var(--color-text-muted)'
      })
    })
  })

  // Mark done / skip
  wrap.querySelectorAll('.mark-done-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { error } = await updateWorkoutStatus(btn.dataset.id, 'completed')
      if (!error) {
        const wo = state.workouts.find(w => w.id === btn.dataset.id)
        if (wo) wo.status = 'completed'
        // Refresh today view inline
        btn.closest('[data-workout-id]').querySelector('.mark-done-btn')?.replaceWith(
          Object.assign(document.createElement('span'), { className: 'badge badge-success', textContent: '✓ Completed' })
        )
      }
    })
  })

  wrap.querySelectorAll('.skip-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await updateWorkoutStatus(btn.dataset.id, 'skipped')
      const card = btn.closest('[data-workout-id]')
      if (card) card.style.opacity = '0.4'
    })
  })

  return wrap
}
