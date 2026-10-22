// Journal — every entry, newest first, with how feel and headspace have trended.
import { navigate } from '../app.js'
import { dateKey, parseKey, addDays, formatDate, esc } from '../lib/util.js'
import { kindChip, openDayModal } from './DaySession.js'
import { BODY, WORKOUT_FEEL, HEADSPACE } from './JournalForm.js'

export function renderJournal(state) {
  const dates = [...new Set([...Object.keys(state.journal), ...Object.keys(state.readiness)])].sort().reverse()
  const wrap = document.createElement('div')
  wrap.className = 'stack narrow-wide'

  wrap.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title" tabindex="-1">Journal</h1>
        <p class="page-sub">${dates.length ? `${dates.length} ${dates.length === 1 ? 'entry' : 'entries'}${streak(dates) > 1 ? `, ${streak(dates)} days in a row` : ''}` : 'How training feels, in your words'}</p>
      </div>
      <button class="btn btn-primary" id="write-today"><i data-lucide="notebook-pen" class="icon-sm" aria-hidden="true"></i> ${state.journal[dateKey()] ? "Edit today's entry" : "Write today's entry"}</button>
    </div>

    ${dates.length >= 3 ? `
      <section class="card" aria-labelledby="trend-h">
        <div class="section-head">
          <h2 id="trend-h">How it's trending</h2>
          <span class="legend faint small">
            <span><i class="legend-dot" style="background:var(--color-primary)"></i>Workout feel</span>
            <span><i class="legend-dot" style="background:var(--kind-rehearsal)"></i>Headspace</span>
            <span><i class="legend-dot" style="background:var(--kind-endurance)"></i>Body</span>
          </span>
        </div>
        ${trendSvg(state)}
      </section>` : ''}

    <div class="stack-sm" id="entries">
      ${dates.length ? dates.map(d => entryHtml(state, d)).join('') : `
        <div class="card empty">
          <p>No entries yet.</p>
          <p>A few lines a day adds up: how the session felt, how the body is, and where your head is for the next race.</p>
        </div>`}
    </div>
  `

  wrap.querySelector('#write-today').addEventListener('click', () => navigate('today'))
  wrap.querySelector('#entries').addEventListener('click', e => {
    const btn = e.target.closest('[data-date]')
    if (btn) openDayModal(state, btn.dataset.date)
  })
  return wrap
}

function entryHtml(state, date) {
  const j = state.journal[date] || {}
  const body = state.readiness[date] || {}
  const day = state.plan?.byDate[date]
  const bodyText = BODY.filter(m => body[m.id]).map(m => `${m.label} ${body[m.id]}`).join(', ')
  const row = (label, word, note) => (word || note) ? `
    <div class="entry-row">
      <dt>${label}</dt>
      <dd>${word ? `<span class="entry-word">${word}</span>` : ''}${note ? `<span class="entry-note">${esc(note)}</span>` : ''}</dd>
    </div>` : ''

  return `
    <article class="card entry">
      <header class="entry-head">
        <h2>${formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
        <button class="btn btn-ghost btn-sm" data-date="${date}" aria-label="Edit entry for ${formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}">Edit</button>
      </header>
      ${day ? `<p class="entry-plan">${kindChip(day)}${day.title.toLowerCase() !== day.dayType.toLowerCase() ? ` <span class="muted small">${esc(day.title)}</span>` : ''}</p>` : ''}
      <dl class="entry-rows">
        ${row('Body', bodyText, '')}
        ${row('Workout', WORKOUT_FEEL[j.workout_feel - 1], j.workout_note)}
        ${row('Headspace', HEADSPACE[j.headspace - 1], j.headspace_note)}
        ${row('Other', '', j.note)}
      </dl>
    </article>`
}

function streak(dates) {
  let n = 0
  for (let d = new Date(); dates.includes(dateKey(d)); d = addDays(d, -1)) n++
  return n
}

// Three lines on a 1–5 scale, one point per day that has a value.
function trendSvg(state) {
  const W = 700, H = 160, pad = 12
  // Start at the first entry in the last 8 weeks, but show at least 2 weeks.
  const recent = Object.keys({ ...state.journal, ...state.readiness }).filter(d => d >= dateKey(addDays(new Date(), -55))).sort()
  const span = Math.max(14, Math.min(56, recent.length ? Math.round((new Date() - parseKey(recent[0])) / 86400000) + 1 : 56))
  const days = Array.from({ length: span }, (_, i) => dateKey(addDays(new Date(), i - span + 1)))
  const x = i => pad + (i / (span - 1)) * (W - pad * 2)
  const y = v => H - pad - ((v - 1) / 4) * (H - pad * 2)
  const series = [
    { color: 'var(--color-primary)', value: d => state.journal[d]?.workout_feel },
    { color: 'var(--kind-rehearsal)', value: d => state.journal[d]?.headspace },
    { color: 'var(--kind-endurance)', value: d => {
      const b = state.readiness[d]
      const vals = b ? BODY.map(m => b[m.id]).filter(Boolean) : []
      return vals.length ? vals.reduce((a, c) => a + c, 0) / vals.length : null
    } }
  ]
  return `
    <svg class="trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="Workout feel, headspace and body ratings over the last 8 weeks, on a 1 to 5 scale">
      ${[1, 3, 5].map(v => `<line class="trend-grid" x1="${pad}" x2="${W - pad}" y1="${y(v)}" y2="${y(v)}"/>`).join('')}
      ${series.map(s => {
        const pts = days.map((d, i) => [s.value(d), i]).filter(([v]) => v).map(([v, i]) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
        return pts.length ? `
          <polyline class="trend-line" points="${pts.join(' ')}" style="stroke:${s.color}"/>
          ${pts.map(p => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="3.5" style="fill:${s.color}"/>`).join('')}` : ''
      }).join('')}
    </svg>
    <div class="row-between faint small"><span>${formatDate(days[0], { month: 'short', day: 'numeric' })}</span><span>Today</span></div>`
}
