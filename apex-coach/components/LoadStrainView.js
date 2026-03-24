import { buildWeeklyLoads, buildZoneDistribution, calcACWR, getACWRStatus } from '../../shared/apex-data-helpers.js'

export function renderLoadStrain(state) {
  const wrap = document.createElement('div')
  const workouts = state.workouts || []
  const weeklyLoads = buildWeeklyLoads(workouts, 12)
  const zoneDist = buildZoneDistribution(workouts)
  const dailyLoads = workouts.map(w => (w.rpe || 5) * (w.duration_minutes || 0))
  const acwr = calcACWR(dailyLoads.length >= 28 ? dailyLoads : new Array(28).fill(0))
  const acwrStatus = getACWRStatus(acwr)

  const zoneColors = ['var(--chart-z1)','var(--chart-z2)','var(--chart-z3)','var(--chart-z4)','var(--chart-z5)','var(--chart-z6)','var(--chart-z7)']

  wrap.innerHTML = `
    <div style="margin-bottom:var(--space-6)">
      <h1 style="font-size:var(--text-lg);font-weight:700">Load & Strain Analysis</h1>
      <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-1)">
        Evidence-based load management using session-RPE × duration method (Foster et al., 1996)
      </p>
    </div>

    <!-- 12-week load + ACWR chart -->
    <div class="card" style="margin-bottom:var(--space-4)">
      <div style="margin-bottom:var(--space-4)">
        <h2 style="font-size:var(--text-sm);font-weight:600">12-Week Load Progression with ACWR Trend</h2>
        <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:2px">
          Weekly training load (sRPE × minutes) with acute:chronic workload ratio overlay — sweet spot band: 0.80–1.30
        </p>
      </div>
      <canvas id="full-load-chart" height="240" aria-label="12-week load and ACWR chart"></canvas>
    </div>

    <!-- Optimal load + zone distribution -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
      <!-- Optimal Load -->
      <div class="card">
        <h2 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-4)">Optimal Load Recommendation</h2>
        <div style="display:flex;flex-direction:column;gap:var(--space-3)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:var(--text-xs);color:var(--color-text-muted)">Current ACWR</span>
            <span class="kpi-value" style="font-size:var(--text-base);color:${acwrStatus.color}">${acwr !== null ? acwr.toFixed(2) : '—'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:var(--text-xs);color:var(--color-text-muted)">Status</span>
            <span class="badge badge-${acwr && acwr >= 0.8 && acwr <= 1.3 ? 'success' : acwr && acwr > 1.3 ? 'warning' : 'primary'}">${acwrStatus.label}</span>
          </div>
          <div style="height:1px;background:var(--color-divider)"></div>
          <div style="font-size:var(--text-xs);color:var(--color-text-muted)">
            ${acwr === null
              ? 'Insufficient session data (need 28+ days of logs) to calculate ACWR.'
              : acwr < 0.8
              ? 'Load is below the sweet spot. Consider increasing weekly volume gradually (no more than 10% per week).'
              : acwr <= 1.3
              ? 'Load is in the optimal sweet spot. Maintain current training stimulus.'
              : acwr <= 1.5
              ? 'Load is elevated. Monitor athlete fatigue. Avoid further increases this week.'
              : 'Load is dangerously high. Recommend a recovery week with 40–60% volume reduction.'
            }
          </div>
        </div>
      </div>

      <!-- Zone Distribution -->
      <div class="card">
        <h2 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-1)">Zone Distribution This Cycle</h2>
        <p style="font-size:10px;color:var(--color-text-faint);margin-bottom:var(--space-4)">
          Share of total training load (sRPE × minutes) in each intensity zone (Z1–Z7) — not number of workouts
        </p>
        <div style="display:flex;flex-direction:column;gap:var(--space-2)">
          ${zoneDist.map((z, i) => `
            <div>
              <div style="display:flex;justify-content:space-between;margin-bottom:2px">
                <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${z.zone}</span>
                <span style="font-size:var(--text-xs);font-variant-numeric:tabular-nums;color:${zoneColors[i]}">${z.pct}% of load</span>
              </div>
              <div style="height:6px;background:var(--color-surface-offset);border-radius:var(--radius-full);overflow:hidden">
                <div style="height:100%;width:${z.pct}%;background:${zoneColors[i]};border-radius:var(--radius-full);transition:width 0.5s ease"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `

  requestAnimationFrame(() => {
    const canvas = wrap.querySelector('#full-load-chart')
    if (!canvas || !window.Chart) return
    new window.Chart(canvas, {
      data: {
        labels: weeklyLoads.map(w => w.label.replace(/\d{4}-/, '')),
        datasets: [
          {
            type: 'bar',
            label: 'Weekly Load (AU)',
            data: weeklyLoads.map(w => w.load),
            backgroundColor: 'rgba(0,201,177,0.5)',
            borderColor: 'rgba(0,201,177,0.8)',
            borderWidth: 1,
            borderRadius: 3,
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: 'ACWR',
            data: weeklyLoads.map(() => acwr),
            borderColor: '#a78bfa',
            pointRadius: 3,
            tension: 0.3,
            yAxisID: 'y1',
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: '#8a8a95', font: { size: 11 } } } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8a8a95', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8a8a95', font: { size: 11 } }, beginAtZero: true, position: 'left' },
          y1: { grid: { display: false }, ticks: { color: '#a78bfa', font: { size: 11 } }, min: 0, max: 2, position: 'right' }
        }
      }
    })
  })

  return wrap
}
