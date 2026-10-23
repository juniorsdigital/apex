// Daily journal: body check-in, how each workout felt, headspace for the next race.
// On days with more than one session, each session gets its own feel and note.
import { renderApp, saveJournal } from '../app.js'
import { raceInfo, daysUntil, kindById } from '../lib/plan.js'
import { esc, dateKey, toast, friendlyError } from '../lib/util.js'

export const BODY = [
  { id: 'sleep',    label: 'Sleep',  icon: 'moon',     low: 'Poor', high: 'Great' },
  { id: 'energy',   label: 'Energy', icon: 'zap',      low: 'Flat', high: 'Fresh' },
  { id: 'soreness', label: 'Legs',   icon: 'activity', low: 'Sore', high: 'Fresh' }
]
export const WORKOUT_FEEL = ['Awful', 'Rough', 'OK', 'Good', 'Flying']
export const HEADSPACE = ['Dreading it', 'Uneasy', 'Steady', 'Confident', 'Fired up']

/** The next race on or after `date`, with a friendly name. */
export function nextRace(plan, date = dateKey()) {
  const day = plan?.days.find(d => d.kind === 'race' && d.date >= date)
  return day ? { day, ...raceInfo(day) } : null
}

let formCount = 0

export function renderJournalForm(state, date) {
  const id = `jf${++formCount}`
  const entry = state.journal[date] || {}
  const body = state.readiness[date] || {}
  const race = nextRace(state.plan, date)
  const isToday = date === dateKey()
  const sessions = state.plan?.byDate[date]?.sessions || []
  const multi = sessions.length > 1
  // Entries written before a day had separate sessions count for the first one.
  const logs = entry.sessions || (entry.workout_feel || entry.workout_note
    ? { s1: { feel: entry.workout_feel, note: entry.workout_note } } : {})

  const scale = (name, labels, value) => `
    <div class="feel-scale" role="radiogroup" aria-labelledby="${id}-${name}-label">
      ${labels.map((label, i) => `
        <label class="feel-pick"><input type="radio" name="${name}" value="${i + 1}" ${Number(value) === i + 1 ? 'checked' : ''}><span>${label}</span></label>
      `).join('')}
    </div>`

  const form = document.createElement('form')
  form.className = 'journal-form'
  form.noValidate = true
  form.innerHTML = `
    <fieldset class="journal-block">
      <legend id="${id}-body-label">${isToday ? 'How is the body today?' : 'How was the body?'}</legend>
      <div class="stack-sm">
        ${BODY.map(m => `
          <div class="readiness-row">
            <span class="readiness-label" id="${id}-rd-${m.id}"><i data-lucide="${m.icon}" class="icon-xs" aria-hidden="true"></i> ${m.label}</span>
            <div class="readiness-scale" role="radiogroup" aria-labelledby="${id}-rd-${m.id}">
              ${[1, 2, 3, 4, 5].map(n => `
                <label class="readiness-pick ${body[m.id] >= n ? 'on' : ''}">
                  <input type="radio" name="${m.id}" value="${n}" ${body[m.id] === n ? 'checked' : ''}
                    aria-label="${n} of 5${n === 1 ? ', ' + m.low : n === 5 ? ', ' + m.high : ''}">
                  <span aria-hidden="true">${n}</span>
                </label>`).join('')}
            </div>
          </div>`).join('')}
        <div class="row-between faint small"><span>1 = rough</span><span>5 = great</span></div>
      </div>
    </fieldset>

    ${multi ? `
      <fieldset class="journal-block">
        <legend>How did the workouts feel? <span class="faint">(${sessions.length} sessions)</span></legend>
        <div class="session-logs">
          ${sessions.map(s => `
            <div class="session-log" style="--kind:${kindById(s.kind).color}">
              <p class="session-log-head" id="${id}-feel_${s.id}-label">
                <span class="session-step" aria-hidden="true">${s.n}</span>
                <b>${esc(s.label)}</b><span class="faint">${esc(s.title)}</span>
              </p>
              ${scale(`feel_${s.id}`, WORKOUT_FEEL, logs[s.id]?.feel)}
              <label class="visually-hidden" for="${id}-n-${s.id}">${esc(s.label)} notes</label>
              <textarea class="input" id="${id}-n-${s.id}" name="note_${s.id}" rows="2" placeholder="${s.kind === 'strength' ? 'Loads, reps in reserve, anything that niggled' : "Legs, pacing, fueling, what clicked or didn't"}">${esc(logs[s.id]?.note || '')}</textarea>
            </div>`).join('')}
        </div>
      </fieldset>` : `
      <fieldset class="journal-block">
        <legend id="${id}-workout_feel-label">How did the workout feel?</legend>
        ${scale('workout_feel', WORKOUT_FEEL, entry.workout_feel)}
        <label class="visually-hidden" for="${id}-wn">Workout notes</label>
        <textarea class="input" id="${id}-wn" name="workout_note" rows="2" placeholder="Legs, pacing, fueling, what clicked or didn't">${esc(entry.workout_note || '')}</textarea>
      </fieldset>`}

    <fieldset class="journal-block">
      <legend id="${id}-headspace-label">${race
        ? `Headspace for ${esc(race.name)} <span class="faint">(${daysUntil(race.day.date, date)} days out)</span>`
        : 'Headspace'}</legend>
      ${scale('headspace', HEADSPACE, entry.headspace)}
      <label class="visually-hidden" for="${id}-hn">Headspace notes</label>
      <textarea class="input" id="${id}-hn" name="headspace_note" rows="2" placeholder="Nerves, goals, what you're picturing on race day">${esc(entry.headspace_note || '')}</textarea>
    </fieldset>

    <div>
      <label class="label" for="${id}-note">Anything else <span class="faint">(optional)</span></label>
      <textarea class="input" id="${id}-note" name="note" rows="2" placeholder="Sleep, work, food, life">${esc(entry.note || '')}</textarea>
    </div>

    <div class="row-between">
      <span class="inline-status" role="status"></span>
      <button type="submit" class="btn btn-primary">Save entry</button>
    </div>
  `

  // Body picks light up everything up to the chosen value.
  form.querySelectorAll('.readiness-pick input').forEach(input => input.addEventListener('change', () => {
    form.querySelectorAll(`input[name="${input.name}"]`).forEach(i =>
      i.parentElement.classList.toggle('on', Number(i.value) <= Number(input.value)))
  }))

  form.addEventListener('submit', async e => {
    e.preventDefault()
    const fd = new FormData(form)
    const n = k => (fd.get(k) ? Number(fd.get(k)) : null)
    const t = k => fd.get(k).trim() || null
    const bodyValues = Object.fromEntries(BODY.map(m => [m.id, n(m.id)]))
    const journal = {
      ...(multi ? sessionLogs(sessions, n, t) : { workout_feel: n('workout_feel'), workout_note: t('workout_note'), sessions: null }),
      headspace: n('headspace'), headspace_note: t('headspace_note'), note: t('note')
    }
    const btn = form.querySelector('[type="submit"]')
    const status = form.querySelector('.inline-status')
    btn.disabled = true
    btn.textContent = 'Saving…'

    let error = null
    if (Object.values(bodyValues).some(Boolean)) {
      ({ error } = await state.store.saveReadiness(date, bodyValues))
      if (!error) state.readiness[date] = bodyValues
    }
    if (!error) ({ error } = await saveJournal(date, journal))

    btn.disabled = false
    btn.textContent = 'Save entry'
    if (error) {
      status.className = 'inline-status is-error'
      status.textContent = friendlyError(error, 'save your entry')
      return
    }
    status.className = 'inline-status is-success'
    status.textContent = 'Saved'
    toast('Journal entry saved')
    form.dispatchEvent(new CustomEvent('journal-saved', { bubbles: true, detail: { date } }))
    // Refresh the page underneath (calendar dots, journal list) but not this form.
    if (!form.closest('.modal')) return
    renderApp()
  })

  return form
}

// Per-session feel and notes, plus a day-level summary in workout_feel (the
// average, for the trend line) and workout_note (each note under its label).
function sessionLogs(sessions, n, t) {
  const logs = {}
  for (const s of sessions) {
    const feel = n(`feel_${s.id}`), note = t(`note_${s.id}`)
    if (feel || note) logs[s.id] = { feel, note, title: s.title, label: s.label }
  }
  const list = Object.values(logs)
  const feels = list.map(l => l.feel).filter(Boolean)
  const notes = list.filter(l => l.note).map(l => `${l.label}: ${l.note}`)
  return {
    workout_feel: feels.length ? Math.round(feels.reduce((a, f) => a + f, 0) / feels.length) : null,
    workout_note: notes.length ? notes.join('\n') : null,
    sessions: list.length ? logs : null
  }
}
