# 2.10 Service Worker 与 PWA

> 浏览器与网络原理 · Service Worker 与渐进式 Web 应用 · 知识点总结与实践

---

## 目录

1. [Service Worker 基础概念](#1-service-worker-基础概念)
2. [Service Worker 生命周期](#2-service-worker-生命周期)
3. [离线缓存策略](#3-离线缓存策略)
4. [PWA 核心组成](#4-pwa-核心组成)
5. [实践案例：离线可用的天气查询页](#5-实践案例离线可用的天气查询页)
6. [进阶：Background Sync 与 Push Notification](#6-进阶background-sync-与-push-notification)
7. [调试与排错](#7-调试与排错)
8. [常见问题与注意事项](#8-常见问题与注意事项)
9. [面试高频考点](#9-面试高频考点)
10. [推荐资源](#10-推荐资源)

---

## 1. Service Worker 基础概念

### 1.1 什么是 Service Worker

Service Worker 是运行在**浏览器后台**的独立 JavaScript 线程，充当浏览器与网络之间的**可编程代理层**。它独立于网页，可以拦截和处理网络请求，管理缓存，甚至在浏览器关闭后仍可运行（推送通知场景）。

```
┌──────────────────────────────────────────────────┐
│                    浏览器                          │
│  ┌─────────────┐         ┌─────────────────────┐ │
│  │   主线程     │         │  Service Worker     │ │
│  │  (Window)   │◄───────►│  (独立 Worker 线程)  │ │
│  │             │ postMsg │                     │ │
│  │  DOM/CSSOM  │         │  无 DOM 访问权限     │ │
│  │  页面渲染    │         │  拦截 fetch 请求     │ │
│  └─────────────┘         │  管理 Cache Storage  │ │
│                           └──────────┬──────────┘ │
│                                      │             │
│                              ┌───────▼───────┐     │
│                              │   网络请求      │     │
│                              └───────────────┘     │
└──────────────────────────────────────────────────┘
```

### 1.2 核心特征

| 特征 | 说明 |
|------|------|
| **独立线程** | 与主线程分离，不共享 DOM，通过 `postMessage` 通信 |
| **拦截请求** | 可以拦截页面发出的所有 `fetch` 请求 |
| **可编程缓存** | 使用 Cache API 精确控制缓存策略 |
| **事件驱动** | 基于事件模型，空闲时自动终止，需要时重新唤醒 |
| **HTTPS 限定** | 必须在 HTTPS 环境下运行（localhost 除外） |

### 1.3 与 Web Worker 的区别

| 维度 | Web Worker | Service Worker |
|------|-----------|----------------|
| 生命周期 | 跟随页面 | 独立于页面 |
| 拦截请求 | 不能 | 可以 |
| 页面关闭后 | 终止 | 可继续运行 |
| 多页面共享 | 不可 | 可以（同源共享） |
| 使用场景 | 密集计算 | 离线缓存、推送、后台同步 |

---

## 2. Service Worker 生命周期

### 2.1 完整生命周期图

```
            ┌──────────┐
    n.onready  │ Register │  navigator.serviceWorker.register()
            └────┬─────┘
                 │
        ┌────────▼────────┐
        │   Installing    │  install 事件（仅执行一次）
        │  (安装中)        │  self.skipWaiting() 跳过等待
        └────────┬────────┘
                 │ install 完成
        ┌────────▼────────┐
        │    Waiting      │  等待旧 SW 控制的所有页面关闭
        │   (等待激活)     │  或调用 self.skipWaiting()
        └────────┬────────┘
                 │ 旧页面关闭 或 skipWaiting()
        ┌────────▼────────┐
        │     Active      │  activate 事件
        │    (已激活)      │  clients.claim() 立即控制页面
        └────────┬────────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
 ┌────▼───┐ ┌────▼───┐ ┌────▼───┐
 │ fetch  │ │message │ │ push   │ ...
 │ 事件   │ │  事件  │ │ 事件   │
 └────────┘ └────────┘ └────────┘
                 │
        ┌────────▼────────┐
        │   Terminated    │  空闲时被浏览器终止
        │   (已终止)       │  事件触发时重新唤醒
        └─────────────────┘
```

### 2.2 各阶段详解

#### Register（注册）

```javascript
// 主页面注册 Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', {
    scope: '/'  // 控制范围，默认相对于 sw.js 所在路径
  }).then(registration => {
    console.log('SW 注册成功:', registration.scope);
    
    // 监听更新发现
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('发现新 SW 正在安装...');
    });
  }).catch(err => {
    console.error('SW 注册失败:', err);
  });
}
```

> **scope 说明**：SW 只能控制 scope 路径下的页面。例如 `scope: '/app/'` 只能拦截 `/app/` 下的请求。

#### Install（安装）

安装阶段是**预缓存**静态资源的最佳时机：

```javascript
// sw.js
const CACHE_NAME = 'my-app-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/app.js',
  '/images/logo.png'
];

self.addEventListener('install', event => {
  console.log('SW 安装中...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // 立即激活，不等待
  );
});
```

**关键点**：
- `event.waitUntil()` — 接收一个 Promise，延长 install 阶段直到 Promise resolve
- `self.skipWaiting()` — 让新 SW 跳过 waiting 阶段，立即进入 activate
- 预缓存应在 install 中完成，而非 activate

#### Waiting → Activate（等待 → 激活）

SW 更新的默认行为：
1. 用户打开页面 A，SW-v1 已激活并控制页面 A
2. 浏览器检测到 sw.js 有变化（字节级对比）
3. 新 SW-v2 开始 install，完成后进入 waiting
4. SW-v2 等待**所有**被 v1 控制的页面关闭
5. 用户关闭所有旧页面后再打开，v2 激活

**实操最佳实践**：

```javascript
// 注册时提示用户刷新
navigator.serviceWorker.register('/sw.js').then(reg => {
  reg.addEventListener('updatefound', () => {
    const newWorker = reg.installing;
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // 新 SW 已就绪，提示用户刷新
        showUpdateBanner('有新版本可用，点击刷新');
      }
    });
  });
});

let refreshing = false;
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (refreshing) return;
  refreshing = true;
  window.location.reload();
});
```

#### Activate（激活）

激活阶段用于**清理旧缓存**：

```javascript
// sw.js
const CURRENT_CACHES = ['my-app-v2']; // 当前版本使用的缓存名

self.addEventListener('activate', event => {
  console.log('SW 激活中...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 删除不在白名单中的旧缓存
          if (!CURRENT_CACHES.includes(cacheName)) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // 立即控制所有页面
  );
});
```

**关键方法对比**：

| 方法 | 作用 | 调用时机 |
|------|------|---------|
| `self.skipWaiting()` | 新 SW 跳过 waiting，立即激活 | install 阶段 |
| `self.clients.claim()` | 新 SW 立即接管所有页面 | activate 阶段 |

---

## 3. 离线缓存策略

### 3.1 策略总览

```
┌─────────────────────────────────────────────────────────┐
│                    缓存策略决策树                          │
│                                                         │
│  请求是静态资源（JS/CSS/字体/图片）？                      │
│      ├── 是 → Cache First（缓存优先）                     │
│      └── 否 → 是 API 数据？                              │
│                ├── 是 → Network First（网络优先）         │
│                └── 否 → 是新闻/资讯类内容？                │
│                          ├── 是 → Stale While Revalidate  │
│                          └── 否 → Network Only            │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Cache First（缓存优先）

适用于**版本化静态资源**（带 hash 的 JS/CSS/字体）。

```
请求发起
    │
    ▼
┌──────────┐   命中   ┌──────────┐
│  检查缓存  ├────────►│  返回缓存  │
└─────┬────┘          └──────────┘
      │ 未命中
      ▼
┌──────────┐           ┌──────────┐
│  网络请求  ├──────────►│  返回响应  │
└──────────┘           └─────┬────┘
                             │
                      ┌──────▼──────┐
                      │  存入缓存    │  (可选)
                      └─────────────┘
```

```javascript
// Cache First 实现
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse; // 命中缓存直接返回
      }
      return fetch(event.request).then(response => {
        // 可选：将新获取的响应存入缓存
        return caches.open('dynamic-cache-v1').then(cache => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
```

### 3.3 Network First（网络优先）

适用于**需要实时性的 API 数据**。

```
请求发起
    │
    ▼
┌──────────┐   成功   ┌──────────┐
│  网络请求  ├────────►│  返回响应  │
└─────┬────┘          └─────┬────┘
      │ 失败               │
      ▼                    ▼
┌──────────┐         ┌──────────┐
│  检查缓存  │         │  存入缓存  │
└─────┬────┘         └──────────┘
      │
      ▼
┌──────────┐
│  返回缓存  │ (兜底)
└──────────┘
```

```javascript
// Network First 实现
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 网络请求成功，更新缓存
        const responseClone = response.clone();
        caches.open('api-cache-v1').then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // 网络请求失败，回退到缓存
        return caches.match(event.request);
      })
  );
});
```

### 3.4 Stale While Revalidate（缓存优先，后台更新）

适用于**图片、文章内容等非关键实时数据**。

```
请求发起
    │
    ├──────────────────────────────┐
    ▼                              ▼
┌──────────┐                 ┌──────────┐
│  检查缓存  │                 │  网络请求  │ (后台进行)
└─────┬────┘                 └─────┬────┘
      │                            │
      ▼                            ▼
┌──────────┐                 ┌──────────┐
│  先返回   │                 │  更新缓存  │ (下次访问使用)
│  缓存内容  │                 └──────────┘
└──────────┘
```

```javascript
// Stale While Revalidate 实现
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open('stale-cache-v1').then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        // 发起网络请求（不阻塞返回）
        const fetchPromise = fetch(event.request).then(networkResponse => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });

        // 立即返回缓存内容，若无缓存则等待网络
        return cachedResponse || fetchPromise;
      });
    })
  );
});
```

### 3.5 策略选择速查表

| 策略 | 适用场景 | 首次访问 | 二次访问 | 离线可用 |
|------|---------|---------|---------|---------|
| Cache First | 版本化静态资源 | 网络 | 秒开 | ✅ |
| Network First | API 数据 | 网络 | 网络(快) | 可兜底 |
| Stale While Revalidate | 图片/文章 | 网络 | 立即+更新 | ✅ |
| Network Only | 实时交易 | 网络 | 网络 | ❌ |
| Cache Only | 纯离线应用内容 | - | - | ✅ |

---

## 4. PWA 核心组成

### 4.1 PWA 三大支柱

```
       ┌──────────────────────────────┐
       │           PWA                │
       └──────────────────────────────┘
          │          │           │
   ┌──────▼──┐ ┌────▼────┐ ┌───▼──────┐
   │ HTTPS   │ │   SW    │ │ Manifest │
   │ 必须    │ │ 离线能力 │ │ 安装体验  │
   └─────────┘ └─────────┘ └──────────┘
