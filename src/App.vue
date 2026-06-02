<template>
  <UserProfile />

  <div class="container">
    <!-- 标题 -->
    <div class="title">
      <h1>凡人修仙传</h1>
      <div class="sub">逆 天 改 命 · 证 道 长 生</div>
    </div>

    <!-- 公告 -->
    <Announcement />

    <!-- 角色信息 -->
    <PlayerInfo />

    <!-- 像素小人 -->
    <PixelCharacter />

    <!-- 操作按钮 -->
    <ActionPanel />

    <!-- 每日签到 -->
    <DailyCheckIn />

    <!-- 坊市 -->
    <Shop />

    <!-- 加速商店 -->
    <SpeedShop />

    <!-- 成就 -->
    <Achievements ref="achievementsRef" />

    <!-- 背包 -->
    <ItemBag />

    <!-- 设置 -->
    <Settings />
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

  <!-- 战斗面板 -->
  <BattlePanel />

  <!-- 突破动画 -->
  <BreakthroughOverlay />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { usePlayerStore } from './stores/player.ts'
import { useGameStore } from './stores/game.ts'
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

const player = usePlayerStore()
const game = useGameStore()

const logExpanded = ref(false)
const logBody = ref(null)
const achievementsRef = ref(null)

// 只显示最近的日志
const recentLogs = computed(() => {
  return logExpanded.value ? game.logs.slice(0, 50) : game.logs.slice(0, 5)
})

// 新日志自动滚动
watch(() => game.logs.length, () => {
  nextTick(() => {
    if (logBody.value && logExpanded.value) {
      logBody.value.scrollTop = 0
    }
  })
})

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
      if (result?.type === 'event') game.addLog(result.text, 'success')

      player.tickSpeed()
      game.tickCount++

      if (game.tickCount % 60 === 0) {
        const ageResult = player.ageUp()
        if (ageResult.dead) {
          game.addLog('天劫降临！寿元已尽...', 'battle')
          game.toggleCultivate()
          return
        }
        if (ageResult.warning) {
          game.addLog(`⚠️ 寿元将尽！剩余${ageResult.remaining}年`, 'battle')
        }
      }

      // 检查成就
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
          } else if (!r.needItem) {
            game.addLog(`突破失败，损失 ${r.lostExp} 修为`, 'battle')
          }
        }
      }
    }
  }, 1000)
}

onMounted(() => {
  game.addLog('出生于凡人家庭，偶得残缺功法...', 'system')
  game.addLog('从此踏上修仙之路。', 'system')
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
/* 浮动日志 */
.floating-log {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, rgba(18,18,26,0.95), rgba(10,10,15,0.98));
  border-top: 1px solid var(--border);
  z-index: 60;
  transition: max-height 0.3s ease;
  max-height: 120px;
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
  padding: 8px 14px;
  border-bottom: 1px solid rgba(42,42,58,0.3);
  cursor: pointer;
}
.log-header span:first-child {
  font-size: 13px;
  color: var(--gold);
  letter-spacing: 2px;
  font-family: 'ZCOOL XiaoWei', serif;
}
.log-toggle {
  font-size: 11px;
  color: var(--text-dim);
}

.log-body {
  padding: 6px 14px;
  max-height: calc(50vh - 40px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.log-body::-webkit-scrollbar { width: 3px; }
.log-body::-webkit-scrollbar-thumb { background: var(--border); }

.log-line {
  font-size: 12px;
  line-height: 1.8;
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

/* 为底部日志留空间 */
.container {
  padding-bottom: 90px;
}

@media (min-width: 768px) {
  .floating-log {
    left: auto;
    right: 12px;
    bottom: 12px;
    width: 320px;
    border-radius: 6px;
    border: 1px solid var(--border);
    max-height: 100px;
  }
  .floating-log.expanded {
    max-height: 40vh;
  }
}
</style>
