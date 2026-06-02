/**
 * 凡人修仙传 - 公开接口（无需认证）
 *
 * GET /health          - 健康检查
 * GET /announcement    - 获取公告（兼容旧版）
 * GET /game/config     - 获取游戏配置（游戏名/公告/收款码/QQ群）
 * GET /shop/config     - 获取商店商品列表
 * GET /api/realms      - 获取境界列表
 */

import { Hono } from 'hono'
import type { Env } from '../types'
import { json, getRealms } from '../utils'

export const publicRoutes = new Hono<{ Bindings: Env }>()

// 健康检查
publicRoutes.get('/health', (c) => json({ status: 'ok' }))

// 获取公告（兼容旧版）
publicRoutes.get('/announcement', async (c) => {
  const db = c.env.DB
  try {
    const row = await db.prepare("SELECT value FROM configs WHERE key = 'announcement'").first<{ value: string }>()
    return json({ text: row?.value || '' })
  } catch {
    return json({ text: '' })
  }
})

// 获取游戏公开配置
publicRoutes.get('/game/config', async (c) => {
  const db = c.env.DB
  try {
    const rows = await db.prepare("SELECT key, value FROM configs").all<{ key: string; value: string }>()
    const config: Record<string, string> = {}
    for (const row of rows.results || []) {
      config[row.key] = row.value
    }
    return json({
      gameName: config.gameName || '凡人修仙传',
      announcement: config.announcement || '',
      qrcodeUrl: config.qrcodeUrl || '',
      qrcodeBase64: config.qrcodeBase64 || '',
      payTip: config.payTip || '微信扫码支付',
      qqGroup: config.qqGroup || '',
      qqGroupLink: config.qqGroupLink || '',
      qqGroupName: config.qqGroupName || '',
    })
  } catch {
    return json({ gameName: '凡人修仙传', announcement: '' })
  }
})

// 获取商店商品列表
publicRoutes.get('/shop/config', async (c) => {
  const db = c.env.DB
  try {
    const rows = await db.prepare(
      'SELECT si.id, si.item_id, si.price, si.stock_limit, i.name, i.icon, i.desc, i.type FROM shop_items si JOIN items i ON si.item_id = i.id ORDER BY si.id'
    ).all()
    return json(rows.results || [])
  } catch {
    return json([])
  }
})

// 获取境界列表
publicRoutes.get('/api/realms', async (c) => {
  const db = c.env.DB
  const realms = await getRealms(db)
  return json({ realms })
})
