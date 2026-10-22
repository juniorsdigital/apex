// AI coach prompt — turns the days a rider highlights on the calendar into a
// self-contained prompt they can paste into Claude, ChatGPT or any assistant.
// Nothing is sent anywhere from here; the rider copies it themselves.
import { rideType, rideLoad, estimatedTss, acwrOn, acwrStatus, isDone, weeklySummary, RPE_LABELS } from './metrics.js'
import { dateKey, parseKey, addDays, formatDate, formatDuration } from './util.js'

export const COACH_FOCUSES = [
  {
    id: 'review',
    label: 'Review these rides',
    ask: `Analyse the highlighted days. Tell me what the sessions achieved physiologically, whether the intensity
matched the ride type I logged, and anything in the numbers or my notes that stands out (pacing, heart rate
versus power, effort versus how I felt).`
  },
  {
    id: 'plan',
    label: 'Plan the next week',
    ask: `Using the highlighted days and my recent training, plan my next 7 days. Give each day a session with
duration, ride type and target intensity (as % of FTP and RPE), and say why the week is shaped that way.`
  },
  {
    id: 'fatigue',
    label: 'Check fatigue',
    ask: `Look at my load, readiness check-ins and notes across the highlighted days. Tell me whether I'm absorbing
the training, building fatigue or under-training, and what I should change in the next few days.`
  },
  {
    id: 'goal',
    label: 'Am I on track?',
    ask: `Judge whether this block of training is moving me toward my goal event. Point out the biggest gap
between what I'm doing and what the event will demand, and the one change that would help most.`
  }
]

/**
 * @param {Object} opts
 * @param {Object} opts.state        app state (profile, rides, readiness)
 * @param {string[]} opts.dates      selected YYYY-MM-DD keys
 * @param {string} opts.focus        COACH_FOCUSES id
 * @param {string} [opts.question]   rider's own extra question
 */
