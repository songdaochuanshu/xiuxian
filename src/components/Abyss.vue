<template>
  <div class="panel">
    <div class="panel-header">
      <span>镇妖塔</span>
      <span class="layer-badge">第{{ layer }}层</span>
    </div>
    <div class="panel-body">
      <!-- Boss战场 -->
      <div class="boss-arena" :class="{ 'boss-hit': bossHit, 'boss-dead': bossDead }">
        <!-- Canvas Boss -->
        <canvas ref="bossCanvas" class="boss-canvas" width="200" height="200"></canvas>

        <!-- 飘字伤害 -->
        <transition-group name="float-dmg" tag="div" class="float-damage-area">
          <div v-for="fd in floatingDamages" :key="fd.id" class="float-damage"
            :class="{ 'dmg-crit': fd.crit, 'dmg-skill': fd.skill }"
            :style="{ left: fd.x + '%', '--float-y': fd.y + 'px' }">
            {{ fd.text }}
          </div>
        </transition-group>

        <!-- Boss名字 + 标签 -->
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

      <!-- 战斗中 -->
      <div v-if="fighting" class="battle-section">
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

        <div class="turn-badge">第 {{ turn }} 回合</div>

        <div class="battle-log" ref="battleLogEl">
          <div v-for="(log, i) in battleLog" :key="i" class="log-entry" :class="'log-' + log.type">
            <span class="log-icon">{{ log.icon }}</span>
            <span class="log-text">{{ log.text }}</span>
          </div>
        </div>

        <div class="skill-bar">
          <button class="skill-btn skill-normal" :disabled="animating" @click="doAttack('normal')">
            <span class="skill-icon">斩</span>
            <span class="skill-name">普攻</span>
          </button>
          <button class="skill-btn skill-crit" :disabled="animating" @click="doAttack('crit')">
            <span class="skill-icon">暴</span>
            <span class="skill-name">暴击</span>
            <span class="skill-cost">10灵力</span>
          </button>
          <button class="skill-btn skill-spirit" :disabled="animating" @click="doAttack('spirit')">
            <span class="skill-icon">灵</span>
            <span class="skill-name">灵技</span>
            <span class="skill-cost">25灵力</span>
          </button>
          <button class="skill-btn skill-slash" :disabled="animating" @click="doAttack('slash')">
            <span class="skill-icon">剑</span>
            <span class="skill-name">剑气斩</span>
            <span class="skill-cost">40灵力</span>
          </button>
        </div>
      </div>

      <!-- 非战斗状态：挑战按钮 -->
      <div v-if="!fighting" class="abyss-actions">
        <button class="btn btn-full btn-fight" @click="fightBoss">
          挑战Boss
        </button>
      </div>

      <!-- 结算面板 -->
      <transition name="settle-pop">
        <div v-if="showSettlement" class="settlement" :class="{ 'settle-win': settleResult === 'win', 'settle-lose': settleResult === 'lose' }">
          <div class="settle-icon">{{ settleResult === 'win' ? '胜' : '败' }}</div>
          <div class="settle-title">{{ settleResult === 'win' ? 'Boss已被击败！' : '挑战失败...' }}</div>
          <div class="settle-detail">{{ settleDetail }}</div>
          <div v-if="settleRewards.length" class="settle-rewards">
            <div v-for="(r, i) in settleRewards" :key="i" class="reward-item">{{ r }}</div>
          </div>
          <button v-if="settleResult === 'win'" class="btn btn-settle-next" @click="continueNext">
            继续
          </button>
          <button v-else class="btn btn-settle-retry" @click="retryBoss">
            再次挑战
          </button>
        </div>
      </transition>

      <!-- 每日低保 -->
      <div class="daily-section">
        <div class="daily-info">
          <span>每日低保</span>
          <span class="daily-amount">灵石 {{ dailyReward }}</span>
        </div>
        <button class="btn btn-sm" :class="{ 'btn-disabled': !canClaimDaily }" :disabled="!canClaimDaily"
          @click="claimDaily">{{ canClaimDaily ? '领取' : '已领取' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
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

// === Canvas ===
const bossCanvas = ref(null)
let bossAnimFrame = null
let bossAnimTime = 0

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

// === 工具函数 ===
function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function addLog(text, type = 'info', icon = '') {
  battleLog.value.push({ text, type, icon })
}

function addFloatingDamage(text, crit = false, skill = false) {
  const id = ++floatId
  const x = 30 + Math.random() * 40
  const y = -20 - Math.random() * 30
  floatingDamages.value.push({ id, text, crit, skill, x, y })
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

// =============================================
// Canvas Boss 渲染
// =============================================
const ELEMENT_COLORS = {
  normal:  { primary: '#c03030', secondary: '#801818', glow: '#ff4444', eye: '#ff2020' },
  fire:    { primary: '#ff4400', secondary: '#cc2200', glow: '#ff8844', eye: '#ffcc00' },
  ice:     { primary: '#44aaff', secondary: '#2266cc', glow: '#88ddff', eye: '#aaddff' },
  thunder: { primary: '#ffcc00', secondary: '#cc9900', glow: '#ffee66', eye: '#ffff88' },
  poison:  { primary: '#44cc00', secondary: '#228800', glow: '#88ff44', eye: '#aaff66' },
  dark:    { primary: '#8844cc', secondary: '#5522aa', glow: '#bb88ff', eye: '#dd99ff' },
}

function drawBoss(time) {
  const canvas = bossCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height
  const cx = w / 2
  const cy = h / 2

  ctx.clearRect(0, 0, w, h)

  const colors = ELEMENT_COLORS[bossElement.value] || ELEMENT_COLORS.normal
  const tier = bossTier.value
  const isDead = bossDead.value
  const isHit = bossHit.value

  // 背景光晕
  const glowRadius = 60 + Math.sin(time * 0.002) * 8
  const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius)
  if (isDead) {
    glowGrad.addColorStop(0, 'rgba(40,40,40,0.3)')
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)')
  } else {
    glowGrad.addColorStop(0, colors.glow + '30')
    glowGrad.addColorStop(0.6, colors.glow + '10')
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)')
  }
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 0, w, h)

  // 粒子（高层Boss）
  if (tier >= 1 && !isDead) {
    for (let i = 0; i < 8; i++) {
      const angle = (time * 0.001 + i * Math.PI * 2 / 8) % (Math.PI * 2)
      const dist = 45 + Math.sin(time * 0.003 + i) * 10
      const px = cx + Math.cos(angle) * dist
      const py = cy + Math.sin(angle) * dist
      const size = 2 + Math.sin(time * 0.005 + i * 2) * 1
      ctx.beginPath()
      ctx.arc(px, py, size, 0, Math.PI * 2)
      ctx.fillStyle = colors.glow + 'aa'
      ctx.fill()
    }
  }

  // 外圈光环（高层Boss）
  if (tier >= 2 && !isDead) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(time * 0.0008)
    ctx.strokeStyle = colors.primary + '40'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(0, 0, 55, 0, Math.PI * 1.5)
    ctx.stroke()
    ctx.rotate(-time * 0.0012)
    ctx.strokeStyle = colors.secondary + '30'
    ctx.beginPath()
    ctx.arc(0, 0, 62, 0, Math.PI)
    ctx.stroke()
    ctx.restore()
  }

  // Boss身体
  ctx.save()
  if (isHit) {
    ctx.translate(cx + (Math.random() - 0.5) * 6, cy + (Math.random() - 0.5) * 4)
  } else {
    ctx.translate(cx, cy + Math.sin(time * 0.002) * 3)
  }

  // 身体主体
  const bodyW = 36 + tier * 4
  const bodyH = 44 + tier * 4
  ctx.beginPath()
  ctx.moveTo(-bodyW * 0.5, bodyH * 0.3)
  ctx.bezierCurveTo(-bodyW * 0.6, -bodyH * 0.1, -bodyW * 0.3, -bodyH * 0.5, 0, -bodyH * 0.5)
  ctx.bezierCurveTo(bodyW * 0.3, -bodyH * 0.5, bodyW * 0.6, -bodyH * 0.1, bodyW * 0.5, bodyH * 0.3)
  ctx.lineTo(bodyW * 0.3, bodyH * 0.5)
  ctx.lineTo(-bodyW * 0.3, bodyH * 0.5)
  ctx.closePath()

  if (isDead) {
    ctx.fillStyle = '#333'
  } else if (isHit) {
    ctx.fillStyle = '#fff'
  } else {
    const bodyGrad = ctx.createLinearGradient(0, -bodyH * 0.5, 0, bodyH * 0.5)
    bodyGrad.addColorStop(0, colors.primary)
    bodyGrad.addColorStop(1, colors.secondary)
    ctx.fillStyle = bodyGrad
  }
  ctx.fill()

  // 身体纹理
  if (!isDead) {
    ctx.strokeStyle = colors.glow + '30'
    ctx.lineWidth = 0.8
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath()
      ctx.moveTo(i * 8, -bodyH * 0.3)
      ctx.quadraticCurveTo(i * 4, 0, i * 10, bodyH * 0.3)
      ctx.stroke()
    }
  }

  // 角（根据层级变化）
  if (tier >= 1) {
    const hornH = 14 + tier * 4
    ctx.beginPath()
    ctx.moveTo(-12, -bodyH * 0.45)
    ctx.lineTo(-18, -bodyH * 0.45 - hornH)
    ctx.lineTo(-6, -bodyH * 0.45)
    ctx.fillStyle = isDead ? '#444' : colors.secondary
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(12, -bodyH * 0.45)
    ctx.lineTo(18, -bodyH * 0.45 - hornH)
    ctx.lineTo(6, -bodyH * 0.45)
    ctx.fill()
  }

  // 眼睛
  const eyeY = -bodyH * 0.15
  const eyeSpacing = 10 + tier * 2
  const eyeSize = 4 + tier

  if (isDead) {
    // 死亡：X眼
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-eyeSpacing - 3, eyeY - 3); ctx.lineTo(-eyeSpacing + 3, eyeY + 3)
    ctx.moveTo(-eyeSpacing + 3, eyeY - 3); ctx.lineTo(-eyeSpacing - 3, eyeY + 3)
    ctx.moveTo(eyeSpacing - 3, eyeY - 3); ctx.lineTo(eyeSpacing + 3, eyeY + 3)
    ctx.moveTo(eyeSpacing + 3, eyeY - 3); ctx.lineTo(eyeSpacing - 3, eyeY + 3)
    ctx.stroke()
  } else {
    // 活着：发光眼睛
    const blink = Math.sin(time * 0.003) > 0.95
    if (blink) {
      ctx.strokeStyle = colors.eye
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-eyeSpacing - eyeSize, eyeY)
      ctx.lineTo(-eyeSpacing + eyeSize, eyeY)
      ctx.moveTo(eyeSpacing - eyeSize, eyeY)
      ctx.lineTo(eyeSpacing + eyeSize, eyeY)
      ctx.stroke()
    } else {
      // 左眼
      ctx.shadowColor = colors.eye
      ctx.shadowBlur = 8 + tier * 2
      ctx.beginPath()
      ctx.arc(-eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2)
      ctx.fillStyle = colors.eye
      ctx.fill()
      // 瞳孔
      ctx.beginPath()
      ctx.arc(-eyeSpacing, eyeY, eyeSize * 0.4, 0, Math.PI * 2)
      ctx.fillStyle = '#000'
      ctx.fill()

      // 右眼
      ctx.beginPath()
      ctx.arc(eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(eyeSpacing, eyeY, eyeSize * 0.4, 0, Math.PI * 2)
      ctx.fillStyle = '#000'
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }

  // 嘴
  if (!isDead) {
    const mouthY = bodyH * 0.1
    ctx.beginPath()
    if (isHit) {
      // 受击：张嘴
      ctx.ellipse(0, mouthY + 2, 6, 5, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#000'
      ctx.fill()
    } else {
      // 正常：锯齿嘴
      ctx.moveTo(-10, mouthY)
      for (let i = 0; i < 5; i++) {
        const mx = -10 + i * 5
        ctx.lineTo(mx + 2.5, mouthY + (i % 2 === 0 ? 4 : 0))
      }
      ctx.strokeStyle = colors.glow + 'cc'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }

  ctx.restore()

  // 受击闪白叠加
  if (isHit) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(0, 0, w, h)
  }
}

function startBossAnim() {
  function loop(ts) {
    bossAnimTime = ts
    drawBoss(ts)
    bossAnimFrame = requestAnimationFrame(loop)
  }
  bossAnimFrame = requestAnimationFrame(loop)
}

function stopBossAnim() {
  if (bossAnimFrame) {
    cancelAnimationFrame(bossAnimFrame)
    bossAnimFrame = null
  }
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

  addLog(`遭遇第${layer.value}层Boss「${boss.value.name}」！`, 'system', '塔')
  addLog(`血${formatNum(boss.value.hp)} 攻${formatNum(boss.value.atk)} 防${formatNum(boss.value.def)}`, 'info', '情')
  if (boss.value.immuneControl) addLog('此Boss免疫控制技能！', 'warning', '!')
}

// === 技能 ===
const SKILLS = {
  normal: { name: '普攻', icon: '斩', mpCost: 0, dmgMult: 1, critChance: 0.1 },
  crit:   { name: '暴击', icon: '暴', mpCost: 10, dmgMult: 1.8, critChance: 0.35 },
  spirit: { name: '灵技', icon: '灵', mpCost: 25, dmgMult: 2.5, critChance: 0.15 },
  slash:  { name: '剑气斩', icon: '剑', mpCost: 40, dmgMult: 4.0, critChance: 0.2 },
}

async function doAttack(skillKey) {
  if (animating.value || bossCurrentHp.value <= 0) return
  const skill = SKILLS[skillKey]

  if (skill.mpCost > 0 && player.mp < skill.mpCost) {
    addLog(`灵力不足！需要${skill.mpCost}灵力`, 'warning', '!')
    return
  }

  animating.value = true
  turn.value++

  if (skill.mpCost > 0) player.useMp(skill.mpCost)

  // 玩家回合
  const isCrit = Math.random() < skill.critChance
  let baseDmg = Math.max(1, player.atk - boss.value.def + Math.floor(Math.random() * player.atk * 0.3))
  let dmg = Math.floor(baseDmg * skill.dmgMult)
  if (isCrit) dmg = Math.floor(dmg * 2)

  bossCurrentHp.value = Math.max(0, bossCurrentHp.value - dmg)
  triggerBossHit()

  if (isCrit) {
    addFloatingDamage(`暴击！-${formatNum(dmg)}`, true, skillKey !== 'normal')
  } else {
    addFloatingDamage(`-${formatNum(dmg)}`, false, skillKey !== 'normal')
  }

  if (skillKey === 'normal') {
    addLog(`第${turn.value}回合：挥剑攻击${isCrit ? '，暴击！' : ''}造成${formatNum(dmg)}伤害`, isCrit ? 'crit' : 'attack', skill.icon)
  } else {
    addLog(`第${turn.value}回合：释放【${skill.name}】${isCrit ? '暴击！' : ''}造成${formatNum(dmg)}伤害`, isCrit ? 'crit' : 'skill', skill.icon)
  }

  await sleep(600)

  if (bossCurrentHp.value <= 0) {
    await handleBossDeath()
    animating.value = false
    return
  }

  // Boss回合
  const bossDmg = Math.max(1, boss.value.atk - player.def + Math.floor(Math.random() * boss.value.atk * 0.2))
  player.takeDamage(bossDmg)
  addFloatingDamage(`-${formatNum(bossDmg)}`)
  addLog(`${boss.value.name} 反击！造成${formatNum(bossDmg)}伤害`, 'boss-attack', '反')

  await sleep(400)

  if (player.isDead) {
    addLog('你被击败了...重伤昏迷', 'defeat', '败')
    await sleep(1000)
    player.revive()
    game.addLog('你重伤昏迷，被路人救起，损失一成修为。', 'battle')
    settleResult.value = 'lose'
    settleDetail.value = `第${turn.value}回合惜败，Boss剩余${formatNum(bossCurrentHp.value)}血量`
    showSettlement.value = true
    fighting.value = false
    bossCurrentHp.value = boss.value.hp
  }

  animating.value = false
}

async function handleBossDeath() {
  bossDead.value = true
  addLog(`击败「${boss.value.name}」！`, 'victory', '胜')

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
        rewards.push(`${data.firstReward.stones}灵石`)
        for (const item of data.firstReward.items) {
          rewards.push(`${item.name} ×${item.amount}`)
        }
      }
      rewards.push(`进入第${data.newLayer}层`)

      layer.value = data.newLayer
      boss.value = data.boss
      bossCurrentHp.value = data.boss.hp

      settleResult.value = 'win'
      settleDetail.value = `用了${turn.value}回合击败Boss！`
      settleRewards.value = rewards
      showSettlement.value = true

      game.addLog(`击败Boss！进入第${data.newLayer}层！`, 'breakthrough')
      game.updateTasks([{ taskId: 'main_kill_10' }, { taskId: 'main_kill_100' }])
    }
  } catch {
    addLog('网络错误，结算失败', 'warning', '!')
  }

  await sleep(1500)
  fighting.value = false
  bossDead.value = false
}

