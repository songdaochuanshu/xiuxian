<template>
  <!-- 屏幕震动 -->
  <div class="effects-root" :class="{ 'screen-shake': fx.screenShake }">
    <!-- 屏幕闪光 -->
    <transition name="flash-fade">
      <div v-if="fx.screenFlash" class="screen-flash" :style="{ background: fx.screenFlash }"></div>
    </transition>

    <!-- 飘字层 -->
    <div class="float-layer">
      <transition-group name="float-up">
        <div v-for="f in fx.floats" :key="f.id" class="float-text"
          :style="{
            left: f.x + 'px',
            top: f.y + 'px',
            color: f.color,
            fontSize: f.size + 'px',
            fontWeight: f.bold ? 'bold' : 'normal',
            textShadow: f.glow ? `0 0 10px ${f.glow}` : 'none',
            '--float-duration': (f.duration || 1500) + 'ms',
          }">
          {{ f.text }}
        </div>
      </transition-group>
    </div>

    <!-- 横幅通知 -->
    <div class="banner-stack">
      <transition-group name="banner-slide">
        <div v-for="b in fx.banners" :key="b.id" class="banner-notice" :class="'banner-' + b.type">
          <div class="banner-bar"></div>
          <div class="banner-content">
            <div class="banner-title">{{ b.text }}</div>
            <div v-if="b.sub" class="banner-sub">{{ b.sub }}</div>
          </div>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { useEffectsStore } from '../stores/effects.ts'
const fx = useEffectsStore()
</script>

<style scoped>
.effects-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 300;
  overflow: hidden;
}
.effects-root.screen-shake {
  animation: shake-anim 0.4s ease;
}
@keyframes shake-anim {
  0%, 100% { transform: translate(0, 0); }
  15% { transform: translate(-4px, 2px); }
  30% { transform: translate(4px, -2px); }
  45% { transform: translate(-3px, 3px); }
  60% { transform: translate(3px, -1px); }
  75% { transform: translate(-2px, 1px); }
}

/* 屏幕闪光 */
.screen-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.flash-fade-enter-active { transition: opacity 0.1s; }
.flash-fade-leave-active { transition: opacity 0.4s; }
.flash-fade-enter-from { opacity: 0; }
.flash-fade-leave-to { opacity: 0; }

/* 飘字 */
.float-layer {
  position: absolute;
  inset: 0;
}
.float-text {
  position: absolute;
  pointer-events: none;
  white-space: nowrap;
  animation: float-rise var(--float-duration, 1500ms) ease-out forwards;
  z-index: 10;
}
@keyframes float-rise {
  0% { transform: translateY(0) scale(0.6); opacity: 0; }
  10% { transform: translateY(-5px) scale(1.1); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translateY(-60px) scale(0.9); opacity: 0; }
}
.float-up-enter-active { transition: all 0.15s; }
.float-up-leave-active { transition: all 0.3s; }
.float-up-enter-from { opacity: 0; transform: translateY(10px) scale(0.5); }
.float-up-leave-to { opacity: 0; }

/* 横幅通知 */
.banner-stack {
  position: absolute;
  top: 16px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 280px;
}
.banner-notice {
  display: flex;
  background: rgba(15, 15, 22, 0.92);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
}
.banner-bar {
  width: 4px;
  flex-shrink: 0;
}
.banner-success .banner-bar { background: linear-gradient(180deg, #d4a853, #f0d080); }
.banner-fail .banner-bar { background: linear-gradient(180deg, #cc3333, #ff6644); }
.banner-info .banner-bar { background: linear-gradient(180deg, #4488cc, #66bbff); }
.banner-task .banner-bar { background: linear-gradient(180deg, #aa66cc, #dd88ff); }

.banner-content {
  padding: 10px 14px;
}
.banner-title {
  font-size: 14px;
  font-weight: bold;
  color: #eee;
  letter-spacing: 1px;
}
.banner-success .banner-title { color: #ffd866; }
.banner-fail .banner-title { color: #ff6666; }
.banner-task .banner-title { color: #cc99ff; }
.banner-sub {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.banner-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.banner-slide-leave-active {
  transition: all 0.3s ease;
}
.banner-slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.banner-slide-leave-to {
  transform: translateX(50%);
  opacity: 0;
}
</style>
