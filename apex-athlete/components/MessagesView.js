import {
  getConversation, sendMessage, markMessagesRead,
  subscribeToMessages, supabase
} from '../shared/apex-supabase.js'

export function renderMessages(state) {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'display:flex;flex-direction:column;height:calc(100dvh - var(--header-height) - var(--space-12))'

  wrap.innerHTML = `
    <div style="margin-bottom:var(--space-4)">
      <h1 style="font-size:var(--text-lg);font-weight:700">Messages</h1>
      <p style="font-size:var(--text-sm);color:var(--color-text-muted)">Direct line to your coach</p>
    </div>
    <div class="card" style="flex:1;display:flex;flex-direction:column;overflow:hidden;padding:0">
      <div id="message-list" style="flex:1;overflow-y:auto;padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-3)">
        <div style="text-align:center;padding:var(--space-8)">
          <div class="skeleton" style="height:16px;width:200px;margin:0 auto var(--space-3)"></div>
          <div class="skeleton" style="height:16px;width:160px;margin:0 auto"></div>
        </div>
      </div>
      <div style="padding:var(--space-4);border-top:1px solid var(--color-border);display:flex;gap:var(--space-3)">
        <input id="msg-input" type="text" class="input" placeholder="Message your coach…" style="flex:1" ${!state.coachId ? 'disabled' : ''}>
        <button class="btn btn-primary" id="msg-send" ${!state.coachId ? 'disabled' : ''} style="flex-shrink:0">
          <i data-lucide="send" style="width:16px;height:16px"></i>
          Send
        </button>
      </div>
    </div>
  `

  const list = wrap.querySelector('#message-list')
  const input = wrap.querySelector('#msg-input')
  const sendBtn = wrap.querySelector('#msg-send')
  let realtimeChannel = null

  function renderMessageList(messages) {
    if (!messages.length) {
      list.innerHTML = `
        <div style="text-align:center;padding:var(--space-12)">
          <i data-lucide="message-circle" style="width:40px;height:40px;color:var(--color-text-faint);margin:0 auto var(--space-3)"></i>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted)">No messages yet.</p>
          <p style="font-size:var(--text-xs);color:var(--color-text-faint);margin-top:var(--space-1)">Say hi to your coach to get started!</p>
        </div>
      `
      if (window.lucide) window.lucide.createIcons()
      return
    }

    list.innerHTML = messages.map(m => {
      const isMe = m.sender_id === state.user?.id
      const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return `
        <div style="display:flex;justify-content:${isMe ? 'flex-end' : 'flex-start'};align-items:flex-end;gap:var(--space-2)">
          ${!isMe ? `
            <div style="width:28px;height:28px;border-radius:50%;background:var(--color-primary-highlight);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;color:var(--color-primary);font-weight:700">C</div>
          ` : ''}
          <div style="
            max-width:70%;
            padding:var(--space-3) var(--space-4);
            background:${isMe ? 'var(--color-primary)' : 'var(--color-surface-offset)'};
            color:${isMe ? 'var(--color-text-inverse)' : 'var(--color-text)'};
            border-radius:${isMe
              ? 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)'
              : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)'};
            font-size:var(--text-sm);
          ">
            ${m.content}
            <div style="font-size:10px;opacity:0.6;margin-top:var(--space-1);text-align:right">${time}</div>
          </div>
        </div>
      `
    }).join('')
    list.scrollTop = list.scrollHeight
  }

  async function loadMessages() {
    if (!state.coachId || !state.user) {
      list.innerHTML = `
        <div style="text-align:center;padding:var(--space-12)">
          <i data-lucide="user-x" style="width:40px;height:40px;color:var(--color-text-faint);margin:0 auto var(--space-3)"></i>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted)">No active coaching relationship.</p>
          <p style="font-size:var(--text-xs);color:var(--color-text-faint);margin-top:var(--space-1)">Visit <strong>My Coach</strong> to request a coach first.</p>
        </div>
      `
      if (window.lucide) window.lucide.createIcons()
      return
    }

    const { data, error } = await getConversation(state.user.id, state.coachId)
    if (!error) {
      renderMessageList(data || [])
      await markMessagesRead(state.user.id)
      state.unreadMessages = 0
    }
  }

  async function handleSend() {
    const content = input.value.trim()
    if (!content || !state.coachId || !state.user) return
    input.value = ''
    sendBtn.disabled = true

    const { error } = await sendMessage(state.user.id, state.coachId, content)
    if (error) {
      input.value = content
    } else {
      await loadMessages()
    }
    sendBtn.disabled = false
    input.focus()
  }

  sendBtn.addEventListener('click', handleSend)
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  })

  // Real-time subscription
  if (state.user) {
    realtimeChannel = subscribeToMessages(state.user.id, () => loadMessages())
  }

  // Cleanup on navigation away (call this from app shell if needed)
  wrap._cleanup = () => {
    if (realtimeChannel) supabase.removeChannel(realtimeChannel)
  }

  loadMessages()
  return wrap
}
