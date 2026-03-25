import { state, setState, renderApp } from '../apex-coach-app.js'

const CYCLE_COLORS = {
  Endurance: 'var(--color-blue)',
  Power: 'var(--color-orange)',
  Strength: 'var(--color-gold)',
  Racing: 'var(--color-notification)'
}

const SPORT_ICONS = {
  Bike: 'bike', Run: 'footprints', Swim: 'waves', Strength: 'dumbbell',
  Triathlon: 'zap', Row: 'waves'
}

export function renderWorkoutBank(viewState) {
  const wrap = document.createElement('div')
  let filterSport = 'All'
  let filterCycle = 'All'
  let search = ''

  function rebuild() {
    wrap.innerHTML = ''
    wrap.appendChild(buildUI())
    if (window.lucide) window.lucide.createIcons()
  }

  function buildUI() {
    const container = document.createElement('div')

    const templates = state.templates || []
    const filtered = templates.filter(t => {
      const matchSport = filterSport === 'All' || t.sport === filterSport
      const matchCycle = filterCycle === 'All' || t.cycle_type === filterCycle
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.tags || []).some(tag => tag.includes(search.toLowerCase()))
      return matchSport && matchCycle && matchSearch
    })

    const sports = ['All', ...new Set(templates.map(t => t.sport))]
    const cycles = ['All', 'Endurance', 'Power', 'Strength', 'Racing']

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-6);flex-wrap:wrap;gap:var(--space-3)">
        <div>
          <h1 style="font-size:var(--text-lg);font-weight:700">Workout Bank</h1>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-1)">
            ${templates.length} templates · click any to preview or assign
          </p>
        </div>
        <button class="btn btn-primary" id="new-template-btn" style="display:flex;align-items:center;gap:var(--space-2)">
          <i data-lucide="plus" style="width:16px;height:16px"></i> New Template
        </button>
      </div>

      <!-- Filters -->
      <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-5);flex-wrap:wrap;align-items:center">
        <input
          type="search" id="bank-search" class="input" placeholder="Search name or tag…"
          value="${search}"
          style="max-width:220px;font-size:var(--text-sm);padding:var(--space-2) var(--space-3)"
        >
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
          ${sports.map(s => `<button class="chip ${filterSport===s?'chip-active':''}" data-filter-sport="${s}">${s}</button>`).join('')}
        </div>
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
          ${cycles.map(c => `<button class="chip ${filterCycle===c?'chip-active':''}" data-filter-cycle="${c}" style="${filterCycle===c&&c!=='All'?`border-color:${CYCLE_COLORS[c]};color:${CYCLE_COLORS[c]}`:''}">${c}</button>`).join('')}
        </div>
      </div>

      <!-- Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--space-4)">
        ${filtered.length === 0 ? `
          <div style="grid-column:1/-1;text-align:center;padding:var(--space-16);color:var(--color-text-muted)">
            <i data-lucide="inbox" style="width:40px;height:40px;margin:0 auto var(--space-4);display:block;opacity:.4"></i>
            <p style="font-size:var(--text-sm)">No templates match your filters.</p>
          </div>
        ` : filtered.map(t => templateCard(t)).join('')}
      </div>
    `

    // Search
    container.querySelector('#bank-search').addEventListener('input', e => {
      search = e.target.value
      rebuild()
    })

    // Sport filter chips
    container.querySelectorAll('[data-filter-sport]').forEach(btn => {
      btn.addEventListener('click', () => { filterSport = btn.dataset.filterSport; rebuild() })
    })

    // Cycle filter chips
    container.querySelectorAll('[data-filter-cycle]').forEach(btn => {
      btn.addEventListener('click', () => { filterCycle = btn.dataset.filterCycle; rebuild() })
    })

    // New template
    container.querySelector('#new-template-btn').addEventListener('click', () => {
      showTemplateModal(null, rebuild)
    })

    // Template card clicks
    container.querySelectorAll('[data-template-id]').forEach(card => {
      card.addEventListener('click', () => {
        const t = state.templates.find(x => x.id === card.dataset.templateId)
        if (t) showTemplateModal(t, rebuild)
      })
    })

    return container
  }

  wrap.appendChild(buildUI())
  return wrap
}

function templateCard(t) {
  const cycleColor = CYCLE_COLORS[t.cycle_type] || 'var(--color-primary)'
  const sportIcon = SPORT_ICONS[t.sport] || 'activity'
  return `
    <div
      class="card"
      data-template-id="${t.id}"
      style="cursor:pointer;transition:box-shadow var(--transition-interactive)"
      tabindex="0"
      role="button"
      aria-label="Edit template ${t.name}"
    >
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-3)">
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <i data-lucide="${sportIcon}" style="width:18px;height:18px;color:var(--color-text-muted)"></i>
          <span style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:500">${t.sport}</span>
        </div>
        <span style="font-size:var(--text-xs);font-weight:600;color:${cycleColor};background:oklch(from ${cycleColor} l c h / 0.12);padding:2px var(--space-2);border-radius:var(--radius-full)">${t.cycle_type}</span>
      </div>
      <h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--space-2)">${t.name}</h3>
      <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);line-height:1.5">${t.description}</p>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;gap:var(--space-3);font-size:var(--text-xs);color:var(--color-text-muted)">
          <span><i data-lucide="clock" style="width:12px;height:12px;vertical-align:middle"></i> ${t.duration_minutes} min</span>
          <span><i data-lucide="zap" style="width:12px;height:12px;vertical-align:middle"></i> RPE ${t.rpe}</span>
        </div>
        <div style="display:flex;gap:var(--space-1);flex-wrap:wrap;justify-content:flex-end">
          ${(t.tags||[]).slice(0,2).map(tag => `<span style="font-size:10px;background:var(--color-surface-offset);color:var(--color-text-muted);padding:1px var(--space-2);border-radius:var(--radius-full)">${tag}</span>`).join('')}
        </div>
      </div>
    </div>
  `
}

function showTemplateModal(existing, onSave) {
  const isNew = !existing
  const t = existing || {
    id: 'tmpl-' + Date.now(),
    coach_id: 'coach-dev-001',
    name: '', sport: 'Bike', cycle_type: 'Endurance', description: '',
    duration_minutes: 60, intensity_target: '', rpe: 5,
    structure: [{ label: 'Warm-up', duration_min: 10, target: '' }, { label: 'Main Set', duration_min: 40, target: '' }, { label: 'Cool-down', duration_min: 10, target: '' }],
    tags: []
  }

  const overlay = document.createElement('div')
  overlay.style.cssText = `position:fixed;inset:0;background:oklch(0 0 0 / 0.6);display:flex;align-items:center;justify-content:center;z-index:200;padding:var(--space-6);overflow-y:auto`

  function buildStepsHTML(steps) {
    return steps.map((s, i) => `
      <div class="step-row" data-step="${i}" style="display:grid;grid-template-columns:1fr 60px 1fr auto;gap:var(--space-2);align-items:center">
        <input class="input step-label" value="${s.label}" placeholder="Phase" style="font-size:var(--text-xs);padding:var(--space-2) var(--space-3)">
        <input class="input step-dur" type="number" value="${s.duration_min}" min="1" placeholder="min" style="font-size:var(--text-xs);padding:var(--space-2) var(--space-3)">
        <input class="input step-target" value="${s.target}" placeholder="Target / notes" style="font-size:var(--text-xs);padding:var(--space-2) var(--space-3)">
        <button type="button" class="btn btn-ghost remove-step" data-step="${i}" style="padding:var(--space-2);color:var(--color-error)">✕</button>
      </div>
    `).join('')
  }

  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:600px;padding:var(--space-8);position:relative">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6)">
        <h2 style="font-size:var(--text-base);font-weight:700">${isNew ? 'New Workout Template' : 'Edit Template'}</h2>
        <button id="modal-close" class="btn btn-ghost" style="padding:var(--space-2)">✕</button>
      </div>
      <form id="template-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
        <div>
          <label class="form-label">Workout Name</label>
          <input type="text" class="input" name="name" value="${t.name}" placeholder="e.g. 5×5 FTP Intervals" required>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3)">
          <div>
            <label class="form-label">Sport</label>
            <select class="input" name="sport">
              ${['Bike','Run','Swim','Strength','Triathlon','Row'].map(s => `<option ${t.sport===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Cycle Phase</label>
            <select class="input" name="cycle_type">
              ${['Endurance','Power','Strength','Racing'].map(c => `<option ${t.cycle_type===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Duration (min)</label>
            <input type="number" class="input" name="duration_minutes" value="${t.duration_minutes}" min="1" max="600">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
          <div>
            <label class="form-label">Intensity Target</label>
            <input type="text" class="input" name="intensity_target" value="${t.intensity_target}" placeholder="e.g. Zone 2, 95% FTP">
          </div>
          <div>
            <label class="form-label">RPE (1–10)</label>
            <input type="number" class="input" name="rpe" value="${t.rpe}" min="1" max="10">
          </div>
        </div>
        <div>
          <label class="form-label">Description</label>
          <textarea class="input" name="description" rows="2" style="resize:vertical">${t.description}</textarea>
        </div>
        <div>
          <label class="form-label">Tags (comma-separated)</label>
          <input type="text" class="input" name="tags" value="${(t.tags||[]).join(', ')}" placeholder="base, aerobic, run">
        </div>

        <!-- Structure builder -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
            <label class="form-label" style="margin:0">Workout Structure</label>
            <button type="button" id="add-step" class="btn btn-ghost" style="font-size:var(--text-xs)">+ Add Step</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 60px 1fr auto;gap:var(--space-2);margin-bottom:var(--space-2)">
            <span style="font-size:10px;color:var(--color-text-faint);text-transform:uppercase;letter-spacing:.05em">Phase</span>
            <span style="font-size:10px;color:var(--color-text-faint);text-transform:uppercase;letter-spacing:.05em">Min</span>
            <span style="font-size:10px;color:var(--color-text-faint);text-transform:uppercase;letter-spacing:.05em">Target</span>
            <span></span>
          </div>
          <div id="steps-container" style="display:flex;flex-direction:column;gap:var(--space-2)">
            ${buildStepsHTML(t.structure)}
          </div>
        </div>

        <div style="display:flex;gap:var(--space-3);justify-content:flex-end;padding-top:var(--space-2);border-top:1px solid var(--color-divider)">
          ${!isNew ? `<button type="button" id="delete-template" class="btn" style="color:var(--color-error);margin-right:auto">Delete Template</button>` : ''}
          <button type="button" id="modal-cancel" class="btn btn-ghost">Cancel</button>
          <button type="submit" class="btn btn-primary">${isNew ? 'Save Template' : 'Update Template'}</button>
        </div>
      </form>
    </div>
  `

  document.body.appendChild(overlay)

  const stepsEl = overlay.querySelector('#steps-container')
  let steps = [...t.structure]

  function readSteps() {
    steps = Array.from(stepsEl.querySelectorAll('.step-row')).map(row => ({
      label: row.querySelector('.step-label').value,
      duration_min: parseInt(row.querySelector('.step-dur').value) || 0,
      target: row.querySelector('.step-target').value
    }))
  }

  overlay.querySelector('#add-step').addEventListener('click', () => {
    readSteps()
    steps.push({ label: 'Interval', duration_min: 10, target: '' })
    stepsEl.innerHTML = buildStepsHTML(steps)
    attachStepRemove()
  })

  function attachStepRemove() {
    stepsEl.querySelectorAll('.remove-step').forEach(btn => {
      btn.addEventListener('click', () => {
        readSteps()
        steps.splice(parseInt(btn.dataset.step), 1)
        stepsEl.innerHTML = buildStepsHTML(steps)
        attachStepRemove()
      })
    })
  }
  attachStepRemove()

  const close = () => overlay.remove()
  overlay.querySelector('#modal-close').addEventListener('click', close)
  overlay.querySelector('#modal-cancel').addEventListener('click', close)
  overlay.addEventListener('click', e => { if (e.target === overlay) close() })

  const deleteBtn = overlay.querySelector('#delete-template')
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return
      setState({ templates: state.templates.filter(x => x.id !== t.id) })
      close()
      onSave()
    })
  }

  overlay.querySelector('#template-form').addEventListener('submit', e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    readSteps()
    const updated = {
      ...t,
      name: fd.get('name'),
      sport: fd.get('sport'),
      cycle_type: fd.get('cycle_type'),
      duration_minutes: parseInt(fd.get('duration_minutes')) || t.duration_minutes,
      intensity_target: fd.get('intensity_target'),
      rpe: parseInt(fd.get('rpe')) || t.rpe,
      description: fd.get('description'),
      tags: fd.get('tags').split(',').map(s => s.trim()).filter(Boolean),
      structure: steps
    }
    if (isNew) {
      setState({ templates: [...state.templates, updated] })
    } else {
      setState({ templates: state.templates.map(x => x.id === t.id ? updated : x) })
    }
    close()
    onSave()
  })

  if (window.lucide) window.lucide.createIcons()
}
