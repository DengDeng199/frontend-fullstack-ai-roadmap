# 3.2 资源加载优化

> 前端性能优化 · 关键渲染路径、懒加载、预加载、资源优先级

---

## 目录

1. [关键渲染路径优化](#1-关键渲染路径优化)
2. [图片懒加载](#2-图片懒加载)
3. [组件懒加载](#3-组件懒加载)
4. [路由懒加载](#4-路由懒加载)
5. [预加载策略](#5-预加载策略)
6. [资源优先级控制](#6-资源优先级控制)
7. [综合实践：caidiaweb 首页加载优化](#7-综合实践caidiaweb-首页加载优化)
8. [面试高频考点](#8-面试高频考点)

---

## 1. 关键渲染路径优化

### 1.1 什么是关键渲染路径

关键渲染路径（Critical Rendering Path）是浏览器将 HTML/CSS/JS 转换为屏幕上像素所经历的**最小步骤序列**。优化的核心是：**减少阻塞渲染的资源数量和大小**。

```
┌──────────────────────────────────────────────────────┐
│                 关键渲染路径                            │
│                                                      │
│  HTML ──► DOM 树                                      │
│            │                                         │
│  CSS  ──► CSSOM 树 ──► Render Tree ──► Layout ──► Paint
│            │         (合二为一)                        │
│  JS  ──► 阻塞解析  (可操作 DOM + CSSOM)                │
│                                                      │
│  🔴 阻塞渲染：CSS（必然）、同步 JS                        │
│  🟡 阻塞解析：同步 JS                                   │
└──────────────────────────────────────────────────────┘
```

### 1.2 识别关键资源

```javascript
// 利用 Performance API 分析资源加载顺序
function analyzeRenderBlocking() {
  const resources = performance.getEntriesByType('resource');

  const renderBlocking = resources.filter(r => {
    // CSS 文件：阻塞渲染
    if (r.initiatorType === 'css' || r.name.endsWith('.css')) return true;
    // 同步 JS 文件：阻塞解析
    if (r.initiatorType === 'script' && !r.name.includes('async') && !r.name.includes('defer')) return true;
    return false;
  });

  console.table(renderBlocking.map(r => ({
    name: r.name.split('/').pop(),
    type: r.initiatorType,
    duration: `${r.duration.toFixed(0)}ms`,
    transferSize: `${(r.transferSize / 1024).toFixed(1)}KB`,
    isBlocking: '✅'
  })));

  return renderBlocking;
}

window.addEventListener('load', () => {
  setTimeout(analyzeRenderBlocking, 2000);
});
```

### 1.3 优化策略速查

| 策略 | 对象 | 手段 | 效果 |
|------|------|------|------|
| 内联关键 CSS | 首屏样式 | `<style>` 内联 | 消除 CSS 网络请求 |
| 延迟非关键 CSS | 非首屏样式 | `media="print" onload="this.media='all'"` | 不阻塞首次渲染 |
| JS async | 独立脚本 | `<script async>` | 不阻塞解析 |
| JS defer | 依赖 DOM 脚本 | `<script defer>` | 延迟到解析完成后执行 |
| 减少资源数 | 小文件 | 合并 + HTTP/2 多路复用 | 减少连接开销 |
| 压缩资源 | JS/CSS/HTML | Gzip/Brotli + Minify | 减少传输体积 |

### 1.4 CSS 加载策略实战

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>资源加载优化示例</title>

  <!-- 策略1：内联关键 CSS（首屏必须，约 2-3KB） -->
  <style>
    /* 只包含首屏可见区域的样式 */
    :root { --primary: #1890ff; }
    body { margin: 0; font-family: -apple-system, sans-serif; }
    .header { background: var(--primary); color: #fff; padding: 16px; display: flex; align-items: center; }
    .sidebar { width: 240px; background: #001529; min-height: 100vh; }
    .content { flex: 1; padding: 24px; }
    .skeleton { background: #f0f0f0; border-radius: 4px; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
  </style>

  <!-- 策略2：预加载完整 CSS（不阻塞渲染） -->
  <link rel="preload" href="/styles/full.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/styles/full.css"></noscript>

  <!-- 策略3：根据 media 条件加载（仅打印时应用） -->
  <link rel="stylesheet" href="/styles/print.css" media="print">

  <!-- 策略4：移动端才加载（不影响桌面端渲染路径） -->
  <link rel="stylesheet" href="/styles/mobile.css" media="screen and (max-width: 768px)">
</head>
<body>
  <div class="header">技术设施管理系统</div>
  <div style="display:flex">
    <div class="sidebar"><!-- 侧边栏 --></div>
    <div class="content">
      <!-- 骨架屏：即使 CSS 未加载，也有基础结构 -->
      <div class="skeleton" style="height:200px"></div>
      <div class="skeleton" style="height:32px;margin-top:16px;width:60%"></div>
    </div>
  </div>
  <script src="/app.js" defer></script>
</body>
</html>
```

### 1.5 JS 加载策略对比

```
Timeline（HTML 解析过程）：

【普通 <script>】
解析 ──┬── 下载+执行JS ──┬── 继续解析
      │   (阻塞解析)     │
      
【<script async>】
解析 ──┬── 下载JS ──┬── 执行JS ──┬── 继续解析
      │   (并行)    │ (阻塞解析) │
      
【<script defer>】
解析 ──┬── 下载JS(并行) ────────────┬── 按序执行JS
      │                             │ (解析完成后)
```

```html
<!-- 场景选择指南 -->

<!-- 无关紧要的分析脚本 → async -->
<script async src="https://www.googletagmanager.com/gtag/js"></script>

<!-- 不依赖DOM / 不依赖其他脚本的独立库 → async -->
<script async src="/lib/standalone-chart.js"></script>

<!-- 需要DOM完整、需要按顺序执行 → defer -->
<script defer src="/lib/vue.js"></script>
<script defer src="/lib/element-plus.js"></script>
<script defer src="/app.js"></script>

<!-- 必须立即执行的内联脚本 → 放 body 底部 -->
<script>
  // 小的初始化逻辑
  document.documentElement.classList.add('js-loaded');
</script>
```

---

## 2. 图片懒加载

### 2.1 策略对比

```
┌────────────────────────────────────────────────────┐
│              图片懒加载方案对比                       │
├──────────────┬───────────────┬─────────────────────┤
│    方案       │     优点      │        缺点          │
├──────────────┼───────────────┼─────────────────────┤
│ loading=lazy │  零代码       │ Safari 早期版本不支持 │
│              │  浏览器原生    │ 不可自定义距离/占位   │
├──────────────┼───────────────┼─────────────────────┤
│ Intersection │  完全可控     │ 需要 JS              │
│ Observer     │  可设触发距离   │ 需要 polyfill       │
├──────────────┼───────────────┼─────────────────────┤
│ 第三方库     │  功能丰富     │ 增加体积             │
│ (lazysizes) │  兼容性好     │                      │
└──────────────┴───────────────┴─────────────────────┘
```

### 2.2 原生 loading="lazy"（推荐首选）

```html
<!-- 最简单的懒加载 -->
<img src="dashboard.png" loading="lazy" alt="仪表盘" />

<!-- loading 属性值 -->
<!-- lazy：延迟加载，直到图片接近视口 -->
<!-- eager：立即加载（默认行为） -->

<!-- 同时设置尺寸，避免 CLS -->
<img
  src="dashboard.png"
  loading="lazy"
  width="800"
  height="600"
  alt="仪表盘"
  decoding="async"
/>
<!-- decoding="async" 让图片解码不阻塞主线程 -->
```

### 2.3 IntersectionObserver 自定义方案

```javascript
// utils/lazyLoad.js — 带占位图 + 渐入效果的懒加载

class LazyLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: '200px 0px',  // 提前 200px 开始加载
      threshold: 0.01,
      placeholder: 'data:image/svg+xml,...', // 默认占位图
      fadeIn: true,
      ...options,
    };

    this.observer = new IntersectionObserver(
      this.handleIntersect.bind(this),
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold,
      }
    );
  }

  observe(container = document) {
    const images = container.querySelectorAll('img[data-src]');
    images.forEach(img => {
      // 设置占位图
      if (this.options.placeholder) {
        img.src = this.options.placeholder;
      }
      this.observer.observe(img);
    });
  }

  handleIntersect(entries) {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const img = entry.target;
      const src = img.dataset.src;
      
      if (!src) return;

      // 停止观察
      this.observer.unobserve(img);

      // 加载真实图片
      const tempImage = new Image();
      tempImage.onload = () => {
        img.src = src;
        img.removeAttribute('data-src');
        
        if (this.options.fadeIn) {
          img.style.transition = 'opacity 0.4s ease-in';
          img.style.opacity = '1';
        }
      };
      tempImage.onerror = () => {
        // 加载失败回退
        img.src = '/images/fallback.png';
        img.classList.add('img-error');
      };
      tempImage.src = src;
    });
  }

  destroy() {
    this.observer.disconnect();
  }
}

// 用法：
const lazyLoader = new LazyLoader({
  rootMargin: '200px 0px',
  fadeIn: true,
});
lazyLoader.observe();
```

```html
<!-- 配合自定义懒加载的 HTML -->
<img
  data-src="/images/dashboard.png"
  width="800"
  height="600"
  alt="仪表盘"
  style="opacity: 0"
/>

<!-- 背景图懒加载 -->
<div
  class="bg-hero"
  data-bg="/images/hero.jpg"
  style="min-height: 400px; background: #f0f0f0; background-size: cover;"
></div>
```

```javascript
// 背景图懒加载（配合上述 LazyLoader 扩展）
class BgLazyLoader extends LazyLoader {
  handleIntersect(entries) {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      
      const el = entry.target;
      const bgUrl = el.dataset.bg;
      
      if (!bgUrl) return;
      
      this.observer.unobserve(el);
      
      const tempImage = new Image();
      tempImage.onload = () => {
        el.style.backgroundImage = `url(${bgUrl})`;
        el.removeAttribute('data-bg');
        if (this.options.fadeIn) {
          el.style.transition = 'opacity 0.4s ease-in';
          el.style.opacity = '1';
        }
      };
      tempImage.onerror = () => {
        el.style.backgroundImage = 'url(/images/fallback.png)';
      };
      tempImage.src = bgUrl;
    });
  }
}
```

### 2.4 视频懒加载

```html
<!-- 视频封面懒加载（使用 poster 占位） -->
<video
  poster="/images/video-poster.jpg"
  controls
  preload="none"
  width="640"
  height="360"
>
  <source data-src="/videos/tutorial.mp4" type="video/mp4">
</video>

<script>
// 视频懒加载
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    
    const video = entry.target;
    // 加载 source
    const sources = video.querySelectorAll('source[data-src]');
    sources.forEach(source => {
      source.src = source.dataset.src;
    });
    video.load(); // 触发加载
    video.style.preload = 'metadata';
    
    videoObserver.unobserve(video);
  });
}, { rootMargin: '200px' });

