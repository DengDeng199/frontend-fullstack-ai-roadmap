# 5.4 ECharts 深度

> 阶段 5 — 前端可视化技术 / 第 4 章
> 核心目标：从「会调 option」升级到「精通 custom series + 大数据优化 + 主题定制 + 地图扩展 + 工程化封装」，能独立完成行业级可视化与大屏。

---

## 目录

1. [ECharts 核心机制回顾](#1-echarts-核心机制回顾)
2. [常用图表类型速查](#2-常用图表类型速查)
3. [自定义系列 custom series](#3-自定义系列-custom-series)
4. [大数据量优化](#4-大数据量优化)
5. [主题定制](#5-主题定制)
6. [地图扩展](#6-地图扩展)
7. [ECharts 工程化封装（Vue3）](#7-echarts-工程化封装vue3)
8. [caidiaweb 实践](#8-caidiaweb-实践)
9. [面试考点](#9-面试考点)

---

## 1. ECharts 核心机制回顾

### 1.1 渲染流程

```
option（配置对象）
   │  setOption()
   ▼
┌────────────────────────────────────┐
│ ECharts 实例                        │
│  ├─ 解析 option → 组件/系列模型      │
│  ├─ 布局计算（坐标系/网格）           │
│  ├─ ZRender 渲染（Canvas / SVG）     │
│  └─ 事件系统（click/hover/...）      │
└────────────────────────────────────┘
   │
   ▼
屏幕（Canvas 默认 / SVG 可选）
```

- **ZRender** 是 ECharts 的底层 2D 渲染引擎，屏蔽 Canvas/SVG 差异。
- `setOption` 是**声明式**的：你只描述「想要什么」，ECharts 负责 diff 和重绘。

### 1.2 Canvas vs SVG 渲染器

```js
// 初始化时选择渲染器
echarts.init(dom, null, { renderer: 'canvas' }); // 默认，海量数据快
echarts.init(dom, null, { renderer: 'svg' });    // 矢量清晰、DOM 少、适合打印/小数据量
```

| 渲染器 | 优势 | 适用 |
|--------|------|------|
| Canvas | 海量图形性能好 | 大数据量、热力图、散点 |
| SVG | 矢量无损、内存低、可 CSS | 少量图形、需缩放打印、移动端省内存 |

### 1.3 setOption 的合并机制

```js
chart.setOption(option);                    // 默认合并（merge）
chart.setOption(option, true);              // notMerge=true，完全替换
chart.setOption({ series:[{ data }] });     // 只更新 data，其他配置保留
```

> **性能陷阱**：频繁全量 `setOption` 会重建模型。实时更新只传变化的部分（如 `series[0].data`），让 ECharts 走增量。

---

## 2. 常用图表类型速查

| 图表 | type | 核心场景 | 关键配置 |
|------|------|---------|---------|
| 折线图 | `line` | 趋势 | `smooth`、`areaStyle`、`stack` |
| 柱状图 | `bar` | 比较 | `stack`、`barWidth`、`label` |
| 饼图 | `pie` | 占比 | `radius`、`roseType`、`itemStyle` |
| 散点图 | `scatter` | 分布/相关 | `symbolSize`、`large` |
| 雷达图 | `radar` | 多维对比 | `radar.indicator` |
| 热力图 | `heatmap` | 密度 | 需配 `visualMap` |
| 地图 | `map` / `geo` | 地理 | `registerMap` + `geo` |
| K 线 | `candlestick` | 金融 | 涨红跌绿（国内习惯） |

### 2.1 典型 option 骨架

```js
const option = {
  title: { text: '监测站信号趋势' },
  tooltip: { trigger: 'axis' },        // axis=十字准星, item=单点
  legend: { data: ['站A', '站B'] },
  grid: { left: 40, right: 20, top: 50, bottom: 30, containLabel: true },
  xAxis: { type: 'category', data: ['00:00','04:00','08:00','12:00'] },
  yAxis: { type: 'value', name: 'dBm' },
  series: [
    { name: '站A', type: 'line', smooth: true, data: [-80,-75,-82,-78] },
    { name: '站B', type: 'line', smooth: true, data: [-90,-88,-85,-91] },
  ],
};
```

### 2.2 K 线图国内涨跌色（重要约定）

```js
series: [{
  type: 'candlestick',
  itemStyle: {
    color: '#ef232a',       // 阳线（涨）→ 红
    color0: '#14b143',      // 阴线（跌）→ 绿
    borderColor: '#ef232a',
    borderColor0: '#14b143',
  },
}]
```

> **国内金融惯例**：涨红跌绿，与欧美相反。做金融类图表务必遵守。

---

## 3. 自定义系列 custom series

> `custom` 系列是 ECharts 最强大的能力——用 `renderItem` 函数**自己画任意图形**，突破内置图表限制（甘特图、基因图、自定义标记等）。

### 3.1 renderItem 基本结构

```js
series: [{
  type: 'custom',
  renderItem: (params, api) => {
    // params: 当前 dataIndex、坐标系信息等
    // api: 提供数据访问和坐标转换工具
    const categoryIndex = api.value(0);      // 取第 0 维数据值
    const start = api.coord([api.value(1), categoryIndex]); // 数据 → 像素坐标
    const end = api.coord([api.value(2), categoryIndex]);
    const height = api.size([0, 1])[1] * 0.6;

    return {
      type: 'rect',                          // 返回图形描述
      shape: {
        x: start[0], y: start[1] - height / 2,
        width: end[0] - start[0], height,
      },
      style: api.style(),                    // 继承 itemStyle
    };
  },
  data: [
    // [category, startValue, endValue]
    [0, 10, 40],
    [1, 20, 60],
  ],
}]
```

### 3.2 两个核心 API

| API | 作用 |
|-----|------|
| `api.value(dimIndex)` | 取当前数据项某维度的原始值 |
| `api.coord([x, y])` | **数据坐标 → 像素坐标**（画图必备） |
| `api.size([x, y])` | 数据单位在像素上的大小（算宽高） |
| `api.style()` | 返回内置样式（继承 itemStyle/emphasis） |

### 3.3 坐标系转换（组件级）

```js
// 在实例上做数据↔像素互转（用于交互、自定义覆盖层）
const pixel = chart.convertToPixel({ seriesIndex: 0 }, [dataX, dataY]);
const data  = chart.convertFromPixel({ seriesIndex: 0 }, [pixelX, pixelY]);
```

### 3.4 实战：甘特图（任务时间条）

```js
const tasks = [
  { name: '数据采集', start: 0, end: 3, category: 0 },
  { name: '清洗',     start: 3, end: 5, category: 1 },
  { name: '分析',     start: 5, end: 9, category: 2 },
];

const option = {
  tooltip: {},
  xAxis: { type: 'value', name: '小时' },
  yAxis: { type: 'category', data: tasks.map(t => t.name) },
  series: [{
    type: 'custom',
    renderItem(params, api) {
      const cat = api.value(0);
      const s = api.coord([api.value(1), cat]);
      const e = api.coord([api.value(2), cat]);
      const h = api.size([0, 1])[1] * 0.6;
      return {
        type: 'rect',
        shape: { x: s[0], y: s[1] - h / 2, width: e[0] - s[0], height: h },
        style: api.style(),
      };
    },
    data: tasks.map(t => [t.category, t.start, t.end]),
  }],
};
```

> **何时用 custom**：内置图表满足不了的定制形状（时间条、桑基变体、自定义标记、地图上叠加自定义图元）。能用内置就别用 custom，维护成本高。

---

## 4. 大数据量优化

> 监测大屏动辄上万数据点，不优化会卡死。四大手段按需组合。

### 4.1 large 大数据模式

```js
series: [{
  type: 'scatter',        // 或 bar
  large: true,            // 开启大数据优化
  largeThreshold: 2000,   // 超过 2000 点启用
  data: hugeData,
}]
```

- 开启后 ECharts 用**批量绘制 + 简化图元**，散点/柱状可流畅渲染几十万点。
- 代价：牺牲部分单点交互精细度。

### 4.2 dataZoom 数据缩放 + 降采样

```js
dataZoom: [
  { type: 'inside', start: 0, end: 20 },  // 内置滚轮缩放
  { type: 'slider' },                     // 底部滑块
],
series: [{
  type: 'line',
  sampling: 'lttb',   // 大数据降采样（LTTB 算法保留趋势形状）
  data: bigLineData,
}]
```

| sampling 值 | 说明 |
|------------|------|
| `lttb` | 最优，保留视觉趋势（推荐） |
| `average` / `max` / `min` / `sum` | 按聚合方式降采样 |

### 4.3 dataset 数据集

```js
option = {
  dataset: {
    source: [
      ['product', '2023', '2024'],
      ['A', 43, 85],
      ['B', 83, 73],
    ],
  },
  xAxis: { type: 'category' },
  yAxis: {},
  series: [{ type: 'bar' }, { type: 'bar' }], // 自动按列映射
};
```

- **一份数据多图复用**，避免重复处理；配合 `encode` 指定维度映射。
- 大数据下减少数据拷贝，利于性能与维护。

### 4.4 WebGL 渲染（echarts-gl）

```js
import 'echarts-gl'; // 引入后可用 scatterGL / linesGL / 3D 图表

series: [{
  type: 'scatterGL',   // GPU 渲染，百万级点
  data: millionPoints,
}]
```

> **选型顺序**：先 `large` + `sampling` + `dataZoom`（纯 Canvas 够用）；点数破百万或要 3D 才上 `echarts-gl`（WebGL）。

### 4.5 其他性能技巧

- 关闭不必要的动画：`animation: false`（大数据首屏）。
- 增量渲染：`series.progressive` / `progressiveThreshold`。
- 实时更新只改 data，不全量 setOption。
- `appendData()` 流式追加数据（如实时曲线）。

---

## 5. 主题定制

### 5.1 注册自定义主题

```js
// 1. 定义主题对象（或从主题构建工具导出）
const caidiaTheme = {
  color: ['#4f9dff', '#00d4c8', '#ffb454', '#ff5d5d', '#a78bfa'],
  backgroundColor: 'transparent',
  textStyle: { color: '#c9d3e0' },
  title: { textStyle: { color: '#e6eef8' } },
  legend: { textStyle: { color: '#9fb0c8' } },
  axisLine: { lineStyle: { color: '#2a3550' } },
};

// 2. 注册
echarts.registerTheme('caidia', caidiaTheme);

// 3. 使用
const chart = echarts.init(dom, 'caidia');
```

### 5.2 主题使用方式对比

| 方式 | 说明 | 适用 |
|------|------|------|
| `registerTheme` + 名字 | 全局统一风格 | 团队/大屏统一 |
| option 内联样式 | 单图微调 | 一次性定制 |
| 官方主题构建工具 | 可视化生成主题 JSON | 快速起风格 |

### 5.3 暗色大屏配色建议

```js
color: ['#4f9dff','#00d4c8','#ffb454','#ff5d5d','#a78bfa'], // 高饱和亮色（暗底才醒目）
backgroundColor: 'transparent', // 让容器背景（渐变/图片）透出
// 网格线用低对比深色，避免抢数据
splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
```

---

## 6. 地图扩展

### 6.1 注册地图（GeoJSON）

```js
import chinaGeo from '@/assets/china.json'; // GeoJSON 数据

echarts.registerMap('china', chinaGeo);

const option = {
  geo: {
    map: 'china',
    roam: true,              // 允许缩放平移
    label: { show: false },
    itemStyle: { areaColor: '#0e1e3a', borderColor: '#2a4a7a' },
    emphasis: { itemStyle: { areaColor: '#1a3a6a' } },
  },
};
```

### 6.2 地图 + 散点/热力叠加

```js
option = {
  geo: { map: 'china', roam: true },
  series: [
    {
      type: 'effectScatter',   // 带涟漪的散点（告警点常用）
      coordinateSystem: 'geo',
      data: [
        { name: '成都', value: [104.06, 30.67, 85] }, // [lng, lat, value]
      ],
      symbolSize: (v) => v[2] / 10,
      rippleEffect: { scale: 3 },
      itemStyle: { color: '#ff5d5d' },
    },
    {
      type: 'lines',           // 飞线（数据流向）
      coordinateSystem: 'geo',
      data: [{ coords: [[104.06,30.67],[116.40,39.90]] }],
      effect: { show: true, symbol: 'arrow', trailLength: 0.3 },
      lineStyle: { color: '#00d4c8', curveness: 0.2 },
    },
  ],
};
```

### 6.3 地图交互

| 交互 | 配置 |
|------|------|
| 缩放平移 | `geo.roam: true` |
| 悬浮提示 | `tooltip.formatter` |
| 区域高亮 | `emphasis.itemStyle` |
| 下钻（省→市） | 监听 `click` → `registerMap` 新区域 → `setOption` |

```js
// 地图下钻示例
chart.on('click', (params) => {
  if (params.name === '四川省') {
    echarts.registerMap('sichuan', sichuanGeo);
    chart.setOption({ geo: { map: 'sichuan' } });
  }
});
```

> **GeoJSON 来源**：阿里 DataV.GeoAtlas 提供全国省市县 GeoJSON（免费下载）。自定义厂区/园区地图也可自己画 GeoJSON。

---

## 7. ECharts 工程化封装（Vue3）

### 7.1 按需引入（减小包体积）

```js
// echarts/index.js —— 统一按需引入
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart, ScatterChart, MapChart } from 'echarts/charts';
import {
  TitleComponent, TooltipComponent, GridComponent,
  LegendComponent, DataZoomComponent, VisualMapComponent, GeoComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart, BarChart, PieChart, ScatterChart, MapChart,
  TitleComponent, TooltipComponent, GridComponent,
  LegendComponent, DataZoomComponent, VisualMapComponent, GeoComponent,
  CanvasRenderer,
]);

export default echarts;
```

> 全量 `import * as echarts from 'echarts'` 约 1MB+；按需引入可砍到 300~400KB。

### 7.2 通用图表组件

```vue
<!-- BaseChart.vue -->
<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import echarts from '@/echarts';

const props = defineProps({
  option: { type: Object, required: true },
  theme: { type: String, default: 'caidia' },
  autoResize: { type: Boolean, default: true },
});

const el = ref(null);
const chart = shallowRef(null); // shallowRef！避免 Vue 深度代理 ECharts 实例

function init() {
  chart.value = echarts.init(el.value, props.theme);
  chart.value.setOption(props.option);
}

function resize() { chart.value?.resize(); }

// option 变化时增量更新（notMerge=false）
watch(() => props.option, (opt) => {
  chart.value?.setOption(opt);
}, { deep: true });

let observer;
onMounted(() => {
  init();
  if (props.autoResize) {
    observer = new ResizeObserver(resize); // 容器尺寸变化自适应
    observer.observe(el.value);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  chart.value?.dispose(); // 必须 dispose，否则内存泄漏
});

defineExpose({ getChart: () => chart.value, resize });
</script>

<template>
  <div ref="el" class="base-chart"></div>
</template>

<style scoped>
.base-chart { width: 100%; height: 100%; min-height: 300px; }
</style>
```

### 7.3 三个封装要点

| 要点 | 原因 |
|------|------|
| 用 `shallowRef` 存实例 | ECharts 实例庞大，Vue 深度响应式代理会严重掉性能 |
| `ResizeObserver` 自适应 | 比 `window.resize` 更精准（容器变化也触发） |
| `onBeforeUnmount` 里 `dispose()` | 不释放会内存泄漏（Canvas + 事件监听残留） |

---

## 8. caidiaweb 实践

### 8.1 场景映射

| caidiaweb 需求 | ECharts 方案 |
|---------------|-------------|
| 信号强度实时趋势 | `line` + `appendData` 流式追加 + `dataZoom` |
| 频段占用热力图 | `heatmap` + `visualMap` + `large` |
| 监测站地理分布 | `geo` + `effectScatter`（涟漪告警点） |
| 设备状态占比 | `pie` / `roseType` 玫瑰图 |
| 万级采样点散点 | `scatter` + `large` + `sampling` |
| 甘特/任务时序 | `custom` series |

### 8.2 频段热力图（自定义系列 + 大数据）

```js
// 频段(x) × 时间(y) × 强度(value) 热力图
const option = {
  tooltip: { position: 'top' },
  grid: { height: '70%', top: '10%' },
  xAxis: { type: 'category', data: freqBands, splitArea: { show: true } },
  yAxis: { type: 'category', data: timeSlots, splitArea: { show: true } },
  visualMap: {
    min: -100, max: -40,
    calculable: true,
    orient: 'horizontal', left: 'center', bottom: '5%',
    inRange: { color: ['#0e1e3a', '#00d4c8', '#ffb454', '#ff5d5d'] },
  },
  series: [{
    type: 'heatmap',
    data: heatData,        // [[xIndex, yIndex, value], ...]
    large: true,           // 大数据优化
    emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
  }],
};
```

### 8.3 实时曲线（流式追加，不全量刷新）

```js
const chart = echarts.init(dom, 'caidia');
chart.setOption({
  xAxis: { type: 'time' },
  yAxis: { type: 'value', name: 'dBm' },
  series: [{ type: 'line', showSymbol: false, data: [] }],
});

// 每秒推入一个新点（增量，不重建）
setInterval(() => {
  const point = [Date.now(), -60 - Math.random() * 30];
  chart.appendData({ seriesIndex: 0, data: [point] });
}, 1000);
```

### 8.4 落地检查清单

- [ ] 按需引入 ECharts（包体积从 1MB → 400KB）
- [ ] 实例用 `shallowRef` 存，`onBeforeUnmount` 里 `dispose()`
- [ ] 实时数据用 `appendData` / 局部 `setOption`，不全量刷新
- [ ] 大数据开 `large` + `sampling: 'lttb'` + `dataZoom`
- [ ] 统一 `registerTheme('caidia')` 保证大屏风格一致
- [ ] 地图 GeoJSON 从 DataV.GeoAtlas 获取，按省市分包懒加载
- [ ] 容器自适应用 `ResizeObserver`

---

## 9. 面试考点

### Q1：ECharts 用 Canvas 还是 SVG？怎么选？
默认 Canvas（海量数据性能好）；SVG 矢量清晰、DOM 少、内存低，适合少量图形/需缩放打印/移动端。init 时 `{ renderer: 'svg' }` 切换。

### Q2：custom series 的 renderItem 怎么工作？
`renderItem(params, api)` 每个数据项调用一次，返回图形描述对象。核心用 `api.value(i)` 取数据、`api.coord([x,y])` 把数据坐标转像素、`api.size()` 算尺寸、`api.style()` 继承样式。用于内置图表无法实现的定制图形。

### Q3：ECharts 万级/百万级数据怎么优化？
组合手段：`large: true` 大数据模式、`sampling: 'lttb'` 降采样、`dataZoom` 只渲染可视区、`progressive` 增量渲染、关闭动画；百万级或 3D 上 `echarts-gl`（WebGL）。

### Q4：convertToPixel / convertFromPixel 干嘛的？
数据坐标与像素坐标互转。`convertToPixel` 把数据值转成屏幕像素（做自定义覆盖层、tooltip 定位），`convertFromPixel` 反向（根据鼠标像素反查数据值，做框选/交互）。

### Q5：Vue 里封装 ECharts 有哪些坑？
① 实例必须用 `shallowRef`（深度响应式代理会拖垮性能）；② `onBeforeUnmount` 必须 `dispose()`（否则内存泄漏）；③ 自适应用 `ResizeObserver` 而非只监听 `window.resize`；④ 实时更新用局部 setOption/appendData。

### Q6：setOption 的 merge 机制？
默认合并（新 option 与旧的 diff 后增量更新）。`setOption(opt, true)` 完全替换。实时场景只传变化的 series.data 走增量，避免全量重建模型导致卡顿。

### Q7：怎么减小 ECharts 包体积？
按需引入：从 `echarts/core` 引入 `echarts.use([...])` 只注册用到的图表和组件（LineChart/GridComponent/CanvasRenderer 等），可从 1MB+ 砍到 300~400KB。

### Q8：ECharts 地图怎么实现？如何下钻？
`echarts.registerMap('name', geoJson)` 注册地图，配 `geo` 组件显示，`series` 用 `coordinateSystem:'geo'` 叠加散点/飞线。下钻：监听 `click`，注册子级 GeoJSON，再 `setOption` 切换 map。

---

> **本章小结**：ECharts 深度 = 精通 5 件事——① 渲染器与 setOption 增量机制；② custom series 用 renderItem 画任意图形；③ 大数据靠 large/sampling/dataZoom/echarts-gl 组合拳；④ registerTheme 统一风格；⑤ registerMap + geo 做地理可视化；再加上 Vue3 工程化封装（shallowRef + dispose + ResizeObserver）。掌握这些就能扛下行业级大屏。下一章 **5.5 D3.js 基础** 将进入更底层、更自由的数据驱动可视化范式。
