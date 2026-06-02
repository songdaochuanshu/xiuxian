<template>
  <div class="panel">
    <div class="panel-header">
      <span>🗼 镇妖塔</span>
      <span class="layer-badge">第{{ layer }}层</span>
    </div>
    <div class="panel-body">
      <!-- Boss区域：双血条 + Boss立绘 -->
      <div class="boss-arena" :class="{ 'boss-hit': bossHit, 'boss-dead': bossDead }">
        <!-- Boss立绘 -->
        <div class="boss-avatar" :class="'boss-tier-' + bossTier">
          <div class="boss-sprite">
            <div class="boss-eye left" :class="{ 'eye-glow': bossTier >= 2 }"></div>
            <div class="boss-eye right" :class="{ 'eye-glow': bossTier >= 2 }"></div>
            <div class="boss-mouth" :class="'mouth-' + bossMouthType"></div>
          </div>
          <!-- 层主特效 -->
          <div v-if="bossTier >= 1" class="boss-aura" :class="'aura-' + bossElement"></div>
          <div v-if="bossTier >= 2" class="boss-particles">
            <span v-for="i in 6" :key="i" class="particle" :class="'p-' + bossElement"
              :style="{ '--i': i, animationDelay: (i * 0.3) + 's' }"></span>
          </div>
        </div>

        <!-- 飘字伤害 -->
        <transition-group name="float-dmg" tag="div" class="float-damage-area">
          <div v-for="fd in floatingDamages" :key="fd.id" class="float-damage"
            :class="{ 'dmg-crit': fd.crit, 'dmg-heal': fd.heal, 'dmg-skill': fd.skill }"
            :style="{ left: fd.x + '%', '--float-y': fd.y + 'px' }">
            {{ fd.text }}
          </div>
        </transition-group>

        <!-- Boss信息 -->
        <div class="boss-name" :class="'name-' + bossElement">{{ boss.name }}</div>
        <div class="boss-tags">
          <span v-if="boss.immuneControl" class="boss-tag">免疫控制</span>
          <span v-if="boss.reduceDodge > 0" class="boss-tag tag-danger">
            降闪避 {{ (boss.reduceDodge * 100).toFixed(0) }}%
          </span>
        </div>

        <!-- Boss血条 -->
        <div class="hp-bar boss-hp-bar">
          <div class="hp-bar-inner">
            <div class="hp-fill boss-hp-fill" :class="'fill-' + bossElement"
              :style="{ width: bossHpPercent + '%' }">
              <div class="hp-shine"></div>
            </div>
          </div>
          <div class="hp-text">{{ formatNum(bossCurrentHp) }} / {{ formatNum(boss.hp) }}</div>
        </div>
      </div>

      <!-- 战斗中：玩家血条 + 战斗日志 -->
      <div v-if="fighting" class="battle-section">
        <!-- 玩家血条 -->
        <div class="player-battle-info">
          <div class="player-name-bar">
            <span class="player-battle-name">{{ player.name || '无名散修' }}</span>
            <span class="player-hp-num">HP {{ formatNum(player.hp) }} / {{ formatNum(player.maxHp) }}</span>
          </div>
          <div class="hp-bar player-hp-bar">
            <div class="hp-bar-inner">
              <div class="hp-fill player-hp-fill" :style="{ width: playerHpPercent + '%' }"></div>
            </div>
          </div>
          <div class="player-mp-bar">
            <div class="mp-bar-inner">
              <div class="mp-fill" :style="{ width: playerMpPercent + '%' }"></div>
            </div>
            <span class="mp-text">灵力 {{ player.mp }}/{{ player.maxMp }}</span>
          </div>
        </div>

        <!-- 回合数 -->
        <div class="turn-badge">第 {{ turn }} 回合</div>

        <!-- 战斗日志 -->
        <div class="battle-log" ref="battleLogEl">
          <div v-for="(log, i) in battleLog" :key="i" class="log-entry" :class="'log-' + log.type">
            <span class="log-icon">{{ log.icon }}</span>
            <span class="log-text">{{ log.text }}</span>
          </div>
        </div>

        <!-- 技能按钮 -->
        <div class="skill-bar">
          <button class="skill-btn skill-normal" :disabled="animating" @click="doAttack('normal')">
            <span class="skill-icon">⚔️</span>
            <span class="skill-name">普攻</span>
          </button>
          <button class="skill-btn skill-crit" :disabled="animating" @click="doAttack('crit')">
            <span class="skill-icon">💥</span>
            <span class="skill-name">暴击</span>
            <span class="skill-cost">10灵力</span>
          </button>
          <button class="skill-btn skill-spirit" :disabled="animating" @click="doAttack('spirit')">
            <span class="skill-icon">✨</span>
            <span class="skill-name">灵技</span>
            <span class="skill-cost">25灵力</span>
          </button>
          <button class="skill-btn skill-slash" :disabled="animating" @click="doAttack('slash')">
            <span class="skill-icon">🌀</span>
            <span class="skill-name">剑气斩</span>
            <span class="skill-cost">40灵力</span>
          </button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="!fighting" class="abyss-actions">
        <button class="btn btn-full btn-fight" @click="fightBoss">
          ⚔️ 挑战Boss
        </button>
      </div>

      <!-- 战斗结算 -->
      <transition name="settle-pop">
        <div v-if="showSettlement" class="settlement" :class="{ 'settle-win': settleResult === 'win', 'settle-lose': settleResult === 'lose' }">
          <div class="settle-icon">{{ settleResult === 'win' ? '🎉' : '💀' }}</div>
          <div class="settle-title">{{ settleResult === 'win' ? 'Boss已被击败！' : '挑战失败...' }}</div>
          <div class="settle-detail">{{ settleDetail }}</div>
          <div v-if="settleRewards.length" class="settle-rewards">
            <div v-for="(r, i) in settleRewards" :key="i" class="reward-item">{{ r }}</div>
          </div>
        </div>
      </transition>

      <!-- 每日低保 -->
      <div class="daily-section">
        <div class="daily-info">
          <span>🎁 每日低保</span>
          <span class="daily-amount">💎 {{ dailyReward }}灵石</span>
        </div>
        <button class="btn btn-sm" :class="{ 'btn-disabled': !canClaimDaily }" :disabled="!canClaimDaily"
          @click="claimDaily">{{ canClaimDaily ? '领取' : '已领取' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { usePlayerStore } from '../stores/player.ts'
import { useGameStore } from '../stores/game.ts'

const player = usePlayerStore()
const game = useGameStore()
const API_URL = import.meta.env.VITE_API_URL || 'https://api.xiuxian.website'

// === 基础状态 ===
const layer = ref(1)
const maxLayer = ref(1)
const boss = ref({ name: '', hp: 0, atk: 0, def: 0, immuneControl: false, reduceDodge: 0 })
const dailyReward = ref(0)
const canClaimDaily = ref(false)

// === 战斗状态 ===
const fighting = ref(false)
const animating = ref(false)
const turn = ref(0)
const bossCurrentHp = ref(0)
const bossHit = ref(false)
const bossDead = ref(false)
const battleLog = ref([])
const battleLogEl = ref(null)
const floatingDamages = ref([])
let floatId = 0

// === 结算状态 ===
const showSettlement = ref(false)
const settleResult = ref('')
const settleDetail = ref('')
const settleRewards = ref([])

// === 计算属性 ===
const bossHpPercent = computed(() => boss.value.hp > 0 ? (bossCurrentHp.value / boss.value.hp) * 100 : 0)
const playerHpPercent = computed(() => (player.hp / player.maxHp) * 100)
const playerMpPercent = computed(() => (player.mp / player.maxMp) * 100)

const bossTier = computed(() => {
  if (layer.value >= 50) return 3
  if (layer.value >= 20) return 2
  if (layer.value >= 5) return 1
  return 0
})

const bossElement = computed(() => {
  const l = layer.value
  if (l >= 80) return 'dark'
  if (l >= 60) return 'thunder'
  if (l >= 40) return 'ice'
  if (l >= 20) return 'fire'
  if (l >= 10) return 'poison'
  return 'normal'
})

const bossMouthType = computed(() => {
  if (bossDead.value) return 'dead'
  if (bossHit.value) return 'hurt'
  if (bossTier.value >= 2) return 'angry'
  return 'normal'
})

// === 工具函数 ===
function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function addLog(text, type = 'info', icon = '') {
  battleLog.value.push({ text, type, icon })
  nextTick(() => {
    if (battleLogEl.value) {
      battleLogEl.value.scrollTop = battleLogEl.value.scrollHeight
    }
  })
}

function addFloatingDamage(text, crit = false, heal = false, skill = false) {
  const id = ++floatId
  const x = 30 + Math.random() * 40
  const y = -20 - Math.random() * 30
  floatingDamages.value.push({ id, text, crit, heal, skill, x, y })
  setTimeout(() => {
    floatingDamages.value = floatingDamages.value.filter(f => f.id !== id)
  }, 1200)
}

function triggerBossHit() {
  bossHit.value = true
  setTimeout(() => { bossHit.value = false }, 400)
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// === 加载 ===
async function loadAbyss() {
  try {
    const res = await fetch(`${API_URL}/api/abyss?uid=${player.uid}`)
    const data = await res.json()
    if (data.error) { game.addLog(data.error, 'battle'); return }
    layer.value = data.layer
    maxLayer.value = data.maxLayer
    boss.value = data.boss
    bossCurrentHp.value = data.boss.hp
    dailyReward.value = data.dailyReward
    canClaimDaily.value = data.canClaimDaily
  } catch {}
}

// === 战斗开始 ===
async function fightBoss() {
  fighting.value = true
  turn.value = 0
  bossCurrentHp.value = boss.value.hp
  bossDead.value = false
  showSettlement.value = false
  settleRewards.value = []
  battleLog.value = []

  addLog(`遭遇第${layer.value}层Boss「${boss.value.name}」！`, 'system', '🗼')
  addLog(`Boss属性：❤️${formatNum(boss.value.hp)} ⚔️${formatNum(boss.value.atk)} 🛡️${formatNum(boss.value.def)}`, 'info', '📊')
  if (boss.value.immuneControl) addLog('⚠️ 此Boss免疫控制技能！', 'warning', '⚠️')
}

// === 技能系统 ===
const SKILLS = {
  normal: { name: '普攻', icon: '⚔️', mpCost: 0, dmgMult: 1, critChance: 0.1, desc: '基础攻击' },
  crit: { name: '暴击', icon: '💥', mpCost: 10, dmgMult: 1.8, critChance: 0.35, desc: '高暴击率攻击' },
  spirit: { name: '灵技', icon: '✨', mpCost: 25, dmgMult: 2.5, critChance: 0.15, desc: '灵力凝聚一击' },
  slash: { name: '剑气斩', icon: '🌀', mpCost: 40, dmgMult: 4.0, critChance: 0.2, desc: '释放剑气，造成巨额伤害' },
}

async function doAttack(skillKey) {
  if (animating.value || bossCurrentHp.value <= 0) return
  const skill = SKILLS[skillKey]

  // 检查灵力
  if (skill.mpCost > 0 && player.mp < skill.mpCost) {
    addLog(`灵力不足！需要${skill.mpCost}灵力`, 'warning', '❌')
    return
  }

  animating.value = true
  turn.value++

  // 消耗灵力
  if (skill.mpCost > 0) {
    player.useMp(skill.mpCost)
  }

  // === 玩家回合 ===
  const isCrit = Math.random() < skill.critChance
  let baseDmg = Math.max(1, player.atk - boss.value.def + Math.floor(Math.random() * player.atk * 0.3))
  let dmg = Math.floor(baseDmg * skill.dmgMult)
  if (isCrit) dmg = Math.floor(dmg * 2)

  // Boss受击
  bossCurrentHp.value = Math.max(0, bossCurrentHp.value - dmg)
  triggerBossHit()

  // 飘字
  if (isCrit) {
    addFloatingDamage(`暴击！-${formatNum(dmg)}`, true, false, skillKey !== 'normal')
  } else {
    addFloatingDamage(`-${formatNum(dmg)}`, false, false, skillKey !== 'normal')
  }

  // 战斗日志
  if (skillKey === 'normal') {
    addLog(`第${turn.value}回合：你挥剑攻击，${isCrit ? '💥暴击！' : ''}造成 ${formatNum(dmg)} 伤害`, isCrit ? 'crit' : 'attack', skill.icon)
  } else {
    addLog(`第${turn.value}回合：你释放【${skill.name}】${isCrit ? '💥暴击！' : ''}造成 ${formatNum(dmg)} 伤害`, isCrit ? 'crit' : 'skill', skill.icon)
  }

  await sleep(600)

  // 检查Boss死亡
  if (bossCurrentHp.value <= 0) {
    await handleBossDeath()
    animating.value = false
    return
  }

  // === Boss回合 ===
  const bossDmg = Math.max(1, boss.value.atk - player.def + Math.floor(Math.random() * boss.value.atk * 0.2))
  player.takeDamage(bossDmg)
  addFloatingDamage(`-${formatNum(bossDmg)}`, false, false, false)
  addLog(`${boss.value.name} 反击！造成 ${formatNum(bossDmg)} 伤害`, 'boss-attack', '🔥')

  await sleep(400)

  // 检查玩家死亡
  if (player.isDead) {
    addLog('你被击败了...重伤昏迷', 'defeat', '💀')
    await sleep(1000)
    player.revive()
    game.addLog('你重伤昏迷，被路人救起，损失一成修为。', 'battle')
    settleResult.value = 'lose'
    settleDetail.value = `第${turn.value}回合惜败，Boss剩余 ${formatNum(bossCurrentHp.value)} 血量`
    showSettlement.value = true
    fighting.value = false
    bossCurrentHp.value = boss.value.hp
  }

  animating.value = false
}

async function handleBossDeath() {
  bossDead.value = true
  addLog(`🎉 击败「${boss.value.name}」！`, 'victory', '🏆')

  // 请求服务器结算
  try {
    const res = await fetch(`${API_URL}/api/abyss/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: player.uid, damage: player.atk * 10 }),
    })
    const data = await res.json()

    if (data.win) {
      const rewards = []
      if (data.firstReward) {
        rewards.push(`💎 ${data.firstReward.stones}灵石`)
        for (const item of data.firstReward.items) {
          rewards.push(`📦 ${item.name} ×${item.amount}`)
        }
      }
      rewards.push(`🗼 进入第${data.newLayer}层`)

      layer.value = data.newLayer
      boss.value = data.boss
      bossCurrentHp.value = data.boss.hp

      settleResult.value = 'win'
      settleDetail.value = `用了${turn.value}回合击败Boss！`
      settleRewards.value = rewards
      showSettlement.value = true

      game.addLog(`🗼 击败第${layer.value - 1}层Boss！进入第${data.newLayer}层！`, 'breakthrough')
      game.updateTasks([{ taskId: 'main_kill_10' }, { taskId: 'main_kill_100' }])
    }
  } catch {
    addLog('网络错误，结算失败', 'warning', '❌')
  }

  await sleep(2000)
  fighting.value = false
  bossDead.value = false
}

// === 每日低保 ===
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

// 自动滚动日志
watch(() => battleLog.value.length, () => {
  nextTick(() => {
    if (battleLogEl.value) battleLogEl.value.scrollTop = battleLogEl.value.scrollHeight
  })
})

onMounted(() => { loadAbyss() })
</script>

<style scoped>
/* ============ 基础变量 ============ */
:root {
  --danger: #e04040;
  --gold: #d4a853;
  --mp: #4080c0;
  --success: #40c060;
}

/* ============ Boss战场 ============ */
.boss-arena {
  position: relative;
  text-align: center;
  padding: 16px 12px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: all 0.3s;
}
.boss-arena.boss-hit {
  animation: arena-shake 0.4s ease;
}
.boss-arena.boss-dead {
  filter: grayscale(0.6) brightness(0.6);
}
@keyframes arena-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

/* ============ Boss立绘 ============ */
.boss-avatar {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 10px;
}
.boss-sprite {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: linear-gradient(135deg, #2a1a1a, #1a0a0a);
  border: 2px solid rgba(224, 64, 64, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.3s;
}
.boss-tier-1 .boss-sprite {
  background: linear-gradient(135deg, #2a1520, #1a0810);
  border-color: rgba(224, 64, 128, 0.5);
  box-shadow: 0 0 12px rgba(224, 64, 128, 0.2);
}
.boss-tier-2 .boss-sprite {
  background: linear-gradient(135deg, #2a1a0a, #1a0a00);
  border-color: rgba(255, 180, 0, 0.5);
  box-shadow: 0 0 20px rgba(255, 180, 0, 0.3);
}
.boss-tier-3 .boss-sprite {
  background: linear-gradient(135deg, #1a0a2a, #0a0018);
  border-color: rgba(180, 80, 255, 0.6);
  box-shadow: 0 0 25px rgba(180, 80, 255, 0.4);
  animation: boss-pulse 2s infinite;
}
@keyframes boss-pulse {
  0%, 100% { box-shadow: 0 0 25px rgba(180, 80, 255, 0.4); }
  50% { box-shadow: 0 0 40px rgba(180, 80, 255, 0.7); }
}

.boss-eye {
  width: 10px;
  height: 10px;
  background: #e04040;
  border-radius: 50%;
  display: inline-block;
  transition: all 0.3s;
}
.boss-eye.eye-glow {
  box-shadow: 0 0 8px #e04040;
  animation: eye-blink 3s infinite;
}
@keyframes eye-blink {
  0%, 45%, 55%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.1); }
}
.boss-eye.left { margin-right: 12px; }
.boss-eye.right { margin-left: 12px; }

.boss-mouth {
  width: 16px;
  height: 6px;
  border-radius: 0 0 8px 8px;
  margin-top: 2px;
  transition: all 0.3s;
}
.mouth-normal { background: #c03030; }
.mouth-angry { background: #ff4040; height: 8px; border-radius: 4px; }
.mouth-hurt { background: #a02020; transform: scaleY(0.5); }
.mouth-dead { background: #602020; transform: scaleY(0.3); }

/* Boss光环 */
.boss-aura {
  position: absolute;
  inset: -10px;
  border-radius: 18px;
  opacity: 0.3;
  animation: aura-rotate 4s linear infinite;
}
.aura-fire { background: conic-gradient(transparent, #ff4400, transparent, #ff8800, transparent); }
.aura-ice { background: conic-gradient(transparent, #44aaff, transparent, #88ddff, transparent); }
.aura-thunder { background: conic-gradient(transparent, #ffcc00, transparent, #ffff44, transparent); }
.aura-poison { background: conic-gradient(transparent, #44cc00, transparent, #88ff44, transparent); }
.aura-dark { background: conic-gradient(transparent, #8800ff, transparent, #cc44ff, transparent); }
@keyframes aura-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Boss粒子 */
.boss-particles {
  position: absolute;
  inset: -15px;
  pointer-events: none;
}
.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  animation: particle-float 3s infinite ease-in-out;
}
.p-fire { background: #ff6600; box-shadow: 0 0 6px #ff4400; }
.p-ice { background: #66ccff; box-shadow: 0 0 6px #44aaff; }
.p-thunder { background: #ffee44; box-shadow: 0 0 6px #ffcc00; }
.p-poison { background: #66ff44; box-shadow: 0 0 6px #44cc00; }
.p-dark { background: #cc66ff; box-shadow: 0 0 6px #8800ff; }
@keyframes particle-float {
  0% { transform: translate(0, 0) scale(0); opacity: 0; }
  20% { opacity: 1; transform: translate(calc(cos(var(--i) * 60deg) * 35px), calc(sin(var(--i) * 60deg) * 35px)) scale(1); }
  80% { opacity: 0.5; }
  100% { transform: translate(calc(cos(var(--i) * 60deg) * 50px), calc(sin(var(--i) * 60deg) * 50px - 20px)) scale(0); opacity: 0; }
}

.boss-name {
  font-size: 16px;
  font-family: 'ZCOOL XiaoWei', serif;
  margin: 6px 0 4px;
  transition: color 0.3s;
}
.name-normal { color: var(--danger); }
.name-fire { color: #ff6622; text-shadow: 0 0 8px rgba(255, 100, 0, 0.4); }
.name-ice { color: #44bbff; text-shadow: 0 0 8px rgba(68, 187, 255, 0.4); }
.name-thunder { color: #ffdd22; text-shadow: 0 0 8px rgba(255, 221, 34, 0.4); }
.name-poison { color: #66dd22; text-shadow: 0 0 8px rgba(102, 221, 34, 0.4); }
.name-dark { color: #bb66ff; text-shadow: 0 0 8px rgba(187, 102, 255, 0.4); }

.boss-tags {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;
}
.boss-tag {
  display: inline-block;
  font-size: 10px;
  color: var(--mp);
  background: rgba(64, 128, 196, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
}
.tag-danger {
  color: var(--danger);
  background: rgba(224, 64, 64, 0.15);
}

/* ============ 飘字伤害 ============ */
.float-damage-area {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.float-damage {
  position: absolute;
  font-size: 16px;
  font-weight: bold;
  color: #ff4444;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  animation: float-up 1.2s ease-out forwards;
  pointer-events: none;
  white-space: nowrap;
}
.dmg-crit {
  font-size: 22px;
  color: #ffcc00;
  text-shadow: 0 0 8px rgba(255,200,0,0.6), 2px 2px 4px rgba(0,0,0,0.8);
}
.dmg-skill {
  font-size: 18px;
  color: #88ccff;
  text-shadow: 0 0 6px rgba(100,180,255,0.5);
}
.dmg-heal {
  color: #44ff66;
}
@keyframes float-up {
  0% { transform: translateY(0) scale(0.5); opacity: 0; }
  15% { transform: translateY(calc(var(--float-y) * 0.3)) scale(1.2); opacity: 1; }
  100% { transform: translateY(calc(var(--float-y) * 1.5)) scale(0.8); opacity: 0; }
}
.float-dmg-enter-active { transition: all 0.3s; }
.float-dmg-leave-active { transition: all 0.5s; }
.float-dmg-enter-from { opacity: 0; transform: translateY(20px) scale(0.5); }
.float-dmg-leave-to { opacity: 0; }

/* ============ 血条 ============ */
.hp-bar { margin: 6px 0; }
.hp-bar-inner {
  height: 10px;
  background: rgba(255,255,255,0.06);
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
}
.hp-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
  position: relative;
}
.boss-hp-fill {
  background: linear-gradient(90deg, #c03030, #e04040);
}
.fill-fire { background: linear-gradient(90deg, #cc3300, #ff6622) !important; }
.fill-ice { background: linear-gradient(90deg, #2266cc, #44bbff) !important; }
.fill-thunder { background: linear-gradient(90deg, #cc9900, #ffdd22) !important; }
.fill-poison { background: linear-gradient(90deg, #338800, #66dd22) !important; }
.fill-dark { background: linear-gradient(90deg, #6600aa, #bb66ff) !important; }
.fill-normal { background: linear-gradient(90deg, #c03030, #e04040) !important; }

.player-hp-fill {
  background: linear-gradient(90deg, #30a030, #44cc44);
}

.hp-shine {
  position: absolute;
  top: 0;
  left: -50%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: hp-shine-anim 2s infinite;
}
@keyframes hp-shine-anim {
  from { left: -50%; }
  to { left: 150%; }
}

.hp-text {
  font-size: 11px;
  color: var(--text-dim, #aaa);
  text-align: center;
  margin-top: 2px;
}

/* 灵力条 */
.mp-bar-inner {
  height: 6px;
  background: rgba(255,255,255,0.04);
  border-radius: 3px;
  overflow: hidden;
}
.mp-fill {
  height: 100%;
  background: linear-gradient(90deg, #3060a0, #4488cc);
  border-radius: 3px;
  transition: width 0.4s ease;
}
.mp-text {
  font-size: 10px;
  color: var(--mp, #4080c0);
  text-align: right;
  display: block;
  margin-top: 2px;
}

/* ============ 战斗区域 ============ */
.battle-section {
  margin-top: 10px;
}

.player-battle-info {
  background: rgba(0, 128, 0, 0.05);
  border: 1px solid rgba(0, 128, 0, 0.15);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.player-name-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.player-battle-name {
  font-size: 13px;
  color: var(--gold, #d4a853);
  font-weight: bold;
}
.player-hp-num {
  font-size: 11px;
  color: var(--success, #40c060);
}

.turn-badge {
  text-align: center;
  font-size: 11px;
  color: var(--text-dim, #888);
  margin-bottom: 6px;
  letter-spacing: 1px;
}

/* ============ 战斗日志 ============ */
.battle-log {
  max-height: 150px;
  overflow-y: auto;
  background: rgba(0,0,0,0.2);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 10px;
  scroll-behavior: smooth;
}
.log-entry {
  font-size: 12px;
  padding: 3px 6px;
  border-radius: 3px;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
  animation: log-slide-in 0.3s ease;
}
@keyframes log-slide-in {
  from { transform: translateX(-10px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.log-icon { font-size: 14px; flex-shrink: 0; }
.log-info { color: #aaa; }
.log-attack { color: #ddd; }
.log-skill { color: #88ccff; }
.log-crit { color: #ffcc00; font-weight: bold; }
.log-boss-attack { color: #ff8866; }
.log-system { color: var(--gold, #d4a853); font-weight: bold; }
.log-warning { color: #ffaa44; }
.log-victory { color: #ffcc00; font-weight: bold; font-size: 13px; }
.log-defeat { color: #ff4444; font-weight: bold; }

/* ============ 技能栏 ============ */
.skill-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.skill-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}
.skill-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.2);
}
.skill-btn:active:not(:disabled) {
  transform: scale(0.95);
}
.skill-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.skill-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255,255,255,0.1), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}
.skill-btn:hover:not(:disabled)::after {
  opacity: 1;
}
.skill-icon { font-size: 20px; }
.skill-name { font-size: 11px; color: #ddd; margin-top: 2px; }
.skill-cost { font-size: 9px; color: var(--mp, #4080c0); }

.skill-normal { border-color: rgba(200,200,200,0.2); }
.skill-crit { border-color: rgba(255,100,0,0.3); }
.skill-crit:hover:not(:disabled) { border-color: rgba(255,100,0,0.6); box-shadow: 0 0 10px rgba(255,100,0,0.2); }
.skill-spirit { border-color: rgba(100,180,255,0.3); }
.skill-spirit:hover:not(:disabled) { border-color: rgba(100,180,255,0.6); box-shadow: 0 0 10px rgba(100,180,255,0.2); }
.skill-slash { border-color: rgba(180,80,255,0.3); }
.skill-slash:hover:not(:disabled) { border-color: rgba(180,80,255,0.6); box-shadow: 0 0 10px rgba(180,80,255,0.2); }

/* ============ 战斗按钮 ============ */
.abyss-actions { margin-top: 10px; }
.btn-fight {
  background: linear-gradient(135deg, #c44040, #d4a853);
  color: #fff;
  font-size: 14px;
  padding: 12px;
  letter-spacing: 2px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}
.btn-fight:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(196, 64, 64, 0.4);
}

/* ============ 结算面板 ============ */
.settlement {
  text-align: center;
  padding: 16px;
  border-radius: 10px;
  margin-top: 12px;
  animation: settle-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.settle-win {
  background: linear-gradient(135deg, rgba(212,168,83,0.15), rgba(64,192,96,0.1));
  border: 1px solid rgba(212,168,83,0.3);
}
.settle-lose {
  background: linear-gradient(135deg, rgba(224,64,64,0.1), rgba(100,100,100,0.1));
  border: 1px solid rgba(224,64,64,0.2);
}
.settle-icon { font-size: 36px; margin-bottom: 6px; }
.settle-title { font-size: 16px; color: var(--gold, #d4a853); font-weight: bold; }
.settle-detail { font-size: 12px; color: #aaa; margin-top: 4px; }
.settle-rewards {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}
.reward-item {
  font-size: 12px;
  color: var(--gold, #d4a853);
  background: rgba(212,168,83,0.1);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(212,168,83,0.2);
}
@keyframes settle-pop {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.settle-pop-enter-active { transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
.settle-pop-leave-active { transition: all 0.3s ease; }
.settle-pop-enter-from { transform: scale(0.5); opacity: 0; }
.settle-pop-leave-to { transform: scale(0.8); opacity: 0; }

/* ============ 每日低保 ============ */
.daily-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(212,168,83,0.05);
  border: 1px solid rgba(212,168,83,0.2);
  border-radius: 6px;
  margin-top: 12px;
}
.daily-info { display: flex; flex-direction: column; gap: 2px; }
.daily-amount { font-size: 12px; color: var(--gold, #d4a853); }
.btn-disabled { opacity: 0.4; cursor: not-allowed; }
</style>
