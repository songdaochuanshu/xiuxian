<template>
  <div>
    <div class="header">
      <h1>🎫 兑换码管理</h1>
    </div>

    <!-- 生成表单 -->
    <div class="gen-form">
      <div class="form-group">
        <label>类型</label>
        <select v-model="genForm.codeType">
          <option value="speed">加速码</option>
          <option value="auto_break">自动突破码</option>
        </select>
      </div>
      <div v-if="genForm.codeType === 'speed'" class="form-group">
        <label>倍速</label>
        <select v-model="genForm.multiplier">
          <option :value="2">2x</option>
          <option :value="5">5x</option>
          <option :value="10">10x</option>
          <option :value="-1">自定义</option>
        </select>
        <input
          v-if="genForm.multiplier === -1"
          v-model.number="customMultiplier"
          type="number"
          min="2"
          max="100"
          placeholder="输入倍数"
          style="width:80px;margin-top:4px"
        />
      </div>
      <div v-if="genForm.codeType === 'speed'" class="form-group">
        <label>时长</label>
        <select v-model="genForm.duration">
          <option :value="0">永久</option>
          <option :value="3600">1小时</option>
        </select>
      </div>
      <div v-if="genForm.codeType === 'auto_break'" class="form-group">
        <label style="color:var(--gold);font-size:11px">⚡ 自动突破码（永久）</label>
      </div>
      <div class="form-group">
        <label>数量</label>
        <input v-model.number="genForm.count" type="number" min="1" max="100" />
      </div>
      <button class="btn" :disabled="generating" @click="generate">
        {{ generating ? '生成中...' : '生成' }}
      </button>
    </div>

    <!-- 生成结果 -->
    <div v-if="generatedCodes.length" class="gen-result">
      <div class="gen-result-header">
        <span>生成成功！{{ generatedCodes.length }} 个兑换码</span>
        <button class="btn btn-sm" @click="copyAll">复制全部</button>
      </div>
      <div class="gen-result-list">
        <div v-for="code in generatedCodes" :key="code" class="gen-code">{{ code }}</div>
      </div>
    </div>

    <!-- 兑换码列表 -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>兑换码</th>
            <th>类型</th>
            <th>倍速</th>
            <th>时长</th>
            <th>状态</th>
            <th>使用时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" style="text-align:center">加载中...</td>
          </tr>
          <tr v-else-if="!codes.length">
            <td colspan="7" style="text-align:center">暂无数据</td>
          </tr>
          <tr v-for="c in codes" :key="c.code">
            <td class="code-text" @click="copyCode(c.code)" title="点击复制">{{ c.code }}</td>
            <td>{{ c.code_type === 'auto_break' ? '⚡自动突破' : '🚀加速' }}</td>
            <td>{{ c.code_type === 'auto_break' ? '-' : c.multiplier + 'x' }}</td>
            <td>{{ c.code_type === 'auto_break' ? '永久' : (c.duration === 0 ? '永久' : c.duration/3600+'小时') }}</td>
            <td>
              <span class="badge" :class="c.used ? 'badge-danger' : 'badge-success'">
                {{ c.used ? '已使用' : '未使用' }}
              </span>
            </td>
            <td>{{ c.used_at ? formatTime(c.used_at) : '-' }}</td>
            <td>
              <button class="btn btn-danger btn-sm" @click="handleDelete(c.code)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <button class="btn btn-sm" :disabled="page <= 1" @click="page--; load()">上一页</button>
      <span>第 {{ page }} 页 / 共 {{ totalPages }} 页</span>
      <button class="btn btn-sm" :disabled="page >= totalPages" @click="page++; load()">下一页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '../api.ts'

const codes = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const generating = ref(false)
const generatedCodes = ref([])

const genForm = ref({
  codeType: 'speed',
  multiplier: 2,
  duration: 0,
  count: 10,
})
const customMultiplier = ref(10)

const totalPages = computed(() => Math.ceil(total.value / 20))

async function load() {
  loading.value = true
  try {
    const data = await adminApi.getCodes(page.value, 20)
    codes.value = data.data || []
    total.value = data.total || 0
  } catch (e) {
    console.error('加载失败:', e)
  }
  loading.value = false
}

async function generate() {
  generating.value = true
  try {
    const multiplier = genForm.value.codeType === 'auto_break' ? 0 : (genForm.value.multiplier === -1 ? customMultiplier.value : genForm.value.multiplier)
    if (genForm.value.codeType === 'speed' && multiplier < 2) {
      alert('倍数不能小于2')
      generating.value = false
      return
    }
    const data = await adminApi.createCodes(
      multiplier,
      genForm.value.duration,
      genForm.value.count,
      genForm.value.codeType
    )
    if (data.success) {
      generatedCodes.value = data.codes
      await load()
    } else {
      alert(data.error || '生成失败')
    }
  } catch (e) {
    alert('生成失败')
  }
  generating.value = false
}

async function handleDelete(code) {
  if (!confirm(`确定删除 ${code}？`)) return
  await adminApi.deleteCode(code)
  await load()
}

function copyAll() {
  navigator.clipboard.writeText(generatedCodes.value.join('\n'))
    .then(() => alert('已复制！'))
    .catch(() => alert('复制失败'))
}

function copyCode(code) {
  navigator.clipboard.writeText(code)
    .then(() => alert(`已复制: ${code}`))
    .catch(() => alert('复制失败'))
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

.gen-form {
  display: flex;
  gap: 10px;
  align-items: end;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-group label {
  font-size: 12px;
  color: var(--text-dim);
}
.form-group select, .form-group input {
  padding: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
}
.form-group input { width: 80px; }

.gen-result {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(64,192,128,0.1);
  border: 1px solid rgba(64,192,128,0.3);
  border-radius: 8px;
}
.gen-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--success);
}
.gen-result-list {
  font-family: monospace;
  font-size: 12px;
  line-height: 1.8;
  max-height: 150px;
  overflow-y: auto;
}

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
.code-text {
  font-family: monospace;
  cursor: pointer;
  transition: color 0.2s;
}
.code-text:hover {
  color: var(--gold);
}

.badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.badge-success { background: rgba(64,192,128,0.15); color: var(--success); }
.badge-danger { background: rgba(224,64,64,0.15); color: var(--danger); }

.pagination {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  margin-top: 16px;
  font-size: 13px;
}
</style>
