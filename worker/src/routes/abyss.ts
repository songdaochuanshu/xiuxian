/**
 * 凡人修仙传 - 镇妖塔（深渊）系统
 *
 * GET  /api/abyss              - 获取深渊信息（Boss/层数/低保状态）
 * POST /api/abyss/challenge    - 挑战Boss结算
 * POST /api/abyss/daily-reward - 领取每日低保
 * GET  /api/abyss/leaderboard  - 深渊排行榜
 */

import { Hono } from 'hono'
import type { Env } from '../types'
import { json, getAbyssBoss, getFirstClearReward, getDailyReward } from '../utils'

export const abyssRoutes = new Hono<{ Bindings: Env }>()

// ==================== 获取深渊信息 ====================

abyssRoutes.get('/api/abyss', async (c) => {
  const db = c.env.DB
  try {
    const uid = c.req.query('uid')
    if (!uid) return json({ error: '缺少uid' }, 400)

    const player = await db.prepare(
      'SELECT abyss_layer, abyss_max_layer, abyss_last_reward FROM players WHERE uid = ?'
    ).bind(uid).first<any>()
    if (!player) return json({ error: '玩家不存在' }, 404)

    const layer = player.abyss_layer || 1
    const maxLayer = player.abyss_max_layer || 1
    const boss = getAbyssBoss(layer)
    const dailyReward = getDailyReward(maxLayer)

    // 首通记录
    const firstClears = await db.prepare('SELECT layer FROM abyss_first_clear WHERE uid = ?').bind(uid).all()
    const clearedLayers = new Set((firstClears.results || []).map((r: any) => r.layer))

    // 低保是否可领（每天0点重置）
    const now = Date.now()
    const todayStart = new Date(Date.now() + 8 * 3600 * 1000)
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayTs = todayStart.getTime() - 8 * 3600 * 1000
    const canClaimDaily = (player.abyss_last_reward || 0) < todayTs

    return json({ layer, maxLayer, boss, dailyReward, canClaimDaily, clearedLayers: Array.from(clearedLayers) })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// ==================== 挑战Boss结算 ====================

abyssRoutes.post('/api/abyss/challenge', async (c) => {
  const db = c.env.DB
  try {
    const { uid, damage } = await c.req.json<{ uid: string; damage: number }>()
    if (!uid || !damage) return json({ error: '参数不完整' }, 400)

    const player = await db.prepare(
      'SELECT abyss_layer, abyss_max_layer FROM players WHERE uid = ?'
    ).bind(uid).first<any>()
    if (!player) return json({ error: '玩家不存在' }, 404)

    const layer = player.abyss_layer || 1
    const boss = getAbyssBoss(layer)
    const now = Date.now()

    // 未击败
    if (damage < boss.hp) {
      const remaining = boss.hp - damage
      return json({ success: true, win: false, damage, bossHp: boss.hp, remaining })
    }

    // ---- 击败Boss ----
    const newLayer = layer + 1
    const newMax = Math.max(player.abyss_max_layer || 1, newLayer)
    await db.prepare('UPDATE players SET abyss_layer = ?, abyss_max_layer = ? WHERE uid = ?')
      .bind(newLayer, newMax, uid).run()

    // 首通检查
    const existing = await db.prepare('SELECT id FROM abyss_first_clear WHERE uid = ? AND layer = ?')
      .bind(uid, layer).first()

    // 全服播报（每5层或首次通关）
    if (layer % 5 === 0 || !existing) {
      const playerName = await db.prepare('SELECT name FROM players WHERE uid = ?')
        .bind(uid).first<{ name: string }>()
      if (playerName) {
        await db.prepare(
          'INSERT INTO world_events (uid, name, event_type, content, realm, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(uid, playerName.name, 'abyss', `🗼 ${playerName.name} 通关镇妖塔第${layer}层！`, '', now).run()
      }
    }

    // 首通奖励
    let firstReward = null
    if (!existing) {
      const reward = getFirstClearReward(layer)
      await db.prepare('INSERT INTO abyss_first_clear (uid, layer, cleared_at) VALUES (?, ?, ?)')
        .bind(uid, layer, now).run()

      // 发灵石
      await db.prepare('UPDATE players SET spirit_stones = spirit_stones + ? WHERE uid = ?')
        .bind(reward.stones, uid).run()

      // 发物品
      for (const item of reward.items) {
        const itemRow = await db.prepare('SELECT id FROM items WHERE name = ?').bind(item.name).first<{ id: number }>()
        if (itemRow) {
          await db.prepare(
            `INSERT INTO user_inventory (user_uid, item_id, quantity, created_at)
             VALUES (?, ?, ?, ?) ON CONFLICT(user_uid, item_id) DO UPDATE SET quantity = quantity + ?`
          ).bind(uid, itemRow.id, item.amount, now, item.amount).run()
        }
      }
      firstReward = reward
    }

    return json({ success: true, win: true, newLayer, boss: getAbyssBoss(newLayer), firstReward })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// ==================== 领取每日低保 ====================

abyssRoutes.post('/api/abyss/daily-reward', async (c) => {
  const db = c.env.DB
  try {
    const { uid } = await c.req.json<{ uid: string }>()
    if (!uid) return json({ error: '缺少uid' }, 400)

    const player = await db.prepare('SELECT abyss_max_layer, abyss_last_reward FROM players WHERE uid = ?')
      .bind(uid).first<any>()
    if (!player) return json({ error: '玩家不存在' }, 404)

    const now = Date.now()
    const todayStart = new Date(Date.now() + 8 * 3600 * 1000)
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayTs = todayStart.getTime() - 8 * 3600 * 1000

    if ((player.abyss_last_reward || 0) >= todayTs) {
      return json({ error: '今日已领取' })
    }

    const reward = getDailyReward(player.abyss_max_layer || 1)
    await db.prepare('UPDATE players SET spirit_stones = spirit_stones + ?, abyss_last_reward = ? WHERE uid = ?')
      .bind(reward, now, uid).run()

    return json({ success: true, reward })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// ==================== 深渊排行榜 ====================

abyssRoutes.get('/api/abyss/leaderboard', async (c) => {
  const db = c.env.DB
  try {
    const rows = await db.prepare(
      'SELECT name, realm, abyss_max_layer, uid FROM players WHERE abyss_max_layer > 1 ORDER BY abyss_max_layer DESC, created_at ASC LIMIT 50'
    ).all()
    return json({ entries: rows.results || [] })
  } catch (err: any) {
    return json({ entries: [], error: err.message })
  }
})
