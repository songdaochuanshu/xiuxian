/**
 * 凡人修仙传 - 管理后台接口（需要 Bearer 认证）
 *
 * GET    /admin/stats          - 统计概览
 * GET    /admin/codes          - 兑换码列表
 * POST   /admin/codes          - 生成兑换码
 * DELETE /admin/codes          - 删除兑换码
 * GET    /admin/players        - 玩家列表
 * GET    /admin/monsters       - 怪物列表
 * GET    /admin/drops          - 掉落列表
 * GET    /admin/config         - 配置
 * POST   /admin/config         - 保存配置
 * GET    /admin/reincarnations - 转世记录
 * GET    /admin/shop           - 商店商品
 * POST   /admin/shop           - 添加商品
 * DELETE /admin/shop           - 删除商品
 * PATCH  /admin/shop           - 修改商品
 * GET    /admin/items          - 物品列表
 */

import { Hono } from 'hono'
import type { Env } from '../types'
import { json } from '../utils'
import { ADMIN_PASSWORD } from '../config'

export const adminRoutes = new Hono<{ Bindings: Env }>()

// 管理员认证中间件
adminRoutes.use('/admin/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) return json({ error: '未授权' }, 401)
  await next()
})

// ==================== 统计 ====================

adminRoutes.get('/admin/stats', async (c) => {
  const db = c.env.DB
  const totalCodes = await db.prepare('SELECT COUNT(*) as count FROM codes').first<{ count: number }>()
  const usedCodes = await db.prepare('SELECT COUNT(*) as count FROM codes WHERE used = 1').first<{ count: number }>()
  const totalPlayers = await db.prepare('SELECT COUNT(*) as count FROM players').first<{ count: number }>()
  const totalReincarnations = await db.prepare('SELECT COUNT(*) as count FROM reincarnation_log').first<{ count: number }>()
  return json({
    codes: { total: totalCodes!.count, used: usedCodes!.count, unused: totalCodes!.count - usedCodes!.count },
    players: { total: totalPlayers!.count },
    reincarnations: totalReincarnations!.count,
  })
})

// ==================== 兑换码 ====================

adminRoutes.get('/admin/codes', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = (page - 1) * limit
  const total = await db.prepare('SELECT COUNT(*) as count FROM codes').first<{ count: number }>()
  const rows = await db.prepare('SELECT * FROM codes ORDER BY id DESC LIMIT ? OFFSET ?').bind(limit, offset).all()
  return json({ total: total!.count, page, limit, data: rows.results })
})

