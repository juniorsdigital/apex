// One planned day: its sessions in order, each with the workout up top and the
// details a tap away. Most days have one session; doubles (a ride and a lift,
// or a ride split in two) list each session with the break between them.
import { kindById, plannedHours, formatHours } from '../lib/plan.js'
import { esc, formatDate, openModal, toast, dateKey, parseKey, addDays } from '../lib/util.js'
import { slidePane, snapBack, swipeable } from '../lib/motion.js'
import { renderJournalForm, WORKOUT_FEEL } from './JournalForm.js'

/** Chip for a day or a session. Strength wears a square dot, so it reads without colour. */
export function kindChip(item) {
  const k = kindById(item.kind)
  return `<span class="kind-chip ${item.kind === 'strength' ? 'is-square' : ''}" style="--kind:${k.color}">${esc(item.dayType)}</span>`
}

/** One small dot per session, for calendar cells and the week strip. */
export function sessionPips(day) {
  if (day.sessions.length < 2) return ''
  return `<span class="session-pips" aria-hidden="true">${day.sessions.map(s =>
    `<i class="session-pip ${s.kind === 'strength' ? 'is-square' : ''}" style="--kind:${kindById(s.kind).color}"></i>`).join('')}</span>`
}

/** "HIT + Lift A - Lower" for lists; one session keeps the day's own title. */
export function sessionTitles(day) {
  return day.sessions.length > 1 ? day.sessions.map(s => s.title).join(' + ') : day.title
}

/** For screen readers: ", 2 sessions: HIT and Lift A - Lower". */
export function sessionsLabel(day) {
  return day.sessions.length > 1 ? `, ${day.sessions.length} sessions: ${day.sessions.map(s => s.title).join(' and ')}` : ''
}

/** How a session was logged in the journal, 1 to 5, or null. */
export function loggedFeel(entry, day, session) {
  if (!entry) return null
  if (day.sessions.length === 1) return entry.workout_feel ?? null
  return entry.sessions?.[session.id]?.feel ?? null
}

function hoursText(item) {
  const out = item.hoursOutdoor, inn = item.hoursIndoor
  if (!plannedHours(item)) return ''
  if (out != null && inn != null && out !== inn) return `${formatHours(out)} outside, ${formatHours(inn)} on the trainer`
  return formatHours(plannedHours(item))
}

function detailsHtml(rows) {
  const list = rows.filter(([, text]) => text)
  return list.length ? `
    <dl class="session-details">
      ${list.map(([label, text]) => `<div><dt>${label}</dt><dd>${esc(text)}</dd></div>`).join('')}
    </dl>` : ''
}

function coachHtml(coach, open) {
  return coach.length ? `
    <details class="coach-notes" ${open ? 'open' : ''}>
      <summary>Coach notes</summary>
      <dl>
        ${coach.map(s => `<div>${s.label ? `<dt>${esc(s.label)}</dt>` : ''}<dd>${esc(s.text)}</dd></div>`).join('')}
      </dl>
    </details>` : ''
}

function sessionCard(day, s, { open, entry }) {
  const k = kindById(s.kind)
  const multi = day.sessions.length > 1
  const feel = loggedFeel(entry, day, s)
  const facts = [
    (hoursText(s) || s.duration) && ['clock', hoursText(s) || s.duration],
    s.venue && ['map-pin', s.venue],
    s.intensity && ['gauge', s.intensity]
  ].filter(Boolean)

  return `
    <article class="session" style="--kind:${k.color}" ${multi ? `aria-label="Session ${s.n} of ${day.sessions.length}: ${esc(s.label)}, ${esc(s.title)}"` : ''}>
      <div class="session-top">
        ${multi ? `
          <span class="session-step" aria-hidden="true">${s.n}</span>
          <span class="session-label">${esc(s.label)}${s.time ? ` <span class="faint">${esc(s.time)}</span>` : ''}</span>
          ${kindChip(s)}` : `
          ${kindChip(day)}
          <span class="faint small">${esc(day.phase)}${day.weekType ? `, ${esc(day.weekType)}` : ''}</span>`}
        ${feel ? `<span class="badge badge-success session-logged"><i data-lucide="check" class="icon-xs" aria-hidden="true"></i>Logged: ${WORKOUT_FEEL[feel - 1]}</span>` : ''}
      </div>
      ${multi && s.title !== s.dayType ? `<h3 class="session-title">${esc(s.title)}</h3>` : ''}
      <p class="session-workout ${s.workout.length > 160 ? 'is-long' : ''}">${esc(s.workout)}</p>
      ${facts.length ? `
        <ul class="session-facts">
          ${facts.map(([icon, text]) => `<li><i data-lucide="${icon}" class="icon-sm" aria-hidden="true"></i><span>${esc(text)}</span></li>`).join('')}
        </ul>` : ''}
      ${detailsHtml([
        ['Fueling', s.fueling],
        ...s.extra,
        ['If recovery is lacking', s.planB],
        ['Bad weather', s.indoorPlan]
      ])}
      ${coachHtml(s.coach, open)}
    </article>`
}

