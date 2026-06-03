<template>
  <div class="panel">
    <div class="panel-header">
      <span>镇妖塔</span>
      <span class="layer-badge">第{{ layer }}层</span>
    </div>
    <div class="panel-body">
      <!-- Boss战场 -->
      <div class="boss-arena" :class="{ 'boss-hit': bossHit, 'boss-dead': bossDead }">
        <canvas ref="bossCanvas" class="boss-canvas" width="240" height="240"></canvas>

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

        <div class="skill-bar" ref="skillBarEl">
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

      <!-- 非战斗：挑战按钮 -->
      <div v-if="!fighting" class="abyss-actions">
        <button class="btn btn-full btn-fight" @click="fightBoss">挑战Boss</button>
      </div>

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

    <!-- 结算悬浮层 -->
    <Teleport to="body">
      <transition name="settle-fade">
        <div v-if="showSettlement" class="settle-overlay" @click.self="settleResult === 'win' ? continueNext() : null">
          <div class="settle-box" :class="{ 'settle-win': settleResult === 'win', 'settle-lose': settleResult === 'lose' }">
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
        </div>
      </transition>
    </Teleport>
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
const skillBarEl = ref(null)
const floatingDamages = ref([])
let floatId = 0

// === 结算 ===
const showSettlement = ref(false)
const settleResult = ref('')
const settleDetail = ref('')
const settleRewards = ref([])

// === Canvas ===
const bossCanvas = ref(null)
let bossAnimFrame = null

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

// =============================================
// Boss外观配置 - 根据名字决定造型
// =============================================
function getBossStyle(name) {
  // 去掉★标记
  const base = name.replace(/★+$/, '')

  // 体型: tiny, small, medium, large, huge
  // 形态: rat, snake, humanoid, bear, fox, bat, bird, turtle, wolf, dragon, golem, demon, abstract, tree, scorpion, knight
  const map = {
    '妖鼠王':     { shape: 'rat',       size: 'small',  colors: ['#c8a040', '#8a6a20', '#ffee66'] },
    '毒蛇精':     { shape: 'snake',     size: 'medium', colors: ['#44cc44', '#228822', '#aaffaa'] },
    '山贼头领':   { shape: 'humanoid',  size: 'medium', colors: ['#aa7744', '#664422', '#ddbb88'] },
    '黑熊妖':     { shape: 'bear',      size: 'large',  colors: ['#333333', '#111111', '#666666'] },
    '九尾妖狐':   { shape: 'fox',       size: 'medium', colors: ['#ff88cc', '#cc4488', '#ffccdd'] },
    '血魔弟子':   { shape: 'humanoid',  size: 'medium', colors: ['#cc2020', '#881010', '#ff4444'] },
    '幽冥鬼将':   { shape: 'knight',    size: 'large',  colors: ['#44cccc', '#228888', '#88ffff'] },
    '千年树妖':   { shape: 'tree',      size: 'huge',   colors: ['#668833', '#445522', '#88aa44'] },
    '墨蛟':       { shape: 'dragon',    size: 'large',  colors: ['#2244aa', '#112266', '#4488ff'] },
    '远古龙魂':   { shape: 'dragon',    size: 'huge',   colors: ['#ddaa44', '#aa7722', '#ffdd88'] },
    '噬魂蝠王':   { shape: 'bat',       size: 'medium', colors: ['#553366', '#331144', '#8855aa'] },
    '赤炎虎':     { shape: 'tiger',     size: 'large',  colors: ['#ff4400', '#cc2200', '#ff8844'] },
    '冰霜巨蟒':   { shape: 'snake',     size: 'huge',   colors: ['#88ccff', '#4488cc', '#cceeFF'] },
    '暗影刺客':   { shape: 'humanoid',  size: 'medium', colors: ['#333344', '#111122', '#556677'] },
    '铁甲龟将':   { shape: 'turtle',    size: 'large',  colors: ['#888888', '#555555', '#aaaaaa'] },
    '雷翼鹰':     { shape: 'bird',      size: 'large',  colors: ['#ffcc00', '#cc9900', '#ffee66'] },
    '毒蝎皇后':   { shape: 'scorpion',  size: 'large',  colors: ['#884488', '#553355', '#bb66bb'] },
    '石魔巨人':   { shape: 'golem',     size: 'huge',   colors: ['#777766', '#555544', '#999988'] },
    '亡灵骑士':   { shape: 'knight',    size: 'large',  colors: ['#667766', '#445544', '#88aa88'] },
    '地狱犬':     { shape: 'wolf',      size: 'large',  colors: ['#cc3300', '#881100', '#ff5522'] },
    '炎魔领主':   { shape: 'demon',     size: 'huge',   colors: ['#ff3300', '#cc1100', '#ff6644'] },
    '寒冰巫妖':   { shape: 'demon',     size: 'large',  colors: ['#66bbff', '#3388cc', '#aaeeff'] },
    '雷霆蜥蜴':   { shape: 'dragon',    size: 'large',  colors: ['#ffdd00', '#ccaa00', '#ffee44'] },
    '暗夜狼王':   { shape: 'wolf',      size: 'large',  colors: ['#334455', '#112233', '#556677'] },
    '血色修罗':   { shape: 'demon',     size: 'huge',   colors: ['#cc0000', '#880000', '#ff2222'] },
    '天魔将':     { shape: 'demon',     size: 'huge',   colors: ['#6633cc', '#4411aa', '#8855ff'] },
    '堕落天使':   { shape: 'angel',     size: 'large',  colors: ['#8866aa', '#553377', '#aa88cc'] },
    '混沌之主':   { shape: 'abstract',  size: 'huge',   colors: ['#884488', '#553355', '#bbaacc'] },
    '虚空行者':   { shape: 'abstract',  size: 'large',  colors: ['#223344', '#111122', '#445566'] },
    '灭世龙神':   { shape: 'dragon',    size: 'huge',   colors: ['#ff2200', '#aa1100', '#ff6644'] },
    '太古凶兽':   { shape: 'bear',      size: 'huge',   colors: ['#553322', '#331100', '#775544'] },
    '万年妖皇':   { shape: 'fox',       size: 'huge',   colors: ['#cc44ff', '#8822cc', '#ee88ff'] },
    '仙界叛将':   { shape: 'knight',    size: 'huge',   colors: ['#ddaa44', '#aa7722', '#ffdd88'] },
    '混沌魔尊':   { shape: 'demon',     size: 'huge',   colors: ['#993366', '#661133', '#cc5588'] },
    '天道之敌':   { shape: 'abstract',  size: 'huge',   colors: ['#ffffff', '#ccccdd', '#eeeeff'] },
  }
  return map[base] || { shape: 'demon', size: 'large', colors: ['#cc3333', '#881111', '#ff5555'] }
}

