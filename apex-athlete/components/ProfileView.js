import { upsertProfile, uploadAvatar } from '../../shared/apex-supabase.js'

export function renderProfile(state) {
  const profile = state.profile || {}
  const wrap = document.createElement('div')
  wrap.innerHTML = `
    <div style="margin-bottom:var(--space-6)">
      <h1 style="font-size:var(--text-lg);font-weight:700">Profile & Settings</h1>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
      <div class="card">
        <h2 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-5)">Personal Info</h2>
        <form id="profile-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
          <div>
            <label style="display:block;font-size:var(--text-sm);font-weight:500;margin-bottom:var(--space-2)">Full name</label>
            <input class="input" name="full_name" type="text" value="${profile.full_name || ''}" placeholder="Your name">
          </div>
          <div>
            <label style="display:block;font-size:var(--text-sm);font-weight:500;margin-bottom:var(--space-2)">Sport</label>
            <select class="input" name="sport">
              <option value="" ${!profile.sport ? 'selected' : ''}>Select sport</option>
              <option value="cycling" ${profile.sport === 'cycling' ? 'selected' : ''}>Cycling</option>
              <option value="running" ${profile.sport === 'running' ? 'selected' : ''}>Running</option>
              <option value="rowing" ${profile.sport === 'rowing' ? 'selected' : ''}>Rowing</option>
              <option value="triathlon" ${profile.sport === 'triathlon' ? 'selected' : ''}>Triathlon</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:var(--text-sm);font-weight:500;margin-bottom:var(--space-2)">Bio</label>
            <textarea class="input" name="bio" rows="3" placeholder="Goals, event history…" style="resize:vertical">${profile.bio || ''}</textarea>
          </div>
          <div>
            <label style="display:block;font-size:var(--text-sm);font-weight:500;margin-bottom:var(--space-2)">Location</label>
            <input class="input" name="location" type="text" value="${profile.location || ''}" placeholder="City, State">
          </div>
          <div id="profile-status" style="display:none;font-size:var(--text-sm)"></div>
          <button type="submit" class="btn btn-primary">Save changes</button>
        </form>
      </div>

      <div class="card">
        <h2 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-5)">Profile Photo</h2>
        <div style="text-align:center;margin-bottom:var(--space-6)">
          <img id="avatar-preview"
            src="${profile.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.full_name || 'A') + '&background=00c9b1&color=fff&size=120'}"
            alt="Profile photo"
            width="96" height="96"
            style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:2px solid var(--color-primary);margin:0 auto"
          >
        </div>
        <label class="btn btn-ghost" style="width:100%;justify-content:center;cursor:pointer">
          <i data-lucide="upload" style="width:16px;height:16px"></i>
          Upload photo
          <input id="avatar-upload" type="file" accept="image/jpeg,image/png,image/webp" style="display:none">
        </label>
        <p style="font-size:var(--text-xs);color:var(--color-text-faint);text-align:center;margin-top:var(--space-2)">Max 2MB · JPG, PNG, WebP</p>
        <div id="upload-status" style="display:none;margin-top:var(--space-3);font-size:var(--text-sm);text-align:center"></div>
      </div>
    </div>
  `

  // Profile form submit
  wrap.querySelector('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const status = wrap.querySelector('#profile-status')
    const updates = { full_name: fd.get('full_name'), sport: fd.get('sport'), bio: fd.get('bio'), location: fd.get('location') }
    const { error } = await upsertProfile(state.user.id, updates)
    status.style.display = 'block'
    status.style.color = error ? 'var(--color-error)' : 'var(--color-success)'
    status.textContent = error ? error.message : '✓ Profile saved'
    if (!error) Object.assign(state.profile, updates)
  })

  // Avatar upload
  wrap.querySelector('#avatar-upload').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const uploadStatus = wrap.querySelector('#upload-status')
    uploadStatus.style.display = 'block'
    uploadStatus.style.color = 'var(--color-text-muted)'
    uploadStatus.textContent = 'Uploading…'
    const { url, error } = await uploadAvatar(state.user.id, file)
    if (error) {
      uploadStatus.style.color = 'var(--color-error)'
      uploadStatus.textContent = error.message
    } else {
      wrap.querySelector('#avatar-preview').src = url
      uploadStatus.style.color = 'var(--color-success)'
      uploadStatus.textContent = '✓ Photo updated'
      await upsertProfile(state.user.id, { avatar_url: url })
    }
  })

  return wrap
}
