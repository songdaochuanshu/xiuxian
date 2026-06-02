<template>
  <div class="panel">
    <div class="panel-header">
      <span>🗼 镇妖塔</span>
      <span class="layer-badge">第{{ layer }}层</span>
    </div>
    <div class="panel-body">
      <!-- 当前Boss -->
      <div class="boss-card">
        <div class="boss-name">{{ boss.name }}</div>
        <div class="boss-stats">
          <span>❤️ {{ formatNum(boss.hp) }}</span>
          <span>⚔️ {{ formatNum(boss.atk) }}</span>
          <span>🛡️ {{ formatNum(boss.def) }}</span>
        </div>
        <div v-if="boss.immuneControl" class="boss-tag">免疫控制</div>
        <div v-if="boss.reduceDodge > 0" class="boss-tag tag-danger">降闪避 {{ (boss.reduceDodge * 100).toFixed(0) }}%</div>
      </div>

      <!-- 战斗进度条 -->
      <div v-if="fighting" class="fight-bar">
        <div class="fight-progress">
          <div class="fight-fill" :style="{ width: fightPercent + '%' }"></div>
        </div>
        <div class="fight-text">造成伤害: {{ formatNum(damageDealt) }} / {{ formatNum(boss.hp) }}</div>
      </div>

      <!-- 操作按钮 -->
      <div class="abyss-actions">
        <button class="btn btn-full btn-fight" :disabled="fighting" @click="fightBoss">
          {{ fighting ? '战斗中...' : '⚔️ 挑战Boss' }}
        </button>
      </div>

      <!-- 每日低保 -->
      <div class="daily-section">
        <div class="daily-info">
          <span>🎁 每日低保</span>
          <span class="daily-amount">💎 {{ dailyReward }}灵石</span>
        </div>
        <button
          class="btn btn-sm"
          :class="{ 'btn-disabled': !canClaimDaily }"
          :disabled="!canClaimDaily"
          @click="claimDaily"
        >{{ canClaimDaily ? '领取' : '已领取' }}</button>
      </div>


    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player.ts'
import { useGameStore } from '../stores/game.ts'

const player = usePlayerStore()
const game = useGameStore()
const API_URL = import.meta.env.VITE_API_URL || 'https://xiuxian-api.你的子域名.workers.dev'

const layer = ref(1)
const maxLayer = ref(1)
const boss = ref({ name: '', hp: 0, atk: 0, def: 0, immuneControl: false, reduceDodge: 0 })
const dailyReward = ref(0)
const canClaimDaily = ref(false)
const fighting = ref(false)
const damageDealt = ref(0)
const fightPercent = ref(0)


function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n
}

async function loadAbyss() {
  try {
    const res = await fetch(`${API_URL}/api/abyss?uid=${player.uid}`)
    const data = await res.json()
    if (data.error) { game.addLog(data.error, 'battle'); return }
    layer.value = data.layer
    maxLayer.value = data.maxLayer
    boss.value = data.boss
    dailyReward.value = data.dailyReward
    canClaimDaily.value = data.canClaimDaily
  } catch {}
}



