// Plan — the training plan as a month calendar. Tap a day for the full session
// and that day's journal entry. Load a new CSV here when the plan changes.
import { renderApp } from '../app.js'
import { KINDS, kindById, plannedHours, formatHours } from '../lib/plan.js'
import { esc, dateKey, parseKey, addDays, startOfWeek, formatDate } from '../lib/util.js'
import { openDayModal } from './DaySession.js'
import { choosePlanFile, renderPlanDrop } from './PlanUpload.js'
import { phaseColor } from './SeasonProfile.js'

let monthOffset = 0

export function renderPlan(state) {
  const plan = state.plan
  const wrap = document.createElement('div')
  wrap.className = 'stack'

  if (!plan) {
    wrap.innerHTML = `<div class="page-head"><h1 class="page-title" tabindex="-1">Plan</h1></div>`
    wrap.appendChild(renderPlanDrop())
    return wrap
  }

  const now = new Date()
  const month = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const gridStart = startOfWeek(month)
  const today = dateKey()
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  if (days[35].getMonth() !== month.getMonth()) days.length = 35
  const prefix = dateKey(month).slice(0, 7)
  const monthDays = plan.days.filter(d => d.date.startsWith(prefix))
  const monthHours = monthDays.reduce((a, d) => a + plannedHours(d), 0)
  const phases = plan.phases.filter(p => p.start.slice(0, 7) <= prefix && p.end.slice(0, 7) >= prefix)
  const firstMonth = parseKey(plan.start), lastMonth = parseKey(plan.end)
  const canPrev = month > new Date(firstMonth.getFullYear(), firstMonth.getMonth(), 1)
  const canNext = month < new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)

  wrap.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title" tabindex="-1">${month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h1>
        <p class="page-sub">${monthDays.length ? `${formatHours(monthHours)} planned this month` : 'Outside your plan'}</p>
      </div>
      <div class="row">
        <button class="btn btn-ghost btn-icon" data-shift="-1" aria-label="Previous month" ${canPrev ? '' : 'disabled'}><i data-lucide="chevron-left" aria-hidden="true"></i></button>
        <button class="btn btn-ghost" data-shift="0">This month</button>
        <button class="btn btn-ghost btn-icon" data-shift="1" aria-label="Next month" ${canNext ? '' : 'disabled'}><i data-lucide="chevron-right" aria-hidden="true"></i></button>
      </div>
    </div>

    ${phases.length ? `
      <ul class="phase-strip" aria-label="Phases this month">
        ${phases.map(p => `
          <li style="--phase:${phaseColor(p.name)}">
            <b>${esc(p.name)}</b>
            <span class="faint small">${formatDate(p.start, { month: 'short', day: 'numeric' })} to ${formatDate(p.end, { month: 'short', day: 'numeric' })}</span>
          </li>`).join('')}
      </ul>` : ''}

    <div class="calendar">
      ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
      ${days.map(d => {
        const key = dateKey(d)
        const day = plan.byDate[key]
        const k = day ? kindById(day.kind) : null
        const written = !!state.journal[key]
        const label = `${d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}${day ? `: ${day.dayType}, ${formatHours(plannedHours(day))}` : ''}${written ? ', journal written' : ''}`
        return `
          <button class="cal-day ${d.getMonth() !== month.getMonth() ? 'other' : ''} ${key === today ? 'today' : ''} ${key < today ? 'past' : ''} ${day ? 'kind-' + day.kind : 'empty'}"
            data-date="${key}" ${k ? `style="--kind:${k.color}"` : ''} aria-label="${esc(label)}" ${key === today ? 'aria-current="date"' : ''}>
            <span class="cal-top">
              <span class="cal-num">${d.getDate()}</span>
              ${written ? '<span class="cal-journal" aria-hidden="true"><i data-lucide="notebook-pen"></i></span>' : ''}
            </span>
            ${day ? `
              <span class="cal-type">${esc(day.kind === 'race' ? day.title : day.dayType)}</span>
              <span class="cal-hrs tabular">${plannedHours(day) ? formatHours(plannedHours(day)) : 'Off'}</span>` : ''}
          </button>`
      }).join('')}
    </div>

    <div class="row-between">
      <div class="legend faint small">
        ${KINDS.map(k => `<span><i class="legend-dot" style="background:${k.color}"></i>${k.label}</span>`).join('')}
        <span><i data-lucide="notebook-pen" class="icon-xs" aria-hidden="true"></i> Journal written</span>
      </div>
      <div class="row">
        <span class="faint small">${esc(state.planMeta?.file_name || 'Plan')}${state.planMeta?.uploaded_at ? `, loaded ${formatDate(dateKey(new Date(state.planMeta.uploaded_at)), { month: 'short', day: 'numeric' })}` : ''}</span>
        <button class="btn btn-ghost btn-sm" id="replace-plan"><i data-lucide="file-up" class="icon-sm" aria-hidden="true"></i> Load new plan</button>
      </div>
    </div>
  `

  wrap.querySelectorAll('[data-shift]').forEach(btn => btn.addEventListener('click', () => {
    const n = Number(btn.dataset.shift)
    monthOffset = n === 0 ? 0 : monthOffset + n
    renderApp()
  }))
  wrap.querySelector('.calendar').addEventListener('click', e => {
    const cell = e.target.closest('[data-date]')
    if (cell) openDayModal(state, cell.dataset.date)
  })
  wrap.querySelector('#replace-plan').addEventListener('click', choosePlanFile)
  return wrap
}