export function buildCoachPrompt({ state, dates, focus, question = '' }) {
  const days = [...dates].sort()
  if (!days.length) return ''
  const p = state.profile || {}
  const ftp = Number(p.ftp_watts) || null
  const first = days[0]
  const last = days[days.length - 1]
  const f = COACH_FOCUSES.find(x => x.id === focus) || COACH_FOCUSES[0]
  const lines = []

  lines.push(`You are an experienced cycling coach. I keep a training log and want your help with the days I've highlighted below.`)
  lines.push('')
  lines.push(`## What I want`)
  lines.push(f.ask.replace(/\n/g, ' '))
  if (question.trim()) lines.push('', `My own question: ${question.trim()}`)

  lines.push('', `## About me`)
  const about = [
    p.full_name && `Name: ${p.full_name}`,
    ftp && `FTP: ${ftp} W${p.weight_kg ? ` (${(ftp / p.weight_kg).toFixed(2)} W/kg)` : ''}`,
    p.weight_kg && `Weight: ${p.weight_kg} kg`,
    p.max_hr && `Max heart rate: ${p.max_hr} bpm`,
    p.goal_event && `Goal event: ${p.goal_event}${p.goal_date ? ` on ${formatDate(p.goal_date, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })} (${daysBetween(dateKey(), p.goal_date)} days from today)` : ''}`
  ].filter(Boolean)
  lines.push(...(about.length ? about.map(a => `- ${a}`) : ['- No profile details recorded.']))
  lines.push(`- Today is ${formatDate(dateKey(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`)

  lines.push('', `## Highlighted days (${days.length}, ${formatDate(first)} to ${formatDate(last)})`)
  for (const d of days) {
    const rides = state.rides.filter(r => r.ride_date === d)
    const rd = state.readiness?.[d]
    lines.push('', `### ${formatDate(d, { weekday: 'long', month: 'short', day: 'numeric' })}`)
    if (rd && (rd.sleep || rd.energy || rd.soreness)) {
      lines.push(`Check-in (1 = rough, 5 = great): sleep ${rd.sleep ?? '?'}, energy ${rd.energy ?? '?'}, legs ${rd.soreness ?? '?'}`)
    }
    if (!rides.length) lines.push('Rest day, nothing logged.')
    for (const r of rides) lines.push(describeRide(r, ftp))
  }

  lines.push('', `## Context: the 4 weeks before ${formatDate(first)}`)
  // Only rides before the selection, or the last week would overlap it.
  const ctxEnd = addDays(parseKey(first), -1)
  const before = state.rides.filter(r => r.ride_date < first)
  const weeks = weeklySummary(before, 4, ctxEnd)
  for (const w of weeks) {
    lines.push(`- Week of ${w.label}: ${w.count} rides, ${formatDuration(w.minutes)}, ${Math.round(w.km)} km, ${Math.round(w.elevation)} m climbing, load ${w.load}`)
  }
  const acwr = acwrOn(state.rides, parseKey(last))
  lines.push(`- Acute:chronic workload ratio on ${formatDate(last)}: ${acwr ?? 'not enough data'}${acwr !== null ? ` (${acwrStatus(acwr).label.toLowerCase()})` : ''}`)

  const ahead = state.rides.filter(r => r.status === 'planned' && r.ride_date > dateKey() && r.ride_date <= dateKey(addDays(new Date(), 14)))
  if (ahead.length) {
    lines.push('', `## Already planned (next 14 days)`)
    for (const r of ahead) {
      const details = [r.title && rideType(r.ride_type).label, r.duration_min && formatDuration(r.duration_min)].filter(Boolean)
      lines.push(`- ${formatDate(r.ride_date)}: ${r.title || rideType(r.ride_type).label}${details.length ? ` (${details.join(', ')})` : ''}`)
    }
  }

  lines.push('', `## How the numbers are calculated`)
  lines.push(`- Load = session RPE (1 to 10) × minutes, counted for completed rides only.`)
  lines.push(`- Est. TSS uses average power, not normalized power, so it reads low on variable rides.`)
  lines.push(`- ACWR = last 7 days' load ÷ (last 28 days' load ÷ 4); 0.8 to 1.3 is the usual target.`)

  lines.push('', `## How to answer`)
  lines.push(`Start with a two-sentence verdict. Then give specifics tied to the dates above. Finish with concrete next steps. If something important is missing from my data, say what and why it matters instead of guessing.`)

  return lines.join('\n')
}

function describeRide(r, ftp) {
  const type = rideType(r.ride_type).label
  const parts = [
    r.duration_min && formatDuration(r.duration_min),
    r.distance_km && `${Number(r.distance_km)} km`,
    r.elevation_m && `${r.elevation_m} m climbing`,
    r.avg_power_w && `avg ${r.avg_power_w} W${ftp ? ` (${Math.round((r.avg_power_w / ftp) * 100)}% FTP)` : ''}`,
    r.avg_hr && `avg HR ${r.avg_hr} bpm`,
    r.rpe && `RPE ${r.rpe} (${RPE_LABELS[r.rpe].toLowerCase()})`
  ].filter(Boolean)
  const tss = isDone(r) ? estimatedTss(r, ftp) : null
  const load = rideLoad(r)
  if (load) parts.push(`load ${load}`)
  if (tss !== null) parts.push(`est. TSS ${tss}`)
  const status = { completed: 'done', planned: 'planned, not ridden', skipped: 'skipped' }[r.status]
  let s = `- ${r.title ? `"${r.title}" ` : ''}[${type}, ${status}]${parts.length ? ': ' + parts.join(', ') : ''}`
  if (r.notes) s += `\n  Notes: ${r.notes.replace(/\s*\n\s*/g, ' / ')}`
  return s
}

function daysBetween(a, b) {
  return Math.round((parseKey(b) - parseKey(a)) / 86400000)
}
