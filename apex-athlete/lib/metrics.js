// Training metrics: session load, ACWR, weekly totals.
import { dateKey, addDays, startOfWeek } from './util.js'

export const RIDE_TYPES = [
  { id: 'endurance',  label: 'Endurance',   color: 'var(--chart-z2)' },
  { id: 'recovery',   label: 'Recovery',    color: 'var(--chart-z1)' },
  { id: 'tempo',      label: 'Tempo',       color: 'var(--chart-z3)' },
  { id: 'sweet_spot', label: 'Sweet spot',  color: 'var(--chart-z3)' },
  { id: 'threshold',  label: 'Threshold',   color: 'var(--chart-z4)' },
  { id: 'vo2max',     label: 'VO2 max',     color: 'var(--chart-z5)' },
  { id: 'sprint',     label: 'Sprints',     color: 'var(--chart-z6)' },
  { id: 'long',       label: 'Long ride',   color: 'var(--chart-z2)' },
  { id: 'race',       label: 'Race / event', color: 'var(--chart-z7)' },
  { id: 'other',      label: 'Other',       color: 'var(--color-text-muted)' }
]

export function rideType(id) {
  return RIDE_TYPES.find(t => t.id === id) || RIDE_TYPES[RIDE_TYPES.length - 1]
}

export const RPE_LABELS = {
  1: 'Very light', 2: 'Easy', 3: 'Moderate', 4: 'Somewhat hard', 5: 'Hard',
  6: 'Hard+', 7: 'Very hard', 8: 'Very hard+', 9: 'Near maximal', 10: 'Maximal'
}

export const isDone = r => r.status === 'completed'

/** Session load in AU — Foster sRPE × minutes. Only counts completed rides. */
export function rideLoad(ride) {
  if (!isDone(ride) || !ride.rpe || !ride.duration_min) return 0
  return ride.rpe * ride.duration_min
}

/** Rough TSS from average power (no normalized power available). */
export function estimatedTss(ride, ftp) {
  if (!ftp || !ride.avg_power_w || !ride.duration_min) return null
  const intensity = ride.avg_power_w / ftp
  return Math.round((ride.duration_min / 60) * intensity * intensity * 100)
}

function loadByDate(rides) {
  const map = {}
  for (const r of rides) map[r.ride_date] = (map[r.ride_date] || 0) + rideLoad(r)
  return map
}

/**
 * Acute:chronic workload ratio on a given day.
 * Acute = last 7 days' load; chronic = last 28 days' load / 4.
 */
export function acwrOn(rides, endDate = new Date(), map = loadByDate(rides)) {
  let acute = 0
  let chronic = 0
  for (let i = 0; i < 28; i++) {
    const load = map[dateKey(addDays(endDate, -i))] || 0
    chronic += load
    if (i < 7) acute += load
  }
  if (chronic === 0) return null
  return Math.round((acute / (chronic / 4)) * 100) / 100
}

export function acwrStatus(acwr) {
  if (acwr === null) return { label: 'Not enough data yet', color: 'var(--color-text-muted)' }
  if (acwr < 0.8) return { label: 'Detraining', color: 'var(--color-blue)' }
  if (acwr <= 1.3) return { label: 'Sweet spot', color: 'var(--color-success)' }
  if (acwr <= 1.5) return { label: 'Ramping fast', color: 'var(--color-gold)' }
  return { label: 'Overreaching risk', color: 'var(--color-error)' }
}

/** Monday-based weekly totals for the last `weeks` weeks, oldest first. */
export function weeklySummary(rides, weeks = 12, today = new Date()) {
  const thisWeek = startOfWeek(today)
  const map = loadByDate(rides)
  const out = []
  for (let w = weeks - 1; w >= 0; w--) {
    const start = addDays(thisWeek, -7 * w)
    const startKey = dateKey(start)
    const endKey = dateKey(addDays(start, 6))
    const inWeek = rides.filter(r => isDone(r) && r.ride_date >= startKey && r.ride_date <= endKey)
    out.push({
      start,
      label: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: inWeek.length,
      minutes: sum(inWeek, 'duration_min'),
      km: sum(inWeek, 'distance_km'),
      elevation: sum(inWeek, 'elevation_m'),
      load: inWeek.reduce((a, r) => a + rideLoad(r), 0),
      acwr: acwrOn(rides, addDays(start, 6) > today ? today : addDays(start, 6), map)
    })
  }
  return out
}

export function sum(rides, field) {
  return rides.reduce((a, r) => a + (Number(r[field]) || 0), 0)
}