```

PWA（Progressive Web App）是一组技术和理念的集合，让 Web 应用拥有接近 Native App 的体验。

### 4.2 manifest.json 配置详解

`manifest.json` 定义了 PWA 安装后在设备上的表现方式：

```json
{
  "name": "我的天气应用",
  "short_name": "天气",
  "description": "离线可用的天气查询 PWA",
  "start_url": "/index.html",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#2196F3",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/home.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  "categories": ["weather", "utilities"],
  "lang": "zh-CN"
}
```

> 在 HTML 中引入：`<link rel="manifest" href="/manifest.json">`

**关键字段说明**：

| 字段 | 值 | 说明 |
|------|----|------|
| `display` | `standalone` | 独立窗口（最佳体验） |
| | `fullscreen` | 全屏 |
| | `minimal-ui` | 浏览器最小 UI |
| | `browser` | 普通浏览器标签 |
| `theme_color` | 颜色值 | 状态栏/工具栏颜色 |
| `background_color` | 颜色值 | 启动屏背景色 |
| `start_url` | 路径 | PWA 启动时打开的 URL |

### 4.3 安装提示（Install Prompt）

浏览器会在满足条件时触发 `beforeinstallprompt` 事件：

```javascript
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // 阻止浏览器默认安装提示
  e.preventDefault();
  
  // 保存事件，稍后触发
  deferredPrompt = e;
  
  // 显示自定义安装按钮
  const installBtn = document.getElementById('install-btn');
  installBtn.style.display = 'block';
  
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    // 触发浏览器安装提示
    deferredPrompt.prompt();
    
    // 等待用户选择
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`用户选择: ${outcome}`); // 'accepted' 或 'dismissed'
    
    // 清除引用
    deferredPrompt = null;
    installBtn.style.display = 'none';
  });
});

