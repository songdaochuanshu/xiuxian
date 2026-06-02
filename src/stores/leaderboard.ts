import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchLeaderboard, submitScore } from '../services/leaderboard.js'

export interface LeaderboardEntry {
  name: string
  realm: string
  realm_index: number
  age: number
  lifespan: number
  gold: number
  score: number
  updated_at: number
}

export const useLeaderboardStore = defineStore('leaderboard', () => {
  const entries = ref<LeaderboardEntry[]>([])
  const loading = ref(false)
  const submitting = ref(false)
  const lastResult = ref<any>(null)
  const visible = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      entries.value = await fetchLeaderboard()
    } catch (err: any) {
      error.value = err.message
      console.error('加载排行榜失败:', err)
    } finally {
      loading.value = false
    }
  }

  async function submit(playerData: {
    uid: string
    name: string
    realm: string
    realmIndex: number
    age: number
    lifespan: number
    gold: number
  }) {
    submitting.value = true
    error.value = null
    try {
      const result = await submitScore(playerData)
      lastResult.value = result

      if (result.success) {
        await load()
      }

      return result
    } catch (err: any) {
      error.value = err.message
      console.error('提交分数失败:', err)
      return { success: false, error: err.message }
    } finally {
      submitting.value = false
    }
  }

  function show() {
    visible.value = true
    load()
  }

  function hide() {
    visible.value = false
  }

  return {
    entries, loading, submitting, lastResult, visible, error,
    load, submit, show, hide,
  }
})
