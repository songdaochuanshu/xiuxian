<template>
  <!-- 登录页 -->
  <div v-if="!loggedIn" class="login">
    <div class="login-box">
      <h2>🔐 管理后台</h2>
      <input
        v-model="password"
        type="password"
        placeholder="请输入管理密码"
        @keyup.enter="doLogin"
      />
      <button @click="doLogin">登录</button>
      <p v-if="loginError" class="login-error">{{ loginError }}</p>
    </div>
  </div>

  <!-- 主应用 -->
  <div v-else class="admin-app">
    <!-- 桌面侧边栏 -->
    <div class="sidebar">
      <h2>⚙️ 管理后台</h2>
      <div
        v-for="item in navItems"
        :key="item.key"
        class="nav-item"
        :class="{ active: currentPage === item.key }"
        @click="currentPage = item.key"
      >
        {{ item.icon }} {{ item.label }}
      </div>
      <div class="nav-item nav-logout" @click="logout">🚪 退出</div>
    </div>

    <!-- 内容区 -->
    <div class="main">
      <!-- 移动端顶栏 -->
      <div class="mobile-header">
        <span class="mobile-title">⚙️ 管理后台</span>
        <span class="mobile-logout" @click="logout">🚪</span>
      </div>

      <Dashboard v-if="currentPage === 'dashboard'" />
      <Codes v-if="currentPage === 'codes'" />
      <Players v-if="currentPage === 'players'" />
      <Leaderboard v-if="currentPage === 'leaderboard'" />
      <ShopManage v-if="currentPage === 'shop'" />
      <Realms v-if="currentPage === 'realms'" />
      <Config v-if="currentPage === 'config'" />
    </div>

    <!-- 移动端底部导航 -->
    <div class="mobile-nav">
      <div
        v-for="item in navItems"
        :key="item.key"
        class="mobile-nav-item"
        :class="{ active: currentPage === item.key }"
        @click="currentPage = item.key"
      >
        <span class="mobile-nav-icon">{{ item.icon }}</span>
        <span class="mobile-nav-label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.xiuxian.website'
import Dashboard from './components/Dashboard.vue'
import Codes from './components/Codes.vue'
import Players from './components/Players.vue'
import Leaderboard from './components/Leaderboard.vue'
import Config from './components/Config.vue'
import ShopManage from './components/ShopManage.vue'
import Realms from './components/Realms.vue'

const loggedIn = ref(false)
const password = ref('')
const loginError = ref('')
const currentPage = ref('dashboard')

const navItems = [
  { key: 'dashboard', icon: '📊', label: '仪表盘' },
  { key: 'codes', icon: '🎫', label: '兑换码' },
  { key: 'players', icon: '👥', label: '玩家' },
  { key: 'leaderboard', icon: '🏆', label: '排行榜' },
  { key: 'shop', icon: '🏪', label: '商店' },
  { key: 'realms', icon: '🏔️', label: '境界' },
  { key: 'config', icon: '⚙️', label: '配置' },
]

async function doLogin() {
  if (!password.value) {
    loginError.value = '请输入密码'
    return
  }
  // 先验证密码是否正确
  try {
    const res = await fetch(`${API_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${password.value}` },
    })
    if (res.status === 401) {
      loginError.value = '密码错误，请重新输入'
      return
    }
    if (!res.ok) {
      loginError.value = '服务器错误，请稍后再试'
      return
    }
    // 密码正确，保存并进入
    localStorage.setItem('admin_token', password.value)
    loggedIn.value = true
    loginError.value = ''
  } catch {
    loginError.value = '网络错误，请检查连接'
  }
}

function logout() {
  localStorage.removeItem('admin_token')
  loggedIn.value = false
  password.value = ''
}

// 检查是否已登录（有保存的 token 则自动验证）
const savedToken = localStorage.getItem('admin_token')
if (savedToken) {
  password.value = savedToken
  doLogin()
}
</script>

<style scoped>
.login {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
.login-box {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 30px;
  width: 320px;
  text-align: center;
}
.login-box h2 {
  color: var(--gold);
  margin-bottom: 20px;
}
.login-box input {
  width: 100%;
  padding: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 14px;
  margin-bottom: 12px;
  outline: none;
  font-family: inherit;
}
.login-box input:focus {
  border-color: var(--gold-dim);
}
.login-box button {
  width: 100%;
  padding: 10px;
  background: var(--gold);
  color: #000;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  font-weight: bold;
  font-family: inherit;
}
.login-error {
  color: var(--danger);
  font-size: 12px;
  margin-top: 8px;
}

.admin-app {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 200px;
  background: var(--panel);
  border-right: 1px solid var(--border);
  padding: 16px 0;
  flex-shrink: 0;
}
.sidebar h2 {
  color: var(--gold);
  text-align: center;
  padding: 0 16px 16px;
  font-size: 16px;
  border-bottom: 1px solid var(--border);
}
.nav-item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}
.nav-item:hover, .nav-item.active {
  background: rgba(212,168,83,0.1);
  color: var(--gold);
}
.nav-logout {
  margin-top: auto;
  color: var(--danger);
  opacity: 0.6;
}
.nav-logout:hover {
  opacity: 1;
  background: rgba(224,64,64,0.1);
  color: var(--danger);
}

.main {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

/* 移动端顶栏（桌面隐藏） */
.mobile-header {
  display: none;
}

/* 移动端底部导航（桌面隐藏） */
.mobile-nav {
  display: none;
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }

  .mobile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  .mobile-title {
    color: var(--gold);
    font-size: 15px;
    letter-spacing: 2px;
  }
  .mobile-logout {
    cursor: pointer;
    font-size: 18px;
    padding: 4px;
  }

  .main {
    padding: 12px 12px 80px;
    overflow-x: hidden;
  }

  .mobile-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--panel);
    border-top: 1px solid var(--border);
    z-index: 100;
    padding: 6px 0;
    padding-bottom: max(6px, env(safe-area-inset-bottom));
  }
  .mobile-nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 4px 0;
    cursor: pointer;
    transition: color 0.2s;
    color: var(--text-dim);
  }
  .mobile-nav-item.active {
    color: var(--gold);
  }
  .mobile-nav-icon {
    font-size: 18px;
  }
  .mobile-nav-label {
    font-size: 10px;
  }
}
</style>
