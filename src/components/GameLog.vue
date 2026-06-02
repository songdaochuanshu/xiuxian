<template>
  <div class="panel">
    <div class="panel-header">
      <span>修仙录</span>
      <span style="font-size:11px;cursor:pointer" @click="game.clearLog()">清空</span>
    </div>
    <div class="panel-body">
      <div class="log-area">
        <div v-for="log in game.logs" :key="log.id" class="log-entry">
          <span class="log-time">{{ log.time }}</span>
          <span :class="'log-' + log.type">{{ log.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGameStore } from '../stores/game.ts'
const game = useGameStore()
</script>
