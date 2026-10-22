// Journey — the whole season at a glance: the route, where you are on it,
// the phases in order, and the key days ahead.
import { kindById, raceInfo, daysUntil, plannedHours, formatHours } from '../lib/plan.js'
import { esc, dateKey, formatDate } from '../lib/util.js'
import { kindChip, openDayModal } from './DaySession.js'
import { renderPlanDrop } from './PlanUpload.js'
import { seasonProfileHtml, phaseColor } from './SeasonProfile.js'
import { weekLabel } from './TodayView.js'

export function renderJourney(state) {
  const plan = state.plan
  const wrap = document.createElement('div')
  wrap.className = 'stack'
  if (!plan) {
    wrap.innerHTML = `<div class="page-head"><h1 class="page-title" tabindex="-1">Journey</h1></div>`
    wrap.appendChild(renderPlanDrop())
    return wrap
  }

  const today = dateKey()
  const goal = plan.goal
  const toGoal = daysUntil(goal.date, today)
  const past = plan.days.filter(d => d.date < today)
  const hoursDone = past.reduce((a, d) => a + plannedHours(d), 0)
  const hoursTotal = plan.days.reduce((a, d) => a + plannedHours(d), 0)
  const week = plan.weeks.find(w => w.days.some(d => d.date === today))
  const entries = Object.keys(state.journal).length
  const nextKey = plan.keyDates.find(d => d.date >= today)

  wrap.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title" tabindex="-1">The road to ${/nationals/i.test(goal.dayType) ? 'Nationals' : esc(raceInfo(goal).name)}</h1>
        <p class="page-sub">${formatDate(plan.start, { month: 'long', day: 'numeric' })} to ${formatDate(plan.end, { month: 'long', day: 'numeric', year: 'numeric' })}, ${plan.weeks.length} weeks, ${plan.phases.length} phases</p>
      </div>
    </div>

    <div class="kpi-row" role="list">
      ${kpi(toGoal > 0 ? toGoal : 0, toGoal === 1 ? 'day to go' : 'days to go', `${Math.ceil(Math.max(toGoal, 0) / 7)} weeks`, 'var(--kind-race)')}
      ${weekKpi(week, plan, today)}
      ${kpi(formatHours(Math.round(hoursDone)), 'riding behind you', `of ${Math.round(hoursTotal)} h planned`, 'var(--kind-endurance)')}
      ${kpi(entries, entries === 1 ? 'journal entry' : 'journal entries', 'Keep writing', 'var(--kind-rehearsal)')}
    </div>

    <section class="card season-card" aria-labelledby="route-h">
      <div class="section-head">
        <h2 id="route-h">The route</h2>
        <span class="faint small">Height is planned hours per week. Colour is the phase.</span>
      </div>
      ${seasonProfileHtml(plan)}
    </section>

    <div class="grid-2">
      <section class="section" aria-labelledby="phases-h">
        <div class="section-head"><h2 id="phases-h">Phases</h2></div>
        <ol class="phases">
          ${plan.phases.map(p => {
            const total = daysUntil(p.end, p.start) + 1
            const done = Math.min(total, Math.max(0, daysUntil(today, p.start)))
            const state = p.end < today ? 'done' : p.start <= today ? 'now' : 'next'
            return `
              <li class="phase is-${state}" style="--phase:${phaseColor(p.name)}">
                <div class="phase-head">
                  <b>${esc(p.name)}</b>
                  <span class="faint small">${state === 'done' ? 'Done' : state === 'now' ? `${Math.round((done / total) * 100)}% through` : `Starts in ${daysUntil(p.start, today)} days`}</span>
                </div>
                <span class="faint small">${formatDate(p.start, { month: 'short', day: 'numeric' })} to ${formatDate(p.end, { month: 'short', day: 'numeric' })}, ${p.weeks} weeks, ${Math.round(p.hours)} h</span>
                <div class="bar-track"><div class="bar-fill" style="width:${(done / total) * 100}%;background:var(--phase)"></div></div>
              </li>`
          }).join('')}
        </ol>
      </section>

      <section class="section" aria-labelledby="keys-h">
        <div class="section-head"><h2 id="keys-h">Key days</h2><span class="faint small">Races, tests and full-distance rehearsals</span></div>
        <ul class="keydays">
          ${plan.keyDates.map(d => {
            const n = daysUntil(d.date, today)
            return `
              <li>
                <button class="keyday ${n < 0 ? 'is-past' : ''} ${d === nextKey ? 'is-next' : ''} ${d === goal ? 'is-goal' : ''}" data-date="${d.date}" style="--kind:${kindById(d.kind).color}">
                  <span class="keyday-when">
                    <b class="tabular">${n < 0 ? 'Done' : n === 0 ? 'Today' : n}</b>
                    <span>${n > 0 ? (n === 1 ? 'day' : 'days') : ''}</span>
                  </span>
                  <span class="keyday-body">
                    ${kindChip(d)}
                    <span class="keyday-title">${esc(d.kind === 'race' ? raceInfo(d).name : d.title.toLowerCase() === d.dayType.toLowerCase() ? d.weekType || d.phase : d.title)}</span>
                    <span class="faint small">${formatDate(d.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </span>
                </button>
              </li>`
          }).join('')}
        </ul>
      </section>
    </div>
  `

  wrap.querySelector('.keydays').addEventListener('click', e => {
    const btn = e.target.closest('[data-date]')
    if (btn) openDayModal(state, btn.dataset.date)
  })
  return wrap
}

// "Bridge / week" or "5 / week of 38".
function weekKpi(week, plan, today) {
  if (!week) return kpi('—', 'week', today < plan.start ? 'Plan not started' : 'Plan complete', 'var(--color-primary)')
  const label = weekLabel(week, plan)
  const [value, of] = /bridge/i.test(label) ? ['Bridge', 'week'] : [label.split(' ')[0], `week ${label.split(' ').slice(1).join(' ')}`]
  return kpi(esc(value), of, esc(week.type || week.phase), 'var(--color-primary)')
}

function kpi(value, label, sub, color) {
  return `
    <div class="kpi" role="listitem" style="--kpi-color:${color}">
      <div class="kpi-value kpi-big">${value}</div>
      <div class="kpi-label">${label}</div>
      <div class="faint small">${sub}</div>
    </div>`
}
