import { updateWorkoutStatus, supabase } from './shared/apex-supabase.js'

export function renderToday(state) {
  const today = new Date().toISOString().split('T')[0]
  const todayWorkouts = (state.workouts || []).filter(w => w.workout_date === today)
  const wrap = document.createElement('div')

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  wrap.innerHTML = `
    <div style="margin-bottom:var(--space-6)">
      <h1 style="font-size:var(--text-lg);font-weight:700">
        ${greeting()}${state.profile?.full_name ? ', ' + state.profile.full_name.split(' ')[0] : ''}
      </h1>
      <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-1)">
        ${new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
      </p>
    </div>

    <!-- Readiness Check -->
    <div class="card" style="margin-bottom:var(--space-4)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">
        <h2 style="font-size:var(--text-sm);font-weight:600">Readiness Check</h2>
        <span style="font-size:var(--text-xs);color:var(--color-text-faint)">Tap to rate 1–5</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4)">
        ${[
          { id: 'sleep',  label: 'Sleep Quality', icon: 'moon' },
          { id: 'energy', label: 'Energy Level',  icon: 'zap' },
          { id: 'soreness', label: 'Muscle Soreness', icon: 'activity' }
        ].map(m => `
          <div>
            <div style="display:flex;align-items:center;gap:var(--space-1);margin-bottom:var(--space-2)">
              <i data-lucide="${m.icon}" style="width:12px;height:12px;color:var(--color-text-faint)"></i>
              <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${m.label}</span>
            </div>
            <div style="display:flex;gap:4px" data-metric="${m.id}">
              ${[1,2,3,4,5].map(n => `
                <button
                  class="readiness-btn"
                  data-metric="${m.id}" data-val="${n}"
                  aria-label="${m.label} ${n}"
                  style="
                    flex:1;height:28px;border-radius:var(--radius-sm);
                    border:1px solid var(--color-border);
                    background:var(--color-surface-offset);
                    color:var(--color-text-faint);
                    font-size:10px;font-weight:600;cursor:pointer;
                    transition:background var(--transition),color var(--transition),border-color var(--transition)
                  "
                >${n}</button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Today's Sessions -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">
        <h2 style="font-size:var(--text-sm);font-weight:600">
          ${todayWorkouts.length > 0
            ? `${todayWorkouts.length} Session${todayWorkouts.length > 1 ? 's' : ''} Today`
            : "Today's Sessions"}
        </h2>
        ${todayWorkouts.length > 0 ? `
          <span style="font-size:var(--text-xs);color:var(--color-text-faint)">
            ${todayWorkouts.filter(w => w.status === 'completed').length}/${todayWorkouts.length} done
          </span>
        ` : ''}
      </div>

      ${todayWorkouts.length === 0 ? `
        <div style="text-align:center;padding:var(--space-10) var(--space-6)">
          <i data-lucide="coffee" style="width:40px;height:40px;color:var(--color-text-faint);margin:0 auto var(--space-3)"></i>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted)">Rest day — no sessions scheduled.</p>
          <p style="font-size:var(--text-xs);color:var(--color-text-faint);margin-top:var(--space-1)">Recovery is part of training. Check your schedule for tomorrow.</p>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:var(--space-3)" id="workout-list">
          ${todayWorkouts.map(wo => renderWorkoutCard(wo, state.user)).join('')}
        </div>
      `}
    </div>

    <!-- Workout modal container -->
    <div id="workout-modal"></div>
  `

  // Readiness dot interactions
  wrap.querySelectorAll('.readiness-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const metric = btn.dataset.metric
      const val = parseInt(btn.dataset.val)
      wrap.querySelectorAll(`.readiness-btn[data-metric="${metric}"]`).forEach(b => {
        const bVal = parseInt(b.dataset.val)
        const active = bVal <= val
        b.style.background = active ? 'var(--color-primary)' : 'var(--color-surface-offset)'
        b.style.color = active ? 'var(--color-text-inverse)' : 'var(--color-text-faint)'
        b.style.borderColor = active ? 'var(--color-primary)' : 'var(--color-border)'
      })
    })
  })

  // Mark done → open RPE logging modal
  wrap.addEventListener('click', async (e) => {
    const doneBtn = e.target.closest('.mark-done-btn')
    const skipBtn = e.target.closest('.skip-btn')
    const detailBtn = e.target.closest('.detail-btn')

    if (detailBtn) {
      const wo = todayWorkouts.find(w => w.id === detailBtn.dataset.id)
      if (wo) showWorkoutModal(wo, state, wrap)
    }

    if (doneBtn) {
      const wo = todayWorkouts.find(w => w.id === doneBtn.dataset.id)
      if (wo) showRpeModal(wo, state, wrap)
    }

    if (skipBtn) {
      const { error } = await updateWorkoutStatus(skipBtn.dataset.id, 'skipped')
      if (!error) {
        const wo = state.workouts.find(w => w.id === skipBtn.dataset.id)
        if (wo) wo.status = 'skipped'
        const card = wrap.querySelector(`[data-workout-id="${skipBtn.dataset.id}"]`)
        if (card) card.style.opacity = '0.4'
      }
    }
  })

  return wrap
}

