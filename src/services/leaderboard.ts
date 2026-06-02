/**
 * 修排行榜 - 基于 Worker API + D1
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://xiuxian-api.你的子域名.workers.dev'

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

export async function submitScore({ uid, name, realm, realmIndex, age, lifespan, spiritStones }: {
  uid: string
  name: string
  realm: string
  realmIndex: number
  age: number
  lifespan: number
  spiritStones: number
}) {
  try {
    const res = await fetch(`${API_URL}/api/leaderboard/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, name, realm, realmIndex, age, lifespan, gold: spiritStones }),
    })
    return await res.json()
  } catch (err: any) {
    console.error('提交分数失败:', err)
    return { success: false, error: err.message }
  }
}