// Plan B, bad weather and coach notes that cover every part of a split session.
function sharedCard(shared, open) {
  const count = shared.parts
  const details = detailsHtml([...shared.extra, ['If recovery is lacking', shared.planB], ['Bad weather', shared.indoorPlan]])
  if (!details && !shared.coach.length) return ''
  return `
    <section class="session session-shared" aria-label="Notes for ${count === 2 ? 'both parts' : 'every part'}">
      <span class="session-label">${count === 2 ? 'For both parts' : 'For every part'}</span>
      ${details}
      ${coachHtml(shared.coach, open)}
    </section>`
}

/**
 * A day's sessions as HTML. `open` expands the coach notes by default;
 * `entry` is that day's journal entry, to mark sessions already logged.
 */
export function dayHtml(day, { open = false, entry = null } = {}) {
  if (day.sessions.length === 1) {
    const s = day.sessions[0]
    return sessionCard(day, s, { open, entry }) + (s.shared ? sharedCard(s.shared, open) : '')
  }
  const total = hoursText(day)
  return `
    <div class="day-sessions">
      <p class="day-summary">
        <span><b>${day.sessions.length} sessions</b>${total ? `, ${esc(total)}${/outside/.test(total) ? '' : ' on the bike'}` : ''}</span>
        <span class="faint">${esc(day.phase)}${day.weekType ? `, ${esc(day.weekType)}` : ''}</span>
      </p>
      <ol class="session-list">
        ${day.sessions.map(s => `
          <li>
            ${s.gapBefore && s.n > 1 ? `<p class="session-gap"><i data-lucide="hourglass" class="icon-xs" aria-hidden="true"></i><span>${esc(s.gapBefore)}</span></p>` : ''}
            ${sessionCard(day, s, { open, entry })}
            ${s.shared ? sharedCard(s.shared, open) : ''}
          </li>`).join('')}
      </ol>
    </div>`
}

/**
 * Full day in a modal: the sessions plus that day's journal entry. Swipe
 * sideways, use the arrow buttons or the arrow keys to move a day at a time
 * through the plan.
 */
export function openDayModal(state, initialDate) {
  let date = initialDate
  let dirty = false
  const plan = state.plan
  const first = plan ? (plan.start < initialDate ? plan.start : initialDate) : initialDate
  const last = plan ? (plan.end > initialDate ? plan.end : initialDate) : initialDate
  const shift = (key, n) => dateKey(addDays(parseKey(key), n))
  const canGo = dir => plan ? (dir > 0 ? date < last : date > first) : false

  const { el } = openModal(`
    <div class="modal-head">
      <h2 aria-live="polite"></h2>
      <div class="row day-nav">
        ${plan ? `
          <button class="btn btn-ghost btn-icon" data-step="-1" aria-label="Previous day"><i data-lucide="chevron-left" aria-hidden="true"></i></button>
          <button class="btn btn-ghost btn-icon" data-step="1" aria-label="Next day"><i data-lucide="chevron-right" aria-hidden="true"></i></button>` : ''}
        <button class="btn btn-ghost btn-icon" data-close aria-label="Close"><i data-lucide="x" aria-hidden="true"></i></button>
      </div>
    </div>
    <div class="stack day-pane">
      <div id="day-plan"></div>
      <div id="day-journal"></div>
    </div>
  `, { width: 680 })
  const dialog = el.querySelector('.modal')
  const pane = el.querySelector('.day-pane')

  const renderPlan = () => {
    const day = plan?.byDate[date]
    el.querySelector('#day-plan').innerHTML = day
      ? dayHtml(day, { entry: state.journal[date] })
      : `<p class="muted">Nothing planned for this day.</p>`
  }
  const render = () => {
    el.querySelector('h2').textContent = formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })
    renderPlan()
    el.querySelector('#day-journal').replaceChildren(renderJournalForm(state, date))
    el.querySelectorAll('[data-step]').forEach(btn => { btn.disabled = !canGo(Number(btn.dataset.step)) })
    dirty = false
    if (window.lucide) window.lucide.createIcons()
  }

  const go = dir => {
    if (!canGo(dir)) return
    // Moving on would throw away a half-written entry.
    if (dirty) {
      toast('Save this entry first, or close it to discard the changes.')
      snapBack(pane)
      return
    }
    slidePane(pane, dir, () => {
      date = shift(date, dir)
      render()
      dialog.scrollTop = 0
    })
  }

  render()
  pane.addEventListener('input', () => { dirty = true })
  pane.addEventListener('change', () => { dirty = true })
  // Saving marks the sessions as logged.
  el.addEventListener('journal-saved', () => {
    dirty = false
    renderPlan()
    if (window.lucide) window.lucide.createIcons()
  })
  el.addEventListener('click', e => {
    const btn = e.target.closest('[data-step]')
    if (btn) go(Number(btn.dataset.step))
  })
  const onKey = e => {
    if (!el.isConnected) return document.removeEventListener('keydown', onKey)
    if (el.classList.contains('is-closing') || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
    if (e.target.closest?.('input, textarea, select')) return
    e.preventDefault()
    go(e.key === 'ArrowRight' ? 1 : -1)
  }
  document.addEventListener('keydown', onKey)
  if (plan) swipeable(dialog, { target: () => pane, canGo, onSwipe: go })
}