document.querySelectorAll('video[preload="none"]').forEach(v => {
  videoObserver.observe(v);
});
</script>
```

---

## 3. 组件懒加载

### 3.1 Vue 组件懒加载

```javascript
// components/charts/index.js — 图表组件懒加载方案

import { defineAsyncComponent } from 'vue';
import ChartSkeleton from './ChartSkeleton.vue';

// 方案1：defineAsyncComponent 基础用法
const TechFacilityDashboard = defineAsyncComponent(() =>
  import('./TechFacilityDashboard.vue')
);

// 方案2：带加载状态 + 错误处理
const TechFacilityDashboard = defineAsyncComponent({
  loader: () => import('./TechFacilityDashboard.vue'),
  loadingComponent: ChartSkeleton,    // 加载中显示的骨架屏
  errorComponent: ChartError,         // 加载失败显示的错误组件
  delay: 200,                          // 200ms 后才显示 loading（避免闪烁）
  timeout: 10000,                      // 10s 超时
  suspensible: false,                  // 不使用 <Suspense>
});

// 方案3：条件懒加载（结合 IntersectionObserver）
// composables/useLazyComponent.js
import { ref, shallowRef } from 'vue';

export function useLazyComponent(importFn, options = {}) {
  const component = shallowRef(options.loadingComponent || null);
  const isLoading = ref(false);
  const hasError = ref(false);

  async function load() {
    if (component.value !== options.loadingComponent && component.value !== null) return;
    
    isLoading.value = true;
    try {
      const mod = await importFn();
      component.value = mod.default;
      hasError.value = false;
    } catch (err) {
      console.error('组件加载失败:', err);
      hasError.value = true;
    } finally {
      isLoading.value = false;
    }
  }

  return { component, isLoading, hasError, load };
}
```

```vue
<!-- pages/TechFacility.vue — 使用懒加载组件的页面 -->
<template>
  <div class="tech-facility-page">
    <!-- 仅首屏可见的组件：立即加载 -->
    <TechFacilityOverview />

    <!-- 非首屏的图表组件：懒加载 -->
    <div ref="chartSection" class="chart-section">
      <component
        :is="chartComponent"
        v-if="chartComponent"
        :data="chartData"
      />
      <ChartSkeleton v-else style="height: 400px" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import TechFacilityOverview from './TechFacilityOverview.vue';
