import { state, setState, renderApp } from '../apex-coach-app.js'

const CYCLE_COLORS = {
  Endurance: { bg: 'var(--color-blue-highlight)', text: 'var(--color-blue)' },
  Power:     { bg: 'var(--color-orange-highlight)', text: 'var(--color-orange)' },
  Strength:  { bg: 'var(--color-gold-highlight)', text: 'var(--color-gold)' },
  Racing:    { bg: 'var(--color-notification-highlight)', text: 'var(--color-notification)' }
}

export function renderPrograms(viewState) {
  const wrap = document.createElement('div')
  const programs = state.programs || []
  const athletes = state.athletes || []

  // Selected program state
  let selectedProgramId = programs.length > 0 ? programs[0].id : null

  function rebuild() {
    wrap.innerHTML = ''
    wrap.appendChild(buildUI())
    if (window.lucide) window.lucide.createIcons()
  }

  function buildUI() {
    const container = document.createElement('div')
    const program = programs.find(p => p.id === selectedProgramId)
    const athlete = athletes.find(a => a.id === (program && program.athlete_id))

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-6);flex-wrap:wrap;gap:var(--space-3)">
        <div>
          <h1 style="font-size:var(--text-lg);font-weight:700">Training Programs</h1>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-1)">
            Design and manage multi-week training cycles
          </p>
        </div>
        <button class="btn btn-primary" id="new-program-btn" style="display:flex;align-items:center;gap:var(--space-2)">
          <i data-lucide="plus" style="width:16px;height:16px"></i> New Program
        </button>
      </div>

      <div style="display:grid;grid-template-columns:260px 1fr;gap:var(--space-5);align-items:start">
        <!-- Program list -->
        <div>
          <p style="font-size:var(--text-xs);color:var(--color-text-faint);text-transform:uppercase;letter-spacing:.05em;font-weight:600;margin-bottom:var(--space-3)">Programs</p>
          <div style="display:flex;flex-direction:column;gap:var(--space-2)">
            ${programs.length === 0 ? `
              <div style="text-align:center;padding:var(--space-8);color:var(--color-text-muted);font-size:var(--text-sm)">
                No programs yet.
              </div>
            ` : programs.map(p => {
              const ath = athletes.find(a => a.id === p.athlete_id)
              return `
                <button
                  class="program-list-item"
                  data-program-id="${p.id}"
                  style="
                    width:100%;text-align:left;padding:var(--space-3) var(--space-4);
                    background:${selectedProgramId===p.id ? 'var(--color-surface-offset)' : 'var(--color-surface)'};
                    border:1px solid ${selectedProgramId===p.id ? 'var(--color-primary)' : 'var(--color-border)'};
                    border-radius:var(--radius-md);cursor:pointer;
                    transition:background var(--transition-interactive),border-color var(--transition-interactive)
                  "
                >
                  <div style="font-size:var(--text-sm);font-weight:600;margin-bottom:2px">${p.name}</div>
                  <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${ath ? ath.full_name : 'Unknown athlete'}</div>
                  <div style="font-size:var(--text-xs);color:var(--color-text-faint);margin-top:2px">${p.weeks.length} weeks</div>
                </button>
              `
            }).join('')}
          </div>
        </div>

        <!-- Program detail -->
        <div>
          ${program ? programDetail(program, athlete) : `
            <div style="text-align:center;padding:var(--space-16);color:var(--color-text-muted);font-size:var(--text-sm)">
              Select a program or create a new one.
            </div>
          `}
        </div>
      </div>
    `

    container.querySelector('#new-program-btn').addEventListener('click', () => {
      showProgramModal(null, rebuild)
    })

    container.querySelectorAll('.program-list-item').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedProgramId = btn.dataset.programId
        rebuild()
      })
    })

    if (program) {
      const editBtn = container.querySelector('#edit-program-btn')
      if (editBtn) editBtn.addEventListener('click', () => showProgramModal(program, rebuild))

      const deleteBtn = container.querySelector('#delete-program-btn')
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          if (!confirm(`Delete "${program.name}"?`)) return
          setState({ programs: state.programs.filter(p => p.id !== program.id) })
          selectedProgramId = state.programs.length > 0 ? state.programs[0].id : null
          rebuild()
        })
      }

      // Week cycle-type change
      container.querySelectorAll('.week-cycle-select').forEach(sel => {
        sel.addEventListener('change', () => {
          const weekIndex = parseInt(sel.dataset.week)
          const updated = {
            ...program,
            weeks: program.weeks.map(w =>
              w.week === weekIndex ? { ...w, cycle_type: sel.value } : w
            )
          }
          setState({ programs: state.programs.map(p => p.id === program.id ? updated : p) })
          // Update color immediately without full rebuild
          const badge = sel.closest('.week-row').querySelector('.cycle-badge')
          if (badge) {
            const c = CYCLE_COLORS[sel.value]
            badge.textContent = sel.value
            badge.style.background = c.bg
            badge.style.color = c.text
          }
        })
      })

      // Week focus notes
      container.querySelectorAll('.week-focus-input').forEach(input => {
        input.addEventListener('blur', () => {
          const weekIndex = parseInt(input.dataset.week)
          const updated = {
            ...program,
            weeks: program.weeks.map(w =>
              w.week === weekIndex ? { ...w, focus: input.value } : w
            )
          }
          setState({ programs: state.programs.map(p => p.id === program.id ? updated : p) })
        })
      })
    }

    return container
  }

  wrap.appendChild(buildUI())
  return wrap
}

function programDetail(program, athlete) {
  return `
    <div class="card" style="padding:var(--space-6)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-5);flex-wrap:wrap;gap:var(--space-3)">
        <div>
          <h2 style="font-size:var(--text-base);font-weight:700;margin-bottom:var(--space-1)">${program.name}</h2>
          <div style="font-size:var(--text-xs);color:var(--color-text-muted);display:flex;gap:var(--space-4)">
            <span><i data-lucide="user" style="width:12px;height:12px;vertical-align:middle"></i> ${athlete ? athlete.full_name : '—'}</span>
            <span><i data-lucide="calendar" style="width:12px;height:12px;vertical-align:middle"></i> ${program.start_date} → ${program.end_date || 'ongoing'}</span>
            <span><i data-lucide="layers" style="width:12px;height:12px;vertical-align:middle"></i> ${program.weeks.length} weeks</span>
          </div>
          ${program.notes ? `<p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-2);max-width:60ch">${program.notes}</p>` : ''}
        </div>
        <div style="display:flex;gap:var(--space-2)">
          <button id="edit-program-btn" class="btn btn-ghost" style="font-size:var(--text-xs);display:flex;align-items:center;gap:var(--space-1)">
            <i data-lucide="pencil" style="width:14px;height:14px"></i> Edit
          </button>
          <button id="delete-program-btn" class="btn btn-ghost" style="font-size:var(--text-xs);color:var(--color-error)">
            Delete
          </button>
        </div>
      </div>

      <!-- Cycle legend -->
      <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-5)">
        ${Object.entries(CYCLE_COLORS).map(([label, c]) => `
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <div style="width:10px;height:10px;border-radius:var(--radius-full);background:${c.text}"></div>
            <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${label}</span>
          </div>
        `).join('')}
      </div>

      <!-- Week rows -->
      <div style="display:flex;flex-direction:column;gap:var(--space-2)">
        <div style="display:grid;grid-template-columns:40px 120px 1fr;gap:var(--space-3);padding:0 var(--space-2);margin-bottom:var(--space-1)">
          <span style="font-size:10px;color:var(--color-text-faint);text-transform:uppercase;letter-spacing:.05em">Wk</span>
          <span style="font-size:10px;color:var(--color-text-faint);text-transform:uppercase;letter-spacing:.05em">Cycle Phase</span>
          <span style="font-size:10px;color:var(--color-text-faint);text-transform:uppercase;letter-spacing:.05em">Focus / Notes</span>
        </div>
        ${program.weeks.map(w => {
          const c = CYCLE_COLORS[w.cycle_type] || CYCLE_COLORS.Endurance
          return `
            <div class="week-row" data-week="${w.week}" style="display:grid;grid-template-columns:40px 120px 1fr;gap:var(--space-3);align-items:center;padding:var(--space-3) var(--space-2);background:var(--color-surface-offset);border-radius:var(--radius-md)">
              <span style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted)">W${w.week}</span>
              <div style="position:relative">
                <select
                  class="input week-cycle-select"
                  data-week="${w.week}"
                  style="font-size:var(--text-xs);padding:var(--space-1) var(--space-2);height:auto;background:${c.bg};color:${c.text};border-color:${c.text}40;font-weight:600"
                >
                  ${['Endurance','Power','Strength','Racing'].map(phase =>
                    `<option ${w.cycle_type === phase ? 'selected' : ''}>${phase}</option>`
                  ).join('')}
                </select>
              </div>
              <input
                class="input week-focus-input"
                data-week="${w.week}"
                value="${w.focus || ''}"
                placeholder="Week focus notes…"
                style="font-size:var(--text-xs);padding:var(--space-2) var(--space-3)"
              >
            </div>
          `
        }).join('')}
      </div>
    </div>
  `
}

function showProgramModal(existing, onSave) {
  const isNew = !existing
  const today = new Date().toISOString().split('T')[0]

  const p = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: 'prog-' + Date.now(),
    coach_id: 'coach-dev-001',
    athlete_id: state.athletes.length > 0 ? state.athletes[0].id : '',
    name: '',
    start_date: today,
    end_date: '',
    notes: '',
    weeks: Array.from({ length: 8 }, (_, i) => ({
      week: i + 1,
      cycle_type: ['Endurance','Endurance','Strength','Power','Power','Endurance','Racing','Racing'][i],
      focus: ''
    }))
  }

  const overlay = document.createElement('div')
  overlay.style.cssText = `position:fixed;inset:0;background:oklch(0 0 0 / 0.6);display:flex;align-items:flex-start;justify-content:center;z-index:200;padding:var(--space-6);overflow-y:auto`

  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:560px;padding:var(--space-8);margin:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6)">
        <h2 style="font-size:var(--text-base);font-weight:700">${isNew ? 'New Training Program' : 'Edit Program'}</h2>
        <button id="modal-close" class="btn btn-ghost">✕</button>
      </div>
      <form id="program-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
        <div>
          <label class="form-label">Program Name</label>
          <input class="input" type="text" name="name" value="${p.name}" placeholder="e.g. 12-Week Half Iron Build" required>
        </div>
        <div>
          <label class="form-label">Athlete</label>
          <select class="input" name="athlete_id">
            ${state.athletes.map(a => `<option value="${a.id}" ${a.id===p.athlete_id?'selected':''}>${a.full_name}</option>`).join('')}
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
          <div>
            <label class="form-label">Start Date</label>
            <input class="input" type="date" name="start_date" value="${p.start_date}" required>
          </div>
          <div>
            <label class="form-label">End Date</label>
            <input class="input" type="date" name="end_date" value="${p.end_date || ''}">
          </div>
        </div>
        <div>
          <label class="form-label">Number of Weeks</label>
          <input class="input" type="number" id="num-weeks-input" value="${p.weeks.length}" min="1" max="52">
        </div>
        <div>
          <label class="form-label">Notes</label>
          <textarea class="input" name="notes" rows="2" style="resize:vertical">${p.notes}</textarea>
        </div>
        <div style="display:flex;gap:var(--space-3);justify-content:flex-end;padding-top:var(--space-2);border-top:1px solid var(--color-divider)">
          <button type="button" id="modal-cancel" class="btn btn-ghost">Cancel</button>
          <button type="submit" class="btn btn-primary">${isNew ? 'Create Program' : 'Update'}</button>
        </div>
      </form>
    </div>
  `

  document.body.appendChild(overlay)

  const close = () => overlay.remove()
  overlay.querySelector('#modal-close').addEventListener('click', close)
  overlay.querySelector('#modal-cancel').addEventListener('click', close)
  overlay.addEventListener('click', e => { if (e.target === overlay) close() })

  overlay.querySelector('#program-form').addEventListener('submit', e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const numWeeks = parseInt(overlay.querySelector('#num-weeks-input').value) || p.weeks.length
    // Preserve existing weeks data, expand or truncate
    const existingWeeks = p.weeks
    const newWeeks = Array.from({ length: numWeeks }, (_, i) => {
      return existingWeeks[i] || {
        week: i + 1,
        cycle_type: 'Endurance',
        focus: ''
      }
    })

    const updated = {
      ...p,
      name: fd.get('name'),
      athlete_id: fd.get('athlete_id'),
      start_date: fd.get('start_date'),
      end_date: fd.get('end_date') || null,
      notes: fd.get('notes'),
      weeks: newWeeks
    }
    if (isNew) {
      setState({ programs: [...state.programs, updated] })
    } else {
      setState({ programs: state.programs.map(p2 => p2.id === p.id ? updated : p2) })
    }
    close()
    onSave()
  })
}
