// One planned day: the workout up top, the details a tap away.
import { kindById, plannedHours, formatHours } from '../lib/plan.js'
import { esc, formatDate, openModal } from '../lib/util.js'
import { renderJournalForm } from './JournalForm.js'

export function kindChip(day) {
  const k = kindById(day.kind)
  return `<span class="kind-chip" style="--kind:${k.color}">${esc(day.dayType)}</span>`
}

function hoursText(day) {
  const out = day.hoursOutdoor, inn = day.hoursIndoor
  if (!plannedHours(day)) return ''
  if (out != null && inn != null && out !== inn) return `${formatHours(out)} outside, ${formatHours(inn)} on the trainer`
  return formatHours(plannedHours(day))
}

/** Session as HTML. `open` expands the coach notes by default. */
export function sessionHtml(day, { open = false } = {}) {
  const k = kindById(day.kind)
  const facts = [
    hoursText(day) && ['clock', hoursText(day)],
    day.venue && ['map-pin', day.venue],
    day.intensity && ['gauge', day.intensity]
  ].filter(Boolean)
  const details = [
    day.fueling && ['Fueling', day.fueling],
    day.strength && ['Strength', day.strength],
    day.planB && ['If recovery is lacking', day.planB],
    day.indoorPlan && ['Bad weather', day.indoorPlan]
  ].filter(Boolean)

  return `
    <article class="session" style="--kind:${k.color}">
      <div class="session-top">
        ${kindChip(day)}
        <span class="faint small">${esc(day.phase)}${day.weekType ? `, ${esc(day.weekType)}` : ''}</span>
      </div>
      <p class="session-workout ${day.workout.length > 160 ? 'is-long' : ''}">${esc(day.workout)}</p>
      ${facts.length ? `
        <ul class="session-facts">
          ${facts.map(([icon, text]) => `<li><i data-lucide="${icon}" class="icon-sm" aria-hidden="true"></i><span>${esc(text)}</span></li>`).join('')}
        </ul>` : ''}
      ${details.length ? `
        <dl class="session-details">
          ${details.map(([label, text]) => `<div><dt>${label}</dt><dd>${esc(text)}</dd></div>`).join('')}
        </dl>` : ''}
      ${day.coach.length ? `
        <details class="coach-notes" ${open ? 'open' : ''}>
          <summary>Coach notes</summary>
          <dl>
            ${day.coach.map(s => `<div>${s.label ? `<dt>${esc(s.label)}</dt>` : ''}<dd>${esc(s.text)}</dd></div>`).join('')}
          </dl>
        </details>` : ''}
    </article>`
}

/** Full day in a modal: the session plus that day's journal entry. */
export function openDayModal(state, date) {
  const day = state.plan?.byDate[date]
  const { el } = openModal(`
    <div class="modal-head">
      <h2>${formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
      <button class="btn btn-ghost btn-icon" data-close aria-label="Close"><i data-lucide="x" aria-hidden="true"></i></button>
    </div>
    <div class="stack">
      ${day ? sessionHtml(day) : `<p class="muted">Nothing planned for this day.</p>`}
      <div id="day-journal"></div>
    </div>
  `, { width: 680 })
  el.querySelector('#day-journal').appendChild(renderJournalForm(state, date))
  if (window.lucide) window.lucide.createIcons()
}
