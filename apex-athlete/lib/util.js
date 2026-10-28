// Small shared helpers: HTML escaping, local dates, modals.

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ))
}

// YYYY-MM-DD in the rider's local timezone (toISOString would use UTC).
export function dateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// Monday of the week containing `date`.
export function startOfWeek(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export function formatDate(key, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return parseKey(key).toLocaleDateString(undefined, opts)
}

export function formatDuration(minutes) {
  if (!minutes) return '0m'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Modal dialog: labelled by its first heading, keeps Tab inside, and hands
// focus back to whatever opened it (or the page heading if that was re-rendered).
// It fades and rises in, and plays the reverse before it leaves. On phones it
// is a bottom sheet that can be dragged down by its header to close.
export function openModal(innerHtml, { width = 480 } = {}) {
  const opener = document.activeElement
  const openerId = opener?.id
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `<div class="card modal" role="dialog" aria-modal="true" style="max-width:${width}px">${innerHtml}</div>`
  const dialog = overlay.firstElementChild
  const heading = dialog.querySelector('h2')
  if (heading) {
    heading.id ||= 'modal-title'
    dialog.setAttribute('aria-labelledby', heading.id)
  }

  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    document.removeEventListener('keydown', onKey)
    overlay.classList.add('is-closing')
    // getAnimations() flushes styles, so it sees the closing animations.
    const done = Promise.allSettled(overlay.getAnimations?.({ subtree: true }).map(a => a.finished) || [])
    Promise.race([done, new Promise(r => setTimeout(r, 400))]).then(() => overlay.remove())
    const target = opener?.isConnected ? opener
      : (openerId && document.getElementById(openerId)) || document.querySelector('.page-title')
    target?.focus()
  }
  const onKey = e => {
    if (e.key === 'Escape') return close()
    if (e.key !== 'Tab') return
    const items = [...dialog.querySelectorAll(FOCUSABLE)].filter(n => n.offsetParent !== null)
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
  overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('[data-close]')) close() })
  document.addEventListener('keydown', onKey)
  dragToClose(dialog, close)
  document.body.appendChild(overlay)
  if (window.lucide) window.lucide.createIcons()
  return { el: overlay, close }
}

// Bottom sheets (phones) follow the finger down from the header; far or fast enough closes.
function dragToClose(dialog, close) {
  const sheet = window.matchMedia('(max-width: 768px)')
  let start = null
  let dy = 0
  dialog.addEventListener('touchstart', e => {
    start = null
    if (!sheet.matches || e.touches.length !== 1 || !e.target.closest('.modal-head')) return
    start = { y: e.touches[0].clientY, x: e.touches[0].clientX, time: e.timeStamp }
    dy = 0
  }, { passive: true })
  dialog.addEventListener('touchmove', e => {
    if (!start) return
    const t = e.touches[0]
    dy = t.clientY - start.y
    if (Math.abs(t.clientX - start.x) > Math.abs(dy) && !dialog.classList.contains('is-dragging')) { start = null; return }
    e.preventDefault()
    dialog.classList.add('is-dragging')
    dialog.style.transform = `translateY(${Math.max(0, dy)}px)`
  }, { passive: false })
  const end = e => {
    if (!start) return
    const speed = dy / Math.max(1, e.timeStamp - start.time)
    start = null
    dialog.classList.remove('is-dragging')
    if (e.type === 'touchend' && (dy > Math.min(140, dialog.offsetHeight * 0.3) || (speed > 0.5 && dy > 40))) return close()
    dialog.style.transform = ''
  }
  dialog.addEventListener('touchend', end)
  dialog.addEventListener('touchcancel', end)
}

// Short confirmation at the bottom of the screen, announced to screen readers.
// `action` adds one button (e.g. Undo) that also dismisses the toast.
export function toast(message, { action, error = false } = {}) {
  let region = document.getElementById('toasts')
  if (!region) {
    region = document.createElement('div')
    region.id = 'toasts'
    region.className = 'toasts'
    region.setAttribute('role', 'status')
    region.setAttribute('aria-live', 'polite')
    document.body.appendChild(region)
  }
  const item = document.createElement('div')
  item.className = `toast ${error ? 'is-error' : ''}`
  item.innerHTML = `<span>${esc(message)}</span>${action ? `<button class="btn btn-ghost btn-sm">${esc(action.label)}</button>` : ''}`
  const dismiss = () => item.remove()
  item.querySelector('button')?.addEventListener('click', () => { dismiss(); action.onClick() })
  region.appendChild(item)
  setTimeout(dismiss, action || error ? 8000 : 4000)
}

// Turn store errors into a sentence that says what failed and what to do.
export function friendlyError(error, action) {
  const msg = error?.message || ''
  if (!msg || /fetch|network|failed to|load failed/i.test(msg)) {
    return `Couldn't ${action}. Check your connection and try again.`
  }
  return `Couldn't ${action}: ${msg}`
}

/**
 * Validate visible fields, showing a message under each invalid one.
 * Uses the inputs' own constraints (required, min, max, step).
 * @param {HTMLFormElement} form
 * @param {Object<string, string>} [missing]  message per field name when empty
 * @returns {boolean} true when every visible field is valid
 */
export function validateForm(form, missing = {}) {
  let firstBad = null
  for (const input of form.querySelectorAll('input, select, textarea')) {
    if (input.type === 'radio' || input.offsetParent === null) continue
    const v = input.validity
    let message = ''
    if (v.valueMissing) message = missing[input.name] || 'Fill in this field.'
    else if (v.badInput) message = 'Enter a number.'
    else if (v.typeMismatch && input.type === 'email') message = 'Enter a full email address, like name@example.com.'
    else if (v.rangeUnderflow || v.rangeOverflow) message = `Enter a value from ${input.min || 0} to ${input.max}.`
    else if (v.stepMismatch) {
      const places = (input.step.split('.')[1] || '').length
      message = places ? `Use at most ${places} decimal place${places > 1 ? 's' : ''}.` : 'Enter a whole number.'
    }
    else if (!v.valid) message = input.validationMessage
    setFieldError(input, message)
    if (message && !firstBad) firstBad = input
  }
  firstBad?.focus()
  return !firstBad
}

export function setFieldError(input, message) {
  const id = `${input.id}-error`
  let box = document.getElementById(id)
  if (!message) {
    box?.remove()
    input.removeAttribute('aria-invalid')
    input.removeAttribute('aria-describedby')
    return
  }
  if (!box) {
    box = document.createElement('div')
    box.id = id
    box.className = 'field-error'
    input.insertAdjacentElement('afterend', box)
  }
  box.textContent = message
  input.setAttribute('aria-invalid', 'true')
  input.setAttribute('aria-describedby', id)
}

// Clear a field's error as soon as the rider edits it.
export function clearErrorsOnInput(form) {
  form.addEventListener('input', e => {
    if (e.target.getAttribute?.('aria-invalid')) setFieldError(e.target, '')
  })
}

export function refreshIcons() {
  if (window.lucide) window.lucide.createIcons()
}
