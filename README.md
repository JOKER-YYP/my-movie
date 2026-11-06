# my-movie

仿腾讯视频交互的桌面播放器（Vue 3 + Electron + Express），搜索与片源对齐 [LibreTV](https://libretv.liumingye.cn/)。

## 环境要求

- Node.js **≥ 20**（推荐 20 LTS）
- pnpm 9+

```bash
nvm use 20.18.0
```

## 快速开始

```bash
# 务必使用 Node 20+
nvm use 20.18.0

pnpm install
pnpm --filter @my-movie/shared build
pnpm --filter @my-movie/server db:push
pnpm dev
```

- 后端：http://127.0.0.1:3000  
- 桌面端：Electron 窗口自动打开  

也可分端启动：

```bash
pnpm dev:server
pnpm dev:desktop
```

### 片源代理模式

`apps/server/.env` 中：

- `LIBRETV_PROXY_MODE=via_libretv`（默认）：经 https://libretv.liumingye.cn/proxy/ 访问采集站（失败会直连回退）
- `LIBRETV_PROXY_MODE=direct`：服务端直连 CMS
- `SEARCH_SOURCE_TIMEOUT_MS`：单源超时，默认 `15000`（对齐 LibreTV）
- `SEARCH_MAX_PAGES`：单源最多翻页数，默认 `50`（对齐 LibreTV classic）

## 目录

```
apps/desktop   Electron + Vue3 + Naive UI + xgplayer
apps/server    Express BFF（LibreTV 聚合 / 代理 / 用户数据）
packages/shared 共享类型
docs/          项目说明文档
```

## 说明

本项目不托管视频文件，仅聚合第三方公开 Apple CMS 接口；请遵守当地法律法规与各源站条款。
