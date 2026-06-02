import { defineStore } from 'pinia'
import { ref } from 'vue'

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

  return {
    cultivating, logs, showBreakthrough, breakthroughInfo, tickCount,
    addLog, clearLog, toggleCultivate, triggerBreakthrough,
  }
}, {
  persist: {
    pick: ['tickCount', 'logs'],
  },
})