adminRoutes.post('/admin/codes', async (c) => {
  const db = c.env.DB
  try {
    const { multiplier, duration, count = 1, codeType = 'speed' } = await c.req.json<{
      multiplier: number; duration: number; count: number; codeType?: string
    }>()
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const prefix = codeType === 'auto_break' ? 'AB' : `${multiplier === 2 ? 'A' : multiplier === 5 ? 'B' : 'C'}${duration === 0 ? 'P' : 'T'}`
    const now = Date.now()
    const expireAt = duration === 0 ? null : now + 24 * 60 * 60 * 1000

    const codes: string[] = []
    for (let i = 0; i < Math.min(count, 100); i++) {
      let random = ''
      for (let j = 0; j < 8; j++) random += chars[Math.floor(Math.random() * chars.length)]
      const code = `${prefix}-${random}`
      codes.push(code)
      await db.prepare('INSERT INTO codes (code, multiplier, duration, expire_at, created_at, code_type) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(code, codeType === 'auto_break' ? 0 : multiplier, codeType === 'auto_break' ? 0 : duration, expireAt, now, codeType).run()
    }
    return json({ success: true, codes })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

adminRoutes.delete('/admin/codes', async (c) => {
  const db = c.env.DB
  const { code } = await c.req.json<{ code: string }>()
  await db.prepare('DELETE FROM codes WHERE code = ?').bind(code).run()
  return json({ success: true })
})

// ==================== 玩家 ====================

adminRoutes.get('/admin/players', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = (page - 1) * limit
  const total = await db.prepare('SELECT COUNT(*) as count FROM players').first<{ count: number }>()
  const rows = await db.prepare('SELECT * FROM players ORDER BY realm_index DESC, spirit_stones DESC LIMIT ? OFFSET ?').bind(limit, offset).all()
  return json({ total: total!.count, page, limit, data: rows.results })
})

// ==================== 怪物 & 掉落 ====================

adminRoutes.get('/admin/monsters', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare('SELECT * FROM monsters ORDER BY id').all()
  return json(rows.results || [])
})

adminRoutes.get('/admin/drops', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare(`
    SELECT md.*, m.name as monster_name, i.name as item_name, i.icon
    FROM monster_drops md JOIN monsters m ON md.monster_id = m.id JOIN items i ON md.item_id = i.id
    ORDER BY md.monster_id, md.drop_chance DESC
  `).all()
  return json(rows.results || [])
})

// ==================== 配置 ====================

adminRoutes.get('/admin/config', async (c) => {
  const db = c.env.DB
  try {
    const rows = await db.prepare('SELECT key, value FROM configs').all<{ key: string; value: string }>()
    const config: Record<string, unknown> = {}
    for (const row of rows.results || []) {
      try { config[row.key] = JSON.parse(row.value) } catch { config[row.key] = row.value }
    }
    return json(config)
  } catch { return json({}) }
})

adminRoutes.post('/admin/config', async (c) => {
  const db = c.env.DB
  try {
    const config = await c.req.json<Record<string, unknown>>()
    const now = Date.now()
    for (const [key, value] of Object.entries(config)) {
      const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
      await db.prepare('INSERT OR REPLACE INTO configs (key, value, updated_at) VALUES (?, ?, ?)').bind(key, strValue, now).run()
    }
    return json({ success: true })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// ==================== 转世记录 ====================

adminRoutes.get('/admin/reincarnations', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare('SELECT * FROM reincarnation_log ORDER BY id DESC LIMIT 100').all()
  return json(rows.results || [])
})

// ==================== 商店管理 ====================

adminRoutes.get('/admin/shop', async (c) => {
  const db = c.env.DB
  try {
    const rows = await db.prepare(
      'SELECT si.id, si.item_id, si.price, si.stock_limit, i.name, i.icon, i.desc, i.type FROM shop_items si JOIN items i ON si.item_id = i.id ORDER BY si.id'
    ).all()
    return json(rows.results || [])
  } catch (err: any) { return json({ error: err.message }, 500) }
})

adminRoutes.post('/admin/shop', async (c) => {
  const db = c.env.DB
  try {
    const { item_id, price, stock_limit } = await c.req.json<{ item_id: number; price: number; stock_limit: number }>()
    if (!item_id || !price) return json({ error: '参数不完整' }, 400)
    await db.prepare('INSERT INTO shop_items (item_id, price, stock_limit) VALUES (?, ?, ?)').bind(item_id, price, stock_limit ?? -1).run()
    return json({ success: true })
  } catch (err: any) { return json({ error: err.message }, 500) }
})

adminRoutes.delete('/admin/shop', async (c) => {
  const db = c.env.DB
  try {
    const { id } = await c.req.json<{ id: number }>()
    if (!id) return json({ error: '缺少id' }, 400)
    await db.prepare('DELETE FROM shop_items WHERE id = ?').bind(id).run()
    return json({ success: true })
  } catch (err: any) { return json({ error: err.message }, 500) }
})

adminRoutes.patch('/admin/shop', async (c) => {
  const db = c.env.DB
  try {
    const { id, price, stock_limit } = await c.req.json<{ id: number; price?: number; stock_limit?: number }>()
    if (!id) return json({ error: '缺少id' }, 400)
    if (price !== undefined) await db.prepare('UPDATE shop_items SET price = ? WHERE id = ?').bind(price, id).run()
    if (stock_limit !== undefined) await db.prepare('UPDATE shop_items SET stock_limit = ? WHERE id = ?').bind(stock_limit, id).run()
    return json({ success: true })
  } catch (err: any) { return json({ error: err.message }, 500) }
})

adminRoutes.get('/admin/items', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare('SELECT * FROM items ORDER BY id').all()
  return json(rows.results || [])
})

// ==================== 排行榜 ====================

adminRoutes.get('/api/leaderboard', async (c) => {
  const db = c.env.DB
  try {
    const rows = await db.prepare(
      'SELECT name, realm, realm_index, age, lifespan, spirit_stones as gold, score, updated_at FROM leaderboard ORDER BY score DESC LIMIT 100'
    ).all()
    return json({ entries: rows.results || [] })
  } catch (err: any) {
    return json({ entries: [], error: err.message })
  }
})

adminRoutes.post('/api/leaderboard/submit', async (c) => {
  const db = c.env.DB
  try {
    const { uid, name, realm, realmIndex, age, lifespan, gold } = await c.req.json<{
      uid: string; name: string; realm: string; realmIndex: number; age: number; lifespan: number; gold: number
    }>()
    if (!uid || !name) return json({ error: '参数不完整' }, 400)

    const realmScore = (realmIndex || 0) * 1000
    const lifeEfficiency = ((lifespan - age) / lifespan) * 500
    const goldScore = Math.log2(Math.max(1, gold || 0)) * 50
    const score = Math.floor(realmScore + lifeEfficiency + goldScore)
    const now = Date.now()

    const existing = await db.prepare('SELECT score FROM leaderboard WHERE uid = ?').bind(uid).first<{ score: number }>()
    if (existing && score <= existing.score) {
      const rank = await db.prepare('SELECT COUNT(*) as c FROM leaderboard WHERE score > ?').bind(existing.score).first<{ c: number }>()
      return json({ success: true, rank: rank!.c + 1, score: existing.score })
    }

    await db.prepare(`
      INSERT INTO leaderboard (uid, name, realm, realm_index, age, lifespan, gold, score, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        name = excluded.name, realm = excluded.realm, realm_index = excluded.realm_index,
        age = excluded.age, lifespan = excluded.lifespan, gold = excluded.gold,
        score = excluded.score, updated_at = excluded.updated_at
    `).bind(uid, name, realm, realmIndex, age, lifespan, gold, score, now).run()

    const rank = await db.prepare('SELECT COUNT(*) as c FROM leaderboard WHERE score > ?').bind(score).first<{ c: number }>()
    return json({ success: true, rank: rank!.c + 1, score })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})