// 监听安装完成
window.addEventListener('appinstalled', () => {
  console.log('PWA 安装成功！');
});
```

**PWA 安装条件（Chrome）**：
1. 站点使用 HTTPS
2. 已注册 Service Worker（含 `fetch` 事件处理）
3. 有合法的 `manifest.json`（含 192px 和 512px 图标）
4. 用户在此站点有足够的交互（Chrome 的启发式评估）

---

## 5. 实践案例：离线可用的天气查询页

### 5.1 项目结构

```
weather-pwa/
├── index.html          # 主页面
├── manifest.json        # PWA 配置
├── sw.js               # Service Worker
├── styles/
│   └── main.css         # 样式
├── scripts/
│   └── app.js           # 主逻辑
└── icons/
    ├── icon-192x192.png
    └── icon-512x512.png
```

### 5.2 index.html

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#2196F3">
  <title>天气查询 PWA</title>
  <link rel="manifest" href="/manifest.json">
  <link rel="stylesheet" href="/styles/main.css">
  <!-- iOS Safari 支持 -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png">
</head>
<body>
  <header>
    <h1>🌤️ 天气查询</h1>
    <button id="install-btn" style="display:none">安装到桌面</button>
  </header>

  <main>
    <div class="search-box">
      <input type="text" id="city-input" placeholder="输入城市名称，如：北京">
      <button id="search-btn">查询</button>
    </div>

    <div id="weather-result" class="weather-card" style="display:none">
      <div class="weather-header">
        <h2 id="city-name">--</h2>
        <span id="update-time">--</span>
        <span id="online-status" class="badge online">在线</span>
      </div>
      <div class="weather-body">
        <div class="temp-display">
          <span id="temperature">--</span>
          <span class="unit">°C</span>
        </div>
        <div class="weather-desc" id="weather-desc">--</div>
      </div>
      <div class="weather-details">
        <div><span>湿度</span><span id="humidity">--</span></div>
        <div><span>风速</span><span id="wind">--</span></div>
        <div><span>体感</span><span id="feels-like">--</span></div>
      </div>
      <!-- 离线缓存提示 -->
      <div id="offline-badge" class="offline-badge" style="display:none">
        📴 当前为离线缓存数据
      </div>
    </div>

    <div id="error-msg" class="error-msg" style="display:none"></div>
  </main>

  <script src="/scripts/app.js"></script>
</body>
</html>
```