// === 继续/重试 ===
function continueNext() {
  showSettlement.value = false
  fightBoss()
}

function retryBoss() {
  showSettlement.value = false
  bossCurrentHp.value = boss.value.hp
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
      game.addLog(`领取深渊低保：${data.reward}灵石`, 'success')
      canClaimDaily.value = false
    } else {
      game.addLog(data.error || '领取失败', 'battle')
    }
  } catch {
    game.addLog('网络错误', 'battle')
  }
}

// 日志自动滚动
watch(() => battleLog.value.length, () => {
  nextTick(() => {
    if (battleLogEl.value) battleLogEl.value.scrollTop = battleLogEl.value.scrollHeight
  })
})

onMounted(() => {
  loadAbyss()
  startBossAnim()
})

onUnmounted(() => {
  stopBossAnim()
})
</script>

<style scoped>
/* ============ Boss战场 ============ */
.boss-arena {
  position: relative;
  text-align: center;
  padding: 12px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;
}
.boss-arena.boss-hit {
  animation: arena-shake 0.4s ease;
}
.boss-arena.boss-dead {
  filter: grayscale(0.5) brightness(0.7);
}
@keyframes arena-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

.boss-canvas {
  display: block;
  margin: 0 auto;
  width: 160px;
  height: 160px;
}

