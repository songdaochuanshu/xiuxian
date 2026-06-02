<template>
  <UserProfile />

  <!-- 主内容区 -->
  <div class="app-container">
    <!-- 标题 -->
    <div class="title">
      <h1>{{ gameName }}</h1>
      <div class="sub">逆 天 改 命 · 证 道 长 生</div>
    </div>

    <!-- Tab 内容 -->
    <div class="tab-content">
      <!-- 🏠 修行 -->
      <div v-show="activeTab === 'home'">
        <Announcement />
        <PlayerInfo />
        <PixelCharacter />
        <ActionPanel />
        <IdleFarm />
        <Tasks ref="tasksRef" />
      </div>

      <!-- 🗼 深渊 -->
      <div v-show="activeTab === 'abyss'">
        <Abyss />
      </div>

      <!-- 📦 背包 -->
      <div v-show="activeTab === 'bag'">
        <ItemBag />
      </div>

      <!-- 💬 频道 -->
      <div v-show="activeTab === 'chat'">
        <Chat />
      </div>

      <!-- 🏆 天榜 -->
      <div v-show="activeTab === 'rank'">
        <InlineLeaderboard />
        <AbyssRank />
      </div>

      <!-- 🏪 坊市 -->
      <div v-show="activeTab === 'shop'">
        <Shop />
        <SpeedShop />
      </div>

      <!-- 🎖️ 成就（移到设置里） -->

      <!-- ⚙️ 设置 -->
      <div v-show="activeTab === 'settings'">
        <Achievements ref="achievementsRef" />
        <DailyCheckIn />
        <Settings />
      </div>
    </div>
  </div>

  <!-- 浮动日志 -->
  <div class="floating-log" :class="{ expanded: logExpanded }" @click="logExpanded = !logExpanded">
    <div class="log-header">
      <span>📜 修仙录</span>
      <span class="log-toggle">{{ logExpanded ? '收起' : '展开' }}</span>
    </div>
    <div class="log-body" ref="logBody">
      <div v-for="log in recentLogs" :key="log.id" class="log-line">
        <span class="log-time">{{ log.time }}</span>
        <span :class="'log-' + log.type">{{ log.text }}</span>
      </div>
    </div>
  </div>

  <!-- 底部导航栏 -->
  <div class="bottom-nav">
    <div
      v-for="tab in tabs"
      :key="tab.key"
      class="nav-item"
      :class="{ active: activeTab === tab.key }"
      @click="activeTab = tab.key"
    >
      <span class="nav-icon">{{ tab.icon }}</span>
      <span class="nav-label">{{ tab.label }}</span>
    </div>
  </div>

  <!-- 挂机收益弹窗 -->
  <Teleport to="body">
    <div v-if="showOfflineReward" class="offline-overlay" @click.self="showOfflineReward = false">
      <div class="offline-box">
        <div class="offline-title">🌙 离线挂机收益</div>
        <div class="offline-desc">你离开了 {{ offlineData?.offlineMinutes || 0 }} 分钟</div>
        <div class="offline-rewards">
          <div class="offline-item">
            <span class="offline-icon">📈</span>
            <span>修为 +{{ offlineData?.gain || 0 }}</span>
          </div>
          <div v-if="offlineData?.randomEvent" class="offline-item">
            <span class="offline-icon">{{ offlineData.randomEvent.type === 'item' ? '🎁' : '⚠️' }}</span>
            <span>{{ offlineData.randomEvent.type === 'item' ? '获得 ' + offlineData.randomEvent.name : offlineData.randomEvent.desc }}</span>
          </div>
          <div v-if="offlineData?.reincarnation" class="offline-item offline-reincarnation">
            <span class="offline-icon">🔄</span>
            <span>寿元已尽，转世重修！加速 +0.1</span>
          </div>
        </div>
        <button class="btn btn-full" @click="showOfflineReward = false">收下收益</button>
      </div>
    </div>
  </Teleport>

  <!-- 弹窗/覆盖层 -->
  <BattlePanel />
  <BreakthroughOverlay />
  <Leaderboard />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { usePlayerStore } from './stores/player.ts'
