<template>
  <div class="stick-scene">
    <!-- 背景 -->
    <div class="scene-bg">
      <div class="cloud c1">☁️</div>
      <div class="cloud c2">☁️</div>
      <div class="ground"></div>
    </div>

    <!-- SVG 火柴人 -->
    <svg class="stick-man" :class="animState" viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg">
      <!-- 光环 -->
      <circle v-if="showAura" cx="50" cy="28" r="26" class="aura" />

      <!-- 头 -->
      <circle cx="50" cy="28" r="12" class="head" />

      <!-- 表情 -->
      <template v-if="animState === 'dead'">
        <line x1="45" y1="24" x2="49" y2="28" class="eye-line" />
        <line x1="49" y1="24" x2="45" y2="28" class="eye-line" />
        <line x1="51" y1="24" x2="55" y2="28" class="eye-line" />
        <line x1="55" y1="24" x2="51" y2="28" class="eye-line" />
        <path d="M44 34 Q50 30 56 34" class="mouth-sad" />
      </template>
      <template v-else-if="animState === 'battle'">
        <circle cx="46" cy="26" r="1.5" class="eye-dot" />
        <circle cx="54" cy="26" r="1.5" class="eye-dot" />
        <path d="M44 33 Q50 37 56 33" class="mouth-battle" />
      </template>
      <template v-else>
        <circle cx="46" cy="26" r="1.5" class="eye-dot" />
        <circle cx="54" cy="26" r="1.5" class="eye-dot" />
        <path d="M46 32 Q50 35 54 32" class="mouth" />
      </template>

      <!-- 身体 -->
      <line x1="50" y1="40" x2="50" y2="85" class="body-line" />

      <!-- 左臂 -->
      <line x1="50" y1="52" :x2="leftArmX" :y2="leftArmY" class="limb" />
      <!-- 右臂 -->
      <line x1="50" y1="52" :x2="rightArmX" :y2="rightArmY" class="limb" />

      <!-- 左腿 -->
      <line x1="50" y1="85" x2="35" y2="130" class="limb" />
      <!-- 右腿 -->
      <line x1="50" y1="85" x2="65" y2="130" class="limb" />

      <!-- 脚 -->
      <line x1="35" y1="130" x2="28" y2="135" class="limb" />
      <line x1="65" y1="130" x2="72" y2="135" class="limb" />

      <!-- 武器（战斗时） -->
      <line v-if="animState === 'battle'" x1="70" y1="35" x2="90" y2="15" class="weapon" />
    </svg>

    <!-- 特效层 -->
    <div v-if="showBreakthrough" class="particles">
      <div v-for="i in 8" :key="i" class="particle" :style="particleStyle(i)">✦</div>
    </div>

    <!-- 状态文字 -->
    <div class="status-text" :class="animState">{{ statusLabel }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player.ts'
import { useGameStore } from '../stores/game.ts'
import { useBattleStore } from '../stores/battle.ts'

const player = usePlayerStore()
const game = useGameStore()
const battle = useBattleStore()

const animState = computed(() => {
  if (player.isDead) return 'dead'
  if (game.showBreakthrough) return 'breakthrough'
  if (battle.active) return 'battle'
  if (game.cultivating) return 'cultivate'
  return 'idle'
})

const showAura = computed(() => game.cultivating || game.showBreakthrough)
const showBreakthrough = computed(() => game.showBreakthrough)

const statusLabel = computed(() => {
  switch (animState.value) {
    case 'dead': return '💀 陨落'
    case 'breakthrough': return '⚡ 突破！'
    case 'battle': return '⚔️ 战斗中'
    case 'cultivate': return '🧘 修炼中'
    default: return '🌿 闲逛'
  }
})

// 手臂动画坐标
const leftArmX = computed(() => animState.value === 'cultivate' ? 30 : 32)
const leftArmY = computed(() => animState.value === 'cultivate' ? 42 : 70)
const rightArmX = computed(() => animState.value === 'cultivate' ? 70 : 68)
const rightArmY = computed(() => animState.value === 'cultivate' ? 42 : 70)

function particleStyle(i) {
  const angle = (i - 1) * 45
  return { '--angle': `${angle}deg`, animationDelay: `${i * 0.1}s` }
}
</script>

<style scoped>
.stick-scene {
  position: relative;
  width: 100%;
  height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  overflow: hidden;
  margin: 8px 0;
}

/* 背景 */
.scene-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.cloud {
  position: absolute;
  font-size: 16px;
  opacity: 0.3;
  animation: cloudFloat 20s linear infinite;
}
.c1 { top: 15px; left: -30px; animation-duration: 25s; }
.c2 { top: 35px; left: 50%; animation-duration: 30s; animation-delay: -10s; }
@keyframes cloudFloat {
  from { transform: translateX(-30px); }
  to { transform: translateX(350px); }
}
.ground {
  position: absolute;
  bottom: 0;
  left: 0; right: 0;
  height: 30px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%);
  border-top: 2px solid #2a2a3a;
}

