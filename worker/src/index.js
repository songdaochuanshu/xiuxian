/**
 * 修仙加速器 - Cloudflare Worker
 * 处理兑换码验证
 */

export default {
  async fetch(request, env) {
    // CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // 处理 OPTIONS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)

    // 路由
    if (url.pathname === '/redeem' && request.method === 'POST') {
      return await handleRedeem(request, env, corsHeaders)
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders })
  },
}

/**
 * 处理兑换码验证
 */
async function handleRedeem(request, env, corsHeaders) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return jsonResponse({ success: false, error: '请输入兑换码' }, 400, corsHeaders)
    }

    // 标准化输入
    const normalizedCode = code.trim().toUpperCase().replace(/\s/g, '')

    // 查询数据库
    const row = await env.DB.prepare(
      'SELECT * FROM codes WHERE code = ?'
    ).bind(normalizedCode).first()

    if (!row) {
      return jsonResponse({ success: false, error: '兑换码不存在' }, 200, corsHeaders)
    }

    if (row.used) {
      return jsonResponse({ success: false, error: '兑换码已使用' }, 200, corsHeaders)
    }

    // 检查是否过期
    if (row.expire_at && Date.now() > row.expire_at) {
      return jsonResponse({ success: false, error: '兑换码已过期' }, 200, corsHeaders)
    }

    // 标记为已使用
    await env.DB.prepare(
      'UPDATE codes SET used = 1, used_at = ? WHERE code = ?'
    ).bind(Date.now(), normalizedCode).run()

    // 返回成功
    return jsonResponse({
      success: true,
      multiplier: row.multiplier,
      duration: row.duration,
    }, 200, corsHeaders)

  } catch (err) {
    return jsonResponse({ success: false, error: '服务器错误' }, 500, corsHeaders)
  }
}

function jsonResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
