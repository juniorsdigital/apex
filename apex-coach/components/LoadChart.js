// Renders a weekly load bar chart onto a canvas element

export function drawLoadChart(canvas, labels, loadData) {
  if (!canvas || !window.Chart) return

  const existing = window.Chart.getChart(canvas)
  if (existing) existing.destroy()

  new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Weekly Load (AU)',
          data: loadData,
          backgroundColor: 'rgba(0, 201, 177, 0.65)',
          borderColor: 'rgba(0, 201, 177, 0.9)',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.raw.toLocaleString()} AU (sRPE × min)`
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
          beginAtZero: true
        }
      }
    }
  })
}