### 5.3 sw.js — Service Worker 核心

```javascript
// sw.js — Service Worker
const CACHE_NAME = 'weather-pwa-v1';
const API_CACHE_NAME = 'weather-api-v1';

// 预缓存的静态资源
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// ===== install：预缓存静态资源 =====
self.addEventListener('install', event => {
  console.log('[SW] 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ===== activate：清理旧缓存 =====
self.addEventListener('activate', event => {
  console.log('[SW] 激活中...');
  const validCaches = [CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => !validCaches.includes(key))
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ===== fetch：混合缓存策略 =====
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求和 chrome-extension 请求
  if (request.method !== 'GET') return;

  // 策略1：API 请求 → Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE_NAME));
    return;
  }

  // 策略2：静态资源 → Cache First
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // 策略3：HTML 页面 → Network First
  event.respondWith(networkFirst(request, CACHE_NAME));
});

// ===== 策略函数实现 =====

// Cache First — 适用于版本化静态资源
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    // 离线且无缓存时：返回离线页面
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    throw err;
  }
}

// Network First — 适用于 API / HTML
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

// 判断是否为静态资源
function isStaticAsset(request) {
  const url = new URL(request.url);
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.svg', '.woff2', '.json'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}
```

### 5.4 app.js — 主页面逻辑

```javascript
// app.js — 主页面逻辑
const API_BASE = '/api/weather';

// ===== 注册 Service Worker =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW 注册成功:', registration.scope);
      
      // 监听 SW 更新
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('有新版本可用，请刷新页面');
          }
        });
      });
    } catch (err) {
      console.error('SW 注册失败:', err);
    }
  });
}

// ===== 在线/离线状态监听 =====
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

function updateOnlineStatus() {
  const badge = document.getElementById('online-status');
  const offlineBadge = document.getElementById('offline-badge');
  
  if (navigator.onLine) {
    badge.textContent = '在线';
    badge.className = 'badge online';
    offlineBadge.style.display = 'none';
  } else {
    badge.textContent = '离线';
    badge.className = 'badge offline';
    offlineBadge.style.display = 'block';
  }
}

// ===== PWA 安装提示 =====
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('install-btn').style.display = 'inline-block';
});

document.getElementById('install-btn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    document.getElementById('install-btn').style.display = 'none';
  }
  deferredPrompt = null;
});

window.addEventListener('appinstalled', () => {
  console.log('PWA 已安装');
  deferredPrompt = null;
});

// ===== 天气查询 =====
document.getElementById('search-btn').addEventListener('click', searchWeather);
document.getElementById('city-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchWeather();
});

async function searchWeather() {
  const city = document.getElementById('city-input').value.trim();
  if (!city) return;

  try {
    const response = await fetch(`${API_BASE}?city=${encodeURIComponent(city)}`);
    if (!response.ok) throw new Error('查询失败');
    
    const data = await response.json();
    renderWeather(data, !navigator.onLine);
  } catch (err) {
    console.error('请求失败:', err);
    document.getElementById('error-msg').style.display = 'block';
    document.getElementById('error-msg').textContent = '查询天气失败，请检查网络连接';
  }
}

function renderWeather(data, fromCache = false) {
  document.getElementById('weather-result').style.display = 'block';
  document.getElementById('error-msg').style.display = 'none';
  
  document.getElementById('city-name').textContent = data.city;
  document.getElementById('temperature').textContent = data.temp;
  document.getElementById('weather-desc').textContent = data.desc;
  document.getElementById('humidity').textContent = data.humidity + '%';
  document.getElementById('wind').textContent = data.windSpeed + ' km/h';
  document.getElementById('feels-like').textContent = data.feelsLike + '°C';
  document.getElementById('update-time').textContent = 
    '更新于 ' + new Date(data.timestamp).toLocaleTimeString();
  
  if (fromCache) {
    document.getElementById('offline-badge').style.display = 'block';
  }
}

function showToast(message) {
  // 简单的 toast 实现（省略细节）
  alert(message);
}
```