import { useGameStore } from './stores/game.ts'
import { loadRealms } from './data/realms.ts'
import PlayerInfo from './components/PlayerInfo.vue'
import ActionPanel from './components/ActionPanel.vue'
import ItemBag from './components/ItemBag.vue'
import BattlePanel from './components/BattlePanel.vue'
import BreakthroughOverlay from './components/BreakthroughOverlay.vue'
import PixelCharacter from './components/PixelCharacter.vue'
import SpeedShop from './components/SpeedShop.vue'
import Shop from './components/Shop.vue'
import Announcement from './components/Announcement.vue'
import UserProfile from './components/UserProfile.vue'
import Achievements from './components/Achievements.vue'
import DailyCheckIn from './components/DailyCheckIn.vue'
import Settings from './components/Settings.vue'
import Leaderboard from './components/Leaderboard.vue'
import InlineLeaderboard from './components/InlineLeaderboard.vue'
import Chat from './components/Chat.vue'
import Tasks from './components/Tasks.vue'
import Abyss from './components/Abyss.vue'
import IdleFarm from './components/IdleFarm.vue'
import AbyssRank from './components/AbyssRank.vue'

const player = usePlayerStore()
const game = useGameStore()
const gameName = ref('凡人修仙传')
const showOfflineReward = ref(false)
const offlineData = ref(null)

const activeTab = ref('home')
const logExpanded = ref(false)
const logBody = ref(null)
const achievementsRef = ref(null)
const tasksRef = ref(null)

const tabs = [
  { key: 'home', icon: '🏠', label: '修行' },
  { key: 'bag', icon: '📦', label: '背包' },
  { key: 'abyss', icon: '🗼', label: '深渊' },
  { key: 'chat', icon: '💬', label: '频道' },
  { key: 'rank', icon: '🏆', label: '天榜' },
  { key: 'settings', icon: '⚙️', label: '设置' },
]

const recentLogs = computed(() => {
  return logExpanded.value ? game.logs.slice(0, 50) : game.logs.slice(0, 5)
})

watch(() => game.logs.length, () => {
  nextTick(() => {
    if (logBody.value && logExpanded.value) {
      logBody.value.scrollTop = 0
    }
  })
})

let tickTimer = null
let syncTimer = null
let worldEventTimer = null
let lastWorldEventId = 0

const API_URL = import.meta.env.VITE_API_URL || 'https://api.xiuxian.website'

