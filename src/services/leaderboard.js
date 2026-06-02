/**
 * 修仙排行榜 - 基于 Worker API + D1
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://xiuxian-api.你的子域名.workers.dev'

/**
 * 获取排行榜
 */
export async function fetchLeaderboard() {
  try {
    const res = await fetch(`${API_URL}/api/leaderboard`)
    const data = await res.json()
    return data.entries || []
  } catch (err) {
    console.error('获取排行榜失败:', err)
    return []
  }
}

/**
 * 提交分数
 */
export async function submitScore({ uid, name, realm, realmIndex, age, lifespan, gold }) {
  try {
    const res = await fetch(`${API_URL}/api/leaderboard/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, name, realm, realmIndex, age, lifespan, gold }),
    })
    return await res.json()
  } catch (err) {
    console.error('提交分数失败:', err)
    return { success: false, error: err.message }
  }
}