function renderWorkoutCard(wo, user) {
  const statusColor = {
    completed: 'var(--color-success)',
    skipped: 'var(--color-error)',
    in_progress: 'var(--color-gold)',
    assigned: 'var(--color-primary)'
  }[wo.status] || 'var(--color-primary)'

  return `
    <div
      class="card card-sm"
      data-workout-id="${wo.id}"
      style="background:var(--color-surface-offset);opacity:${wo.status === 'skipped' ? '0.4' : '1'}"
    >
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1)">
            <span style="width:8px;height:8px;border-radius:50%;background:${statusColor};flex-shrink:0"></span>
            <span style="font-size:var(--text-sm);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${wo.title || 'Training Session'}</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);margin-top:var(--space-2)">
            ${wo.duration_minutes ? `<span style="font-size:var(--text-xs);color:var(--color-text-muted)">⏱ ${wo.duration_minutes} min</span>` : ''}
            ${wo.type ? `<span style="font-size:var(--text-xs);color:var(--color-primary);text-transform:capitalize">${wo.type}</span>` : ''}
            ${wo.rpe ? `<span style="font-size:var(--text-xs);color:var(--color-text-muted)">RPE ${wo.rpe} · ${(wo.rpe * (wo.duration_minutes || 0)).toLocaleString()} AU</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:var(--space-2);flex-shrink:0;align-items:center">
          ${wo.status === 'completed'
            ? `<span class="badge badge-success">✓ Done</span>`
            : wo.status === 'skipped'
            ? `<span class="badge badge-error">Skipped</span>`
            : `
              <button class="btn btn-ghost detail-btn" data-id="${wo.id}" style="font-size:var(--text-xs);padding:var(--space-2) var(--space-3)">
                Details
              </button>
              <button class="btn btn-primary mark-done-btn" data-id="${wo.id}" style="font-size:var(--text-xs);padding:var(--space-2) var(--space-3)">
                Log Done
              </button>
              <button class="btn btn-ghost skip-btn" data-id="${wo.id}" style="font-size:var(--text-xs);padding:var(--space-2) var(--space-3)">
                Skip
              </button>
            `
          }
        </div>
      </div>
      ${wo.notes ? `
        <div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--color-surface);border-radius:var(--radius-sm);font-size:var(--text-xs);color:var(--color-text-muted);border-left:2px solid var(--color-primary)">
          <strong style="color:var(--color-primary)">Coach notes:</strong> ${wo.notes}
        </div>
      ` : ''}
    </div>
  `
}

function showRpeModal(wo, state, wrap) {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:oklch(0 0 0/0.6);display:flex;align-items:center;justify-content:center;z-index:100;padding:var(--space-6)'
  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:400px;padding:var(--space-8)">
      <h2 style="font-size:var(--text-base);font-weight:700;margin-bottom:var(--space-2)">Log Session</h2>
      <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-6)">${wo.title}</p>

      <div style="margin-bottom:var(--space-5)">
        <label style="display:block;font-size:var(--text-sm);font-weight:500;margin-bottom:var(--space-3)">
          Session RPE <span style="color:var(--color-text-faint);font-weight:400">(1 = very easy, 10 = maximal)</span>
        </label>
        <div style="display:flex;gap:var(--space-2)" id="rpe-buttons">
          ${[1,2,3,4,5,6,7,8,9,10].map(n => `
            <button
              class="rpe-btn"
              data-val="${n}"
              style="
                flex:1;height:40px;border-radius:var(--radius-sm);
                border:1px solid var(--color-border);
                background:var(--color-surface-offset);
                color:var(--color-text-muted);font-size:var(--text-xs);
                font-weight:700;cursor:pointer;
                transition:background var(--transition),color var(--transition)
              "
            >${n}</button>
          `).join('')}
        </div>
        <div id="rpe-label" style="font-size:var(--text-xs);color:var(--color-text-faint);margin-top:var(--space-2);text-align:center;min-height:1.2em"></div>
      </div>

      <div style="margin-bottom:var(--space-5)">
        <label style="display:block;font-size:var(--text-sm);font-weight:500;margin-bottom:var(--space-2)">
          Actual duration <span style="color:var(--color-text-faint);font-weight:400">(minutes)</span>
        </label>
        <input
          id="actual-duration"
          type="number"
          class="input"
          value="${wo.duration_minutes || ''}"
          placeholder="${wo.duration_minutes || 60}"
          min="1" max="480"
        >
      </div>

      <div id="load-preview" style="display:none;padding:var(--space-3);background:var(--color-primary-highlight);border-radius:var(--radius-md);margin-bottom:var(--space-5);text-align:center">
        <span style="font-size:var(--text-xs);color:var(--color-text-muted)">Session load: </span>
        <span id="load-value" class="kpi-value" style="font-size:var(--text-base);color:var(--color-primary)"></span>
        <span style="font-size:var(--text-xs);color:var(--color-text-muted)"> AU (sRPE × min)</span>
      </div>

      <div id="rpe-error" style="display:none;color:var(--color-error);font-size:var(--text-sm);margin-bottom:var(--space-3)"></div>

      <div style="display:flex;gap:var(--space-3)">
        <button class="btn btn-ghost" id="rpe-cancel" style="flex:1;justify-content:center">Cancel</button>
        <button class="btn btn-primary" id="rpe-submit" disabled style="flex:1;justify-content:center">Save session</button>
      </div>
    </div>
  `

  const RPE_LABELS = {
    1: 'Rest / very light', 2: 'Easy', 3: 'Moderate', 4: 'Somewhat hard',
    5: 'Hard', 6: 'Hard+', 7: 'Very hard', 8: 'Very hard+',
    9: 'Near maximal', 10: 'Maximal effort'
  }

  let selectedRpe = null

  overlay.querySelectorAll('.rpe-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRpe = parseInt(btn.dataset.val)
      overlay.querySelectorAll('.rpe-btn').forEach(b => {
        const active = parseInt(b.dataset.val) === selectedRpe
        b.style.background = active ? 'var(--color-primary)' : 'var(--color-surface-offset)'
        b.style.color = active ? 'var(--color-text-inverse)' : 'var(--color-text-muted)'
        b.style.borderColor = active ? 'var(--color-primary)' : 'var(--color-border)'
      })
      overlay.querySelector('#rpe-label').textContent = RPE_LABELS[selectedRpe]
      updateLoadPreview()
      overlay.querySelector('#rpe-submit').disabled = false
    })
  })

  function updateLoadPreview() {
    const dur = parseInt(overlay.querySelector('#actual-duration').value) || wo.duration_minutes || 0
    if (selectedRpe && dur) {
      const load = selectedRpe * dur
      overlay.querySelector('#load-preview').style.display = 'block'
      overlay.querySelector('#load-value').textContent = load.toLocaleString()
    }
  }

  overlay.querySelector('#actual-duration').addEventListener('input', updateLoadPreview)
  overlay.querySelector('#rpe-cancel').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })

  overlay.querySelector('#rpe-submit').addEventListener('click', async () => {
    if (!selectedRpe) return
    const duration = parseInt(overlay.querySelector('#actual-duration').value) || wo.duration_minutes
    const submitBtn = overlay.querySelector('#rpe-submit')
    submitBtn.disabled = true
    submitBtn.textContent = 'Saving…'

    const { error } = await supabase
      .from('workouts')
      .update({
        status: 'completed',
        rpe: selectedRpe,
        duration_minutes: duration,
        updated_at: new Date().toISOString()
      })
      .eq('id', wo.id)

    if (error) {
      overlay.querySelector('#rpe-error').style.display = 'block'
      overlay.querySelector('#rpe-error').textContent = error.message
      submitBtn.disabled = false
      submitBtn.textContent = 'Save session'
    } else {
      const w = state.workouts.find(w => w.id === wo.id)
      if (w) { w.status = 'completed'; w.rpe = selectedRpe; w.duration_minutes = duration }
      overlay.remove()
      // Refresh the workout card inline
      const card = wrap.querySelector(`[data-workout-id="${wo.id}"]`)
      if (card) card.outerHTML = renderWorkoutCard({ ...wo, status: 'completed', rpe: selectedRpe, duration_minutes: duration })
    }
  })

  document.body.appendChild(overlay)
  if (window.lucide) window.lucide.createIcons()
}