import ChartSkeleton from './ChartSkeleton.vue';

const chartComponent = ref(null);
const chartData = ref(null);
const chartSection = ref(null);
let observer = null;

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      // 用户滚动到图表区域时才加载
      import('./TechFacilityChart.vue').then(mod => {
        chartComponent.value = mod.default;
      });
      fetchChartData().then(data => {
        chartData.value = data;
      });
      observer.disconnect();
    }
  }, { rootMargin: '300px' });

  observer.observe(chartSection.value);
});

async function fetchChartData() {
  const res = await fetch('/api/tech-facility/chart-data');
  return res.json();
}
</script>
```

### 3.2 React 组件懒加载

```jsx
// React 组件懒加载
import React, { lazy, Suspense } from 'react';

// 基础用法
const TechFacilityDashboard = lazy(() => import('./TechFacilityDashboard'));

// 使用 Suspense 包裹
function App() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: 400 }} />}>
      <TechFacilityDashboard />
    </Suspense>
  );
}
```

---

## 4. 路由懒加载

### 4.1 Vue Router 路由懒加载

```javascript
// router/index.js — Vue Router 懒加载方案

import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ❌ 静态导入：所有组件打包进同一个 chunk
    // import TechFacility from '@/views/TechFacility.vue'

    // ✅ 动态导入：每个路由独立 chunk
    {
      path: '/tech-facility',
      name: 'TechFacility',
      component: () => import(/* webpackChunkName: "tech-facility" */ '@/views/TechFacility.vue'),
      meta: { title: '技术设施', preload: true },  // 标记需要预加载
    },
    {
      path: '/spectrum',
      name: 'Spectrum',
      component: () => import(/* webpackChunkName: "spectrum" */ '@/views/Spectrum.vue'),
    },
    {
      path: '/statistics',
      name: 'Statistics',
      component: () => import(/* webpackChunkName: "statistics" */ '@/views/Statistics.vue'),
    },

    // 嵌套路由也可懒加载
    {
      path: '/settings',
      component: () => import('@/views/SettingsLayout.vue'),
      children: [
        {
          path: 'profile',
          component: () => import('@/views/settings/Profile.vue'),
        },
        {
          path: 'security',
          component: () => import('@/views/settings/Security.vue'),
        },
      ],
    },
  ],
});