// 更新任务进度
async function updateTaskProgress(events) {
  if (!player.uid || !events.length) return
  try {
    await fetch(`${API_URL}/api/tasks/batch-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: player.uid, events }),
    })
    // 刷新任务列表
    if (tasksRef.value) tasksRef.value.loadTasks()
  } catch {}
}

async function pollWorldEvents() {
  try {
    const url = lastWorldEventId > 0
      ? `${API_URL}/api/world-events?after=${lastWorldEventId}`
      : `${API_URL}/api/world-events`
    const res = await fetch(url)
    const data = await res.json()
    if (data.events && data.events.length > 0) {
      for (const evt of data.events) {
        if (evt.id > lastWorldEventId) {
          lastWorldEventId = evt.id
          // 不显示自己的事件
          if (evt.uid !== player.uid) {
            game.addLog(evt.content, 'world')
          }
        }
      }
    }
  } catch {}
}



async function syncPlayer() {
  if (!player.uid) return
  try {
    const res = await fetch(`${API_URL}/player/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: player.uid,
        name: player.name,
        realm: player.realmName,
        realmIndex: player.realmIndex,
        age: player.age,
        spiritStones: player.spiritStones,
        speedMultiplier: player.speedMultiplier,
        speedExpireTime: player.speedExpireTime,
      }),
    })
    const data = await res.json()

    // 检查挂机收益
    try {
      const idleRes = await fetch(`${API_URL}/api/idle/status?uid=${player.uid}`)
      const idleData = await idleRes.json()
      if (idleData.isIdling && idleData.elapsedMinutes > 0) {
        const claimRes = await fetch(`${API_URL}/api/idle/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: player.uid }),
        })
        const claimData = await claimRes.json()
        if (claimData.success) {
          showOfflineReward.value = true
          offlineData.value = {
            offline: true,
            offlineMinutes: claimData.minutes,
            gain: claimData.gain,
            randomEvent: claimData.randomEvent,
            reincarnation: claimData.reincarnation,
            isIdle: true,
          }
          if (claimData.reincarnation) {
            player.realmIndex = 0
            player.exp = 0
            player.age = 16
          }
          return
        }
      }
    } catch {}

    // 显示离线挂机收益
    if (data.offline && data.offline.offline) {
      const o = data.offline
      showOfflineReward.value = true
      offlineData.value = o
      // 更新玩家本地数据
      if (o.reincarnation) {
        player.realmIndex = 0
        player.exp = 0
        player.age = 16
        player.speedMultiplier = o.newSpeedMultiplier || player.speedMultiplier + 0.1
        game.addLog(`🔄 寿元已尽，转世重修！加速 +0.1`, 'breakthrough')
      }
    }
  } catch (e) {}
}

function startTick() {
  tickTimer = setInterval(() => {
    if (game.cultivating && !player.isDead) {
      const result = player.cultivate()
      if (result?.type === 'event') game.addLog(result.text, 'success')

      player.tickSpeed()
      game.tickCount++

      if (game.tickCount % 60 === 0) {
        const ageResult = player.ageUp()
        if (ageResult.dead) {
          game.addLog('天劫降临！寿元已尽...', 'battle')
          game.postWorldEvent(player.uid, player.name, 'death', `💀 ${player.name} 寿元已尽，陨落于${player.realmName}...`)
          game.toggleCultivate()
          return
        }
        if (ageResult.warning) {
          game.addLog(`⚠️ 寿元将尽！剩余${ageResult.remaining}年`, 'battle')
        }
      }

      if (game.tickCount % 5 === 0 && achievementsRef.value) {
        const newAch = achievementsRef.value.checkAchievements()
        if (newAch) {
          game.addLog(`🎖️ 成就解锁！${newAch.icon} ${newAch.name}`, 'breakthrough')
        }
      }

      if (player.canBreakthrough && game.tickCount % 10 === 0) {
        game.addLog('修为已满，可尝试突破。', 'breakthrough')
        if (player.autoBreak && !player.isMaxRealm) {
          const r = player.breakthrough()
          if (r.success) {
            game.addLog(`✨ 自动突破！${r.realmName}`, 'breakthrough')
            game.triggerBreakthrough({ realmName: r.realmName, lifespanGain: r.lifespanGain })
            game.postWorldEvent(player.uid, player.name, 'breakthrough', `✨ ${player.name} 突破成功，踏入 ${r.realmName}！`, player.realmName)
          } else if (!r.needItem) {
            game.addLog(`突破失败，损失 ${r.lostExp} 修为`, 'battle')
          }
        }
      }
    }
  }, 1000)
}

onMounted(async () => {
  // 加载境界配置
  await loadRealms()

  // 注入任务更新函数
  game.setTaskUpdater(updateTaskProgress)

  try {
    const res = await fetch(`${API_URL}/game/config`)
    const cfg = await res.json()
    if (cfg.gameName) gameName.value = cfg.gameName
  } catch {}

  game.addLog('出生于凡人家庭，偶得残缺功法...', 'system')
  game.addLog('从此踏上修仙之路。', 'system')
  startTick()
  syncPlayer()
  pollWorldEvents()
  syncTimer = setInterval(syncPlayer, 60000)
  worldEventTimer = setInterval(pollWorldEvents, 5000)
})

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
  if (syncTimer) clearInterval(syncTimer)
  if (worldEventTimer) clearInterval(worldEventTimer)
})
</script>

<style scoped>
.app-container {
  padding: 12px;
  padding-bottom: 140px; /* 底部导航 + 日志空间 */
}

/* Tab 内容切换 */
.tab-content {
  min-height: 60vh;
}

/* 浮动日志 */
.floating-log {
  position: fixed;
  bottom: 56px;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, rgba(18,18,26,0.95), rgba(10,10,15,0.98));
  border-top: 1px solid var(--border);
  z-index: 60;
  transition: max-height 0.3s ease;
  max-height: 100px;
  overflow: hidden;
  backdrop-filter: blur(10px);
}
.floating-log.expanded {
  max-height: 50vh;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 14px;
  border-bottom: 1px solid rgba(42,42,58,0.3);
  cursor: pointer;
}
.log-header span:first-child {
  font-size: 12px;
  color: var(--gold);
  letter-spacing: 2px;
  font-family: 'ZCOOL XiaoWei', serif;
}
.log-toggle {
  font-size: 11px;
  color: var(--text-dim);
}

.log-body {
  padding: 4px 14px;
  max-height: calc(50vh - 40px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.log-body::-webkit-scrollbar { width: 3px; }
.log-body::-webkit-scrollbar-thumb { background: var(--border); }

.log-line {
  font-size: 12px;
  line-height: 1.6;
  padding: 1px 0;
  font-family: 'ZCOOL XiaoWei', serif;
  animation: logFade 0.3s ease;
}
@keyframes logFade {
  from { opacity: 0; transform: translateY(-4px); }
}
.log-time {
  color: var(--text-dim);
  font-size: 10px;
  margin-right: 6px;
}
.log-system { color: var(--gold); }
.log-battle { color: var(--danger); }
.log-success { color: var(--success); }
.log-info { color: var(--mp); }
.log-breakthrough { color: #e0a0ff; text-shadow: 0 0 6px rgba(224,160,255,0.3); }
.log-world { color: #ffd700; text-shadow: 0 0 4px rgba(255,215,0,0.3); }

/* 挂机收益弹窗 */
.offline-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  z-index: 200;
  display: flex;
  justify-content: center;
  align-items: center;
}
.offline-box {
  background: var(--panel);
  border: 1px solid var(--gold-dim);
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 320px;
  text-align: center;
}
.offline-title {
  font-size: 18px;
  color: var(--gold);
  letter-spacing: 4px;
  margin-bottom: 8px;
  font-family: 'ZCOOL XiaoWei', serif;
}
.offline-desc {
  font-size: 12px;
  color: var(--text-dim);
  margin-bottom: 16px;
}
.offline-rewards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.offline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(212,168,83,0.05);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text);
}
.offline-icon { font-size: 18px; }
.offline-reincarnation {
  background: rgba(224,64,64,0.1);
  border: 1px solid rgba(224,64,64,0.3);
}

/* 底部导航栏 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--panel);
  border-top: 1px solid var(--border);
  z-index: 100;
  padding: 6px 0;
  padding-bottom: max(6px, env(safe-area-inset-bottom));
}

.nav-item {
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
.nav-item.active {
  color: var(--gold);
}
.nav-icon {
  font-size: 18px;
}
.nav-label {
  font-size: 10px;
}

/* 桌面端优化 */
@media (min-width: 768px) {
  .floating-log {
    left: auto;
    right: 12px;
    bottom: 70px;
    width: 320px;
    border-radius: 6px;
    border: 1px solid var(--border);
    max-height: 80px;
  }
  .floating-log.expanded {
    max-height: 40vh;
  }
  .bottom-nav {
    max-width: 480px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 12px 12px 0 0;
    border: 1px solid var(--border);
    border-bottom: none;
  }
}
</style>
