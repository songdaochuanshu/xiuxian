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

      <!-- 安全配置 -->
      <div class="config-section">
        <h3>🔐 安全配置</h3>
        <div class="config-grid">
          <div class="config-item">
            <label>管理密码</label>
            <input v-model="config.admin_password" type="password" placeholder="xiuxian2026" />
          </div>
          <div class="config-item">
            <label>存档签名密钥</label>
            <input v-model="config.save_hmac_key" type="password" placeholder="修改后旧存档将失效" />
          </div>
        </div>
      </div>

      <!-- 社群配置 -->
      <div class="config-section">
        <h3>👥 社群配置</h3>
        <div class="config-grid">
          <div class="config-item">
            <label>QQ群号</label>
            <input v-model="config.qqGroup" placeholder="123456789" />
          </div>
          <div class="config-item">
            <label>QQ群加群链接</label>
            <input v-model="config.qqGroupLink" placeholder="https://qm.qq.com/cgi-bin/qm/qr?k=xxx" />
          </div>
          <div class="config-item">
            <label>QQ群名称（选填）</label>
            <input v-model="config.qqGroupName" placeholder="凡人修仙传交流群" />
          </div>
        </div>
      </div>

      <!-- 付款码配置 -->
      <div class="config-section">
        <h3>💰 付款码</h3>
        <div class="config-grid">
          <div class="config-item full">
            <label>上传收款码图片（点击下方按钮选择图片）</label>
            <div class="upload-area" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
              <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="handleFileSelect" />
              <div v-if="uploading" class="upload-loading">上传中...</div>
              <div v-else-if="config.qrcodeBase64" class="upload-preview">
                <img :src="config.qrcodeBase64" alt="收款码" class="preview-img" />
                <div class="upload-hint">点击更换图片</div>
              </div>
              <div v-else class="upload-placeholder">
                <div class="upload-icon">📷</div>
                <div class="upload-text">点击或拖拽上传收款码</div>
                <div class="upload-hint">支持 jpg/png/gif，建议不超过 500KB</div>
              </div>
            </div>
          </div>
          <div class="config-item full">
            <label>或输入图片外链地址（优先级低于上传）</label>
            <input v-model="config.qrcodeUrl" placeholder="https://xxx.com/qrcode.png" />
          </div>
          <div class="config-item">
            <label>付款提示文字</label>
            <input v-model="config.payTip" placeholder="微信扫码支付" />
          </div>
        </div>
        <div v-if="config.qrcodeUrl && !config.qrcodeBase64" class="qrcode-preview">
          <div class="preview-label">外链预览：</div>
          <img :src="config.qrcodeUrl" alt="收款码预览" class="preview-img" @error="qrcodeError = true" />
          <div v-if="qrcodeError" class="preview-error">图片加载失败，请检查地址</div>
        </div>
      </div>

      <!-- 保存提示 -->
      <div v-if="saveSuccess" class="save-success">✅ 保存成功！</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '../api.ts'

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
  qrcodeUrl: '',
  qrcodeBase64: '',
  payTip: '微信扫码支付',
  qqGroup: '',
  qqGroupLink: '',
  qqGroupName: '',
  admin_password: '',
  save_hmac_key: '',
})

const loading = ref(true)
const saving = ref(false)
const saveSuccess = ref(false)
const qrcodeError = ref(false)
const uploading = ref(false)
const fileInput = ref(null)

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

function triggerUpload() {
  fileInput.value?.click()
}

function handleFileSelect(e) {
  const file = e.target.files?.[0]
  if (file) processFile(file)
}

function handleDrop(e) {
  const file = e.dataTransfer.files?.[0]
  if (file && file.type.startsWith('image/')) processFile(file)
}

function processFile(file) {
  if (file.size > 500 * 1024) {
    alert('图片过大，请压缩到 500KB 以内')
    return
  }
  uploading.value = true
  const reader = new FileReader()
  reader.onload = () => {
    config.value.qrcodeBase64 = reader.result
    uploading.value = false
  }
  reader.onerror = () => {
    alert('读取图片失败')
    uploading.value = false
  }
  reader.readAsDataURL(file)
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

.qrcode-preview {
  margin-top: 12px;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
  text-align: center;
}
.preview-label {
  font-size: 12px;
  color: var(--text-dim);
  margin-bottom: 8px;
}
.preview-img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  background: #fff;
  padding: 8px;
}
.preview-error {
  color: var(--danger);
  font-size: 12px;
  margin-top: 8px;
}

.upload-area {
  border: 2px dashed var(--border);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255,255,255,0.02);
}
.upload-area:hover {
  border-color: var(--gold-dim);
  background: rgba(212,168,83,0.05);
}
.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.upload-icon { font-size: 36px; }
.upload-text { font-size: 14px; color: var(--text); }
.upload-hint { font-size: 11px; color: var(--text-dim); }
.upload-loading {
  color: var(--text-dim);
  font-size: 13px;
  padding: 20px;
}
.upload-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
</style>
