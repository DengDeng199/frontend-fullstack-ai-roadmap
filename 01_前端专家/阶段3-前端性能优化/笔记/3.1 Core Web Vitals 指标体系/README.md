# 3.1 Core Web Vitals 指标体系

> 前端性能优化 · Web 核心性能指标 · 采集、解读与优化

---

## 目录

1. [Core Web Vitals 是什么](#1-core-web-vitals-是什么)
2. [LCP — 最大内容绘制](#2-lcp--最大内容绘制)
3. [INP — 交互响应延迟](#3-inp--交互响应延迟)
4. [CLS — 累积布局偏移](#4-cls--累积布局偏移)
5. [FCP — 首次内容绘制](#5-fcp--首次内容绘制)
6. [TTFB — 首字节时间](#6-ttfb--首字节时间)
7. [指标采集方案](#7-指标采集方案)
8. [数据上报与监控](#8-数据上报与监控)
9. [实践：在 caidiaweb 中接入性能监控](#9-实践在-caidiaweb-中接入性能监控)
10. [面试高频考点](#10-面试高频考点)

---

## 1. Core Web Vitals 是什么

### 1.1 概念

Core Web Vitals 是 Google 提出的**衡量 Web 用户体验的核心指标集合**，统一了页面加载、交互、视觉稳定性的评价标准。Google 将其纳入搜索排名因素。

### 1.2 三大核心 + 两个辅助

```
┌─────────────────────────────────────────────────────┐
│               Core Web Vitals                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🎯 核心指标（直接影响搜索排名）                      │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐          │
│  │    LCP    │ │    INP    │ │    CLS    │          │
│  │ 最大内容   │ │ 交互响应   │ │ 布局偏移   │          │
│  │   绘制     │ │   延迟     │ │           │          │
│  └───────────┘ └───────────┘ └───────────┘          │
│                                                     │
│  📊 辅助指标（补充参考）                              │
│  ┌───────────┐ ┌───────────┐                       │
│  │    FCP    │ │   TTFB    │                       │
│  │ 首次内容   │ │ 首字节     │                       │
│  │   绘制     │ │   时间     │                       │
│  └───────────┘ └───────────┘                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 1.3 指标总览速查表

| 指标 | 全称 | 测量什么 | 优秀 | 需要改进 | 差 |
|------|------|---------|------|---------|-----|
| **LCP** | Largest Contentful Paint | 加载速度 | ≤ 2.5s | ≤ 4s | > 4s |
| **INP** | Interaction to Next Paint | 交互响应 | ≤ 200ms | ≤ 500ms | > 500ms |
| **CLS** | Cumulative Layout Shift | 视觉稳定性 | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| FCP | First Contentful Paint | 首次绘制 | ≤ 1.8s | ≤ 3s | > 3s |
| TTFB | Time to First Byte | 服务器响应 | ≤ 800ms | ≤ 1800ms | > 1800ms |

---

## 2. LCP — 最大内容绘制

### 2.1 什么是 LCP

LCP 测量页面**视口内最大可见元素**渲染完成的时间。它回答："用户多久能看到页面的主要内容？"

```
页面加载时间轴：

0ms           FCP(1.2s)       LCP(2.1s)        完全加载
│               │                │                │
├───────────────┼────────────────┼────────────────┤
│   白屏        │  首屏文字出现   │  大图/Hero 渲染 │
│               │   (FCP)        │   (LCP)        │
└───────────────┴────────────────┴────────────────┘
                ↑ 用户开始感知     ↑ 用户感觉"有用了"
```

### 2.2 LCP 测量哪些元素

```html
<!-- LCP 候选元素 -->
<img src="hero-banner.jpg" />              <!-- ✅ 大图 -->
<image> <!-- SVG 中的 -->                   <!-- ✅ SVG 图片 -->
<video poster="thumbnail.jpg">             <!-- ✅ 视频封面 -->
<div style="background-image: url(...)">   <!-- ✅ 背景图(带url) -->
<h1>大标题</h1>                             <!-- ✅ 大块文本 -->
```

**注意**：元素必须处于视口内、未被裁剪、未被其他元素完全遮挡才会被考虑。

### 2.3 LCP 优化策略

```javascript
// 🔴 问题1：图片加载过慢
// ✅ 方案：使用 CDN + 现代格式 + 响应式图片
<picture>
  <source srcset="/hero.avif" type="image/avif" />
  <source srcset="/hero.webp" type="image/webp" />
  <img src="/hero.jpg" alt="Hero" loading="eager" fetchpriority="high" />
</picture>

// 🔴 问题2：渲染阻塞资源导致延迟
// ✅ 方案：内联关键 CSS，延迟加载非关键 CSS
<link rel="preload" href="/styles/critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />

// 🔴 问题3：JS 阻塞渲染
// ✅ 方案：async/defer 延迟非关键 JS
<script src="/analytics.js" async></script>
<script src="/app.js" defer></script>

// 🔴 问题4：首屏数据通过 API 获取
// ✅ 方案：SSR 直出数据或预渲染关键 HTML
```

### 2.4 LCP 分解

```
LCP = TTFB + 资源加载延迟 + 资源加载时间 + 渲染延迟

四阶段优化：
├── TTFB 优化       → CDN、服务端缓存、边缘计算
├── 资源加载延迟     → preload、preconnect、减少重定向
├── 资源加载时间     → 压缩、CDN、缓存
└── 渲染延迟         → 去阻塞 JS/CSS、服务端渲染
```

---

## 3. INP — 交互响应延迟

### 3.1 什么是 INP

INP（2024年取代 FID）测量用户**整个生命周期内所有交互的延迟**。它回答："用户点击/输入后要等多久才有反应？"

```
用户点击按钮
     │
     ▼
┌─────────────┐
│  事件处理     │  input delay (从交互到处理开始)
│  (JS 执行)   │  processing time (事件处理器执行)
│  然后渲染     │  presentation delay (渲染更新)
└─────────────┘
     │
     ▼
  画面更新（下一帧）
  
INP = input delay + processing time + presentation delay
```

### 3.2 INP vs FID 对比

| 维度 | FID（旧） | INP（新） |
|------|---------|----------|
| 测量范围 | 仅首次交互 | 整个页面生命周期 |
| 数据点 | 只取第一次 | 取所有交互中最差的（或接近最差的） |
| 交互类型 | 仅点击/触摸 | 点击、按键、触摸都包含 |
| 代表性 | 可能遗漏主要问题 | 全面反映交互体验 |

### 3.3 INP 优化策略

```javascript
// 🔴 问题1：长任务阻塞主线程
// ✅ 方案：拆分长任务
function processLargeList(items) {
  const CHUNK_SIZE = 50;

  function processChunk(startIndex) {
    const endIndex = Math.min(startIndex + CHUNK_SIZE, items.length);
    for (let i = startIndex; i < endIndex; i++) {
      // 处理单个 item
      processItem(items[i]);
    }

    if (endIndex < items.length) {
      // 将剩余任务交给下一个空闲帧
      requestIdleCallback(() => processChunk(endIndex));
      // 或使用 scheduler.yield()
      // await scheduler.yield();
    }
  }

  processChunk(0);
}

// 🔴 问题2：点击后同步计算导致卡顿
// ✅ 方案：将重计算移到 Web Worker
// main.js
const worker = new Worker('/worker.js');
btn.addEventListener('click', () => {
  const data = getDataFromDOM();
  worker.postMessage(data);
});
worker.onmessage = (e) => {
  updateUI(e.data); // 只做轻量的 UI 更新
};

// 🔴 问题3：事件处理中大量 DOM 操作
// ✅ 方案：批量操作 + DocumentFragment
btn.addEventListener('click', () => {
  const fragment = document.createDocumentFragment();
  // ... 构建 fragment
  requestAnimationFrame(() => {
    container.appendChild(fragment);
  });
});
```

---

## 4. CLS — 累积布局偏移

### 4.1 什么是 CLS

CLS 测量页面**视觉稳定性**，即元素在页面加载过程中意外移动的程度。它回答："页面会不会在用户阅读时突然跳动？"

```
CLS = impact fraction × distance fraction

示例：一个广告从顶部挤下 200px
┌──────────────────────────┐
│    [ 广告 200px ]        │ ← 动态插入的广告
├──────────────────────────┤
│                          │
│  受影响区域(50%视口)      │  impact = 0.5
│                          │  distance = 200/800 = 0.25
│                          │  CLS = 0.5 × 0.25 = 0.125
│                          │
└──────────────────────────┘
```

### 4.2 常见 CLS 问题与解决

```html
<!-- 🔴 问题1：图片没有预留尺寸 -->
<img src="banner.jpg" alt="" />
<!-- ✅ 解决：设置 width/height 或 aspect-ratio -->
<img src="banner.jpg" alt="" width="1200" height="600" />
<!-- 或使用 CSS -->
<img src="banner.jpg" alt="" style="aspect-ratio: 2/1; width: 100%" />

<!-- 🔴 问题2：动态注入内容挤下已有内容 -->
<div id="ad-container"></div>
<!-- ✅ 解决：预留容器最小高度 -->
<div id="ad-container" style="min-height: 250px"></div>

<!-- 🔴 问题3：Web 字体加载导致文字闪烁(FOUT) -->
<link rel="preload" href="/fonts/open-sans.woff2" as="font" crossorigin />
<style>
  @font-face {
    font-family: 'Open Sans';
    src: url('/fonts/open-sans.woff2') format('woff2');
    font-display: swap; /* 关键！先显示回退字体 */
    /* font-display: optional; 也是好选项 */
  }
</style>

<!-- 🔴 问题4：CSS 动画修改 layout 属性 -->
<!-- ✅ 解决：固定元素宽度，动画只在顶部使用 transform -->
<style>
  .banner {
    width: 100%;
    /* 固定宽度，避免内容变化导致宽度跳动 */
  }
  .slide-in {
    animation: slideIn 0.3s ease-out;
  }
  @keyframes slideIn {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
</style>
```

```javascript
// 🔴 问题5：异步插入 iframe/广告
// ✅ 解决：预留空间 + 动画过渡
function injectAd(container) {
  // 先设置占位高度
  container.style.minHeight = '250px';
  
  const iframe = document.createElement('iframe');
  iframe.src = '/ad.html';
  
  iframe.onload = () => {
    // 加载完成后用动画显示
    iframe.style.opacity = '0';
    iframe.style.transition = 'opacity 0.3s';
    container.appendChild(iframe);
    requestAnimationFrame(() => {
      iframe.style.opacity = '1';
    });
  };
  
  container.appendChild(iframe);
}
```

---

## 5. FCP — 首次内容绘制

### 5.1 什么是 FCP

FCP 测量浏览器渲染**第一块 DOM 内容**的时间（文字、图片、Canvas 等）。它是用户感知到的"页面开始有东西了"的时刻。

```
时间轴：
0ms          TTFB(600ms)    FCP(1.2s)     LCP(2.1s)
│               │              │              │
├───────────────┼──────────────┼──────────────┤
│   白屏        │   HTML到达   │  首屏文字    │
```

### 5.2 FCP 优化

```html
<!-- 快速 FCP 的核心：减少关键路径上的阻塞 -->
<head>
  <!-- 1. 内联关键 CSS（首屏渲染必须的样式） -->
  <style>
    /* 只内联首屏必需样式 */
    body { margin: 0; font-family: sans-serif; }
    .header { background: #1890ff; padding: 16px; }
  </style>
  
  <!-- 2. 延迟加载非关键 CSS -->
  <link rel="preload" href="/styles/full.css" as="style" 
        onload="this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="/styles/full.css" /></noscript>
  
  <!-- 3. 预连接到关键域名 -->
  <link rel="preconnect" href="https://api.caidiaweb.com" />
  <link rel="preconnect" href="https://cdn.caidiaweb.com" />
  
  <!-- 4. async/defer 延迟 JS -->
  <script src="/app.js" defer></script>
</head>

<body>
  <!-- 5. 首屏内容尽早出现 -->
  <div class="header">技术设施管理系统</div>
  <div id="app">
    <!-- 骨架屏占位，快速 FCP -->
    <div class="skeleton">加载中...</div>
  </div>
</body>
```

---

## 6. TTFB — 首字节时间

### 6.1 什么是 TTFB

TTFB 测量从**请求发出到收到第一个响应字节**的时间。它反映了服务器和网络的响应能力。

```
TTFB 构成：

DNS 查询 → TCP 连接 → TLS 握手 → 请求发送 → 服务端处理 → 返回第一个字节
                                     │           │
                                     └─────┬─────┘
                                     TTFB = 这一切的总和
```

### 6.2 TTFB 优化

| 阶段 | 优化手段 |
|------|---------|
| DNS 查询 | DNS 预解析、使用快速 DNS 服务 |
| TCP/TLS 连接 | CDN 就近接入、HTTP/2 复用连接 |
| 服务端处理 | 缓存（Redis）、数据库查询优化、边缘计算 |
| 网络传输 | CDN、减少重定向 |

```nginx
# Nginx 层面优化 TTFB
server {
    # 启用 HTTP/2
    listen 443 ssl http2;
    
    # 静态资源缓存（减少回源）
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API 缓存
    location /api/ {
        proxy_cache my_cache;
        proxy_cache_valid 200 60s;
        proxy_cache_key "$scheme$request_method$host$request_uri";
        proxy_pass http://backend;
    }
}
```

---

## 7. 指标采集方案

### 7.1 web-vitals 库（推荐）

Google 官方库，**最精准**的采集方式：

```bash
npm install web-vitals
```

```javascript
// utils/metrics.js — 指标采集核心模块

import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

// 配置
const METRICS_CONFIG = {
  // 只采集首次访问的数据
  reportAllChanges: false,
  // INP 采样率（INP 计算成本高，建议采样）
  inpSampleRate: 0.1,
};

// 指标缓冲区（批量上报用）
const metricsBuffer = [];

function reportMetrics(metric) {
  // 附加业务信息
  const enriched = {
    ...metric,
    pageUrl: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    // 附加自定义维度
    deviceCategory: getDeviceCategory(),
    connectionType: getConnectionType(),
  };
  
  metricsBuffer.push(enriched);
  
  // 达到阈值或定时上报
  if (metricsBuffer.length >= 10) {
    sendMetrics(metricsBuffer.splice(0));
  }
}

// 注册所有指标监听
export function initWebVitals() {
  // 三大核心
  onCLS(reportMetrics, METRICS_CONFIG);
  onINP(reportMetrics, { ...METRICS_CONFIG, reportAllChanges: false });
  onLCP(reportMetrics, METRICS_CONFIG);

  // 辅助指标
  onFCP(reportMetrics, METRICS_CONFIG);
  onTTFB(reportMetrics, METRICS_CONFIG);

  // 定时清空缓冲区
  setInterval(() => {
    if (metricsBuffer.length > 0) {
      sendMetrics(metricsBuffer.splice(0));
    }
  }, 5000);
}

// ===== 辅助函数 =====

function getDeviceCategory() {
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone/.test(ua)) return 'mobile';
  if (/iPad|Tablet/.test(ua)) return 'tablet';
  return 'desktop';
}

function getConnectionType() {
  if ('connection' in navigator) {
    return navigator.connection.effectiveType || 'unknown'; // 4g/3g/2g/slow-2g
  }
  return 'unknown';
}

// ===== 上报函数 =====

function sendMetrics(metrics) {
  // 方案1：sendBeacon（推荐，不阻塞页面卸载）
  const payload = JSON.stringify(metrics);
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/metrics/collect', payload);
  } else {
    // 降级：fetch + keepalive
    fetch('/api/metrics/collect', {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
  }
}
```

### 7.2 PerformanceObserver 原生方式

不依赖第三方库的采集方式：

```javascript
// utils/metrics-native.js — 纯原生 Performance API 采集

export function observeLCP() {
  let lcpValue = 0;

  const observer = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    // LCP 可能在页面加载过程中更新多次
    const lastEntry = entries[entries.length - 1];
    lcpValue = lastEntry.startTime;
    
    // 只上报最终值（在 load 事件后 5s 再取一次）
  });

  observer.observe({ type: 'largest-contentful-paint', buffered: true });

  // 确保获取最终 LCP
  window.addEventListener('load', () => {
    setTimeout(() => {
      observer.disconnect();
      report({ name: 'LCP', value: lcpValue });
    }, 5000);
  });

  return observer;
}

export function observeCLS() {
  let clsValue = 0;
  let clsEntries = [];

  const observer = new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      // 忽略最近用户输入后 1 秒内的偏移（用户交互导致的布局变化不算 CLS）
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
        clsEntries.push(entry);
      }
    }
  });

  observer.observe({ type: 'layout-shift', buffered: true });

  // 页面进入后台时上报最终 CLS
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      observer.disconnect();
      report({ name: 'CLS', value: clsValue });
    }
  });

  return observer;
}

export function observeINP() {
  let inpValue = 0;

  const observer = new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      // 只关心用户交互类型
      if (!entry.interactionId) continue;
      
      const duration = entry.duration;
      if (duration > inpValue) {
        inpValue = duration;
      }
    }
  });

  observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });

  // 页面隐藏时上报
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      observer.disconnect();
      report({ name: 'INP', value: inpValue, rating: inpValue <= 200 ? 'good' : inpValue <= 500 ? 'needs-improvement' : 'poor' });
    }
  });

  return observer;
}
```

### 7.3 Lighthouse 本地审计

```bash
# CLI 方式运行 Lighthouse
npm install -g lighthouse
lighthouse https://caidiaweb.com --output=html --output-path=./report.html

