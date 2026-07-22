# 5.5 D3.js 基础

> 阶段 5 — 前端可视化技术 / 第 5 章
> 核心目标：理解 D3 的「数据驱动 DOM」范式，掌握 Selections、Enter-Update-Exit、比例尺、轴、过渡动画、力导向图、层级图，并能与 Vue3 集成。

---

## 目录

1. [D3 是什么：与 ECharts 的本质区别](#1-d3-是什么与-echarts-的本质区别)
2. [核心概念：Selections 与 DOM join](#2-核心概念selections-与-dom-join)
3. [比例尺 Scales](#3-比例尺-scales)
4. [轴 Axes](#4-轴-axes)
5. [过渡动画 transition](#5-过渡动画-transition)
6. [力导向图 forceSimulation](#6-力导向图-forcesimulation)
7. [层级图 hierarchy（树图 / 旭日图）](#7-层级图-hierarchy树图--旭日图)
8. [D3 与 Vue3 集成](#8-d3-与-vue3-集成)
9. [caidiaweb 实践](#9-caidiaweb-实践)
10. [面试考点](#10-面试考点)

---

## 1. D3 是什么：与 ECharts 的本质区别

> D3（Data-Driven Documents）不是「图表库」，而是**用数据操作文档（DOM/SVG）的工具集**。它给你的是「积木」，不是「成品图」。

```
ECharts：你给数据 → 它画好图表（封闭、开箱即用）
D3    ：你用数据 + 代码 → 自己操作 SVG/Canvas 画任何东西（开放、灵活、成本高）
```

| 维度 | ECharts | D3.js |
|------|---------|-------|
| 定位 | 图表库（成品） | 数据驱动 DOM 工具集 |
| 上手 | 配 option 即可 | 需自己写 DOM 操作逻辑 |
| 灵活度 | 受内置图表限制 | 任意图形（地图/关系图/自定义） |
| 学习曲线 | 平缓 | 陡峭 |
| 典型产出 | 标准图表大屏 | 高度定制可视化、信息图、关系网络 |
| 性能 | 自带 Canvas 优化 | 依赖你写的 DOM 规模 |

> **经验法则**：做标准大屏图表用 ECharts（快）；做关系网络、树图、定制信息图、科研可视化用 D3（灵活）。两者可混用——D3 算布局，ECharts 画渲染（进阶玩法）。

---

## 2. 核心概念：Selections 与 DOM join

### 2.1 Selections（选择集）

```js
import * as d3 from 'd3';

const svg = d3.select('#chart');           // 选第一个匹配元素
const circles = d3.selectAll('circle');      // 选所有匹配元素

svg.append('circle')                         // 链式：追加子元素
   .attr('r', 5)
   .style('fill', '#4f9dff');

// 批量设置
d3.selectAll('rect')
  .attr('width', 100)
  .style('opacity', 0.8);
```

| 方法 | 作用 |
|------|------|
| `d3.select(sel)` | 选首个匹配 |
| `d3.selectAll(sel)` | 选全部匹配 |
| `.append(tag)` | 追加元素 |
| `.attr(name, val)` | 设置属性（如 r/cx） |
| `.style(name, val)` | 设置 CSS 样式 |
| `.text(val)` | 设置文本内容 |
| `.data(arr)` | **绑定数据** |

### 2.2 Enter-Update-Exit（核心范式）

> D3 的灵魂：**把「数据」和「DOM 元素」做 join，根据数据量动态增删改 DOM**。这是和 jQuery 式手动操作最大的区别。

```
数据 [A, B, C, D]
   │  .data(data)
   ▼
┌─────────────────────────────────────────┐
│ ENTER   ：数据多、DOM 少 → 新建元素       │
│ UPDATE  ：数据 DOM 一一对应 → 更新属性    │
│ EXIT    ：数据少、DOM 多 → 删除多余元素    │
└─────────────────────────────────────────┘
```

```js
const data = [10, 20, 30, 40];

function render(data) {
  const bars = svg.selectAll('rect').data(data, d => d); // 第二个参数是 key 函数（用于稳定匹配）

  // EXIT：移除多余 DOM
  bars.exit()
      .transition().duration(500)
      .attr('height', 0)
      .remove();

  // ENTER：补充缺少的 DOM
  const enter = bars.enter()
      .append('rect')
      .attr('x', (d, i) => i * 30)
      .attr('y', 0)
      .attr('width', 20)
      .attr('height', 0);

  // UPDATE（enter + 已存在）：合并后统一更新
  enter.merge(bars)
      .transition().duration(500)
      .attr('y', d => 100 - d)
      .attr('height', d => d)
      .attr('fill', '#4f9dff');
}

render([10, 20, 30, 40]); // 首次
render([10, 20, 50]);      // 数据变化 → 自动增删改，带过渡
```

> **关键认知**：D3 不「重绘」，而是 diff 数据后**精准操作差异的 DOM**。这就是为什么 D3 动画顺滑——它知道哪个元素该变、哪个该删。

### 2.3 key 函数的重要性

```js
.data(data, d => d.id)  // 用 id 而非索引做匹配
```

- 不用 key → 按数组**索引**匹配，数据重排会错位导致错误更新。
- 用 key → 按**业务 id** 匹配，重排时 DOM 跟随数据移动（动画正确）。

---

## 3. 比例尺 Scales

> 比例尺把「数据域」映射到「视觉域」（像素/颜色）。D3 不直接画，但**所有位置/大小/颜色都由比例尺算出**。

### 3.1 scaleLinear（连续数值）

```js
const x = d3.scaleLinear()
  .domain([0, 100])     // 数据范围（输入）
  .range([0, 500]);     // 像素范围（输出）

x(50);   // → 250
x(100);  // → 500
```

### 3.2 scaleBand（柱状图类目）

```js
const x = d3.scaleBand()
  .domain(['A', 'B', 'C'])   // 离散类目
  .range([0, 300])
  .padding(0.2);             // 柱间留白

x('A');     // → 0
x.bandwidth(); // → 每根柱宽（已扣 padding）
```

### 3.3 scaleTime（时间轴）

```js
const x = d3.scaleTime()
  .domain([new Date('2026-01-01'), new Date('2026-12-31')])
  .range([0, 800]);

x(new Date('2026-06-01')); // → 约 400
```

### 3.4 scaleOrdinal / scaleSequential（颜色）

```js
const color = d3.scaleOrdinal()
  .domain(['A', 'B', 'C'])
  .range(['#4f9dff', '#00d4c8', '#ffb454']);

const heat = d3.scaleSequential(d3.interpolateRdYlBu).domain([0, 100]);
```

| 比例尺 | 输入 | 用途 |
|-------|------|------|
| `scaleLinear` | 连续数值 | 折线/散点坐标、尺寸 |
| `scaleBand` | 离散类目 | 柱状图 x 轴 |
| `scaleTime` | 时间 | 时间轴 |
| `scaleOrdinal` | 类目 | 离散配色 |
| `scaleSequential` | 连续数值 | 渐变配色（热力） |

---

## 4. 轴 Axes

> 轴由比例尺自动生成，是 D3 最省心的能力之一。

```js
const xAxis = d3.axisBottom(xScale)   // 底部 x 轴
  .ticks(5)                            // 5 个刻度
  .tickFormat(d3.format('.0f'));      // 格式化

const yAxis = d3.axisLeft(yScale)
  .tickSizeOuter(0);

svg.append('g')                        // 轴是 <g> 容器
  .attr('transform', 'translate(0, height)')
  .call(xAxis);                        // call 执行轴生成

svg.append('g')
  .attr('class', 'y-axis')
  .call(yAxis);
```

| 方法 | 作用 |
|------|------|
| `axisBottom(scale)` | 底部 x 轴 |
| `axisLeft(scale)` | 左侧 y 轴 |
| `axisTop` / `axisRight` | 上/右轴 |
| `.ticks(n)` | 刻度数量 |
| `.tickFormat(fn)` | 刻度文本格式 |
| `.call(axis)` | 把轴挂到选集 |

> **样式**：轴生成的是 SVG，用 CSS 或 `.selectAll('.tick text')` 调样式。暗色大屏下设 `path.domain`、`line` 描边为低对比色。

---

## 5. 过渡动画 transition

> D3 动画基于插值，对**任意属性**做平滑过渡，比 CSS 动画更适合数据驱动的图形变化。

```js
// 基础过渡
d3.select('circle')
  .transition()
  .duration(800)        // 持续 800ms
  .delay((d, i) => i * 50)   // 错峰延迟（依次出现）
  .ease(d3.easeCubicOut) // 缓动函数
  .attr('r', 20)
  .style('fill', '#ff5d5d');

// 进入动画（配合 Enter）
bars.enter()
  .append('rect')
  .attr('height', 0)
  .merge(bars)
  .transition()
  .duration(600)
  .attr('height', d => yScale(0) - yScale(d));
```

| 缓动 | 效果 |
|------|------|
| `d3.easeLinear` | 匀速 |
| `d3.easeCubicOut` | 先快后慢（常用） |
| `d3.easeBounce` | 弹跳 |
| `d3.easeElastic` | 弹性 |

> **数据更新动画**：数据变了 → enter/exit/merge → 每个分支加 `.transition()`，元素会平滑过渡到新位置/尺寸。这是 D3 动态可视化的核心体验。

---

## 6. 力导向图 forceSimulation

> 关系网络（设备拓扑、社交关系、调用链）首选。节点受「力」驱动自动布局到稳定形态。

```js
const nodes = [
  { id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' },
];
const links = [
  { source: 'A', target: 'B' },
  { source: 'A', target: 'C' },
  { source: 'B', target: 'D' },
];

const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id(d => d.id).distance(80))
  .force('charge', d3.forceManyBody().strength(-200)) // 节点互斥
  .force('center', d3.forceCenter(width / 2, height / 2)) // 居中
  .on('tick', ticked); // 每帧更新坐标

function ticked() {
  link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
  node.attr('cx', d => d.x).attr('cy', d => d.y);
}

// 绘制
const link = svg.append('g').selectAll('line')
  .data(links).join('line')
  .attr('stroke', '#2a4a7a');

const node = svg.append('g').selectAll('circle')
  .data(nodes).join('circle')
  .attr('r', 10).attr('fill', '#4f9dff')
  .call(d3.drag()   // 拖拽交互
    .on('start', (e, d) => { simulation.alphaTarget(0.3).restart(); })
    .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
    .on('end', (e, d) => { simulation.alphaTarget(0); d.fx = null; d.fy = null; }));
```

| 力 | 作用 |
|----|------|
| `forceLink` | 连线拉力（按距离） |
| `forceManyBody` | 节点间斥力/引力（`strength` 负为斥） |
| `forceCenter` | 整体居中 |
| `forceCollide` | 防重叠（节点半径碰撞） |
| `forceX` / `forceY` | 向某轴吸引 |

> **caidiaweb 适用**：监测站拓扑关系图、设备调用链、信号干扰关联网络，用 forceSimulation 最直观。

---

## 7. 层级图 hierarchy（树图 / 旭日图）

> 树状/层级数据（组织结构、设备分类、目录树）用 `d3.hierarchy` + 布局算法。

### 7.1 树图（可折叠）

```js
const root = d3.hierarchy(treeData); // 树数据 {name, children:[...]}
const treeLayout = d3.tree().size([width, height]);
treeLayout(root); // 计算每个节点的 x/y

// 连线
svg.append('g').selectAll('path')
  .data(root.links()).join('path')
  .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y))
  .attr('fill', 'none').attr('stroke', '#2a4a7a');

// 节点
svg.append('g').selectAll('circle')
  .data(root.descendants()).join('circle')
  .attr('cx', d => d.x).attr('cy', d => d.y)
  .attr('r', 5).attr('fill', '#4f9dff');
```

### 7.2 旭日图（Sunburst，环形层级）

```js
const root = d3.hierarchy(treeData).sum(d => d.value);
const pie = d3.partition().size([2 * Math.PI, radius]);
pie(root);

svg.append('g').selectAll('path')
  .data(root.descendants().filter(d => d.depth))
  .join('path')
  .attr('d', d3.arc()
    .startAngle(d => d.x0).endAngle(d => d.x1)
    .innerRadius(d => d.y0).outerRadius(d => d.y1))
  .attr('fill', d => color(d.data.name));
```

| 布局 | 适用 |
|------|------|
| `d3.tree` | 树状图（组织/分类） |
| `d3.cluster` | 聚类树（所有叶同层） |
| `d3.partition` | 旭日图/冰柱图（环形层级） |
| `d3.treemap` | 矩形树图（面积编码） |

---

## 8. D3 与 Vue3 集成

### 8.1 原则：Vue 管容器，D3 管 SVG 内部

```
Vue 组件：负责 <svg ref="svg"> 挂载、响应式数据、生命周期
D3      ：在 onMounted 后操作这个 SVG 内部，用 enter/update/exit 渲染
```

> **不要**让 Vue 的 v-for 去渲染 D3 的图形（两套 DOM 管理会打架）。正确做法：Vue 提供 ref 容器，D3 完全接管其内部 DOM。

### 8.2 集成示例

```vue
<!-- ForceGraph.vue -->
<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as d3 from 'd3';

const props = defineProps({ data: { type: Object, required: true } });
const svgRef = ref(null);
let simulation, svg, node, link;

function render(data) {
  const width = svgRef.value.clientWidth;
  const height = svgRef.value.clientHeight;
  svg = d3.select(svgRef.value);
  svg.selectAll('*').remove(); // 清场（简单可靠，大数据才需精细 diff）

  const root = d3.hierarchy(data);
  const tree = d3.tree().size([width - 80, height - 80]);
  tree(root);

  link = svg.append('g').selectAll('path')
    .data(root.links()).join('path')
    .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y))
    .attr('fill', 'none').attr('stroke', '#2a4a7a');

  node = svg.append('g').selectAll('g')
    .data(root.descendants()).join('g')
    .attr('transform', d => `translate(${d.x},${d.y})`);

  node.append('circle').attr('r', 6).attr('fill', '#4f9dff');
  node.append('text').text(d => d.data.name)
    .attr('dx', 10).attr('dy', 4)
    .attr('fill', '#c9d3e0').style('font-size', '12px');
}

onMounted(() => render(props.data));
watch(() => props.data, render);
onBeforeUnmount(() => simulation?.stop());
</script>

<template>
  <svg ref="svgRef" class="force-graph"></svg>
</template>

<style scoped>
.force-graph { width: 100%; height: 400px; }
</style>
```

### 8.3 集成要点

| 要点 | 原因 |
|------|------|
| Vue 给 ref 容器，D3 操作内部 | 避免两套 DOM 管理冲突 |
| `onMounted` 后初始化 D3 | 确保 SVG 已挂载 |
| `onBeforeUnmount` 停止 simulation | 力导图定时器不清除会内存泄漏 |
| 数据变化用 `watch` 重渲染 | 响应式驱动可视化更新 |
| 大数据才做精细 enter/exit | 小数据 `selectAll('*').remove()` 更省心 |

---

## 9. caidiaweb 实践

### 9.1 场景映射

| caidiaweb 需求 | D3 方案 |
|---------------|--------|
| 监测站拓扑/干扰关系网络 | `forceSimulation` 力导向图 |
| 设备分类层级 | `d3.tree` / `d3.partition` 旭日图 |
| 信号强度时序（定制） | `scaleLinear` + `axisBottom` + 过渡更新 |
| 频段分布热力（定制） | `scaleSequential` + 自定义矩形网格 |

### 9.2 关系网络实战（监测站干扰关联）

```js
// 输入：{ nodes: [{id, name}], links: [{source, target, weight}] }
function renderForceGraph(container, graph) {
  const width = container.clientWidth, height = container.clientHeight;
  const svg = d3.select(container).append('svg')
    .attr('width', width).attr('height', height);

  const sim = d3.forceSimulation(graph.nodes)
    .force('link', d3.forceLink(graph.links).id(d => d.id).distance(d => 100 - d.weight * 10))
    .force('charge', d3.forceManyBody().strength(-180))
    .force('center', d3.forceCenter(width / 2, height / 2));

  const link = svg.append('g').selectAll('line')
    .data(graph.links).join('line')
    .attr('stroke', d => d3.interpolateRdYlBu(d.weight))
    .attr('stroke-width', d => d.weight * 3);

  const node = svg.append('g').selectAll('circle')
    .data(graph.nodes).join('circle')
    .attr('r', 10).attr('fill', '#4f9dff')
    .call(d3.drag()
      .on('start', (e, d) => sim.alphaTarget(0.3).restart())
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => { sim.alphaTarget(0); d.fx = null; d.fy = null; }));

  node.append('title').text(d => d.name); // 悬浮提示

  sim.on('tick', () => {
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('cx', d => d.x).attr('cy', d => d.y);
  });

  return sim; // 外部可 stop()
}
```

### 9.3 落地检查清单

- [ ] Vue 只提供 ref 容器，D3 接管内部 SVG（不混用 v-for 渲染图形）
- [ ] `onBeforeUnmount` 停止 `forceSimulation`（防定时器泄漏）
- [ ] 大数据用 enter/update/exit 精细 diff，小数据用 `selectAll('*').remove()` 重绘
- [ ] 比例尺统一由 `scaleLinear/Band/Time` 算坐标，别硬编码像素
- [ ] 暗色主题下轴/连线的描边设为低对比色
- [ ] 拖拽、悬浮等交互用 D3 原生（`d3.drag` / `append('title')`）

---

## 10. 面试考点

### Q1：D3 和 ECharts 有什么区别？怎么选？
D3 是数据驱动 DOM 的工具集（灵活、需自己写渲染）；ECharts 是开箱即用的图表库（快、受内置图表限制）。标准大屏图表用 ECharts；关系网络、树图、定制信息图、科研可视化用 D3。

### Q2：什么是 Enter-Update-Exit？
D3 把「数据」与「DOM 元素」做 join 的核心范式：ENTER（数据多就新建元素）、UPDATE（一一对应就更新属性）、EXIT（数据少就删除多余元素）。保证 DOM 与数据始终同步，且可带过渡动画。

### Q3：为什么要用 key 函数（data(arr, d => d.id)）？
用 id 而非数组索引做数据-DOM 匹配。数据重排时 DOM 会跟随业务 id 移动，动画正确；否则按索引匹配，重排会错位导致错误更新/动画错乱。

### Q4：比例尺（scale）是干嘛的？
把数据域映射到视觉域（像素/颜色）。`scaleLinear` 连续数值、`scaleBand` 类目柱状、`scaleTime` 时间、`scaleOrdinal/Sequential` 配色。所有位置大小颜色都由比例尺算，避免硬编码。

### Q5：D3 的 transition 和 CSS 动画有何不同？
D3 过渡基于插值，对任何 SVG/属性做平滑过渡，特别适合**数据驱动**的图形变化（数据变了元素平滑过渡到新位置）。CSS 动画针对固定关键帧，不适合动态数据更新。

### Q6：forceSimulation 是什么？常用哪些力？
力导向图布局算法，用「力」把节点自动排到稳定形态。`forceLink`（连线拉力）、`forceManyBody`（节点互斥）、`forceCenter`（居中）、`forceCollide`（防重叠）。每帧 tick 更新坐标，`on('tick')` 里重绘。

### Q7：D3 和 Vue/React 怎么集成才不冲突？
框架只提供容器 ref，D3 完全接管容器内部的 DOM 渲染（不混用框架的 v-for 渲染图形）。`onMounted` 初始化，`watch` 数据变化重渲染，`onUnmounted` 停止 simulation。框架管状态，D3 管 SVG。

### Q8：D3 性能瓶颈在哪？怎么优化？
瓶颈在 SVG DOM 数量（每个图形一个 DOM 节点，上千节点就卡）。优化：① 数据量大改用 Canvas 手动绘制（D3 只算布局）；② 用 `requestAnimationFrame` 批量更新；③ 小数据直接 `remove()` 重绘。

---

> **本章小结**：D3 的核心范式是「**数据 join DOM**」——用 Enter-Update-Exit 让 DOM 永远跟着数据走，比例尺把数据变成像素，transition 让变化平滑，forceSimulation/hierarchy 提供复杂布局算法。它比 ECharts 自由得多，代价是要自己写渲染逻辑。与 Vue3 集成的关键是「框架管容器、D3 管内部」。下一章 **5.6 数据可视化设计原则** 将从工程技巧转向设计审美——图表选型、配色、信息密度。

---

## 实战案例索引

> 以下案例均为单文件 HTML，直接浏览器打开即可运行（D3 通过 CDN 加载）。

| 案例文件 | 覆盖知识点 | 核心交互 |
|---------|-----------|---------|
| [实战案例-综合性D3.js仪表盘.html](./实战案例-综合性D3.js仪表盘.html) | Selections、Enter-Update-Exit、Scale、Axis、Transition、Force | 切换数据集、随机打乱、拖拽节点 |
| [实战案例-层级图专题(树图+旭日图+Treemap).html](./实战案例-层级图专题(树图+旭日图+Treemap).html) | d3.hierarchy、d3.tree、d3.partition、d3.treemap、折叠交互 | Tab 切换三种图、点击折叠/展开、钻取 |
| [实战案例-高级交互(Zoom缩放+Brush刷选+拖拽排序).html](./实战案例-高级交互(Zoom缩放+Brush刷选+拖拽排序).html) | d3.zoom、d3.brushX、d3.drag、Focus+Context | 滚轮缩放、刷选联动、拖拽排序、时间轴联动 |
| [实战案例-D3与Vue3集成组件.vue](./实战案例-D3与Vue3集成组件.vue) | Vue3 + D3 集成范式、onMounted/watch/onBeforeUnmount | 下拉切换数据、随机刷新、力导向图拖拽 |

### 学习路径建议

1. **先看 [综合仪表盘](./实战案例-综合性D3.js仪表盘.html)**（案例一~四）—— 掌握核心范式（Selections、Enter-Update-Exit、Scale、Axis、Transition、Force）
2. **再看 [层级图专题](./实战案例-层级图专题(树图+旭日图+Treemap).html)**（案例五）—— 掌握层级数据可视化（树图、旭日图、Treemap）
3. **然后看 [高级交互](./实战案例-高级交互(Zoom缩放+Brush刷选+拖拽排序).html)**（案例六）—— 掌握交互增强（Zoom、Brush、Drag）
4. **最后看 [Vue3 集成](./实战案例-D3与Vue3集成组件.vue)**（案例七）—— 掌握生产级集成模式（框架管容器、D3 管内部）
