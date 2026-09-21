# 云上博物馆 · 智能导览员

面向博物馆讲解场景的具身交互智能体，基于魔珐星云 `XingyunAvatarAgent` Web SDK 构建。

## 已实现能力

- 实时 3D 数字人、语音播报、口型与动作驱动
- 文字问答、语音识别、客户端打断
- 展品选择与导览上下文
- 响应式桌面和手机界面
- 后端代理魔珐会话鉴权，App Secret 不进入前端产物
- 会话接口同源校验和按 IP 限流
- Docker Compose 一键部署
- Caddy 自动申请和续期 HTTPS 证书
- Render Blueprint 公网托管配置

## 架构

```text
浏览器 / 手机
    │ HTTPS
    ▼
Caddy 或云平台 HTTPS 网关
    │
    ▼
Node.js 应用
    ├── 静态 Web 页面
    ├── /api/config
    └── /api/xmov/session（服务端签名）
             │
             ▼
      魔珐星云会话网关
```

## 本地开发

要求 Node.js 22 或更高版本。复制 `.env.example` 为 `.env`，填写魔珐凭证：

```env
XMOV_APP_ID=你的 App ID
XMOV_APP_SECRET=你的 App Secret
XMOV_GATEWAY=https://nebula-agent.xingyun3d.com/user/v1/ttsa_v2/session
PUBLIC_ORIGIN=http://localhost:5173
PORT=3000
SESSION_RATE_LIMIT=12
```

启动：

```bash
pnpm install
pnpm dev
```

网页地址为 `http://localhost:5173`。Vite 只负责开发页面，`/api` 请求会代理到本地 Node.js 后端。

## 本地生产验证

```bash
pnpm build
pnpm start
```

打开 `http://localhost:3000`，健康检查地址为 `http://localhost:3000/api/health`。

## 公网部署方案一：Render

仓库包含 `render.yaml` 和 `Dockerfile`。将 `museum-guide` 作为独立仓库推送到 GitHub/Gitee 后：

1. 在 Render 创建 Blueprint，并选择该仓库。
2. 填写 `XMOV_APP_ID` 和 `XMOV_APP_SECRET`。
3. 保持 `XMOV_GATEWAY` 为默认官方地址。
4. 首次部署完成后，将 `PUBLIC_ORIGIN` 设置为 Render 分配的完整 HTTPS 地址。
5. 重新部署并访问公开地址。

Render 会自动提供可信 HTTPS，电脑和手机可以直接访问。

## 公网部署方案二：Vercel（无需绑卡）

仓库包含 `vercel.json` 和 `/api` Serverless Functions：

1. 使用 GitHub 登录 Vercel，导入此仓库。
2. Framework Preset 选择 `Vite`，其余构建配置使用仓库默认值。
3. 添加 `XMOV_APP_ID`、`XMOV_APP_SECRET` 和 `XMOV_GATEWAY` 三个环境变量。
4. 点击 Deploy。首次部署后 Vercel 会自动分配 HTTPS 公网地址。

`PUBLIC_ORIGIN` 可以暂时不填，服务会校验请求是否来自当前 Vercel 域名。绑定自定义域名后，建议将其设置为完整的 HTTPS 地址。

## 公网部署方案三：Cloudflare Pages（无需绑卡）

仓库包含 `/functions` Pages Functions、`public/_headers` 和 `wrangler.jsonc`：

1. 使用 GitHub 登录 Cloudflare，并创建 Pages 项目。
2. 选择 `yunshang-museum-guide` 仓库。
3. Framework preset 选择 `Vite`，构建命令填写 `pnpm build`，输出目录填写 `dist`。
4. 添加 `XMOV_APP_ID`、`XMOV_APP_SECRET` 和 `XMOV_GATEWAY` 环境变量。
5. Compatibility flags 添加 `nodejs_compat`，兼容日期使用 `2026-09-18`。
6. 部署后会得到免费的 `pages.dev` HTTPS 地址。

首次部署时不用填写 `PUBLIC_ORIGIN`，函数会自动校验当前访问域名。绑定自定义域名后再将它设置为完整 HTTPS 地址。

## 公网部署方案四：云服务器和域名

服务器需安装 Docker，并将域名 A/AAAA 记录指向服务器。创建 `.env.production`：

```env
DOMAIN=museum.example.com
PUBLIC_ORIGIN=https://museum.example.com
XMOV_APP_ID=你的 App ID
XMOV_APP_SECRET=你的 App Secret
XMOV_GATEWAY=https://nebula-agent.xingyun3d.com/user/v1/ttsa_v2/session
SESSION_RATE_LIMIT=12
```

启动：

```bash
docker compose --env-file .env.production up -d --build
```

Caddy 会自动申请并续期 HTTPS 证书。服务器必须开放公网端口 `80`、`443/TCP` 和 `443/UDP`。

## 安全说明

- `.env` 和 `.env.production` 已被 Git 忽略，禁止提交到代码仓库。
- 浏览器仅取得 App ID 和本项目的代理地址，不会取得 App Secret。
- `/api/xmov/session` 会校验请求来源，并限制单个 IP 在十分钟内创建的会话数。
- 正式环境必须使用 HTTPS，否则移动端麦克风和魔珐 SDK 无法在安全上下文中运行。

## 检查命令

```bash
pnpm test
pnpm build
```

本项目使用 MIT License。