### 5.5 main.css

```css
/* main.css — 基础样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f0f4f8;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background: #2196F3;
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

header h1 {
  font-size: 20px;
}

#install-btn {
  background: white;
  color: #2196F3;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

main {
  flex: 1;
  padding: 20px;
  max-width: 500px;
  margin: 0 auto;
  width: 100%;
}

.search-box {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.search-box input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}

.search-box button {
  padding: 12px 24px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.weather-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.weather-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
}

.badge.online { background: #e8f5e9; color: #2e7d32; }
.badge.offline { background: #fff3e0; color: #e65100; }

.temp-display {
  font-size: 48px;
  font-weight: 300;
  margin-bottom: 8px;
}

.weather-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.weather-details div {
  text-align: center;
}

.weather-details span:first-child {
  display: block;
  font-size: 12px;
  color: #78909c;
  margin-bottom: 4px;
}

.offline-badge {
  margin-top: 16px;
  padding: 10px;
  background: #fff3e0;
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
  color: #e65100;
}

.error-msg {
  background: #ffebee;
  color: #c62828;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
}
```

---

## 6. 进阶：Background Sync 与 Push Notification

### 6.1 Background Sync（后台同步）

允许在用户离线时暂存操作，恢复网络后自动同步：

```javascript
// sw.js — 监听 sync 事件
self.addEventListener('sync', event => {
  if (event.tag === 'sync-weather-data') {
    event.waitUntil(syncWeatherData());
  }
});

async function syncWeatherData() {
  // 从 IndexedDB 读取离线时存储的请求
  const db = await openDB();
  const pendingRequests = await db.getAll('pending-requests');
  
  for (const req of pendingRequests) {
    try {
      const response = await fetch(req.url);
      // 将结果通过 postMessage 通知页面
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'sync-complete',
          requestId: req.id,
          data: response.status
        });
      });
      // 成功后删除待处理请求
      await db.delete('pending-requests', req.id);
    } catch (err) {
      console.error('同步失败:', err);
    }
  }
}

// 页面中注册 Sync
async function registerSync() {
  const registration = await navigator.serviceWorker.ready;
  if ('sync' in registration) {
    await registration.sync.register('sync-weather-data');
  }
}
```

