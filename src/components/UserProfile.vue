<template>
  <Teleport to="body">
    <div v-if="show" class="profile-overlay">
      <div class="profile-box">
        <div class="profile-title">⚔️ 修仙者档案</div>
        <div class="profile-sub">取一个道号，踏上修仙之路</div>

        <div class="profile-form">
          <div class="form-group">
            <label>道号</label>
            <input
              v-model="name"
              placeholder="请输入你的道号"
              maxlength="12"
              @keyup.enter="confirm"
            />
          </div>
        </div>

        <button class="btn btn-full" @click="confirm">踏入修仙界</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player.ts'

const player = usePlayerStore()
const show = ref(false)
const name = ref('')

onMounted(() => {
  // 检查是否已有用户信息
  if (!player.uid) {
    show.value = true
  }
})

function confirm() {
  const trimmed = name.value.trim()
  if (!trimmed) return

  player.uid = generateUid()
  player.name = trimmed
  show.value = false
}

function generateUid() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let uid = 'XY' // 修仙前缀
  for (let i = 0; i < 8; i++) {
    uid += chars[Math.floor(Math.random() * chars.length)]
  }
  return uid
}
</script>

<style scoped>
.profile-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 300;
  display: flex;
  justify-content: center;
  align-items: center;
}

.profile-box {
  background: var(--panel);
  border: 1px solid var(--gold-dim);
  border-radius: 12px;
  padding: 30px;
  width: 90%;
  max-width: 360px;
  text-align: center;
}

.profile-title {
  font-size: 24px;
  color: var(--gold);
  letter-spacing: 6px;
  margin-bottom: 8px;
}

.profile-sub {
  font-size: 13px;
  color: var(--text-dim);
  margin-bottom: 24px;
}

.profile-form {
  margin-bottom: 20px;
}

.form-group {
  text-align: left;
}
.form-group label {
  display: block;
  font-size: 12px;
  color: var(--text-dim);
  margin-bottom: 6px;
}
.form-group input {
  width: 100%;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
}
.form-group input:focus {
  border-color: var(--gold-dim);
}
.form-group input::placeholder {
  color: var(--text-dim);
}

.btn-full {
  width: 100%;
  padding: 12px;
  font-size: 15px;
  letter-spacing: 4px;
}
</style>
