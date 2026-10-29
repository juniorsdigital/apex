// Motion: page entrances, sideways slides between days or months, and touch
// swipes that follow the finger. Everything is skipped under reduced motion.

const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
const busy = new WeakSet()

export function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Fade a freshly shown page up into place. */
export function enterPage(el) {
  if (!el || reducedMotion() || !el.animate) return
  el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
    { duration: 240, easing: EASE_OUT })
}

/** Slide `el` out towards where `dir` came from. dir 1 = next (moves left), -1 = previous. */
export async function slideOut(el, dir) {
  const from = el.style.transform || 'none'
  el.style.transform = ''
  if (reducedMotion() || !el.animate) return
  const anim = el.animate([{ transform: from }, { transform: `translateX(${-dir * 30}%)`, opacity: 0 }],
    { duration: 150, easing: 'ease-in', fill: 'forwards' })
  await anim.finished.catch(() => {})
  // Hidden until slideIn takes over, so the old content never flashes back.
  el.style.opacity = '0'
  anim.cancel()
}

/** Slide new content in from the side `dir` points to. */
export function slideIn(el, dir) {
  if (!el) return
  el.style.opacity = ''
  if (reducedMotion() || !el.animate) return
  el.animate([{ transform: `translateX(${dir * 30}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: 240, easing: EASE_OUT })
}

/** Slide out, swap the content, slide back in. Ignores calls while one is running. */
export async function slidePane(el, dir, swap) {
  if (busy.has(el)) return
  busy.add(el)
  try {
    await slideOut(el, dir)
    await swap()
    slideIn(el, dir)
  } finally {
    busy.delete(el)
  }
}

/** Return a dragged element to where it started. */
export function snapBack(el) {
  const from = el.style.transform
  el.style.transform = ''
  if (from && !reducedMotion() && el.animate) {
    el.animate([{ transform: from }, { transform: 'none' }], { duration: 200, easing: EASE_OUT })
  }
}

/**
 * Horizontal swipe on `el`. While dragging, `target()` follows the finger
 * (with resistance when `canGo(dir)` is false). A long or quick enough swipe
 * calls `onSwipe(dir)`: 1 when swiped left (next), -1 when swiped right (previous).
 * Swipes starting in text fields or `[data-no-swipe]` are left alone.
 */
export function swipeable(el, { target = () => el, canGo = () => true, onSwipe }) {
  let start = null
  let axis = null
  let dx = 0

  el.addEventListener('touchstart', e => {
    start = null
    if (e.touches.length !== 1 || e.target.closest('textarea, input[type="range"], [data-no-swipe]')) return
    const t = e.touches[0]
    start = { x: t.clientX, y: t.clientY, time: e.timeStamp }
    axis = null
    dx = 0
  }, { passive: true })

  el.addEventListener('touchmove', e => {
    if (!start) return
    const t = e.touches[0]
    const mx = t.clientX - start.x, my = t.clientY - start.y
    if (!axis) {
      if (Math.abs(mx) < 10 && Math.abs(my) < 10) return
      axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
    }
    if (axis !== 'x') return
    e.preventDefault()
    dx = mx
    const pane = target()
    if (!pane || busy.has(pane)) return
    pane.style.transform = `translateX(${canGo(dx < 0 ? 1 : -1) ? dx : dx / 4}px)`
  }, { passive: false })

  const end = e => {
    if (!start || axis !== 'x') { start = null; return }
    const pane = target()
    const dir = dx < 0 ? 1 : -1
    const speed = Math.abs(dx) / Math.max(1, e.timeStamp - start.time)
    const far = Math.abs(dx) > Math.min(120, (pane?.offsetWidth || 300) * 0.25)
    const quick = speed > 0.5 && Math.abs(dx) > 40
    start = null
    if (!pane || busy.has(pane)) return
    if (e.type === 'touchend' && canGo(dir) && (far || quick)) onSwipe(dir)
    else snapBack(pane)
  }
  el.addEventListener('touchend', end)
  el.addEventListener('touchcancel', end)
}

/**
 * Grow the next screen out of `origin` (the button pressed) as a widening
 * circle until it covers the old one. Uses view transitions where the browser
 * has them, so the old screen stays visible underneath; elsewhere the new
 * screen grows over the page background. `swap` must render synchronously.
 */
export function grow(origin, swap) {
  const r = origin?.isConnected ? origin.getBoundingClientRect() : null
  const x = r ? r.left + r.width / 2 : innerWidth / 2
  const y = r ? r.top + r.height / 2 : innerHeight / 2
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`]
  const timing = { duration: 560, easing: 'cubic-bezier(0.65, 0, 0.25, 1)' }

  if (reducedMotion()) return swap()
  if (document.startViewTransition) {
    const t = document.startViewTransition(swap)
    t.ready.then(() => document.documentElement.animate({ clipPath }, { ...timing, pseudoElement: '::view-transition-new(root)' }))
      .catch(() => {})
    return
  }
  swap()
  document.getElementById('app')?.firstElementChild?.animate?.({ clipPath }, timing)
}
