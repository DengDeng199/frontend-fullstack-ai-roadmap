# 5.1 SVG 深入

> 阶段 5 · 前端可视化技术
> 学习目标：系统掌握 SVG 的基础图形、Path 路径命令、三类动画方案，理解 SVG 与 Canvas 的取舍边界，并能用 viewBox / preserveAspectRatio 做出真正可自适应的矢量图。

---

## 目录

| 章节 | 内容 |
|------|------|
| [一、SVG 基础回顾](#一svg-基础回顾) | 7 种基础图形、坐标系统、常用属性 |
| [二、Path 路径命令](#二path-路径命令) | M/L/H/V/C/S/Q/T/A/Z 全命令 + 实战 |
| [三、SVG 动画](#三svg-动画) | CSS animation / SMIL / GSAP 三方案对比 |
| [四、SVG 与 Canvas 对比](#四svg-与-canvas-对比) | 取舍边界、选型决策树 |
| [五、SVG 优化](#五svg-优化) | viewBox / preserveAspectRatio / 性能要点 |
| [六、caidiaweb 实践案例](#六caidiaweb-实践案例) | 用 SVG 实现信号强度图标 + 动效 + 自适应 |
| [七、面试考点](#七面试考点) | 高频面试题与标准回答 |

---

## 一、SVG 基础回顾

### 1.1 什么是 SVG

**SVG（Scalable Vector Graphics）**：基于 XML 的**矢量**图形格式。与位图（PNG/JPG 像素）不同，SVG 用「指令」描述图形，因此**无限缩放不模糊**，且每个图形都是真实 DOM 节点，可被 CSS/JS 操作。

```html
<svg width="200" height="200" viewBox="0 0 200 200">
  <rect x="10" y="10" width="80" height="80" fill="#409eff" />
</svg>
```

### 1.2 七种基础图形

| 图形 | 标签 | 核心属性 | 示意 |
|------|------|---------|------|
| 矩形 | `<rect>` | `x y width height rx`(圆角) | 卡片/背景块 |
| 圆 | `<circle>` | `cx cy r` | 点/标记/雷达 |
| 椭圆 | `<ellipse>` | `cx cy rx ry` | 变形圆 |
| 线段 | `<line>` | `x1 y1 x2 y2` | 连接线/坐标轴 |
| 折线 | `<polyline>` | `points="x1,y1 x2,y2 ..."` | 不闭合路径 |
| 多边形 | `<polygon>` | `points="..."`（自动闭合） | 三角形/星形 |
| 路径 | `<path>` | `d="..."`（见第二章） | 一切复杂图形 |

### 1.3 通用属性

```html
<rect
  x="10" y="10" width="100" height="60"
  fill="#409eff"          <!-- 填充色 -->
  fill-opacity="0.6"      <!-- 填充透明度 -->
  stroke="#303133"        <!-- 描边色 -->
  stroke-width="2"        <!-- 描边宽 -->
  stroke-dasharray="5 3"  <!-- 虚线：实5 空3 -->
  rx="8" ry="8"           <!-- 圆角 -->
/>
```

**坐标系要点**：SVG 默认坐标系 y 轴**向下**为正（与数学相反）；原点在左上角。

### 1.4 分组与复用

```html
<defs>
  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#409eff" />
    <stop offset="100%" stop-color="#67c23a" />
  </linearGradient>
  <g id="icon-star"> ... </g>
</defs>

<use href="#icon-star" x="50" y="50" />   <!-- 复用定义 -->
<rect fill="url(#grad)" ... />             <!-- 引用渐变 -->
```

---

## 二、Path 路径命令

### 2.1 为什么 Path 是核心

`<path>` 的 `d` 属性用**命令字母 + 坐标**描述任意形状，是 SVG 最强大也最常用的元素——图标库（Icon Font、SVG Sprite）本质都是 path。掌握它 = 能画一切。

### 2.2 命令速查表

| 命令 | 含义 | 参数 | 绝对/相对 |
|------|------|------|----------|
| `M x y` | MoveTo 移动到起点 | 1 点 | 绝对 |
| `m dx dy` | 相对移动 | 1 点 | 相对 |
| `L x y` | LineTo 直线到 | 1 点 | 绝对 |
| `H x` | 水平线到（只变 x） | 1 数 | 绝对 |
| `V y` | 垂直线到（只变 y） | 1 数 | 绝对 |
| `C x1 y1 x2 y2 x y` | 三次贝塞尔曲线 | 3 点（2 控制 + 1 终点） | 绝对 |
| `S x2 y2 x y` | 平滑三次曲线（对称控制点） | 2 点 | 绝对 |
| `Q x1 y1 x y` | 二次贝塞尔曲线 | 2 点（1 控制 + 1 终点） | 绝对 |
| `T x y` | 平滑二次曲线 | 1 点 | 绝对 |
| `A rx ry x-axis-rotation large-arc-flag sweep-flag x y` | 圆弧 | 半径+旋转+两个标志+终点 | 绝对 |
| `Z` | 闭合路径 | 无 | — |

> 💡 小写命令（`l`/`c`/`q`）表示**相对当前点**的坐标，画重复/对称图形更省事。

### 2.3 实战示例

**示例 1：画一个三角形**
```html
<path d="M 50 10 L 90 90 L 10 90 Z" fill="#409eff" />
<!-- M 到顶点 → L 到右下 → L 到左下 → Z 闭合回顶点 -->
```

**示例 2：画一条平滑波浪线（Q 二次曲线）**
```html
<path d="M 0 50 Q 25 10 50 50 T 100 50" fill="none" stroke="#67c23a" stroke-width="3" />
<!-- Q 控制点(25,10) 终点(50,50)；T 自动对称控制点到(100,50) -->
```

**示例 3：画一个半圆弧（A 命令）**
```html
<!-- 半径50，从(50,10)画弧到(50,110)，large-arc=0 取小弧，sweep=1 顺时针 -->
<path d="M 50 10 A 50 50 0 0 1 50 110" fill="none" stroke="#e6a23c" stroke-width="3" />
```

**示例 4：心形（C 三次曲线，真实图标写法）**
```html
<path d="M 50 90
         C 50 90 10 60 10 35
         C 10 20 25 15 35 25
         C 45 35 50 40 50 45
         C 50 40 55 35 65 25
         C 75 15 90 20 90 35
         C 90 60 50 90 50 90 Z"
      fill="#f56c6c" />
```

### 2.4 调试工具

- **SVG Path Editor**（在线）：可视化拖拽控制点，实时生成 `d`
- 浏览器 DevTools：直接改 `d` 属性看形状变化
- 用 `getTotalLength()` / `getPointAtLength()` 在 JS 里读取路径几何（配合动画）

---

## 三、SVG 动画

### 3.1 三方案对比

| 方案 | 原理 | 优点 | 缺点 | 推荐度 |
|------|------|------|------|--------|
| **CSS animation** | `@keyframes` + `transform` | 简单、GPU 加速、性能好 | 只能动部分属性、复杂路径难 | ⭐⭐⭐⭐ |
| **SMIL** | `<animate>`/`<animateMotion>` 原生标签 | 声明式、可沿 path 运动 | 已弃用趋势、Safari 支持差 | ⭐⭐（了解） |
| **GSAP** | JS 动画库 | 时间线精准、沿 path、缓动强 | 需引入库 | ⭐⭐⭐⭐⭐（推荐） |

### 3.2 CSS animation 示例

```html
<style>
  .pulse { transform-origin: center; animation: pulse 1.2s ease-in-out infinite; }
  @keyframes pulse {
    0%   { transform: scale(1);   opacity: 1; }
    70%  { transform: scale(1.4); opacity: 0; }
    100% { transform: scale(1.4); opacity: 0; }
  }
</style>
<circle class="pulse" cx="50" cy="50" r="10" fill="#f56c6c" />
```

> ⚠️ SVG 元素动画优先用 `transform`，且设 `transform-box: fill-box; transform-origin: center;` 让旋转/缩放以自身中心为基准。

### 3.3 SMIL 示例（了解）

```html
<!-- 沿路径运动的小点 -->
<circle r="5" fill="#409eff">
  <animateMotion dur="3s" repeatCount="indefinite" path="M 0 50 Q 50 0 100 50 T 200 50" />
</circle>
<!-- 属性渐变 -->
<rect width="40" height="40" fill="#409eff">
  <animate attributeName="width" from="40" to="120" dur="1s" repeatCount="indefinite" />
</rect>
```

> 注意：Chrome 仍支持 SMIL，但 W3C 曾计划弃用，生产环境慎用，复杂动效交给 GSAP。

### 3.4 GSAP 示例（推荐）

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<script>
  // 沿 path 描边动画（画线效果）
  const path = document.querySelector('#line-path')
  const len = path.getTotalLength()
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len })
  gsap.to(path, { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut' })

  // 时间线编排多个图形
  const tl = gsap.timeline({ repeat: -1 })
  tl.to('.dot', { x: 100, duration: 1 }).to('.dot', { y: 50, duration: 0.5 })
</script>
```

**GSAP 优势**：`strokeDashoffset` 实现「描边生长」动画、MotionPathPlugin 沿任意 path 运动、时间线精确编排——大屏动效首选。

---

## 四、SVG 与 Canvas 对比

### 4.1 核心差异

| 维度 | SVG | Canvas |
|------|------|--------|
| 渲染模型 | **保留模式**（DOM 节点，浏览器维护场景图） | ** immediate 模式**（脚本逐帧重绘像素） |
| 事件绑定 | 每个元素可直接 `addEventListener` ✅ | 需手动算坐标命中检测 ❌ |
| 性能拐点 | 元素 **> 1000~5000** 时卡顿 | 数万图形仍流畅 ✅ |
| 适用量 | 少量、交互强、需精确事件 | 大量、像素级、实时渲染 |
| 缩放 | 矢量无损 ✅ | 位图放大模糊（需重设尺寸重绘） |
| 文本/可访问 | 天然可选中、可 SEO ✅ | 不可选中、需额外处理 |
| 典型场景 | 图表、图标、地图、UI 装饰 | 游戏、粒子、图像编辑、热力图 |

### 4.2 选型决策树

```
要画的是？
├── 图形数量 < 1000 且需点击事件/SEO → ✅ SVG
├── 图形数量巨大 / 实时逐帧 / 像素处理 → ✅ Canvas
└── 既要矢量又要海量 → Canvas 画 + SVG 叠加 UI 层（混合）
```

### 4.3 caidiaweb 中的取舍

- **ECharts 图表**：内部用 Canvas（海量数据点）；地图/少量标注可用 SVG 层
- **信号强度图标、站点标记、装饰边框**：SVG（数量少、要 hover 交互）
- **大屏粒子背景**：Canvas / WebGL（数量大、性能敏感，见 5.7 章）

---

## 五、SVG 优化

### 5.1 viewBox：自适应核心

```html
<!-- width/height 是渲染尺寸；viewBox 是内部坐标系 -->
<svg viewBox="0 0 100 100" width="100%" height="100%">
  <circle cx="50" cy="50" r="40" />
</svg>
```

`viewBox="minX minY width height"` 定义了「用户坐标空间」。无论外部容器多大，图形都按 viewBox 比例缩放，**这就是 SVG 自适应的秘密**。

### 5.2 preserveAspectRatio：对齐与裁切

```html
<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
<!--
  格式：<align> <meetOrSlice>
  align:   xMin|xMid|xMax  +  YMin|YMid|YMax（对齐方式）
  meet（默认）：完整显示，留白（contain 效果）
  slice：      填满裁切（cover 效果）
-->
```

| 值 | 效果 |
|----|------|
| `xMidYMid meet`（默认） | 居中、完整、可能留白 |
| `xMidYMid slice` | 居中、填满、可能裁切 |
| `none` | 拉伸变形（不保持比例） |

### 5.3 性能优化要点

| 问题 | 优化 |
|------|------|
| 节点过多 | 合并 path、用 `<use>` 复用、简化 `d`（round 小数） |
| 频繁重绘 | 用 CSS `transform`（合成层）而非改 `x/y` 属性 |
| 滤镜开销 | `filter: blur/drop-shadow` 昂贵，大图慎用 |
| 文件体积 | 用 SVGO 压缩（删 metadata、合并、round） |
| 雪碧图 | 多图标合并一个 SVG Sprite（见 3.4 章图标方案） |

```bash
# 用 SVGO 压缩 SVG
npx svgo icon.svg -o icon.min.svg
```

---

## 六、caidiaweb 实践案例

### 6.1 场景：信号强度指示器（SVG + 动画 + 自适应）

caidiaweb 监测站列表中，每个站点要显示信号强度，并随数据刷新有「呼吸」动效。

```vue
<!-- SignalStrength.vue -->
<template>
  <svg class="signal" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet"
       :aria-label="`信号强度 ${level}/4`">
    <rect v-for="(h, i) in bars" :key="i"
          :x="2 + i * 6" y="22 - h" width="4" :height="h"
          :fill="i < level ? activeColor : '#dcdfe6'"
          rx="1" :class="{ 'bar-pulse': i < level && pulse }" />
  </svg>
</template>

<script setup>
defineProps({
  level: { type: Number, default: 0 },   // 0-4
  pulse: { type: Boolean, default: true },
  activeColor: { type: String, default: '#67c23a' }
})
const bars = [6, 10, 14, 18]             // 四根柱子的高度
</script>

<style scoped>
.signal { width: 100%; height: 100%; max-width: 32px; }
.bar-pulse { transform-box: fill-box; transform-origin: bottom;
  animation: breathe 1.6s ease-in-out infinite; }
@keyframes breathe {
  0%, 100% { opacity: 1; transform: scaleY(1); }
  50%      { opacity: 0.55; transform: scaleY(0.85); }
}
</style>
```

### 6.2 场景：站点地图标记（SVG 路径 + 沿路径动效）

```html
<!-- 用 GSAP 让告警点在轨迹上移动 -->
<svg viewBox="0 0 200 200">
  <path id="track" d="M 20 180 Q 100 20 180 180" fill="none"
        stroke="#409eff" stroke-width="2" stroke-dasharray="4 4" />
  <circle id="alarm" r="5" fill="#f56c6c" />
</svg>
<script>
  gsap.to('#alarm', {
    duration: 3, repeat: -1, ease: 'none',
    motionPath: { path: '#track', align: '#track', alignOrigin: [0.5, 0.5] }
  })
</script>
```

### 6.3 落地检查清单

- [ ] 用 `viewBox` + `width/height: 100%` 让图标自适应容器
- [ ] 交互元素（标记/按钮）用 SVG 直接绑事件
- [ ] 大量装饰用 SVG Sprite 合并，避免重复 DOM
- [ ] 动画用 CSS `transform`（设 `transform-box: fill-box`）
- [ ] 复杂动效（描边/沿路径）引入 GSAP
- [ ] 发版前用 SVGO 压缩 SVG 资源

---

## 七、面试考点

### Q1：SVG 和 Canvas 的本质区别？怎么选？
**答**：SVG 是**保留模式**的矢量 DOM，每个图形是节点、可直接绑事件、缩放无损，但元素过多（数千）会卡；Canvas 是**立即模式**的像素绘制，脚本逐帧重绘、适合海量图形/实时渲染，但事件需手动命中检测。选型：少量+交互+SEO → SVG；海量+实时+像素 → Canvas。

### Q2：Path 的 C 和 Q 命令区别？
**答**：`C`（三次贝塞尔）有 2 个控制点 + 1 终点，曲率控制更精细；`Q`（二次贝塞尔）只有 1 个控制点 + 1 终点，更简单。图标设计常用 C（更灵活），简单弧线用 Q。对应的 `S`/`T` 是「平滑」版，自动对称上一控制点。

### Q3：viewBox 的作用是什么？为什么 SVG 能自适应？
**答**：`viewBox="minX minY w h"` 定义 SVG 的**内部坐标系**，与渲染尺寸（width/height）解耦。浏览器按 viewBox 把图形映射到实际像素，容器变大变小只改变映射比例，图形矢量缩放无损——这就是自适应的核心。`preserveAspectRatio` 控制对齐与是否裁切。

### Q4：SVG 动画有哪几种方案？推荐哪个？
**答**：① CSS animation（简单、GPU 加速，但只能动部分属性）；② SMIL（原生 `<animate>` 标签、可沿 path 运动，但已弃用趋势、Safari 差）；③ GSAP（JS 库、时间线精准、支持描边/沿路径动效，最推荐）。大屏/复杂动效首选 GSAP。

### Q5：为什么 SVG 元素多了会卡？如何优化？
**答**：每个 SVG 元素是真实 DOM 节点，节点过多会增加布局/绘制/事件开销。优化：合并 path、用 `<use>` 复用、SVG Sprite 合并图标、用 CSS transform 触发合成层、用 SVGO 压缩、大批量图形改 Canvas。

### Q6：preserveAspectRatio 的 meet 和 slice 区别？
**答**：`meet`（默认）= 完整显示、等比缩放、可能留白（类似 CSS contain）；`slice` = 填满容器、等比缩放、超出部分裁切（类似 cover）；还可设 `none` 拉伸变形。配合 `xMidYMid` 等控制对齐锚点。

### Q7：项目中 SVG 和 Canvas 怎么配合？
**答**：典型大屏采用**分层混合**——Canvas/WebGL 画海量数据/粒子（性能层），SVG 画少量 UI 标记/装饰/可交互元素（交互层）。caidiaweb 中图表用 ECharts（Canvas），站点标记和信号图标用 SVG，粒子背景用 Canvas。

---

> 📌 **学习建议**：打开任意图标库（如 Element Plus 图标）的 SVG 源码，挑一个用 path 命令在纸上/编辑器里还原一遍，再配 GSAP 加个描边动画，对 Path 和动画的理解会立刻扎实。
