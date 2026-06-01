/**
 * 管理后台 API
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://xiuxian-api.你的子域名.workers.dev'

function getToken() {
  return localStorage.getItem('admin_token') || ''
}

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...options.headers,
    },
  })
  return res.json()
}

export const adminApi = {
  // 统计
  getStats: () => request('/admin/stats'),

  // 兑换码
  getCodes: (page = 1, limit = 20, status = 'all') =>
    request(`/admin/codes?page=${page}&limit=${limit}&status=${status}`),

  createCodes: (multiplier, duration, count) =>
    request('/admin/codes', {
      method: 'POST',
      body: JSON.stringify({ multiplier, duration, count }),
    }),

  deleteCode: (code) =>
    request('/admin/codes', {
      method: 'DELETE',
      body: JSON.stringify({ code }),
    }),

  // 玩家
  getPlayers: (page = 1, limit = 20) =>
    request(`/admin/players?page=${page}&limit=${limit}`),

  // 配置
  getConfig: () => request('/admin/config'),

  saveConfig: (config) =>
    request('/admin/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  // 商店
  getShopItems: () => request('/admin/shop'),

  addShopItem: (item) =>
    request('/admin/shop', {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  deleteShopItem: (id) =>
    request('/admin/shop', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    }),
}