// 路由守卫中预加载关联路由
router.beforeEach((to, from, next) => {
  // 如果目标路由标记了 preload（用户很可能下一步访问），预加载关联路由
  if (to.meta.preload) {
    const relatedRoutes = ['Spectrum', 'Statistics'];
    relatedRoutes.forEach(name => {
      const route = router.resolve({ name });
      if (route.matched.length) {
        // 触发预加载（实际 chunk 由动态 import 缓存机制保证不重复加载）
        import(/* webpackChunkName: "[request]" */ `@/views/${name}.vue`)
          .catch(() => {}); // 预加载失败不阻塞导航
      }
    });
  }
  next();
});

export default router;
```

### 4.2 Vite 中路由懒加载的差异

```javascript
// Vite 默认使用 Rollup 打包，不需要 webpackChunkName 注释
// 但可以用 /* 自定义命名 */ 的方式

const routes = [
  {
    path: '/tech-facility',
    // Vite 方式：通过文件路径自动分块，可用魔法注释
    component: () => import('@/views/TechFacility.vue'),
  },
];

// Vite 中控制分块的配置 (vite.config.js)
export default {
  build: {
    rollupOptions: {
      output: {
        // 手动控制 chunk 划分
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-ui': ['element-plus'],
          'vendor-charts': ['echarts'],
          'tech-facility': ['./src/views/TechFacility.vue'],
        },
      },
    },
  },
};
```

---

## 5. 预加载策略

### 5.1 三种预加载 `rel` 对比

```
┌──────────────────────────────────────────────────────────┐
│                   预加载策略全景                          │
│                                                          │
│  preconnect   ─►  预连接域名（DNS+TCP+TLS）                │
│  （提前握手）     适用：CDN、API、字体                     │
│                  用法：<link rel="preconnect" href="">    │
│                                                          │
│  preload      ─►  预加载当前页面关键资源                   │
│  （提前下载）     适用：首屏字体、Hero 图、关键 CSS/JS      │
│                  用法：<link rel="preload" href="" as=""> │
│                                                          │
│  prefetch     ─►  预取下一页可能需要的资源                 │
│  （空闲时下载）   适用：下一页的 JS chunk、可能访问的资源    │
│                  用法：<link rel="prefetch" href="">      │
│                                                          │
│  dns-prefetch ─►  仅 DNS 预解析（比 preconnect 轻）       │
│  （仅DNS）        适用：可能用到的第三方域名                 │
│                  用法：<link rel="dns-prefetch" href="">  │
└──────────────────────────────────────────────────────────┘
```

### 5.2 preconnect 实战

```html
<head>
  <!-- 预连接 API 域名（提前完成 DNS + TCP + TLS） -->
  <link rel="preconnect" href="https://api.caidiaweb.com">
  
  <!-- 预连接 CDN 域名 -->
  <link rel="preconnect" href="https://cdn.caidiaweb.com">
  
  <!-- 预连接外部字体服务 -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <!-- ⚠️ 使用 crossorigin 确保 CORS 字体请求复用连接 -->

  <!-- dns-prefetch：仅做 DNS 解析（开销更小的替代方案） -->
  <link rel="dns-prefetch" href="https://analytics.caidiaweb.com">
