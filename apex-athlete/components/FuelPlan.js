// Fuel · Plan — the whole nutrition plan as a month calendar: calories and
// meals per day, shopping days marked. Tap a day for its meals (and, on a
// shopping day, that trip's list). Plan files and the CSV format sit below.
import { renderApp, navigate } from '../app.js'
import { formatKcal, targetFor, tripFor, MACROS } from '../lib/nutrition.js'
import { esc, dateKey, parseKey, addDays, startOfWeek, formatDate, openModal } from '../lib/util.js'
import { slideOut, slideIn, swipeable } from '../lib/motion.js'
import { mealHtml } from './FuelToday.js'
import { showTrip } from './GroceryView.js'
import { renderNutritionDrop, renderNutritionFiles } from './NutritionUpload.js'

let monthOffset = null  // months from this one; null opens on the plan

export function renderFuelPlan(state) {
  const n = state.nutrition
  const wrap = document.createElement('div')
  wrap.className = 'stack fuel'
  if (!n) {
    wrap.innerHTML = `<div class="page-head"><h1 class="page-title" tabindex="-1">Nutrition plan</h1></div>`
    wrap.appendChild(renderNutritionDrop())
    return wrap
  }

  const now = new Date()
  const today = dateKey()
  // Open on this month while the plan runs, else on the month it starts.
  if (monthOffset === null) {
    const s = parseKey(n.start), e = parseKey(n.end)
    const ref = today < n.start ? s : today > n.end ? e : now
    monthOffset = (ref.getFullYear() - now.getFullYear()) * 12 + ref.getMonth() - now.getMonth()
  }
  const month = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const gridStart = startOfWeek(month)
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  if (days[35].getMonth() !== month.getMonth()) days.length = 35
  const prefix = dateKey(month).slice(0, 7)
  const shopDays = new Set(n.trips.map(t => t.date))
  const monthTrips = n.trips.filter(t => t.date.startsWith(prefix)).length
  const firstMonth = parseKey(n.start), lastMonth = parseKey(n.end)
  const canPrev = month > new Date(firstMonth.getFullYear(), firstMonth.getMonth(), 1)
  const canNext = month < new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)

  wrap.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title" tabindex="-1">${month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h1>
        <p class="page-sub">${monthTrips ? `${monthTrips} shopping ${monthTrips === 1 ? 'day' : 'days'} this month` : n.days.some(d => d.date.startsWith(prefix)) ? 'No shopping days this month' : 'Outside your plan'}</p>
      </div>
      <div class="row">
        <button class="btn btn-ghost btn-icon" data-shift="-1" aria-label="Previous month" ${canPrev ? '' : 'disabled'}><i data-lucide="chevron-left" aria-hidden="true"></i></button>
        <button class="btn btn-ghost" data-shift="0">This month</button>
        <button class="btn btn-ghost btn-icon" data-shift="1" aria-label="Next month" ${canNext ? '' : 'disabled'}><i data-lucide="chevron-right" aria-hidden="true"></i></button>
      </div>
    </div>

    <div class="calendar fuel-calendar">
      ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
      ${days.map(d => {
        const key = dateKey(d)
        const day = n.byDate[key]
        const shop = shopDays.has(key)
        const label = `${d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}${day ? `: ${day.meals.length} meals, ${formatKcal(day.totals.calories)} kcal` : ''}${shop ? ', shopping day' : ''}`
        return `
          <button class="cal-day ${d.getMonth() !== month.getMonth() ? 'other' : ''} ${key === today ? 'today' : ''} ${key < today ? 'past' : ''} ${day || shop ? 'has-food' : 'empty'} ${shop ? 'is-shop' : ''}"
            data-date="${key}" aria-label="${esc(label)}" ${key === today ? 'aria-current="date"' : ''}>
            <span class="cal-top">
              <span class="cal-num">${d.getDate()}</span>
              ${shop ? '<span class="cal-shop" aria-hidden="true"><i data-lucide="shopping-basket"></i></span>' : ''}
            </span>
            ${day ? `
              <span class="cal-type tabular">${formatKcal(day.totals.calories)}<span class="cal-unit"> kcal</span></span>
              <span class="cal-foot"><span class="cal-hrs">${day.meals.length} ${day.meals.length === 1 ? 'meal' : 'meals'}</span></span>` : ''}
          </button>`
      }).join('')}
    </div>

    <div class="legend faint small">
      <span><i data-lucide="shopping-basket" class="icon-xs" aria-hidden="true"></i> Shopping day</span>
      <span>Figures are the day's planned calories</span>
    </div>
  `
  wrap.appendChild(renderNutritionFiles(state))

  let moving = false
  const shiftMonth = async step => {
    const next = step === 0 ? 0 : monthOffset + step
    if (moving || next === monthOffset) return
    const dir = Math.sign(next - monthOffset)
    moving = true
    await slideOut(wrap.querySelector('.calendar'), dir)
    monthOffset = next
    renderApp()
    slideIn(document.querySelector('.calendar'), dir)
  }
  wrap.querySelectorAll('[data-shift]').forEach(btn => btn.addEventListener('click', () => shiftMonth(Number(btn.dataset.shift))))
  swipeable(wrap.querySelector('.calendar'), { canGo: dir => (dir > 0 ? canNext : canPrev), onSwipe: shiftMonth })
  wrap.querySelector('.calendar').addEventListener('click', e => {
    const cell = e.target.closest('[data-date]')
    if (cell && !cell.classList.contains('empty')) openFuelDay(state, cell.dataset.date)
  })
  return wrap
}

/** A day's meals and totals; on a shopping day, the trip too. */
function openFuelDay(state, date) {
  const n = state.nutrition
  const day = n.byDate[date]
  const trip = n.trips.find(t => t.date === date)
  const feeds = tripFor(n, date)
  const target = targetFor(n, date)
  const { el, close } = openModal(`
    <div class="modal-head">
      <h2>${formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
      <button class="btn btn-ghost btn-icon" data-close aria-label="Close"><i data-lucide="x" aria-hidden="true"></i></button>
    </div>
    <div class="stack-sm fuel">
      ${day ? `
        <p class="day-macros small">
          <b class="tabular">${formatKcal(day.totals.calories)} kcal</b>${target?.calories != null ? `<span class="faint"> of ${formatKcal(target.calories)} target</span>` : ''}
          ${MACROS.filter(m => day.totals[m.id] != null).map(m => `<span style="--macro:${m.color}"><i aria-hidden="true"></i>${m.label} ${Math.round(day.totals[m.id])} g</span>`).join('')}
        </p>
        <ol class="meal-list">${day.meals.map(m => mealHtml(m, { done: !!state.checks[m.key] })).join('')}</ol>` : '<p class="muted">No meals planned.</p>'}
      ${trip ? `
        <div class="shop-callout">
          <span><i data-lucide="shopping-basket" class="icon-sm" aria-hidden="true"></i> <b>Shopping day</b>: ${trip.items.length} items for ${formatDate(trip.date, { month: 'short', day: 'numeric' })} to ${formatDate(trip.until, { month: 'short', day: 'numeric' })}</span>
          <button class="btn btn-primary btn-sm" type="button" id="open-list">Open list</button>
        </div>` : feeds ? `<p class="faint small">Groceries from the ${formatDate(feeds.date, { weekday: 'long', month: 'short', day: 'numeric' })} shop.</p>` : ''}
    </div>
  `, { width: 560 })
  el.querySelector('#open-list')?.addEventListener('click', () => {
    close()
    showTrip(trip.date)
    navigate('fuel-groceries')
  })
}
