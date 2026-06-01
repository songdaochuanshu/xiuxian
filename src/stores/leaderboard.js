import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchLeaderboard, submitScore } from '../services/leaderboard.js'

export const useLeaderboardStore = defineStore('leaderboard', () => {
  const entries = ref([])
  const loading = ref(false)
  const submitting = ref(false)
  const lastResult = ref(null)
  const visible = ref(false)
  const error = ref(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      entries.value = await fetchLeaderboard()
    } catch (err) {
      error.value = err.message
      console.error('加载排行榜失败:', err)
    } finally {
      loading.value = false
    }
  }

  async function submit(playerData) {
    submitting.value = true
    error.value = null
    try {
      const result = await submitScore(playerData)
      lastResult.value = result

      if (result.success) {
        // 提交成功后刷新列表
        await load()
      }

      return result
    } catch (err) {
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