</head>
```

**选择 preconnect 还是 dns-prefetch？**

| 场景 | 推荐 | 原因 |
|------|------|------|
| 确定性资源（字体、API） | preconnect | 值得完成 TCP+TLS 握手 |
| 可能的资源（第三方统计） | dns-prefetch | 节省开销，只做 DNS |

### 5.3 preload 实战

```html
<head>
  <!-- ===== preload 使用场景 ===== -->

  <!-- 1. 预加载关键字体（必须加 crossorigin） -->
  <link rel="preload" href="/fonts/OpenSans-Regular.woff2" as="font" type="font/woff2" crossorigin>

  <!-- 2. 预加载首屏大图（Hero 图） -->
  <link rel="preload" href="/images/hero-banner.avif" as="image" type="image/avif">

  <!-- 3. 预加载关键 JS chunk -->
  <link rel="preload" href="/assets/tech-facility.js" as="script">

  <!-- 4. 预加载关键 CSS（然后异步加载） -->
  <link rel="preload" href="/styles/critical.css" as="style" onload="this.rel='stylesheet'">

  <!-- 5. 预加载 JSON 数据 -->
  <link rel="preload" href="/api/config" as="fetch" crossorigin>
</head>
```

**preload 的重要规则**：
- 必须指定 `as` 属性（告诉浏览器资源类型，决定优先级）
- 如果不设置 `as`，浏览器会以最低优先级下载
- `crossorigin` 对字体是必须的（CORS 请求）

### 5.4 prefetch 实战

```html
<head>
  <!-- 预取下一页可能访问的路由 JS -->
  <link rel="prefetch" href="/assets/statistics.js">
  <link rel="prefetch" href="/assets/spectrum.js">