### 6.2 Push Notification（推送通知）

```javascript
// sw.js
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || '新消息',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '通知', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientsArr => {
      const existing = clientsArr.find(c => c.url === url);
      if (existing) {
        existing.focus();
      } else {
        clients.openWindow(url);
      }
    })
  );
});

// 页面中请求通知权限
async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    // 获取 Push 订阅（需要服务端配合 VAPID key）
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY')
    });
    // 将 subscription 发送到服务端存储
    await fetch('/api/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription)
    });
  }
}
```

---

## 7. 调试与排错

### 7.1 Chrome DevTools

```
Application 面板
├── Service Workers
│   ├── Update / Unregister
│   ├── Bypass for network (强制走网络)
│   ├── Update on reload (每次刷新强制更新 SW)
│   └── 查看当前 SW 状态和源码
├── Cache Storage
│   └── 查看所有缓存库内容
└── Manifest
    └── 检测 manifest.json 配置
```

### 7.2 常用调试命令

```javascript
// 在 DevTools Console 中执行

// 查看所有注册的 SW
navigator.serviceWorker.getRegistrations().then(console.table);

// 手动注销所有 SW
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(r => r.unregister()));

// 强制触发 SW 更新
navigator.serviceWorker.getRegistration().then(r => r.update());

// 查看所有缓存
caches.keys().then(console.log);

// 查看某个缓存的内容
caches.open('weather-pwa-v1')
  .then(cache => cache.keys())
  .then(keys => {
    keys.forEach(req => console.log(req.url));
  });
```

### 7.3 使用 chrome://serviceworker-internals

在 Chrome 地址栏输入 `chrome://serviceworker-internals/`，可以看到：
- 所有已注册的 Service Worker
- 每个 SW 的运行状态
- 控制台日志
- 手动停止/启动

---

## 8. 常见问题与注意事项

### 8.1 Service Worker 更新机制

| 场景 | 行为 |
|------|------|
| sw.js 文件内容变化 | 浏览器检测到后触发新的 install |
| 用户已打开旧页面 | 新 SW 进入 waiting，等待旧页面都关闭 |
| 调用了 `skipWaiting()` | 新 SW 立即激活 |
| 调用了 `clients.claim()` | 新 SW 立即控制所有页面 |
| SW 控制前发出的请求 | 不会被拦截，走的原生网络 |

### 8.2 常见陷阱

1. **缓存膨胀**：定期在 `activate` 中清理旧版本缓存
2. **SW 作用域限制**：`scope` 参数不能覆盖路径外的页面
3. **跨域请求**：SW 可以拦截，但 `opaque response`（status=0）无法读取 body
4. **Memory Leak**：`response.clone()` 后若不用记得释放
5. **iOS Safari 限制**：iOS 上对 Cache API 的存储有 50MB 限制，且存储可能被系统清理
6. **首次加载不走 SW**：SW 在注册后的下一次导航才生效

