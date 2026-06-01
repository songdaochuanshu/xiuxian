<template>
  <div class="pixel-scene">
    <!-- 背景装饰 -->
    <div class="scene-bg">
      <div class="cloud c1">☁️</div>
      <div class="cloud c2">☁️</div>
      <div class="ground"></div>
    </div>

    <!-- 像素小人 -->
    <div class="character" :class="animState">
      <!-- 头部 -->
      <div class="head">
        <div class="hair"></div>
        <div class="face">
          <div class="eye left"></div>
          <div class="eye right"></div>
          <div class="mouth"></div>
        </div>
      </div>
      <!-- 身体 -->
      <div class="body">
        <div class="arm left"></div>
        <div class="arm right"></div>
        <div class="torso"></div>
      </div>
      <!-- 腿 -->
      <div class="legs">
        <div class="leg left"></div>
        <div class="leg right"></div>
      </div>
      <!-- 特效 -->
      <div v-if="showAura" class="aura"></div>
      <div v-if="showBreakthrough" class="breakthrough-particles">
        <div v-for="i in 8" :key="i" class="particle" :style="particleStyle(i)"></div>
      </div>
    </div>

    <!-- 状态文字 -->
    <div class="status-text" :class="animState">{{ statusLabel }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { useGameStore } from '../stores/game.js'
import { useBattleStore } from '../stores/battle.js'

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

const showAura = computed(() =>
  game.cultivating || game.showBreakthrough
)

const showBreakthrough = computed(() =>
  game.showBreakthrough
)

const statusLabel = computed(() => {
  switch (animState.value) {
    case 'dead': return '💀 陨落'
    case 'breakthrough': return '⚡ 突破！'
    case 'battle': return '⚔️ 战斗中'
    case 'cultivate': return '🧘 修炼中'
    default: return '🌿 闲逛'
  }
})

function particleStyle(i) {
  const angle = (i - 1) * 45
  return {
    '--angle': `${angle}deg`,
    animationDelay: `${i * 0.1}s`,
  }
}
</script>

<style scoped>
.pixel-scene {
  position: relative;
  width: 100%;
  height: 200px;
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

/* 像素小人 */
.character {
  position: relative;
  width: 48px;
  height: 72px;
  z-index: 10;
  margin-bottom: 30px;
  transition: transform 0.3s;
}

/* 头部 */
.head {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
}

.hair {
  position: absolute;
  top: -4px;
  left: -2px;
  width: 28px;
  height: 12px;
  background: #2a1a0a;
  border-radius: 4px 4px 0 0;
  image-rendering: pixelated;
}

.face {
  position: absolute;
  top: 6px;
  left: 2px;
  width: 20px;
  height: 18px;
  background: #f5d0a9;
  border-radius: 2px;
}

.eye {
  position: absolute;
  top: 5px;
  width: 4px;
  height: 4px;
  background: #1a1a2e;
  border-radius: 50%;
}
.eye.left { left: 3px; }
.eye.right { right: 3px; }

.mouth {
  position: absolute;
  bottom: 3px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 2px;
  background: #c08060;
  border-radius: 0 0 2px 2px;
}

/* 身体 */
.body {
  position: absolute;
  top: 26px;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 24px;
}

.torso {
  position: absolute;
  left: 4px;
  width: 20px;
  height: 24px;
  background: linear-gradient(180deg, #4a6fa5, #3a5a8a);
  border-radius: 2px;
  border: 1px solid #5a7fb5;
}

.arm {
  position: absolute;
  top: 2px;
  width: 6px;
  height: 20px;
  background: #f5d0a9;
  border-radius: 2px;
  transform-origin: top center;
}
.arm.left { left: -4px; }
.arm.right { right: -4px; }

/* 腿 */
.legs {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 20px;
}

.leg {
  position: absolute;
  bottom: 0;
  width: 8px;
  height: 20px;
  background: #3a3a5a;
  border-radius: 0 0 3px 3px;
}
.leg.left { left: 2px; }
.leg.right { right: 2px; }

/* 光环 */
.aura {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 90px;
  border-radius: 50%;
  border: 2px solid rgba(212, 168, 83, 0.3);
  animation: auraPulse 2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes auraPulse {
  0%, 100% { opacity: 0.3; transform: translateX(-50%) scale(1); }
  50% { opacity: 0.6; transform: translateX(-50%) scale(1.1); }
}

/* 突破粒子 */
.breakthrough-particles {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
}
.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #e0a0ff;
  border-radius: 50%;
  animation: particleFly 1s ease-out infinite;
  transform: rotate(var(--angle)) translateY(-20px);
}
@keyframes particleFly {
  0% { opacity: 1; transform: rotate(var(--angle)) translateY(-20px); }
  100% { opacity: 0; transform: rotate(var(--angle)) translateY(-60px); }
}

/* ========== 动画状态 ========== */

/* 待机 */
.character.idle {
  animation: idleBounce 3s ease-in-out infinite;
}
@keyframes idleBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.character.idle .arm.left {
  animation: idleArmL 3s ease-in-out infinite;
}
.character.idle .arm.right {
  animation: idleArmR 3s ease-in-out infinite 0.5s;
}
@keyframes idleArmL {
  0%, 100% { transform: rotate(5deg); }
  50% { transform: rotate(-5deg); }
}
@keyframes idleArmR {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

/* 修炼 */
.character.cultivate {
  animation: cultivateFloat 2s ease-in-out infinite;
}
@keyframes cultivateFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

.character.cultivate .arm.left {
  animation: cultivateArmL 2s ease-in-out infinite;
}
.character.cultivate .arm.right {
  animation: cultivateArmR 2s ease-in-out infinite;
}
@keyframes cultivateArmL {
  0%, 100% { transform: rotate(30deg); }
  50% { transform: rotate(40deg); }
}
@keyframes cultivateArmR {
  0%, 100% { transform: rotate(-30deg); }
  50% { transform: rotate(-40deg); }
}

.character.cultivate .eye {
  height: 1px !important;
  top: 7px;
}

/* 战斗 */
.character.battle {
  animation: battleShake 0.3s linear infinite;
}
@keyframes battleShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

.character.battle .arm.left {
  animation: battlePunchL 0.6s ease-in-out infinite;
}
.character.battle .arm.right {
  animation: battlePunchR 0.6s ease-in-out infinite 0.3s;
}
@keyframes battlePunchL {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-60deg) translateY(-10px); }
}
@keyframes battlePunchR {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(60deg) translateY(-10px); }
}

.character.battle .mouth {
  width: 8px;
  height: 4px;
  background: #1a1a2e;
  border-radius: 50%;
}

/* 突破 */
.character.breakthrough {
  animation: breakthroughRise 1.5s ease-out;
}
@keyframes breakthroughRise {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-40px) scale(1.2); }
  100% { transform: translateY(0) scale(1); }
}

.character.breakthrough .hair {
  animation: breakthroughHair 1.5s ease-out;
}
@keyframes breakthroughHair {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.character.breakthrough .torso {
  background: linear-gradient(180deg, #8a6fa5, #6a4a8a);
  border-color: #e0a0ff;
  box-shadow: 0 0 10px rgba(224, 160, 255, 0.5);
}

/* 死亡 */
.character.dead {
  transform: rotate(90deg);
  opacity: 0.5;
  animation: none;
}

.character.dead .eye {
  width: 6px;
  height: 1px;
  top: 6px;
  background: #1a1a2e;
}
.character.dead .eye.left { transform: rotate(45deg); }
.character.dead .eye.right { transform: rotate(-45deg); }

.character.dead .mouth {
  width: 8px;
  height: 2px;
  background: transparent;
  border-top: 2px solid #1a1a2e;
  border-radius: 0;
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
}
.status-text.cultivate { color: var(--mp); }
.status-text.battle { color: var(--danger); }
.status-text.breakthrough { color: #e0a0ff; }
.status-text.dead { color: var(--text-dim); }
</style>
