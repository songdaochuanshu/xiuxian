/**
 * 修仙排行榜 - 基于 GitHub Issues 作为数据库
 *
 * 使用一个专门的 Issue 的 body 存储 JSON 格式的排行榜数据
 * 通过 GitHub API 读写
 */

// ⚠️ 部署时需要替换为你的配置
const CONFIG = {
  owner: 'songdaochuanshu',
  repo: 'xiuxian',
  issueNumber: 1, // 排行榜 Issue 编号 (已创建)
  // Token 建议用 GitHub Actions 的 GITHUB_TOKEN 或创建一个只有 public_repo 权限的 token
  // 这里为了简单直接写死，生产环境建议用环境变量
  token: 'ghp_XG…UbaW',
}

const API_BASE = 'https://api.github.com'

/**
 * 获取排行榜 Issue 的当前数据
 */
export async function fetchLeaderboard() {
  try {
    const res = await fetch(
      `${API_BASE}/repos/${CONFIG.owner}/${CONFIG.repo}/issues/${CONFIG.issueNumber}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          ...(CONFIG.token ? { 'Authorization': `token ${CONFIG.token}` } : {}),
        },
      }
    )

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status}`)
    }

    const issue = await res.json()
    const data = JSON.parse(issue.body || '{"entries":[]}')
    return data.entries || []
  } catch (err) {
    console.error('获取排行榜失败:', err)
    return []
  }
}

/**
 * 提交分数到排行榜
 */
export async function submitScore({ name, realm, realmIndex, age, lifespan, gold }) {
  try {
    // 先获取现有数据
    const res = await fetch(
      `${API_BASE}/repos/${CONFIG.owner}/${CONFIG.repo}/issues/${CONFIG.issueNumber}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${CONFIG.token}`,
        },
      }
    )

    if (!res.ok) throw new Error(`获取失败: ${res.status}`)

    const issue = await res.json()
    const data = JSON.parse(issue.body || '{"entries":[]}')
    const entries = data.entries || []

    // 计算战力评分（用于排名）
    const score = calculateScore({ realmIndex, age, lifespan, gold })

    // 检查是否已有该玩家的记录
    const existingIndex = entries.findIndex(e => e.name === name)

    if (existingIndex >= 0) {
      // 如果新分数更高则更新
      if (score > entries[existingIndex].score) {
        entries[existingIndex] = {
          name,
          realm,
          realmIndex,
          age,
          lifespan,
          gold,
          score,
          updatedAt: new Date().toISOString(),
        }
      }
    } else {
      // 新增记录
      entries.push({
        name,
        realm,
        realmIndex,
        age,
        lifespan,
        gold,
        score,
        updatedAt: new Date().toISOString(),
      })
    }

    // 按分数排序，只保留前 100 名
    entries.sort((a, b) => b.score - a.score)
    const trimmed = entries.slice(0, 100)

    // 更新 Issue
    const updateRes = await fetch(
      `${API_BASE}/repos/${CONFIG.owner}/${CONFIG.repo}/issues/${CONFIG.issueNumber}`,
      {
        method: 'PATCH',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${CONFIG.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: JSON.stringify({ entries: trimmed }, null, 2),
        }),
      }
    )

    if (!updateRes.ok) throw new Error(`更新失败: ${updateRes.status}`)

    return { success: true, rank: trimmed.findIndex(e => e.name === name) + 1 }
  } catch (err) {
    console.error('提交分数失败:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 计算战力评分
 * 境界权重最高，其次是年龄效率、灵石
 */
function calculateScore({ realmIndex, age, lifespan, gold }) {
  // 境界分：每层 1000 分
  const realmScore = realmIndex * 1000

  // 寿元效率：剩余寿命占比 × 500
  const lifeEfficiency = ((lifespan - age) / lifespan) * 500

  // 灵石分：log 缩放
  const goldScore = Math.log2(Math.max(1, gold)) * 50

  return Math.floor(realmScore + lifeEfficiency + goldScore)
}
