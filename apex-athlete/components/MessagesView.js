import { getConversation, sendMessage, markMessagesRead, subscribeToMessages } from '../../shared/apex-supabase.js'

export function renderMessages(state) {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'display:flex;flex-direction:column;height:calc(100dvh - var(--header-height) - var(--space-12))'

  wrap.innerHTML = `
    <div style="margin-bottom:var(--space-4)">
      <h1 style="font-size:var(--text-lg);font-weight:700">Messages</h1>
      <p style="font-size:var(--text-sm);color:var(--color-text-muted)">Direct line to your coach</p>
    </div>
    <div class="card" style="flex:1;display:flex;flex-direction:column;overflow:hidden;padding:0">
      <!-- Message list -->
      <div id="message-list" style="flex:1;overflow-y:auto;padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-3)">
        <div style="text-align:center;padding:var(--space-8)">
          <i data-lucide="message-circle" style="width:36px;height:36px;color:var(--color-text-faint);margin:0 auto var(--space-3)"></i>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted)">Loading messages…</p>
        </div>
      </div>
      <!-- Input -->
      <div style="padding:var(--space-4);border-top:1px solid var(--color-border);display:flex;gap:var(--space-3)">
        <input id="msg-input" type="text" class="input" placeholder="Message your coach…" style="flex:1">
        <button class="btn btn-primary" id="msg-send" style="flex-shrink:0">
          <i data-lucide="send" style="width:16px;height:16px"></i>
          Send
        </button>
      </div>
    </div>
  `

  // Will need coachId — placeholder approach: load all conversations
  // In a real impl, you'd fetch the coach from the athlete's active contract
  const COACH_ID_PLACEHOLDER = null // replace with actual coach lookup

  async function loadMessages() {
    if (!COACH_ID_PLACEHOLDER || !state.user) return
    const { data } = await getConversation(state.user.id, COACH_ID_PLACEHOLDER)
    await markMessagesRead(state.user.id)
    renderMessageList(data || [])
  }

  function renderMessageList(messages) {
    const list = wrap.querySelector('#message-list')
    if (!messages.length) {
      list.innerHTML = `<div style="text-align:center;padding:var(--space-8)"><p style="font-size:var(--text-sm);color:var(--color-text-muted)">No messages yet. Say hi to your coach!</p></div>`
      return
    }
    list.innerHTML = messages.map(m => {
      const isMe = m.sender_id === state.user?.id
      return `
        <div style="display:flex;justify-content:${isMe ? 'flex-end' : 'flex-start'}">
          <div style="
            max-width:70%;padding:var(--space-3) var(--space-4);
            background:${isMe ? 'var(--color-primary)' : 'var(--color-surface-offset)'};
            color:${isMe ? 'var(--color-text-inverse)' : 'var(--color-text)'};
            border-radius:${isMe ? 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)' : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)'};
            font-size:var(--text-sm);
          ">
            ${m.content}
            <div style="font-size:10px;opacity:0.6;margin-top:var(--space-1);text-align:right">
              ${new Date(m.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
            </div>
          </div>
        </div>
      `
    }).join('')
    list.scrollTop = list.scrollHeight
  }

  // Send message
  wrap.querySelector('#msg-send').addEventListener('click', async () => {
    const input = wrap.querySelector('#msg-input')
    const content = input.value.trim()
    if (!content || !COACH_ID_PLACEHOLDER) return
    input.value = ''
    await sendMessage(state.user.id, COACH_ID_PLACEHOLDER, content)
    await loadMessages()
  })

  wrap.querySelector('#msg-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      wrap.querySelector('#msg-send').click()
    }
  })

  // Real-time subscription
  if (state.user) {
    subscribeToMessages(state.user.id, () => loadMessages())
    loadMessages()
  }

  return wrap
}
