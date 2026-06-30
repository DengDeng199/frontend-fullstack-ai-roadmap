# 3.8 前端监控体系

> 前端性能优化 · Performance API · 错误监控 · 上报方案 · 监控面板

---

## 目录

1. [Performance API 深度](#1-performance-api-深度)
2. [错误监控体系](#2-错误监控体系)
3. [自定义上报方案](#3-自定义上报方案)
4. [监控面板搭建](#4-监控面板搭建)
5. [综合实践：caidiaweb 监控体系接入](#5-综合实践caidiaweb-监控体系接入)
6. [面试高频考点](#6-面试高频考点)

---

## 1. Performance API 深度

### 1.1 三种数据获取方式

```
┌──────────────────────────────────────────────────────────────┐
│            Performance API 三种入口                           │
├──────────────┬───────────────────┬───────────────────────────┤
│    方式       │     特点           │       使用场景            │
├──────────────┼───────────────────┼───────────────────────────┤
│ getEntries() │ 一次性获取所有记录  │ 页面加载完后采集快照        │
├──────────────┼───────────────────┼───────────────────────────┤
│ getEntries   │ 获取指定类型记录     │ 精细化分析某一类数据        │
│ ByType()     │                   │                           │
├──────────────┼───────────────────┼───────────────────────────┤
│ Performance  │ 实时监听新增记录     │ 持续采集(如CLS/LCP变化)    │
│ Observer     │ 支持buffered参数    │                           │
└──────────────┴───────────────────┴───────────────────────────┘
```

### 1.2 Navigation Timing（页面加载全流程）

```javascript
// 获取页面导航性能数据
const [navEntry] = performance.getEntriesByType('navigation');

if (navEntry) {
  const metrics = {
    // DNS 查询耗时
    dns: navEntry.domainLookupEnd - navEntry.domainLookupStart,
    // TCP 连接耗时
    tcp: navEntry.connectEnd - navEntry.connectStart,
    // TLS 握手耗时（HTTPS）
    tls: navEntry.connectEnd - navEntry.secureConnectionStart,
    // 请求耗时（发送请求到收到响应）
    request: navEntry.responseStart - navEntry.requestStart,
    // 响应耗时（下载 HTML）
    response: navEntry.responseEnd - navEntry.responseStart,
    // DOM 解析耗时
    domParse: navEntry.domInteractive - navEntry.responseEnd,
    // DOMContentLoaded 耗时
    domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
    // 页面完全加载耗时
    load: navEntry.loadEventEnd - navEntry.loadEventStart,

    // 关键时间点
    fcp: '--', // 需要用 PerformanceObserver 或 web-vitals 库
    lcp: '--',
    ttfb: navEntry.responseStart - navEntry.requestStart,
  };

  console.table(metrics);
}
```

```
Navigation Timing 时间线（每一段都可以用 API 获取精确时间）：

requestStart → responseStart → responseEnd → domInteractive → domComplete → loadEventEnd
     │              │               │              │                │              │
     │◄─ TTFB ────►│               │              │                │              │
     │              │◄─ 下载HTML ──►│              │                │              │
     │              │               │◄ DOM解析 ──►│                │              │
     │              │               │              │◄─ 资源加载 ──►│              │
```

### 1.3 Resource Timing（所有资源加载耗时）

```javascript
// 获取页面所有资源加载数据
const resources = performance.getEntriesByType('resource');

// 分类统计
const stats = {
  total: resources.length,
  byType: {},
  slowest: [],
  largest: [],
  errors: [],
};

resources.forEach(entry => {
  const type = entry.initiatorType; // script/css/img/fetch/xmlhttprequest
  const duration = entry.duration;
  const size = entry.transferSize || 0;

  // 按类型分组
  stats.byType[type] = (stats.byType[type] || 0) + 1;

  // 记录慢请求（>1s）
  if (duration > 1000) {
    stats.slowest.push({
      url: entry.name.split('/').pop() || entry.name,
      type,
      duration: `${duration.toFixed(0)}ms`,
      size: `${(size / 1024).toFixed(1)}KB`,
    });
  }

  // 记录大文件（>500KB）
  if (size > 500 * 1024) {
    stats.largest.push({
      url: entry.name,
      type,
      size: `${(size / 1024).toFixed(1)}KB`,
    });
  }

  // 记录加载失败的资源
  if (entry.transferSize === 0 && entry.duration > 0 && type !== 'fetch') {
    stats.errors.push({ url: entry.name, type });
  }
});

console.table(stats.slowest);
console.table(stats.largest);
```

### 1.4 PerformanceObserver 实时监听

```javascript
// utils/performance-observer.js — 性能数据实时采集

export function initPerformanceObserver() {
  // ===== 监听导航性能 =====
  const navObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      report({
        type: 'navigation',
        payload: {
          ttfb: entry.responseStart - entry.requestStart,
          dns: entry.domainLookupEnd - entry.domainLookupStart,
          tcp: entry.connectEnd - entry.connectStart,
          request: entry.responseStart - entry.requestStart,
          response: entry.responseEnd - entry.responseStart,
          domParse: entry.domInteractive - entry.responseEnd,
          domComplete: entry.domComplete - entry.responseEnd,
          loadComplete: entry.loadEventEnd - entry.fetchStart,
          type: entry.type, // navigate / reload / back_forward
        },
      });
    }
  });
  navObserver.observe({ type: 'navigation', buffered: true });

  // ===== 监听资源加载 =====
  const resourceObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // 只上报异常的（慢请求、大文件、错误）
      if (entry.duration > 3000 || entry.transferSize > 1024 * 1024) {
        report({
          type: 'resource',
          payload: {
            url: entry.name,
            initiatorType: entry.initiatorType,
            duration: Math.round(entry.duration),
            size: entry.transferSize,
            slow: entry.duration > 3000,
          },
        });
      }
    }
  });
  resourceObserver.observe({ type: 'resource', buffered: true });

  // ===== 监听长任务 =====
  const longTaskObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      report({
        type: 'longtask',
        payload: {
          duration: Math.round(entry.duration),
          startTime: Math.round(entry.startTime),
          // attribution 可获知是哪个脚本导致的长任务
          culprit: entry.attribution?.[0]?.containerSrc || 'unknown',
        },
      });
    }
  });
  longTaskObserver.observe({ type: 'longtask', buffered: true });
}
```

---

## 2. 错误监控体系

### 2.1 错误监控全景

```
┌──────────────────────────────────────────────────────────────┐
│              前端错误监控四层体系                              │
├──────────────┬───────────────────┬───────────────────────────┤
│    层级       │     覆盖场景       │       采集方式            │
├──────────────┼───────────────────┼───────────────────────────┤
│ JS 运行时错误  │ 语法错误外的所有JS错 │ window.onerror           │
│              │                   │ addEventListener('error')  │
├──────────────┼───────────────────┼───────────────────────────┤
│ 资源加载错误   │ 图片/JS/CSS 404/500│ addEventListener('error') │
│              │                   │ (捕获阶段,capture:true)    │
├──────────────┼───────────────────┼───────────────────────────┤
│ Promise 异常  │ 未catch的reject    │ unhandledrejection       │
│              │ async/await异常    │                          │
├──────────────┼───────────────────┼───────────────────────────┤
│ 框架级错误    │ Vue/React 组件错误 │ Vue: errorHandler        │
│              │                   │ React: ErrorBoundary      │
└──────────────┴───────────────────┴───────────────────────────┘
```

### 2.2 JS 运行时错误 + 资源错误

```javascript
// utils/error-monitor.js — 错误监控核心模块

let errorQueue = [];
let reportTimer = null;

export function initErrorMonitor() {
  // ===== 1. JS 运行时错误 =====
  // window.onerror 只能捕获运行时错误（不含资源加载错误）
  window.onerror = function (message, source, lineno, colno, error) {
    enqueueError({
      type: 'js_error',
      message: String(message),
      source: source || '',
      position: `${lineno}:${colno}`,
      // 提取堆栈
      stack: error?.stack?.slice(0, 500) || 'no stack',
      // 发生时间（相对于页面加载）
      time: performance.now(),
      // 发生时的 URL
      pageUrl: location.href,
    });
    // 返回 true 阻止浏览器默认错误提示（可选）
    return true;
  };

  // ===== 2. 资源加载错误（img/script/link 等加载失败） =====
  // 注意：必须用 addEventListener 且是捕获阶段
  window.addEventListener('error', (event) => {
    // 资源加载错误：event 是 ErrorEvent 之外的 Event
    // 只有资源错误的 event.target 是具体的元素
    if (event.target !== window) {
      const target = event.target;
      const tagName = target.tagName?.toLowerCase() || '';

      // 忽略用户取消的请求和无关元素
      if (tagName === 'img' || tagName === 'script' || tagName === 'link' || tagName === 'video') {
        enqueueError({
          type: 'resource_error',
          tagName,
          url: target.src || target.href || '',
          // 资源类型的外链
          outerHTML: target.outerHTML?.slice(0, 200) || '',
          pageUrl: location.href,
          time: performance.now(),
        });
      }
    }
  }, true); // capture = true 是必须的！

  // ===== 3. Promise 未捕获异常 =====
  window.addEventListener('unhandledrejection', (event) => {
    enqueueError({
      type: 'promise_error',
      message: String(event.reason?.message || event.reason),
      stack: event.reason?.stack?.slice(0, 500) || '',
      pageUrl: location.href,
      time: performance.now(),
    });

    // 建议：不让浏览器控制台打印 Uncaught（可选）
    // event.preventDefault();
  });
}

// ===== 错误队列 + 批量上报 =====
function enqueueError(error) {
  errorQueue.push(error);

  // 达到 5 条立即上报
  if (errorQueue.length >= 5) {
    flushErrors();
    return;
  }

  // 否则 10 秒后定时上报
  if (!reportTimer) {
    reportTimer = setTimeout(flushErrors, 10000);
  }
}

function flushErrors() {
  if (errorQueue.length === 0) return;

  const batch = errorQueue.splice(0);
  clearTimeout(reportTimer);
  reportTimer = null;

  // 去重：相同 message + source 在短时间内只报一次
  const deduped = deduplicateErrors(batch);

  if (deduped.length > 0) {
    report({ type: 'error_batch', payload: deduped });
  }
}

function deduplicateErrors(errors) {
  const seen = new Set();
  return errors.filter(e => {
    const key = `${e.type}|${e.message}|${e.source || e.url || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export { flushErrors };
```

### 2.3 Vue 框架级错误边界

```javascript
// main.js — Vue 应用全局错误处理

import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);

// ===== Vue 全局错误处理器 =====
app.config.errorHandler = function (err, instance, info) {
  // err: 错误对象
  // instance: 发生错误的组件实例
  // info: Vue 特定的错误信息（如 "render function"）

  const componentName = instance?.$options?.name || instance?.$options?.__name || 'anonymous';

  reportError({
    type: 'vue_error',
    message: err.message,
    stack: err.stack?.slice(0, 500) || '',
    component: componentName,
    info, // 'render function' / 'setup function' / 'v-on handler'
    props: sanitizeData(instance?.$props),
    pageUrl: location.href,
    time: performance.now(),
  });

  // 生产环境不要抛出到控制台
  if (import.meta.env.PROD) {
    return false; // 阻止错误继续传播
  }
};

// ===== Vue 警告处理器（开发环境） =====
app.config.warnHandler = function (msg, instance, trace) {
  if (import.meta.env.PROD) return;

  console.groupCollapsed(`[Vue Warn] ${msg}`);
  console.log('组件:', instance);
  console.log('追踪:', trace);
  console.groupEnd();
};

// ===== 辅助：脱敏处理 props（避免上传用户敏感数据） =====
function sanitizeData(data) {
  if (!data) return {};
  const safe = { ...data };
  // 移除敏感字段
  delete safe.password;
  delete safe.token;
  delete safe.secret;
  // 截断过长数据
  for (const key of Object.keys(safe)) {
    if (typeof safe[key] === 'string' && safe[key].length > 200) {
      safe[key] = safe[key].slice(0, 200) + '...';
    }
  }
  return safe;
}

export function reportError(error) {
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      '/api/errors/collect',
      JSON.stringify([error])
    );
  } else {
    fetch('/api/errors/collect', {
      method: 'POST',
      body: JSON.stringify([error]),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
  }
}
```

```vue
<!-- 组件级错误边界（Vue 3） -->
<!-- components/ErrorBoundary.vue -->
<template>
  <slot v-if="!hasError" />
  <div v-else class="error-boundary">
    <div class="error-icon">⚠️</div>
    <h3>组件加载异常</h3>
    <p class="error-msg">{{ error?.message || '未知错误' }}</p>
    <button @click="retry">重试</button>
  </div>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue';

const hasError = ref(false);
const error = ref(null);

// onErrorCaptured 可以捕获子组件树中的错误
onErrorCaptured((err, instance, info) => {
  hasError.value = true;
  error.value = err;

  // 上报错误
  reportError({
    type: 'component_error',
    message: err.message,
    component: instance?.$options?.name || 'unknown',
    info,
  });

  // 返回 false 阻止错误继续向上传播
  return false;
});

function retry() {
  hasError.value = false;
  error.value = null;
}
</script>

<style scoped>
.error-boundary {
  padding: 40px;
  text-align: center;
  background: #fff3e0;
  border-radius: 8px;
}
.error-icon { font-size: 48px; margin-bottom: 12px; }
.error-msg { color: #8c8c8c; font-size: 14px; margin: 8px 0 16px; }
</style>
```

### 2.4 错误数据上报数据结构

```javascript
// 统一的上报数据格式
const STANDARD_ERROR_SCHEMA = {
  // 基础信息
  type: 'js_error',          // js_error | resource_error | promise_error | vue_error
  message: 'TypeError: ...',
  stack: 'Error: ...\n    at ...',
  
  // 上下文信息
  pageUrl: location.href,
  timestamp: Date.now(),
  userAgent: navigator.userAgent,
  
  // 用户信息（脱敏）
  userId: '--',
  sessionId: '--',
  
  // 错误上下文（发生错误前 3 次用户操作的记录）
  breadcrumbs: [
    { type: 'click', target: 'button#search', time: 1719676800000 },
    { type: 'fetch', url: '/api/stations', time: 1719676800500 },
    { type: 'error', message: '...', time: 1719676801000 },
  ],

  // 自定义维度
  tags: {
    env: 'production',
    version: '2.3.1',
    page: '/tech-facility',
  },
};
```

---

## 3. 自定义上报方案

### 3.1 sendBeacon（推荐）

```javascript
// utils/reporter.js — 统一上报模块

const REPORT_URL = '/api/monitor/collect';
const MAX_BATCH_SIZE = 10;
const MAX_BATCH_INTERVAL = 5000; // 5s

let queue = [];
let timer = null;

/**
 * 添加上报数据到队列
 */
function enqueue(data) {
  queue.push({
    ...data,
    timestamp: Date.now(),
    pageUrl: location.href,
    sessionId: getSessionId(),
  });

  if (queue.length >= MAX_BATCH_SIZE) {
    flush();
  } else if (!timer) {
    timer = setTimeout(flush, MAX_BATCH_INTERVAL);
  }
}

/**
 * 批量上报
 */
function flush() {
  if (queue.length === 0) return;

  const batch = queue.splice(0);
  clearTimeout(timer);
  timer = null;

  const payload = JSON.stringify(batch);

  // 优先使用 sendBeacon（不阻塞页面卸载）
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    const success = navigator.sendBeacon(REPORT_URL, blob);

    if (!success) {
      // sendBeacon 失败（队列满）→ 降级为 keepalive fetch
      fallbackSend(payload);
    }
  } else {
    fallbackSend(payload);
  }
}

function fallbackSend(payload) {
  fetch(REPORT_URL, {
    method: 'POST',
    body: payload,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    // 关键：即使页面正在关闭，也会完成发送
  }).catch(() => {
    // 静默失败，不阻塞页面
  });
}

// 页面卸载时强制上报
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    flush();
  }
});

window.addEventListener('pagehide', () => {
  flush();
});

// ===== Session ID 管理 =====
function getSessionId() {
  let sid = sessionStorage.getItem('__sid__');
  if (!sid) {
    sid = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem('__sid__', sid);
  }
  return sid;
}

export { enqueue as report, flush };
```

### 3.2 1x1 GIF 像素上报（传统方案）

```javascript
// GIF 上报（历史方案，现在 sendBeacon 更好）
// 仍在使用的原因：
// 1. 最极端的跨域环境支持（所有浏览器都支持 img 跨域）
// 2. 最小开销（不触发 CORS 预检）
// 3. 不会有响应体解析开销

function gifReport(data) {
  const params = new URLSearchParams();
  
  // GIF 上报的 URL 有长度限制（~2000 字符）
  // 所以需要对数据做简化
  params.set('t', data.type);
  params.set('m', data.message?.slice(0, 200));
  params.set('p', location.pathname);
  params.set('ts', Date.now());

  const img = new Image();
  img.src = `https://monitor.caidiaweb.com/1x1.gif?${params.toString()}`;
  // 不需要把 img 插入 DOM，也不需要 onload/onerror
}
```

### 3.3 三种上报方式对比

```
┌──────────────────────────────────────────────────────────────┐
│              上报方式对比                                      │
├──────────────┬──────────┬──────────┬────────────┬────────────┤
│    方式       │ 数据量    │  可靠性   │  跨域支持   │   推荐度    │
├──────────────┼──────────┼──────────┼────────────┼────────────┤
│ sendBeacon   │ 较大     │ 最高     │ 需 CORS    │ ⭐⭐⭐⭐⭐  │
│ fetch+keep   │ 大       │ 高       │ 需 CORS    │ ⭐⭐⭐⭐   │
│ alive        │          │          │            │            │
│ 1x1 GIF      │ 小(<2KB) │ 中       │ 天然支持    │ ⭐⭐⭐     │
│ XMLHttp      │ 大       │ 低(卸载时│ 需 CORS    │ ⭐        │
│ Request      │          │ 可能丢失) │            │            │
└──────────────┴──────────┴──────────┴────────────┴────────────┘

推荐策略：sendBeacon(主) + fetch keepalive(降级) + GIF(兜底)
```

### 3.4 用户行为面包屑

```javascript
// utils/breadcrumbs.js — 错误发生前的用户行为记录

const MAX_BREADCRUMBS = 20;
const breadcrumbs = [];

export function addBreadcrumb(type, data) {
  breadcrumbs.push({
    type,        // click | input | fetch | navigate | custom
    data,
    timestamp: Date.now(),
  });

  // 保持最新 20 条
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
}

export function getBreadcrumbs() {
  return [...breadcrumbs];
}

export function initBreadcrumbs() {
  // 记录点击
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target) return;
    addBreadcrumb('click', {
      tag: target.tagName?.toLowerCase(),
      id: target.id || '',
      class: target.className?.slice(0, 100) || '',
      text: target.textContent?.slice(0, 50) || '',
    });
  }, true);

  // 记录输入（仅记录事件，不记录内容）
  document.addEventListener('input', (e) => {
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      addBreadcrumb('input', {
        tag: target.tagName?.toLowerCase(),
        name: target.name || target.id || '',
      });
    }
  }, true);

  // 拦截 fetch 请求
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    addBreadcrumb('fetch', {
      url: url?.slice(0, 200),
      method: args[0]?.method || args[1]?.method || 'GET',
    });
    return originalFetch.apply(this, args);
  };

  // 记录路由跳转
  window.addEventListener('popstate', () => {
    addBreadcrumb('navigate', { to: location.href, type: 'popstate' });
  });
}

