# 5.7 大屏可视化

> 阶段 5 — 前端可视化技术 / 第 7 章（收官章）
> 核心目标：把前 6 章所有技术（SVG/Canvas/WebGL/ECharts/D3/设计原则）综合落到「大屏」这一载体。掌握自适应方案、数据轮播、动效设计、性能考量，能独立交付行业级大屏。

---

## 目录

1. [大屏的特点与挑战](#1-大屏的特点与挑战)
2. [自适应方案](#2-自适应方案)
3. [数据轮播](#3-数据轮播)
4. [动效设计](#4-动效设计)
5. [性能考量](#5-性能考量)
6. [大屏工程化架构](#6-大屏工程化架构)
7. [caidiaweb 大屏实战](#7-caidiaweb-大屏实战)
8. [面试考点](#8-面试考点)

---

## 1. 大屏的特点与挑战

> 大屏 ≠ 把网页放大。它是**固定分辨率设计稿 + 异形屏幕展示 + 长时间值守观看 + 弱交互强视觉**的特殊形态。

| 特点 | 带来的挑战 |
|------|-----------|
| 设计稿多为 1920×1080 / 4K 固定分辨率 | 要适配不同物理尺寸屏幕，不能简单 100% 缩放 |
| 超宽/异形拼接屏 | 普通响应式（流式）会变形，需等比缩放 |
| 7×24 值守、远观 | 字要大、对比强、结论一眼可见 |
| 弱交互（不点鼠标） | 靠自动轮播/动画传递信息 |
| 多图表同时渲染 | GPU/内存压力，易卡顿发热 |
| 实时数据推送 | 频繁更新不能卡主线程 |

> **心智模型**：大屏是「**一个固定画布，等比缩放投到任意屏幕**」，而不是「**流式网页自适应**」。这是选自适应方案的根本出发点。

---

## 2. 自适应方案

### 2.1 三种方案对比

| 方案 | 原理 | 优点 | 缺点 | 适用 |
|------|------|------|------|------|
| **rem / vw-vh** | 根字体随屏变 / 单位用 vw | 真流式 | 异形屏比例失调、图表需各自适配 | 普通响应式页 |
| **CSS Grid/Flex** | 弹性布局 | 规范、好维护 | 固定比例内容会拉伸变形 | 内容型后台 |
| **scale 缩放 ⭐** | 设计稿固定宽高，整体 `transform: scale()` | 像素级还原设计稿、不变形 | 黑边（留白）需处理 | **大屏首选** |

### 2.2 scale 缩放方案（推荐）

> 核心思路：所有内容按 **1920×1080 设计稿** 写死像素，运行时算出缩放比，整体 scale 到当前屏幕。

```vue
<!-- useScreenScale.js composable -->
import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useScreenScale(designWidth = 1920, designHeight = 1080) {
  const scale = ref(1);
  const screenRef = ref(null);

  function calc() {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    // 取宽高比中较小的，保证整体装下（不至于溢出）
    const scaleX = sw / designWidth;
    const scaleY = sh / designHeight;
    scale.value = Math.min(scaleX, scaleY);
  }

  function onResize() { calc(); }

  onMounted(() => {
    calc();
    window.addEventListener('resize', onResize);
  });
  onBeforeUnmount(() => window.removeEventListener('resize', onResize));

  return { scale, screenRef };
}
```

```vue
<!-- ScreenContainer.vue -->
<script setup>
import { useScreenScale } from '@/composables/useScreenScale';
const { scale, screenRef } = useScreenScale(1920, 1080);
</script>

<template>
  <div class="screen-wrap">
    <!-- 居中容器，固定设计稿尺寸，整体缩放 -->
    <div
      ref="screenRef"
      class="screen-content"
      :style="{
        width: '1920px',
        height: '1080px',
        transform: `scale(${scale})`,
        transformOrigin: 'left top',
      }"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.screen-wrap {
  width: 100vw; height: 100vh;
  overflow: hidden;
  background: #0a0e1a;
  display: flex; align-items: center; justify-content: center;
}
.screen-content { position: absolute; }
</style>
```

> **黑边处理**：`Math.min` 缩放会留黑边（上下或左右）。可用 `transform-origin: center` 居中，或用 `Math.max` 填满但裁切溢出——按业务容忍度选。大屏通常接受黑边（整体协调）。

### 2.3 rem 方案（备选，适合内容流）

```js
// 以 1920 为基准，1rem = 屏幕宽/10
function setRem() {
  const base = document.documentElement.clientWidth / 10;
  document.documentElement.style.fontSize = base + 'px';
}
// 设计稿里 font-size: 0.2rem === 设计稿 38.4px
```

---

## 3. 数据轮播

> 大屏弱交互，**轮播**是传递多页信息的主要手段——自动滚动列表、切换 Tab、定时刷新。

### 3.1 列表无缝滚动

```vue
<!-- ScrollList.vue -->
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
const listRef = ref(null);
const offset = ref(0);
let timer;

onMounted(() => {
  // 每 50ms 上移 1px，到一半高度复位 → 无缝循环
  timer = setInterval(() => {
    offset.value -= 1;
    const half = listRef.value.scrollHeight / 2;
    if (-offset.value >= half) offset.value = 0;
    listRef.value.style.transform = `translateY(${offset.value}px)`;
  }, 50);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <div class="scroll-viewport" style="height:300px;overflow:hidden">
    <div ref="listRef" class="scroll-content">
      <slot />              <!-- 列表项 -->
      <slot />              <!-- 复制一份，实现无缝 -->
    </div>
  </div>
</template>
```

> **无缝原理**：内容渲染两份，滚到第一份末尾时瞬间复位到 0，视觉连续。

### 3.2 Tab 自动切换

```js
// 多个面板按时间轮流显示
const tabs = ['realTime', 'history', 'alarm'];
let idx = 0;
setInterval(() => {
  idx = (idx + 1) % tabs.length;
  activeTab.value = tabs[idx];
}, 8000); // 每 8 秒切一屏
```

### 3.3 定时刷新数据

```js
function startPolling() {
  fetchData();                          // 立即拉一次
  return setInterval(fetchData, 5000);  // 每 5 秒
}
// 用 WebSocket 更佳：服务端主动推，无需轮询
```

---

## 4. 动效设计

> 大屏的「科技感」70% 来自动效。但要服务于**信息传达**，不为了炫而炫。

### 4.1 四类常用动效

| 动效 | 实现 | 作用 |
|------|------|------|
| **入场动画** | CSS keyframes / ECharts `animationDuration` | 模块逐个浮现，避免生硬 |
| **数字滚动** | `countUp.js` / requestAnimationFrame 插值 | 关键指标「跳动增长」，抓眼球 |
| **粒子背景** | Canvas / Three.js Points | 科技氛围（注意性能） |
| **边框装饰动画** | SVG/CSS `stroke-dasharray` 流光 | 装饰性科技边框 |

### 4.2 数字滚动（countUp）

```js
// 用 requestAnimationFrame 做数值缓动
function animateNumber(el, from, to, duration = 1500) {
  const start = performance.now();
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    el.textContent = Math.floor(from + (to - from) * eased).toLocaleString();
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
// 数据更新时调用：animateNumber(dom, oldVal, newVal)
```

### 4.3 边框流光（SVG 描边动画）

```html
<svg class="border-deco" viewBox="0 0 200 100">
  <rect x="2" y="2" width="196" height="96" fill="none"
        stroke="#4f9dff" stroke-width="2"
        stroke-dasharray="400" stroke-dashoffset="400">
    <animate attributeName="stroke-dashoffset"
             from="400" to="0" dur="2s" repeatCount="indefinite"/>
  </rect>
</svg>
```

### 4.4 动效原则

- **时长克制**：入场 300~600ms，循环流光 2~4s，别拖沓。
- **只动关键处**：指标数字、告警点、重点线条动，背景静态。
- **性能优先**：动效用 CSS transform/opacity（走 GPU 合成层），别动 width/height/top（触发重排）。
- **尊重 `prefers-reduced-motion`**：无障碍用户可关动画。

---

## 5. 性能考量

> 大屏长时间运行 + 多图并发，性能是生死线。卡顿会直接暴露在大屏上。

### 5.1 四大性能抓手

| 问题 | 解法 |
|------|------|
| 图表过多同时渲染卡 | **图表懒加载**：进入视口/轮播到才 init |
| 轮播容器 DOM 无限增长 | **容器回收**：只保留可见 + 缓冲项，移除离屏 |
| 大量粒子/动效吃 GPU | **合成层管理**：只动 transform/opacity，限制粒子数，低端设备关泛光 |
| 实时更新全量重绘 | **增量更新**：ECharts appendData / 局部 setOption / Vue 精准响应式 |

### 5.2 图表懒加载

```vue
<!-- 轮播到该面板才初始化图表 -->
watch(activeTab, (tab) => {
  if (tab === 'map' && !mapInited) {
    initMapChart();      // 延迟到需要时才 init
    mapInited = true;
  }
});
```

### 5.3 内存与资源释放（最关键）

```js
// 大屏常驻，不释放必内存泄漏
onBeforeUnmount(() => {
  chart.dispose();         // ECharts 实例
  renderer.dispose();      // Three.js 渲染器
  clearInterval(timer);    // 轮播/轮询定时器
  worker.terminate();      // Worker 线程
  resizeObserver.disconnect();
});
```

### 5.4 性能自查清单

- [ ] 用 `transform/opacity` 做动画，避免重排
- [ ] 图表按需 init + `dispose()` 释放
- [ ] 粒子/泛光在低端设备降级
- [ ] 实时数据增量更新，不全量 setOption
- [ ] `setPixelRatio(Math.min(dpr, 2))` 封顶
- [ ] 定时器/Worker/Observer 在卸载时清理
- [ ] 用 Performance 面板监控长期运行的内存曲线是否只增不减

---

## 6. 大屏工程化架构

### 6.1 推荐目录结构

```
bigscreen/
├── App.vue                  # 根：ScreenContainer 包裹
├── composables/
│   ├── useScreenScale.js    # 自适应缩放
│   └── usePolling.js        # 数据轮询/WS
├── components/
│   ├── ScreenContainer.vue  # 缩放容器
│   ├── PanelBox.vue         # 统一面板外框（标题+装饰）
│   ├── ScrollList.vue       # 无缝滚动
│   ├── CountUp.vue          # 数字滚动
│   └── BorderDeco.vue       # 边框流光
├── charts/
│   └── BaseChart.vue        # ECharts 通用封装（shallowRef+dispose）
└── views/
    ├── RealTimePanel.vue
    ├── MapPanel.vue
    └── AlarmPanel.vue
```

### 6.2 统一面板组件

```vue
<!-- PanelBox.vue：让所有模块视觉一致 -->
<template>
  <div class="panel">
    <div class="panel-header">
      <span class="title">{{ title }}</span>
      <BorderDeco />
    </div>
    <div class="panel-body">
      <slot />
    </div>
  </div>
</template>
```

> **价值**：大屏几十个模块，统一 PanelBox 后风格零偏差，改一处全局生效。

---

## 7. caidiaweb 大屏实战

### 7.1 整体架构落地

```
App.vue
 └─ ScreenContainer (scale 1920×1080)
     ├─ Header（标题 + 时钟 CountUp）
     ├─ LeftColumn
     │   ├─ PanelBox > 各站信号强度（条形图）
     │   └─ PanelBox > 设备状态（环形图）
     ├─ CenterColumn
     │   ├─ 地图（geo + effectScatter 涟漪告警）
     │   └─ 频段热力图（heatmap + large）
     └─ RightColumn
         ├─ PanelBox > 24h 趋势（折线 + dataZoom）
         ├─ PanelBox > 干扰关系（D3 力导向）
         └─ ScrollList（告警滚动播报）
```

### 7.2 关键技术选型映射

| 模块 | 技术 | 来自哪章 |
|------|------|---------|
| 自适应 | `useScreenScale` scale 方案 | 本章 2.2 |
| 信号强度/趋势/状态 | ECharts | 5.4 |
| 地图涟漪/热力 | ECharts geo + effectScatter + heatmap | 5.4 |
| 干扰关系网络 | D3 forceSimulation | 5.5 |
| 三维/粒子氛围（可选） | Three.js Points | 5.3 |
| 配色/选型 | 设计原则（暗色板 + 决策树） | 5.6 |
| 数字滚动/滚动播报 | CountUp + ScrollList | 本章 3/4 |
| 边框流光 | SVG 描边动画 | 5.1 / 本章 4.3 |

### 7.3 落地检查清单（交付前逐条核对）

- [ ] 1920×1080 设计稿 + scale 自适应，投到拼接屏不变形
- [ ] 统一 PanelBox 风格，零偏差
- [ ] 配色用 caidia 暗色主题（统一色板，非随手写）
- [ ] 图表按需 init + 卸载 dispose，长时间运行内存平稳
- [ ] 实时数据走 WebSocket/appendData 增量，不全量重绘
- [ ] 告警/关键指标有数字滚动 + 高亮动效
- [ ] 列表无缝滚动，定时器卸载清理
- [ ] 动画只用 transform/opacity，低端设备降级泛光/粒子
- [ ] Performance 监控：长跑 1 小时内存曲线无只增不减

---

## 8. 面试考点

### Q1：大屏自适应为什么推荐 scale 缩放而非 rem/vw？
大屏是固定分辨率设计稿投到异形屏，要求**像素级还原且不变形**。scale 整体等比缩放最稳；rem/vw 是流式适配，在超宽/异形屏会比例失调或拉伸。scale 用 `Math.min(宽比,高比)` 保证整体装下。

### Q2：scale 方案的黑边怎么处理？
`Math.min` 缩放会在某一边留黑边。可 `transform-origin: center` 居中留黑边（大屏通常接受），或用 `Math.max` 填满但裁切溢出（内容可能被切）。按业务容忍度选择，一般接受黑边保完整。

### Q3：无缝滚动列表怎么实现？
内容渲染两份，用 transform: translateY 持续上移，移到第一份高度一半时瞬间复位到 0，视觉连续。注意用 transform（合成层）而非 top，卸载时 clearInterval。

### Q4：大屏数字滚动怎么实现？
requestAnimationFrame 做数值插值（easeOutCubic），从旧值缓动到新值，期间更新 textContent。或用 countUp.js。数据更新时触发。

### Q5：大屏性能从哪些方面优化？
① 图表懒加载（轮播到才 init）；② 容器回收（轮播只留可见+缓冲）；③ 合成层管理（只动 transform/opacity，限制粒子数）；④ 实时增量更新（appendData/局部 setOption）；⑤ dispose 释放实例 + 清理定时器。

### Q6：大屏长时间运行如何防内存泄漏？
onBeforeUnmount 中：ECharts `dispose()`、Three.js `renderer.dispose()`、clearInterval 定时器、worker.terminate()、resizeObserver.disconnect()。用 Performance 监控内存曲线是否只增不减。

### Q7：大屏动效设计原则？
服务于信息传达而非炫技：入场 300~600ms、循环流光 2~4s 克制；只动关键处（指标/告警），背景静态；动效用 transform/opacity 走 GPU；尊重 prefers-reduced-motion。

### Q8：大屏为什么弱交互、重自动轮播？
大屏是 7×24 值守、远观、无操作员点击的场景。信息靠自动轮播（列表滚动、Tab 切换、定时刷新）和动画主动推送给观众，而非等待鼠标交互。

---

> **本章小结（阶段 5 收官）**：大屏可视化 = 自适应（scale 等比缩放保还原）+ 数据轮播（无缝滚动/Tab 切换/定时刷新）+ 动效（入场/数字滚动/粒子/边框流光，只动关键处）+ 性能（懒加载/容器回收/合成层/dispose 释放）。它把阶段 5 前 6 章所有技术（SVG/Canvas/WebGL/ECharts/D3/设计原则）综合落地。掌握本章，你已具备独立交付行业级数据可视化大屏的能力。
>
> 🎉 **阶段 5 前端可视化技术 7 章全部完成（5.1~5.7）**，从 SVG 基础 → Canvas → WebGL/Three.js → ECharts → D3 → 设计原则 → 大屏综合，形成了完整的可视化能力体系。
