// Month calendar — tap a day to plan or log, tap a ride to edit it.
// In coach mode, tapping highlights days instead, and the side panel builds a
// prompt about them for an AI coach.
import { renderApp } from '../app.js'
import { rideType, isDone, sum } from '../lib/metrics.js'
import { COACH_FOCUSES, buildCoachPrompt } from '../lib/coach.js'
import { esc, dateKey, parseKey, addDays, startOfWeek, formatDate, formatDuration, toast } from '../lib/util.js'
import { openRideForm } from './RideForm.js'

const COACH_KEY = 'apex.coach.v1'

let monthOffset = 0
const coach = loadCoach()

const STATUS_TEXT = { completed: 'done', planned: 'planned', skipped: 'skipped' }

// The selection survives reloads in this browser, so a rider can pick days,
// go check something, and come back.
function loadCoach() {
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem(COACH_KEY)) || {} } catch {}
  return {
    active: !!saved.active,
    dates: new Set(Array.isArray(saved.dates) ? saved.dates : []),
    focus: saved.focus || COACH_FOCUSES[0].id,
    question: saved.question || '',
    anchor: null
  }
}

function saveCoach() {
  try {
    localStorage.setItem(COACH_KEY, JSON.stringify({
      active: coach.active, dates: [...coach.dates], focus: coach.focus, question: coach.question
    }))
  } catch {}
}

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
        <button class="btn btn-marker" id="coach-toggle" aria-pressed="${coach.active}">
          <i data-lucide="highlighter" class="icon-sm" aria-hidden="true"></i> ${coach.active ? 'Done choosing' : 'Ask the coach'}
        </button>
      </div>
    </div>

    <div class="cal-layout ${coach.active ? 'has-coach' : ''}">
      <div class="stack-sm">
        <div class="calendar ${coach.active ? 'is-selecting' : ''}">
          ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
          ${days.map(d => {
            const key = dateKey(d)
            const rides = byDate[key] || []
            const longDate = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
            const selected = coach.dates.has(key)
            return `
              <div class="cal-day ${d.getMonth() !== month.getMonth() ? 'other' : ''} ${key === today ? 'today' : ''} ${selected ? 'selected' : ''}" data-date="${key}">
                <button class="cal-num" data-add
                  aria-label="${coach.active ? `Highlight ${longDate} for the coach` : `Add a ride on ${longDate}`}"
                  ${coach.active ? `aria-pressed="${selected}"` : ''}
                  ${key === today ? 'aria-current="date"' : ''}>${d.getDate()}</button>
                ${rides.map(r => {
                  const name = esc(r.title || rideType(r.ride_type).label)
                  return `
                  <button class="cal-ride status-${r.status}" data-ride-id="${r.id}" style="--type-color:${rideType(r.ride_type).color}"
                    title="${name}" ${coach.active ? 'tabindex="-1"' : ''} aria-label="Edit ${name}, ${STATUS_TEXT[r.status]}">${name}</button>`
                }).join('')}
              </div>`
          }).join('')}
        </div>

        <div class="legend faint small">
          <span><i class="legend-dot done"></i>Done</span>
          <span><i class="legend-dot planned"></i>Planned</span>
          <span><i class="legend-dot skipped"></i>Skipped</span>
          ${coach.active
            ? `<span><i class="legend-dot marked"></i>Highlighted for the coach. Shift-click to highlight a range.</span>`
            : `<span>Select a date to add a ride</span>`}
        </div>
      </div>

      ${coach.active ? coachPanel() : ''}
    </div>
  `

  wrap.querySelectorAll('[data-shift]').forEach(btn => btn.addEventListener('click', () => {
    const n = Number(btn.dataset.shift)
    monthOffset = n === 0 ? 0 : monthOffset + n
    renderApp()
  }))

  wrap.querySelector('#coach-toggle').addEventListener('click', () => {
    coach.active = !coach.active
    saveCoach()
    renderApp()
    document.getElementById('coach-toggle')?.focus()
  })

  wrap.querySelector('.calendar').addEventListener('click', e => {
    const day = e.target.closest('[data-date]')
    if (coach.active) {
      if (day) toggleDay(wrap, state, day.dataset.date, e.shiftKey)
      return
    }
    const chip = e.target.closest('[data-ride-id]')
    if (chip) return openRideForm({ ride: state.rides.find(r => r.id === chip.dataset.rideId) })
    if (day) openRideForm({ date: day.dataset.date })
  })

  if (coach.active) bindCoachPanel(wrap, state)
  return wrap
}

// ─── COACH ──────────────────────────────────────────────────────────────────

function coachPanel() {
  return `
    <aside class="card coach" aria-labelledby="coach-h">
      <div class="coach-head">
        <h2 id="coach-h">Ask the coach</h2>
        <p class="coach-count" id="coach-count" role="status"></p>
      </div>

      <div>
        <span class="label" id="coach-quick-label">Quick pick</span>
        <div class="coach-quick" role="group" aria-labelledby="coach-quick-label">
          <button class="chip" data-range="7">Last 7 days</button>
          <button class="chip" data-range="week">This week</button>
          <button class="chip" data-range="28">Last 4 weeks</button>
          <button class="chip" data-range="clear">Clear</button>
        </div>
      </div>

      <div>
        <span class="label" id="coach-focus-label">What should it look at?</span>
        <div class="coach-quick" role="group" aria-labelledby="coach-focus-label">
          ${COACH_FOCUSES.map(f => `<button class="chip" data-focus="${f.id}" aria-pressed="${coach.focus === f.id}">${f.label}</button>`).join('')}
        </div>
      </div>

      <div>
        <label class="label" for="coach-question">Anything specific? <span class="faint">(optional)</span></label>
        <textarea class="input" id="coach-question" rows="2" placeholder="e.g. My legs felt dead on Thursday's intervals. Why?">${esc(coach.question)}</textarea>
      </div>

      <details>
        <summary class="small muted" style="cursor:pointer">Preview the prompt</summary>
        <pre class="coach-preview" id="coach-preview" tabindex="0"></pre>
      </details>

      <div class="coach-actions">
        <button class="btn btn-marker" id="coach-copy"><i data-lucide="clipboard-copy" class="icon-sm" aria-hidden="true"></i> Copy prompt</button>
        <a class="btn btn-ghost btn-sm" href="https://claude.ai/new" target="_blank" rel="noopener">Open Claude</a>
        <a class="btn btn-ghost btn-sm" href="https://chatgpt.com/" target="_blank" rel="noopener">Open ChatGPT</a>
      </div>
      <p class="faint small">The prompt includes your profile, the highlighted days, readiness check-ins and the four weeks before them. Nothing is sent until you paste it.</p>
    </aside>`
}

function bindCoachPanel(wrap, state) {
  wrap.querySelectorAll('[data-range]').forEach(btn => btn.addEventListener('click', () => {
    const r = btn.dataset.range
    coach.dates.clear()
    if (r !== 'clear') {
      const end = new Date()
      const start = r === 'week' ? startOfWeek(end) : addDays(end, -(Number(r) - 1))
      for (let d = start; dateKey(d) <= dateKey(end); d = addDays(d, 1)) coach.dates.add(dateKey(d))
    }
    coach.anchor = null
    saveCoach()
    syncSelection(wrap, state)
  }))

  wrap.querySelectorAll('[data-focus]').forEach(btn => btn.addEventListener('click', () => {
    coach.focus = btn.dataset.focus
    wrap.querySelectorAll('[data-focus]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)))
    saveCoach()
    updateCoach(wrap, state)
  }))

  wrap.querySelector('#coach-question').addEventListener('input', e => {
    coach.question = e.target.value
    saveCoach()
    updateCoach(wrap, state)
  })

  wrap.querySelector('#coach-copy').addEventListener('click', async () => {
    const prompt = buildCoachPrompt({ state, dates: coach.dates, focus: coach.focus, question: coach.question })
    if (!prompt) return toast('Highlight at least one day on the calendar first.', { error: true })
    try {
      await navigator.clipboard.writeText(prompt)
      toast('Prompt copied. Paste it into your AI coach.')
    } catch {
      // Clipboard can be blocked; fall back to selecting the preview text.
      const details = wrap.querySelector('details')
      details.open = true
      const range = document.createRange()
      range.selectNodeContents(wrap.querySelector('#coach-preview'))
      getSelection().removeAllRanges()
      getSelection().addRange(range)
      toast("Couldn't reach the clipboard. The prompt is selected, so press Ctrl+C or ⌘C.", { error: true })
    }
  })

  updateCoach(wrap, state)
}

function toggleDay(wrap, state, key, extend) {
  if (extend && coach.anchor) {
    // Shift-click fills the range from the last day touched.
    const [a, b] = [coach.anchor, key].sort()
    for (let d = parseKey(a); dateKey(d) <= b; d = addDays(d, 1)) coach.dates.add(dateKey(d))
  } else if (coach.dates.has(key)) {
    coach.dates.delete(key)
  } else {
    coach.dates.add(key)
  }
  coach.anchor = key
  saveCoach()
  syncSelection(wrap, state)
}

function syncSelection(wrap, state) {
  wrap.querySelectorAll('.cal-day').forEach(cell => {
    const on = coach.dates.has(cell.dataset.date)
    cell.classList.toggle('selected', on)
    cell.querySelector('.cal-num').setAttribute('aria-pressed', String(on))
  })
  updateCoach(wrap, state)
}

function updateCoach(wrap, state) {
  const dates = [...coach.dates].sort()
  const rides = state.rides.filter(r => coach.dates.has(r.ride_date))
  wrap.querySelector('#coach-count').textContent = dates.length
    ? `${dates.length} day${dates.length > 1 ? 's' : ''} highlighted, ${formatDate(dates[0], { month: 'short', day: 'numeric' })} to ${formatDate(dates[dates.length - 1], { month: 'short', day: 'numeric' })}, ${rides.filter(isDone).length} rides done`
    : 'Tap days on the calendar to highlight them.'
  wrap.querySelector('#coach-preview').textContent =
    buildCoachPrompt({ state, dates: coach.dates, focus: coach.focus, question: coach.question }) || 'Highlight some days to build the prompt.'
  wrap.querySelector('#coach-copy').disabled = !dates.length
}
