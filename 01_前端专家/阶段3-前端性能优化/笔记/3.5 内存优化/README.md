# 3.5 内存优化

> 前端性能优化 · 内存泄漏排查 · 虚拟滚动 · 时间分片 · WeakRef

---

## 目录

1. [内存泄漏常见场景](#1-内存泄漏常见场景)
2. [Chrome DevTools 内存排查](#2-chrome-devtools-内存排查)
3. [虚拟滚动原理与实现](#3-虚拟滚动原理与实现)
4. [时间分片渲染](#4-时间分片渲染)
5. [WeakRef 与 FinalizationRegistry](#5-weakref-与-finalizationregistry)
6. [综合实践：caidiaweb 大列表优化](#6-综合实践caidiaweb-大列表优化)
7. [面试高频考点](#7-面试高频考点)

---

## 1. 内存泄漏常见场景

### 1.1 内存泄漏全景图

```
┌──────────────────────────────────────────────────────────────┐
│                  四大内存泄漏场景                               │
│                                                              │
│  ① 未移除的事件监听                                            │
│     addEventListener 忘记 removeEventListener                 │
│     Vue 组件销毁时事件监听器仍然存活                             │
│                                                              │
│  ② 闭包持有大对象引用                                          │
│     闭包捕获了不需要的变量，阻止 GC                              │
│     setInterval 回调引用大数组                                  │
│                                                              │
│  ③ 未清理的定时器                                              │
│     setInterval 在组件销毁后继续运行                            │
│     setTimeout 回调持有 DOM 引用                               │
│                                                              │
│  ④ DOM 引用未释放                                             │
│     JS 变量引用了已从 DOM 移除的元素                            │
│     detached DOM tree（游离 DOM 树）                           │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 场景一：未移除的事件监听

```javascript
// ❌ 错误：事件监听未移除
class ChartComponent {
  mount(container) {
    this.container = container;
    // 在 window 上注册 resize 监听
    window.addEventListener('resize', this.handleResize);
  }

  handleResize = () => {
    // 引用了 this.container
    this.chart?.resize();
  };

  // ❌ 忘记移除监听 → this 永远不会被 GC
  destroy() {
    this.container.remove();
    this.chart.dispose();
    // 缺少：window.removeEventListener('resize', this.handleResize);
  }
}


// ✅ 正确：成对管理事件监听
class ChartComponent {
  mount(container) {
    this.container = container;
    window.addEventListener('resize', this.handleResize);
  }

  handleResize = () => {
    this.chart?.resize();
  };

  destroy() {
    // 1. 移除事件监听
    window.removeEventListener('resize', this.handleResize);
    // 2. 销毁图表实例
    this.chart?.dispose();
    this.chart = null;
    // 3. 清空 DOM 引用
    this.container = null;
  }
}
```

```javascript
// ✅ Vue 3 Composition API 最佳实践
import { onMounted, onBeforeUnmount } from 'vue';

export function useWindowResize(callback) {
  onMounted(() => {
    window.addEventListener('resize', callback);
  });

  // onBeforeUnmount 自动清理，永远不会遗漏
  onBeforeUnmount(() => {
    window.removeEventListener('resize', callback);
  });
}

// ✅ AbortController 统一管理（现代方式）
export function useEventListener(target, event, handler) {
  const controller = new AbortController();

  onMounted(() => {
    target.addEventListener(event, handler, {
      signal: controller.signal, // ← 关键：传入 signal
    });
  });

  onBeforeUnmount(() => {
    controller.abort(); // 一次性移除所有关联监听
  });
}
```

### 1.3 场景二：闭包持有大对象引用

```javascript
// ❌ 错误：闭包意外持有大对象
function fetchAndCache(url) {
  const bigData = new Array(100000).fill(0); // 大数组

  return fetch(url).then(res => res.json()).then(data => {
    // 闭包引用了 bigData，即使这里不需要 bigData
    // bigData 会一直存活，直到这个 Promise 链完成
    console.log(data.length);
  });
}


// ✅ 正确：及时释放不需要的引用
function fetchAndCache(url) {
  let bigData = new Array(100000).fill(0);
  processBigData(bigData);
  bigData = null; // 显式释放引用，允许 GC

  return fetch(url).then(res => res.json());
}


// ❌ 错误：setInterval 闭包陷阱
function startPolling(fetchFn) {
  const cache = {}; // 持续增长的缓存对象

  setInterval(async () => {
    const data = await fetchFn();
    // 每次往 cache 添加数据，永不释放
    cache[Date.now()] = data; // cache 越来越大
  }, 5000);

  // cache 永远被 setInterval 闭包持有
}


// ✅ 正确：限制缓存大小 + 清理定时器
function startPolling(fetchFn, maxCacheSize = 100) {
  const cache = new Map(); // 用 Map 方便清理
  let timer = null;

  timer = setInterval(async () => {
    const data = await fetchFn();
    cache.set(Date.now(), data);

    // 限制缓存大小：FIFO 淘汰
    if (cache.size > maxCacheSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
  }, 5000);

  // 返回清理函数
  return () => {
    clearInterval(timer);
    cache.clear();
    timer = null;
  };
}
```

### 1.4 场景三：未清理的定时器

```javascript
// ❌ 错误：组件销毁后定时器继续运行
export default {
  mounted() {
    this.timer = setInterval(() => {
      this.fetchData(); // 组件已销毁，this 指向已卸载的组件
    }, 3000);
  },
  // 缺少 beforeUnmount 清理
};


// ✅ 正确：Vue 3 Composition API
import { ref, onBeforeUnmount } from 'vue';

export function usePolling(fetchFn, interval = 3000) {
  const data = ref(null);
  let timer = null;

  function start() {
    stop(); // 先清理旧的
    timer = setInterval(async () => {
      data.value = await fetchFn();
    }, interval);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  // 组件销毁时自动停止
  onBeforeUnmount(stop);

  return { data, start, stop };
}


// ✅ 正确：改用 setTimeout 递归（更安全，可控制频率）
export function usePollingSafe(fetchFn, interval = 3000) {
  const data = ref(null);
  let timer = null;
  let stopped = false;

  async function poll() {
    if (stopped) return;
    try {
      data.value = await fetchFn();
    } catch (err) {
      console.error('轮询失败:', err);
    }
    if (!stopped) {
      timer = setTimeout(poll, interval);
    }
  }

  function start() {
    stopped = false;
    poll();
  }

  function stop() {
    stopped = true;
    clearTimeout(timer);
    timer = null;
  }

  onBeforeUnmount(stop);

  return { data, start, stop };
}
```

### 1.5 场景四：DOM 引用未释放（Detached DOM）

```javascript
// ❌ 错误：JS 变量持有已移除的 DOM 引用
let cachedElements = [];

function cacheAllItems() {
  cachedElements = document.querySelectorAll('.list-item'); // NodeList 引用
}

function removeList() {
  document.getElementById('list').remove();
  // cachedElements 仍然持有所有 .list-item 的引用
  // 这些 DOM 节点无法被 GC → Detached DOM 泄漏
}


// ✅ 正确：及时清空 DOM 引用
let cachedElements = [];

function cacheAllItems() {
  cachedElements = Array.from(document.querySelectorAll('.list-item'));
}

function removeList() {
  document.getElementById('list').remove();
  cachedElements = []; // 释放引用
}


// ❌ 错误：Vue 中 ref 持有的 DOM
const containerRef = ref(null);
function destroyView() {
  // 从 DOM 中移除
  document.body.removeChild(containerRef.value);
  // ❌ containerRef.value 仍指向已移除的 DOM
}

// ✅ 正确
const containerRef = ref(null);
function destroyView() {
  document.body.removeChild(containerRef.value);
  containerRef.value = null; // 释放引用
}
```

---

## 2. Chrome DevTools 内存排查

### 2.1 Memory 面板三件套

```
F12 → Memory 面板：

┌─────────────────────────────────────────────┐
│ 工具                │ 用途                   │
├─────────────────────────────────────────────┤
│ Heap Snapshot       │ 拍快照，查看当前内存分布  │
│ (堆快照)            │ 对比两次快照，定位泄漏    │
├─────────────────────────────────────────────┤
│ Allocation          │ 实时记录内存分配         │
│ instrumentation     │ 精确定位哪行代码分配了内存 │
│ on timeline         │                        │
├─────────────────────────────────────────────┤
│ Allocation          │ 按时间线采样内存         │
│ sampling            │ 轻量，适合长时间录制      │
│ (分配采样)          │                        │
└─────────────────────────────────────────────┘
```

### 2.2 Heap Snapshot 三步排查法

```
Step 1：拍基线快照
  打开页面 → Memory → "Take heap snapshot" → Snapshot 1

Step 2：执行可疑操作
  切换 Tab 10 次 / 打开关闭弹窗 10 次 / 等待 3 分钟数据轮询

Step 3：拍对比快照
  再次 "Take heap snapshot" → Snapshot 2
  切换到 "Comparison" 视图 → 按 #Delta 降序

关键解读：
  #Delta 正值 → 新增的内存（可能是泄漏）
  展开对象树 → 看是哪些对象在增长
```

### 2.3 Performance 面板配合内存检测

```
Performance 面板录制时：
  勾选 "Memory" 复选框 → JS Heap 曲线

观察曲线：
  ┌─────────────────────────────────────┐
  │  正常：锯齿状（分配→GC→分配→GC）     │
  │  /\/\/\/\/\/\/\/\/\/\/\            │
  │                                     │
  │  泄漏：持续上升（不回落）             │
  │  ────────────────────────           │
  └─────────────────────────────────────┘
```

### 2.4 内存排查命令速查

```javascript
// 在 Console 中运行，辅助排查

// 1. 查看当前 JS 堆大小
console.memory;
// { totalJSHeapSize, usedJSHeapSize, jsHeapSizeLimit }

// 2. 手动触发 GC（需要在 DevTools Performance 面板中启用）
// Performance → ⚙️ → "Forces garbage collection"

// 3. 获取当前页面所有 iframe（可能持有额外内存）
document.querySelectorAll('iframe').length;

// 4. 查看 detached DOM 节点数量（Heap Snapshot 中搜索 "Detached"）

// 5. 统计定时器数量（粗略）
let timerCount = 0;
const origSetInterval = window.setInterval;
window.setInterval = function(...args) {
  timerCount++;
  console.warn(`New interval, total: ${timerCount}`, args[0].toString().slice(0, 80));
  return origSetInterval.apply(this, args);
};
```

---

## 3. 虚拟滚动原理与实现

### 3.1 为什么需要虚拟滚动

```
问题：渲染 10,000 条数据到 DOM

┌─────────────────────────────┐
│  Item 1                     │ ← 可见区域
│  Item 2                     │    (实际渲染 10 个)
│  Item 3                     │
│  ...                        │
│  Item 10000                 │ ← 视口外（也全部渲染了）
└─────────────────────────────┘

代价：
  - 10,000 个 DOM 节点 → 内存 ~50MB
  - 首次渲染阻塞 → 2-5 秒
  - 滚动掉帧


解决：虚拟滚动

┌─────────────────────────────┐
│  [占位空间：10000 × 40px]    │
│                             │
│  ┌───────────────────────┐  │ ← 可视窗口
│  │ Item 51                │  │   (只渲染 10 个节点)
│  │ Item 52                │  │
│  │ ...                    │  │
│  │ Item 60                │  │
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘

收益：
  - DOM 节点：10,000 → ~15（视口 + 缓冲）
  - 内存：50MB → <2MB
  - 首次渲染：2s → <50ms
```

### 3.2 核心原理

```
虚拟滚动 = 三个关键参数 + 一个技巧

参数：
  itemHeight = 每项固定高度（如 40px）
  totalCount = 数据总量（如 10,000）
  visibleCount = 可视区域能装下的项数

计算：
  scrollTop ──► startIndex = Math.floor(scrollTop / itemHeight)
                 endIndex = startIndex + visibleCount + buffer(缓冲)

技巧：
  使用 transform: translateY 将可见项定位到正确位置
  或使用 padding-top 占位
```

### 3.3 从零实现虚拟滚动（Vue 3）

```vue
<!-- components/VirtualList.vue — 通用虚拟滚动组件 -->
<template>
  <div
    ref="containerRef"
    class="virtual-list-container"
    :style="{ height: containerHeight }"
    @scroll="onScroll"
  >
    <!-- 占位元素：撑开滚动条高度 -->
    <div class="virtual-list-phantom" :style="{ height: totalHeight + 'px' }" />

    <!-- 可见区域：只渲染视口内的数据 -->
    <div
      class="virtual-list-content"
      :style="{ transform: `translateY(${offsetY}px)` }"
    >
      <div
        v-for="item in visibleData"
        :key="item[keyField]"
        class="virtual-list-item"
        :style="{ height: itemHeight + 'px' }"
      >
        <slot name="item" :item="item" :index="item.__index" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';

const props = defineProps({
  // 原始数据数组
  dataSource: { type: Array, default: () => [] },
  // 每项高度（固定高）
  itemHeight: { type: Number, required: true },
  // 唯一键字段
  keyField: { type: String, default: 'id' },
  // 缓冲项数（视口外预渲染多少项，防止快速滚动时白屏）
  bufferCount: { type: Number, default: 5 },
  // 容器高度
  containerHeight: { type: String, default: '400px' },
});

const emit = defineEmits(['scrollEnd']);

const containerRef = ref(null);
const scrollTop = ref(0);
const containerHeightPx = ref(400);

// 可视区域能装下的项数
const visibleCount = computed(() => {
  if (!containerRef.value) return 10;
  return Math.ceil(containerRef.value.clientHeight / props.itemHeight);
});

// 总高度
const totalHeight = computed(() => props.dataSource.length * props.itemHeight);

// 起始索引（含缓冲）
const startIndex = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight);
  return Math.max(0, start - props.bufferCount);
});

// 结束索引（含缓冲）
const endIndex = computed(() => {
  const end = Math.ceil((scrollTop.value + containerHeightPx.value) / props.itemHeight);
  return Math.min(props.dataSource.length, end + props.bufferCount);
});

// 偏移量（将可视区域定位到正确位置）
const offsetY = computed(() => startIndex.value * props.itemHeight);

// 可见数据
const visibleData = computed(() => {
  return props.dataSource
    .slice(startIndex.value, endIndex.value)
    .map((item, i) => ({
      ...item,
      __index: startIndex.value + i,
    }));
});

function onScroll(e) {
  scrollTop.value = e.target.scrollTop;

  // 滚动到底部检测
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  if (scrollTop + clientHeight >= scrollHeight - 50) {
    emit('scrollEnd');
  }
}

onMounted(() => {
  if (containerRef.value) {
    containerHeightPx.value = containerRef.value.clientHeight;
  }
});

// 数据变化时重置滚动
watch(() => props.dataSource.length, () => {
  scrollTop.value = 0;
});
</script>

<style scoped>
.virtual-list-container {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  /* 使用 will-change 提示浏览器开启 GPU 合成层 */
  will-change: transform;
}

.virtual-list-phantom {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  z-index: -1;
}

.virtual-list-content {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
}

.virtual-list-item {
  box-sizing: border-box;
}
</style>
```

```vue
<!-- 使用示例：10,000 条监测站列表 -->
<template>
  <VirtualList
    :data-source="stations"
    :item-height="64"
    key-field="id"
    :buffer-count="8"
    container-height="calc(100vh - 200px)"
    @scroll-end="loadMore"
  >
    <template #item="{ item }">
      <div class="station-item">
        <span class="station-name">{{ item.name }}</span>
        <span class="station-status" :class="item.status">
          {{ item.status === 'online' ? '在线' : '离线' }}
        </span>
        <span class="station-data">{{ item.lastValue }}</span>
      </div>
    </template>
  </VirtualList>
</template>

<script setup>
import { ref } from 'vue';
import VirtualList from '@/components/VirtualList.vue';

const stations = ref(generateStations(10000));
</script>
```

### 3.4 动态高度虚拟滚动（进阶）

```vue
<!-- components/DynamicVirtualList.vue — 支持动态项高度的虚拟滚动 -->
<!-- 
  核心差异：不再假设 itemHeight 固定，而是维护一个预估高度数组
  需要配合 ResizeObserver 实时测量每项真实高度
-->
<script setup>
import { ref, reactive, computed, onMounted } from 'vue';

const props = defineProps({
  dataSource: { type: Array, default: () => [] },
  estimatedItemHeight: { type: Number, default: 60 },
  keyField: { type: String, default: 'id' },
  bufferCount: { type: Number, default: 5 },
});

// 每一项的位置和高度缓存
const positions = ref([]); // { index, top, bottom, height }

// 初始化位置缓存（使用预估值）
function initPositions() {
  positions.value = props.dataSource.map((_, index) => ({
    index,
    height: props.estimatedItemHeight,
    top: index * props.estimatedItemHeight,
    bottom: (index + 1) * props.estimatedItemHeight,
  }));
}

// 更新实际高度（ResizeObserver 回调）
function updateItemHeight(index, actualHeight) {
  const item = positions.value[index];
  if (!item) return;
  
  const diff = actualHeight - item.height;
  if (diff === 0) return;

  // 更新当前项高度
  item.height = actualHeight;
  item.bottom = item.top + actualHeight;

  // 更新后续所有项的位置
  for (let i = index + 1; i < positions.value.length; i++) {
    positions.value[i].top = positions.value[i - 1].bottom;
    positions.value[i].bottom = positions.value[i].top + positions.value[i].height;
  }
}

// 二分查找：根据 scrollTop 找到起始索引
function findStartIndex(scrollTop) {
  let left = 0;
  let right = positions.value.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const item = positions.value[mid];
    
    if (item.bottom < scrollTop) {
      left = mid + 1;
    } else if (item.top > scrollTop) {
      right = mid - 1;
    } else {
      return mid;
    }
  }
  
  return Math.max(0, left - 1);
}
</script>
```

> **注意**：动态高度虚拟滚动实现较复杂，生产环境推荐使用成熟库：
> - **vue-virtual-scroller**（Vue 官方推荐）
> - **react-window** / **react-virtuoso**（React）
> - **TanStack Virtual**（框架无关）

---

## 4. 时间分片渲染

### 4.1 问题与原理

```
问题：一次性渲染 5000 条数据

┌─────────────────────────────┐
│  while 循环渲染 5000 项      │
│  主线程被阻塞 3 秒           │  ← 页面卡死，无响应
│  期间无法响应用户交互         │
└─────────────────────────────┘


解决：时间分片（Time Slicing）

┌─────┬─────┬─────┬─────┬────┐
│渲染50│空闲 │渲染50│空闲 │ ...│  ← 每批 50 项，16ms 内完成
│项    │间隔 │项    │间隔  │    │    不阻塞用户交互
└─────┴─────┴─────┴─────┴────┘
```

### 4.2 requestIdleCallback 方案

```javascript
// utils/timeSlicing.js — 时间分片工具

/**
 * 时间分片渲染大数据集
 * @param {Array} items - 全部数据
 * @param {Function} renderFn - 渲染函数 (item, index) => void
 * @param {number} chunkSize - 每批渲染数量
 */
export function renderInChunks(items, renderFn, chunkSize = 50) {
  let index = 0;

  function processChunk(deadline) {
    // deadline.timeRemaining() 返回当前空闲帧剩余时间（毫秒）
    while (index < items.length && deadline.timeRemaining() > 1) {
      const chunkEnd = Math.min(index + chunkSize, items.length);
      
      for (let i = index; i < chunkEnd; i++) {
        renderFn(items[i], i);
      }
      
      index = chunkEnd;
    }

    if (index < items.length) {
      // 还有数据未处理，等待下一个空闲帧
      requestIdleCallback(processChunk);
    }
  }

  requestIdleCallback(processChunk);
}

// 使用示例
const stations = fetchStations(5000);

requestIdleCallback(() => { // 或 scheduler.postTask
  renderInChunks(stations, (station, index) => {
    const el = document.createElement('div');
    el.textContent = station.name;
    container.appendChild(el);
  }, 50);
});
```

### 4.3 scheduler.yield() 方案（现代）

```javascript
// scheduler.yield() 是更新的 API（Chrome 115+）
// 比 requestIdleCallback 更灵活

async function renderInChunksModern(items, renderFn, chunkSize = 50) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    
    chunk.forEach((item, j) => renderFn(item, i + j));

    // 让出主线程（给浏览器机会处理用户交互和渲染）
    if (i + chunkSize < items.length) {
      await scheduler.yield(); // ← 关键
    }
  }
}

// 降级方案（不支持 scheduler.yield 的浏览器）
const yieldToMain = () =>
  'scheduler' in window && 'yield' in scheduler
    ? scheduler.yield()
    : new Promise(resolve => setTimeout(resolve, 0));
```

### 4.4 时间分片 vs 虚拟滚动 选择

```
┌────────────────────────────────────────────┐
│           大数据渲染方案选择                  │
├──────────────┬────────────┬────────────────┤
│    场景       │  虚拟滚动   │   时间分片      │
├──────────────┼────────────┼────────────────┤
│ 滚动列表      │  ✅ 最佳    │  ❌ 后续仍卡    │
│ 首次渲染      │  ✅        │  ✅            │
│ 内存占用      │  ✅ 低      │  ❌ 全量 DOM    │
│ 实现复杂度    │  中         │  低            │
│ 搜索结果/表格  │  ✅        │  可以          │
│ 无滚动容器    │  ❌ 不适用  │  ✅            │
└──────────────┴────────────┴────────────────┘

结论：
  滚动列表 → 虚拟滚动（必须）
  非滚动内容（如 Dashboard 卡片）→ 时间分片
  两者可结合：虚拟滚动 + 时间分片填充初始数据
```

---

## 5. WeakRef 与 FinalizationRegistry

### 5.1 WeakRef：弱引用

```javascript
// WeakRef 允许创建对对象的"弱引用"——不会阻止 GC

// ❌ 普通引用：阻止 GC
class Cache {
  constructor() {
    this.map = new Map(); // 强引用
  }
  set(key, value) {
    this.map.set(key, value);
  }
  // map 中的对象永远不会被 GC，即使外部已经不用了
}

// ✅ WeakRef 引用：不阻止 GC
class WeakCache {
  constructor() {
    this.map = new Map(); // key → WeakRef(value)
  }

  set(key, value) {
    this.map.set(key, new WeakRef(value));
  }

  get(key) {
    const ref = this.map.get(key);
    if (!ref) return undefined;

    const value = ref.deref(); // 尝试获取引用
    if (value === undefined) {
      // 对象已被 GC
      this.map.delete(key);
      return undefined;
    }
    return value;
  }
}
```

### 5.2 FinalizationRegistry：GC 回调

```javascript
// FinalizationRegistry 允许在对象被 GC 后执行回调

const registry = new FinalizationRegistry((heldValue) => {
  // 对象被 GC 后触发
  console.log('对象被回收了，清理资源:', heldValue);
});

class ManagedResource {
  constructor(id) {
    this.id = id;
    this.resource = allocateResource(id); // 假设需要手动释放的外部资源

    // 注册：当 this 被 GC 时，自动清理 resource
    registry.register(this, this.resource, this);
  }

  // 手动清理（推荐主动调用）
  release() {
    registry.unregister(this);
    freeResource(this.resource);
  }
}
```

### 5.3 实际应用场景

```javascript
// 场景1：监听 DOM 移除（替代已废弃的 MutationEvent）
const detachedObserver = new FinalizationRegistry((cleanup) => {
  cleanup(); // DOM 被 GC 后自动清理关联数据
});

class DOMBinding {
  constructor(element, data) {
    this.element = element;
    this.data = data;

    detachedObserver.register(element, () => {
      // 当 element 从 DOM 移除并被 GC 后执行
      console.log('元素被清理，释放关联数据');
      this.data = null;
    });
  }
}


// 场景2：缓存过期管理
class ExpirableCache {
  #map = new Map();
  #registry = new FinalizationRegistry((key) => {
    this.#map.delete(key);
  });

  set(key, value) {
    const wrapper = { value };
    this.#map.set(key, wrapper);
    // value 被 GC 时自动清理 map 中的 key
    this.#registry.register(value, key);
    return wrapper;
  }

  get(key) {
    const wrapper = this.#map.get(key);
    return wrapper?.value;
  }
}
```

> **注意**：WeakRef 和 FinalizationRegistry 是高级特性，不要滥用。GC 时机不确定，不应依赖它们做关键业务逻辑。主要用于缓存优化和资源管理。

---

## 6. 综合实践：caidiaweb 大列表优化

### 6.1 场景分析

```
caidiaweb 数据大屏中的列表场景：

1. 监测站列表 → 5000+ 条，每行显示名称、状态、数值
   当前：全部渲染 → 5000 个 DOM 节点 → 内存 ~40MB
   优化：虚拟滚动 → 只渲染 ~20 个节点 → 内存 <2MB

2. 告警列表 → 2000+ 条，每条附带图表缩略图
   当前：首次渲染 2000 条 → 主线程阻塞 3s
   优化：时间分片 + 虚拟滚动

3. 地图标记点 → 157 个区县点，每个点有 tooltip
   当前：页面初始化全部渲染
   优化：懒加载 + 视口裁剪
```

### 6.2 优化实施

```vue
<!-- views/StationList.vue — 优化后的监测站列表 -->
<template>
  <div class="station-list-page">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <input v-model="keyword" placeholder="搜索监测站..." @input="onSearch" />
      <span class="result-count">共 {{ filteredStations.length }} 条结果</span>
    </div>

    <!-- 虚拟滚动列表 -->
    <VirtualList
      :data-source="filteredStations"
      :item-height="72"
      key-field="id"
      :buffer-count="10"
      container-height="calc(100vh - 200px)"
    >
      <template #item="{ item }">
        <div class="station-row">
          <div class="station-info">
            <div class="station-name">{{ item.name }}</div>
            <div class="station-addr">{{ item.address }}</div>
          </div>
          <div class="station-status" :class="item.status">
            {{ item.status === 'online' ? '● 在线' : '○ 离线' }}
          </div>
          <div class="station-value">
            <span class="value">{{ item.lastValue }}</span>
            <span class="unit">{{ item.unit }}</span>
          </div>
        </div>
      </template>
    </VirtualList>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import VirtualList from '@/components/VirtualList.vue';
import { useDebounceFn } from '@vueuse/core';

// 全部数据（假设从 store 获取）
const allStations = ref([]);
const keyword = ref('');
const filteredStations = ref([]);

// 加载数据
async function loadStations() {
  const data = await fetch('/api/stations');
  allStations.value = data;

  // 时间分片设置过滤结果（首次渲染）
  const chunkSize = 200;
  for (let i = 0; i < data.length; i += chunkSize) {
    filteredStations.value.push(...data.slice(i, i + chunkSize));
    if (i + chunkSize < data.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

// 防抖搜索
const onSearch = useDebounceFn(() => {
  const kw = keyword.value.toLowerCase();
  filteredStations.value = allStations.value.filter(
    s => s.name.toLowerCase().includes(kw) || s.address.toLowerCase().includes(kw)
  );
}, 300);
</script>

<style scoped>
.station-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  height: 72px;
  box-sizing: border-box;
}
.station-info { flex: 1; }
.station-name { font-size: 14px; font-weight: 500; }
.station-addr { font-size: 12px; color: #8c8c8c; margin-top: 4px; }
.station-status { margin-right: 16px; font-size: 13px; }
.station-status.online { color: #0cce6b; }
.station-status.offline { color: #ccc; }
.station-value { text-align: right; }
.value { font-size: 20px; font-weight: 600; }
.unit { font-size: 12px; color: #8c8c8c; margin-left: 4px; }
</style>
```

### 6.3 内存优化检查清单

```
caidiaweb 内存优化检查清单：

□ 1. ECharts 实例管理
     □ 使用 onBeforeUnmount 调用 chart.dispose()
     □ 窗口 resize 时防抖处理
     □ 地图标记点使用 setOption 而非重新 init

□ 2. 轮询/WebSocket
     □ onBeforeUnmount 中 clearInterval / close()
     □ 限制缓存数据大小（FIFO 淘汰）

□ 3. 事件监听
     □ 使用 AbortController signal 管理
     □ Composition API 中 onBeforeUnmount 清理

□ 4. 大列表
     □ 1000+ 条数据使用虚拟滚动
     □ 首次渲染使用时间分片

□ 5. 内存监控
     □ 接入 window.performance.memory 定期上报
     □ 设置阈值告警（如 JS Heap > 200MB）

□ 6. Chrome DevTools 排查
     □ 录制 Performance → 观察 JS Heap 曲线
     □ Heap Snapshot → Comparison 视图 → 定位泄漏来源
```

---

## 7. 面试高频考点

### Q1：JavaScript 的垃圾回收机制是什么？

- **新生代**（Young Generation）：Scavenge 算法，空间换时间，存活对象晋升到老生代
- **老生代**（Old Generation）：标记-清除（Mark-Sweep）+ 标记-整理（Mark-Compact），处理大对象
- **增量标记**：将标记过程拆分成小块，与 JS 执行交替进行，减少 STW
- V8 自动管理，开发者不应手动触发 GC

### Q2：如何发现和解决内存泄漏？

**发现**：
1. Performance 面板 → JS Heap 曲线持续上升（锯齿不回落）
2. Heap Snapshot → Comparison 视图 → #Delta 正值很大
3. 任务管理器（Shift+Esc）→ JavaScript 内存列持续增长

**解决**：
1. 定位：展开 #Delta 最大的对象，查看 Retainers（引用链）
2. 修复：解除不必要的引用（移除监听、清理定时器、释放 DOM 引用）
3. 验证：修复后再拍对比快照，确认 #Delta 归零

### Q3：虚拟滚动的原理？和普通滚动的区别？

- **原理**：只渲染可视区域 + 少量缓冲区域的数据，用占位元素撑开滚动条高度
- **区别**：普通滚动渲染所有数据（N 个 DOM），虚拟滚动只渲染 ~15 个 DOM
- **收益**：内存从 O(n) 降到 O(1)，首次渲染从秒级降到毫秒级
- **代价**：需要每项高度固定（或额外测量），快速滚动可能有短暂白屏

### Q4：requestIdleCallback 和 requestAnimationFrame 的区别？

| 维度 | requestIdleCallback | requestAnimationFrame |
|------|-------------------|----------------------|
| 触发时机 | 浏览器空闲时 | 下一帧渲染前 |
| 优先级 | 低（不保证执行） | 高（每帧执行） |
| 适用场景 | 非关键任务、时间分片 | 动画、视觉更新 |
| deadline | 有（timeRemaining） | 无 |

### Q5：虚拟滚动和分页如何选择？

- **虚拟滚动**：用户需要无缝浏览大量数据（如日志流、邮件列表）
- **分页**：用户通常只看前几页（如搜索结果、管理后台列表）
- **混合**：大数据量 + 分页 → 单页内用虚拟滚动（如每页 500 条虚拟滚动显示）

> caidiaweb 监测站列表推荐：**虚拟滚动 + 分页加载**（每页 500 条虚拟滚动）

---

> **动手建议**：打开 caidiaweb 的监测站列表页面 → F12 → Performance → 录制一次页面加载和滚动操作 → 观察 Main 线程上的长任务（红色三角）和 JS Heap 曲线。如果发现某一项数据超过 1000 行，用第 3 节的 `VirtualList.vue` 组件替换原来的 `v-for`。
