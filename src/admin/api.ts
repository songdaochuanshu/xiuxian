/**
 * 管理后台 API
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://api.xiuxian.website'

function getToken(): string {
  return localStorage.getItem('admin_token') || ''
}

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  })
  return res.json()
}

export const adminApi = {
  getStats: () => request('/admin/stats'),

  getCodes: (page = 1, limit = 20, status = 'all') =>
    request(`/admin/codes?page=${page}&limit=${limit}&status=${status}`),

  createCodes: (multiplier: number, duration: number, count: number, codeType = 'speed') =>
    request('/admin/codes', {
      method: 'POST',
      body: JSON.stringify({ multiplier, duration, count, codeType }),
    }),

  deleteCode: (code: string) =>
    request('/admin/codes', {
      method: 'DELETE',
      body: JSON.stringify({ code }),
    }),

  getPlayers: (page = 1, limit = 20) =>
    request(`/admin/players?page=${page}&limit=${limit}`),

  // 排行榜
  getLeaderboard: () => request('/api/leaderboard'),

  // 境界
  getRealms: () => request('/api/realms'),

  getConfig: () => request('/admin/config'),

  saveConfig: (config: Record<string, any>) =>
    request('/admin/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  getShopItems: () => request('/admin/shop'),

  addShopItem: (item: any) =>
    request('/admin/shop', {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  deleteShopItem: (id: number) =>
    request('/admin/shop', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    }),
}
