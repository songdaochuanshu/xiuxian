<template>
  <div class="char-scene">
    <!-- 背景装饰 -->
    <div class="scene-bg">
      <div class="cloud c1">云</div>
      <div class="cloud c2">云</div>
    </div>

    <!-- 角色图片 -->
    <div class="char-wrapper" :class="animState">
      <img :src="charSrc" :alt="statusLabel" class="char-img" />
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

const charSrc = computed(() => {
  const map = {
    idle: '/characters/idle.png',
    cultivate: '/characters/cultivate.png',
    battle: '/characters/battle.png',
    breakthrough: '/characters/breakthrough.png',
    dead: '/characters/dead.png',
  }
  return map[animState.value] || map.idle
})

const statusLabel = computed(() => {
  switch (animState.value) {
    case 'dead': return '陨落'
    case 'breakthrough': return '突破！'
    case 'battle': return '战斗中'
    case 'cultivate': return '修炼中'
    default: return '闲逛'
  }
})
</script>

<style scoped>
.char-scene {
  position: relative;
  width: 100%;
  height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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
  opacity: 0.2;
  animation: cloudFloat 20s linear infinite;
}
.c1 { top: 10px; left: -30px; animation-duration: 25s; }
.c2 { top: 30px; left: 50%; animation-duration: 30s; animation-delay: -10s; }
@keyframes cloudFloat {
  from { transform: translateX(-30px); }
  to { transform: translateX(350px); }
}

/* 角色容器 */
.char-wrapper {
  z-index: 10;
  max-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.char-img {
  max-height: 180px;
  max-width: 90%;
  object-fit: contain;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
  transition: transform 0.3s;
}

/* ========== 动画状态 ========== */

/* 待机 */
.char-wrapper.idle .char-img {
  animation: idleFloat 3s ease-in-out infinite;
}
@keyframes idleFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* 修炼 */
.char-wrapper.cultivate .char-img {
  animation: cultivateGlow 2s ease-in-out infinite;
}
@keyframes cultivateGlow {
  0%, 100% { transform: translateY(0) scale(1); filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5)); }
  50% { transform: translateY(-10px) scale(1.03); filter: drop-shadow(0 4px 20px rgba(212,168,83,0.5)); }
}

/* 战斗 */
.char-wrapper.battle .char-img {
  animation: battleShake 0.3s linear infinite;
}
@keyframes battleShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

/* 突破 */
.char-wrapper.breakthrough .char-img {
  animation: breakthroughRise 1.5s ease-out;
}
@keyframes breakthroughRise {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-30px) scale(1.1); filter: drop-shadow(0 0 30px rgba(212,168,83,0.8)); }
  100% { transform: translateY(0) scale(1); }
}

/* 死亡 */
.char-wrapper.dead .char-img {
  opacity: 0.5;
  transform: rotate(90deg) translateY(20px);
  animation: none;
}

/* 状态文字 */
.status-text {
  position: absolute;
  bottom: 4px;
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 2px;
  z-index: 20;
  font-family: 'ZCOOL XiaoWei', serif;
  transition: color 0.3s;
}
.status-text.cultivate { color: var(--mp); }
.status-text.battle { color: var(--danger); }
.status-text.breakthrough { color: #e0a0ff; text-shadow: 0 0 6px rgba(224,160,255,0.3); }
.status-text.dead { color: var(--text-dim); }
</style>
