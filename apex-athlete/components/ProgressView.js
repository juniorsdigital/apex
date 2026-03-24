import { buildWeeklyLoads, calcACWR, getACWRStatus } from '../../shared/apex-data-helpers.js'

export function renderProgress(state) {
  const workouts = state.workouts || []
  const weeklyLoads = buildWeeklyLoads(workouts, 8)
  const dailyLoads = workouts.map(w => (w.rpe || 5) * (w.duration_minutes || 0))
  const acwr = calcACWR(dailyLoads.length >= 28 ? dailyLoads : new Array(28).fill(0))
  const acwrStatus = getACWRStatus(acwr)

  const completed = workouts.filter(w => w.status === 'completed').length
  const total = workouts.filter(w => w.status !== 'skipped').length
  const complianceRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const wrap = document.createElement('div')
  wrap.innerHTML = `
    <div style="margin-bottom:var(--space-6)">
      <h1 style="font-size:var(--text-lg);font-weight:700">My Progress</h1>
      <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-1)">Weekly load trends and training compliance</p>
    </div>

    <!-- Stats row -->
    <div class="kpi-row" style="margin-bottom:var(--space-4)">
      <div class="card card-sm" style="border-top:2px solid var(--color-primary)">
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-2)">Compliance</div>
        <div class="kpi-value" style="font-size:var(--text-xl);color:var(--color-primary)">${complianceRate}%</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${completed} of ${total} sessions done</div>
      </div>
      <div class="card card-sm" style="border-top:2px solid ${acwrStatus.color}">
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-2)">ACWR</div>
        <div class="kpi-value" style="font-size:var(--text-xl);color:${acwrStatus.color}">${acwr !== null ? acwr.toFixed(2) : '—'}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${acwrStatus.label}</div>
      </div>
      <div class="card card-sm" style="border-top:2px solid var(--color-gold)">
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-2)">This Week</div>
        <div class="kpi-value" style="font-size:var(--text-xl);color:var(--color-gold)">${weeklyLoads.length ? weeklyLoads[weeklyLoads.length-1].load.toLocaleString() : '0'}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-muted)">AU (sRPE × min)</div>
      </div>
      <div class="card card-sm" style="border-top:2px solid var(--color-blue)">
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-2)">Workouts Logged</div>
        <div class="kpi-value" style="font-size:var(--text-xl);color:var(--color-blue)">${workouts.length}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-muted)">total sessions</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-row">
      <div class="card">
        <h2 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-1)">Weekly Load (AU)</h2>
        <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-4)">sRPE × minutes per week</p>
        <canvas id="athlete-load-chart" height="200"></canvas>
      </div>
      <div class="card">
        <h2 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-1)">ACWR Trend</h2>
        <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-4)">Sweet spot: 0.80–1.30</p>
        <canvas id="athlete-acwr-chart" height="200"></canvas>
      </div>
    </div>
  `

  requestAnimationFrame(() => {
    if (!window.Chart) return
    const labels = weeklyLoads.map(w => w.label.replace(/\d{4}-/, ''))

    new window.Chart(wrap.querySelector('#athlete-load-chart'), {
      type: 'bar',
      data: { labels, datasets: [{ data: weeklyLoads.map(w => w.load), backgroundColor: 'rgba(0,201,177,0.6)', borderColor: '#00c9b1', borderWidth: 1, borderRadius: 4 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#8a8a95', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { ticks: { color: '#8a8a95', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true } } }
    })

    new window.Chart(wrap.querySelector('#athlete-acwr-chart'), {
      type: 'line',
      data: { labels, datasets: [
        { data: weeklyLoads.map(() => acwr), borderColor: '#a78bfa', tension: 0.3, pointRadius: 3, fill: false },
        { data: weeklyLoads.map(() => 1.30), borderColor: 'rgba(251,191,36,0.3)', borderDash: [5,5], pointRadius: 0, fill: false },
        { data: weeklyLoads.map(() => 0.80), borderColor: 'rgba(96,165,250,0.3)', borderDash: [5,5], pointRadius: 0, fill: false }
      ]},
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#8a8a95', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { min: 0, max: 2, ticks: { color: '#8a8a95', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } } } }
    })
  })

  return wrap
}
