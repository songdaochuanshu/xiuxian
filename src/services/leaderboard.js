/**
 * 修仙排行榜 - 基于 GitHub Issues 作为数据库
 */

const CONFIG = {
  owner: 'songdaochuanshu',
  repo: 'xiuxian',
  issueNumber: 1,
  token: 'ghp_XG…UbaW',
}

const API_BASE = 'https://api.github.com'

const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'Authorization': `token ${CONFIG.token}`,
}

/**
 * 解析 Issue body 为排行榜数据
 */
function parseBody(body) {
  if (!body) return []
  try {
    const data = JSON.parse(body)
    return Array.isArray(data.entries) ? data.entries : []
  } catch {
    return []
  }
}

/**
 * 获取排行榜
 */
export async function fetchLeaderboard() {
  try {
    const res = await fetch(
      `${API_BASE}/repos/${CONFIG.owner}/${CONFIG.repo}/issues/${CONFIG.issueNumber}`,
      { headers }
    )

    if (!res.ok) {
      console.error('GitHub API error:', res.status)
      return []
    }

    const issue = await res.json()
    return parseBody(issue.body)
  } catch (err) {
    console.error('获取排行榜失败:', err)
    return []
  }
}

/**
 * 提交分数
 */
export async function submitScore({ name, realm, realmIndex, age, lifespan, gold }) {
  try {
    // 1. 获取现有数据
    const res = await fetch(
      `${API_BASE}/repos/${CONFIG.owner}/${CONFIG.repo}/issues/${CONFIG.issueNumber}`,
      { headers }
    )

    if (!res.ok) {
      throw new Error(`获取排行榜失败: ${res.status}`)
    }

    const issue = await res.json()
    const entries = parseBody(issue.body)

    // 2. 计算分数
    const score = calculateScore({ realmIndex, age, lifespan, gold })

    // 3. 更新或新增
    const existingIndex = entries.findIndex(e => e.name === name)

    const entry = {
      name,
      realm,
      realmIndex,
      age,
      lifespan,
      gold,
      score,
      updatedAt: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      if (score > entries[existingIndex].score) {
        entries[existingIndex] = entry
      }
    } else {
      entries.push(entry)
    }

    // 4. 排序，保留前 100
    entries.sort((a, b) => b.score - a.score)
    const trimmed = entries.slice(0, 100)

    // 5. 写回 Issue
    const updateRes = await fetch(
      `${API_BASE}/repos/${CONFIG.owner}/${CONFIG.repo}/issues/${CONFIG.issueNumber}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: JSON.stringify({ entries: trimmed }),
        }),
      }
    )

    if (!updateRes.ok) {
      throw new Error(`更新排行榜失败: ${updateRes.status}`)
    }

    const rank = trimmed.findIndex(e => e.name === name) + 1
    return { success: true, rank }
  } catch (err) {
    console.error('提交分数失败:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 计算战力评分
 */
function calculateScore({ realmIndex, age, lifespan, gold }) {
  const realmScore = realmIndex * 1000
  const lifeEfficiency = ((lifespan - age) / lifespan) * 500
  const goldScore = Math.log2(Math.max(1, gold)) * 50
  return Math.floor(realmScore + lifeEfficiency + goldScore)
}
