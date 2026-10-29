// Nutrition plan (the Fuel side): parse the nutrition CSV into days of meals,
// shopping trips with their grocery lists, and daily targets. One file holds
// all three, a row each, told apart by the Type column. Shopping days are
// whatever dates the file puts grocery rows on.
import { parseCsv } from './plan.js'
import { dateKey, parseKey, addDays } from './util.js'

const DATE = /^\d{4}-\d{2}-\d{2}$/

export const MACROS = [
  { id: 'protein', label: 'Protein', short: 'P', color: 'var(--macro-protein)' },
  { id: 'carbs',   label: 'Carbs',   short: 'C', color: 'var(--macro-carbs)' },
  { id: 'fat',     label: 'Fat',     short: 'F', color: 'var(--macro-fat)' }
]

// Grocery aisles in walking order; anything else follows, alphabetically.
const AISLES = ['produce', 'bakery', 'meat & fish', 'meat', 'fish', 'dairy', 'eggs & dairy', 'deli', 'pantry', 'grains', 'canned', 'snacks', 'drinks', 'frozen', 'supplements', 'household', 'other']

// "620", "620 kcal", "1,240" → 620 / 1240. Blank or unreadable → null.
const num = v => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}
const dash = v => (v && v !== '-' ? v : '')

function rowType(r) {
  const t = (r.Type || '').trim().toLowerCase()
  if (/^(groc|shop|buy)/.test(t)) return 'grocery'
  if (/^(target|goal)/.test(t)) return 'target'
  return 'meal'
}

function nutrients(r) {
  return {
    calories: num(r.Calories ?? r.Kcal),
    protein: num(r.Protein_g ?? r.Protein),
    carbs: num(r.Carbs_g ?? r.Carbs),
    fat: num(r.Fat_g ?? r.Fat)
  }
}

/** Sum calories and macros over meals; fields nobody filled stay null. */
export function totals(meals) {
  const out = { calories: null, protein: null, carbs: null, fat: null, fiber: null, sodium: null }
  for (const m of meals) {
    for (const k of Object.keys(out)) if (m[k] != null) out[k] = (out[k] ?? 0) + m[k]
  }
  return out
}

/**
 * @param {string} text  the nutrition CSV
 * @returns {{ days, byDate, trips, targets, start, end, mealCount } | { error }}
 */
export function parseNutrition(text) {
  if (!text || !text.trim()) return { error: 'The file is empty.' }
  const { keys, rows } = parseCsv(text)
  if (!keys.includes('Date')) return { error: "This doesn't look like a nutrition file: it has no Date column." }
  if (!keys.includes('Name') && !keys.includes('Item') && !keys.includes('Meal')) {
    return { error: "This doesn't look like a nutrition file: it needs a Name column for meals and groceries." }
  }

  const byDate = {}
  const tripsByDate = {}
  const targets = { default: null, byDate: {} }
  for (const r of rows) {
    const type = rowType(r)
    const date = r.Date
    if (type === 'target') {
      if (!date) targets.default = nutrients(r)
      else if (DATE.test(date)) targets.byDate[date] = nutrients(r)
      continue
    }
    if (!DATE.test(date)) continue
    if (type === 'grocery') {
      const name = r.Name || r.Item
      if (!name) continue
      const trip = tripsByDate[date] ||= { date, items: [], coversThrough: '' }
      trip.items.push({
        key: `g:${date}:${trip.items.length}`,
        name,
        quantity: dash(r.Quantity),
        unit: dash(r.Unit),
        category: dash(r.Category) || 'Other',
        note: dash(r.Notes)
      })
      if (DATE.test(r.Covers_Through) && r.Covers_Through > trip.coversThrough) trip.coversThrough = r.Covers_Through
      continue
    }
    const day = byDate[date] ||= { date, meals: [] }
    day.meals.push({
      key: `m:${date}:${day.meals.length}`,
      meal: r.Meal || 'Meal',
      time: dash(r.Time),
      name: r.Name || r.Meal || 'Meal',
      ingredients: dash(r.Ingredients).split(/\s*;\s*/).filter(Boolean),
      ...nutrients(r),
      fiber: num(r.Fiber_g),
      sodium: num(r.Sodium_mg),
      note: dash(r.Notes)
    })
  }

  const days = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  for (const d of days) d.totals = totals(d.meals)
  const tripList = Object.values(tripsByDate).sort((a, b) => a.date.localeCompare(b.date))
  if (!days.length && !tripList.length) return { error: 'No meal or grocery rows with a date like 2026-11-02 were found.' }

  const allDates = [...days.map(d => d.date), ...tripList.map(t => t.date)].sort()
  const start = allDates[0], end = allDates[allDates.length - 1]
  // A trip feeds the days from its shopping day up to the day before the next one.
  tripList.forEach((t, i) => {
    const next = tripList[i + 1]
    t.until = t.coversThrough || (next ? dateKey(addDays(parseKey(next.date), -1)) : end)
    t.groups = groupByAisle(t.items)
  })

  return {
    days, byDate, trips: tripList, targets, start, end,
    mealCount: days.reduce((a, d) => a + d.meals.length, 0)
  }
}

function groupByAisle(items) {
  const groups = new Map()
  for (const it of items) {
    const name = it.category
    if (!groups.has(name.toLowerCase())) groups.set(name.toLowerCase(), { name, items: [] })
    groups.get(name.toLowerCase()).items.push(it)
  }
  const rank = k => { const i = AISLES.indexOf(k); return i < 0 ? AISLES.length - 1 : i }
  return [...groups].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b)).map(([, g]) => g)
}

/** The day's own target, else the plan's default, else null. */
export function targetFor(n, date) {
  return n.targets.byDate[date] || n.targets.default || null
}

/** The trip to shop for: today's, else the next one, else the last one. */
export function currentTrip(n, today = dateKey()) {
  return n.trips.find(t => t.date >= today) || n.trips[n.trips.length - 1] || null
}

/** The trip whose groceries cover `date`. */
export function tripFor(n, date) {
  return [...n.trips].reverse().find(t => t.date <= date && t.until >= date) || null
}

export function formatKcal(v) {
  return v == null ? '–' : Math.round(v).toLocaleString()
}

export function formatQty(item) {
  return [item.quantity, item.unit].filter(Boolean).join(' ')
}

// ─── MERGING FILES ───────────────────────────────────────────────────────────
// Meals and groceries can come as separate files; they're joined into one CSV
// (union of the columns) so the plan is still stored as a single file.

const quote = v => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export function mergeCsv(texts) {
  if (texts.length === 1) return texts[0]
  const parsed = texts.map(t => parseCsv(t))
  const keys = [...new Set(parsed.flatMap(p => p.keys))]
  const lines = [keys.map(quote).join(',')]
  for (const p of parsed) for (const r of p.rows) lines.push(keys.map(k => quote(r[k] ?? '')).join(','))
  return lines.join('\n')
}
