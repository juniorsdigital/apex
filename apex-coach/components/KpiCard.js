export function renderKpiCard({ label, value, unit, subtitle, color }) {
  const card = document.createElement('div')
  card.className = 'card card-sm'
  card.style.cssText = 'border-top: 2px solid ' + color + ';'
  card.innerHTML = `
    <div style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:500;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:var(--space-2)">
      ${label}
    </div>
    <div style="display:flex;align-items:baseline;gap:var(--space-1);margin-bottom:var(--space-1)">
      <span class="kpi-value" style="font-size:var(--text-xl);color:${color}">${value}</span>
      ${unit ? `<span style="font-size:var(--text-xs);color:var(--color-text-muted)">${unit}</span>` : ''}
    </div>
    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${subtitle}</div>
  `
  return card
}
