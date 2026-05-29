# 阶段5 — 前端可视化技术

> 预计时间：第 11-14 个月
> 目标水平：L3 精通
> 每日投入：工作日 1h + 周末 3h
> 前置依赖：完成阶段1-4

---

## 学习目标

掌握前端可视化核心技术（SVG / Canvas / WebGL / ECharts / D3），能独立完成行业级数据可视化项目和大屏展示。

---

## 学习内容

### 5.1 SVG 深入

- SVG 基础回顾：rect / circle / ellipse / line / polyline / polygon / path
- **Path 路径命令**：M / L / H / V / C / S / Q / T / A / Z
- SVG 动画：CSS animation / SMIL（了解） / GSAP（推荐）
- SVG 与 Canvas 对比：
  - SVG：DOM 操作、事件绑定、适合少量图形
  - Canvas：像素操作、高性能、适合大量图形
- SVG 优化：viewBox / preserveAspectRatio

### 5.2 Canvas 2D

- **上下文获取**：`canvas.getContext('2d')`
- **绘制 API**：fillRect / strokeRect / arc / lineTo / bezierCurveTo
- **状态管理**：save / restore / translate / rotate / scale
- **文字绘制**：fillText / measureText
- **图片处理**：drawImage / 像素操作（getImageData / putImageData）
- **性能优化**：
  - 离屏 Canvas（OffscreenCanvas）
  - 分层 Canvas
  - requestAnimationFrame 动画循环
  - 减少状态切换

### 5.3 WebGL 入门

- **WebGL 概念**：GPU 渲染、着色器、缓冲区
- **着色器基础**：
  - 顶点着色器（Vertex Shader）vs 片段着色器（Fragment Shader）
  - GLSL 语法基础
- **Three.js 快速入门**：
  - Scene / Camera / Renderer
  - Geometry / Material / Mesh
  - 光照（Ambient / Directional / Point / Spot）
  - 动画（requestAnimationFrame + OrbitControls）
- **Three.js 进阶**：
  - 粒子系统（Points / BufferGeometry）
  - 加载模型（GLTFLoader / OBJLoader）
  - 后期处理（EffectComposer）

### 5.4 ECharts 深度

- **图表类型**：折线图 / 柱状图 / 饼图 / 散点图 / 雷达图 / 热力图 / 地图
- **自定义系列（custom series）**：
  - renderItem 函数
  - 坐标系转换（convertToPixel / convertFromPixel）
  - 复杂图形绘制
- **大数据量优化**：
  - dataZoom 降采样
  - large: true 大数据模式
  - dataset 数据集
  - WebGL 渲染模式
- **主题定制**：
  - 注册自定义主题（registerTheme）
  - 按行业风格定制颜色和样式
- **地图扩展**：
  - GeoJSON 数据
  - 自定义地图（registerMap）
  - 地图交互（roam / tooltip）
- **ECharts 封装**：
  - Vue3 封装通用图表组件
  - 响应式自适应
  - 按需引入优化包体积

### 5.5 D3.js 基础

- **核心概念**：Selections / Enter-Update-Exit（DOM join）
- **比例尺（Scales）**：d3.scaleLinear / d3.scaleBand / d3.scaleTime
- **轴（Axes）**：d3.axisBottom / d3.axisLeft
- **过渡动画**：transition / duration / ease
- **力导向图**：d3.forceSimulation（关系图）
- **树图/旭日图**：d3.hierarchy
- D3 与 Vue3 集成

### 5.6 数据可视化设计原则

- **色彩理论**：
  - 色相 / 饱和度 / 明度
  - 分类色 vs 顺序色 vs 发散色
  - 色盲友好设计
- **信息密度**：数据墨水比（Data-Ink Ratio）
- **交互设计**：Tooltip / 高亮联动 / 缩放平移 / 下钻
- **图表选型决策树**：
  - 比较 → 柱状图 / 条形图
  - 趋势 → 折线图 / 面积图
  - 占比 → 饼图 / 环形图 / 堆叠柱状图
  - 分布 → 直方图 / 箱线图
  - 关系 → 散点图 / 气泡图 / 力导向图
  - 地理 → 地图 / 热力图
- **无障碍访问**：ARIA 标签、键盘导航、高对比度

### 5.7 大屏可视化

- **自适应方案**：
  - rem / vw-vh 方案
  - scale 缩放方案（推荐）
  - CSS Grid + Flexbox 布局
- **数据轮播**：自动滚动 / 手动切换 / 定时刷新
- **动效设计**：
  - 入场动画
  - 数字滚动（countUp）
  - 粒子背景
  - 边框装饰动画
- **性能考量**：
  - 图表懒加载
  - 轮播容器回收
  - WebGL/CSS 合成层管理

---

## 实战产出（必须完成）

| 编号 | 产出 | 验收标准 | 应用场景 |
|------|------|---------|---------|
| 1 | 电磁态势可视化大屏 | ECharts + Canvas + 3D 元素，含地图/图表/实时数据 | odvp-web |
| 2 | 频段分析热力图 | ECharts 自定义系列 + 大数据量优化 | bcs-web |
| 3 | 3D 数据展示 Demo | Three.js 场景 + 粒子系统 + 交互 | 练习 |
| 4 | 大屏自适应 mixin | 封装 scale 方案 composable，全团队可用 | 通用组件 |
| 5 | Vue3 通用图表组件 | 封装 ECharts 组件，支持主题切换和响应式 | 通用组件 |

---

## 推荐资源

### 官方文档
- ECharts 官方文档 + 示例库 (echarts.apache.org)
- Three.js 官方文档 (threejs.org)
- D3.js 官方文档 (d3js.org)

### 课程
- Three.js Journey (brunosimon.github.io/threejs-journey) — 最好的 Three.js 教程
- 极客时间《数据可视化实战》

### 设计参考
- AntV 数据可视化设计指南
- Data Viz Project (datavizproject.com) — 图表选型工具
- ECharts Gallery (echarts.apache.org/examples)

### 工具
- SVG Path Editor (svg-path-editor)
- 阿里云 DataV 数据可视化
- Make A Pie（调色板工具）

---

## 检验标准

- [ ] 能用 ECharts custom series 实现任意定制化图表
- [ ] 能优化 ECharts 渲染万级以上数据点
- [ ] 能用 Three.js 搭建包含模型和粒子系统的 3D 场景
- [ ] 能实现完整的大屏可视化（自适应 + 多图表 + 动效）
- [ ] 能根据数据特征选择最合适的图表类型

---

> **下一阶段**：完成本阶段后，进入「阶段6-前端架构设计」