</head>
```

```javascript
// Vue Router 中自动 prefetch
// 方法1：quicklink 库（智能预取，只预取视口内的链接）
import { listen } from 'quicklink';

// 在路由切换后调用
router.afterEach(() => {
  // 等待渲染完成
  setTimeout(() => {
    listen({
      el: document.getElementById('app'),
      origins: ['caidiaweb.com'], // 只预取同域链接
      ignores: [/logout/, /\/api\//], // 忽略 API 和登出链接
    });
  }, 0);
});

// 方法2：手动在 <router-link> 悬停时 prefetch
const routerLinkObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const link = entry.target;
      const href = link.getAttribute('href');
      
      if (href) {
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'prefetch';
        prefetchLink.href = href;
        document.head.appendChild(prefetchLink);
      }
      
      routerLinkObserver.unobserve(link);
    }
  });
}, { rootMargin: '200px' });

// 观察所有路由链接
document.querySelectorAll('a[href^="/"]').forEach(link => {
  routerLinkObserver.observe(link);
});
```

### 5.5 预加载策略决策树

```
需要预加载的资源是什么？
│
├── 当前页面必须的资源（字体、Hero 图）
│   └── 使用 preload（高优先级，立即下载）
│
├── 来自第三方域名的资源
│   ├── 确定会使用 → preconnect
│   └── 可能使用 → dns-prefetch
│
└── 下一页可能需要的资源
    ├── 用户大概率访问 → prefetch（空闲时下载）
    └── 确定性访问 → preload（但会占用当前页面带宽）
```

---

## 6. 资源优先级控制

### 6.1 fetchpriority 属性

```html
<!-- fetchpriority 是 Chrome 101+ 支持的属性，影响请求优先级 -->
<!-- 值：high / low / auto（默认） -->

<!-- 🔴 提升 LCP 图片优先级 -->
<img src="/hero.jpg" fetchpriority="high" />

<!-- 🟡 降低非关键图片优先级 -->
<img src="/footer-logo.png" fetchpriority="low" loading="lazy" />

<!-- 预加载 + 高优先级 = 最优先 -->
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high" />

<!-- 降低不重要脚本的优先级 -->
<script src="/analytics.js" async fetchpriority="low"></script>
```

### 6.2 浏览器默认优先级

```
资源优先级（高 → 低）：

   高优先级
   ├── HTML（主文档）
   ├── CSS（阻塞渲染）
   ├── 字体（preload 的字体）
   ├── 视口内图片
   │
   中优先级
   ├── <script>（正文末尾，非 async）
   ├── fetch() / XHR
   ├── 视口外图片
   │
   低优先级
   ├── async script
   ├── 图片（lazy loading）
   ├── prefetch 资源
   ├── 视频 / 音频
```

### 6.3 在 DevTools 中查看优先级

```
Network 面板操作：
1. 刷新页面后，Network 面板右键表头
2. 勾选 "Priority" 列
3. 可以看到每个资源的优先级：Highest / High / Medium / Low / Lowest

