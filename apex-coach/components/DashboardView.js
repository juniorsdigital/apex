import { getWorkoutsForCoach } from '../../shared/apex-supabase.js'
import { buildWeeklyLoads, calcACWR, getACWRStatus, buildZoneDistribution } from '../../shared/apex-data-helpers.js'
import { renderKpiCard } from './KpiCard.js'

export function renderDashboard(state) {
  const wrap = document.createElement('div')

  // Compute metrics from workouts
  const workouts = state.workouts || []
  const weeklyLoads = buildWeeklyLoads(workouts, 12)
  const dailyLoads = workouts.map(w => (w.rpe || 5) * (w.duration_minutes || 0))
  const acwr = calcACWR(dailyLoads.length >= 28 ? dailyLoads : new Array(28).fill(0))
  const acwrStatus = getACWRStatus(acwr)

  const thisWeekLoad = weeklyLoads.length ? weeklyLoads[weeklyLoads.length - 1].load : 0
  const sessionsThisWeek = workouts.filter(w => {
    const d = new Date(w.workout_date)
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    return d >= startOfWeek
  })

  wrap.innerHTML = `
    <!-- KPI Row -->
    <section class="kpi-row" aria-label="Key performance indicators">
      <div id="kpi-weekly-load"></div>
      <div id="kpi-acwr"></div>
      <div id="kpi-cycle"></div>
      <div id="kpi-sessions"></div>
    </section>

    <!-- Charts Row -->
    <section class="charts-row" aria-label="Training load charts">
      <div class="card" id="load-chart-card">
        <div style="margin-bottom:var(--space-3)">
          <h2 style="font-size:var(--text-sm);font-weight:600">Weekly Load (sRPE × min)</h2>
          <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:2px">
            Total training load for each week based on session RPE × duration (AU)
          </p>
        </div>
        <canvas id="weekly-load-chart" height="200" aria-label="Weekly training load bar chart"></canvas>
      </div>
      <div class="card" id="acwr-chart-card">
        <div style="margin-bottom:var(--space-3)">
          <h2 style="font-size:var(--text-sm);font-weight:600">Week Load & ACWR Trend</h2>
          <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:2px">
            Ratio of this week's load vs 4-week average — sweet spot: 0.80–1.30
          </p>
        </div>
        <canvas id="acwr-chart" height="200" aria-label="ACWR trend line chart"></canvas>
      </div>
    </section>

    <!-- Bottom Row -->
    <section class="bottom-row" aria-label="Weekly plan and strain">
      <div class="card">
        <h2 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-3)">This Week's Plan</h2>
        <p style="font-size:var(--text-sm);color:var(--color-text-muted)">
          ${sessionsThisWeek.length > 0
            ? `${sessionsThisWeek.length} session${sessionsThisWeek.length > 1 ? 's' : ''} assigned this week.`
            : 'No sessions assigned yet. Use the Calendar view to build this week\'s plan.'
          }
        </p>
        ${sessionsThisWeek.length > 0 ? `
          <ul style="margin-top:var(--space-3);display:flex;flex-direction:column;gap:var(--space-2)">
            ${sessionsThisWeek.slice(0, 4).map(w => `
              <li style="display:flex;align-items:center;justify-content:space-between;font-size:var(--text-xs);padding:var(--space-2) var(--space-3);background:var(--color-surface-offset);border-radius:var(--radius-sm)">
                <span>${w.title || 'Session'}</span>
                <span class="badge badge-${w.status === 'completed' ? 'success' : 'primary'}">${w.status || 'assigned'}</span>
              </li>
            `).join('')}
          </ul>
        ` : ''}
      </div>
      <div class="card">
        <h2 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-2)">Strain Gauge</h2>
        <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-4)">
          Acute load readiness indicator (sRPE × minutes method)
        </p>
        <div style="display:flex;align-items:center;gap:var(--space-4)">
          <div style="flex:1;height:8px;background:var(--color-surface-offset);border-radius:var(--radius-full);overflow:hidden">
            <div style="height:100%;width:${Math.min((acwr || 0) / 1.6 * 100, 100)}%;background:${acwrStatus.color};border-radius:var(--radius-full);transition:width 0.6s ease"></div>
          </div>
          <span style="font-size:var(--text-sm);font-weight:700;font-variant-numeric:tabular-nums;color:${acwrStatus.color}">
            ${acwr !== null ? acwr.toFixed(2) : '—'}
          </span>
        </div>
        <p style="font-size:var(--text-xs);margin-top:var(--space-2)" style="color:${acwrStatus.color}">
          ${acwrStatus.label}
        </p>
      </div>
    </section>
  `

  // Inject KPI cards
  const kpiData = [
    {
      label: 'Weekly Load',
      value: thisWeekLoad.toLocaleString(),
      unit: 'AU',
      subtitle: 'sRPE × minutes this week',
      color: 'var(--color-primary)'
    },
    {
      label: 'ACWR',
      value: acwr !== null ? acwr.toFixed(2) : '—',
      unit: '',
      subtitle: `Target: 0.80–1.30 · ${acwrStatus.label}`,
      color: acwrStatus.color
    },
    {
      label: 'Current Cycle Phase',
      value: 'Endurance',
      unit: '',
      subtitle: 'Base aerobic capacity block',
      color: 'var(--color-blue)'
    },
    {
      label: 'Sessions This Week',
      value: sessionsThisWeek.length.toString(),
      unit: '',
      subtitle: `${sessionsThisWeek.filter(w => w.type === 'key').length} key · ${sessionsThisWeek.filter(w => w.type !== 'key').length} support`,
      color: 'var(--color-gold)'
    }
  ]

  const kpiIds = ['kpi-weekly-load', 'kpi-acwr', 'kpi-cycle', 'kpi-sessions']
  kpiIds.forEach((id, i) => {
    wrap.querySelector(`#${id}`).appendChild(renderKpiCard(kpiData[i]))
  })

  // Draw charts after DOM is attached (requestAnimationFrame ensures canvas is rendered)
  requestAnimationFrame(() => {
    drawLoadChart(wrap, weeklyLoads)
    drawACWRChart(wrap, weeklyLoads, dailyLoads)
  })

  return wrap
}

