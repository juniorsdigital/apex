const VIEW_TITLES = {
  today: 'Today', calendar: 'Schedule', progress: 'My Progress',
  messages: 'Messages', profile: 'Profile & Settings'
}
export function renderHeader(currentView, user, profile) {
  const h = document.createElement('header')
  h.className = 'app-header'
  const name = profile?.full_name || user?.email?.split('@')[0] || 'Athlete'
  h.innerHTML = `
    <h1 style="font-size:var(--text-base);font-weight:600">${VIEW_TITLES[currentView] || 'Apex Athlete'}</h1>
    <span style="font-size:var(--text-sm);color:var(--color-text-muted)">${name}</span>
  `
  return h
}
