<template>
  <Teleport to="body">
    <div v-if="game.showBreakthrough" class="breakthrough-overlay">
      <div class="breakthrough-text">{{ game.breakthroughInfo?.realmName }}</div>
      <div class="breakthrough-sub">寿元+{{ game.breakthroughInfo?.lifespanGain }} · 灵力大增</div>
    </div>
  </Teleport>
</template>

<script setup>
import { useGameStore } from '../stores/game.ts'
const game = useGameStore()
</script>
