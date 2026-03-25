// Renders an ACWR trend line chart onto a canvas element

export function drawAcwrChart(canvas, labels, acwrPoints) {
  if (!canvas || !window.Chart) return

  const existing = window.Chart.getChart(canvas)
  if (existing) existing.destroy()

  new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'ACWR',
          data: acwrPoints,
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(167,139,250,0.1)',
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
        },
        {
          label: 'Upper sweet spot (1.30)',
          data: labels.map(() => 1.30),
          borderColor: 'rgba(251,191,36,0.45)',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'Lower sweet spot (0.80)',
          data: labels.map(() => 0.80),
          borderColor: 'rgba(96,165,250,0.45)',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx =>
              ctx.datasetIndex === 0
                ? `ACWR: ${ctx.raw !== null ? ctx.raw.toFixed(2) : '—'}`
                : ctx.dataset.label
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#8a8a95', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#8a8a95', font: { size: 11 } },
          min: 0,
          max: 2
        }
      }
    }
  })
}
