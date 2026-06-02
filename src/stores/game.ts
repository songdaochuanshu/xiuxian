import { defineStore } from 'pinia'
import { ref } from 'vue'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.xiuxian.website'

export interface LogEntry {
  text: string
  type: string
  time: string
  id: number
}

export interface BreakthroughInfo {
  realmName: string
  lifespanGain: number
}

export const useGameStore = defineStore('game', () => {
  const cultivating = ref(false)
  const logs = ref<LogEntry[]>([])
  const showBreakthrough = ref(false)
  const breakthroughInfo = ref<BreakthroughInfo | null>(null)
  const tickCount = ref(0)

  function addLog(text: string, type: string = 'info') {
    const time = new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
    logs.value.unshift({ text, type, time, id: Date.now() + Math.random() })
    if (logs.value.length > 100) logs.value.pop()
  }

  function clearLog() {
    logs.value = []
  }

  function toggleCultivate() {
    cultivating.value = !cultivating.value
    return cultivating.value
  }

  function triggerBreakthrough(info: BreakthroughInfo) {
    breakthroughInfo.value = info
    showBreakthrough.value = true
    setTimeout(() => { showBreakthrough.value = false }, 2500)
  }

  async function postWorldEvent(uid: string, name: string, eventType: string, content: string, realm?: string) {
    try {
      await fetch(`${API_URL}/api/world-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, name, eventType, content, realm }),
      })
    } catch {}
  }

  // 任务进度更新（由App.vue注入）
  let _updateTasks: ((events: { taskId: string; amount?: number }[]) => Promise<void>) | null = null
  function setTaskUpdater(fn: (events: { taskId: string; amount?: number }[]) => Promise<void>) {
    _updateTasks = fn
  }
  async function updateTasks(events: { taskId: string; amount?: number }[]) {
    if (_updateTasks) await _updateTasks(events)
  }

  return {
    cultivating, logs, showBreakthrough, breakthroughInfo, tickCount,
    addLog, clearLog, toggleCultivate, triggerBreakthrough, postWorldEvent,
    setTaskUpdater, updateTasks,
  }
}, {
  persist: {
    pick: ['tickCount', 'logs'],
  },
})