// =============================================
// Canvas Boss 渲染
// =============================================
function drawBoss(time) {
  const canvas = bossCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height
  const cx = w / 2
  const cy = h / 2 + 10

  ctx.clearRect(0, 0, w, h)

  const style = getBossStyle(boss.value.name)
  const [primary, secondary, glow] = style.colors
  const isDead = bossDead.value
  const isHit = bossHit.value
  const tier = bossTier.value

  const sizeMap = { tiny: 0.5, small: 0.7, medium: 0.9, large: 1.1, huge: 1.35 }
  const scale = sizeMap[style.size] || 1

  // 背景光晕
  const glowR = (50 + tier * 8) * scale + Math.sin(time * 0.002) * 6
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
  if (isDead) {
    grd.addColorStop(0, 'rgba(30,30,30,0.3)')
    grd.addColorStop(1, 'rgba(0,0,0,0)')
  } else {
    grd.addColorStop(0, glow + '25')
    grd.addColorStop(0.7, glow + '08')
    grd.addColorStop(1, 'rgba(0,0,0,0)')
  }
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, w, h)

  // 粒子
  if (tier >= 1 && !isDead) {
    const pCount = 6 + tier * 2
    for (let i = 0; i < pCount; i++) {
      const a = time * 0.0008 + i * Math.PI * 2 / pCount
      const d = (40 + tier * 10) * scale + Math.sin(time * 0.003 + i) * 8
      const px = cx + Math.cos(a) * d
      const py = cy + Math.sin(a) * d
      const sz = 1.5 + Math.sin(time * 0.005 + i * 2) * 1
      ctx.beginPath()
      ctx.arc(px, py, sz, 0, Math.PI * 2)
      ctx.fillStyle = glow + '99'
      ctx.fill()
    }
  }

  // 光环
  if (tier >= 2 && !isDead) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(time * 0.0006)
    ctx.strokeStyle = primary + '35'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(0, 0, 55 * scale, 0, Math.PI * 1.5)
    ctx.stroke()
    ctx.restore()
  }

  ctx.save()
  ctx.translate(cx, cy)
  if (isHit) ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4)
  else ctx.translate(0, Math.sin(time * 0.002) * 3)

  // 根据形态绘制
  const S = scale * 30 // 基础尺寸单位
  const bodyColor = isDead ? '#333' : (isHit ? '#fff' : null)

  switch (style.shape) {
    case 'rat':       drawRat(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'snake':     drawSnake(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'bear':      drawBear(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'fox':       drawFox(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'humanoid':  drawHumanoid(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'bat':       drawBat(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'bird':      drawBird(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'turtle':    drawTurtle(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'wolf':      drawWolf(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'dragon':    drawDragon(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'golem':     drawGolem(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'demon':     drawDemon(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'abstract':  drawAbstract(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'tree':      drawTree(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'scorpion':  drawScorpion(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'knight':    drawKnight(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'angel':     drawAngel(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    case 'tiger':     drawTiger(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
    default:          drawDemon(ctx, S, bodyColor || primary, secondary, glow, time, tier); break
  }

  ctx.restore()

  if (isHit) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(0, 0, w, h)
  }
}

// === 绘制眼睛的通用函数 ===
function drawEyes(ctx, lx, ly, rx, ry, size, glowColor, time, tier) {
  const blink = Math.sin(time * 0.003) > 0.94
  if (blink) {
    ctx.strokeStyle = glowColor
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(lx - size, ly); ctx.lineTo(lx + size, ly)
    ctx.moveTo(rx - size, ry); ctx.lineTo(rx + size, ry)
    ctx.stroke()
  } else {
    ctx.shadowColor = glowColor
    ctx.shadowBlur = 6 + tier * 2
    // 左眼
    ctx.beginPath(); ctx.arc(lx, ly, size, 0, Math.PI * 2)
    ctx.fillStyle = glowColor; ctx.fill()
    ctx.beginPath(); ctx.arc(lx, ly, size * 0.35, 0, Math.PI * 2)
    ctx.fillStyle = '#000'; ctx.fill()
    // 右眼
    ctx.beginPath(); ctx.arc(rx, ry, size, 0, Math.PI * 2)
    ctx.fillStyle = glowColor; ctx.fill()
    ctx.beginPath(); ctx.arc(rx, ry, size * 0.35, 0, Math.PI * 2)
    ctx.fillStyle = '#000'; ctx.fill()
    ctx.shadowBlur = 0
  }
}

function drawDeadEyes(ctx, lx, ly, rx, ry, size) {
  ctx.strokeStyle = '#555'
  ctx.lineWidth = 1.5
  const d = size * 0.7
  ctx.beginPath()
  ctx.moveTo(lx - d, ly - d); ctx.lineTo(lx + d, ly + d)
  ctx.moveTo(lx + d, ly - d); ctx.lineTo(lx - d, ly + d)
  ctx.moveTo(rx - d, ry - d); ctx.lineTo(rx + d, ry + d)
  ctx.moveTo(rx + d, ry - d); ctx.lineTo(rx - d, ry + d)
  ctx.stroke()
}

// === 各形态绘制 ===
function drawRat(ctx, S, pri, sec, glow, t, tier) {
  // 身体（椭圆）
  ctx.beginPath(); ctx.ellipse(0, 0, S * 0.8, S * 0.6, 0, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  // 头
  ctx.beginPath(); ctx.ellipse(-S * 0.5, -S * 0.4, S * 0.45, S * 0.4, -0.3, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  // 耳朵
  ctx.beginPath(); ctx.ellipse(-S * 0.7, -S * 0.8, S * 0.2, S * 0.3, -0.3, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  ctx.beginPath(); ctx.ellipse(-S * 0.3, -S * 0.85, S * 0.18, S * 0.28, 0.2, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  // 尾巴
  ctx.beginPath(); ctx.moveTo(S * 0.7, 0)
  ctx.quadraticCurveTo(S * 1.2, -S * 0.3 + Math.sin(t * 0.004) * 8, S * 1.0, -S * 0.8)
  ctx.strokeStyle = sec; ctx.lineWidth = 2; ctx.stroke()
  // 眼
  if (bossDead.value) drawDeadEyes(ctx, -S * 0.65, -S * 0.45, -S * 0.35, -S * 0.45, 3)
  else drawEyes(ctx, -S * 0.65, -S * 0.45, -S * 0.35, -S * 0.45, 3, glow, t, tier)
  // 须
  ctx.strokeStyle = sec + '88'; ctx.lineWidth = 0.8
  for (const a of [-0.3, 0, 0.3]) {
    ctx.beginPath()
    ctx.moveTo(-S * 0.85, -S * 0.35 + a * S * 3)
    ctx.lineTo(-S * 1.3, -S * 0.35 + a * S * 5)
    ctx.stroke()
  }
}

function drawSnake(ctx, S, pri, sec, glow, t, tier) {
  // 蛇身（蜿蜒曲线）
  ctx.beginPath()
  const pts = []
  for (let i = 0; i < 8; i++) {
    const sx = -S * 1.2 + i * S * 0.35
    const sy = Math.sin(t * 0.003 + i * 0.8) * S * 0.3
    pts.push([sx, sy])
  }
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i][0], pts[i][1])
  }
  ctx.strokeStyle = pri; ctx.lineWidth = S * 0.4; ctx.lineCap = 'round'; ctx.stroke()
  // 花纹
  ctx.strokeStyle = sec + '60'; ctx.lineWidth = S * 0.15; ctx.stroke()
  // 蛇头
  const hx = pts[0][0], hy = pts[0][1]
  ctx.beginPath(); ctx.ellipse(hx, hy, S * 0.35, S * 0.28, -0.3, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  // 眼
  if (bossDead.value) drawDeadEyes(ctx, hx - S * 0.15, hy - S * 0.15, hx + S * 0.1, hy - S * 0.15, 2.5)
  else drawEyes(ctx, hx - S * 0.15, hy - S * 0.15, hx + S * 0.1, hy - S * 0.15, 2.5, glow, t, tier)
  // 信子
  if (!bossDead.value) {
    const flicker = Math.sin(t * 0.01) > 0
    if (flicker) {
      ctx.beginPath()
      ctx.moveTo(hx - S * 0.35, hy)
      ctx.lineTo(hx - S * 0.6, hy - S * 0.08)
      ctx.moveTo(hx - S * 0.35, hy)
      ctx.lineTo(hx - S * 0.6, hy + S * 0.08)
      ctx.strokeStyle = '#ff2222'; ctx.lineWidth = 1; ctx.stroke()
    }
  }
}

function drawBear(ctx, S, pri, sec, glow, t, tier) {
  // 身体
  ctx.beginPath(); ctx.ellipse(0, S * 0.1, S * 0.9, S * 0.75, 0, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  // 头
  ctx.beginPath(); ctx.arc(0, -S * 0.55, S * 0.55, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  // 耳
  ctx.beginPath(); ctx.arc(-S * 0.4, -S * 0.95, S * 0.18, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  ctx.beginPath(); ctx.arc(S * 0.4, -S * 0.95, S * 0.18, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  // 嘴
  ctx.beginPath(); ctx.ellipse(0, -S * 0.35, S * 0.2, S * 0.12, 0, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  // 眼
  if (bossDead.value) drawDeadEyes(ctx, -S * 0.22, -S * 0.6, S * 0.22, -S * 0.6, 3)
  else drawEyes(ctx, -S * 0.22, -S * 0.6, S * 0.22, -S * 0.6, 3, glow, t, tier)
  // 爪
  ctx.beginPath(); ctx.ellipse(-S * 0.7, S * 0.65, S * 0.2, S * 0.15, -0.3, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  ctx.beginPath(); ctx.ellipse(S * 0.7, S * 0.65, S * 0.2, S * 0.15, 0.3, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
}

function drawFox(ctx, S, pri, sec, glow, t, tier) {
  // 身体
  ctx.beginPath(); ctx.ellipse(0, S * 0.1, S * 0.6, S * 0.5, 0, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  // 头
  ctx.beginPath()
  ctx.moveTo(0, -S * 0.9)
  ctx.lineTo(-S * 0.35, -S * 0.4)
  ctx.lineTo(S * 0.35, -S * 0.4)
  ctx.closePath()
  ctx.fillStyle = pri; ctx.fill()
  // 耳（尖）
  ctx.beginPath(); ctx.moveTo(-S * 0.2, -S * 0.7); ctx.lineTo(-S * 0.4, -S * 1.15); ctx.lineTo(-S * 0.05, -S * 0.8)
  ctx.fillStyle = sec; ctx.fill()
  ctx.beginPath(); ctx.moveTo(S * 0.2, -S * 0.7); ctx.lineTo(S * 0.4, -S * 1.15); ctx.lineTo(S * 0.05, -S * 0.8)
  ctx.fillStyle = sec; ctx.fill()
  // 尾巴（多尾）
  const tails = tier >= 2 ? 3 : 1
  for (let i = 0; i < tails; i++) {
    const ta = (i - (tails - 1) / 2) * 0.4
    ctx.beginPath()
    ctx.moveTo(S * 0.5, S * 0.1)
    const tx = S * 1.2 + Math.sin(t * 0.003 + i) * 10
    const ty = -S * 0.3 + ta * S * 2
    ctx.quadraticCurveTo(S * 0.8, ty, tx, ty - S * 0.3)
    ctx.strokeStyle = pri; ctx.lineWidth = S * 0.2; ctx.lineCap = 'round'; ctx.stroke()
    // 尾尖
    ctx.beginPath(); ctx.arc(tx, ty - S * 0.3, S * 0.1, 0, Math.PI * 2)
    ctx.fillStyle = sec; ctx.fill()
  }
  // 眼
  if (bossDead.value) drawDeadEyes(ctx, -S * 0.15, -S * 0.55, S * 0.15, -S * 0.55, 2.5)
  else drawEyes(ctx, -S * 0.15, -S * 0.55, S * 0.15, -S * 0.55, 2.5, glow, t, tier)
}

function drawHumanoid(ctx, S, pri, sec, glow, t, tier) {
  // 身体
  ctx.beginPath()
  ctx.moveTo(-S * 0.3, -S * 0.2); ctx.lineTo(-S * 0.4, S * 0.6)
  ctx.lineTo(S * 0.4, S * 0.6); ctx.lineTo(S * 0.3, -S * 0.2)
  ctx.closePath(); ctx.fillStyle = pri; ctx.fill()
  // 头
  ctx.beginPath(); ctx.arc(0, -S * 0.5, S * 0.3, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  // 肩甲
  ctx.beginPath(); ctx.ellipse(-S * 0.4, -S * 0.15, S * 0.15, S * 0.1, 0, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  ctx.beginPath(); ctx.ellipse(S * 0.4, -S * 0.15, S * 0.15, S * 0.1, 0, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  // 武器（剑）
  ctx.beginPath()
  ctx.moveTo(S * 0.5, -S * 0.3)
  ctx.lineTo(S * 0.9, -S * 0.9)
  ctx.strokeStyle = '#aaaacc'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke()
  ctx.beginPath(); ctx.moveTo(S * 0.4, -S * 0.2); ctx.lineTo(S * 0.6, -S * 0.1)
  ctx.strokeStyle = sec; ctx.lineWidth = 3; ctx.stroke()
  // 眼
  if (bossDead.value) drawDeadEyes(ctx, -S * 0.12, -S * 0.55, S * 0.12, -S * 0.55, 2.5)
  else drawEyes(ctx, -S * 0.12, -S * 0.55, S * 0.12, -S * 0.55, 2.5, glow, t, tier)
}

function drawBat(ctx, S, pri, sec, glow, t, tier) {
  // 翅膀
  const wingFlap = Math.sin(t * 0.006) * S * 0.2
  ctx.beginPath()
  ctx.moveTo(0, -S * 0.1)
  ctx.quadraticCurveTo(-S * 0.8, -S * 0.8 + wingFlap, -S * 1.3, -S * 0.2 + wingFlap)
  ctx.quadraticCurveTo(-S * 0.9, S * 0.1, -S * 0.4, S * 0.2)
  ctx.fillStyle = pri; ctx.fill()
  ctx.beginPath()
  ctx.moveTo(0, -S * 0.1)
  ctx.quadraticCurveTo(S * 0.8, -S * 0.8 + wingFlap, S * 1.3, -S * 0.2 + wingFlap)
  ctx.quadraticCurveTo(S * 0.9, S * 0.1, S * 0.4, S * 0.2)
  ctx.fillStyle = pri; ctx.fill()
  // 身体
  ctx.beginPath(); ctx.ellipse(0, 0, S * 0.35, S * 0.4, 0, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  // 耳
  ctx.beginPath(); ctx.moveTo(-S * 0.15, -S * 0.35); ctx.lineTo(-S * 0.25, -S * 0.7); ctx.lineTo(-S * 0.05, -S * 0.4)
  ctx.fillStyle = sec; ctx.fill()
  ctx.beginPath(); ctx.moveTo(S * 0.15, -S * 0.35); ctx.lineTo(S * 0.25, -S * 0.7); ctx.lineTo(S * 0.05, -S * 0.4)
  ctx.fillStyle = sec; ctx.fill()
  // 眼
  if (bossDead.value) drawDeadEyes(ctx, -S * 0.12, -S * 0.15, S * 0.12, -S * 0.15, 2.5)
  else drawEyes(ctx, -S * 0.12, -S * 0.15, S * 0.12, -S * 0.15, 2.5, glow, t, tier)
}

function drawBird(ctx, S, pri, sec, glow, t, tier) {
  // 翅膀
  const flap = Math.sin(t * 0.005) * S * 0.15
  ctx.beginPath()
  ctx.moveTo(-S * 0.2, 0); ctx.quadraticCurveTo(-S * 0.8, -S * 0.6 + flap, -S * 1.1, -S * 0.1 + flap)
  ctx.quadraticCurveTo(-S * 0.7, S * 0.1, -S * 0.2, S * 0.1)
  ctx.fillStyle = pri; ctx.fill()
  ctx.beginPath()
  ctx.moveTo(S * 0.2, 0); ctx.quadraticCurveTo(S * 0.8, -S * 0.6 + flap, S * 1.1, -S * 0.1 + flap)
  ctx.quadraticCurveTo(S * 0.7, S * 0.1, S * 0.2, S * 0.1)
  ctx.fillStyle = pri; ctx.fill()
  // 身体
  ctx.beginPath(); ctx.ellipse(0, 0, S * 0.35, S * 0.45, 0, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  // 头
  ctx.beginPath(); ctx.arc(0, -S * 0.5, S * 0.28, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  // 喙
  ctx.beginPath()
  ctx.moveTo(0, -S * 0.45); ctx.lineTo(S * 0.25, -S * 0.35); ctx.lineTo(0, -S * 0.3)
  ctx.fillStyle = '#ddaa22'; ctx.fill()
  // 眼
  if (bossDead.value) drawDeadEyes(ctx, -S * 0.12, -S * 0.55, S * 0.12, -S * 0.55, 2.5)
  else drawEyes(ctx, -S * 0.12, -S * 0.55, S * 0.12, -S * 0.55, 2.5, glow, t, tier)
  // 尾羽
  ctx.beginPath()
  ctx.moveTo(0, S * 0.4); ctx.lineTo(-S * 0.2, S * 0.9); ctx.lineTo(S * 0.2, S * 0.9)
  ctx.closePath(); ctx.fillStyle = pri; ctx.fill()
}

function drawTiger(ctx, S, pri, sec, glow, t, tier) {
  // 身体
  ctx.beginPath(); ctx.ellipse(0, S * 0.05, S * 0.8, S * 0.55, 0, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  // 纹理
  ctx.strokeStyle = '#00000040'; ctx.lineWidth = S * 0.08
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo(i * S * 0.25, -S * 0.3)
    ctx.quadraticCurveTo(i * S * 0.15, S * 0.05, i * S * 0.3, S * 0.35)
    ctx.stroke()
  }
  // 头
  ctx.beginPath(); ctx.arc(0, -S * 0.5, S * 0.45, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  // 王字纹
  ctx.strokeStyle = '#00000050'; ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(-S * 0.15, -S * 0.7); ctx.lineTo(S * 0.15, -S * 0.7)
  ctx.moveTo(-S * 0.12, -S * 0.6); ctx.lineTo(S * 0.12, -S * 0.6)
  ctx.moveTo(0, -S * 0.72); ctx.lineTo(0, -S * 0.58)
  ctx.stroke()
  // 耳
  ctx.beginPath(); ctx.moveTo(-S * 0.3, -S * 0.8); ctx.lineTo(-S * 0.45, -S * 1.1); ctx.lineTo(-S * 0.15, -S * 0.85)
  ctx.fillStyle = sec; ctx.fill()
  ctx.beginPath(); ctx.moveTo(S * 0.3, -S * 0.8); ctx.lineTo(S * 0.45, -S * 1.1); ctx.lineTo(S * 0.15, -S * 0.85)
  ctx.fillStyle = sec; ctx.fill()
  // 眼
  if (bossDead.value) drawDeadEyes(ctx, -S * 0.18, -S * 0.55, S * 0.18, -S * 0.55, 3)
  else drawEyes(ctx, -S * 0.18, -S * 0.55, S * 0.18, -S * 0.55, 3, glow, t, tier)
}

function drawTurtle(ctx, S, pri, sec, glow, t, tier) {
  // 龟壳
  ctx.beginPath(); ctx.ellipse(0, 0, S * 0.85, S * 0.55, 0, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  // 壳纹
  ctx.strokeStyle = sec + '60'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.arc(0, 0, S * 0.55, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(0, 0, S * 0.3, 0, Math.PI * 2); ctx.stroke()
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * S * 0.3, Math.sin(a) * S * 0.3)
    ctx.lineTo(Math.cos(a) * S * 0.85, Math.sin(a) * S * 0.55)
    ctx.stroke()
  }
  // 头
  ctx.beginPath(); ctx.ellipse(-S * 0.75, -S * 0.15, S * 0.22, S * 0.18, -0.2, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  // 四肢
  const legAngle = Math.sin(t * 0.003) * 0.15
  for (const [lx, ly, la] of [[-S * 0.6, S * 0.4, -0.3 + legAngle], [S * 0.6, S * 0.4, 0.3 - legAngle], [-S * 0.55, -S * 0.35, -0.2], [S * 0.55, -S * 0.35, 0.2]]) {
    ctx.beginPath(); ctx.ellipse(lx, ly, S * 0.18, S * 0.12, la, 0, Math.PI * 2)
    ctx.fillStyle = sec; ctx.fill()
  }
  // 眼
  if (bossDead.value) drawDeadEyes(ctx, -S * 0.82, -S * 0.22, -S * 0.62, -S * 0.22, 2)
  else drawEyes(ctx, -S * 0.82, -S * 0.22, -S * 0.62, -S * 0.22, 2, glow, t, tier)
}

function drawWolf(ctx, S, pri, sec, glow, t, tier) {
  // 身体
  ctx.beginPath(); ctx.ellipse(S * 0.1, 0, S * 0.75, S * 0.45, 0, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  // 头
  ctx.beginPath()
  ctx.moveTo(-S * 0.9, -S * 0.1)
  ctx.lineTo(-S * 0.5, -S * 0.7)
  ctx.lineTo(-S * 0.1, -S * 0.15)
  ctx.closePath(); ctx.fillStyle = pri; ctx.fill()
  // 吻部
  ctx.beginPath()
  ctx.moveTo(-S * 0.9, -S * 0.1)
  ctx.lineTo(-S * 1.15, -S * 0.05)
  ctx.lineTo(-S * 0.7, 0)
  ctx.fillStyle = sec; ctx.fill()
  // 耳
  ctx.beginPath(); ctx.moveTo(-S * 0.55, -S * 0.6); ctx.lineTo(-S * 0.5, -S * 1.0); ctx.lineTo(-S * 0.35, -S * 0.6)
  ctx.fillStyle = sec; ctx.fill()
  ctx.beginPath(); ctx.moveTo(-S * 0.35, -S * 0.55); ctx.lineTo(-S * 0.25, -S * 0.9); ctx.lineTo(-S * 0.15, -S * 0.5)
  ctx.fillStyle = sec; ctx.fill()
  // 尾巴
  ctx.beginPath()
  ctx.moveTo(S * 0.75, -S * 0.1)
  ctx.quadraticCurveTo(S * 1.1, -S * 0.5 + Math.sin(t * 0.004) * 8, S * 1.0, -S * 0.7)
  ctx.strokeStyle = pri; ctx.lineWidth = S * 0.15; ctx.lineCap = 'round'; ctx.stroke()
  // 眼
  if (bossDead.value) drawDeadEyes(ctx, -S * 0.65, -S * 0.3, -S * 0.4, -S * 0.35, 2.5)
  else drawEyes(ctx, -S * 0.65, -S * 0.3, -S * 0.4, -S * 0.35, 2.5, glow, t, tier)
}

function drawDragon(ctx, S, pri, sec, glow, t, tier) {
  // 身体
  ctx.beginPath(); ctx.ellipse(0, S * 0.1, S * 0.6, S * 0.5, 0, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  // 鳞片纹理
  ctx.strokeStyle = sec + '40'; ctx.lineWidth = 0.8
  for (let i = -2; i <= 2; i++) {
    for (let j = -1; j <= 1; j++) {
      ctx.beginPath()
      ctx.arc(i * S * 0.2, j * S * 0.2, S * 0.1, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  // 头
  ctx.beginPath()
  ctx.moveTo(-S * 0.1, -S * 0.45)
  ctx.lineTo(-S * 0.45, -S * 0.8)
  ctx.lineTo(0, -S * 1.0)
  ctx.lineTo(S * 0.45, -S * 0.8)
  ctx.lineTo(S * 0.1, -S * 0.45)
  ctx.closePath(); ctx.fillStyle = sec; ctx.fill()
  // 角
  ctx.beginPath(); ctx.moveTo(-S * 0.2, -S * 0.85); ctx.lineTo(-S * 0.35, -S * 1.3); ctx.lineTo(-S * 0.05, -S * 0.9)
  ctx.fillStyle = glow; ctx.fill()
  ctx.beginPath(); ctx.moveTo(S * 0.2, -S * 0.85); ctx.lineTo(S * 0.35, -S * 1.3); ctx.lineTo(S * 0.05, -S * 0.9)
  ctx.fillStyle = glow; ctx.fill()
  // 翅膀
  const wingFlap = Math.sin(t * 0.004) * S * 0.1
  ctx.beginPath()
  ctx.moveTo(-S * 0.4, -S * 0.2)
  ctx.quadraticCurveTo(-S * 1.0, -S * 0.8 + wingFlap, -S * 1.2, -S * 0.1 + wingFlap)
  ctx.quadraticCurveTo(-S * 0.8, S * 0.1, -S * 0.4, S * 0.05)
  ctx.fillStyle = pri + 'cc'; ctx.fill()
  ctx.beginPath()
  ctx.moveTo(S * 0.4, -S * 0.2)
  ctx.quadraticCurveTo(S * 1.0, -S * 0.8 + wingFlap, S * 1.2, -S * 0.1 + wingFlap)
  ctx.quadraticCurveTo(S * 0.8, S * 0.1, S * 0.4, S * 0.05)
  ctx.fillStyle = pri + 'cc'; ctx.fill()
  // 尾
  ctx.beginPath()
  ctx.moveTo(S * 0.5, S * 0.3)
  ctx.quadraticCurveTo(S * 1.0, S * 0.5 + Math.sin(t * 0.003) * 8, S * 1.1, S * 0.1)
  ctx.strokeStyle = pri; ctx.lineWidth = S * 0.2; ctx.lineCap = 'round'; ctx.stroke()
  // 眼
  if (bossDead.value) drawDeadEyes(ctx, -S * 0.18, -S * 0.7, S * 0.18, -S * 0.7, 3)
  else drawEyes(ctx, -S * 0.18, -S * 0.7, S * 0.18, -S * 0.7, 3, glow, t, tier)
}

function drawGolem(ctx, S, pri, sec, glow, t, tier) {
  // 身体（方块）
  ctx.fillStyle = pri
  ctx.fillRect(-S * 0.5, -S * 0.3, S * 1.0, S * 0.9)
  // 头
  ctx.fillRect(-S * 0.3, -S * 0.7, S * 0.6, S * 0.4)
  // 裂纹
  ctx.strokeStyle = sec + '80'; ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(-S * 0.1, -S * 0.7); ctx.lineTo(-S * 0.15, -S * 0.3)
  ctx.moveTo(S * 0.2, -S * 0.6); ctx.lineTo(S * 0.1, -S * 0.3)
  ctx.moveTo(-S * 0.3, 0); ctx.lineTo(S * 0.3, S * 0.1)
  ctx.stroke()
  // 手臂
  ctx.fillStyle = sec
  ctx.fillRect(-S * 0.8, -S * 0.2, S * 0.3, S * 0.6)
  ctx.fillRect(S * 0.5, -S * 0.2, S * 0.3, S * 0.6)
  // 眼
  if (bossDead.value) { ctx.fillStyle = '#333'; ctx.fillRect(-S * 0.18, -S * 0.58, S * 0.12, S * 0.08); ctx.fillRect(S * 0.06, -S * 0.58, S * 0.12, S * 0.08); }
  else {
    ctx.shadowColor = glow; ctx.shadowBlur = 8
    ctx.fillStyle = glow
    ctx.fillRect(-S * 0.18, -S * 0.58, S * 0.12, S * 0.08)
    ctx.fillRect(S * 0.06, -S * 0.58, S * 0.12, S * 0.08)
    ctx.shadowBlur = 0
  }
}

function drawDemon(ctx, S, pri, sec, glow, t, tier) {
  // 身体
  ctx.beginPath(); ctx.ellipse(0, S * 0.1, S * 0.55, S * 0.6, 0, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  // 头
  ctx.beginPath(); ctx.arc(0, -S * 0.5, S * 0.38, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  // 角（大）
  const hornH = S * (0.5 + tier * 0.15)
  ctx.beginPath(); ctx.moveTo(-S * 0.2, -S * 0.75); ctx.lineTo(-S * 0.5, -S * 0.75 - hornH); ctx.lineTo(0, -S * 0.8)
  ctx.fillStyle = glow + 'cc'; ctx.fill()
  ctx.beginPath(); ctx.moveTo(S * 0.2, -S * 0.75); ctx.lineTo(S * 0.5, -S * 0.75 - hornH); ctx.lineTo(0, -S * 0.8)
  ctx.fillStyle = glow + 'cc'; ctx.fill()
  // 翅膀（恶魔翼）
  ctx.beginPath()
  ctx.moveTo(-S * 0.4, -S * 0.2)
  ctx.quadraticCurveTo(-S * 1.0, -S * 0.9, -S * 1.1, -S * 0.1)
  ctx.quadraticCurveTo(-S * 0.8, S * 0.2, -S * 0.4, S * 0.1)
  ctx.fillStyle = sec + 'aa'; ctx.fill()
  ctx.beginPath()
  ctx.moveTo(S * 0.4, -S * 0.2)
  ctx.quadraticCurveTo(S * 1.0, -S * 0.9, S * 1.1, -S * 0.1)
  ctx.quadraticCurveTo(S * 0.8, S * 0.2, S * 0.4, S * 0.1)
  ctx.fillStyle = sec + 'aa'; ctx.fill()
  // 眼
  if (bossDead.value) drawDeadEyes(ctx, -S * 0.15, -S * 0.55, S * 0.15, -S * 0.55, 3)
  else drawEyes(ctx, -S * 0.15, -S * 0.55, S * 0.15, -S * 0.55, 3, glow, t, tier)
}

function drawTree(ctx, S, pri, sec, glow, t, tier) {
  // 树干
  ctx.fillStyle = sec
  ctx.fillRect(-S * 0.15, -S * 0.1, S * 0.3, S * 0.8)
  // 树根
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath()
    ctx.moveTo(i * S * 0.12, S * 0.7)
    ctx.quadraticCurveTo(i * S * 0.3, S * 0.9, i * S * 0.35, S * 0.7)
    ctx.strokeStyle = sec; ctx.lineWidth = S * 0.1; ctx.lineCap = 'round'; ctx.stroke()
  }
  // 树冠
  ctx.beginPath(); ctx.arc(-S * 0.3, -S * 0.4, S * 0.35, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  ctx.beginPath(); ctx.arc(S * 0.3, -S * 0.35, S * 0.3, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  ctx.beginPath(); ctx.arc(0, -S * 0.6, S * 0.4, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  // 树叶飘动
  for (let i = 0; i < 4; i++) {
    const lx = Math.sin(t * 0.002 + i * 2) * S * 0.5
    const ly = S * 0.3 + (t * 0.01 + i * 30) % (S * 0.5)
    ctx.beginPath(); ctx.ellipse(lx, ly, S * 0.06, S * 0.03, i, 0, Math.PI * 2)
    ctx.fillStyle = glow + '60'; ctx.fill()
  }
  // 眼（在树干上）
  if (bossDead.value) drawDeadEyes(ctx, -S * 0.08, S * 0.1, S * 0.08, S * 0.1, 2.5)
  else drawEyes(ctx, -S * 0.08, S * 0.1, S * 0.08, S * 0.1, 2.5, glow, t, tier)
}

function drawScorpion(ctx, S, pri, sec, glow, t, tier) {
  // 身体
  ctx.beginPath(); ctx.ellipse(0, 0, S * 0.5, S * 0.3, 0, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  // 头
  ctx.beginPath(); ctx.ellipse(-S * 0.4, -S * 0.1, S * 0.25, S * 0.2, -0.2, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  // 钳
  ctx.beginPath(); ctx.ellipse(-S * 0.75, -S * 0.3, S * 0.12, S * 0.08, -0.5, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  ctx.beginPath(); ctx.ellipse(-S * 0.65, -S * 0.15, S * 0.12, S * 0.08, 0.3, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  // 尾巴（弯曲上升）
  const tailSway = Math.sin(t * 0.003) * 0.2
  ctx.beginPath()
  ctx.moveTo(S * 0.4, 0)
  ctx.quadraticCurveTo(S * 0.6, -S * 0.5, S * 0.4 + tailSway * S, -S * 0.9)
  ctx.strokeStyle = pri; ctx.lineWidth = S * 0.12; ctx.lineCap = 'round'; ctx.stroke()
  // 毒刺
  ctx.beginPath(); ctx.arc(S * 0.4 + tailSway * S, -S * 0.95, S * 0.06, 0, Math.PI * 2)
  ctx.fillStyle = '#ff2222'; ctx.fill()
  // 腿
  for (let i = 0; i < 4; i++) {
    const lx = -S * 0.15 + i * S * 0.2
    ctx.beginPath()
    ctx.moveTo(lx, S * 0.2)
    ctx.lineTo(lx + S * 0.1, S * 0.5)
    ctx.strokeStyle = sec; ctx.lineWidth = 1.5; ctx.stroke()
  }
  // 眼
  if (bossDead.value) drawDeadEyes(ctx, -S * 0.48, -S * 0.15, -S * 0.32, -S * 0.15, 2)
  else drawEyes(ctx, -S * 0.48, -S * 0.15, -S * 0.32, -S * 0.15, 2, glow, t, tier)
}

function drawKnight(ctx, S, pri, sec, glow, t, tier) {
  // 身体（盔甲）
  ctx.beginPath()
  ctx.moveTo(-S * 0.35, -S * 0.15); ctx.lineTo(-S * 0.4, S * 0.55)
  ctx.lineTo(S * 0.4, S * 0.55); ctx.lineTo(S * 0.35, -S * 0.15)
  ctx.closePath(); ctx.fillStyle = pri; ctx.fill()
  // 头盔
  ctx.beginPath(); ctx.arc(0, -S * 0.45, S * 0.3, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  // 面罩
  ctx.fillStyle = '#000000'
  ctx.fillRect(-S * 0.2, -S * 0.5, S * 0.4, S * 0.08)
  // 护肩
  ctx.beginPath(); ctx.ellipse(-S * 0.4, -S * 0.1, S * 0.18, S * 0.12, 0, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  ctx.beginPath(); ctx.ellipse(S * 0.4, -S * 0.1, S * 0.18, S * 0.12, 0, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  // 盾
  ctx.beginPath(); ctx.ellipse(-S * 0.6, S * 0.1, S * 0.2, S * 0.3, 0, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  ctx.beginPath(); ctx.moveTo(-S * 0.6, -S * 0.15); ctx.lineTo(-S * 0.6, S * 0.35)
  ctx.moveTo(-S * 0.75, S * 0.1); ctx.lineTo(-S * 0.45, S * 0.1)
  ctx.strokeStyle = glow + '60'; ctx.lineWidth = 1.5; ctx.stroke()
  // 剑
  ctx.beginPath()
  ctx.moveTo(S * 0.5, -S * 0.2); ctx.lineTo(S * 0.85, -S * 0.85)
  ctx.strokeStyle = '#aabbcc'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke()
  // 眼（面罩缝隙发光）
  if (!bossDead.value) {
    ctx.shadowColor = glow; ctx.shadowBlur = 6
    ctx.fillStyle = glow
    ctx.fillRect(-S * 0.15, -S * 0.5, S * 0.08, S * 0.06)
    ctx.fillRect(S * 0.07, -S * 0.5, S * 0.08, S * 0.06)
    ctx.shadowBlur = 0
  }
}

function drawAngel(ctx, S, pri, sec, glow, t, tier) {
  // 身体
  ctx.beginPath(); ctx.ellipse(0, S * 0.05, S * 0.4, S * 0.55, 0, 0, Math.PI * 2)
  ctx.fillStyle = pri; ctx.fill()
  // 头
  ctx.beginPath(); ctx.arc(0, -S * 0.5, S * 0.3, 0, Math.PI * 2)
  ctx.fillStyle = sec; ctx.fill()
  // 光环
  ctx.beginPath(); ctx.ellipse(0, -S * 0.7, S * 0.25, S * 0.08, 0, 0, Math.PI * 2)
  ctx.strokeStyle = glow; ctx.lineWidth = 2; ctx.stroke()
  // 翅膀（大，堕落风格）
  const wingFlap = Math.sin(t * 0.003) * S * 0.08
  ctx.beginPath()
  ctx.moveTo(-S * 0.3, -S * 0.2)
  ctx.quadraticCurveTo(-S * 1.0, -S * 0.9 + wingFlap, -S * 1.2, S * 0.1 + wingFlap)
  ctx.quadraticCurveTo(-S * 0.9, S * 0.3, -S * 0.3, S * 0.1)
  ctx.fillStyle = sec + 'bb'; ctx.fill()
  ctx.beginPath()
  ctx.moveTo(S * 0.3, -S * 0.2)
  ctx.quadraticCurveTo(S * 1.0, -S * 0.9 + wingFlap, S * 1.2, S * 0.1 + wingFlap)
  ctx.quadraticCurveTo(S * 0.9, S * 0.3, S * 0.3, S * 0.1)
  ctx.fillStyle = sec + 'bb'; ctx.fill()
  // 眼
  if (bossDead.value) drawDeadEyes(ctx, -S * 0.12, -S * 0.55, S * 0.12, -S * 0.55, 2.5)
  else drawEyes(ctx, -S * 0.12, -S * 0.55, S * 0.12, -S * 0.55, 2.5, glow, t, tier)
}

function drawAbstract(ctx, S, pri, sec, glow, t, tier) {
  // 虚空行者 / 混沌之主 - 不定形体
  const points = 8
  ctx.beginPath()
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2
    const r = S * (0.5 + Math.sin(t * 0.003 + i * 1.5) * 0.15)
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 0.7)
  grd.addColorStop(0, glow + '80')
  grd.addColorStop(0.5, pri)
  grd.addColorStop(1, sec)
  ctx.fillStyle = grd; ctx.fill()
  // 内部漩涡
  ctx.save()
  ctx.rotate(t * 0.001)
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3
    ctx.beginPath()
    ctx.arc(Math.cos(a) * S * 0.2, Math.sin(a) * S * 0.2, S * 0.12, 0, Math.PI * 2)
    ctx.fillStyle = glow + '40'; ctx.fill()
  }
  ctx.restore()
  // 眼（多个）
  if (bossDead.value) {
    drawDeadEyes(ctx, -S * 0.15, -S * 0.1, S * 0.15, -S * 0.1, 3)
  } else {
    drawEyes(ctx, -S * 0.15, -S * 0.1, S * 0.15, -S * 0.1, 3, glow, t, tier)
    // 第三只眼
    ctx.shadowColor = glow; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.arc(0, -S * 0.3, 3, 0, Math.PI * 2)
    ctx.fillStyle = glow; ctx.fill()
    ctx.beginPath(); ctx.arc(0, -S * 0.3, 1.2, 0, Math.PI * 2)
    ctx.fillStyle = '#000'; ctx.fill()
    ctx.shadowBlur = 0
  }
}

// === 动画循环 ===
function startBossAnim() {
  function loop(ts) {
    drawBoss(ts)
    bossAnimFrame = requestAnimationFrame(loop)
  }
  bossAnimFrame = requestAnimationFrame(loop)
}

function stopBossAnim() {
  if (bossAnimFrame) { cancelAnimationFrame(bossAnimFrame); bossAnimFrame = null }
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

// === 战斗 ===
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

  // 滚动到技能栏
  nextTick(() => {
    if (skillBarEl.value) skillBarEl.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

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

  const isCrit = Math.random() < skill.critChance
  let baseDmg = Math.max(1, player.atk - boss.value.def + Math.floor(Math.random() * player.atk * 0.3))
  let dmg = Math.floor(baseDmg * skill.dmgMult)
  if (isCrit) dmg = Math.floor(dmg * 2)

  bossCurrentHp.value = Math.max(0, bossCurrentHp.value - dmg)
  triggerBossHit()

  if (isCrit) addFloatingDamage(`暴击！-${formatNum(dmg)}`, true, skillKey !== 'normal')
  else addFloatingDamage(`-${formatNum(dmg)}`, false, skillKey !== 'normal')

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
        for (const item of data.firstReward.items) rewards.push(`${item.name} ×${item.amount}`)
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
  setTimeout(() => { floatingDamages.value = floatingDamages.value.filter(f => f.id !== id) }, 1200)
}

function triggerBossHit() {
  bossHit.value = true
  setTimeout(() => { bossHit.value = false }, 400)
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

watch(() => battleLog.value.length, () => {
  nextTick(() => { if (battleLogEl.value) battleLogEl.value.scrollTop = battleLogEl.value.scrollHeight })
})

onMounted(() => { loadAbyss(); startBossAnim() })
onUnmounted(() => { stopBossAnim() })
</script>

<style scoped>
.boss-arena {
  position: relative;
  text-align: center;
  padding: 12px;
  background: rgba(0,0,0,0.15);
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;
}
.boss-arena.boss-hit { animation: arena-shake 0.4s ease; }
.boss-arena.boss-dead { filter: grayscale(0.5) brightness(0.7); }
@keyframes arena-shake {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

.boss-canvas { display: block; margin: 0 auto; width: 200px; height: 200px; }

.boss-name { font-size: 16px; font-family: 'ZCOOL XiaoWei', serif; margin: 4px 0; }
.name-normal { color: #e04040; }
.name-fire { color: #ff6622; text-shadow: 0 0 8px rgba(255,100,0,0.3); }
.name-ice { color: #44bbff; text-shadow: 0 0 8px rgba(68,187,255,0.3); }
.name-thunder { color: #ffdd22; text-shadow: 0 0 8px rgba(255,221,34,0.3); }
.name-poison { color: #66dd22; text-shadow: 0 0 8px rgba(102,221,34,0.3); }
.name-dark { color: #bb66ff; text-shadow: 0 0 8px rgba(187,102,255,0.3); }

.boss-tags { display: flex; justify-content: center; gap: 6px; margin-bottom: 6px; }
.boss-tag { font-size: 10px; color: #4080c0; background: rgba(64,128,196,0.15); padding: 2px 8px; border-radius: 4px; }
.tag-danger { color: #e04040; background: rgba(224,64,64,0.15); }

.float-damage-area { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.float-damage {
  position: absolute; font-size: 16px; font-weight: bold; color: #ff4444;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  animation: float-up 1.2s ease-out forwards; pointer-events: none; white-space: nowrap;
}
.dmg-crit { font-size: 22px; color: #ffcc00; text-shadow: 0 0 8px rgba(255,200,0,0.6), 2px 2px 4px rgba(0,0,0,0.8); }
.dmg-skill { font-size: 18px; color: #88ccff; text-shadow: 0 0 6px rgba(100,180,255,0.5); }
@keyframes float-up {
  0% { transform: translateY(0) scale(0.5); opacity: 0; }
  15% { transform: translateY(calc(var(--float-y) * 0.3)) scale(1.2); opacity: 1; }
  100% { transform: translateY(calc(var(--float-y) * 1.5)) scale(0.8); opacity: 0; }
}

.hp-bar { margin: 6px 0; }
.hp-bar-inner { height: 10px; background: rgba(255,255,255,0.06); border-radius: 5px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
.hp-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; position: relative; }
.boss-hp-fill { background: linear-gradient(90deg, #c03030, #e04040); }
.fill-fire { background: linear-gradient(90deg, #cc3300, #ff6622) !important; }
.fill-ice { background: linear-gradient(90deg, #2266cc, #44bbff) !important; }
.fill-thunder { background: linear-gradient(90deg, #cc9900, #ffdd22) !important; }
.fill-poison { background: linear-gradient(90deg, #338800, #66dd22) !important; }
.fill-dark { background: linear-gradient(90deg, #6600aa, #bb66ff) !important; }
.fill-normal { background: linear-gradient(90deg, #c03030, #e04040) !important; }
.player-hp-fill { background: linear-gradient(90deg, #30a030, #44cc44); }

.hp-shine { position: absolute; top: 0; left: -50%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); animation: hp-shine-anim 2s infinite; }
@keyframes hp-shine-anim { from { left: -50%; } to { left: 150%; } }
.hp-text { font-size: 11px; color: #aaa; text-align: center; margin-top: 2px; }

.mp-bar-inner { height: 6px; background: rgba(255,255,255,0.04); border-radius: 3px; overflow: hidden; }
.mp-fill { height: 100%; background: linear-gradient(90deg, #3060a0, #4488cc); border-radius: 3px; transition: width 0.4s ease; }
.mp-text { font-size: 10px; color: #4080c0; text-align: right; display: block; margin-top: 2px; }

.battle-section { margin-top: 10px; }
.player-battle-info { background: rgba(0,128,0,0.05); border: 1px solid rgba(0,128,0,0.15); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
.player-name-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.player-battle-name { font-size: 13px; color: #d4a853; font-weight: bold; }
.player-hp-num { font-size: 11px; color: #40c060; }
.turn-badge { text-align: center; font-size: 11px; color: #888; margin-bottom: 6px; letter-spacing: 1px; }

.battle-log { max-height: 150px; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 6px; padding: 8px; margin-bottom: 10px; }
.log-entry { font-size: 12px; padding: 3px 6px; border-radius: 3px; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; animation: log-slide-in 0.3s ease; }
@keyframes log-slide-in { from { transform: translateX(-10px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
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

.skill-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.skill-btn { display: flex; flex-direction: column; align-items: center; padding: 8px 4px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; background: rgba(255,255,255,0.04); cursor: pointer; transition: all 0.2s; }
.skill-btn:hover:not(:disabled) { transform: translateY(-2px); border-color: rgba(255,255,255,0.2); }
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

.abyss-actions { margin-top: 10px; }
.btn-fight { background: linear-gradient(135deg, #c44040, #d4a853); color: #fff; font-size: 14px; padding: 12px; letter-spacing: 2px; border: none; border-radius: 8px; cursor: pointer; transition: all 0.3s; }
.btn-fight:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(196,64,64,0.4); }

/* 结算悬浮层 */
.settle-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.75);
  z-index: 200;
  display: flex; justify-content: center; align-items: center;
  backdrop-filter: blur(4px);
}
.settle-box {
  width: 85%; max-width: 320px;
  text-align: center; padding: 20px;
  border-radius: 12px;
  animation: settle-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.settle-win { background: linear-gradient(135deg, rgba(212,168,83,0.2), rgba(64,192,96,0.15)); border: 1px solid rgba(212,168,83,0.35); }
.settle-lose { background: linear-gradient(135deg, rgba(224,64,64,0.15), rgba(100,100,100,0.1)); border: 1px solid rgba(224,64,64,0.25); }
.settle-icon { font-size: 36px; margin-bottom: 6px; }
.settle-title { font-size: 16px; color: #d4a853; font-weight: bold; }
.settle-detail { font-size: 12px; color: #aaa; margin-top: 4px; }
.settle-rewards { margin-top: 10px; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
.reward-item { font-size: 12px; color: #d4a853; background: rgba(212,168,83,0.1); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(212,168,83,0.2); }
.btn-settle-next, .btn-settle-retry { margin-top: 14px; padding: 10px 28px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; }
.btn-settle-next { background: linear-gradient(135deg, #d4a853, #c49040); color: #fff; }
.btn-settle-next:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(212,168,83,0.4); }
.btn-settle-retry { background: rgba(255,255,255,0.08); color: #ddd; border: 1px solid rgba(255,255,255,0.15); }
.btn-settle-retry:hover { background: rgba(255,255,255,0.12); }
@keyframes settle-pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
.settle-fade-enter-active { transition: opacity 0.3s; }
.settle-fade-leave-active { transition: opacity 0.2s; }
.settle-fade-enter-from, .settle-fade-leave-to { opacity: 0; }

.daily-section { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: rgba(212,168,83,0.05); border: 1px solid rgba(212,168,83,0.2); border-radius: 6px; margin-top: 12px; }
.daily-info { display: flex; flex-direction: column; gap: 2px; }
.daily-amount { font-size: 12px; color: #d4a853; }
.btn-disabled { opacity: 0.4; cursor: not-allowed; }
</style>
