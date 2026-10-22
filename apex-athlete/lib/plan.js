// Training plan: parse the plan CSV (one row per day) into something the views
// can use: days by date, weeks, phases and key dates like races and tests.
import { dateKey, parseKey } from './util.js'

// Columns the plan needs. Anything else in the file is ignored.
const REQUIRED = ['Date', 'Workout']

// What kind of day it is, by Day_Type. First match wins, so order matters.
export const KINDS = [
  { id: 'rest',      label: 'Rest',       color: 'var(--kind-rest)',      test: /^(rest|off)\b/i },
  { id: 'race',      label: 'Race',       color: 'var(--kind-race)',      test: /^race$|nationals|e-fondo|gran fondo/i },
  { id: 'test',      label: 'Test',       color: 'var(--kind-test)',      test: /ftp test/i },
  { id: 'rehearsal', label: 'Rehearsal',  color: 'var(--kind-rehearsal)', test: /rehearsal|race-pace|durability test/i },
  { id: 'easy',      label: 'Easy',       color: 'var(--kind-easy)',      test: /travel|shakeout|pre-ride|preview|^easy|^recovery/i },
  { id: 'hard',      label: 'Intervals',  color: 'var(--kind-hard)',      test: /hit|shock|sprint|opener|bonus/i },
  { id: 'threshold', label: 'Threshold',  color: 'var(--kind-threshold)', test: /threshold|sweet spot|moderate/i },
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

/**
 * @param {string} text  the plan CSV
 * @returns {{ days, byDate, weeks, phases, keyDates, goal, start, end } | { error }}
 */
export function parsePlan(text) {
  if (!text || !text.trim()) return { error: 'The file is empty.' }
  const { keys, rows } = parseCsv(text)
  const missing = REQUIRED.filter(k => !keys.includes(k))
  if (missing.length) return { error: `This doesn't look like a plan file: it has no ${missing.join(' or ')} column.` }

  const days = rows
    .filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.Date))
    .map(r => {
      const kind = kindOf(r.Day_Type)
      return {
        date: r.Date,
        week: r.Week || '',
        weekStart: r.Week_Start || '',
        phase: r.Phase || 'Plan',
        weekType: r.Week_Type || '',
        dayType: r.Day_Type || kind.label,
        kind: kind.id,
        workout: r.Workout,
        title: shortTitle(r.Workout),
        venue: dash(r.Venue),
        hoursOutdoor: num(r.Hrs_Outdoor),
        hoursIndoor: num(r.Hrs_Indoor),
        intensity: dash(r.Intensity),
        fueling: dash(r.Fueling),
        strength: dash(r.Strength),
        planB: dash(r.Alt_If_Recovery_Lacking).replace(/^if recovery is lacking:\s*/i, ''),
        indoorPlan: dash(r.Bad_Weather_Indoor_Plan),
        coach: coachSections(r.Coach_Comments),
        notes: dash(r.Notes)
      }
    })
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

  const keyDates = days.filter(d => d.kind === 'race' || d.kind === 'test' || /full-distance|durability test/i.test(d.dayType))
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
  const name = head.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  return { name: titleCase(name) + (optional ? ' (optional)' : ''), place: place.trim() }
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
