import { getActivePackages, sendRequest } from '../../shared/apex-supabase.js'

export function renderCoachProfile(state, coachId = null) {
  const wrap = document.createElement('div')

  wrap.innerHTML = `
    <div style="margin-bottom:var(--space-6)">
      <h1 style="font-size:var(--text-lg);font-weight:700">My Coach</h1>
      <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-1)">
        Your coaching relationship and active package
      </p>
    </div>
    <div id="coach-profile-content">
      <div style="text-align:center;padding:var(--space-12)">
        <div class="skeleton" style="width:80px;height:80px;border-radius:50%;margin:0 auto var(--space-4)"></div>
        <div class="skeleton skeleton-text" style="width:160px;margin:0 auto var(--space-2)"></div>
        <div class="skeleton skeleton-text" style="width:120px;margin:0 auto"></div>
      </div>
    </div>
  `

  async function load() {
    const content = wrap.querySelector('#coach-profile-content')

    // If no active coach, show available packages/coaches
    if (!coachId) {
      const { data: packages, error } = await getActivePackages()

      if (error || !packages?.length) {
        content.innerHTML = `
          <div class="card" style="text-align:center;padding:var(--space-12)">
            <i data-lucide="user-search" style="width:48px;height:48px;color:var(--color-text-faint);margin:0 auto var(--space-4)"></i>
            <h2 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--space-2)">No coach yet</h2>
            <p style="font-size:var(--text-sm);color:var(--color-text-muted);max-width:36ch;margin:0 auto">
              You don't have an active coaching relationship. Browse available coaches below once the marketplace is live.
            </p>
          </div>
        `
        if (window.lucide) window.lucide.createIcons()
        return
      }

      content.innerHTML = `
        <div style="margin-bottom:var(--space-4)">
          <h2 style="font-size:var(--text-base);font-weight:600">Available Coaching Packages</h2>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-1)">
            Request a coach to get started
          </p>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-3)" id="packages-list">
          ${packages.map(pkg => `
            <div class="card" data-package-id="${pkg.id}" data-coach-id="${pkg.coach_id}">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4)">
                <div style="display:flex;align-items:center;gap:var(--space-3)">
                  <img
                    src="${pkg.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(pkg.profiles?.full_name || 'Coach')}&background=00c9b1&color=fff&size=48`}"
                    alt="${pkg.profiles?.full_name || 'Coach'}"
                    width="48" height="48"
                    style="width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0"
                  >
                  <div>
                    <div style="font-size:var(--text-sm);font-weight:600">${pkg.profiles?.full_name || 'Coach'}</div>
                    <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:2px">${pkg.title}</div>
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div class="kpi-value" style="font-size:var(--text-base);color:var(--color-primary)">$${pkg.price}</div>
                  <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${pkg.duration_weeks}wk · ${pkg.sessions_per_week}x/wk</div>
                </div>
              </div>
              ${pkg.description ? `
                <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--color-divider)">
                  ${pkg.description}
                </p>
              ` : ''}
              <div style="margin-top:var(--space-4)">
                <button
                  class="btn btn-primary request-btn"
                  data-package-id="${pkg.id}"
                  data-coach-id="${pkg.coach_id}"
                  style="width:100%;justify-content:center"
                >
                  Request this coach
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `

      // Request buttons
      content.querySelectorAll('.request-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true
          btn.textContent = 'Sending request…'
          const { error } = await sendRequest(
            state.user.id,
            btn.dataset.coachId,
            btn.dataset.packageId,
            ''
          )
          if (error) {
            btn.disabled = false
            btn.textContent = 'Request this coach'
            const errMsg = document.createElement('p')
            errMsg.style.cssText = 'color:var(--color-error);font-size:var(--text-xs);margin-top:var(--space-2)'
            errMsg.textContent = error.message
            btn.parentElement.appendChild(errMsg)
          } else {
            btn.textContent = '✓ Request sent'
            btn.style.background = 'var(--color-success-muted)'
            btn.style.color = 'var(--color-success)'
          }
        })
      })

      if (window.lucide) window.lucide.createIcons()
      return
    }

    // If we have a coachId, show that coach's full profile
    // (In production, fetch from profiles table by coachId)
    content.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4)">
        <div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-5)">
          <img
            src="https://ui-avatars.com/api/?name=Coach&background=00c9b1&color=fff&size=96"
            alt="Coach"
            width="72" height="72"
            style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--color-primary)"
          >
          <div>
            <h2 style="font-size:var(--text-base);font-weight:700">Your Coach</h2>
            <div style="font-size:var(--text-xs);color:var(--color-primary);margin-top:var(--space-1)">
              <span class="badge badge-success">Active</span>
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
          <div style="padding:var(--space-3);background:var(--color-surface-offset);border-radius:var(--radius-md)">
            <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-1)">Sport</div>
            <div style="font-size:var(--text-sm);font-weight:600">Endurance</div>
          </div>
          <div style="padding:var(--space-3);background:var(--color-surface-offset);border-radius:var(--radius-md)">
            <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-1)">Method</div>
            <div style="font-size:var(--text-sm);font-weight:600">sRPE / ACWR</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-3)">Active Package</h3>
        <p style="font-size:var(--text-sm);color:var(--color-text-muted)">
          Package details will appear here once your coaching contract is active.
        </p>
      </div>
    `

    if (window.lucide) window.lucide.createIcons()
  }

  load()
  return wrap
}
