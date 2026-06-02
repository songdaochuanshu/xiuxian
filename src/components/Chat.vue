<template>
  <div class="panel">
    <div class="panel-header">
      <span>修仙界频道</span>
      <span class="online-text">{{ recentUsers }}人在线</span>
    </div>
    <div class="panel-body">
      <!-- 消息列表 -->
      <div class="msg-list" ref="msgList">
        <div v-if="messages.length === 0" class="empty">暂无消息，来说点什么吧~</div>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="msg-item"
          :class="{ 'msg-self': msg.uid === player.uid }"
        >
          <div class="msg-head">
            <span class="msg-name">{{ msg.name }}</span>
            <span v-if="msg.realm" class="msg-realm">{{ msg.realm }}</span>
            <span class="msg-time">{{ formatTime(msg.created_at) }}</span>
          </div>
          <div class="msg-text">{{ msg.content }}</div>
        </div>
      </div>

      <!-- 输入框 -->
      <div class="input-bar">
        <input
          v-model="inputText"
          class="chat-input"
          placeholder="说点什么..."
          maxlength="100"
          @keyup.enter="sendMsg"
        />
        <button class="btn btn-send" :disabled="sending || !inputText.trim()" @click="sendMsg">
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { usePlayerStore } from '../stores/player.ts'
import { useGameStore } from '../stores/game.ts'

const player = usePlayerStore()
const game = useGameStore()

const API_URL = import.meta.env.VITE_API_URL || 'https://api.xiuxian.website'

const messages = ref([])
const inputText = ref('')
const sending = ref(false)
const msgList = ref(null)
let pollTimer = null
let lastId = 0

// 最近5分钟发言的去重人数
const recentUsers = computed(() => {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000
  const uids = new Set(messages.value.filter(m => m.created_at > fiveMinAgo).map(m => m.uid))
  return uids.size
})

async function loadMessages() {
  try {
    const url = lastId > 0
      ? `${API_URL}/api/chat/messages?limit=50&after=${lastId}`
      : `${API_URL}/api/chat/messages?limit=50`
    const res = await fetch(url)
    const data = await res.json()
    if (data.messages && data.messages.length > 0) {
      // 追加新消息
      const newMsgs = data.messages.filter(m => m.id > lastId)
      if (newMsgs.length > 0) {
        messages.value.push(...newMsgs)
        // 只保留最近100条
        if (messages.value.length > 100) {
          messages.value = messages.value.slice(-100)
        }
        lastId = Math.max(...data.messages.map(m => m.id))
        scrollToBottom()
      }
    }
  } catch {}
}

async function sendMsg() {
  const text = inputText.value.trim()
  if (!text) return
  sending.value = true
  try {
    const res = await fetch(`${API_URL}/api/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: player.uid,
        name: player.name,
        content: text,
        realm: player.realmName,
      }),
    })
    const data = await res.json()
    if (data.success) {
      inputText.value = ''
      await loadMessages()
    } else {
      game.addLog(data.error || '发送失败', 'battle')
    }
  } catch {
    game.addLog('网络错误', 'battle')
  }
  sending.value = false
}

function scrollToBottom() {
  nextTick(() => {
    if (msgList.value) {
      msgList.value.scrollTop = msgList.value.scrollHeight
    }
  })
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  // 今天的消息只显示时间
  if (d.toDateString() === now.toDateString()) return `${h}:${m}`
  return `${d.getMonth() + 1}/${d.getDate()} ${h}:${m}`
}

onMounted(() => {
  loadMessages()
  pollTimer = setInterval(loadMessages, 3000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.online-text {
  font-size: 11px;
  color: var(--text-dim);
}

.msg-list {
  max-height: 50vh;
  overflow-y: auto;
  padding: 4px 0;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.msg-list::-webkit-scrollbar { width: 3px; }
.msg-list::-webkit-scrollbar-thumb { background: var(--border); }

.empty {
  text-align: center;
  color: var(--text-dim);
  font-size: 12px;
  padding: 30px 0;
}

.msg-item {
  margin-bottom: 10px;
  padding: 6px 10px;
  background: rgba(255,255,255,0.02);
  border-radius: 6px;
}
.msg-item.msg-self {
  background: rgba(212,168,83,0.08);
  border-left: 2px solid var(--gold);
}

.msg-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}
.msg-name {
  font-size: 12px;
  color: var(--gold);
  font-weight: bold;
}
.msg-realm {
  font-size: 10px;
  color: var(--text-dim);
  background: rgba(255,255,255,0.05);
  padding: 1px 5px;
  border-radius: 3px;
}
.msg-time {
  font-size: 10px;
  color: var(--text-dim);
  margin-left: auto;
}

.msg-text {
  font-size: 13px;
  color: var(--text);
  line-height: 1.5;
  word-break: break-all;
}

.input-bar {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.chat-input {
  flex: 1;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.chat-input:focus {
  border-color: var(--gold-dim);
}
.chat-input::placeholder {
  color: var(--text-dim);
}
.btn-send {
  padding: 8px 16px;
  font-size: 13px;
}
</style>
