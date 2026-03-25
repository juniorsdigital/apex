// Renders zone load distribution as a chart or inline DOM bars

const ZONE_COLORS = [
  '#60a5fa', // Z1
  '#34d399', // Z2
  '#fbbf24', // Z3
  '#f97316', // Z4
  '#f87171', // Z5
  '#e879f9', // Z6
  '#c084fc', // Z7
]

export function drawZoneDistributionChart(canvas, zoneData) {
  if (!canvas || !window.Chart) return

  const existing = window.Chart.getChart(canvas)
  if (existing) existing.destroy()

  new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: zoneData.map(z => z.zone),
      datasets: [
        {
          label: '% of Load',
          data: zoneData.map(z => z.pct),
          backgroundColor: ZONE_COLORS.slice(0, zoneData.length),
          borderRadius: 4,
          borderSkipped: false,
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.raw}% of total load` } }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#8a8a95', font: { size: 11 } },
          max: 100
        },
        y: {
          grid: { display: false },
          ticks: { color: '#8a8a95', font: { size: 11 } }
        }
      }
    }
  })
}

export function renderZoneDistributionBars(zoneData) {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:var(--space-2)'

  zoneData.forEach((z, i) => {
    const color = ZONE_COLORS[i] || '#8a8a95'
    wrap.insertAdjacentHTML('beforeend', `
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
          <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${z.zone}</span>
          <span style="font-size:var(--text-xs);font-variant-numeric:tabular-nums;color:${color}">${z.pct}% of load</span>
        </div>
        <div style="height:6px;background:var(--color-surface-offset);border-radius:var(--radius-full);overflow:hidden">
          <div style="height:100%;width:${z.pct}%;background:${color};border-radius:var(--radius-full);transition:width 0.5s ease"></div>
        </div>
      </div>
    `)
  })

  return wrap
}