function showWorkoutModal(wo, state, wrap) {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:oklch(0 0 0/0.6);display:flex;align-items:center;justify-content:center;z-index:100;padding:var(--space-6)'
  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:480px;padding:var(--space-8);max-height:80dvh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-5)">
        <h2 style="font-size:var(--text-base);font-weight:700">${wo.title || 'Session Details'}</h2>
        <button id="detail-close" class="btn btn-ghost" style="padding:var(--space-2)">✕</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-5)">
        <div style="padding:var(--space-3);background:var(--color-surface-offset);border-radius:var(--radius-md)">
          <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:2px">Duration</div>
          <div style="font-size:var(--text-sm);font-weight:600">${wo.duration_minutes ? wo.duration_minutes + ' min' : '—'}</div>
        </div>
        <div style="padding:var(--space-3);background:var(--color-surface-offset);border-radius:var(--radius-md)">
          <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:2px">Type</div>
          <div style="font-size:var(--text-sm);font-weight:600;text-transform:capitalize">${wo.type || '—'}</div>
        </div>
        <div style="padding:var(--space-3);background:var(--color-surface-offset);border-radius:var(--radius-md)">
          <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:2px">Status</div>
          <div style="font-size:var(--text-sm);font-weight:600;text-transform:capitalize">${wo.status || 'assigned'}</div>
        </div>
        <div style="padding:var(--space-3);background:var(--color-surface-offset);border-radius:var(--radius-md)">
          <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:2px">Load Target</div>
          <div style="font-size:var(--text-sm);font-weight:600">${wo.duration_minutes ? (5 * wo.duration_minutes).toLocaleString() + ' AU est.' : '—'}</div>
        </div>
      </div>

      ${wo.description ? `
        <div style="margin-bottom:var(--space-4)">
          <div style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-2)">Description</div>
          <p style="font-size:var(--text-sm);color:var(--color-text)">${wo.description}</p>
        </div>
      ` : ''}

      ${wo.notes ? `
        <div style="padding:var(--space-4);background:var(--color-primary-highlight);border-radius:var(--radius-md);border-left:3px solid var(--color-primary);margin-bottom:var(--space-5)">
          <div style="font-size:var(--text-xs);color:var(--color-primary);font-weight:700;margin-bottom:var(--space-2)">COACH NOTES</div>
          <p style="font-size:var(--text-sm);color:var(--color-text)">${wo.notes}</p>
        </div>
      ` : ''}

      ${wo.status !== 'completed' && wo.status !== 'skipped' ? `
        <button class="btn btn-primary log-from-detail" data-id="${wo.id}" style="width:100%;justify-content:center">
          Log this session
        </button>
      ` : ''}
    </div>
  `

  overlay.querySelector('#detail-close').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })

  const logBtn = overlay.querySelector('.log-from-detail')
  if (logBtn) {
    logBtn.addEventListener('click', () => {
      overlay.remove()
      showRpeModal(wo, state, wrap)
    })
  }

  document.body.appendChild(overlay)
}
