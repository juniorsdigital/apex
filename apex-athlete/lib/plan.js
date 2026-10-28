// Training plan: parse the plan CSV (a row per day, or per session on days with
// more than one) into something the views can use: days by date, each with its
// sessions in order, weeks, phases and key dates like races and tests.
import { dateKey, parseKey } from './util.js'

// Columns the plan needs. Anything else in the file is ignored.
const REQUIRED = ['Date', 'Workout']

// What kind of day it is, by Day_Type. First match wins, so order matters.
export const KINDS = [
  { id: 'rest',      label: 'Rest',       color: 'var(--kind-rest)',      test: /^(rest|off)\b/i },
  { id: 'race',      label: 'Race',       color: 'var(--kind-race)',      test: /^race$|nationals|e-fondo|gran fondo/i },
  { id: 'test',      label: 'Test',       color: 'var(--kind-test)',      test: /ftp test/i },
  { id: 'rehearsal', label: 'Rehearsal',  color: 'var(--kind-rehearsal)', test: /rehearsal|race-pace|durability test|fuel sim|\d+\s*mi sim/i },
  { id: 'easy',      label: 'Easy',       color: 'var(--kind-easy)',      test: /travel|shakeout|pre-ride|preview|^easy|^recovery/i },
  { id: 'hard',      label: 'Intervals',  color: 'var(--kind-hard)',      test: /hit|shock|sprint|opener|bonus|^30\d\d\b|vo2/i },
  { id: 'threshold', label: 'Threshold',  color: 'var(--kind-threshold)', test: /threshold|sweet spot|moderate|^z[34]\b|^ss\b/i },
  { id: 'strength',  label: 'Strength',   color: 'var(--kind-strength)',  test: /strength|lift|gym|weights/i },
  { id: 'endurance', label: 'Endurance',  color: 'var(--kind-endurance)', test: /./ }
]

export function kindOf(dayType) {
  return KINDS.find(k => k.test.test(dayType || '')) || KINDS[KINDS.length - 1]
}

export function kindById(id) {
  return KINDS.find(k => k.id === id) || KINDS[KINDS.length - 1]
}

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const [head = [], ...body] = rows.filter(r => r.some(v => v.trim() !== ''))
  const keys = head.map(h => h.trim())
  return { keys, rows: body.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()]))) }
}

const dash = v => (v && v !== '-' ? v : '')
const num = v => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v))

