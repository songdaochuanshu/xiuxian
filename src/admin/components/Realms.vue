<template>
  <div>
    <div class="header">
      <h1>🏔️ 境界管理</h1>
      <button class="btn" @click="load">刷新</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>境界</th>
            <th>修为上限</th>
            <th>气血</th>
            <th>灵力</th>
            <th>攻击</th>
            <th>防御</th>
            <th>速度</th>
            <th>寿元</th>
            <th>突破率</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in realms" :key="r.id" :class="{ 'row-highlight': r.sort_order >= 9 }">
            <td>{{ r.sort_order }}</td>
            <td class="realm-name">{{ r.name }}</td>
            <td>{{ formatNum(r.max_exp) }}</td>
            <td>{{ formatNum(r.hp) }}</td>
            <td>{{ formatNum(r.mp) }}</td>
            <td>{{ formatNum(r.atk) }}</td>
            <td>{{ formatNum(r.def) }}</td>
            <td>{{ r.speed }}</td>
            <td>{{ r.lifespan }}</td>
            <td>{{ (r.breakthrough_chance * 100).toFixed(0) }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '../api.ts'

const realms = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const data = await adminApi.getRealms()
    realms.value = data.realms || []
  } catch (e) {
    console.error('加载失败:', e)
  }
  loading.value = false
}

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(0) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return n
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
.loading { text-align: center; color: var(--text-dim); padding: 40px; }

.table-wrap {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow-x: auto;
}
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th {
  background: rgba(212,168,83,0.1);
  color: var(--gold);
  text-align: left;
  padding: 8px 10px;
  font-size: 11px;
  white-space: nowrap;
}
td { padding: 6px 10px; border-top: 1px solid var(--border); white-space: nowrap; }
tr:hover td { background: rgba(255,255,255,0.02); }
.realm-name { font-weight: bold; color: var(--text); }
.row-highlight { background: rgba(212,168,83,0.03); }
</style>
