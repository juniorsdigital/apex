// The season drawn as one long route: weekly planned hours are the elevation,
// phases colour the ground, races are flags, and a dot marks where you are.
import { raceInfo, isEvent, daysUntil, formatHours } from '../lib/plan.js'
import { esc, dateKey, formatDate } from '../lib/util.js'

// Colour by training phase family, easy → specific.
export function phaseColor(name) {
  if (/taper|nationals/i.test(name)) return 'var(--kind-race)'
  if (/specific|peak/i.test(name)) return 'var(--kind-hard)'
  if (/build/i.test(name)) return 'var(--kind-threshold)'
  if (/bridge/i.test(name)) return 'var(--kind-easy)'
  return 'var(--kind-endurance)'
}

let uid = 0

/**
 * @param {Object} plan    parsed plan
 * @param {Object} [opts]
 * @param {boolean} [opts.labels]  show race names under the flags
 */
export function seasonProfileHtml(plan, { labels = true } = {}) {
  const id = `sp${++uid}`
  const W = 1000, H = 200, base = 196, top = 14
  const total = daysUntil(plan.end, plan.start) + 1
  const xOf = date => ((daysUntil(date, plan.start) + 0.5) / total) * W
  const max = Math.max(...plan.weeks.map(w => w.hours / w.days.length * 7))

  // One point per week at its middle day; partial weeks scaled to 7 days.
  const pts = plan.weeks.map(w => {
    const mid = w.days[Math.floor(w.days.length / 2)].date
    return [xOf(mid), base - ((w.hours / w.days.length * 7) / max) * (base - top)]
  })
  pts.unshift([0, pts[0][1]])
  pts.push([W, pts[pts.length - 1][1]])
  const line = pts.reduce((d, [px, py], i) => {
    if (i === 0) return `M${px.toFixed(1)},${py.toFixed(1)}`
    const [qx, qy] = pts[i - 1]
    const mx = ((qx + px) / 2).toFixed(1)
    return `${d} C${mx},${qy.toFixed(1)} ${mx},${py.toFixed(1)} ${px.toFixed(1)},${py.toFixed(1)}`
  }, '')
  const area = `${line} L${W},${base} L0,${base} Z`

  const today = dateKey()
  const inPlan = today >= plan.start && today <= plan.end
  const hereX = inPlan ? xOf(today) : today < plan.start ? 0 : W
  const races = plan.days.filter(isEvent)
  const pct = x => `${(x / W) * 100}%`

  const summary = `Season profile from ${formatDate(plan.start)} to ${formatDate(plan.end)}. Weekly planned hours peak at ${formatHours(max)}. ` +
    races.map(r => `${raceInfo(r).name} on ${formatDate(r.date)}`).join('. ')

  return `
    <figure class="season" role="img" aria-label="${esc(summary)}">
      <div class="season-plot">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
          <defs><clipPath id="${id}-clip"><path d="${area}"/></clipPath></defs>
          <g clip-path="url(#${id}-clip)">
            ${plan.phases.map(p => {
              const x0 = (daysUntil(p.start, plan.start) / total) * W
              const x1 = ((daysUntil(p.end, plan.start) + 1) / total) * W
              return `<rect x="${x0.toFixed(1)}" y="0" width="${(x1 - x0).toFixed(1)}" height="${H}" fill="${phaseColor(p.name)}" class="season-band ${p.end < today ? 'is-past' : ''}"/>`
            }).join('')}
          </g>
          <path class="season-line" d="${line}"/>
          <line class="season-base" x1="0" y1="${base}" x2="${W}" y2="${base}"/>
          ${inPlan ? `<line class="season-here-line" x1="${hereX}" y1="0" x2="${hereX}" y2="${base}"/>` : ''}
        </svg>
        ${races.map(r => `
          <span class="season-flag ${r.date < today ? 'is-past' : ''} ${r === plan.goal ? 'is-goal' : ''}" style="left:${pct(xOf(r.date))}" title="${esc(raceInfo(r).name)}, ${formatDate(r.date)}">
            <i data-lucide="flag" aria-hidden="true"></i>
          </span>`).join('')}
        ${inPlan ? `<span class="season-here" style="left:${pct(hereX)}"><span>You</span></span>` : ''}
      </div>
      ${labels ? `
        <div class="season-labels" aria-hidden="true">
          ${races.filter(r => r === plan.goal || xOf(plan.goal.date) - xOf(r.date) > W * 0.1).map(r => `
            <span class="season-label ${r === plan.goal ? 'is-goal' : ''}" style="left:${pct(xOf(r.date))}">
              <b>${esc(shortRace(r))}</b>${formatDate(r.date, { month: 'short', day: 'numeric' })}
            </span>`).join('')}
        </div>` : ''}
    </figure>`
}

function shortRace(day) {
  if (/nationals/i.test(day.dayType)) return 'Nationals'
  const name = raceInfo(day).name
  return name.replace(/\s*gran fondo\s*/i, ' ').replace(/^tour of /i, '').trim().split(/\s+/).slice(0, 2).join(' ')
}
