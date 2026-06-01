<template>
  <!-- 用户档案 -->
  <UserProfile />

  <div class="game-layout">
    <!-- 侧边栏 -->
    <div class="sidebar" :class="{ expanded: sidebarOpen }">
      <div class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen">
        <span class="toggle-icon">{{ sidebarOpen ? '◀' : '▶' }}</span>
      </div>

      <div class="sidebar-nav">
        <div
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ active: currentPage === item.key }"
          @click="currentPage = item.key"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 公告 -->
      <Announcement v-if="currentPage !== 'battle'" />

      <!-- 修炼页 -->
      <template v-if="currentPage === 'cultivate'">
        <PlayerInfo />
        <PixelCharacter />
        <ActionPanel />
      </template>

      <!-- 背包页 -->
      <template v-if="currentPage === 'bag'">
        <ItemBag />
      </template>

      <!-- 商店页 -->
      <template v-if="currentPage === 'shop'">
        <Shop />
        <SpeedShop />
      </template>

      <!-- 日志页 -->
      <template v-if="currentPage === 'log'">
        <GameLog />
      </template>

      <!-- 排行榜页 -->
      <template v-if="currentPage === 'rank'">
        <Leaderboard />
      </template>
    </div>
  </div>

  <!-- 战斗面板 -->
  <BattlePanel />

  <!-- 突破动画 -->
  <BreakthroughOverlay />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from './stores/player.js'
import { useGameStore } from './stores/game.js'
import PlayerInfo from './components/PlayerInfo.vue'
import ActionPanel from './components/ActionPanel.vue'
import ItemBag from './components/ItemBag.vue'
import GameLog from './components/GameLog.vue'
import BattlePanel from './components/BattlePanel.vue'
import BreakthroughOverlay from './components/BreakthroughOverlay.vue'
import Leaderboard from './components/Leaderboard.vue'
import PixelCharacter from './components/PixelCharacter.vue'
import SpeedShop from './components/SpeedShop.vue'
import Shop from './components/Shop.vue'
import Announcement from './components/Announcement.vue'
import UserProfile from './components/UserProfile.vue'

const player = usePlayerStore()
const game = useGameStore()

const sidebarOpen = ref(false)
const currentPage = ref('cultivate')

const navItems = [
  { key: 'cultivate', icon: '🧘', label: '修炼' },
  { key: 'bag', icon: '🎒', label: '背包' },
  { key: 'shop', icon: '🏪', label: '坊市' },
  { key: 'log', icon: '📜', label: '记录' },
  { key: 'rank', icon: '🏆', label: '天榜' },
]

let tickTimer = null
let syncTimer = null

const API_URL = import.meta.env.VITE_API_URL || 'https://xiuxian-api.你的子域名.workers.dev'

async function syncPlayer() {
  if (!player.uid) return
  try {
    await fetch(`${API_URL}/player/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: player.uid,
        name: player.name,
        realm: player.realmName,
        realmIndex: player.realmIndex,
        age: player.age,
        gold: player.gold,
        spiritStones: player.spiritStones,
        speedMultiplier: player.speedMultiplier,
        speedExpireTime: player.speedExpireTime,
      }),
    })
  } catch (e) {}
}

function startTick() {
  tickTimer = setInterval(() => {
    if (game.cultivating && !player.isDead) {
      const result = player.cultivate()
      if (result?.type === 'event') {
        game.addLog(result.text, 'success')
      }

      player.tickSpeed()

      game.tickCount++
      if (game.tickCount % 60 === 0) {
        const ageResult = player.ageUp()
        if (ageResult.dead) {
          game.addLog('天劫降临！寿元已尽...', 'battle')
          game.addLog('══════════════════', 'system')
          game.addLog('寿元已尽，修仙之路到此为止。', 'battle')
          game.addLog(`最终境界：${player.realmName}`, 'system')
          game.addLog(`享年：${player.age} 岁`, 'system')
          game.addLog('══════════════════', 'system')
          game.toggleCultivate()
          return
        }
        if (ageResult.warning) {
          game.addLog(`⚠️ 寿元将尽！剩余${ageResult.remaining}年`, 'battle')
        }
      }

      if (player.canBreakthrough && game.tickCount % 10 === 0) {
        game.addLog('修为已满，可尝试突破境界。', 'breakthrough')
        if (player.autoBreak && !player.isMaxRealm) {
          const result = player.breakthrough()
          if (result.success) {
            game.addLog(`✨ 自动突破！${result.realmName}`, 'breakthrough')
            game.triggerBreakthrough({ realmName: result.realmName, lifespanGain: result.lifespanGain })
          } else if (!result.needItem) {
            game.addLog(`自动突破失败，损失 ${result.lostExp} 修为`, 'battle')
          }
        }
      }
    }
  }, 1000)
}

onMounted(() => {
  game.addLog('你出生于凡人家庭，偶然得到一本残缺功法...', 'system')
  game.addLog('从此踏上漫漫修仙之路。', 'system')
  startTick()
  syncPlayer()
  syncTimer = setInterval(syncPlayer, 60000)
})

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
  if (syncTimer) clearInterval(syncTimer)
})
</script>

<style scoped>
.game-layout {
  display: flex;
  min-height: 100vh;
  position: relative;
}

/* 侧边栏 */
.sidebar {
  width: 48px;
  background: linear-gradient(180deg, rgba(18,18,26,0.98), rgba(10,10,15,0.98));
  border-right: 1px solid var(--border);
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 50;
  transition: width 0.3s ease;
  overflow: hidden;
}
.sidebar.expanded {
  width: 140px;
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  color: var(--gold);
  font-size: 12px;
}
.sidebar-toggle:hover {
  background: rgba(212,168,83,0.05);
}

.toggle-icon {
  transition: transform 0.3s;
}

.sidebar-nav {
  padding: 8px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.nav-item:hover {
  background: rgba(212,168,83,0.08);
}
.nav-item.active {
  background: rgba(212,168,83,0.12);
}
.nav-item.active .nav-icon {
  filter: drop-shadow(0 0 4px rgba(212,168,83,0.5));
}
.nav-item.active .nav-label {
  color: var(--gold);
}

.nav-icon {
  font-size: 18px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}
.nav-label {
  font-size: 13px;
  color: var(--text-dim);
  font-family: 'ZCOOL XiaoWei', serif;
  letter-spacing: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}
.sidebar.expanded .nav-label {
  opacity: 1;
}

/* 主内容 */
.main-content {
  flex: 1;
  margin-left: 48px;
  padding: 12px;
  max-width: 500px;
  transition: margin-left 0.3s;
}
.sidebar.expanded ~ .main-content {
  margin-left: 140px;
}

@media (max-width: 480px) {
  .sidebar {
    width: 0;
  }
  .sidebar.expanded {
    width: 140px;
  }
  .main-content {
    margin-left: 0;
    padding: 12px 8px;
  }
  .sidebar.expanded ~ .main-content {
    margin-left: 140px;
  }
}
</style>
