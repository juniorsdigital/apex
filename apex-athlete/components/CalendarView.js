export function renderCalendar(state) {
  const wrap = document.createElement('div')
  const workouts = state.workouts || []

  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())

  const weeks = []
  for (let w = 0; w < 4; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + w * 7 + d)
      week.push(date)
    }
    weeks.push(week)
  }

  const workoutsByDate = {}
  workouts.forEach(wo => {
    const key = wo.workout_date
    if (!workoutsByDate[key]) workoutsByDate[key] = []
    workoutsByDate[key].push(wo)
  })

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  wrap.innerHTML = `
    <div style="margin-bottom:var(--space-6)">
      <h1 style="font-size:var(--text-lg);font-weight:700">Schedule</h1>
      <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-1)">
        Your 4-week training schedule
      </p>
    </div>

    <div style="display:grid;grid-template-columns:auto repeat(7,1fr);gap:var(--space-2);margin-bottom:var(--space-2)">
      <div style="font-size:var(--text-xs);color:var(--color-text-faint)">Week</div>
      ${dayLabels.map(d => `
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-align:center">${d}</div>
      `).join('')}
    </div>

    <div style="display:flex;flex-direction:column;gap:var(--space-2)">
      ${weeks.map((week, wi) => `
        <div style="display:grid;grid-template-columns:auto repeat(7,1fr);gap:var(--space-2)">
          <div style="font-size:var(--text-xs);color:var(--color-text-faint);padding-top:var(--space-3);min-width:40px">W${wi + 1}</div>
          ${week.map(date => {
            const key = date.toISOString().split('T')[0]
            const dayWorkouts = workoutsByDate[key] || []
            const isToday = key === today.toISOString().split('T')[0]
            return `
              <div style="
                min-height:80px;
                background:var(--color-surface);
                border:1px solid ${isToday ? 'var(--color-primary)' : 'var(--color-border)'};
                border-radius:var(--radius-md);
                padding:var(--space-2);
              ">
                <div style="font-size:var(--text-xs);font-weight:${isToday ? '700' : '400'};color:${isToday ? 'var(--color-primary)' : 'var(--color-text-muted)'};margin-bottom:var(--space-1)">
                  ${date.getDate()}
                </div>
                ${dayWorkouts.map(wo => `
                  <div style="
                    font-size:10px;
                    background:${wo.status === 'completed' ? 'var(--color-success-muted)' : wo.status === 'skipped' ? 'var(--color-error-muted)' : 'var(--color-primary-highlight)'};
                    color:${wo.status === 'completed' ? 'var(--color-success)' : wo.status === 'skipped' ? 'var(--color-error)' : 'var(--color-primary)'};
                    border-radius:var(--radius-sm);
                    padding:2px var(--space-2);
                    margin-bottom:2px;
                    white-space:nowrap;
                    overflow:hidden;
                    text-overflow:ellipsis;
                  ">${wo.title || 'Session'}</div>
                `).join('')}
              </div>
            `
          }).join('')}
        </div>
      `).join('')}
    </div>
  `

  return wrap
}
