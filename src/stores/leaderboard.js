import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchLeaderboard, submitScore } from '../services/leaderboard.js'

export const useLeaderboardStore = defineStore('leaderboard', () => {
  const entries = ref([])
  const loading = ref(false)
  const submitting = ref(false)
  const lastResult = ref(null)
  const visible = ref(false)

  async function load() {
    loading.value = true
    try {
      entries.value = await fetchLeaderboard()
    } finally {
      loading.value = false
    }
  }

  async function submit(playerData) {
    submitting.value = true
    try {
      const result = await submitScore(playerData)
      lastResult.value = result
      // 提交后刷新列表
      await load()
      return result
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
    entries, loading, submitting, lastResult, visible,
    load, submit, show, hide,
  }
})
