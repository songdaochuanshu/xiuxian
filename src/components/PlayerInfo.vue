<template>
  <div class="panel">
    <div class="panel-header">
      <span>修仙者</span>
      <span>{{ player.age }} / {{ player.lifespan }} 岁</span>
    </div>
    <div class="panel-body">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div>
          <span style="font-family:'Ma Shan Zheng',cursive;font-size:20px;color:var(--gold);letter-spacing:4px">{{ player.name }}</span>
          <span v-if="player.uid" style="font-size:10px;color:var(--text-dim);margin-left:8px">{{ player.uid }}</span>
        </div>
        <span style="color:var(--success);font-size:14px;font-family:'ZCOOL XiaoWei',serif;letter-spacing:2px">{{ player.realmName }}</span>
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

      <div style="font-size:11px;color:var(--text-dim);text-align:center;margin-top:8px;font-family:'ZCOOL XiaoWei',serif;letter-spacing:1px">
        速 {{ player.cultivateSpeed }} · 攻 {{ player.atk }} · 防 {{ player.def }} · 灵石 💎 {{ player.spiritStones }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePlayerStore } from '../stores/player.ts'
const player = usePlayerStore()
</script>
