// Progress — weekly volume, training load and ACWR, ride mix, goal countdown.
import { weeklySummary, acwrOn, acwrStatus, rideType, isDone, sum, estimatedTss } from '../lib/metrics.js'
import { esc, dateKey, addDays, parseKey, formatDuration } from '../lib/util.js'
import { openRideForm } from './RideForm.js'

const charts = []

export function renderProgress(state) {
  const weeks = weeklySummary(state.rides, 12)
  const thisWeek = weeks[weeks.length - 1]
  const prior4 = weeks.slice(-5, -1)
  const avgMinutes = sum(prior4, 'minutes') / 4
  const acwr = acwrOn(state.rides)
  const status = acwrStatus(acwr)
  const ftp = Number(state.profile?.ftp_watts) || null

  const since = dateKey(addDays(new Date(), -56))
  const recent = state.rides.filter(r => isDone(r) && r.ride_date >= since)
  const mix = {}
  for (const r of recent) mix[r.ride_type] = (mix[r.ride_type] || 0) + (Number(r.duration_min) || 0)
  const mixTotal = Object.values(mix).reduce((a, b) => a + b, 0)
  const tssRides = recent.map(r => estimatedTss(r, ftp)).filter(v => v !== null)

  const goal = state.profile?.goal_event && state.profile?.goal_date ? state.profile : null
  const daysToGoal = goal ? Math.ceil((parseKey(goal.goal_date) - parseKey(dateKey())) / 86400000) : null

  const wrap = document.createElement('div')
  wrap.className = 'stack'

  if (!state.rides.some(isDone)) {
    wrap.innerHTML = `
      <div class="page-head"><h1 class="page-title" tabindex="-1">Progress</h1></div>
      <div class="card empty">
        <p>No completed rides yet.</p>
        <p>Weekly volume, training load and your ride mix appear here once you log rides with a duration and an effort rating.</p>
        <button class="btn btn-primary" id="empty-log">Log a ride</button>
      </div>`
    wrap.querySelector('#empty-log').addEventListener('click', () => openRideForm({ status: 'completed' }))
    return wrap
  }

  wrap.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title" tabindex="-1">Progress</h1>
        <p class="page-sub">Last 12 weeks of riding</p>
      </div>
      ${goal && daysToGoal >= 0 ? `
        <div class="goal-pill">
          <span class="kpi-value">${daysToGoal}</span>
          <span class="small">days to ${esc(goal.goal_event)}</span>
        </div>` : ''}
    </div>

    <div class="kpi-row" role="list">
      ${kpi('This week', formatDuration(thisWeek.minutes), `${thisWeek.count} rides, ${Math.round(thisWeek.km)} km`, 'var(--color-primary)')}
      ${kpi('4-week average', formatDuration(Math.round(avgMinutes)), 'per week', 'var(--color-blue)')}
      ${kpi('Acute:chronic', acwr !== null ? acwr.toFixed(2) : '—', status.label, status.color)}
      ${ftp
        ? kpi('FTP', `${ftp} W`, state.profile.weight_kg ? `${(ftp / state.profile.weight_kg).toFixed(2)} W/kg` : 'Add weight in Profile for W/kg', 'var(--color-gold)')
        : kpi('Elevation (wk)', `${Math.round(thisWeek.elevation).toLocaleString()} m`, 'climbed this week', 'var(--color-gold)')}
    </div>

    <div class="charts-row">
      <section class="section">
        <div class="section-head"><h2>Weekly volume</h2><span class="faint small">Hours (bars) and km (line)</span></div>
        <div class="chart-box"><canvas id="volume-chart" role="img" aria-label="Bar chart of weekly hours and distance for the last 12 weeks"></canvas></div>
      </section>
      <section class="section">
        <div class="section-head"><h2>Training load</h2><span class="faint small">RPE × minutes. ACWR sweet spot 0.8 to 1.3</span></div>
        <div class="chart-box"><canvas id="load-chart" role="img" aria-label="Bar chart of weekly training load with acute to chronic ratio line"></canvas></div>
      </section>
    </div>

    <div class="grid-2">
      <section class="section">
        <div class="section-head"><h2>Ride mix</h2><span class="faint small">Time by type, last 8 weeks</span></div>
        ${mixTotal ? `
          <div class="stack-sm">
            ${Object.entries(mix).sort((a, b) => b[1] - a[1]).map(([type, mins]) => {
              const t = rideType(type)
              const pct = Math.round((mins / mixTotal) * 100)
              return `
                <div class="bar-row">
                  <span class="small">${t.label}</span>
                  <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${t.color}"></div></div>
                  <span class="small tabular">${pct}%</span>
                </div>`
            }).join('')}
          </div>` : `<p class="muted small">No completed rides in the last 8 weeks.</p>`}
      </section>
      <section class="section">
        <div class="section-head"><h2>Last 8 weeks</h2></div>
        <div class="stat-grid">
          <div class="stat"><span class="faint small">Rides</span><span class="kpi-value stat-value">${recent.length}</span></div>
          <div class="stat"><span class="faint small">Time</span><span class="kpi-value stat-value">${formatDuration(sum(recent, 'duration_min'))}</span></div>
          <div class="stat"><span class="faint small">Distance</span><span class="kpi-value stat-value">${Math.round(sum(recent, 'distance_km')).toLocaleString()} km</span></div>
          <div class="stat"><span class="faint small">Climbing</span><span class="kpi-value stat-value">${Math.round(sum(recent, 'elevation_m')).toLocaleString()} m</span></div>
          <div class="stat"><span class="faint small">Longest ride</span><span class="kpi-value stat-value">${formatDuration(Math.max(0, ...recent.map(r => r.duration_min || 0)))}</span></div>
          <div class="stat"><span class="faint small">Est. TSS / week</span><span class="kpi-value stat-value">${tssRides.length ? Math.round(tssRides.reduce((a, b) => a + b, 0) / 8) : '—'}</span></div>
        </div>
        ${!ftp ? `<p class="faint small" style="margin-top:var(--space-3)">Set your FTP in Profile to estimate TSS from average power.</p>` : ''}
      </section>
    </div>
  `

  requestAnimationFrame(() => drawCharts(wrap, weeks))
  return wrap
}

function kpi(label, value, sub, color) {
  return `
    <div class="kpi" role="listitem" style="--kpi-color:${color}">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value kpi-big">${value}</div>
      <div class="faint small">${sub}</div>
    </div>`
}

function drawCharts(wrap, weeks) {
  if (!window.Chart || !wrap.isConnected) return
  while (charts.length) charts.pop().destroy()

  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  window.Chart.defaults.font.family = css('--font')
  const grid = { color: css('--color-divider') }
  const ticks = { color: css('--color-text-muted'), font: { size: 11 } }
  const labels = weeks.map(w => w.label)
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { labels: { color: css('--color-text-muted'), boxWidth: 10, font: { size: 11 } } } }
  }

  charts.push(new window.Chart(wrap.querySelector('#volume-chart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Hours', data: weeks.map(w => +(w.minutes / 60).toFixed(1)), backgroundColor: css('--color-primary'), borderRadius: 4, yAxisID: 'y' },
        { label: 'km', type: 'line', data: weeks.map(w => Math.round(w.km)), borderColor: css('--color-blue'), backgroundColor: css('--color-blue'), tension: 0.3, pointRadius: 2, yAxisID: 'y1' }
      ]
    },
    options: {
      ...base,
      scales: {
        x: { grid, ticks },
        y: { grid, ticks, beginAtZero: true, title: { display: true, text: 'h', color: ticks.color } },
        y1: { position: 'right', grid: { display: false }, ticks, beginAtZero: true, title: { display: true, text: 'km', color: ticks.color } }
      }
    }
  }))

  charts.push(new window.Chart(wrap.querySelector('#load-chart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Load (AU)', data: weeks.map(w => w.load), backgroundColor: css('--color-surface-dynamic'), borderRadius: 4, yAxisID: 'y' },
        { label: 'ACWR', type: 'line', data: weeks.map(w => w.acwr), borderColor: css('--color-purple'), backgroundColor: css('--color-purple'), tension: 0.3, pointRadius: 2, spanGaps: true, yAxisID: 'y1' }
      ]
    },
    options: {
      ...base,
      scales: {
        x: { grid, ticks },
        y: { grid, ticks, beginAtZero: true },
        y1: { position: 'right', min: 0, max: 2, grid: { display: false }, ticks }
      }
    }
  }))
}