# 关键参数：
# --preset=desktop    桌面端审计
# --locale=zh         中文报告
# --only-categories=performance  仅性能审计
```

### 7.4 Chrome DevTools 实时查看

```
F12 → Performance 面板：
  1. 勾选 "Web Vitals"（页面加载时间线上标记 LCP）
  2. 勾选 "Screenshots"（可以看每一帧的渲染截图）
  
F12 → Lighthouse 面板：
  点击 "Analyze page load" → 查看 Performance 报告

F12 → Rendering 面板：
  勾选 "Layout Shift Regions" → 实时高亮 CLS 区域（蓝色闪烁）
```

---

## 8. 数据上报与监控

### 8.1 后端接收服务（Express 示例）

```javascript
// server/metrics-collector.js
const express = require('express');
const router = express.Router();

// 内存聚合（生产环境应使用时序数据库如 InfluxDB）
const metricsStore = {
  byHour: new Map(),    // key: "2026-06-25-14", value: { LCP: [], CLS: [], INP: [] }
  byPage: new Map(),    // key: "/page-a", value: ... 
  byDevice: new Map(),  // key: "mobile|desktop", value: ...
};

router.post('/collect', express.json({ limit: '1mb' }), (req, res) => {
  const metrics = Array.isArray(req.body) ? req.body : [req.body];
  const now = new Date();
  const hourKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${now.getHours()}`;

  for (const m of metrics) {
    // 存储到对应维度
    aggregate(metricsStore.byHour, hourKey, m);
    aggregate(metricsStore.byPage, m.pageUrl || '/', m);
    aggregate(metricsStore.byDevice, `device:${m.deviceCategory}`, m);
  }

  // sendBeacon 请求可以不给详细响应
  res.status(204).end();
});

function aggregate(map, key, metric) {
  if (!map.has(key)) {
    map.set(key, { LCP: [], CLS: [], INP: [], FCP: [], TTFB: [], count: 0 });
  }
  const bucket = map.get(key);
  bucket[metric.name]?.push(metric.value);
  bucket.count++;
}

// 查询接口：获取统计摘要
router.get('/summary', (req, res) => {
  const { range = 'last24h', page } = req.query;
  // 返回 P50/P75/P90/P95 分位值
  const summary = calculateSummary(metricsStore, range, page);
  res.json(summary);
});

// 计算分位值
function calculateSummary(store, range, page) {
  const source = page ? store.byPage.get(page) : aggregateHourly(store);
  if (!source) return {};

  const result = {};
  for (const name of ['LCP', 'CLS', 'INP', 'FCP', 'TTFB']) {
    const values = source[name]?.sort((a, b) => a - b) || [];
    result[name] = {
      p50: percentile(values, 50),
      p75: percentile(values, 75),
      p90: percentile(values, 90),
      p95: percentile(values, 95),
      avg: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      count: values.length,
    };
  }
  return result;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

module.exports = router;
```

### 8.2 监控看板（简化版 HTML）

```html
<!-- dashboard.html — 简易性能监控看板 -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Web Vitals 监控看板</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: #f5f7fa; padding: 20px; }
    h1 { margin-bottom: 20px; color: #1a1a2e; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
    .metric-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .metric-name { font-weight: 600; font-size: 16px; }
    .metric-value { font-size: 32px; font-weight: 700; margin-bottom: 4px; }
    .metric-label { font-size: 12px; color: #8c8c8c; }
    .good { color: #0cce6b; }
    .warn { color: #ffa400; }
    .bad { color: #ff4e42; }
    .chart-container { height: 200px; }
  </style>
</head>
<body>
  <h1>📊 Core Web Vitals 监控看板</h1>
  
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-header"><span class="metric-name">LCP</span><span class="metric-label">P75</span></div>
      <div class="metric-value good" id="lcp-value">--</div>
      <div class="chart-container" id="lcp-chart"></div>
    </div>
    <div class="metric-card">
      <div class="metric-header"><span class="metric-name">INP</span><span class="metric-label">P75</span></div>
      <div class="metric-value good" id="inp-value">--</div>
      <div class="chart-container" id="inp-chart"></div>
    </div>
    <div class="metric-card">
      <div class="metric-header"><span class="metric-name">CLS</span><span class="metric-label">P75</span></div>
      <div class="metric-value good" id="cls-value">--</div>
      <div class="chart-container" id="cls-chart"></div>
    </div>
  </div>

  <script>
    async function loadMetrics() {
      const res = await fetch('/api/metrics/summary');
      const data = await res.json();
      renderMetrics(data);
    }

    function ratingClass(value, type) {
      const thresholds = {
        LCP: { good: 2500, warn: 4000 },
        INP: { good: 200, warn: 500 },
        CLS: { good: 0.1, warn: 0.25 },
      };
      const t = thresholds[type];
      if (value <= t.good) return 'good';
      if (value <= t.warn) return 'warn';
      return 'bad';
    }

    function renderMetrics(data) {
      for (const [name, stats] of Object.entries(data)) {
        const valueEl = document.getElementById(`${name.toLowerCase()}-value`);
        if (valueEl && stats.p75 !== undefined) {
          const v = name === 'CLS' ? stats.p75.toFixed(3) : Math.round(stats.p75);
          const unit = name === 'CLS' ? '' : 'ms';
          valueEl.textContent = `${v}${unit}`;
          valueEl.className = `metric-value ${ratingClass(stats.p75, name)}`;
        }
      }
    }

    setInterval(loadMetrics, 30000);
    loadMetrics();
  </script>
</body>
</html>
```

---

## 9. 实践：在 caidiaweb 中接入性能监控

### 9.1 接入步骤

```
┌─────────────────────────────────────────────┐
│           接入 Core Web Vitals 四步走         │
├─────────────────────────────────────────────┤
│                                             │
│  Step 1: 安装依赖                            │
│  npm install web-vitals                     │
│                                             │
│  Step 2: 创建采集模块                         │
│  src/utils/metrics.js                       │
│                                             │
│  Step 3: 在 main.js 入口初始化               │
│  import { initWebVitals } from '@/utils/';  │
│  initWebVitals();                            │
│                                             │
│  Step 4: 后端接收 + 看板可视化                │
│  POST /api/metrics/collect                  │
│                                             │
└─────────────────────────────────────────────┘
```

### 9.2 caidiaweb 完整接入代码

```javascript
// src/utils/metrics.js
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

const REPORT_URL = '/api/metrics/collect';
const buffer = [];
let timer = null;

function send() {
  if (buffer.length === 0) return;

  const payload = JSON.stringify(buffer.splice(0));
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon(REPORT_URL, payload);
  } else {
    fetch(REPORT_URL, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {}); // 上报失败不影响业务
  }
}

function scheduleSend() {
  if (timer) return;
  // 批量上报：达到 5 条或 10 秒
  timer = setInterval(() => send(), 10000);
}

function record(metric) {
  buffer.push({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    page: location.pathname,
    timestamp: Date.now(),
  });

  if (buffer.length >= 5) {
    clearInterval(timer);
    timer = null;
    send();
    scheduleSend();
  }
}

export function initWebVitals() {
  onCLS(record, { reportAllChanges: false });
  onINP(record, { reportAllChanges: false });
  onLCP(record, { reportAllChanges: false });
  onFCP(record, { reportAllChanges: false });
  onTTFB(record, { reportAllChanges: false });
  scheduleSend();
}
```

```javascript
// src/main.js
import { initWebVitals } from '@/utils/metrics';

// 在应用初始化后立即启动性能监控
initWebVitals();

// ... 其他应用初始化代码
```

---

## 10. 面试高频考点

### Q1：LCP、FCP、FMP 的区别？

| 指标 | 含义 | 测量什么 | 谁更重要 |
|------|------|---------|---------|
| FCP | 第一次出现内容 | 文字/图片**首次出现** | 感知速度 |
| LCP | 最大内容渲染完成 | **主体内容**渲染完成 | 可用性（排名因子） |
| FMP | 首次有意义绘制 | 页面**主要部分**出现 | 已废弃，被 LCP 取代 |

### Q2：INP 为什么取代了 FID？

- **FID** 只测量首次输入延迟，可能忽略页面生命周期中更严重的交互问题
- **INP** 综合考虑所有用户交互，取最差的延迟分位值，更能代表实际体验
- 类似"只测第一口咖啡的温度" vs "测整杯咖啡从开始到喝完的温度变化"

### Q3：CLS 是如何计算的？

```
CLS = 影响分数(impact) × 距离分数(distance)

影响分数 = 受影响区域面积 / 视口面积
距离分数 = 元素移动距离 / 视口高度

注意：用户交互后 500ms 内的布局偏移不计入 CLS
```

### Q4：sendBeacon 为什么适合性能数据上报？

- **不阻塞页面卸载**：浏览器在后台发送，不延迟页面跳转
- **可靠性高**：即使页面关闭也能完成发送
- **轻量**：专门为小数据量设计
- 对比 fetch/XMLHttpRequest：后者在 pagehide 事件中可能被浏览器取消

### Q5：如何设计一个公司级的性能监控系统？

```
数据采集层：
  ├── web-vitals 库（Web 端）
  ├── PerformanceObserver（通用）
  └── sendBeacon 上报

数据接收层：
  ├── Node.js / Nginx 接收
  └── 数据清洗 + 去重

数据存储层：
  ├── 时序数据库（InfluxDB / TimescaleDB）
  └── 原始日志（ELK）

数据展示层：
  ├── Grafana 看板（按分位值/页面/设备/时间维度筛选）
  ├── 告警通知（飞书/钉钉 Webhook）
  └── 邮件日报
```

---

> **动手建议**：在 caidiaweb 的 `main.js` 中参照第 9 节的代码接入 web-vitals，然后打开 Chrome DevTools → Performance 面板，录制一次页面加载，在时间线上观察 FCP/LCP 标记位置。如果指标不达标（LCP > 2.5s），回到第 2 节的优化策略逐一排查。
