// Fuel · Groceries — the list for one shopping trip, by aisle. Shopping days
// come from the plan CSV (the dates its grocery rows are on); this opens on
// today's trip, or the next one. Tick items as they go in the cart.
import { setCheck, setChecks } from '../app.js'
import { currentTrip, formatQty } from '../lib/nutrition.js'
import { esc, dateKey, formatDate, toast, friendlyError } from '../lib/util.js'
import { slidePane, swipeable } from '../lib/motion.js'
import { renderNutritionDrop } from './NutritionUpload.js'

let tripDate = null  // the trip on screen; null follows today

/** Open the grocery list on a given trip (from the Plan page). */
export function showTrip(date) { tripDate = date }

export function renderGroceries(state) {
  const n = state.nutrition
  const wrap = document.createElement('div')
  wrap.className = 'stack fuel'
  if (!n) {
    wrap.innerHTML = `<div class="page-head"><h1 class="page-title" tabindex="-1">Groceries</h1></div>`
    wrap.appendChild(renderNutritionDrop())
    return wrap
  }
  if (!n.trips.length) {
    wrap.innerHTML = `
      <div class="page-head"><h1 class="page-title" tabindex="-1">Groceries</h1></div>
      <div class="card empty">
        <p>This plan has no shopping days.</p>
        <p>Add rows with Type set to Grocery, dated on the days you shop, and load it again from the Plan page.</p>
      </div>`
    return wrap
  }

  const today = dateKey()
  let i = Math.max(0, n.trips.findIndex(t => t.date === tripDate))
  if (!n.trips.some(t => t.date === tripDate)) i = n.trips.indexOf(currentTrip(n, today))

  wrap.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title" tabindex="-1">Groceries</h1>
        <p class="page-sub" id="trip-sub" aria-live="polite"></p>
      </div>
      <div class="row">
        <button class="btn btn-ghost btn-icon" data-trip="-1" aria-label="Previous shopping trip"><i data-lucide="chevron-left" aria-hidden="true"></i></button>
        <button class="btn btn-ghost btn-icon" data-trip="1" aria-label="Next shopping trip"><i data-lucide="chevron-right" aria-hidden="true"></i></button>
      </div>
    </div>
    <div class="grocery-pane"></div>
  `
  const pane = wrap.querySelector('.grocery-pane')

  const paint = () => {
    const trip = n.trips[i]
    const got = trip.items.filter(it => state.checks[it.key]).length
    const when = trip.date === today ? 'Today' : formatDate(trip.date, { weekday: 'long', month: 'short', day: 'numeric' })
    wrap.querySelector('#trip-sub').textContent =
      `${when}. Feeds ${formatDate(trip.date, { month: 'short', day: 'numeric' })} to ${formatDate(trip.until, { month: 'short', day: 'numeric' })}.`
    wrap.querySelector('[data-trip="-1"]').disabled = i === 0
    wrap.querySelector('[data-trip="1"]').disabled = i === n.trips.length - 1
    pane.innerHTML = `
      <div class="grocery-progress">
        <span class="small"><b class="tabular">${got}</b> of ${trip.items.length} in the cart</span>
        <span class="macro-track" aria-hidden="true"><span style="width:${(got / trip.items.length) * 100}%"></span></span>
        ${got ? `<button class="btn btn-ghost btn-sm" type="button" id="uncheck-all">Untick all</button>` : ''}
      </div>
      ${trip.groups.map((g, gi) => `
        <section class="grocery-group" aria-labelledby="aisle-${gi}">
          <h2 id="aisle-${gi}">${esc(g.name)}</h2>
          <ul>
            ${g.items.map(it => `
              <li>
                <label class="grocery-item ${state.checks[it.key] ? 'is-done' : ''}">
                  <input type="checkbox" data-key="${esc(it.key)}" ${state.checks[it.key] ? 'checked' : ''}>
                  <span class="grocery-box" aria-hidden="true"><i data-lucide="check"></i></span>
                  <span class="grocery-name">${esc(it.name)}${it.note ? `<span class="faint small">${esc(it.note)}</span>` : ''}</span>
                  <span class="grocery-qty tabular">${esc(formatQty(it))}</span>
                </label>
              </li>`).join('')}
          </ul>
        </section>`).join('')}
    `
    if (window.lucide) window.lucide.createIcons()
  }
  paint()

  pane.addEventListener('change', async e => {
    const box = e.target.closest('input[data-key]')
    if (!box) return
    const saving = setCheck(box.dataset.key, box.checked)
    const trip = n.trips[i]
    const got = trip.items.filter(it => state.checks[it.key]).length
    box.closest('.grocery-item').classList.toggle('is-done', box.checked)
    pane.querySelector('.grocery-progress b').textContent = got
    pane.querySelector('.grocery-progress .macro-track span').style.width = `${(got / trip.items.length) * 100}%`
    const { error } = await saving
    if (error) toast(friendlyError(error, 'save that'), { error: true })
  })
  pane.addEventListener('click', async e => {
    if (!e.target.closest('#uncheck-all')) return
    const keys = n.trips[i].items.map(it => it.key).filter(k => state.checks[k])
    const saving = setChecks(keys, false)
    paint()
    const { error } = await saving
    if (error) return toast(friendlyError(error, 'save that'), { error: true })
    toast('Unticked the list', {
      action: { label: 'Undo', onClick: () => { setChecks(keys, true); if (pane.isConnected) paint() } }
    })
  })

  const go = dir => {
    const next = i + dir
    if (next < 0 || next >= n.trips.length) return
    slidePane(pane, dir, () => { i = next; tripDate = n.trips[i].date; paint() })
  }
  wrap.querySelectorAll('[data-trip]').forEach(btn => btn.addEventListener('click', () => go(Number(btn.dataset.trip))))
  swipeable(pane, { canGo: dir => i + dir >= 0 && i + dir < n.trips.length, onSwipe: go })
  return wrap
}