关键观察：
- LCP 图片的优先级是否最高？
- 是否有低优先级资源抢夺了 LCP 资源的带宽？
```

---

## 7. 综合实践：caidiaweb 首页加载优化

### 7.1 优化前的首页结构

```
caidiaweb 首页（数据自动采集分析展示系统）
├── 顶部导航栏（logo + 菜单）
├── 统计卡片区（4 个卡片：在线率、使用率、设备数等）
├── 地图区域（ECharts 地图 + 157 个区县标记）
├── 图表区（柱状图 + 仪表盘）
└── 底部信息
```

### 7.2 优化清单与代码

```html
<!-- public/index.html — 优化后的模板 -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>技术设施专题 - 数据采集分析展示系统</title>

  <!-- ===== 第1步：preconnect 预连接 ===== -->
  <link rel="preconnect" href="https://api.caidiaweb.com">
  <link rel="dns-prefetch" href="https://cdn.caidiaweb.com">

  <!-- ===== 第2步：preload 关键资源 ===== -->
  <!-- 首屏背景图（LCP 候选） -->
  <link rel="preload" href="/images/dashboard-bg.webp" as="image" type="image/webp" fetchpriority="high">
  <!-- 关键 CSS -->
  <link rel="preload" href="/css/critical.css" as="style" onload="this.rel='stylesheet'">

  <!-- ===== 第3步：内联关键 CSS ===== -->
  <style>
    :root { --primary: #1890ff; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: #f0f2f5; }
    .app-header { background: linear-gradient(135deg, #0a1628, #1a3a5c); color: #fff; padding: 0 24px; height: 56px; display: flex; align-items: center; }
    .app-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 20px; }
    .stat-card { background: #fff; border-radius: 8px; padding: 20px; min-height: 120px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  </style>

  <!-- ===== 第4步：延迟加载非关键 CSS ===== -->
  <link rel="preload" href="/css/full.css" as="style" onload="this.onload=null;this.rel='stylesheet'">

  <!-- ===== 第5步：ECharts 按需引入（而非全量） ===== -->
  <!-- 不在 index.html 中引入 ECharts，改为在组件中动态 import -->
</head>
<body>
  <div id="app">
    <!-- 首屏骨架屏：立即显示，不依赖 JS -->
    <div class="app-header">技术设施管理系统</div>
    <div class="app-grid">
      <div class="stat-card"><div class="skeleton" style="height:16px;width:60%"></div><div class="skeleton" style="height:32px;width:40%;margin-top:12px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:16px;width:60%"></div><div class="skeleton" style="height:32px;width:40%;margin-top:12px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:16px;width:60%"></div><div class="skeleton" style="height:32px;width:40%;margin-top:12px"></div></div>
      <div class="stat-card"><div class="skeleton" style="height:16px;width:60%"></div><div class="skeleton" style="height:32px;width:40%;margin-top:12px"></div></div>
    </div>
  </div>

  <!-- ===== 第6步：JS 按优先级加载 ===== -->
  <!-- 关键 JS：defer（不阻塞解析，保持执行顺序） -->
  <script src="/js/runtime.js" defer></script>
  <script src="/js/vendor-vue.js" defer></script>
  <script src="/js/vendor-charts.js" defer></script>
  <script src="/js/app.js" defer></script>

  <!-- 非关键 JS：async + 低优先级 -->
  <script src="/js/analytics.js" async fetchpriority="low"></script>
</body>
</html>
```

### 7.3 界面图片懒加载改造

```vue
<!-- components/LazyImage.vue — 通用懒加载图片组件 -->
<template>
  <div class="lazy-image-wrapper" :style="{ aspectRatio: `${width}/${height}` }">
    <img
      v-if="loaded"
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      class="lazy-image"
      :class="{ 'fade-in': fadeIn }"
    />
    <div v-else class="lazy-placeholder">
      <!-- 低质量占位图 或 骨架 -->
      <div class="placeholder-shimmer" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  width: { type: Number, default: 800 },
  height: { type: Number, default: 600 },
  fadeIn: { type: Boolean, default: true },
});

const loaded = ref(false);
let observer = null;

onMounted(() => {
  // 优先使用原生 loading="lazy"
  if ('loading' in HTMLImageElement.prototype) {
    loaded.value = true;
    return;
  }

  // 降级：IntersectionObserver
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        loaded.value = true;
        observer.disconnect();
      }
    },
    { rootMargin: '200px' }
  );
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<style scoped>
.lazy-image-wrapper {
  position: relative;
  overflow: hidden;
  background: #f5f5f5;
}
.lazy-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.lazy-image.fade-in {
  animation: lazyFadeIn 0.4s ease-in;
}
@keyframes lazyFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.placeholder-shimmer {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>
```

### 7.4 优化效果对比表（模板）

```
┌──────────────────────────────────────────────────────┐
│              优化前后指标对比                          │
├────────────────┬────────────┬───────────┬───────────┤
│     指标        │   优化前    │   优化后    │   提升    │
├────────────────┼────────────┼───────────┼───────────┤
│ FCP            │  ______s   │  ______s  │  ___%     │
│ LCP            │  ______s   │  ______s  │  ___%     │
│ JS 总大小       │  _____KB   │  _____KB  │  ___%     │
│ CSS 总大小      │  _____KB   │  _____KB  │  ___%     │
│ 图片总大小      │  _____KB   │  _____KB  │  ___%     │
│ 首屏 JS chunk   │  _____KB   │  _____KB  │  ___%     │
│ 阻塞渲染资源数  │  _____个    │  _____个   │  ___%     │
└────────────────┴────────────┴───────────┴───────────┘
```

---

## 8. 面试高频考点

### Q1：async 和 defer 的区别？什么时候用哪个？

| 维度 | async | defer |
|------|-------|-------|
| 下载时机 | 立即下载（不阻塞解析） | 立即下载（不阻塞解析） |
| 执行时机 | **下载完立即执行**（可能中断解析） | **HTML 解析完成后、DOMContentLoaded 之前执行** |
| 执行顺序 | 不确定（谁先下载完谁先执行） | 按照在 HTML 中的出现顺序 |
| 适用场景 | 独立第三方脚本（统计、广告） | 依赖 DOM、需要按序执行的脚本 |

### Q2：preload 和 prefetch 的核心区别？

- **preload**：告诉浏览器"这个资源**当前页面马上要用**"，以高优先级立即下载
- **prefetch**：告诉浏览器"这个资源**下一页可能要用**"，在浏览器空闲时以低优先级下载
- **关键**：preload 会消耗当前页面带宽，prefetch 不影响当前页面加载

### Q3：为什么要内联关键 CSS？内联多少合适？

- **目的**：消除 CSS 文件的网络请求，让首屏样式以最快速度生效
- **大小**：建议 **2-3KB**（经过压缩）。超过 14KB 会触达 TCP 慢启动阈值，反而不如外链
- **方法**：手动挑选 + 构建时自动提取（critters 插件）

### Q4：loading="lazy" 和 IntersectionObserver 懒加载如何选？

| 场景 | 推荐 |
|------|------|
| 简单图片懒加载，不需要自定义 | `loading="lazy"`（零代码） |
| 需要自定义触发距离 | IntersectionObserver |
| 需要加载占位图/渐变效果 | IntersectionObserver |
| 需要兼容老浏览器 | IntersectionObserver + polyfill |

### Q5：如何量化资源加载优化的效果？

```
量化手段：
1. Chrome DevTools → Network → 按优先级排序 → 查看阻塞渲染资源
2. Lighthouse → Opportunities 部分 → "Eliminate render-blocking resources"
3. web.dev/measure → 输入 URL 在线审计
4. 自定义指标：首屏 JS 体积、关键 CSS 体积、非关键资源延迟时间
```

---

> **动手建议**：用 Chrome DevTools 的 Coverage 面板（Ctrl+Shift+P → Show Coverage）录制 caidiaweb 首页加载过程，查看哪些 CSS/JS 代码从未被使用（红色区域），这些就是可以移除或延迟加载的冗余代码。
