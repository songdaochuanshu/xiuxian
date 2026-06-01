<template>
  <div class="panel">
    <div class="panel-header">
      <span>修仙者</span>
      <span>年龄: {{ player.age }} / {{ player.lifespan }}</span>
    </div>
    <div class="panel-body">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:16px;color:var(--gold);font-weight:bold">{{ player.name }}</span>
        <span style="color:var(--success);font-size:14px">{{ player.realmName }}</span>
      </div>

      <div class="bar-row">
        <span class="bar-label">气血</span>
        <div class="bar-container bar-hp">
          <div class="bar-fill" :style="{ width: player.hpPercent + '%' }"></div>
          <span class="bar-text">{{ player.hp }}/{{ player.maxHp }}</span>
        </div>
      </div>
      <div class="bar-row">
        <span class="bar-label">灵力</span>
        <div class="bar-container bar-mp">
          <div class="bar-fill" :style="{ width: player.mpPercent + '%' }"></div>
          <span class="bar-text">{{ player.mp }}/{{ player.maxMp }}</span>
        </div>
      </div>
      <div class="bar-row">
        <span class="bar-label">修为</span>
        <div class="bar-container bar-exp">
          <div class="bar-fill" :style="{ width: player.expPercent + '%' }"></div>
          <span class="bar-text">{{ player.exp }}/{{ player.maxExp }}</span>
        </div>
      </div>

      <div style="font-size:11px;color:var(--text-dim);text-align:center;margin-top:4px">
        修炼速度: {{ player.cultivateSpeed }} 灵气/秒 · 攻击: {{ player.atk }} · 防御: {{ player.def }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePlayerStore } from '../stores/player.js'
const player = usePlayerStore()
</script>
