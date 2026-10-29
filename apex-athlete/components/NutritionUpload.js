// Loading a nutrition CSV: a button that opens the file picker, a drop zone,
// and the template to build from. One file can hold meals, groceries and
// targets; meals and groceries chosen as separate files are joined into one.
// A new load replaces the old plan and clears what was ticked off.
import { saveNutrition } from '../app.js'
import { mergeCsv } from '../lib/nutrition.js'
import { esc, formatDate, toast, friendlyError } from '../lib/util.js'

const MAX_BYTES = 5_000_000
export const TEMPLATE_URL = './samples/nutrition-plan-template.csv'

async function loadFiles(list) {
  const files = [...(list || [])]
  if (!files.length) return
  const bad = files.find(f => !/\.csv$/i.test(f.name) && f.type !== 'text/csv')
  if (bad) return toast(`${bad.name} isn't a CSV file. Export the plan as .csv and try again.`, { error: true })
  if (files.reduce((a, f) => a + f.size, 0) > MAX_BYTES) return toast('Those files are over 5 MB, too big for a plan.', { error: true })
  const csv = mergeCsv(await Promise.all(files.map(f => f.text())))
  const name = files.map(f => f.name).join(' + ')
  const { nutrition: n, error } = await saveNutrition(name, csv)
  if (error) return toast(friendlyError(error, 'load that plan'), { error: true })
  const range = `${formatDate(n.start, { month: 'short', day: 'numeric' })} to ${formatDate(n.end, { month: 'short', day: 'numeric' })}`
  toast(`Nutrition plan loaded: ${n.mealCount} meals, ${n.trips.length} shopping ${n.trips.length === 1 ? 'trip' : 'trips'}, ${range}`)
}

export function chooseNutritionFiles() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.csv,text/csv'
  input.multiple = true
  input.addEventListener('change', () => loadFiles(input.files))
  input.click()
}

function droppable(zone) {
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('is-over') })
  zone.addEventListener('dragleave', () => zone.classList.remove('is-over'))
  zone.addEventListener('drop', e => {
    e.preventDefault()
    zone.classList.remove('is-over')
    loadFiles(e.dataTransfer.files)
  })
}

/** Big empty-state panel: drop the file or pick it, or start from the template. */
export function renderNutritionDrop() {
  const zone = document.createElement('section')
  zone.className = 'plan-drop'
  zone.innerHTML = `
    <i data-lucide="file-up" aria-hidden="true"></i>
    <h2>Load your nutrition plan</h2>
    <p class="muted">Drop the plan CSV here, or choose it. Each row is a meal, a grocery item on a shopping day, or a daily target.
      Your shopping days are the dates the file puts grocery rows on.</p>
    <div class="row" style="justify-content:center">
      <button class="btn btn-primary" type="button" id="nutrition-choose">Choose CSV</button>
      <a class="btn btn-ghost" href="${TEMPLATE_URL}" download>Download template</a>
    </div>
  `
  zone.querySelector('#nutrition-choose').addEventListener('click', chooseNutritionFiles)
  droppable(zone)
  return zone
}

/** The loader on the Plan page once a plan is in: what's loaded, replace it, the format. */
export function renderNutritionFiles(state) {
  const n = state.nutrition
  const meta = state.nutritionMeta
  const el = document.createElement('section')
  el.className = 'section'
  el.setAttribute('aria-labelledby', 'files-h')
  el.innerHTML = `
    <div class="section-head"><h2 id="files-h">Plan files</h2></div>
    <div class="card file-card">
      <div class="file-row">
        <i data-lucide="file-spreadsheet" aria-hidden="true"></i>
        <div class="file-meta">
          <b>${esc(meta?.file_name || 'Nutrition plan')}</b>
          <span class="faint small">${n.mealCount} meals over ${n.days.length} days, ${n.trips.length} shopping ${n.trips.length === 1 ? 'trip' : 'trips'}${meta?.uploaded_at ? `. Loaded ${new Date(meta.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}</span>
        </div>
      </div>
      <p class="small muted">Drop new CSVs on this card, or choose them. Meals and groceries can be one file or two. A new plan replaces this one and clears what you ticked off.</p>
      <div class="row">
        <button class="btn btn-primary btn-sm" type="button" id="nutrition-replace"><i data-lucide="file-up" class="icon-sm" aria-hidden="true"></i> Load new CSV</button>
        <a class="btn btn-ghost btn-sm" href="${TEMPLATE_URL}" download><i data-lucide="download" class="icon-sm" aria-hidden="true"></i> Template</a>
      </div>
      <details class="coach-notes">
        <summary>CSV columns</summary>
        ${csvGuideHtml()}
      </details>
    </div>
  `
  el.querySelector('#nutrition-replace').addEventListener('click', chooseNutritionFiles)
  droppable(el.querySelector('.file-card'))
  return el
}

function csvGuideHtml() {
  const rows = [
    ['Type', 'Meal (the default), Grocery or Target'],
    ['Date', 'YYYY-MM-DD. The day a meal is eaten, or the shopping day for a grocery. A Target with no date applies to every day without its own.'],
    ['Meal', 'Breakfast, Lunch, Snack, Dinner, Pre-ride… (meals)'],
    ['Time', 'Optional, e.g. 07:00 (meals)'],
    ['Name', 'The dish, or the grocery item'],
    ['Ingredients', 'Separated by semicolons: oats 80 g; banana 1 (meals)'],
    ['Calories, Protein_g, Carbs_g, Fat_g', 'Per meal, or the day’s goal on a Target row'],
    ['Fiber_g, Sodium_mg', 'Optional (meals)'],
    ['Quantity, Unit, Category', 'How much to buy and the aisle: Produce, Meat & Fish, Dairy, Pantry, Frozen… (groceries)'],
    ['Covers_Through', 'Optional last day a shop feeds. Otherwise it runs to the day before the next shopping day.'],
    ['Notes', 'Anything else']
  ]
  return `<dl class="csv-guide">${rows.map(([k, v]) => `<div><dt><code>${k}</code></dt><dd>${v}</dd></div>`).join('')}</dl>`
}
