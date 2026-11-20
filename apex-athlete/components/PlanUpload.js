// Loading a plan CSV: a button that opens the file picker, and a drop zone
// for the empty state. A new file replaces the old plan; journal entries stay.
// An update file changes only the dates it has and keeps the rest of the plan.
import { savePlan, updatePlan } from '../app.js'
import { formatDate, toast, friendlyError } from '../lib/util.js'

const MAX_BYTES = 5_000_000
const short = key => formatDate(key, { month: 'short', day: 'numeric' })

/** A message if the file can't be a plan CSV, else null. */
function checkFile(file) {
  if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
    return `${file.name} isn't a CSV file. Export the plan as .csv and try again.`
  }
  if (file.size > MAX_BYTES) return 'That file is over 5 MB, too big for a plan.'
  return null
}

function pickCsv(onFile) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.csv,text/csv'
  input.addEventListener('change', () => input.files[0] && onFile(input.files[0]))
  input.click()
}

async function loadFile(file) {
  if (!file) return
  const problem = checkFile(file)
  if (problem) return toast(problem, { error: true })
  const { plan, error } = await savePlan(file.name, await file.text())
  if (error) return toast(friendlyError(error, 'load that plan'), { error: true })
  const doubles = plan.days.filter(d => d.sessions.length > 1).length
  toast(`Plan loaded: ${plan.days.length} days${doubles ? ` (${doubles} with more than one session)` : ''}, ${formatDate(plan.start, { month: 'short', day: 'numeric' })} to ${formatDate(plan.end, { month: 'short', day: 'numeric' })}`)
}

export function choosePlanFile() {
  pickCsv(loadFile)
}

// "Nov 18", "Nov 18 to Nov 20" or "4 days, Nov 18 to Dec 2"
function span(dates) {
  if (dates.length === 1) return short(dates[0])
  if (dates.length === 2) return `${short(dates[0])} and ${short(dates[1])}`
  return `${dates.length} days, ${short(dates[0])} to ${short(dates[dates.length - 1])}`
}

async function loadUpdate(file) {
  const problem = checkFile(file)
  if (problem) return toast(problem, { error: true })
  const { replaced, added, undo, error } = await updatePlan(file.name, await file.text())
  if (error) return toast(friendlyError(error, 'update the plan'), { error: true })
  const parts = [replaced?.length && `changed ${span(replaced)}`, added?.length && `added ${span(added)}`].filter(Boolean)
  toast(`Plan updated: ${parts.join('; ')}. The other days are as they were.`, {
    action: undo && {
      label: 'Undo',
      onClick: async () => {
        const { error } = await undo()
        toast(error ? friendlyError(error, 'undo the update') : 'Update undone.', { error: !!error })
      }
    }
  })
}

/** Change only some dates: rows in the file replace those days, the rest stays. */
export function choosePlanUpdate() {
  pickCsv(loadUpdate)
}

/** Big empty-state panel: drop a file or pick one. */
export function renderPlanDrop() {
  const zone = document.createElement('section')
  zone.className = 'plan-drop'
  zone.innerHTML = `
    <i data-lucide="file-up" aria-hidden="true"></i>
    <h2>Load your training plan</h2>
    <p class="muted">Drop the plan CSV here, or choose the file. Each row is a day with its date, workout and notes; rows that share a date are that day's sessions.
      When your plan changes, load the new file and it replaces this one. Journal entries are kept.</p>
    <button class="btn btn-primary" type="button">Choose plan file</button>
  `
  zone.querySelector('button').addEventListener('click', choosePlanFile)
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('is-over') })
  zone.addEventListener('dragleave', () => zone.classList.remove('is-over'))
  zone.addEventListener('drop', e => {
    e.preventDefault()
    zone.classList.remove('is-over')
    loadFile(e.dataTransfer.files[0])
  })
  return zone
}