// "WHAT: ... | FOCUS: ..." → [{ label: 'What', text }]
function coachSections(text) {
  if (!text) return []
  return text.split(/\s+\|\s+/).map(part => {
    const m = part.match(/^([A-Z][A-Z '&/-]{1,30}):\s*(.*)$/s)
    if (!m) return { label: '', text: part }
    const label = m[1].toLowerCase().replace(/^./, c => c.toUpperCase())
    return { label, text: m[2] }
  })
}

// "Build 3/3 (E-Fondo #3)" → "E-Fondo #3"; short label for the race/test.
function shortTitle(workout) {
  const head = workout.split(/\s+-\s+|[:.(]/)[0].trim()
  return head.length > 60 ? head.slice(0, 57) + '…' : head
}

// A short Day_Type ("3015 x3", "Z2 3h", "Lift A") is the session's name; a long
// one is a category, so the name comes from the head of the workout instead.
const nameOf = r => (r.Day_Type && r.Day_Type.length <= 32 ? r.Day_Type : shortTitle(r.Workout))

// A day can hold more than one session. They come from rows that share a
// date (in file order), or from inside one row: a lift in the Strength column
// ("LIFT A - Lower (about 50 min, AFTER the bike): ...") is its own session, and
// a workout written in parts ("Part 1 ... Part 2 ...", "AM: ... PM: ...") is
// one session per part.
const LIFT = /^(deload\s+)?lift\b|^(strength|gym|weights)\b/i
const PART = /\b(Part|Session)\s*(\d+)\b\s*[:.\-–]?\s*|(?:^|[\s.;|])(AM|PM)\s*:\s*/gi
// Which session gives the day its colour: the hardest kind wins.
const PRIORITY = ['race', 'test', 'rehearsal', 'hard', 'threshold', 'endurance', 'easy', 'strength', 'rest']

const cap = s => s.replace(/^./, c => c.toUpperCase())
// "LIFT A - HEAVY lower" → "Lift A - Heavy lower"; single letters stay.
const tidyCaps = s => s.replace(/\b([A-Z])([A-Z]{2,})\b/g, (_, a, b) => a + b.toLowerCase()).trim()
const durationIn = s => (s.match(/\b\d+(?:\s*[-–]\s*\d+)?\s*(?:min|h)\b/i) || [''])[0]

function blankSession() {
  return {
    id: '', n: 0, label: '', time: '', kind: 'endurance', dayType: '', title: '', workout: '',
    duration: '', hoursOutdoor: null, hoursIndoor: null, venue: '', intensity: '', fueling: '',
    extra: [], planB: '', indoorPlan: '', coach: [], gapBefore: '', shared: null
  }
}

// "LIFT A - Lower (about 50 min, AFTER the bike, >=4 h later): squat 3x8; ..."
function liftSession(text, coach) {
  const m = text.match(/^([^(:]+?)\s*(?:\(([^)]*)\))?\s*:\s*(.+)$/s)
  const bits = (m?.[2] || '').split(/,\s*/).filter(Boolean)
  const dur = bits.find(b => durationIn(b))
  const timing = bits.filter(b => b !== dur).map(b => tidyCaps(b).replace(/>=\s*/g, '≥')).join(', ')
  return {
    ...blankSession(), label: 'Strength', kind: 'strength', dayType: 'Strength',
    title: tidyCaps(m ? m[1] : shortTitle(text)), workout: m ? cap(m[3]) : text,
    duration: dur ? cap(dur) : '', gapBefore: timing ? cap(timing) : '', coach
  }
}

/** "Part 1 X, then Y, Part 2 Z" → [{ label: 'Part 1', text: 'X, then Y' }, ...], or null. */
export function splitParts(text) {
  const marks = [...text.matchAll(PART)]
  if (marks.length < 2) return null
  const labels = marks.map(m => (m[3] ? m[3].toUpperCase() : `${cap(m[1].toLowerCase())} ${m[2]}`))
  if (new Set(labels).size !== labels.length || (marks[0][2] && marks[0][2] !== '1')) return null
  return marks.map((m, i) => ({
    label: labels[i],
    text: text.slice(m.index + m[0].length, marks[i + 1]?.index ?? text.length).trim().replace(/[,;]$/, '')
  }))
}

// "FASTED: ... | Part 2: ..." → one fueling note per part.
function fuelingByPart(text, labels) {
  const out = labels.map(() => [])
  let at = 0
  for (const seg of text ? text.split(/\s+\|\s+/) : []) {
    const i = labels.findIndex(l => seg.toLowerCase().startsWith(l.toLowerCase() + ':'))
    if (i >= 0) at = i
    out[at].push(i >= 0 ? seg.slice(labels[i].length + 1).trim() : seg)
  }
  return out.map(p => p.join(' '))
}

function rowSessions(r) {
  const kind = kindOf(r.Day_Type)
  const s = {
    ...blankSession(),
    label: isNaN(Number(r.Session)) ? r.Session || '' : '', time: r.Time || '',
    kind: kind.id, dayType: r.Day_Type || kind.label, workout: r.Workout, title: nameOf(r),
    venue: dash(r.Venue), hoursOutdoor: num(r.Hrs_Outdoor), hoursIndoor: num(r.Hrs_Indoor),
    intensity: dash(r.Intensity), fueling: dash(r.Fueling),
    planB: dash(r.Alt_If_Recovery_Lacking).replace(/^if recovery is lacking:\s*/i, ''),
    indoorPlan: dash(r.Bad_Weather_Indoor_Plan), coach: coachSections(r.Coach_Comments)
  }

  const strength = dash(r.Strength)
  let lift = null
  if (strength && LIFT.test(strength)) {
    const isLift = c => /lift|strength|gym/i.test(c.label)
    lift = liftSession(strength, s.coach.filter(isLift))
    s.coach = s.coach.filter(c => !isLift(c))
  } else if (strength) s.extra.push(['Strength', strength])

  let out = [s]
  const parts = splitParts(r.Workout)
  if (parts) {
    const fueling = fuelingByPart(s.fueling, parts.map(p => p.label))
    let gap = ''
    out = parts.map((p, i) => {
      let workout = p.text
      const gapBefore = gap
      gap = ''
      // "..., then ride home and eat breakfast and rest 60-90 min" is the break before the next part.
      const then = i < parts.length - 1 && workout.match(/^(.*?),?\s+then\s+(.+)$/s)
      if (then) [workout, gap] = [then[1], cap(then[2])]
      const lead = (workout.match(/^[A-Z][A-Z0-9+/]+(?:\s+[A-Z][A-Z0-9+/]*)*\b/) || [''])[0]
      const title = lead.length > 2 ? tidyCaps(lead) : shortTitle(workout)
      return {
        ...s, label: p.label, dayType: title, title, workout: cap(workout.replace(/[.,;]?$/, '.')),
        duration: cap(durationIn(workout)), hoursOutdoor: null, hoursIndoor: null,
        fueling: fueling[i], extra: [], planB: '', indoorPlan: '', coach: [], gapBefore
      }
    })
    // Plan B, bad weather and coach notes cover every part, so they follow the last one.
    out[out.length - 1].shared = { parts: out.length, planB: s.planB, indoorPlan: s.indoorPlan, coach: s.coach, extra: s.extra }
  }

  if (!lift) return out
  return /before/i.test(lift.gapBefore) && !/after/i.test(lift.gapBefore) ? [lift, ...out] : [...out, lift]
}

function sumOrNull(values) {
  const known = values.filter(v => v != null)
  return known.length ? known.reduce((a, v) => a + v, 0) : null
}

function buildDay(date, rows) {
  const first = rows[0]
  let sessions = rows.flatMap(rowSessions)
  // An OFF row next to real sessions isn't a session of its own.
  if (sessions.some(s => s.kind !== 'rest')) sessions = sessions.filter(s => s.kind !== 'rest')
  else sessions = sessions.slice(0, 1)
  const rides = sessions.filter(s => s.kind !== 'strength')
  sessions.forEach((s, i) => {
    s.id = `s${i + 1}`
    s.n = i + 1
    if (!s.label) s.label = s.kind === 'strength' ? 'Strength' : rides.length > 1 ? `Ride ${rides.indexOf(s) + 1}` : 'Ride'
  })
  const kind = PRIORITY.find(k => sessions.some(s => s.kind === k)) || sessions[0].kind
  const types = [...new Set(rows.map(r => r.Day_Type).filter(t => t && (kind === 'rest' || kindOf(t).id !== 'rest')))]
  return {
    date,
    week: first.Week || '',
    weekStart: first.Week_Start || '',
    phase: first.Phase || 'Plan',
    weekType: first.Week_Type || '',
    dayType: types.length ? types.join(' + ') : kindById(kind).label,
    kind,
    workout: first.Workout,
    title: nameOf(first),
    venue: dash(first.Venue),
    hoursOutdoor: sumOrNull(rows.map(r => num(r.Hrs_Outdoor))),
    hoursIndoor: sumOrNull(rows.map(r => num(r.Hrs_Indoor))),
    sessions,
    notes: rows.map(r => dash(r.Notes)).find(Boolean) || ''
  }
}

/**
 * @param {string} text  the plan CSV
 * @returns {{ days, byDate, weeks, phases, keyDates, goal, start, end } | { error }}
 */
export function parsePlan(text) {
  if (!text || !text.trim()) return { error: 'The file is empty.' }
  const { keys, rows } = parseCsv(text)
  const missing = REQUIRED.filter(k => !keys.includes(k))
  if (missing.length) return { error: `This doesn't look like a plan file: it has no ${missing.join(' or ')} column.` }

  const rowsByDate = new Map()
  for (const r of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.Date)) continue
    if (!rowsByDate.has(r.Date)) rowsByDate.set(r.Date, [])
    rowsByDate.get(r.Date).push(r)
  }
  // A numeric Session column orders a day's rows; otherwise file order.
  const order = r => (r.Session && !isNaN(Number(r.Session)) ? Number(r.Session) : Infinity)
  const days = [...rowsByDate]
    .map(([date, list]) => buildDay(date, list.map((r, i) => [r, i]).sort((a, b) => order(a[0]) - order(b[0]) || a[1] - b[1]).map(([r]) => r)))
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!days.length) return { error: 'No rows with a date like 2026-10-21 were found.' }

  const byDate = Object.fromEntries(days.map(d => [d.date, d]))

  // Weeks keep file order; the label is whatever the Week column says.
  const weeks = []
  for (const d of days) {
    const key = d.weekStart || d.week
    let w = weeks[weeks.length - 1]
    if (!w || w.key !== key) {
      w = { key, label: d.week, start: d.weekStart || d.date, phase: d.phase, type: d.weekType, days: [], hours: 0, notes: '' }
      weeks.push(w)
    }
    w.days.push(d)
    w.hours += d.hoursOutdoor ?? d.hoursIndoor ?? 0
    if (d.notes && !w.notes) w.notes = d.notes
  }

  const phases = []
  for (const w of weeks) {
    let p = phases[phases.length - 1]
    if (!p || p.name !== w.phase) {
      p = { name: w.phase, start: w.days[0].date, end: w.days[0].date, weeks: 0, hours: 0 }
      phases.push(p)
    }
    p.end = w.days[w.days.length - 1].date
    p.weeks++
    p.hours += w.hours
  }

  const keyDates = days.filter(d => d.kind === 'race' || d.kind === 'test' || /full-distance|durability test|\d+\s*mi sim/i.test(d.dayType))
  const goal = days.find(d => /nationals/i.test(d.dayType)) || [...days].reverse().find(d => d.kind === 'race') || days[days.length - 1]

  return { days, byDate, weeks, phases, keyDates, goal, start: days[0].date, end: days[days.length - 1].date }
}

// Best-effort race name and place from the workout text, e.g.
// "USA CYCLING GRAN FONDO NATIONAL CHAMPIONSHIPS - Gran Fondo Asheville, Asheville NC (~100 mi)"
//   → { name: 'USA Cycling Gran Fondo National Championships', place: 'Asheville NC' }
// "TOUR OF GEORGIA GRAN FONDO (Helen, GA) - Gran Route ~100 mi" → place 'Helen, GA'
export function raceInfo(day) {
  const first = day.workout.split(/\.\s/)[0]
  let [head, rest = ''] = first.split(/\s+-\s+/)
  // "OPTIONAL EVENT - Gran Fondo Florida (Pasco County, FL), Sun Mar 21..."
  const optional = /^(optional )?event$/i.test(head)
  if (optional) [head, rest] = [rest.split(',').slice(0, 2).join(','), rest]
  const inParens = (head.match(/\(([^)]+)\)/) || [])[1] || ''
  const place = /^[^;~]{2,30},[^;~]{1,10}$/.test(inParens) ? inParens
    : ((rest.match(/,\s*([^,(]+?)\s*(?:\(|$)/) || [])[1] || '')
  let name = titleCase(head.replace(/\s*\([^)]*\)\s*/g, ' ').trim())
  // Indoor races often have no name, only the workout ("WU 30 min @ 140-210 W
  // with ... · race 2 timed segments ..."). Name those from the day instead.
  if (looksLikeWorkout(name)) return { name: fallbackName(day) + (optional ? ' (optional)' : ''), place: '' }
  return { name: clip(name, 64) + (optional ? ' (optional)' : ''), place: clip(place.trim(), 40) }
}

const looksLikeWorkout = s => s.length > 64 || /@|·|\b\d+\s*(?:w|min|bpm|rpm)\b|\b\d+\s*[x×]\s*\d/i.test(s)
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

function fallbackName(day) {
  const title = day.title && !looksLikeWorkout(day.title) ? day.title : ''
  const type = day.dayType && !looksLikeWorkout(day.dayType) ? day.dayType : ''
  return clip(title || type || 'Race', 40)
}

/** Outdoor events worth a flag on the route (not the indoor E-Fondos). */
export function isEvent(day) {
  return day.kind === 'race' && (day.venue === 'Event' || /^race$|nationals|gran fondo/i.test(day.dayType))
}

function titleCase(s) {
  if (s !== s.toUpperCase()) return s
  return s.toLowerCase().replace(/\b(usa)\b/g, 'USA').replace(/(^|\s)\S/g, c => c.toUpperCase()).replace(/ (Of|The|And|A) /g, w => w.toLowerCase())
}

export function daysUntil(key, from = dateKey()) {
  return Math.round((parseKey(key) - parseKey(from)) / 86400000)
}

/** Planned hours for a day, outdoor figure first. */
export function plannedHours(day) {
  return day?.hoursOutdoor ?? day?.hoursIndoor ?? 0
}

export function formatHours(h) {
  if (!h) return '0 h'
  const whole = Math.floor(h)
  const min = Math.round((h - whole) * 60)
  return min ? (whole ? `${whole} h ${min}` : `${min} min`) : `${whole} h`
}
