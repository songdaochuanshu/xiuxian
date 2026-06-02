/**
 * 凡人修仙传 - 聊天室 & 世界公告
 *
 * GET  /api/chat/messages  - 获取聊天消息
 * POST /api/chat/send      - 发送聊天消息
 * GET  /api/world-events   - 获取世界事件
 * POST /api/world-events   - 提交世界事件
 */

import { Hono } from 'hono'
import type { Env } from '../types'
import { json } from '../utils'

export const chatRoutes = new Hono<{ Bindings: Env }>()

// ==================== 聊天室 ====================

// 获取聊天消息
chatRoutes.get('/api/chat/messages', async (c) => {
  const db = c.env.DB
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100)
    const after = c.req.query('after')
    const before = c.req.query('before')

    let query = 'SELECT id, uid, name, content, realm, created_at FROM messages'
    const params: any[] = []

    if (after) { query += ' WHERE id > ?'; params.push(parseInt(after)) }
    else if (before) { query += ' WHERE id < ?'; params.push(parseInt(before)) }

    query += ' ORDER BY id DESC LIMIT ?'
    params.push(limit)

    const rows = await db.prepare(query).bind(...params).all()
    return json({ messages: (rows.results || []).reverse() })
  } catch (err: any) {
    return json({ messages: [], error: err.message })
  }
})

// 发送聊天消息
chatRoutes.post('/api/chat/send', async (c) => {
  const db = c.env.DB
  try {
    const { uid, name, content, realm } = await c.req.json<{
      uid: string; name: string; content: string; realm?: string
    }>()
    if (!uid || !name || !content) return json({ error: '参数不完整' }, 400)
    if (content.length > 100) return json({ error: '消息不能超过100字' }, 400)

    // 频率限制：每人每3秒最多1条
    const recent = await db.prepare('SELECT id FROM messages WHERE uid = ? AND created_at > ? ORDER BY id DESC LIMIT 1')
      .bind(uid, Date.now() - 3000).first()
    if (recent) return json({ error: '说话太快了，休息一下~' }, 429)

    // 自动清理：保留最近500条
    const count = await db.prepare('SELECT COUNT(*) as c FROM messages').first<{ c: number }>()
    if (count && count.c > 500) {
      await db.prepare('DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 500)').run()
    }

    await db.prepare('INSERT INTO messages (uid, name, content, realm, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(uid, name, content.trim(), realm || '', Date.now()).run()

    return json({ success: true })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// ==================== 世界公告 ====================

// 获取世界事件
chatRoutes.get('/api/world-events', async (c) => {
  const db = c.env.DB
  try {
    const after = c.req.query('after')
    let query = 'SELECT id, uid, name, event_type, content, realm, created_at FROM world_events'
    const params: any[] = []
    if (after) { query += ' WHERE id > ?'; params.push(parseInt(after)) }
    query += ' ORDER BY id DESC LIMIT 30'
    const rows = await db.prepare(query).bind(...params).all()
    return json({ events: (rows.results || []).reverse() })
  } catch {
    return json({ events: [] })
  }
})

// 提交世界事件
chatRoutes.post('/api/world-events', async (c) => {
  const db = c.env.DB
  try {
    const { uid, name, eventType, content, realm } = await c.req.json<{
      uid: string; name: string; eventType: string; content: string; realm?: string
    }>()
    if (!uid || !name || !content) return json({ error: '参数不完整' }, 400)

    // 频率限制：每人每10秒最多1条
    const recent = await db.prepare('SELECT id FROM world_events WHERE uid = ? AND created_at > ? ORDER BY id DESC LIMIT 1')
      .bind(uid, Date.now() - 10000).first()
    if (recent) return json({ success: true, skipped: true })

    // 自动清理：保留最近200条
    const count = await db.prepare('SELECT COUNT(*) as c FROM world_events').first<{ c: number }>()
    if (count && count.c > 200) {
      await db.prepare('DELETE FROM world_events WHERE id NOT IN (SELECT id FROM world_events ORDER BY id DESC LIMIT 200)').run()
    }

    await db.prepare('INSERT INTO world_events (uid, name, event_type, content, realm, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(uid, name, eventType, content, realm || '', Date.now()).run()

    return json({ success: true })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})
