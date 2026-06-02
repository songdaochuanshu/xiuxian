<template>
  <div>
    <div class="header">
      <h1>🏪 商店管理</h1>
      <button class="btn" @click="showAdd = true">添加商品</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>图标</th>
            <th>名称</th>
            <th>描述</th>
            <th>价格</th>
            <th>分类</th>
            <th>效果</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" style="text-align:center">加载中...</td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="7" style="text-align:center">暂无商品</td>
          </tr>
          <tr v-for="item in items" :key="item.id">
            <td>{{ item.icon }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.desc }}</td>
            <td>💎 {{ item.price }}</td>
            <td>{{ item.tab }}</td>
            <td>{{ item.effect }}</td>
            <td>
              <button class="btn btn-danger btn-sm" @click="deleteItem(item.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 添加商品弹窗 -->
    <Teleport to="body">
      <div v-if="showAdd" class="modal-overlay" @click.self="showAdd = false">
        <div class="modal-box">
          <h3>添加商品</h3>
          <div class="modal-form">
            <div class="form-group">
              <label>图标</label>
              <input v-model="newItem.icon" placeholder="📦" />
            </div>
            <div class="form-group">
              <label>名称</label>
              <input v-model="newItem.name" placeholder="商品名称" />
            </div>
            <div class="form-group">
              <label>描述</label>
              <input v-model="newItem.desc" placeholder="商品描述" />
            </div>
            <div class="form-group">
              <label>价格</label>
              <input v-model.number="newItem.price" type="number" />
            </div>
            <div class="form-group">
              <label>分类</label>
              <select v-model="newItem.tab">
                <option value="items">道具</option>
                <option value="skills">技能</option>
                <option value="special">特殊</option>
              </select>
            </div>
            <div class="form-group">
              <label>效果</label>
              <input v-model="newItem.effect" placeholder="heal50" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn" @click="addItem">添加</button>
            <button class="btn btn-danger" @click="showAdd = false">取消</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '../api.ts'

const items = ref([])
const loading = ref(true)
const showAdd = ref(false)

const newItem = ref({
  icon: '📦',
  name: '',
  desc: '',
  price: 0,
  tab: 'items',
  effect: '',
})

async function load() {
  loading.value = true
  try {
    const data = await adminApi.getShopItems()
    items.value = data || []
  } catch (e) {
    console.error('加载失败:', e)
  }
  loading.value = false
}

async function addItem() {
  if (!newItem.value.name || !newItem.value.price) {
    alert('请填写完整')
    return
  }

  try {
    await adminApi.addShopItem(newItem.value)
    showAdd.value = false
    newItem.value = { icon: '📦', name: '', desc: '', price: 0, tab: 'items', effect: '' }
    await load()
  } catch (e) {
    alert('添加失败')
  }
}

async function deleteItem(id) {
  if (!confirm('确定删除？')) return
  await adminApi.deleteShopItem(id)
  await load()
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

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  z-index: 200;
  display: flex;
  justify-content: center;
  align-items: center;
}
.modal-box {
  background: var(--panel);
  border: 1px solid var(--gold-dim);
  border-radius: 12px;
  padding: 20px;
  width: 90%;
  max-width: 400px;
}
.modal-box h3 {
  color: var(--gold);
  margin-bottom: 16px;
}
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
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
.form-group input, .form-group select {
  padding: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
}
.modal-actions {
  display: flex;
  gap: 8px;
}
.modal-actions .btn { flex: 1; }
</style>
