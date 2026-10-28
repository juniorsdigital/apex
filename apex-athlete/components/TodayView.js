// Today — countdown to the goal race, today's sessions, this week, and the journal.
// Works for guests (stored in this browser) and signed-in riders alike.
import { navigate, reload } from '../app.js'
import { guestDataCount } from '../lib/store.js'
import { kindById, raceInfo, daysUntil, plannedHours, formatHours } from '../lib/plan.js'
import { esc, dateKey, addDays, formatDate, toast, friendlyError, refreshIcons } from '../lib/util.js'
import { dayHtml, kindChip, openDayModal, sessionPips, sessionTitles, sessionsLabel, loggedFeel } from './DaySession.js'
import { renderJournalForm, nextRace } from './JournalForm.js'
import { renderPlanDrop } from './PlanUpload.js'
import { seasonProfileHtml } from './SeasonProfile.js'

export function renderToday(state) {
  const today = dateKey()
  const plan = state.plan
  const importable = state.user ? guestDataCount() : 0
  const firstName = state.profile?.full_name?.split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const wrap = document.createElement('div')
  wrap.className = 'stack'
  wrap.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title" tabindex="-1">${greeting}${firstName ? ', ' + esc(firstName) : ''}</h1>
        <p class="page-sub">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>

    ${importable ? `
      <div class="alert alert-info stack-sm">
        <div class="row-between">
          <span>You saved a plan or journal entries on this device before signing in.</span>
          <button class="btn btn-primary btn-sm" id="import-btn">Add to my account</button>
        </div>
        <span class="inline-status" id="import-status" role="status"></span>
      </div>` : ''}

    <div id="plan-slot"></div>

    <section class="section" aria-labelledby="journal-h">
      <div class="section-head">
        <h2 id="journal-h">Today's journal</h2>
        ${state.journal[today] ? `<span class="faint small">Saved. Change anything and save again.</span>` : ''}
      </div>
      <div class="card" id="journal-slot"></div>
    </section>

    ${!state.user ? `
      <section class="card guest-cta row-between">
        <div>
          <h2>Take it everywhere</h2>
          <p class="small">You're in guest mode, so your plan and journal live only in this browser. Sign in to sync them to your phone and to open the full plan, journal and journey.</p>
        </div>
        <button class="btn btn-marker" id="cta-signin">Sign in</button>
      </section>` : ''}
  `

  let planEl = plan ? planBlock(state, plan, today) : renderPlanDrop()
  wrap.querySelector('#plan-slot').replaceWith(planEl)
  // Saving the journal marks today's sessions as logged without redrawing the form.
  wrap.addEventListener('journal-saved', e => {
    if (!plan || e.detail.date !== today || !planEl.isConnected) return
    const fresh = planBlock(state, plan, today)
    planEl.replaceWith(fresh)
    planEl = fresh
    refreshIcons()
  })
  wrap.querySelector('#journal-slot').appendChild(renderJournalForm(state, today))
  wrap.querySelector('#cta-signin')?.addEventListener('click', () => navigate('login'))

  wrap.querySelector('#import-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget
    const status = wrap.querySelector('#import-status')
    btn.disabled = true
    btn.textContent = 'Adding…'
    const { error } = await state.store.importGuestData()
    if (error) {
      btn.disabled = false
      btn.textContent = 'Try again'
      status.className = 'inline-status is-error'
      status.textContent = friendlyError(error, 'add them to your account')
      return
    }
    await reload()
    toast('Added to your account')
  })

  return wrap
}

function planBlock(state, plan, today) {
  const el = document.createElement('div')
  el.className = 'stack'
  const goal = plan.goal
  const goalInfo = raceInfo(goal)
  const toGoal = daysUntil(goal.date, today)
  const race = nextRace(plan, today)
  const week = plan.weeks.find(w => w.days.some(d => d.date === today))
  const day = plan.byDate[today]
  const upcoming = plan.days.filter(d => d.date > today).slice(0, 3)
  const weekDays = week ? week.days : []
  const entry = state.journal[today]
  const sessions = day ? day.sessions : []
  const logged = day ? sessions.filter(s => loggedFeel(entry, day, s)).length : 0

  const countdown = toGoal > 0
    ? `<span class="countdown-num">${toGoal}</span><span class="countdown-unit">${toGoal === 1 ? 'day' : 'days'} to ${/nationals/i.test(goal.dayType) ? 'Nationals' : esc(goalInfo.name)}</span>`
    : toGoal === 0
      ? `<span class="countdown-num">Race day</span><span class="countdown-unit">${esc(goalInfo.name)}</span>`
      : `<span class="countdown-num">Done</span><span class="countdown-unit">${esc(goalInfo.name)} is behind you</span>`

  el.innerHTML = `
    <section class="countdown" aria-label="Countdown">
      <div class="countdown-main">
        <h2 class="countdown-head">${countdown}</h2>
        <p class="countdown-sub">${esc(goalInfo.name)}${goalInfo.place ? `, ${esc(goalInfo.place)}` : ''}. ${formatDate(goal.date, { weekday: 'long', month: 'long', day: 'numeric' })}.</p>
      </div>
      <dl class="countdown-facts">
        ${week ? `<div><dt>Week</dt><dd>${weekLabel(week, plan)}</dd></div>` : ''}
        ${week ? `<div><dt>Phase</dt><dd>${esc(week.phase)}</dd></div>` : ''}
        ${race && race.day !== goal ? `<div><dt>Next race</dt><dd>${esc(race.name)}, ${daysUntil(race.day.date, today) === 0 ? 'today' : daysUntil(race.day.date, today) === 1 ? 'tomorrow' : `in ${daysUntil(race.day.date, today)} days`}</dd></div>` : ''}
      </dl>
      ${seasonProfileHtml(plan, { labels: false })}
    </section>

    <div class="today-grid">
      <section class="section" aria-labelledby="session-h">
        <div class="section-head">
          <h2 id="session-h">${sessions.length > 1 ? "Today's sessions" : "Today's session"}</h2>
          ${sessions.length > 1 && logged ? `<span class="faint small">${logged} of ${sessions.length} logged</span>` : ''}
        </div>
        ${day ? dayHtml(day, { entry }) : `
          <div class="card empty">
            <p>${today < plan.start ? `Your plan starts ${formatDate(plan.start, { weekday: 'long', month: 'long', day: 'numeric' })}.` : 'Your plan has finished.'}</p>
            <p>${today < plan.start ? 'Ride how you like until then.' : 'Load a new plan from the Plan page when you have one.'}</p>
          </div>`}
      </section>

      <aside class="section" aria-labelledby="next-h">
        <div class="section-head"><h2 id="next-h">Coming up</h2></div>
        <ul class="upnext">
          ${upcoming.map(d => `
            <li>
              <button class="upnext-item" data-date="${d.date}" style="--kind:${kindById(d.kind).color}">
                <span class="upnext-date">${formatDate(d.date, { weekday: 'short' })}<b>${formatDate(d.date, { day: 'numeric' })}</b></span>
                <span class="upnext-body">
                  ${kindChip(d)}
                  <span class="upnext-title">${esc(sessionTitles(d))}</span>
                  ${plannedHours(d) || d.sessions.length > 1 ? `<span class="upnext-meta faint small">${[plannedHours(d) && formatHours(plannedHours(d)), d.sessions.length > 1 && `${d.sessions.length} sessions`].filter(Boolean).join(', ')}</span>` : ''}
                </span>
              </button>
            </li>`).join('') || `<li class="muted small">Nothing after today.</li>`}
        </ul>
      </aside>
    </div>

    ${week ? `
      <section class="section" aria-labelledby="week-h">
        <div class="section-head">
          <h2 id="week-h">This week</h2>
          <span class="faint small">${esc(week.type || week.phase)}, ${formatHours(week.hours)} planned</span>
        </div>
        <ol class="week-row">
          ${weekDays.map(d => `
            <li>
              <button class="week-cell ${d.date === today ? 'is-today' : ''} ${d.date < today ? 'is-past' : ''}" data-date="${d.date}" style="--kind:${kindById(d.kind).color}"
                aria-label="${formatDate(d.date, { weekday: 'long' })}: ${esc(d.dayType)}, ${formatHours(plannedHours(d))}${esc(sessionsLabel(d))}${state.journal[d.date] ? ', journal written' : ''}">
                <span class="week-cell-day">${formatDate(d.date, { weekday: 'short' })}</span>
                <span class="week-cell-bar" style="--h:${Math.max(6, (plannedHours(d) / 6) * 100)}%"></span>
                <span class="week-cell-hrs tabular">${plannedHours(d) ? formatHours(plannedHours(d)) : 'Off'}</span>
                <span class="week-cell-type">${esc(kindById(d.kind).label)}</span>
                ${sessionPips(d)}
                ${state.journal[d.date] ? '<span class="week-cell-dot" aria-hidden="true"></span>' : ''}
              </button>
            </li>`).join('')}
        </ol>
        ${week.notes ? `<p class="week-note small muted">${esc(week.notes)}</p>` : ''}
      </section>` : ''}
  `

  el.addEventListener('click', e => {
    const btn = e.target.closest('[data-date]')
    if (btn) openDayModal(state, btn.dataset.date)
  })
  return el
}

export function weekLabel(week, plan) {
  const lastNum = [...plan.weeks].reverse().map(w => parseInt(w.label, 10)).find(n => !isNaN(n))
  const n = parseInt(week.label, 10)
  if (/bridge/i.test(week.label)) return 'Bridge week'
  return isNaN(n) ? esc(week.label) : `${n} of ${lastNum}`
}