function drawLoadChart(wrap, weeklyLoads) {
  const canvas = wrap.querySelector('#weekly-load-chart')
  if (!canvas || !window.Chart) return

  const labels = weeklyLoads.map(w => w.label.replace(/\d{4}-/, ''))
  const data = weeklyLoads.map(w => w.load)

  new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Weekly Load (AU)',
        data,
        backgroundColor: 'rgba(0, 201, 177, 0.7)',
        borderColor: 'rgba(0, 201, 177, 1)',
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.raw} AU (sRPE × min)` } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8a8a95', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8a8a95', font: { size: 11 } }, beginAtZero: true }
      }
    }
  })
}

function drawACWRChart(wrap, weeklyLoads, dailyLoads) {
  const canvas = wrap.querySelector('#acwr-chart')
  if (!canvas || !window.Chart) return

  // Build rolling ACWR per week
  const acwrPoints = weeklyLoads.map((_, i) => {
    if (dailyLoads.length < 28) return null
    const slice = dailyLoads.slice(Math.max(0, (i - 3) * 7), (i + 1) * 7)
    if (slice.length < 7) return null
    const acute = slice.slice(-7).reduce((a, b) => a + b, 0)
    const chronic = slice.reduce((a, b) => a + b, 0) / (slice.length / 7)
    return chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : null
  })

  new window.Chart(canvas, {
    type: 'line',
    data: {
      labels: weeklyLoads.map(w => w.label.replace(/\d{4}-/, '')),
      datasets: [
        {
          label: 'ACWR',
          data: acwrPoints,
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(167,139,250,0.1)',
          tension: 0.4,
          pointRadius: 4,
          fill: true,
        },
        {
          label: 'Sweet Spot Upper (1.30)',
          data: weeklyLoads.map(() => 1.30),
          borderColor: 'rgba(251,191,36,0.4)',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'Sweet Spot Lower (0.80)',
          data: weeklyLoads.map(() => 0.80),
          borderColor: 'rgba(96,165,250,0.4)',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ctx.datasetIndex === 0 ? `ACWR: ${ctx.raw}` : ctx.dataset.label } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8a8a95', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8a8a95', font: { size: 11 } }, min: 0, max: 2 }
      }
    }
  })
}
