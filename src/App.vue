<template>
  <div class="container">
    <!-- 标题 -->
    <div class="title">
      <h1>凡人修仙传</h1>
      <div class="sub">逆天改命 · 证道长生</div>
    </div>

    <!-- 公告 -->
    <Announcement />

    <!-- 角色信息 -->
    <PlayerInfo />

    <!-- 像素小人 -->
    <PixelCharacter />

    <!-- 操作 -->
    <ActionPanel />

    <!-- 修仙商店 -->
    <Shop />

    <!-- 加速商店 -->
    <SpeedShop />

    <!-- 背包 -->
    <ItemBag />

    <!-- 日志 -->
    <GameLog />

    <!-- 战斗面板 -->
    <BattlePanel />

    <!-- 突破动画 -->
    <BreakthroughOverlay />

    <!-- 排行榜 -->
    <Leaderboard />

    <!-- 用户档案 -->
    <UserProfile />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
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
import UserProfile from './components/UserProfile.vue'
import Announcement from './components/Announcement.vue'
import Shop from './components/Shop.vue'

const player = usePlayerStore()
const game = useGameStore()

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
        speedMultiplier: player.speedMultiplier,
        speedExpireTime: player.speedExpireTime,
      }),
    })
  } catch (e) {
    // 静默失败
  }
}

function startTick() {
  tickTimer = setInterval(() => {
    // 修炼
    if (game.cultivating && !player.isDead) {
      const result = player.cultivate()
      if (result?.type === 'event') {
        game.addLog(result.text, 'success')
      }

      // 加速倒计时
      player.tickSpeed()

      // 年龄
      game.tickCount++
      if (game.tickCount % 60 === 0) {
        const ageResult = player.ageUp()
        if (ageResult.dead) {
          game.addLog('天劫降临！你的寿元已尽...', 'battle')
          game.addLog('═══════════════════════', 'system')
          game.addLog('寿元已尽，修仙之路到此为止。', 'battle')
          game.addLog(`最终境界：${player.realmName}`, 'system')
          game.addLog(`享年：${player.age} 岁`, 'system')
          game.addLog('═══════════════════════', 'system')
          game.addLog('刷新页面重新开始。', 'info')
          game.toggleCultivate()
          return
        }
        if (ageResult.warning) {
          game.addLog(`⚠️ 寿元将尽！剩余${ageResult.remaining}年`, 'battle')
        }
      }

      // 修为满提示
      if (player.canBreakthrough && game.tickCount % 10 === 0) {
        game.addLog('修为已满！可以尝试突破境界了。', 'breakthrough')

        // 自动突破
        if (player.autoBreak && !player.isMaxRealm) {
          const result = player.breakthrough()
          if (result.success) {
            game.addLog(`✨ 自动突破成功！${result.realmName}`, 'breakthrough')
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
  game.addLog('你出生于一个凡人家庭，偶然间得到一本残缺的修仙功法...', 'system')
  game.addLog('从此踏上了漫漫修仙之路。', 'system')
  game.addLog('提示：点击"开始修炼"积累修为，修为满后点击"突破境界"。', 'info')
  startTick()

  // 每60秒同步一次玩家数据
  syncPlayer()
  syncTimer = setInterval(syncPlayer, 60000)
})

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
  if (syncTimer) clearInterval(syncTimer)
})
</script>
