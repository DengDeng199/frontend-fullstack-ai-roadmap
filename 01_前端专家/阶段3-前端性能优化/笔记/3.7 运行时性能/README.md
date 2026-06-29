# 3.7 运行时性能

> 前端性能优化 · 长任务分片 · Web Worker · requestAnimationFrame · CSS vs JS 动画

---

## 目录

1. [长任务分片](#1-长任务分片)
2. [Web Worker](#2-web-worker)
3. [requestAnimationFrame](#3-requestanimationframe)
4. [CSS 动画 vs JS 动画](#4-css-动画-vs-js-动画)
5. [综合实践：caidiaweb 运行时优化](#5-综合实践caidiaweb-运行时优化)
6. [面试高频考点](#6-面试高频考点)

---

## 1. 长任务分片

### 1.1 什么是长任务

```
浏览器一帧（16.67ms @ 60fps）的工作：

┌────────────────────────── 16.67ms ──────────────────────────┐
│ JS执行 │ 样式计算 │ 布局(回流) │ 绘制 │ 合成 │ 空闲(如有)      │
└─────────────────────────────────────────────────────────────┘

如果 JS 执行超过 50ms → 被标记为 Long Task（长任务）
→ 帧被延迟 → 用户感知卡顿 → INP 指标恶化
```

### 1.2 三种分片方案对比

```
┌──────────────────────────────────────────────────────────────┐
│              长任务分片三种方案                                │
├──────────────┬─────────────┬───────────────┬────────────────┤
│    方案       │  触发时机    │   优先级       │   浏览器兼容    │
├──────────────┼─────────────┼───────────────┼────────────────┤
│ setTimeout   │ 延迟指定时间  │ 由任务队列决定  │ 所有            │
│ (分片基准)    │ (≥4ms)      │ 低(不保证精确)  │               │
├──────────────┼─────────────┼───────────────┼────────────────┤
│ requestIdle  │ 浏览器空闲时  │ 最低           │ Chrome/Edge/   │
│ Callback     │             │ 不保证执行       │ Firefox        │
├──────────────┼─────────────┼───────────────┼────────────────┤
│ scheduler    │ 由调度器决定  │ 可控(user-     │ Chrome 115+    │
│ .yield()     │ (更灵活)     │  blocking/     │ (2024 新标准)  │
│              │             │  background)   │               │
└──────────────┴─────────────┴───────────────┴────────────────┘
```

### 1.3 requestIdleCallback 实战

```javascript
// 典型场景：处理 10,000 条数据计算

// ❌ 错误：阻塞主线程 3 秒
function processAll(items) {
  const results = [];
  for (const item of items) {
    results.push(heavyCompute(item)); // 每条 0.3ms × 10000 = 3s
  }
  return results;
}


// ✅ 方案1：requestIdleCallback 分片
function processWithIdleCallback(items, onProgress) {
  const results = [];
  let index = 0;

  function processChunk(deadline) {
    // deadline.timeRemaining() → 当前帧剩余空闲时间(ms)
    // deadline.didTimeout → 是否超时(设置了 timeout 时)

    while (index < items.length && deadline.timeRemaining() > 1) {
      results.push(heavyCompute(items[index]));
      index++;
    }

    onProgress?.(index, items.length);

    if (index < items.length) {
      // 还有数据 → 等待下一个空闲帧
      requestIdleCallback(processChunk, { timeout: 2000 });
    } else {
      // 全部完成
      console.log('处理完成:', results.length);
    }
  }

  requestIdleCallback(processChunk, { timeout: 2000 });
  // timeout: 最多等 2s，超时后即使不空闲也强制执行（防止饿死）
}

// 使用
processWithIdleCallback(stations, (done, total) => {
  updateProgressBar(done / total);
});
```

```javascript
// ✅ 方案2：scheduler.yield() 分片（现代方案）
// Chrome 115+ 支持，更符合 W3C 标准

async function processWithYield(items, onProgress) {
  const results = [];
  const CHUNK_SIZE = 50;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);

    chunk.forEach(item => {
      results.push(heavyCompute(item));
    });

    onProgress?.(Math.min(i + CHUNK_SIZE, items.length), items.length);

    // 让出主线程，给浏览器处理用户交互和渲染的机会
    if (i + CHUNK_SIZE < items.length) {
      await scheduler.yield();
    }
  }

  return results;
}

// 降级封装（兼容不支持 scheduler.yield 的浏览器）
const yieldToMain = () =>
  'scheduler' in window && 'yield' in scheduler
    ? scheduler.yield()
    : new Promise(resolve => setTimeout(resolve, 0));
```

### 1.4 时间切片通用工具

```javascript
// utils/timeSlicing.js — 通用的时间切片工具

/**
 * 在空闲时间执行耗时任务，不阻塞主线程
 * 
 * @param {Array|number} items - 数据或总数
 * @param {Function} processFn - 处理函数 (item, index) => result
 * @param {Object} options
 * @param {number} options.chunkSize - 每批数量，默认 50
 * @param {number} options.timeout - 超时(ms)，默认永不超时
 * @param {Function} options.onProgress - 进度回调 (done, total)
 * @returns {Promise<Array>} 结果数组
 */
export async function timeSlicing(items, processFn, options = {}) {
  const {
    chunkSize = 50,
    timeout = Infinity,
    onProgress,
  } = options;

  const startTime = performance.now();
  const results = [];
  const total = Array.isArray(items) ? items.length : items;

  for (let i = 0; i < total; i += chunkSize) {
    const end = Math.min(i + chunkSize, total);

    for (let j = i; j < end; j++) {
      const item = Array.isArray(items) ? items[j] : j;
      results.push(processFn(item, j));
    }

    onProgress?.(end, total);

    // 检查是否超时
    if (performance.now() - startTime > timeout) {
      console.warn('时间切片超时，剩余任务被跳过');
      break;
    }

    // 让出主线程
    if (end < total) {
      await yieldToMain();
    }
  }

  return results;
}


// DOM 渲染版本：按批次往 DOM 中添加节点
export function renderInChunks(items, createElement, container, chunkSize = 50) {
  let index = 0;

  function processFrame(deadline) {
    // 在当前帧用完前尽可能多地渲染
    while (index < items.length && deadline.timeRemaining() > 2) {
      const end = Math.min(index + chunkSize, items.length);

      // 使用 DocumentFragment 批量插入（仅一次回流）
      const fragment = document.createDocumentFragment();
      for (let i = index; i < end; i++) {
        fragment.appendChild(createElement(items[i], i));
      }
      container.appendChild(fragment);

      index = end;
    }

    if (index < items.length) {
      requestIdleCallback(processFrame, { timeout: 3000 });
    }
  }

  requestIdleCallback(processFrame, { timeout: 3000 });
}


// ===== 辅助：让出主线程 =====
function yieldToMain() {
  if ('scheduler' in window && 'yield' in scheduler) {
    return scheduler.yield();
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}
```

```vue
<!-- 使用示例：数据大屏统计数据实时计算 -->
<script setup>
import { ref } from 'vue';
import { timeSlicing } from '@/utils/timeSlicing';

const stats = ref([]);
const progress = ref(0);

async function computeStats(rawData) {
  // 10,000 条原始数据 → 时间切片计算统计指标
  const results = await timeSlicing(
    rawData,
    (item) => {
      // 每条数据的复杂计算（原本累积 3s+，现在分片到空闲帧）
      return {
        id: item.id,
        avg: calculateMovingAverage(item.values),
        peak: Math.max(...item.values),
        trend: detectTrend(item.values),
      };
    },
    {
      chunkSize: 30,
      timeout: 10000,
      onProgress: (done, total) => {
        progress.value = Math.round((done / total) * 100);
      },
    }
  );

  stats.value = results;
}
</script>
```

---

## 2. Web Worker

### 2.1 主线程 vs Worker 线程

```
┌──────────────────────┐     ┌──────────────────────┐
│      主线程           │     │    Worker 线程         │
├──────────────────────┤     ├──────────────────────┤
│ ✅ DOM 操作           │     │ ❌ 无 DOM 访问         │
│ ✅ 事件监听           │     │ ❌ 无 window 部分 API  │
│ ✅ CSS 动画           │     │ ✅ 纯计算              │
│ ✅ 用户交互           │     │ ✅ 网络请求(fetch)     │
│ ❌ 不应做重计算        │     │ ✅ 大数据处理          │
└──────────────────────┘     └──────────────────────┘
         │                           │
         └── postMessage ──► 通讯 ◄──┘
```

### 2.2 适合放入 Worker 的任务

```
适合 Web Worker 的计算场景：

✅ 数据聚合/统计（caidiaweb 大屏数据预处理）
✅ JSON 大对象序列化/反序列化
✅ 图像处理（Canvas 像素操作）
✅ CSV/Excel 文件解析
✅ 地图数据预处理（GeoJSON 简化/裁剪）
✅ 加密/解密操作
✅ 正则表达式大量匹配

不适合 Web Worker：
❌ 需要 DOM 的操作
❌ 轻量任务（通信开销 > 计算开销）
```

### 2.3 Worker 基础实现

```javascript
// workers/stats.worker.js — 统计计算 Worker

// Worker 内的全局对象是 self（不是 window）
self.onmessage = function (e) {
  const { type, payload } = e.data;

  switch (type) {
    case 'CALCULATE_STATS':
      const result = calculateStats(payload.data);
      // 将结果发送回主线程
      self.postMessage({ type: 'STATS_RESULT', payload: result });
      break;

    case 'PROCESS_GEOJSON':
      const simplified = simplifyGeoJSON(payload.geojson, payload.tolerance);
      self.postMessage({ type: 'GEOJSON_RESULT', payload: simplified });
      break;

    case 'HEAVY_FILTER':
      const filtered = heavyFilter(payload.items, payload.keyword);
      self.postMessage({ type: 'FILTER_RESULT', payload: filtered });
      break;

    default:
      console.warn('Unknown message type:', type);
  }
};

// ===== Worker 内的计算逻辑 =====

function calculateStats(data) {
  const values = data.map(item => item.value);
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;

  return {
    count: values.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(mean * 100) / 100,
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p99: percentile(sorted, 99),
    stdDev: Math.sqrt(
      values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length
    ),
  };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

function simplifyGeoJSON(geojson, tolerance) {
  // 简化地图边界点（道格拉斯-普克算法简化版）
  function douglasPeucker(points, epsilon) {
    if (points.length < 3) return points;
    let maxDist = 0, maxIndex = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const dist = perpendicularDist(points[i], points[0], points[points.length - 1]);
      if (dist > maxDist) { maxDist = dist; maxIndex = i; }
    }
    if (maxDist <= epsilon) return [points[0], points[points.length - 1]];
    const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIndex), epsilon);
    return left.slice(0, -1).concat(right);
  }
  // 对所有 polygon 的坐标进行简化...
  return geojson;
}

function heavyFilter(items, keyword) {
  // 复杂的过滤逻辑...
  return items.filter(item => item.name.includes(keyword));
}
```

```javascript
// composables/useWorker.js — Worker 管理 Hook
import { ref, onBeforeUnmount } from 'vue';

export function useWorker(workerPath) {
  const worker = ref(null);
  const results = ref(null);
  const isComputing = ref(false);
  const error = ref(null);

  // Promise 回调映射
  const pendingRequests = new Map();
  let requestId = 0;

  function init() {
    worker.value = new Worker(new URL(workerPath, import.meta.url));

    worker.value.onmessage = (e) => {
      const { type, payload, _reqId } = e.data;

      // 处理 Promise 响应
      if (_reqId && pendingRequests.has(_reqId)) {
        const { resolve } = pendingRequests.get(_reqId);
        pendingRequests.delete(_reqId);
        resolve(payload);
        return;
      }

      // 处理一般响应
      results.value = payload;
      isComputing.value = false;
    };

    worker.value.onerror = (e) => {
      error.value = e.message;
      isComputing.value = false;
    };
  }

  // Promise 方式调用 Worker
  function postTask(type, payload, useTransferable = false) {
    if (!worker.value) init();

    return new Promise((resolve, reject) => {
      const id = ++requestId;
      const message = { type, payload, _reqId: id };

      // Transferable 优化：转移所有权（大数组零拷贝）
      if (useTransferable && payload?.buffer instanceof ArrayBuffer) {
        worker.value.postMessage(message, [payload.buffer]);
      } else {
        worker.value.postMessage(message);
      }

      pendingRequests.set(id, { resolve, reject });

      // 超时处理
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error('Worker task timeout'));
        }
      }, 30000);
    });
  }

  // 非 Promise 方式的 fire-and-forget
  function post(type, payload, useTransferable = false) {
    if (!worker.value) init();
    isComputing.value = true;
    const message = { type, payload };

    if (useTransferable && payload?.buffer instanceof ArrayBuffer) {
      worker.value.postMessage(message, [payload.buffer]);
    } else {
      worker.value.postMessage(message);
    }
  }

  function terminate() {
    worker.value?.terminate();
    worker.value = null;
    pendingRequests.clear();
  }

  onBeforeUnmount(terminate);

  return { init, post, postTask, results, isComputing, error, terminate };
}
```

```vue
<!-- 使用示例：大屏数据统计页 -->
<template>
  <div>
    <div v-if="isComputing" class="loading">正在计算统计数据...</div>
    <div v-else-if="error" class="error">计算失败: {{ error }}</div>
    <div v-else-if="stats">
      <div class="stat-item">总数: {{ stats.count }}</div>
      <div class="stat-item">平均值: {{ stats.mean }}</div>
      <div class="stat-item">P90: {{ stats.p90 }}</div>
      <div class="stat-item">P99: {{ stats.p99 }}</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useWorker } from '@/composables/useWorker';

const { post, results: stats, isComputing, error } = useWorker(
  '../workers/stats.worker.js'
);

onMounted(async () => {
  const rawData = await fetch('/api/stations/raw').then(r => r.json());
  post('CALCULATE_STATS', { data: rawData });
});
</script>
```

### 2.4 Transferable 零拷贝优化

```javascript
// 普通 postMessage（结构化克隆）
// 缺点：大数组(如 10MB)会完整拷贝一份到 Worker，耗内存 + 耗时间

// ✅ Transferable 零拷贝传递
// 缺点：主线程失去对 ArrayBuffer 的访问权
// 适用于：一次性的大数据传递给 Worker，主线程不再需要

// 主线程
const buffer = new ArrayBuffer(10 * 1024 * 1024); // 10MB
worker.postMessage({ data: buffer }, [buffer]);
// 此后主线程不能再访问 buffer（所有权已转移）


// 如果有 TypedArray 视图：
const uint8 = new Uint8Array(largeArrayBuffer);
// 要传递的是底层的 buffer，不是 Uint8Array
worker.postMessage(
  { type: 'PROCESS', payload: uint8.buffer },
  [uint8.buffer] // ← 必须是 ArrayBuffer
);


// 完整示例：大数组零拷贝传输
async function transferLargeData(rawData) {
  // 1. 主线程创建 Float64Array
  const data = new Float64Array(rawData);

  // 2. 零拷贝传给 Worker（所有权转移）
  worker.postMessage(
    { type: 'ANALYZE_NUMBERS', payload: data.buffer },
    [data.buffer] // 关键参数
  );
  // data 现在不可用（buffer 已转移）
}

// Worker 端
self.onmessage = function (e) {
  // 重建 TypedArray 视图
  const data = new Float64Array(e.data.payload);
  // 现在可以正常使用 data
  const result = analyze(data);
  self.postMessage({ type: 'RESULT', payload: result });
};
```

---

## 3. requestAnimationFrame

### 3.1 rAF vs setTimeout 核心区别

```
┌─────────────────────────────────────────────────────────────┐
│              rAF vs setTimeout 对比                          │
├───────────────┬─────────────────┬───────────────────────────┤
│     维度       │  setTimeout      │  requestAnimationFrame   │
├───────────────┼─────────────────┼───────────────────────────┤
│ 执行时机       │ 任意(≥4ms延迟)   │ 下一帧渲染前(精确同步)     │
│ 帧同步         │ 不同步          │ 与浏览器刷新率同步          │
│ 后台标签页     │ 继续执行(节流)   │ 自动暂停(省电)             │
│ 频率           │ 手动控制        │ 自动匹配刷新率(60/120/144Hz)│
│ 适用场景       │ 延迟任务/节流    │ 动画/视觉更新              │
│ 帧率保证       │ 不保证          │ 保证不丢帧                 │
└───────────────┴─────────────────┴───────────────────────────┘
```

### 3.2 60fps 动画标准

```javascript
// rAF 的调用频率匹配显示器刷新率

// 60Hz 显示器 → rAF 每秒调用 ~60 次 → 每帧 ~16.67ms
// 120Hz 显示器 → rAF 每秒调用 ~120 次 → 每帧 ~8.33ms
// 144Hz 显示器 → rAF 每秒调用 ~144 次 → 每帧 ~6.94ms

// rAF 的参数是高精度时间戳（DOMHighResTimeStamp）
let lastTime = 0;
let frameCount = 0;

function measureFPS(timestamp) {
  frameCount++;

  if (timestamp - lastTime >= 1000) {
    console.log(`当前 FPS: ${frameCount}`);
    frameCount = 0;
    lastTime = timestamp;
  }

  requestAnimationFrame(measureFPS);
}

requestAnimationFrame(measureFPS);
```

```javascript
// ✅ 正确：rAF 驱动的数字滚动动画
function animateNumber(el, target, duration = 1000) {
  const start = parseInt(el.textContent) || 0;
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // 缓动函数：easeOutCubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * eased);

    el.textContent = current.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}


// ❌ 错误：setInterval 做动画
function animateBad(el, target) {
  let current = 0;
  const timer = setInterval(() => {
    current += 1;
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 16); // 50fps？不精确！可能与刷新率冲突 → 撕裂/掉帧
}
```

### 3.3 rAF 防抖 vs 节流

```javascript
// rAF 天然就是一个"帧级"的节流器
// 因为 rAF 每帧最多执行一次，天然具有节流效果

// ✅ 使用 rAF 拦截高频事件（scroll/resize/mousemove）
function rafThrottle(fn) {
  let ticking = false;

  return function (...args) {
    if (ticking) return; // 本帧已调度，跳过
    ticking = true;

    requestAnimationFrame(() => {
      fn.apply(this, args);
      ticking = false;
    });
  };
}

// 使用：roll 事件每帧最多触发一次回调
window.addEventListener('scroll', rafThrottle(() => {
  updateScrollIndicator(window.scrollY);
}));

// 对比：传统 throttle（基于时间，不与帧同步）
// _.throttle(fn, 16) ← 可能与刷新率不同步
```

### 3.4 页面可视性处理

```javascript
// rAF 在页面不可见时自动暂停，回到前台后恢复
// 但如果有额外逻辑（如 WebSocket 连接），需要配合 visibilitychange

let animationId = null;

function startAnimation() {
  function animate(timestamp) {
    updateScene(timestamp);
    animationId = requestAnimationFrame(animate);
  }
  animationId = requestAnimationFrame(animate);
}

// 页面隐藏时暂停动画（省电）
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(animationId);
    animationId = null;
  } else {
    startAnimation();
  }
});
```

---

## 4. CSS 动画 vs JS 动画

### 4.1 性能对比全景

```
┌─────────────────────────────────────────────────────────────┐
│              CSS 动画 vs JS 动画 性能对比                     │
├───────────────┬────────────────┬────────────────────────────┤
│     维度       │   CSS 动画      │       JS 动画              │
├───────────────┼────────────────┼────────────────────────────┤
│ 执行线程       │ 合成器线程      │ 主线程 (或 Web Animations)  │
│ 触发重排       │ 不(仅composite) │ 可能(取决于 animate 什么)   │
│ GPU加速        │ 自动            │ 需要手动 will-change        │
│ 页面不可见     │ 自动暂停        │ 需手动处理                   │
│ 控制力         │ 有限            │ 完全可控                    │
│ 复杂路径       │ 难(贝塞尔曲线)   │ 简单(数学函数)              │
│ 适用场景       │ 进出场/循环动画   │ 交互驱动/复杂路径           │
└───────────────┴────────────────┴────────────────────────────┘
```

### 4.2 CSS 只触发 Composite 的属性

```
只触发 Composite（最高性能，不触发重排/重绘）：
  ✅ transform      例：translateX / translateY / scale / rotate
  ✅ opacity        例：fade in/out

触发 Paint（其次，不触发重排）：
  ⚠️ color / background-color / box-shadow

触发 Layout + Paint（最差，触发重排+重绘）：
  ❌ width / height / top / left / margin / padding
```

```css
/* ✅ 高性能动画：只使用 transform 和 opacity */
.card-enter {
  animation: slideIn 0.3s ease-out;
}
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ❌ 低性能动画：修改了布局属性 */
@keyframes badSlide {
  from { top: 20px; height: 0; opacity: 0; }
  to   { top: 0; height: 100px; opacity: 1; }
}
/* 每帧都触发 Layout(S) + Paint + Composite → 性能灾难 */
```

### 4.3 选择决策树

```
需要做什么动画？
│
├── 简单的进出场 / 循环动画（loading/进度条/呼吸灯）
│   └── 使用 CSS animation（最高性能）
│
├── 用户交互驱动的动画（拖拽/跟随鼠标）
│   └── 使用 JS + rAF（需要实时读取鼠标位置）
│
├── 复杂的路径动画（如物理引擎、粒子效果）
│   └── 使用 JS + Canvas/WebGL
│
├── 数字滚动/计数动画
│   └── 使用 rAF（需要计算中间值）
│
└── 滚动视差效果
    └── 使用 CSS transform + will-change（最好）
       或 JS + rAF + transform（次选）
```

### 4.4 FLIP 动画技巧

```javascript
// FLIP = First → Last → Invert → Play
// 将高成本的布局动画转为高性能的 transform 动画

// 场景：列表元素位置变化时的平滑过渡

function animateListReorder(container, oldPositions) {
  // F: First — 记录旧位置
  // (oldPositions 已传入)

  // L: Last — 记录新位置
  const children = container.children;
  const newPositions = Array.from(children).map(el => el.getBoundingClientRect());

  // I: Invert — 计算差异，用 transform 回退到旧位置
  Array.from(children).forEach((el, i) => {
    const old = oldPositions[i];
    const current = newPositions[i];

    if (!old || !current) return;

    const deltaX = old.left - current.left;
    const deltaY = old.top - current.top;

    if (deltaX === 0 && deltaY === 0) return;

    // 用 transform 把元素"拉回"旧位置（不触发重排！）
    el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    el.style.transition = 'none'; // 先关掉过渡
  });

  // P: Play — 下一帧执行过渡动画（从旧位置滑到新位置）
  requestAnimationFrame(() => {
    Array.from(children).forEach(el => {
      el.style.transition = 'transform 0.3s ease';
      el.style.transform = ''; // 清空 transform → 自动过渡到新位置
    });
  });
}
```

---

## 5. 综合实践：caidiaweb 运行时优化

### 5.1 现状问题

```
caidiaweb 运行时性能问题：

1. 地图标记点计算（157个区县点的统计计算）
   问题：主线程执行 → 阻塞渲染 1.5s
   方案：移到 Web Worker

2. 实时数据刷新（每 5s 全量更新）
   问题：频繁触发重渲染 → 页面抖动
   方案：增量更新 + rAF 节流

3. 数字滚动动画
   问题：使用 setInterval → 丢帧/卡顿
   方案：requestAnimationFrame 驱动

4. 侧边栏展开/收起
   问题：修改 width → 触发重排
   方案：transform translateX + transition
```

### 5.2 优化实施

```vue
<!-- views/TechFacility.vue — 优化后的技术设施页面 -->
<template>
  <div class="tech-facility-page">
    <!-- 统计卡片：数字滚动动画 -->
    <div class="stat-cards">
      <div v-for="stat in stats" :key="stat.key" class="stat-card">
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-value" :ref="el => statRefs[stat.key] = el">
          {{ stat.displayValue }}
        </div>
      </div>
    </div>

    <!-- 侧边栏（transform 动画，不触发重排） -->
    <aside class="side-panel" :class="{ open: panelOpen }">
      <StationDetail :station="selectedStation" />
    </aside>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import { useWorker } from '@/composables/useWorker';

// ===== 1. Web Worker 统计计算 =====
const { postTask, results: computedStats } = useWorker('../workers/stats.worker.js');

onMounted(async () => {
  const rawData = await fetch('/api/stations/raw').then(r => r.json());
  // Worker 中计算统计指标（不阻塞主线程）
  postTask('CALCULATE_STATS', { data: rawData });
});

// ===== 2. 实时数据增量更新 + rAF 节流 =====
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 5000;

function scheduleDataRefresh() {
  requestAnimationFrame(async (timestamp) => {
    if (timestamp - lastUpdateTime < UPDATE_INTERVAL) {
      requestAnimationFrame(scheduleDataRefresh);
      return;
    }

    lastUpdateTime = timestamp;
    // 增量更新：只获取变化的数据
    const changedItems = await fetch('/api/stations/changes?since=' + lastUpdateTime).then(r => r.json());

    if (changedItems.length > 0) {
      // 批量更新，合并到一帧
      stations.value = mergeUpdate(stations.value, changedItems);
    }

    requestAnimationFrame(scheduleDataRefresh);
  });
}

onMounted(() => requestAnimationFrame(scheduleDataRefresh));

// ===== 3. 数字滚动动画 =====
const statRefs = reactive({});

function animateTo(targetValues) {
  stats.forEach(stat => {
    const el = statRefs[stat.key];
    if (!el) return;

    const target = targetValues[stat.key];
    if (target === undefined) return;

    animateNumber(el, target, 800);
  });
}

function animateNumber(el, target, duration) {
  const start = parseInt(el.textContent?.replace(/,/g, '')) || 0;
  const startTime = performance.now();

  function step(timestamp) {
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * eased);

    el.textContent = current.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}
</script>

<style scoped>
/* ===== 4. 侧边栏 transform 动画（Composite only） ===== */
.side-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  /* 利用 will-change 提示浏览器开启合成层 */
  will-change: transform;
  transform: translateX(100%); /* 初始隐藏在右侧 */
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.side-panel.open {
  transform: translateX(0); /* 滑入 */
}
/* 不修改 width/left/right → 不触发重排 */
</style>
```

### 5.3 运行时性能检查清单

```
caidiaweb 运行时优化检查清单：

□ 1. 长任务排查
     □ Performance 面板 → 过滤 Long Task → 逐一分析
     □ 主线程任务是否都 < 50ms
     □ 使用 requestIdleCallback / scheduler.yield 分片

□ 2. Web Worker
     □ 统计数据计算移到 Worker
     □ 地图 GeoJSON 预处理移到 Worker
     □ 大文件解析（CSV/Excel）移到 Worker

□ 3. requestAnimationFrame
     □ 数字滚动用 rAF，不用 setInterval
     □ scroll/resize 用 rAF 节流
     □ 页面隐藏时取消 rAF（visibilitychange）

□ 4. CSS 动画
     □ 只用 transform + opacity（触发 Composite）
     □ 避免修改 width/height/top/left（触发 Layout）
     □ 对复杂动画元素使用 will-change（但不要滥用）

□ 5. 实时刷新
     □ 全量刷新 → 增量更新
     □ 使用 rAF 节流，避免短时间内多次 setState
```

---

## 6. 面试高频考点

### Q1：requestIdleCallback 和 requestAnimationFrame 的区别？

| 维度 | requestIdleCallback | requestAnimationFrame |
|------|-------------------|----------------------|
| 触发时机 | 浏览器空闲时（一帧中剩余时间） | 下一帧渲染前 |
| 参数 | deadline（含 timeRemaining） | 高精度时间戳 |
| 保证执行 | 不保证（可设 timeout） | 保证执行 |
| 优先级 | 最低 | 高 |
| 适用 | 非关键后任务 | 动画/视觉更新 |

### Q2：Web Worker 和 Service Worker 的区别？

| 维度 | Web Worker | Service Worker |
|------|-----------|----------------|
| 用途 | 计算密集型任务 | 网络代理/离线缓存 |
| 拦截请求 | 不能 | 可以 |
| 生命周期 | 页面关闭即销毁 | 独立于页面 |
| DOM 访问 | 不能 | 不能 |
| 多页面共享 | 不能 | 可以（同源） |

### Q3：为什么只用 transform 和 opacity 做动画？

因为这两个属性**只触发 Composite（合成）**，不触发 Layout（布局）和 Paint（绘制）。浏览器合成器线程可以直接处理，完全不用主线程参与，因此永远不卡顿。

```javascript
// 验证方法：DevTools → Rendering → Paint Flashing
// 绿色闪烁 = 发生了 Paint → 需要优化
// 无闪烁 = 只触发了 Composite → 最优
```

### Q4：Web Worker 的 postMessage 是拷贝还是引用？

**结构化克隆（拷贝）**，不是引用。大对象传递有性能开销。

优化手段：
- **Transferable**：转移 ArrayBuffer 所有权（零拷贝），主线程不可再访问
- **SharedArrayBuffer**：共享内存（需要跨域隔离头 `Cross-Origin-Opener-Policy` 和 `Cross-Origin-Embedder-Policy`）

### Q5：为什么 setInterval 做动画会卡顿？

- setInterval 的延迟是**最小延迟**，实际执行可能更晚
- 不与浏览器刷新率同步 → 可能与屏幕刷新错位 → 视觉"撕裂"
- 后台标签页中 setInterval 被强制节流到 ≥1000ms
- rAF 完全对齐刷新率，保证每帧不丢、不重复

---

> **动手建议**：打开 caidiaweb 的 Performance 面板 → 找到标记为红色的 Long Task → 点击看是哪个函数 → 如果是数据计算，用第 2 节的 `useWorker` 把它移到 Worker 线程。如果是数字动画，用第 3 节的 rAF 替换 setInterval。
