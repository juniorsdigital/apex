import { state, setState, renderApp } from '../apex-coach-app.js'

const SPORT_COLORS = {
  Triathlon: 'var(--color-primary)',
  'Road Cycling': 'var(--color-orange)',
  Running: 'var(--color-blue)',
  Swimming: 'var(--color-purple)',
  Rowing: 'var(--color-gold)'
}

export function renderAthletes(viewState) {
  const wrap = document.createElement('div')

  function rebuild() {
    wrap.innerHTML = ''
    wrap.appendChild(buildUI())
    if (window.lucide) window.lucide.createIcons()
  }

  function buildUI() {
    const athletes = state.athletes || []
    const container = document.createElement('div')

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-6)">
        <div>
          <h1 style="font-size:var(--text-lg);font-weight:700">Athletes</h1>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-1)">
            ${athletes.length} athlete${athletes.length !== 1 ? 's' : ''} · click to view profile or switch context
          </p>
        </div>
        <button class="btn btn-primary" id="add-athlete-btn" style="display:flex;align-items:center;gap:var(--space-2)">
          <i data-lucide="user-plus" style="width:16px;height:16px"></i> Add Athlete
        </button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--space-4)">
        ${athletes.length === 0 ? `
          <div style="grid-column:1/-1;text-align:center;padding:var(--space-16);color:var(--color-text-muted)">
            <i data-lucide="users" style="width:40px;height:40px;margin:0 auto var(--space-4);display:block;opacity:.4"></i>
            <p style="font-size:var(--text-sm)">No athletes yet. Add your first athlete to get started.</p>
          </div>
        ` : athletes.map(a => athleteCard(a)).join('')}
      </div>
    `

    container.querySelector('#add-athlete-btn').addEventListener('click', () => {
      showAthleteModal(null, rebuild)
    })

    container.querySelectorAll('[data-athlete-id]').forEach(card => {
      card.querySelector('[data-action="select"]')?.addEventListener('click', async () => {
        setState({ selectedAthleteId: card.dataset.athleteId, currentView: 'dashboard' })
        renderApp()
      })
      card.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
        const a = state.athletes.find(x => x.id === card.dataset.athleteId)
        if (a) showAthleteModal(a, rebuild)
      })
    })

    return container
  }

  wrap.appendChild(buildUI())
  return wrap
}

function athleteCard(a) {
  const sportColor = SPORT_COLORS[a.sport] || 'var(--color-primary)'
  const initials = a.avatar_initials || a.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
  const isSelected = a.id === state.selectedAthleteId

  // Compute quick stats from workouts
  const athleteWorkouts = (state.workouts || []).filter(w => w.athlete_id === a.id)
  const completed = athleteWorkouts.filter(w => w.status === 'completed').length
  const upcoming = athleteWorkouts.filter(w => w.status === 'assigned').length

  return `
    <div
      class="card"
      data-athlete-id="${a.id}"
      style="padding:var(--space-5);${isSelected ? 'border-color:var(--color-primary);' : ''}"
    >
      <div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-4)">
        <!-- Avatar -->
        <div style="
          width:48px;height:48px;border-radius:var(--radius-full);
          background:${sportColor}20;color:${sportColor};
          display:flex;align-items:center;justify-content:center;
          font-size:var(--text-sm);font-weight:700;flex-shrink:0;
        ">${initials}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <h3 style="font-size:var(--text-sm);font-weight:700">${a.full_name}</h3>
            ${isSelected ? `<span style="font-size:10px;background:var(--color-primary-highlight);color:var(--color-primary);padding:1px var(--space-2);border-radius:var(--radius-full);font-weight:600">Active</span>` : ''}
          </div>
          <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:1px">${a.sport}</p>
        </div>
      </div>

      <div style="margin-bottom:var(--space-4)">
        <p style="font-size:var(--text-xs);color:var(--color-text-muted)">
          <i data-lucide="target" style="width:12px;height:12px;vertical-align:middle"></i>
          ${a.goal || 'No goal set'}
        </p>
      </div>

      <div style="display:flex;gap:var(--space-4);margin-bottom:var(--space-4);padding:var(--space-3);background:var(--color-surface-offset);border-radius:var(--radius-md)">
        <div style="text-align:center;flex:1">
          <div style="font-size:var(--text-sm);font-weight:700;font-variant-numeric:tabular-nums">${completed}</div>
          <div style="font-size:10px;color:var(--color-text-muted)">Completed</div>
        </div>
        <div style="width:1px;background:var(--color-divider)"></div>
        <div style="text-align:center;flex:1">
          <div style="font-size:var(--text-sm);font-weight:700;font-variant-numeric:tabular-nums">${upcoming}</div>
          <div style="font-size:10px;color:var(--color-text-muted)">Upcoming</div>
        </div>
        <div style="width:1px;background:var(--color-divider)"></div>
        <div style="text-align:center;flex:1">
          <div style="font-size:var(--text-sm);font-weight:700">${a.status === 'active' ? '✓' : '—'}</div>
          <div style="font-size:10px;color:var(--color-text-muted)">Active</div>
        </div>
      </div>

      <div style="display:flex;gap:var(--space-2)">
        <button
          data-action="select"
          class="btn btn-primary"
          style="flex:1;font-size:var(--text-xs);${isSelected ? 'opacity:.5;pointer-events:none' : ''}"
        >
          ${isSelected ? 'Currently Active' : 'Switch to Athlete'}
        </button>
        <button
          data-action="edit"
          class="btn btn-ghost"
          style="font-size:var(--text-xs);padding:var(--space-2) var(--space-3)"
        >
          <i data-lucide="pencil" style="width:14px;height:14px"></i>
        </button>
      </div>
    </div>
  `
}

function showAthleteModal(existing, onSave) {
  const isNew = !existing
  const a = existing || {
    id: 'athlete-' + Date.now(),
    full_name: '', email: '', sport: 'Running',
    goal: '', status: 'active', coach_id: 'coach-dev-001'
  }

  const overlay = document.createElement('div')
  overlay.style.cssText = `position:fixed;inset:0;background:oklch(0 0 0 / 0.6);display:flex;align-items:center;justify-content:center;z-index:200;padding:var(--space-6)`

  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:440px;padding:var(--space-8)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6)">
        <h2 style="font-size:var(--text-base);font-weight:700">${isNew ? 'Add Athlete' : 'Edit Athlete'}</h2>
        <button id="modal-close" class="btn btn-ghost">✕</button>
      </div>
      <form id="athlete-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
        <div>
          <label class="form-label">Full Name</label>
          <input class="input" type="text" name="full_name" value="${a.full_name}" placeholder="Athlete name" required>
        </div>
        <div>
          <label class="form-label">Email</label>
          <input class="input" type="email" name="email" value="${a.email || ''}" placeholder="athlete@email.com">
        </div>
        <div>
          <label class="form-label">Sport</label>
          <select class="input" name="sport">
            ${['Triathlon','Road Cycling','Running','Swimming','Rowing','Other'].map(s =>
              `<option ${a.sport===s?'selected':''}>${s}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">Goal</label>
          <input class="input" type="text" name="goal" value="${a.goal || ''}" placeholder="e.g. Ironman 70.3 – Sept 2026">
        </div>
        <div>
          <label class="form-label">Status</label>
          <select class="input" name="status">
            <option ${a.status==='active'?'selected':''}>active</option>
            <option ${a.status==='paused'?'selected':''}>paused</option>
          </select>
        </div>
        <div style="display:flex;gap:var(--space-3);justify-content:flex-end;padding-top:var(--space-2);border-top:1px solid var(--color-divider)">
          ${!isNew ? `<button type="button" id="delete-athlete" class="btn" style="color:var(--color-error);margin-right:auto">Remove Athlete</button>` : ''}
          <button type="button" id="modal-cancel" class="btn btn-ghost">Cancel</button>
          <button type="submit" class="btn btn-primary">${isNew ? 'Add Athlete' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  `

  document.body.appendChild(overlay)

  const close = () => overlay.remove()
  overlay.querySelector('#modal-close').addEventListener('click', close)
  overlay.querySelector('#modal-cancel').addEventListener('click', close)
  overlay.addEventListener('click', e => { if (e.target === overlay) close() })

  overlay.querySelector('#delete-athlete')?.addEventListener('click', () => {
    if (!confirm(`Remove ${a.full_name} from your roster?`)) return
    setState({ athletes: state.athletes.filter(x => x.id !== a.id) })
    close()
    onSave()
  })

  overlay.querySelector('#athlete-form').addEventListener('submit', e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const updated = {
      ...a,
      full_name: fd.get('full_name'),
      email: fd.get('email'),
      sport: fd.get('sport'),
      goal: fd.get('goal'),
      status: fd.get('status'),
      avatar_initials: fd.get('full_name').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
    }
    if (isNew) {
      setState({ athletes: [...state.athletes, updated] })
      if (!state.selectedAthleteId) setState({ selectedAthleteId: updated.id })
    } else {
      setState({ athletes: state.athletes.map(x => x.id === a.id ? updated : x) })
    }
    close()
    onSave()
  })
}
