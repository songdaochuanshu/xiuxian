<template>
  <div>
    <div class="header">
      <h1>⚙️ 游戏配置</h1>
      <button class="btn" :disabled="saving" @click="save">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="config-sections">
      <!-- 基础配置 -->
      <div class="config-section">
        <h3>基础配置</h3>
        <div class="config-grid">
          <div class="config-item">
            <label>游戏名称</label>
            <input v-model="config.gameName" />
          </div>
          <div class="config-item">
            <label>初始气血</label>
            <input v-model.number="config.initHp" type="number" />
          </div>
          <div class="config-item">
            <label>初始灵力</label>
            <input v-model.number="config.initMp" type="number" />
          </div>
          <div class="config-item">
            <label>初始年龄</label>
            <input v-model.number="config.initAge" type="number" />
          </div>
        </div>
      </div>

      <!-- 加速配置 -->
      <div class="config-section">
        <h3>加速套餐</h3>
        <div class="config-grid">
          <div class="config-item">
            <label>2倍速价格（元）</label>
            <input v-model.number="config.price2x" type="number" step="0.1" />
          </div>
          <div class="config-item">
            <label>5倍速价格（元）</label>
            <input v-model.number="config.price5x" type="number" step="0.1" />
          </div>
          <div class="config-item">
            <label>10倍速价格（元）</label>
            <input v-model.number="config.price10x" type="number" step="0.1" />
          </div>
          <div class="config-item">
            <label>永久2倍速价格（元）</label>
            <input v-model.number="config.price2xPerm" type="number" step="0.1" />
          </div>
        </div>
      </div>

      <!-- 公告配置 -->
      <div class="config-section">
        <h3>游戏公告</h3>
        <div class="config-item full">
          <label>公告内容（留空不显示）</label>
          <textarea v-model="config.announcement" rows="3" placeholder="输入公告内容..."></textarea>
        </div>
      </div>

      <!-- 保存提示 -->
      <div v-if="saveSuccess" class="save-success">✅ 保存成功！</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '../api.js'

const config = ref({
  gameName: '凡人修仙传',
  initHp: 100,
  initMp: 50,
  initAge: 16,
  price2x: 1,
  price5x: 3,
  price10x: 5,
  price2xPerm: 9.9,
  announcement: '',
})

const loading = ref(true)
const saving = ref(false)
const saveSuccess = ref(false)

async function load() {
  loading.value = true
  try {
    const data = await adminApi.getConfig()
    if (data && Object.keys(data).length > 0) {
      config.value = { ...config.value, ...data }
    }
  } catch (e) {
    console.error('加载失败:', e)
  }
  loading.value = false
}

async function save() {
  saving.value = true
  saveSuccess.value = false
  try {
    await adminApi.saveConfig(config.value)
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (e) {
    alert('保存失败')
  }
  saving.value = false
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

.config-sections { display: flex; flex-direction: column; gap: 20px; }

.config-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
}
.config-section h3 {
  color: var(--gold);
  font-size: 14px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.config-item.full { grid-column: 1 / -1; }
.config-item label {
  font-size: 12px;
  color: var(--text-dim);
}
.config-item input, .config-item textarea {
  padding: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.config-item input:focus, .config-item textarea:focus {
  border-color: var(--gold-dim);
}
.config-item textarea {
  resize: vertical;
}

.save-success {
  text-align: center;
  color: var(--success);
  padding: 12px;
  background: rgba(64,192,128,0.1);
  border-radius: 6px;
}
</style>
