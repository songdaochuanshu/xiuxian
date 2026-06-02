/**
 * 凡人修仙传 - Cloudflare Worker 入口
 *
 * 架构：Hono 框架 + D1 数据库
 * 模块：public / player / abyss / tasks / chat / save / admin
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import { json } from './utils'

// 路由模块
import { publicRoutes } from './routes/public'
import { playerRoutes } from './routes/player'
import { abyssRoutes } from './routes/abyss'
import { taskRoutes } from './routes/tasks'
import { chatRoutes } from './routes/chat'
import { saveRoutes } from './routes/save'
import { adminRoutes } from './routes/admin'

const app = new Hono<{ Bindings: Env }>()

// 全局 CORS
app.use('*', cors())

// 注册路由模块
app.route('/', publicRoutes)
app.route('/', playerRoutes)
app.route('/', abyssRoutes)
app.route('/', taskRoutes)
app.route('/', chatRoutes)
app.route('/', saveRoutes)
app.route('/', adminRoutes)

// 404
app.notFound((c) => json({ error: 'Not Found' }))

// 全局错误处理
app.onError((err, c) => json({ error: err.message }, 500))

export default app
