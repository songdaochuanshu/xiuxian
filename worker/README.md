# 修仙加速器 - Cloudflare Worker

## 部署步骤

### 1. 安装依赖
```bash
cd worker
npm install
```

### 2. 创建 D1 数据库
```bash
npm run create-db
```
记下输出的 `database_id`，填入 `wrangler.toml`

### 3. 初始化数据库
```bash
npm run init-db
```

### 4. 部署 Worker
```bash
npm run deploy
```
记下输出的 Worker URL

### 5. 配置前端
在项目根目录的 `.env` 文件中添加：
```
VITE_API_URL=https://xiuxian-api.你的子域名.workers.dev
```

## 生成兑换码并导入

### 生成兑换码
```bash
cd ..
node scripts/gen-code.js 2 0 10  # 生成10个永久2倍速
```

### 导入到 D1
复制输出的 SQL 语句，执行：
```bash
cd worker
wrangler d1 execute xiuxian-codes --command="INSERT INTO codes ..."
```

或者批量导入：
```bash
wrangler d1 execute xiuxian-codes --file=./codes.sql
```

## API 接口

### POST /redeem
验证兑换码

**请求：**
```json
{ "code": "AP-XXXXXXXX" }
```

**响应：**
```json
{ "success": true, "multiplier": 2, "duration": 0 }
```

### GET /health
健康检查