async function fightBoss() {
  if (fighting.value) return
  fighting.value = true
  damageDealt.value = 0
  fightPercent.value = 0

  // 模拟战斗过程
  const totalDmg = player.atk * 10 + Math.floor(Math.random() * player.atk * 5)
  const steps = 10
  const stepDmg = totalDmg / steps

  for (let i = 0; i < steps; i++) {
    await new Promise(r => setTimeout(r, 200))
    damageDealt.value = Math.floor(stepDmg * (i + 1))
    fightPercent.value = Math.min(100, (damageDealt.value / boss.value.hp) * 100)
  }

  try {
    const res = await fetch(`${API_URL}/api/abyss/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: player.uid, damage: totalDmg }),
    })
    const data = await res.json()

    if (data.win) {
      game.addLog(`🗼 击败第${layer.value}层Boss！进入第${data.newLayer}层！`, 'breakthrough')
      if (data.firstReward) {
        game.addLog(`🎁 首通奖励：${data.firstReward.stones}灵石`, 'success')
        for (const item of data.firstReward.items) {
          game.addLog(`📦 获得：${item.name} ×${item.amount}`, 'success')
        }
      }
      layer.value = data.newLayer
      boss.value = data.boss
      // 更新任务进度
      game.updateTasks([{ taskId: 'main_kill_10' }, { taskId: 'main_kill_100' }])
    } else {
      game.addLog(`💀 挑战失败！Boss剩余 ${formatNum(data.remaining)} 血量`, 'battle')
    }
  } catch {
    game.addLog('网络错误', 'battle')
  }

  fighting.value = false
}

async function claimDaily() {
  try {
    const res = await fetch(`${API_URL}/api/abyss/daily-reward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: player.uid }),
    })
    const data = await res.json()
    if (data.success) {
      player.spiritStones += data.reward
      game.addLog(`🎁 领取深渊低保：${data.reward}灵石`, 'success')
      canClaimDaily.value = false
    } else {
      game.addLog(data.error || '领取失败', 'battle')
    }
  } catch {
    game.addLog('网络错误', 'battle')
  }
}

onMounted(() => {
  loadAbyss()
})
</script>

<style scoped>
.layer-badge {
  font-size: 12px;
  color: var(--gold);
  background: rgba(212,168,83,0.15);
  padding: 2px 8px;
  border-radius: 10px;
}

.boss-card {
  background: rgba(224,64,64,0.05);
  border: 1px solid rgba(224,64,64,0.2);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  text-align: center;
}
.boss-name {
  font-size: 16px;
  color: var(--danger);
  font-family: 'ZCOOL XiaoWei', serif;
  margin-bottom: 6px;
}
.boss-stats {
  display: flex;
  justify-content: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-dim);
}
.boss-tag {
  display: inline-block;
  font-size: 10px;
  color: var(--mp);
  background: rgba(64,128,196,0.15);
  padding: 2px 8px;
  border-radius: 4px;
  margin-top: 6px;
}
.tag-danger {
  color: var(--danger);
  background: rgba(224,64,64,0.15);
}

.fight-bar { margin-bottom: 10px; }
.fight-progress {
  height: 8px;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  overflow: hidden;
}
.fight-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--danger), var(--gold));
  border-radius: 4px;
  transition: width 0.2s;
}
.fight-text {
  font-size: 11px;
  color: var(--text-dim);
  text-align: center;
  margin-top: 4px;
}

.btn-fight {
  background: linear-gradient(135deg, #c44040, #d4a853);
  color: #fff;
  font-size: 14px;
  padding: 10px;
  letter-spacing: 2px;
  border: none;
}

.daily-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(212,168,83,0.05);
  border: 1px solid rgba(212,168,83,0.2);
  border-radius: 6px;
  margin-top: 10px;
}
.daily-info { display: flex; flex-direction: column; gap: 2px; }
.daily-amount { font-size: 12px; color: var(--gold); }
.btn-disabled { opacity: 0.4; cursor: not-allowed; }

.abyss-rank { margin-top: 10px; }
.rank-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
  font-size: 13px;
  color: var(--gold);
}
.rank-toggle { font-size: 11px; color: var(--text-dim); }
.rank-list { max-height: 200px; overflow-y: auto; }
.rank-empty { text-align: center; color: var(--text-dim); font-size: 12px; padding: 10px; }
.rank-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  font-size: 12px;
  border-radius: 4px;
}
.rank-item.rank-self {
  background: rgba(212,168,83,0.1);
  border-left: 2px solid var(--gold);
}
.rank-pos { width: 24px; text-align: center; }
.rank-name { flex: 1; color: var(--text); }
.rank-layer { color: var(--gold); font-size: 11px; }
</style>
