// Fuel · Recipes — every recipe in the nutrition plan, the next batch cook,
// and a recipe card with ingredients you can scale to the batch, steps you can
// tick off while you cook, and the days it's on the plan.
// Recipes and batch cooks come from the nutrition CSV (Type = Recipe / Prep).
import { MACROS, formatKcal, nextPrep, scaleIngredient } from '../lib/nutrition.js'
import { esc, dateKey, formatDate, openModal } from '../lib/util.js'
import { renderNutritionDrop } from './NutritionUpload.js'

// Shelf order for the categories; anything else follows, alphabetically.
const SHELF = ['breakfast', 'main', 'snack', 'recovery', 'ride food', 'drink']

let query = ''         // search text, kept while you move between pages
let shelf = 'all'      // category filter
let prepOpen = false   // batch-cook steps expanded

export function renderRecipes(state) {
  const n = state.nutrition
  const wrap = document.createElement('div')
  wrap.className = 'stack fuel'
  if (!n) {
    wrap.innerHTML = `<div class="page-head"><h1 class="page-title" tabindex="-1">Recipes</h1></div>`
    wrap.appendChild(renderNutritionDrop())
    return wrap
  }
  if (!n.recipes.length) {
    wrap.innerHTML = `
      <div class="page-head"><h1 class="page-title" tabindex="-1">Recipes</h1></div>
      <div class="card empty">
        <p>This plan has no recipes.</p>
        <p>Add rows with Type set to Recipe (name, ingredients per serving and steps in Instructions) and load it again from the Plan page. The format is in docs/nutrition-plan.md.</p>
      </div>`
    return wrap
  }

  const today = dateKey()
  const prep = nextPrep(n, today)
  const cats = [...new Set(n.recipes.map(r => r.category))].sort(
    (a, b) => rank(a) - rank(b) || a.localeCompare(b)
  )
  if (shelf !== 'all' && !cats.includes(shelf)) shelf = 'all'

  wrap.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title" tabindex="-1">Recipes</h1>
        <p class="page-sub">${n.recipes.length} recipes in your plan${prep ? `. Next batch cook ${prep.date === today ? 'today' : formatDate(prep.date, { weekday: 'long', month: 'short', day: 'numeric' })}` : ''}.</p>
      </div>
    </div>
    ${prep ? prepHtml(n, prep, today) : ''}
    <section class="section" aria-labelledby="recipes-h">
      <div class="section-head"><h2 id="recipes-h">All recipes</h2></div>
      <div class="recipe-tools">
        <label class="recipe-search">
          <i data-lucide="search" aria-hidden="true"></i>
          <span class="visually-hidden">Search recipes</span>
          <input class="input" type="search" id="recipe-q" placeholder="Search recipes or ingredients" value="${esc(query)}" autocomplete="off">
        </label>
        <div class="recipe-shelves" role="group" aria-label="Filter by category">
          ${['all', ...cats].map(c => `<button type="button" class="shelf-chip" data-shelf="${esc(c)}" aria-pressed="${shelf === c}">${c === 'all' ? 'All' : esc(c)}</button>`).join('')}
        </div>
      </div>
      <div class="recipe-results" aria-live="polite"></div>
    </section>
  `

  const results = wrap.querySelector('.recipe-results')
  const paint = () => {
    const q = query.trim().toLowerCase()
    const hits = n.recipes.filter(r =>
      (shelf === 'all' || r.category === shelf) &&
      (!q || r.name.toLowerCase().includes(q) || r.ingredients.some(i => i.toLowerCase().includes(q)))
    )
    const groups = cats.map(c => ({ c, items: hits.filter(r => r.category === c) })).filter(g => g.items.length)
    results.innerHTML = groups.length ? groups.map((g, gi) => `
      <div class="recipe-group">
        <h3 id="shelf-${gi}">${esc(g.c)}</h3>
        <ul class="recipe-list" aria-labelledby="shelf-${gi}">${g.items.map(r => recipeRowHtml(r, today)).join('')}</ul>
      </div>`).join('') : `
      <div class="card empty">
        <p>No recipes match “${esc(query)}”.</p>
        <p>Try an ingredient, like rice or chicken.</p>
      </div>`
    if (window.lucide) window.lucide.createIcons()
  }
  paint()

  wrap.querySelector('#recipe-q').addEventListener('input', e => { query = e.target.value; paint() })
  wrap.addEventListener('click', e => {
    const chip = e.target.closest('[data-shelf]')
    if (chip) {
      shelf = chip.dataset.shelf
      wrap.querySelectorAll('[data-shelf]').forEach(b => b.setAttribute('aria-pressed', b.dataset.shelf === shelf))
      return paint()
    }
    const toggle = e.target.closest('#prep-toggle')
    if (toggle) {
      prepOpen = !prepOpen
      toggle.setAttribute('aria-expanded', prepOpen)
      toggle.querySelector('span').textContent = prepOpen ? 'Hide the steps' : 'Show the steps'
      wrap.querySelector('.prep-body').hidden = !prepOpen
      return
    }
    const step = e.target.closest('.cook-steps li')
    if (step) return toggleStep(step)
    const open = e.target.closest('[data-recipe]')
    if (open) openRecipe(state, open.dataset.recipe)
  })
  wrap.addEventListener('keydown', e => {
    const step = e.target.closest('.cook-steps li')
    if (step && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleStep(step) }
  })
  return wrap
}

const rank = c => { const i = SHELF.indexOf(c.toLowerCase()); return i < 0 ? SHELF.length : i }

function minutes(m) {
  if (m == null) return ''
  return m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${Math.round(m % 60)} min` : ''}` : `${Math.round(m)} min`
}

function macrosHtml(r) {
  const ms = MACROS.filter(x => r[x.id] != null)
  return ms.length ? `<span class="meal-macros">${ms.map(x => `<span style="--macro:${x.color}"><i aria-hidden="true"></i><abbr title="${x.label}">${x.short}</abbr> ${Math.round(r[x.id])}</span>`).join('')}</span>` : ''
}

function recipeRowHtml(r, today) {
  const next = r.uses.find(d => d >= today)
  const meta = [
    r.totalMin != null ? minutes(r.totalMin) : '',
    r.servings > 1 ? `makes ${r.servings}` : '',
    next ? `next ${next === today ? 'today' : formatDate(next, { weekday: 'short', month: 'short', day: 'numeric' })}` : ''
  ].filter(Boolean).join(' · ')
  return `
    <li>
      <button type="button" class="recipe-row" data-recipe="${esc(r.id)}">
        <span class="meal-body">
          <span class="meal-name">${esc(r.name)}</span>
          ${meta ? `<span class="meal-note">${esc(meta)}</span>` : ''}
        </span>
        <span class="meal-nums">
          <span class="meal-kcal tabular">${formatKcal(r.calories)}<span class="faint"> kcal</span></span>
          ${macrosHtml(r)}
        </span>
        <i data-lucide="chevron-right" class="recipe-go" aria-hidden="true"></i>
      </button>
    </li>`
}

/** The batch cook to do next: when, how long, what's in it, the order of work. */
function prepHtml(n, p, today) {
  const recipes = p.recipeIds.map(id => n.recipeById[id]).filter(Boolean)
  const when = p.date === today ? 'Today' : formatDate(p.date, { weekday: 'long', month: 'short', day: 'numeric' })
  const facts = [
    p.time ? `starts ${esc(p.time)}` : '',
    p.activeMin != null ? `about ${minutes(Math.max(p.activeMin, p.totalMin ?? 0))}` : '',
    p.portions ? `${p.portions} portions` : '',
    p.coversThrough ? `feeds you to ${formatDate(p.coversThrough, { weekday: 'short', month: 'short', day: 'numeric' })}` : ''
  ].filter(Boolean)
  return `
    <section class="prep-card ${p.date === today ? 'is-today' : ''}" aria-labelledby="prep-h">
      <div class="prep-head">
        <i data-lucide="cooking-pot" aria-hidden="true"></i>
        <div>
          <span class="meal-when">${p.date === today ? 'Batch cook today' : 'Next batch cook'}</span>
          <h2 id="prep-h">${esc(when)}</h2>
          ${facts.length ? `<p class="small faint">${facts.join(' · ')}</p>` : ''}
        </div>
      </div>
      ${recipes.length ? `
        <ul class="prep-recipes" aria-label="Recipes in this batch">
          ${recipes.map(r => `<li><button type="button" class="shelf-chip" data-recipe="${esc(r.id)}">${esc(r.name)}</button></li>`).join('')}
        </ul>` : ''}
      ${p.steps.length || p.ingredients.length ? `
        <button type="button" class="btn btn-ghost btn-sm" id="prep-toggle" aria-expanded="${prepOpen}" aria-controls="prep-body">
          <i data-lucide="list-ordered" aria-hidden="true"></i><span>${prepOpen ? 'Hide the steps' : 'Show the steps'}</span>
        </button>
        <div class="prep-body" id="prep-body" ${prepOpen ? '' : 'hidden'}>
          ${p.steps.length ? `<h3>Order of work</h3>${stepsHtml(p.steps)}` : ''}
          ${p.ingredients.length ? `<h3>Everything you need</h3><ul class="ingredient-list cols">${p.ingredients.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
        </div>` : ''}
    </section>`
}

function stepsHtml(list) {
  return `<ol class="cook-steps">${list.map((s, i) => `
    <li tabindex="0" role="checkbox" aria-checked="false"><span class="step-num" aria-hidden="true">${i + 1}</span><span>${esc(s)}</span></li>`).join('')}</ol>`
}

function toggleStep(li) {
  const done = li.getAttribute('aria-checked') !== 'true'
  li.setAttribute('aria-checked', done)
  li.classList.toggle('is-done', done)
}

/** A recipe card: what it is, ingredients scaled to the servings you pick, steps. */
export function openRecipe(state, id) {
  const n = state.nutrition
  const r = n?.recipeById?.[id]
  if (!r) return
  const today = dateKey()
  const base = r.servings && r.servings > 0 ? r.servings : 1
  let servings = base
  const ahead = r.uses.filter(d => d >= today)
  const meta = [
    r.activeMin != null ? `<span><i data-lucide="hand" aria-hidden="true"></i>${minutes(r.activeMin)} hands-on</span>` : '',
    r.totalMin != null && r.totalMin !== r.activeMin ? `<span><i data-lucide="timer" aria-hidden="true"></i>${minutes(r.totalMin)} total</span>` : '',
    r.servings ? `<span><i data-lucide="users" aria-hidden="true"></i>batch of ${r.servings}</span>` : ''
  ].filter(Boolean).join('')

  const { el } = openModal(`
    <div class="modal-head">
      <h2>${esc(r.name)}</h2>
      <button class="btn btn-ghost btn-icon" data-close aria-label="Close"><i data-lucide="x" aria-hidden="true"></i></button>
    </div>
    <div class="stack-sm fuel recipe-card">
      <p class="meal-when">${esc(r.category)}${r.slot ? ` · ${esc(r.slot)}` : ''}</p>
      ${meta ? `<p class="recipe-meta small">${meta}</p>` : ''}
      <p class="day-macros small">
        <b class="tabular">${formatKcal(r.calories)} kcal</b><span class="faint"> per serving</span>
        ${MACROS.filter(m => r[m.id] != null).map(m => `<span style="--macro:${m.color}"><i aria-hidden="true"></i>${m.label} ${Math.round(r[m.id])} g</span>`).join('')}
      </p>
      ${r.note ? `<p class="recipe-note small">${esc(r.note)}</p>` : ''}

      <div class="recipe-sec">
        <div class="row-between">
          <h3>Ingredients</h3>
          <div class="servings" role="group" aria-label="Servings">
            <button type="button" class="btn btn-ghost btn-icon btn-sm" data-serve="-1" aria-label="Fewer servings"><i data-lucide="minus" aria-hidden="true"></i></button>
            <span class="servings-n tabular" aria-live="polite"></span>
            <button type="button" class="btn btn-ghost btn-icon btn-sm" data-serve="1" aria-label="More servings"><i data-lucide="plus" aria-hidden="true"></i></button>
          </div>
        </div>
        <ul class="ingredient-list" id="recipe-ings"></ul>
        <p class="faint small">Opens at the batch size; use − and + to scale. Your Meals page shows each day's own portion, which changes with that day's carb target.</p>
      </div>

      ${r.steps.length ? `<div class="recipe-sec"><h3>Method</h3>${stepsHtml(r.steps)}<p class="faint small">Tap a step to tick it off.</p></div>` : ''}

      ${ahead.length ? `
        <div class="recipe-sec">
          <h3>On your plan</h3>
          <p class="small">${ahead.length} more ${ahead.length === 1 ? 'time' : 'times'}, next ${ahead[0] === today ? 'today' : formatDate(ahead[0], { weekday: 'long', month: 'short', day: 'numeric' })}.</p>
        </div>` : ''}
    </div>
  `, { width: 620 })

  const ings = el.querySelector('#recipe-ings')
  const count = el.querySelector('.servings-n')
  const paint = () => {
    // Ingredients are per serving in the CSV.
    ings.innerHTML = r.ingredients.map(i => `<li>${esc(scaleIngredient(i, servings))}</li>`).join('')
    count.textContent = `${servings} ${servings === 1 ? 'serving' : 'servings'}`
    el.querySelector('[data-serve="-1"]').disabled = servings <= 1
  }
  paint()
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-serve]')
    if (b) { servings = Math.max(1, Math.min(48, servings + Number(b.dataset.serve))); return paint() }
    const step = e.target.closest('.cook-steps li')
    if (step) toggleStep(step)
  })
  el.addEventListener('keydown', e => {
    const step = e.target.closest('.cook-steps li')
    if (step && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleStep(step) }
  })
}