/* SVG 火柴人 */
.stick-man {
  width: 80px;
  height: 130px;
  z-index: 10;
  margin-bottom: 28px;
}

.head {
  fill: var(--panel);
  stroke: var(--gold);
  stroke-width: 2;
}
.eye-dot { fill: var(--text); }
.eye-line { stroke: var(--danger); stroke-width: 2; stroke-linecap: round; }
.mouth { fill: none; stroke: var(--text-dim); stroke-width: 1.5; stroke-linecap: round; }
.mouth-sad { fill: none; stroke: var(--text-dim); stroke-width: 1.5; stroke-linecap: round; }
.mouth-battle { fill: none; stroke: var(--danger); stroke-width: 1.5; stroke-linecap: round; }

.body-line { stroke: var(--gold); stroke-width: 2.5; stroke-linecap: round; }
.limb { stroke: var(--gold); stroke-width: 2; stroke-linecap: round; }
.weapon { stroke: #ff6b6b; stroke-width: 2.5; stroke-linecap: round; }

.aura {
  fill: none;
  stroke: var(--gold);
  stroke-width: 1.5;
  opacity: 0.4;
  animation: auraPulse 2s ease-in-out infinite;
}
@keyframes auraPulse {
  0%, 100% { opacity: 0.2; r: 26; }
  50% { opacity: 0.5; r: 30; }
}

/* ========== 动画状态 ========== */

/* 待机 */
.stick-man.idle {
  animation: idleBounce 3s ease-in-out infinite;
}
@keyframes idleBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* 修炼 */
.stick-man.cultivate {
  animation: cultivateFloat 2s ease-in-out infinite;
}
@keyframes cultivateFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-16px); }
}

/* 战斗 */
.stick-man.battle {
  animation: battleShake 0.3s linear infinite;
}
@keyframes battleShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

/* 突破 */
.stick-man.breakthrough {
  animation: breakthroughRise 1.5s ease-out;
}
@keyframes breakthroughRise {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-40px) scale(1.15); }
  100% { transform: translateY(0) scale(1); }
}

/* 死亡 */
.stick-man.dead {
  transform: rotate(90deg) translateX(20px);
  opacity: 0.4;
  animation: none;
}

/* 粒子 */
.particles {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 15;
}
.particle {
  position: absolute;
  font-size: 12px;
  color: #e0a0ff;
  animation: particleFly 1s ease-out infinite;
  transform: rotate(var(--angle)) translateY(-24px);
}
@keyframes particleFly {
  0% { opacity: 1; transform: rotate(var(--angle)) translateY(-24px); }
  100% { opacity: 0; transform: rotate(var(--angle)) translateY(-60px); }
}

/* 状态文字 */
.status-text {
  position: absolute;
  bottom: 4px;
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 2px;
  z-index: 20;
  transition: color 0.3s;
  font-family: 'ZCOOL XiaoWei', serif;
}
.status-text.cultivate { color: var(--mp); }
.status-text.battle { color: var(--danger); }
.status-text.breakthrough { color: #e0a0ff; }
.status-text.dead { color: var(--text-dim); }
</style>
