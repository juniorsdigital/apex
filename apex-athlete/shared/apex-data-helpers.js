// Load calculation, ACWR, zone distribution helpers

/**
 * Calculate session load in AU using Foster sRPE × duration method
 * @param {number} rpe - Session RPE (1–10 Borg CR10)
 * @param {number} minutes - Session duration in minutes
 * @returns {number} Load in arbitrary units (AU)
 */
export function calcSessionLoad(rpe, minutes) {
  return rpe * minutes
}

/**
 * Compute ACWR from an array of daily loads (most recent = last element)
 * Acute = 7-day sum, Chronic = 28-day average weekly load
 * @param {number[]} dailyLoads - Array of daily AU values (min 28 items)
 * @returns {number} ACWR rounded to 2 decimal places
 */
export function calcACWR(dailyLoads) {
  if (dailyLoads.length < 28) return null
  const recent = dailyLoads.slice(-28)
  const acute = recent.slice(-7).reduce((a, b) => a + b, 0)
  const chronic = recent.reduce((a, b) => a + b, 0) / 4 // 28-day / 4 = weekly avg
  if (chronic === 0) return null
  return Math.round((acute / chronic) * 100) / 100
}

/**
 * Get ACWR status label and color token
 * Sweet spot: 0.80–1.30
 */
export function getACWRStatus(acwr) {
  if (acwr === null) return { label: 'Insufficient data', color: 'var(--color-text-muted)' }
  if (acwr < 0.80) return { label: 'Under-trained', color: 'var(--color-blue)' }
  if (acwr <= 1.30) return { label: 'Sweet spot', color: 'var(--color-success)' }
  if (acwr <= 1.50) return { label: 'Caution zone', color: 'var(--color-gold)' }
  return { label: 'High injury risk', color: 'var(--color-error)' }
}

/**
 * Aggregate workouts into weekly load totals (AU)
 * @param {Object[]} workouts - Array of workout objects with rpe, duration_minutes, workout_date
 * @param {number} weeks - Number of weeks to return (most recent first = last)
 * @returns {{ label: string, load: number }[]}
 */
export function buildWeeklyLoads(workouts, weeks = 12) {
  const map = {}
  for (const w of workouts) {
    if (!w.rpe || !w.duration_minutes) continue
    const d = new Date(w.workout_date)
    // ISO week key: YYYY-Www
    const week = getISOWeekKey(d)
    map[week] = (map[week] || 0) + calcSessionLoad(w.rpe, w.duration_minutes)
  }
  const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  return sorted.slice(-weeks).map(([label, load]) => ({ label, load: Math.round(load) }))
}

function getISOWeekKey(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

/**
 * Build zone distribution as % of total load
 * Zones Z1–Z7 based on % of max HR thresholds
 * @param {Object[]} workouts - workouts with heart_rate_zone and duration_minutes and rpe
 * @returns {{ zone: string, pct: number }[]}
 */
export function buildZoneDistribution(workouts) {
  const zoneTotals = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0, Z6: 0, Z7: 0 }
  for (const w of workouts) {
    const zone = w.heart_rate_zone || inferZone(w.rpe)
    const load = calcSessionLoad(w.rpe || 5, w.duration_minutes || 0)
    if (zoneTotals[zone] !== undefined) zoneTotals[zone] += load
  }
  const total = Object.values(zoneTotals).reduce((a, b) => a + b, 0)
  if (total === 0) return Object.keys(zoneTotals).map(zone => ({ zone, pct: 0 }))
  return Object.entries(zoneTotals).map(([zone, load]) => ({
    zone,
    pct: Math.round((load / total) * 100)
  }))
}

function inferZone(rpe) {
  if (!rpe) return 'Z2'
  if (rpe <= 2) return 'Z1'
  if (rpe <= 4) return 'Z2'
  if (rpe <= 5) return 'Z3'
  if (rpe <= 6) return 'Z4'
  if (rpe <= 7) return 'Z5'
  if (rpe <= 9) return 'Z6'
  return 'Z7'
}
