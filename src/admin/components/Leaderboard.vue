<template>
  <div>
    <div class="header">
      <h1>🏆 排行榜管理</h1>
      <button class="btn" @click="load">刷新</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>排名</th>
            <th>名字</th>
            <th>境界</th>
            <th>战力</th>
            <th>年龄</th>
            <th>灵石</th>
            <th>更新时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" style="text-align:center">加载中...</td>
          </tr>
          <tr v-else-if="!entries.length">
            <td colspan="7" style="text-align:center">暂无数据</td>
          </tr>
          <tr v-for="(entry, i) in entries" :key="entry.name + entry.updated_at">
            <td>
              <span v-if="i === 0">🥇</span>
              <span v-else-if="i === 1">🥈</span>
              <span v-else-if="i === 2">🥉</span>
              <span v-else>{{ i + 1 }}</span>
            </td>
            <td>{{ entry.name }}</td>
            <td>{{ entry.realm }}</td>
            <td>{{ entry.score }}</td>
            <td>{{ entry.age }}</td>
            <td>{{ entry.gold }}</td>
            <td>{{ formatTime(entry.updated_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '../api.ts'

const entries = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const data = await adminApi.getLeaderboard()
    entries.value = data.entries || []
  } catch (e) {
    console.error('加载失败:', e)
  }
  loading.value = false
}

function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN')
}

onMounted(load)
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.header h1 { font-size: 20px; color: var(--gold); }

.table-wrap {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow-x: auto;
}
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th {
  background: rgba(212,168,83,0.1);
  color: var(--gold);
  text-align: left;
  padding: 10px 12px;
  font-size: 12px;
}
td { padding: 8px 12px; border-top: 1px solid var(--border); }
tr:hover td { background: rgba(255,255,255,0.02); }
</style>
