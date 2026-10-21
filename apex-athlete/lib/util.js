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

export function openModal(innerHtml, { width = 480 } = {}) {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `<div class="card modal" role="dialog" aria-modal="true" style="max-width:${width}px">${innerHtml}</div>`
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey) }
  const onKey = e => { if (e.key === 'Escape') close() }
  overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('[data-close]')) close() })
  document.addEventListener('keydown', onKey)
  document.body.appendChild(overlay)
  if (window.lucide) window.lucide.createIcons()
  return { el: overlay, close }
}

export function refreshIcons() {
  if (window.lucide) window.lucide.createIcons()
}
