# 3.6 首屏优化

> 前端性能优化 · 骨架屏 · SSR/预渲染 · 关键 CSS · 预加载 · 首屏直出

---

## 目录

1. [骨架屏](#1-骨架屏)
2. [SSR 与预渲染](#2-ssr-与预渲染)
3. [关键 CSS 内联](#3-关键-css-内联)
4. [页面预加载策略](#4-页面预加载策略)
5. [首屏直出数据](#5-首屏直出数据)
6. [综合实践：caidiaweb 首屏全链路优化](#6-综合实践caidiaweb-首屏全链路优化)
7. [面试高频考点](#7-面试高频考点)

---

## 1. 骨架屏

### 1.1 为什么需要骨架屏

```
首屏加载时间线（无骨架屏）：

0ms        800ms        2s           4s
│            │           │            │
├────────────┼───────────┼────────────┤
│   白屏     │    白屏    │    白屏    │  页面渲染
│            │           │            │
└─ 用户等待，毫无反馈 ────────────────┘

首屏加载时间线（有骨架屏）：

0ms        800ms        2s           4s
│            │           │            │
├────白屏───┼───骨架屏──┼──内容渲染─┤
             │           │
             └─ 用户看到结构，感知速度提升 40%+
```

骨架屏的核心价值不是让页面更快加载，而是让用户**感知到**页面正在加载。

### 1.2 通用骨架屏组件

```vue
<!-- components/Skeleton.vue — 通用骨架屏基础组件 -->
<template>
  <div class="skeleton" :class="classes" :style="styles" />
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  type: { type: String, default: 'text', validator: v => ['text', 'rect', 'circle', 'card'].includes(v) },
  width: { type: [String, Number], default: '100%' },
  height: { type: [String, Number], default: 16 },
  radius: { type: [String, Number], default: 4 },
  animated: { type: Boolean, default: true },
});

const classes = computed(() => ({
  [`skeleton--${props.type}`]: true,
  'skeleton--animated': props.animated,
}));

const styles = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
  borderRadius: props.type === 'circle' ? '50%' : typeof props.radius === 'number' ? `${props.radius}px` : props.radius,
}));
</script>

<style scoped>
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
}
.skeleton--animated {
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}
@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton--text { display: inline-block; margin-bottom: 8px; }
.skeleton--circle { flex-shrink: 0; }
.skeleton--card { height: 100%; width: 100%; }
.skeleton--text:last-child { width: 60% !important; }
</style>
```

```vue
<!-- components/SkeletonBlock.vue — 组合式骨架屏（表格/列表/卡片布局） -->
<template>
  <div class="skeleton-block">
    <div v-if="title" class="skeleton-block__header">
      <Skeleton :width="200" :height="24" />
    </div>
    <div v-if="variant === 'cards'" class="skeleton-block__cards">
      <div v-for="i in cardCount" :key="i" class="skeleton-block__card">
        <Skeleton type="rect" width="100%" height="120" :radius="8" />
      </div>
    </div>
    <div v-if="variant === 'table'" class="skeleton-block__table">
      <div v-for="i in rowCount" :key="i" class="skeleton-block__row">
        <Skeleton :width="`${getRandomWidth(30, 80)}%`" :height="16" />
      </div>
    </div>
    <div v-if="variant === 'content'" class="skeleton-block__content">
      <Skeleton width="100%" :height="16" />
      <Skeleton width="90%" :height="16" />
      <Skeleton width="75%" :height="16" />
      <Skeleton width="40%" :height="16" />
    </div>
  </div>
</template>

<script setup>
import Skeleton from './Skeleton.vue';
defineProps({
  variant: { type: String, default: 'cards', validator: v => ['cards', 'table', 'content'].includes(v) },
  title: { type: Boolean, default: false },
  cardCount: { type: Number, default: 4 },
  rowCount: { type: Number, default: 5 },
});
function getRandomWidth(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
</script>

<style scoped>
.skeleton-block__cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.skeleton-block__table { display: flex; flex-direction: column; gap: 12px; }
.skeleton-block__content { display: flex; flex-direction: column; gap: 10px; }
</style>
```

### 1.3 按页面定制骨架屏

```vue
<!-- views/TechFacilitySkeleton.vue — 技术设施页骨架屏（结构与真实页面一致） -->
<template>
  <div class="tech-facility-skeleton">
    <div class="stat-cards">
      <div v-for="i in 4" :key="i" class="stat-card">
        <div class="stat-card__icon">
          <Skeleton type="circle" :width="40" :height="40" />
        </div>
        <div class="stat-card__info">
          <Skeleton :width="80" :height="14" />
          <Skeleton :width="50" :height="28" style="margin-top: 8px" />
        </div>
      </div>
    </div>
    <div class="map-section">
      <Skeleton type="rect" width="100%" :height="450" :radius="8" />
    </div>
    <div class="charts-row">
      <div class="chart-col">
        <Skeleton type="rect" width="100%" :height="300" :radius="8" />
      </div>
      <div class="chart-col">
        <Skeleton type="rect" width="100%" :height="300" :radius="8" />
      </div>
    </div>
  </div>
</template>

<script setup>
import Skeleton from '@/components/Skeleton.vue';
</script>

<style scoped>
.tech-facility-skeleton { padding: 20px; display: flex; flex-direction: column; gap: 20px; }
.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-card { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.stat-card__info { flex: 1; }
.charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 768px) {
  .stat-cards { grid-template-columns: 1fr 1fr; }
  .charts-row { grid-template-columns: 1fr; }
}
</style>
```

### 1.4 Vue 异步组件 + 骨架屏集成

```vue
<!-- views/TechFacility.vue — 真实页面对接骨架屏 -->
<template>
  <div class="tech-facility-page">
    <Suspense>
      <template #default>
        <TechFacilityContent />
      </template>
      <template #fallback>
        <TechFacilitySkeleton />
      </template>
    </Suspense>
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue';
import TechFacilitySkeleton from './TechFacilitySkeleton.vue';
const TechFacilityContent = defineAsyncComponent({
  loader: () => import('./TechFacilityContent.vue'),
  loadingComponent: TechFacilitySkeleton,
  delay: 200,
  timeout: 10000,
});
</script>
```

---

## 2. SSR 与预渲染

### 2.1 SSR vs 预渲染 vs CSR

```
┌──────────────────────────────────────────────────────────────┐
│              渲染方案对比                                      │
├────────────┬──────────────┬───────────────┬──────────────────┤
│    维度     │   CSR (纯SPA) │   预渲染       │   SSR (服务端渲染) │
├────────────┼──────────────┼───────────────┼──────────────────┤
│ FCP        │  2-5s         │   0.5-1s      │   0.3-0.8s       │
│ SEO        │  差           │   较好         │   最好            │
│ 服务器压力  │  无           │   无(构建时)    │   高              │
│ 动态数据    │  ✅          │   ❌           │   ✅              │
│ 部署复杂度  │  低           │   中           │   高              │
│ 适用场景    │  后台管理      │   官网/活动页   │   C端/SEO页面     │
└────────────┴──────────────┴───────────────┴──────────────────┘

caidiaweb（数据采集分析系统）→ 推荐 CSR + 骨架屏
官网/登录页 → 推荐 预渲染
```

### 2.2 Vite 预渲染配置

```bash
npm install -D vite-plugin-prerender
```

```javascript
// vite.config.js
import vitePrerender from 'vite-plugin-prerender';
import path from 'path';

export default defineConfig({
  plugins: [
    vue(),
    vitePrerender({
      routes: ['/', '/login', '/about'],
      staticDir: path.join(__dirname, 'dist'),
      renderer: new vitePrerender.PuppeteerRenderer({
        renderAfterDocumentEvent: 'render-event',
        headless: true,
      }),
    }),
  ],
});
```

### 2.3 CSR 项目首屏加速方案（不引入 SSR）

```
不引入 SSR 也能加速首屏的 5 个手段：

1. HTML 中预置首屏数据（inline state）
   <script>window.__INITIAL_STATE__ = {...}</script>

2. 关键 CSS 内联在 HTML 中
   <style>/* 首屏样式 */</style>

3. 骨架屏直接写在 index.html 中（不依赖 JS）
   <div id="app"><!-- 静态骨架屏 HTML --></div>

4. JS 使用 defer（不阻塞解析）
   <script src="/app.js" defer></script>

5. 预加载关键资源
   <link rel="preload" href="/hero.webp" as="image" />

收益：FCP 可在 500ms 内，无需引入 SSR 框架
```

---

## 3. 关键 CSS 内联

### 3.1 原理

```
传统方式：
  HTML 下载 → 解析 → 发现 <link> → 下载 CSS → 解析 CSS → 首次渲染
              │                        │
              └── 渲染被阻塞 ──────────┘

关键 CSS 内联：
  HTML 下载 → 解析 → <style> 已在 HTML 中 → 立即渲染
                              │
              关键 CSS (~3KB) 足够首屏显示

非关键 CSS 异步加载：
  <link rel="preload" href="full.css" as="style" onload="this.rel='stylesheet'">
```

### 3.2 critters 插件

```bash
npm install -D critters
```

```javascript
// vite.config.js
import critters from 'rollup-plugin-critters';

export default defineConfig({
  plugins: [
    vue(),
    critters({
      preload: 'media',
      pruneSource: true,
      compress: true,
      preloadFonts: true,
    }),
  ],
});
```

### 3.3 完整 index.html 方案

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>技术设施管理系统</title>

  <!-- 第1步：内联关键 CSS（由 critters 构建时自动注入） -->
  <style>
    :root { --primary: #1890ff; --bg: #f0f2f5; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: var(--bg); }
    .app-layout { display: flex; min-height: 100vh; }
    .app-sidebar { width: 240px; background: #001529; flex-shrink: 0; }
    .app-header { height: 56px; background: #fff; display: flex; align-items: center; padding: 0 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .app-content { flex: 1; padding: 20px; }
    .skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  </style>

  <!-- 第2步：预连接 -->
  <link rel="preconnect" href="https://api.caidiaweb.com">
  <link rel="dns-prefetch" href="https://cdn.caidiaweb.com">

  <!-- 第3步：异步加载完整 CSS -->
  <link rel="preload" href="/css/full.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/css/full.css"></noscript>
</head>
<body>
  <!-- 第4步：静态骨架屏（JS 未执行时就有内容） -->
  <div id="app">
    <div class="app-layout">
      <div class="app-sidebar"></div>
      <div style="flex:1">
        <div class="app-header">
          <div class="skeleton" style="width:200px;height:24px"></div>
        </div>
        <div class="app-content">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
            <div class="skeleton" style="height:120px" v-for="i in 4"></div>
          </div>
          <div class="skeleton" style="height:400px;margin-top:16px"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- 第5步：defer 加载 JS -->
  <script src="/js/vendor-vue.js" defer></script>
  <script src="/js/vendor-charts.js" defer></script>
  <script src="/js/app.js" defer></script>
</body>
</html>
```

---

## 4. 页面预加载策略

### 4.1 quicklink

```bash
npm install quicklink
```

```javascript
// utils/prefetch.js
import { listen } from 'quicklink';

export function initQuicklink() {
  setTimeout(() => {
    listen({
      origins: [location.hostname],
      ignores: [
        uri => uri.includes('/api/'),
        uri => uri.includes('/logout'),
        uri => uri.includes('#'),
      ],
      delay: 3000,
      limit: 3,
    });
  }, 100);
}

// Vue Router 集成
router.afterEach(() => initQuicklink());
```

### 4.2 预测预取

```javascript
// utils/predictive-prefetch.js — 基于页面跳转概率的智能预取

const TRANSITION_PROBS = {
  '/': [
    { path: '/tech-facility', probability: 0.7 },
    { path: '/spectrum', probability: 0.2 },
    { path: '/statistics', probability: 0.1 },
  ],
  '/tech-facility': [
    { path: '/spectrum', probability: 0.5 },
    { path: '/statistics', probability: 0.3 },
  ],
};

export function predictAndPrefetch(currentPath) {
  const predictions = TRANSITION_PROBS[currentPath];
  if (!predictions) return;

  predictions
    .filter(p => p.probability > 0.3)
    .forEach(p => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = p.path;
      document.head.appendChild(link);
    });
}
```

### 4.3 策略总结

```
┌─────────────────────────────────────────────────────────┐
│              预加载策略选择                               │
├──────────────┬──────────┬──────────────┬────────────────┤
│    策略       │  开销     │   精准度     │    适用场景     │
├──────────────┼──────────┼──────────────┼────────────────┤
│ quicklink    │  中      │  高          │  侧边栏/菜单     │
│ 预测预取      │  低      │  中-高       │  用户路径固定    │
│ 悬停预取      │  最低     │  最高        │  <router-link>  │
│ 手动 prefetch │  低      │  精准        │  关键下一步页面   │
└──────────────┴──────────┴──────────────┴────────────────┘

caidiaweb 推荐：
  侧边栏菜单 → quicklink
  关键流程（首页→技术设施）→ 手动 prefetch
  路由悬停 → onmouseover prefetch
```

---

## 5. 首屏直出数据

### 5.1 问题与解决

```
传统流程：
  页面加载 → JS 执行 → API 请求 → 等待 300-800ms → 渲染数据

首屏直出：
  HTML 已含数据 → JS 执行 → 直接读取 window.__INITIAL_STATE__ → 立即渲染
                           ↑
                   节省 300-800ms，不依赖 API
```

### 5.2 实现代码

```html
<!-- 服务端模板注入 -->
<script>
  window.__INITIAL_STATE__ = {
    stations: [/* 首页所需全部数据 */],
    user: { name: 'admin', role: 'super' },
    _timestamp: 1719676800000,
  };
</script>
```

```javascript
// store/index.js — Store 优先读取直出数据
import { defineStore } from 'pinia';

export const useStationStore = defineStore('stations', {
  state: () => ({ list: [], loading: true }),
  actions: {
    async fetchStations() {
      const initialState = window.__INITIAL_STATE__?.stations;

      if (initialState?.length > 0) {
        this.list = initialState;
        this.loading = false;
        this.silentRefresh(); // 后台静默更新
        return;
      }
      await this.requestStations();
    },

    async silentRefresh() {
      try {
        const data = await fetch('/api/stations').then(r => r.json());
        if (data.length > 0) this.list = data;
      } catch { /* 静默失败 */ }
    },

    async requestStations() {
      this.loading = true;
      try { this.list = await fetch('/api/stations').then(r => r.json()); }
      finally { this.loading = false; }
    },
  },
});
```

### 5.3 BFF 层注入

```javascript
// server/middleware/inject-initial-state.js
router.get('*', async (req, res, next) => {
  if (!req.headers.accept?.includes('text/html')) return next();

  const html = await getOriginalHtml(req.path);
  const [stations, userConfig] = await Promise.all([
    fetchFromUpstream('/api/stations'),
    fetchFromUpstream('/api/user/config'),
  ]);

  const injectedHtml = html.replace(
    '</head>',
    `<script>window.__INITIAL_STATE__ = ${JSON.stringify({ stations, userConfig })};</script></head>`
  );
  res.send(injectedHtml);
});
```

---

## 6. 综合实践：caidiaweb 首屏全链路优化

### 6.1 优化前后对比

```
优化前：
  请求 HTML(50ms) → 白屏(100ms) → 6个CSS阻塞(1.2s)
  → 下载 vendor(1.2MB, 3s) → JS执行(1.5s)
  → API请求(800ms) → 渲染图表(2s)
  FCP ~3s, LCP ~6s ❌

优化后：
  请求 HTML(30ms, CDN) → 骨架屏立即可见(20ms)
  → defer JS并行下载(1.5s) → 读取直出数据(0ms)
  → ECharts按需渲染(1s)
  FCP ~150ms ✅, LCP ~2s ✅
  提升：FCP -95%, LCP -67%
```

### 6.2 优化检查清单

```
□ 1. HTML 模板优化
     □ 内联关键 CSS（~3KB）
     □ 静态骨架屏写入 index.html
     □ <script defer> 延迟非关键 JS

□ 2. 资源预连接
     □ API 域名 preconnect
     □ CDN 域名 dns-prefetch
     □ 字体文件 preconnect + crossorigin

□ 3. 关键资源预加载
     □ 背景图/Logo preload
     □ Vue/Element Plus preload

□ 4. 首屏数据直出
     □ BFF 层注入 window.__INITIAL_STATE__
     □ Store 优先读取直出数据
     □ 后台静默刷新

□ 5. 页面预加载
     □ 侧边栏菜单启用 quicklink
     □ 高频页面手动 prefetch

□ 6. 骨架屏
     □ 每个核心页面定制骨架屏组件
     □ <Suspense> + defineAsyncComponent 集成

□ 7. 验证
     □ Lighthouse → Performance ≥ 90
     □ FCP < 300ms, LCP < 2.5s
```

---

## 7. 面试高频考点

### Q1：骨架屏的实现原理？

本质是用**静态占位元素模拟页面真实结构**，在数据加载前给用户视觉反馈。三种方式：静态 HTML 写入 `index.html`、组件方式（`defineAsyncComponent` + `<Suspense>`）、自动生成（Puppeteer 截图转 SVG）。

### Q2：SSR 和预渲染的区别？caidiaweb 适合哪个？

| 维度 | SSR | 预渲染 |
|------|-----|--------|
| 执行时机 | 每次请求动态渲染 | 构建时静态生成 |
| 动态数据 | 支持 | 不支持 |
| 服务器开销 | 高 | 无 |

caidiaweb 是数据大屏系统（内部工具），不需要 SEO，推荐 **CSR + 骨架屏 + 首屏数据直出**。

### Q3：关键 CSS 内联的最佳大小？

**2-4KB**。超过 14KB 触达 TCP 慢启动阈值，反而不如外链 + HTTP/2 多路复用。

### Q4：quicklink 和 `<link rel="prefetch">` 的区别？

- `<link rel="prefetch">`：静态声明，写死 URL
- quicklink：运行时动态检测视口内链接并智能预取

### Q5：首屏直出数据的安全性？

- 直出数据 = 用户可见数据，无额外安全风险
- 不直出密码/Token/内部配置
- 加入时间戳判断数据新鲜度

---

> **动手建议**：先写一个 `TechFacilitySkeleton.vue` 组件，用 `<Suspense>` 接入技术设施页面，然后打开 Performance 面板录制加载，对比 FCP 是否从秒级降到毫秒级。
