<template>
  <div>
    <div class="header">
      <h1>👥 玩家管理</h1>
      <button class="btn" @click="load">刷新</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>名字</th>
            <th>境界</th>
            <th>深渊</th>
            <th>年龄</th>
            <th>灵石</th>
            <th>加速</th>
            <th>最后活跃</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" style="text-align:center">加载中...</td>
          </tr>
          <tr v-else-if="!players.length">
            <td colspan="8" style="text-align:center">暂无数据</td>
          </tr>
          <tr v-for="p in players" :key="p.id">
            <td>{{ p.name }}</td>
            <td>{{ p.realm || '-' }}</td>
            <td>第{{ p.abyss_max_layer || 1 }}层</td>
            <td>{{ p.age }}</td>
            <td>{{ p.spirit_stones ?? p.gold }}</td>
            <td>
              <span v-if="p.speed_multiplier > 1" class="badge badge-success">
                {{ p.speed_multiplier }}x
              </span>
              <span v-else>-</span>
            </td>
            <td>{{ p.last_active ? formatTime(p.last_active) : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <button class="btn btn-sm" :disabled="page <= 1" @click="page--; load()">上一页</button>
      <span>第 {{ page }} 页</span>
      <button class="btn btn-sm" :disabled="players.length < 20" @click="page++; load()">下一页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '../api.ts'

const players = ref([])
const page = ref(1)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const data = await adminApi.getPlayers(page.value, 20)
    players.value = data.data || []
  } catch (e) {
    console.error('加载失败:', e)
  }
  loading.value = false
}

function formatTime(ts) {
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

.badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.badge-success { background: rgba(64,192,128,0.15); color: var(--success); }

.pagination {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  margin-top: 16px;
  font-size: 13px;
}
</style>