.boss-name {
  font-size: 16px;
  font-family: 'ZCOOL XiaoWei', serif;
  margin: 4px 0;
}
.name-normal { color: #e04040; }
.name-fire { color: #ff6622; text-shadow: 0 0 8px rgba(255,100,0,0.3); }
.name-ice { color: #44bbff; text-shadow: 0 0 8px rgba(68,187,255,0.3); }
.name-thunder { color: #ffdd22; text-shadow: 0 0 8px rgba(255,221,34,0.3); }
.name-poison { color: #66dd22; text-shadow: 0 0 8px rgba(102,221,34,0.3); }
.name-dark { color: #bb66ff; text-shadow: 0 0 8px rgba(187,102,255,0.3); }

.boss-tags {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 6px;
}
.boss-tag {
  font-size: 10px;
  color: #4080c0;
  background: rgba(64,128,196,0.15);
  padding: 2px 8px;
  border-radius: 4px;
}
.tag-danger {
  color: #e04040;
  background: rgba(224,64,64,0.15);
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
@keyframes float-up {
  0% { transform: translateY(0) scale(0.5); opacity: 0; }
  15% { transform: translateY(calc(var(--float-y) * 0.3)) scale(1.2); opacity: 1; }
  100% { transform: translateY(calc(var(--float-y) * 1.5)) scale(0.8); opacity: 0; }
}

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
.boss-hp-fill { background: linear-gradient(90deg, #c03030, #e04040); }
.fill-fire { background: linear-gradient(90deg, #cc3300, #ff6622) !important; }
.fill-ice { background: linear-gradient(90deg, #2266cc, #44bbff) !important; }
.fill-thunder { background: linear-gradient(90deg, #cc9900, #ffdd22) !important; }
.fill-poison { background: linear-gradient(90deg, #338800, #66dd22) !important; }
.fill-dark { background: linear-gradient(90deg, #6600aa, #bb66ff) !important; }
.fill-normal { background: linear-gradient(90deg, #c03030, #e04040) !important; }
.player-hp-fill { background: linear-gradient(90deg, #30a030, #44cc44); }

.hp-shine {
  position: absolute;
  top: 0;
  left: -50%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: hp-shine-anim 2s infinite;
}
@keyframes hp-shine-anim { from { left: -50%; } to { left: 150%; } }

.hp-text {
  font-size: 11px;
  color: #aaa;
  text-align: center;
  margin-top: 2px;
}

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
  color: #4080c0;
  text-align: right;
  display: block;
  margin-top: 2px;
}

/* ============ 战斗区域 ============ */
.battle-section { margin-top: 10px; }

.player-battle-info {
  background: rgba(0,128,0,0.05);
  border: 1px solid rgba(0,128,0,0.15);
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
  color: #d4a853;
  font-weight: bold;
}
.player-hp-num {
  font-size: 11px;
  color: #40c060;
}

.turn-badge {
  text-align: center;
  font-size: 11px;
  color: #888;
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
.log-system { color: #d4a853; font-weight: bold; }
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
}
.skill-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.2);
}
.skill-btn:active:not(:disabled) { transform: scale(0.95); }
.skill-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.skill-icon { font-size: 20px; }
.skill-name { font-size: 11px; color: #ddd; margin-top: 2px; }
.skill-cost { font-size: 9px; color: #4080c0; }

.skill-normal { border-color: rgba(200,200,200,0.2); }
.skill-crit { border-color: rgba(255,100,0,0.3); }
.skill-crit:hover:not(:disabled) { border-color: rgba(255,100,0,0.6); box-shadow: 0 0 10px rgba(255,100,0,0.2); }
.skill-spirit { border-color: rgba(100,180,255,0.3); }
.skill-spirit:hover:not(:disabled) { border-color: rgba(100,180,255,0.6); box-shadow: 0 0 10px rgba(100,180,255,0.2); }
.skill-slash { border-color: rgba(180,80,255,0.3); }
.skill-slash:hover:not(:disabled) { border-color: rgba(180,80,255,0.6); box-shadow: 0 0 10px rgba(180,80,255,0.2); }

/* ============ 按钮 ============ */
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
  box-shadow: 0 4px 15px rgba(196,64,64,0.4);
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
.settle-title { font-size: 16px; color: #d4a853; font-weight: bold; }
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
  color: #d4a853;
  background: rgba(212,168,83,0.1);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(212,168,83,0.2);
}
.btn-settle-next, .btn-settle-retry {
  margin-top: 12px;
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-settle-next {
  background: linear-gradient(135deg, #d4a853, #c49040);
  color: #fff;
}
.btn-settle-next:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(212,168,83,0.4);
}
.btn-settle-retry {
  background: rgba(255,255,255,0.08);
  color: #ddd;
  border: 1px solid rgba(255,255,255,0.15);
}
.btn-settle-retry:hover {
  background: rgba(255,255,255,0.12);
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
.daily-amount { font-size: 12px; color: #d4a853; }
.btn-disabled { opacity: 0.4; cursor: not-allowed; }
</style>