// 在错误上报时附带面包屑
const originalOnError = window.onerror;
window.onerror = function (message, source, lineno, colno, error) {
  enqueueError({
    message,
    source,
    position: `${lineno}:${colno}`,
    stack: error?.stack,
    breadcrumbs: getBreadcrumbs(), // ← 附带用户行为历史
  });
  return originalOnError?.apply(this, arguments);
};
```

---

## 4. 监控面板搭建

### 4.1 自建监控看板（简化版）

```html
<!-- monitor/dashboard.html — 自建监控看板 -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>caidiaweb 监控看板</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: #0d1117; color: #c9d1d9; padding: 20px; }
    h1 { color: #58a6ff; margin-bottom: 24px; font-size: 24px; }
    .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; }
    .card-title { font-size: 13px; color: #8b949e; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .card-value { font-size: 36px; font-weight: 700; }
    .card-value.good { color: #3fb950; }
    .card-value.warn { color: #d29922; }
    .card-value.bad { color: #f85149; }
    .chart { height: 300px; }
    .stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 12px; }
    .stat-item { text-align: center; }
    .stat-label { font-size: 11px; color: #8b949e; }
    .stat-number { font-size: 20px; font-weight: 600; }
  </style>
</head>
<body>
  <h1>🔍 caidiaweb 监控看板</h1>

  <div class="dashboard">
    <!-- PV/UV -->
    <div class="card">
      <div class="card-title">今日 PV / UV</div>
      <div class="card-value" id="pv">--</div>
      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-label">UV</div>
          <div class="stat-number" id="uv">--</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">人均PV</div>
          <div class="stat-number" id="avg-pv">--</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">在线</div>
          <div class="stat-number" id="online">--</div>
        </div>
      </div>
    </div>

    <!-- JS 错误率 -->
    <div class="card">
      <div class="card-title">JS 错误率（24h）</div>
      <div class="card-value good" id="error-rate">--</div>
      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-label">错误数</div>
          <div class="stat-number" id="error-count">--</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">影响用户</div>
          <div class="stat-number" id="affected-users">--</div>
        </div>
      </div>
    </div>

    <!-- 慢页面占比 -->
    <div class="card">
      <div class="card-title">慢页面占比（LCP &gt;4s）</div>
      <div class="card-value good" id="slow-rate">--</div>
    </div>
  </div>

  <!-- 图表 -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
    <div class="card">
      <div class="card-title">PV 趋势（7天）</div>
      <div class="chart" id="pv-chart"></div>
    </div>
    <div class="card">
      <div class="card-title">页面加载耗时趋势（P75）</div>
      <div class="chart" id="loadtime-chart"></div>
    </div>
    <div class="card">
      <div class="card-title">TOP 5 错误</div>
      <div class="chart" id="top-errors-chart"></div>
    </div>
    <div class="card">
      <div class="card-title">页面分布</div>
      <div class="chart" id="page-dist-chart"></div>
    </div>
  </div>

  <script>
    async function fetchSummary() {
      const res = await fetch('/api/monitor/summary');
      return res.json();
    }

    function renderCards(data) {
      document.getElementById('pv').textContent = data.pv?.toLocaleString() || '--';
      document.getElementById('uv').textContent = data.uv?.toLocaleString() || '--';
      document.getElementById('avg-pv').textContent = data.avgPv?.toFixed(1) || '--';
      document.getElementById('online').textContent = data.online || '--';

      const errorRate = document.getElementById('error-rate');
      errorRate.textContent = `${(data.errorRate * 100).toFixed(2)}%`;
      errorRate.className = `card-value ${data.errorRate < 0.01 ? 'good' : data.errorRate < 0.05 ? 'warn' : 'bad'}`;
      document.getElementById('error-count').textContent = data.errorCount || '--';

      const slowRate = document.getElementById('slow-rate');
      slowRate.textContent = `${(data.slowPageRate * 100).toFixed(1)}%`;
      slowRate.className = `card-value ${data.slowPageRate < 0.1 ? 'good' : 'warn'}`;
    }

    // TODO: ECharts 图表初始化 + 数据填充
    // (与 3.1 Core Web Vitals 章节的看板逻辑类似)

    fetchSummary().then(renderCards);
    setInterval(() => fetchSummary().then(renderCards), 30000);
  </script>
</body>
</html>
```

### 4.2 告警通知

```javascript
// server/alert.js — 后端告警逻辑

const ALERT_RULES = [
  {
    name: 'JS错误率过高',
    condition: (stats) => stats.errorRate > 0.05, // 错误率 > 5%
    action: async (stats) => {
      await sendDingTalk({
        title: `⚠️ 前端错误率告警`,
        text: `当前JS错误率 ${(stats.errorRate * 100).toFixed(2)}%，超过阈值5%\nTOP错误：${stats.topErrors[0]?.message}`,
      });
    },
    cooldown: 30 * 60 * 1000, // 30 分钟内不重复告警
  },
  {
    name: '页面加载过慢',
    condition: (stats) => stats.slowPageRate > 0.2, // >20% 的页面 LCP>4s
    action: async (stats) => {
      await sendDingTalk({
        title: `🐢 页面加载过慢告警`,
        text: `慢页面占比 ${(stats.slowPageRate * 100).toFixed(1)}%，超过阈值20%`,
      });
    },
    cooldown: 60 * 60 * 1000,
  },
];

async function evaluateAlerts() {
  const stats = await getLastHourStats();
  const now = Date.now();

  for (const rule of ALERT_RULES) {
    if (rule.condition(stats)) {
      const lastTrigger = rule.lastTriggerTime || 0;
      if (now - lastTrigger > rule.cooldown) {
        await rule.action(stats);
        rule.lastTriggerTime = now;
      }
    }
  }
}

setInterval(evaluateAlerts, 5 * 60 * 1000); // 每 5 分钟检查一次
```

---

## 5. 综合实践：caidiaweb 监控体系接入

### 5.1 监控接入架构

```
┌──────────────────────────────────────────────────────────────┐
│              caidiaweb 监控体系架构                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Performance  │  │ 错误监控      │  │ 用户行为      │        │
│  │ Observer     │  │ (onerror     │  │ (面包屑)      │        │
│  │ 采集         │  │  unhandled   │  │              │        │
│  │              │  │  rejection)  │  │              │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                 │                │
│         └────────┬────────┴────────┬────────┘                │
│                  │                 │                         │
│          ┌───────▼───────────────┐                           │
│          │  Reporter (批量上报)   │                           │
│          │  sendBeacon + 队列    │                           │
│          └───────┬───────────────┘                           │
│                  │                                           │
│          ┌───────▼───────────────┐                           │
│          │  Node.js 接收层       │                           │
│          │  /api/monitor/collect │                           │
│          └───────┬───────────────┘                           │
│                  │                                           │
│          ┌───────▼───────────────┐                           │
│          │  时序数据库(存储)      │                           │
│          │  InfluxDB / PostgreSQL│                           │
│          └───────┬───────────────┘                           │
│                  │                                           │
│          ┌───────▼───────────────┐                           │
│          │  看板 + 告警          │                           │
│          │  自建 / Grafana       │                           │
│          └───────────────────────┘                           │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 接入清单

```
caidiaweb 监控接入步骤：

□ 1. 安装依赖
     npm install web-vitals（性能指标，已在3.1章节接入）

□ 2. 创建监控模块
     src/utils/reporter.js      ← sendBeacon 批量上报
     src/utils/error-monitor.js ← 错误采集
     src/utils/breadcrumbs.js   ← 用户行为记录
     src/utils/performance-observer.js ← 资源/长任务监听

□ 3. main.js 初始化
     import { initErrorMonitor } from '@/utils/error-monitor';
     import { initPerformanceObserver } from '@/utils/performance-observer';
     import { initBreadcrumbs } from '@/utils/breadcrumbs';
     import { initWebVitals } from '@/utils/metrics';

     initErrorMonitor();
     initPerformanceObserver();
     initBreadcrumbs();
     initWebVitals();

□ 4. Vue 错误边界
     app.config.errorHandler = ... （见 2.3 节）
     核心页面包裹 <ErrorBoundary>

□ 5. 页面卸载时强制上报
     flush on visibilitychange / pagehide

□ 6. 后端接收服务
     POST /api/monitor/collect
     数据清洗 + 存储（见下方示例）

□ 7. 监控看板
     /monitor/dashboard.html（见 4.1 节）

□ 8. 告警配置
     飞书/钉钉 Webhook 通知
```

### 5.3 后端接收服务

```javascript
// server/routes/monitor.js — Node.js 监控数据接收

const express = require('express');
const router = express.Router();

// 简易内存存储（生产应使用时序数据库）
const store = {
  metrics: [],  // 性能指标
  errors: [],   // 错误日志（只保留最近 1000 条）
  pv: new Map(), // page → count
};

// ===== 数据上报接收 =====
router.post('/collect', express.json({ limit: '1mb' }), (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const now = Date.now();
  const nowHour = new Date().toISOString().slice(0, 13); // "2026-06-29T14"

  for (const item of items) {
    const enriched = {
      ...item,
      serverTime: now,
      hour: nowHour,
      ip: req.ip,
    };

    if (item.type?.startsWith('error') || item.type === 'error_batch') {
      // 错误数据：只保留最近 1000 条
      if (Array.isArray(item.payload)) {
        store.errors.push(...item.payload);
      } else {
        store.errors.push(enriched);
      }
      if (store.errors.length > 1000) {
        store.errors = store.errors.slice(-1000);
      }
    } else {
      store.metrics.push(enriched);
    }

    // PV 统计
    if (item.type === 'navigation' || item.type === 'page_view') {
      const page = item.pageUrl || '/';
      store.pv.set(nowHour, (store.pv.get(nowHour) || 0) + 1);
    }
  }

  // sendBeacon 请求给 204
  res.status(204).end();
});

// ===== 仪表盘数据查询 =====
router.get('/summary', (req, res) => {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recentErrors = store.errors.filter(e => e.timestamp > hourAgo);

  // 计算错误率（假设每个页面访问都产生一条 metric）
  const pageViews = store.metrics.filter(
    m => m.type === 'page_view' && m.timestamp > hourAgo
  ).length || 1;

  const topErrors = getTopErrors(recentErrors, 5);

  res.json({
    pv: pageViews,
    errorCount: recentErrors.length,
    errorRate: recentErrors.length / pageViews,
    topErrors,
    slowPageRate: calculateSlowRate(store.metrics),
  });
});

function getTopErrors(errors, limit) {
  const counter = new Map();
  errors.forEach(e => {
    const key = e.message?.slice(0, 100) || 'unknown';
    counter.set(key, (counter.get(key) || 0) + 1);
  });
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([msg, count]) => ({ message: msg, count }));
}

function calculateSlowRate(metrics) {
  const lcpMetrics = metrics.filter(m => m.type === 'web_vital' && m.name === 'LCP');
  if (lcpMetrics.length === 0) return 0;
  const slowCount = lcpMetrics.filter(m => m.value > 4000).length;
  return slowCount / lcpMetrics.length;
}

module.exports = router;
```

---

## 6. 面试高频考点

### Q1：window.onerror 和 addEventListener('error') 的区别？

| 维度 | window.onerror | addEventListener('error') |
|------|---------------|--------------------------|
| JS 运行时错误 | ✅ 能捕获 | ✅ 能捕获（冒泡阶段） |
| 资源加载错误 | ❌ 不能 | ✅ 能（**必须**捕获阶段） |
| Promise 错误 | ❌ 不能 | ❌ 不能（用 unhandledrejection） |
| 多处理器 | 会被覆盖 | 可以注册多个 |

**实际组合使用**：`window.onerror`（JS错误）+ `addEventListener('error', ..., true)`（资源错误）+ `unhandledrejection`（Promise错误）。

### Q2：sendBeacon 和 fetch keepalive 的区别？

| 维度 | sendBeacon | fetch keepalive |
|------|-----------|-----------------|
| 数据大小限制 | 64KB（Blob） | 64KB（部分浏览器更大） |
| POST 数据格式 | Blob/String/FormData | 任意 |
| 响应处理 | 不关心响应 | 可获取响应 |
| 自定义请求头 | 不支持 | 支持 |
| 页面卸载时可靠性 | 最高 | 高 |

### Q3：为什么需要 1x1 GIF 像素上报？

历史上因为**跨域 img 请求所有浏览器都支持**，且不触发 CORS 预检。现在 `sendBeacon` 已覆盖 97%+ 浏览器，GIF 方案仅用于极端兼容场景（如老版本 IE 或特殊跨域限制）。

### Q4：前端监控采样率如何设计？

```javascript
// 全量采集：错误类（100%）
// 抽样采集：性能类（10-30%）
// 完全忽略：开发环境数据

const SAMPLE_RATES = {
  error: 1,        // 错误 100% 采集
  performance: 0.1, // 性能 10% 采样
  behavior: 0.05,   // 行为 5% 采样
};

function shouldSample(type) {
  const rate = SAMPLE_RATES[type] || 0.1;
  return Math.random() < rate;
}
```

### Q5：前端监控体系的完整架构包含哪些部分？

```
采集层：Performance API + onerror + unhandledrejection + 自定义埋点
传输层：sendBeacon + 批量队列 + pagehide 兜底
接入层：Node.js / Nginx 接收 + 限流 + 鉴权
存储层：时序数据库（InfluxDB/TimescaleDB）+ 日志（ELK）
展示层：Grafana 看板 + 自定义 Dashboard + 飞书/钉钉告警
```

---

> **动手建议**：在 caidiaweb 的 `main.js` 中按第 5 节接入清单逐项初始化监控模块，然后故意在某个按钮点击事件中 `throw new Error('测试上报')`，打开 Network 面板观察 `/api/monitor/collect` 是否收到了错误数据。
