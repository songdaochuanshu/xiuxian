<template>
  <div v-if="announcement" class="announcement" @click="expanded = !expanded">
    <div class="announce-icon">📢</div>
    <div class="announce-text" :class="{ expanded }">{{ announcement }}</div>
    <div class="announce-toggle">{{ expanded ? '收起' : '展开' }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const announcement = ref('')
const expanded = ref(false)

const API_URL = import.meta.env.VITE_API_URL || 'https://xiuxianv-api.songdaochuanshu.workers.dev'

onMounted(async () => {
  try {
    const res = await fetch(`${API_URL}/announcement`)
    const data = await res.json()
    if (data.text) {
      announcement.value = data.text
    }
  } catch (e) {
    // 静默失败
  }
})
</script>

<style scoped>
.announcement {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(212, 168, 83, 0.08);
  border: 1px solid rgba(212, 168, 83, 0.2);
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
}
.announce-icon { font-size: 16px; flex-shrink: 0; }
.announce-text {
  flex: 1;
  font-size: 12px;
  color: var(--text);
  line-height: 1.6;
  max-height: 20px;
  overflow: hidden;
  transition: max-height 0.3s;
}
.announce-text.expanded { max-height: 200px; }
.announce-toggle {
  font-size: 11px;
  color: var(--gold);
  flex-shrink: 0;
}
</style>
