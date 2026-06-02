/**
 * 凡人修仙传 - 任务系统
 *
 * GET  /api/tasks              - 获取任务列表（含进度）
 * POST /api/tasks/progress     - 更新单个任务进度
 * POST /api/tasks/batch-progress - 批量更新任务进度
 * POST /api/tasks/claim        - 领取任务奖励
 */

import { Hono } from 'hono'
import type { Env } from '../types'
import { json, getToday } from '../utils'

export const taskRoutes = new Hono<{ Bindings: Env }>()

// 获取任务列表（含玩家进度）
taskRoutes.get('/api/tasks', async (c) => {
  const db = c.env.DB
  try {
    const uid = c.req.query('uid')
    if (!uid) return json({ error: '缺少uid' }, 400)
    const today = getToday()

    // 跨天自动重置每日任务
    const lastDaily = await db.prepare(
      "SELECT date FROM player_tasks WHERE uid = ? AND task_id LIKE 'daily_%' ORDER BY id DESC LIMIT 1"
    ).bind(uid).first<{ date: string }>()
    if (lastDaily && lastDaily.date && lastDaily.date < today) {
      await db.prepare("DELETE FROM player_tasks WHERE uid = ? AND task_id LIKE 'daily_%'").bind(uid).run()
    }

    // 获取所有任务 + 玩家进度
    const tasks = await db.prepare('SELECT * FROM tasks ORDER BY type, sort_order').all()
    const progress = await db.prepare('SELECT task_id, progress, status, date FROM player_tasks WHERE uid = ?').bind(uid).all()

    const progressMap: Record<string, any> = {}
    for (const p of (progress.results || [])) {
      progressMap[p.task_id as string] = p
    }

    const result = (tasks.results || []).map((t: any) => {
      const p = progressMap[t.id]
      const isDaily = t.type === 'daily'
      let progressVal = p?.progress || 0
      let status = p?.status || 'pending'

      // 每日任务检查日期
      if (isDaily && p?.date && p.date < today) {
        progressVal = 0
        status = 'pending'
      }

      return {
        id: t.id, type: t.type, name: t.name, desc: t.desc, target: t.target,
        rewardType: t.reward_type, rewardValue: t.reward_value, rewardAmount: t.reward_amount,
        progress: Math.min(progressVal, t.target),
        status: progressVal >= t.target ? (status === 'claimed' ? 'claimed' : 'completed') : status,
      }
    })

    return json({ tasks: result, today })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// 批量更新任务进度
taskRoutes.post('/api/tasks/batch-progress', async (c) => {
  const db = c.env.DB
  try {
    const { uid, events } = await c.req.json<{ uid: string; events: { taskId: string; amount?: number }[] }>()
    if (!uid || !events) return json({ error: '参数不完整' }, 400)
    const today = getToday()
    const updated: string[] = []

    for (const evt of events) {
      const task = await db.prepare('SELECT type, target FROM tasks WHERE id = ?').bind(evt.taskId).first<any>()
      if (!task) continue
      const add = evt.amount || 1
      const dateKey = task.type === 'daily' ? today : ''

      const existing = await db.prepare(
        'SELECT id, progress, status FROM player_tasks WHERE uid = ? AND task_id = ? AND date = ?'
      ).bind(uid, evt.taskId, dateKey).first<any>()

      if (existing) {
        if (existing.status !== 'claimed' && existing.progress < task.target) {
          await db.prepare('UPDATE player_tasks SET progress = progress + ? WHERE id = ?').bind(add, existing.id).run()
          updated.push(evt.taskId)
        }
      } else {
        await db.prepare('INSERT INTO player_tasks (uid, task_id, progress, status, date) VALUES (?, ?, ?, ?, ?)')
          .bind(uid, evt.taskId, add, 'pending', dateKey).run()
        updated.push(evt.taskId)
      }
    }

    return json({ success: true, updated })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// 领取任务奖励
taskRoutes.post('/api/tasks/claim', async (c) => {
  const db = c.env.DB
  try {
    const { uid, taskId } = await c.req.json<{ uid: string; taskId: string }>()
    if (!uid || !taskId) return json({ error: '参数不完整' }, 400)
    const today = getToday()

    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first<any>()
    if (!task) return json({ error: '任务不存在' }, 404)

    const dateKey = task.type === 'daily' ? today : ''
    const pt = await db.prepare('SELECT id, progress, status FROM player_tasks WHERE uid = ? AND task_id = ? AND date = ?')
      .bind(uid, taskId, dateKey).first<any>()

    if (!pt || pt.progress < task.target) return json({ error: '任务未完成' })
    if (pt.status === 'claimed') return json({ error: '已领取' })

    // 发放奖励
    if (task.reward_type === 'spirit_stones') {
      await db.prepare('UPDATE players SET spirit_stones = spirit_stones + ? WHERE uid = ?')
        .bind(task.reward_amount, uid).run()
    } else if (task.reward_type === 'item') {
      const item = await db.prepare('SELECT id FROM items WHERE name = ?').bind(task.reward_value).first<{ id: number }>()
      if (item) {
        await db.prepare(
          `INSERT INTO user_inventory (user_uid, item_id, quantity, created_at)
           VALUES (?, ?, ?, ?) ON CONFLICT(user_uid, item_id) DO UPDATE SET quantity = quantity + ?`
        ).bind(uid, item.id, task.reward_amount, Date.now(), task.reward_amount).run()
      }
    }

    await db.prepare("UPDATE player_tasks SET status = 'claimed', claimed_at = ? WHERE id = ?")
      .bind(Date.now(), pt.id).run()

    return json({ success: true, reward: { type: task.reward_type, value: task.reward_value, amount: task.reward_amount } })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})
