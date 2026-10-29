// Fuel · Meals — today's meals with what each one carries, the day's totals
// against its target, and the next shopping trip. Tick a meal once it's eaten.
import { navigate, setCheck } from '../app.js'
import { MACROS, totals, targetFor, currentTrip, formatKcal } from '../lib/nutrition.js'
import { plannedHours, formatHours } from '../lib/plan.js'
import { esc, dateKey, formatDate, toast, friendlyError } from '../lib/util.js'
import { kindChip, sessionTitles } from './DaySession.js'
import { renderNutritionDrop } from './NutritionUpload.js'

export function renderFuelToday(state) {
  const today = dateKey()
  const n = state.nutrition
  const wrap = document.createElement('div')
  wrap.className = 'stack fuel'
  wrap.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title" tabindex="-1">Meals</h1>
        <p class="page-sub">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>`
  if (!n) {
    wrap.appendChild(renderNutritionDrop())
    return wrap
  }

  const day = n.byDate[today]
  const meals = day ? day.meals : []
  const training = state.plan?.byDate[today]
  const trip = currentTrip(n, today)
  const body = document.createElement('div')
  body.className = 'stack'
  wrap.appendChild(body)

  const paint = () => {
    const eaten = totals(meals.filter(m => state.checks[m.key]))
    body.innerHTML = `
      ${meals.length ? totalsHtml(eaten, day.totals, targetFor(n, today)) : ''}

      <section class="section" aria-labelledby="meals-h">
        <div class="section-head">
          <h2 id="meals-h">Today's meals</h2>
          ${training ? `<span class="row small faint">Training: ${kindChip(training)} ${esc(sessionTitles(training))}${plannedHours(training) ? `, ${formatHours(plannedHours(training))}` : ''}</span>` : ''}
        </div>
        ${meals.length ? `<ol class="meal-list">${meals.map(m => mealHtml(m, { done: !!state.checks[m.key], checkable: true })).join('')}</ol>` : `
          <div class="card empty">
            <p>${today < n.start ? `Your nutrition plan starts ${formatDate(n.start, { weekday: 'long', month: 'long', day: 'numeric' })}.` : today > n.end ? 'Your nutrition plan has finished.' : 'No meals planned for today.'}</p>
            <p>${today > n.end ? 'Load the next one from the Plan page when you have it.' : 'Eat to feel, and fuel the ride.'}</p>
          </div>`}
      </section>

      ${trip ? `
        <button class="next-shop" type="button" id="next-shop">
          <i data-lucide="shopping-basket" aria-hidden="true"></i>
          <span class="next-shop-body">
            <b>${trip.date === today ? 'Shopping today' : trip.date > today ? `Next shop ${formatDate(trip.date, { weekday: 'long', month: 'short', day: 'numeric' })}` : 'Last shop of the plan'}</b>
            <span class="faint small">${trip.items.length} items, ${trip.items.filter(i => state.checks[i.key]).length} in the cart</span>
          </span>
          <i data-lucide="chevron-right" aria-hidden="true"></i>
        </button>` : ''}
    `
    if (window.lucide) window.lucide.createIcons()
    body.querySelector('#next-shop')?.addEventListener('click', () => navigate('fuel-groceries'))
  }
  paint()

  body.addEventListener('click', async e => {
    const btn = e.target.closest('[data-eat]')
    if (!btn) return
    const key = btn.dataset.eat
    const on = !state.checks[key]
    const saving = setCheck(key, on)
    paint()
    body.querySelector(`[data-eat="${CSS.escape(key)}"]`)?.focus()
    const { error } = await saving
    if (error) toast(friendlyError(error, 'save that'), { error: true })
  })
  return wrap
}

/** Calories as a big figure, then a bar per macro: eaten so far against the goal. */
function totalsHtml(eaten, planned, target) {
  const goal = k => target?.[k] ?? planned[k]
  return `
    <section class="fuel-totals" aria-label="Today's totals">
      <div class="fuel-kcal">
        <span class="fuel-kcal-num tabular">${formatKcal(eaten.calories ?? 0)}</span>
        <span class="fuel-kcal-of">of ${formatKcal(goal('calories'))} kcal${target?.calories != null ? ' target' : ' planned'}</span>
      </div>
      <ul class="macro-bars">
        ${MACROS.map(m => {
          const have = eaten[m.id] ?? 0, want = goal(m.id)
          const pct = want ? Math.min(100, (have / want) * 100) : 0
          return `
            <li style="--macro:${m.color}">
              <span class="macro-name">${m.label}</span>
              <span class="macro-track" role="img" aria-label="${m.label}: ${Math.round(have)} of ${want == null ? 'unknown' : Math.round(want)} grams"><span style="width:${pct}%"></span></span>
              <span class="macro-val tabular">${Math.round(have)}<span class="faint"> / ${want == null ? '–' : Math.round(want)} g</span></span>
            </li>`
        }).join('')}
      </ul>
    </section>`
}

/** One meal: when, what, what's in it, and its numbers. */
export function mealHtml(m, { done = false, checkable = false } = {}) {
  const macros = MACROS.filter(x => m[x.id] != null)
  return `
    <li class="meal ${done ? 'is-done' : ''}">
      ${checkable ? `
        <button class="meal-check" type="button" data-eat="${esc(m.key)}" aria-pressed="${done}" aria-label="${esc(m.name)}: ${done ? 'eaten' : 'mark as eaten'}">
          <i data-lucide="check" aria-hidden="true"></i>
        </button>` : ''}
      <div class="meal-body">
        <span class="meal-when">${esc(m.meal)}${m.time ? ` · ${esc(m.time)}` : ''}</span>
        <span class="meal-name">${esc(m.name)}</span>
        ${m.ingredients.length ? `<span class="meal-ingredients">${m.ingredients.map(esc).join(', ')}</span>` : ''}
        ${m.note ? `<span class="meal-note">${esc(m.note)}</span>` : ''}
      </div>
      <div class="meal-nums">
        <span class="meal-kcal tabular">${formatKcal(m.calories)}<span class="faint"> kcal</span></span>
        ${macros.length ? `<span class="meal-macros">${macros.map(x => `<span style="--macro:${x.color}"><i aria-hidden="true"></i><abbr title="${x.label}">${x.short}</abbr> ${Math.round(m[x.id])}</span>`).join('')}</span>` : ''}
      </div>
    </li>`
}
