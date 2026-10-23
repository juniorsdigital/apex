// Loading a plan CSV: a button that opens the file picker, and a drop zone
// for the empty state. A new file replaces the old plan; journal entries stay.
import { savePlan } from '../app.js'
import { formatDate, toast, friendlyError } from '../lib/util.js'

const MAX_BYTES = 5_000_000

async function loadFile(file) {
  if (!file) return
  if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
    return toast(`${file.name} isn't a CSV file. Export the plan as .csv and try again.`, { error: true })
  }
  if (file.size > MAX_BYTES) return toast('That file is over 5 MB, too big for a plan.', { error: true })
  const { plan, error } = await savePlan(file.name, await file.text())
  if (error) return toast(friendlyError(error, 'load that plan'), { error: true })
  const doubles = plan.days.filter(d => d.sessions.length > 1).length
  toast(`Plan loaded: ${plan.days.length} days${doubles ? ` (${doubles} with more than one session)` : ''}, ${formatDate(plan.start, { month: 'short', day: 'numeric' })} to ${formatDate(plan.end, { month: 'short', day: 'numeric' })}`)
}

export function choosePlanFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.csv,text/csv'
  input.addEventListener('change', () => loadFile(input.files[0]))
  input.click()
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