### 8.3 缓存版本管理最佳实践

```javascript
// 推荐：通过常量管理缓存版本
const CACHE_VERSION = 'v2.1.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

// 每次发布时更新 CACHE_VERSION
// activate 中自动清理所有不包含当前版本的缓存
```

### 8.4 兼容性处理

```javascript
// 渐进增强：检测特性支持
const supports = {
  serviceWorker: 'serviceWorker' in navigator,
  cache: 'caches' in window,
  sync: 'serviceWorker' in navigator && 'SyncManager' in window,
  push: 'serviceWorker' in navigator && 'PushManager' in window,
  beforeInstall: 'BeforeInstallPromptEvent' in window
};

// 只在使用特性时才调用
if (supports.beforeInstall) {
  // 监听 install prompt
}
```

---

## 9. 面试高频考点

### 9.1 生命周期题

> **Q: Service Worker 的生命周期是怎样的？**

**答**：register → install（可做预缓存）→ waiting（等待旧 SW 释放页面）→ active（清理旧缓存，claim 页面）→ 监听 fetch/push/sync 等事件 → terminated（空闲后释放）。

### 9.2 缓存策略对比题

> **Q: Cache First 和 Network First 的区别？分别适用什么场景？**

**答**：

| 策略 | 流程 | 适用 |
|------|------|------|
| Cache First | 先查缓存，未命中再走网络 | 版本化静态资源（hash 文件名） |
| Network First | 先走网络，失败回退缓存 | API 数据、HTML 页面 |

### 9.3 实际应用题

> **Q: PWA 需要满足哪些条件才能触发安装提示？**

**答**：
1. HTTPS 安全连接
2. 已注册 Service Worker（含 fetch 事件处理）
3. 有效的 manifest.json（含至少 192px 和 512px 图标）
4. 用户有足够的站点互动（Chrome 启发式评估）

### 9.4 性能题

> **Q: Service Worker 缓存和 HTTP 缓存的区别？**

**答**：

| 维度 | HTTP 缓存 | Service Worker 缓存 |
|------|----------|-------------------|
| 控制方 | 服务端 + 浏览器 | 完全由开发者代码控制 |
| 离线可用 | 需曾经访问过 | 可预缓存，首访后即离线可用 |
| 策略灵活性 | 固定的缓存策略 | 任意自定义策略 |
| 存储位置 | 浏览器 HTTP 缓存 | Cache Storage API |

### 9.5 实战陷阱题

> **Q: 为什么 sw.js 中的 `self.skipWaiting()` 可能导致页面状态不一致？**

**答**：`skipWaiting()` 让新 SW 立即激活，但**已经打开的旧页面仍然由旧 SW 控制**。如果新 SW 的缓存策略与旧版本不兼容（如删除了旧缓存），会导致页面出现资源加载错误。解决方案：配合 `clients.claim()` 或提示用户刷新页面。

---

## 10. 推荐资源

### 官方文档
- [Service Worker API - MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API)
- [PWA 官方文档 - web.dev](https://web.dev/progressive-web-apps/)
- [Workbox - Google 的 SW 工具库](https://developer.chrome.com/docs/workbox/)

### 工具
- **Workbox** — 封装常见缓存策略，简化 SW 开发
- **Lighthouse** — 检测 PWA 合规性
- **Chrome DevTools Application 面板** — 调试 SW 和缓存

### 推荐书籍
- 《Web 性能权威指南》
- 《Progressive Web Apps with React》（PWA 与 React 结合实践）

---

> **动手实践建议**：将上述天气查询 PWA 案例在本地跑通，然后用 Chrome DevTools 的 Application 面板观察 SW 生命周期每个阶段的变化。修改sw.js中的 CACHE_VERSION，触发一次 SW 更新，观察 cached responses 的变化。
