import { buildWeeklyLoads, calcACWR, getACWRStatus } from '../shared/apex-data-helpers.js'

export function renderProgress(state) {
  const workouts = state.workouts || []
  const weeklyLoads = buildWeeklyLoads(workouts, 8)
  const dailyLoads = workouts.map(w => (w.rpe || 5) * (w.duration_minutes || 0))
  const acwr = calcACWR(dailyLoads.length >= 28 ? dailyLoads : new Array(28).fill(0))
  const acwrStatus = getACWRStatus(acwr)

  const completed = workouts.filter(w => w.status === 'completed').length
  const total = workouts.filter(w => w.status !== 'skipped').length
  const complianceRate = total > 0 ? Math.round((completed / total) * 100) : 0
  const thisWeekLoad = weeklyLoads.length ? weeklyLoads[weeklyLoads.length - 1].load : 0

  // Phase progress — derive from workouts date range
  const sortedDates = workouts.map(w => w.workout_date).sort()
  const firstDate = sortedDates[0] ? new Date(sortedDates[0]) : new Date()
  const weeksSinceStart = Math.max(1, Math.floor((new Date() - firstDate) / (7 * 24 * 60 * 60 * 1000)))
  const phaseWeeks = 12
  const phaseProgress = Math.min(weeksSinceStart, phaseWeeks)

  const wrap = document.createElement('div')
  wrap.innerHTML = `
    <div style="margin-bottom:var(--space-6)">
      <h1 style="font-size:var(--text-lg);font-weight:700">My Progress</h1>
      <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-1)">Training load, ACWR, and compliance trends</p>
    </div>

    <!-- KPI row -->
    <div class="kpi-row" style="margin-bottom:var(--space-4)">
      <div class="card card-sm" style="border-top:2px solid var(--color-primary)">
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-2)">Compliance</div>
        <div class="kpi-value" style="font-size:var(--text-xl);color:var(--color-primary)">${complianceRate}%</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-1)">${completed} of ${total} sessions done</div>
      </div>
      <div class="card card-sm" style="border-top:2px solid ${acwrStatus.color}">
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-2)">ACWR</div>
        <div class="kpi-value" style="font-size:var(--text-xl);color:${acwrStatus.color}">${acwr !== null ? acwr.toFixed(2) : '—'}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-1)">${acwrStatus.label}</div>
      </div>
      <div class="card card-sm" style="border-top:2px solid var(--color-gold)">
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-2)">This Week</div>
        <div class="kpi-value" style="font-size:var(--text-xl);color:var(--color-gold)">${thisWeekLoad.toLocaleString()}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-1)">AU (sRPE × min)</div>
      </div>
      <div class="card card-sm" style="border-top:2px solid var(--color-blue)">
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-2)">Total Sessions</div>
        <div class="kpi-value" style="font-size:var(--text-xl);color:var(--color-blue)">${workouts.length}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-1)">logged</div>
      </div>
    </div>

    <!-- Phase progress bar -->
    <div class="card" style="margin-bottom:var(--space-4)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
        <div>
          <h2 style="font-size:var(--text-sm);font-weight:600">Training Phase Progress</h2>
          <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:2px">Week ${phaseProgress} of ${phaseWeeks} — Endurance Block</p>
        </div>
        <span class="badge badge-primary">Week ${phaseProgress}</span>
      </div>
      <div style="height:8px;background:var(--color-surface-offset);border-radius:var(--radius-full);overflow:hidden">
        <div style="height:100%;width:${(phaseProgress / phaseWeeks) * 100}%;background:linear-gradient(90deg,var(--color-primary),var(--color-blue));border-radius:var(--radius-full);transition:width 0.8s ease"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:var(--space-2)">
        <span style="font-size:10px;color:var(--color-text-faint)">Start</span>
        <span style="font-size:10px;color:var(--color-text-faint)">Week ${Math.round(phaseWeeks / 2)} — Peak</span>
        <span style="font-size:10px;color:var(--color-text-faint)">Week ${phaseWeeks} — Taper</span>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-row">
      <div class="card">
        <h2 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-1)">Weekly Load (AU)</h2>
        <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-4)">sRPE × minutes per week</p>
        <canvas id="athlete-load-chart" height="200" aria-label="Weekly training load"></canvas>
      </div>
      <div class="card">
        <h2 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-1)">ACWR Trend</h2>
        <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-4)">Sweet spot: 0.80–1.30</p>
        <canvas id="athlete-acwr-chart" height="200" aria-label="ACWR trend"></canvas>
      </div>
    </div>

    <!-- Compliance bar -->
    <div class="card" style="margin-top:var(--space-4)">
      <h2 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-4)">Session Compliance Breakdown</h2>
      <div style="display:flex;gap:var(--space-3);align-items:center;margin-bottom:var(--space-3)">
        ${[
          { label: 'Completed', status: 'completed', color: 'var(--color-success)' },
          { label: 'Skipped',   status: 'skipped',   color: 'var(--color-error)' },
          { label: 'Assigned',  status: 'assigned',  color: 'var(--color-primary)' },
        ].map(item => {
          const count = workouts.filter(w => w.status === item.status).length
          const pct = workouts.length > 0 ? Math.round((count / workouts.length) * 100) : 0
          return `
            <div style="display:flex;align-items:center;gap:var(--space-2)">
              <span style="width:10px;height:10px;border-radius:50%;background:${item.color}"></span>
              <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${item.label}</span>
              <span style="font-size:var(--text-xs);font-variant-numeric:tabular-nums;font-weight:600">${pct}%</span>
            </div>
          `
        }).join('')}
      </div>
      <div style="height:12px;background:var(--color-surface-offset);border-radius:var(--radius-full);overflow:hidden;display:flex">
        ${[
          { status: 'completed', color: 'var(--color-success)' },
          { status: 'skipped',   color: 'var(--color-error)' },
          { status: 'assigned',  color: 'var(--color-primary)' },
        ].map(item => {
          const pct = workouts.length > 0
            ? Math.round((workouts.filter(w => w.status === item.status).length / workouts.length) * 100)
            : 0
          return `<div style="width:${pct}%;background:${item.color};transition:width 0.6s ease"></div>`
        }).join('')}
      </div>
    </div>
  `

  requestAnimationFrame(() => {
    if (!window.Chart) return
    const labels = weeklyLoads.map(w => w.label.replace(/\d{4}-/, ''))
    const chartDefaults = {
      responsive: true,
      plugins: { legend: { display: false } },
    }
    const gridStyle = { color: 'rgba(255,255,255,0.04)' }
    const tickStyle = { color: '#8a8a95', font: { size: 11 } }

    new window.Chart(wrap.querySelector('#athlete-load-chart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: weeklyLoads.map(w => w.load),
          backgroundColor: 'rgba(0,201,177,0.6)',
          borderColor: '#00c9b1',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: { ...chartDefaults, scales: { x: { grid: gridStyle, ticks: tickStyle }, y: { grid: gridStyle, ticks: tickStyle, beginAtZero: true } } }
    })

    new window.Chart(wrap.querySelector('#athlete-acwr-chart'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { data: weeklyLoads.map(() => acwr), borderColor: '#a78bfa', tension: 0.3, pointRadius: 3, fill: false, label: 'ACWR' },
          { data: weeklyLoads.map(() => 1.30), borderColor: 'rgba(251,191,36,0.3)', borderDash: [5,5], pointRadius: 0, fill: false },
          { data: weeklyLoads.map(() => 0.80), borderColor: 'rgba(96,165,250,0.3)', borderDash: [5,5], pointRadius: 0, fill: false }
        ]
      },
      options: { ...chartDefaults, scales: { x: { grid: gridStyle, ticks: tickStyle }, y: { min: 0, max: 2, grid: gridStyle, ticks: tickStyle } } }
    })
  })

  return wrap
}
