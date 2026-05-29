# 阶段3 — 前端性能优化

> 预计时间：第 4-6 个月
> 目标水平：L3 精通
> 每日投入：工作日 1h + 周末 3h
> 前置依赖：完成阶段1 + 阶段2

---

## 学习目标

建立完整的前端性能优化体系，从指标监控到加载优化、运行时优化、内存优化，能在真实项目中落地并量化效果。

---

## 学习内容

### 3.1 Core Web Vitals 指标体系

| 指标 | 全称 | 含义 | 优秀 | 待改善 |
|------|------|------|------|--------|
| LCP | Largest Contentful Paint | 最大内容绘制 | ≤ 2.5s | > 4s |
| INP | Interaction to Next Paint | 交互响应延迟 | ≤ 200ms | > 500ms |
| CLS | Cumulative Layout Shift | 累积布局偏移 | ≤ 0.1 | > 0.25 |
| FCP | First Contentful Paint | 首次内容绘制 | ≤ 1.8s | > 3s |
| TTFB | Time to First Byte | 首字节时间 | ≤ 800ms | > 1800ms |

- 指标采集方式：web-vitals 库 / Lighthouse / Chrome UX Report
- 指标监控上报方案

### 3.2 资源加载优化

- **关键渲染路径优化**：减少关键资源数量和大小
- **懒加载策略**：
  - 图片懒加载（IntersectionObserver / loading="lazy"）
  - 组件懒加载（defineAsyncComponent）
  - 路由懒加载（动态 import）
- **预加载**：
  - `<link rel="preload">` — 预加载关键资源
  - `<link rel="prefetch">` — 预取下一页资源
  - `<link rel="preconnect">` — 预连接域名
- **资源优先级**：fetchpriority 属性

### 3.3 代码分割策略

- **Webpack/Vite 动态 import()**：按路由/功能拆分
- **路由级分割**：每个路由对应的组件独立打包
- **组件级分割**：大型组件（如编辑器、图表）按需加载
- **SplitChunks 策略**：第三方库独立打包、公共模块提取
- **Tree Shaking**：确保只打包使用的代码
- **代码分割效果度量**：Bundle Analyzer 分析

### 3.4 图片优化

- **现代格式**：WebP / AVIF vs JPEG/PNG 压缩率对比
- **响应式图片**：`<picture>` + `srcset`
- **图片 CDN 处理**：自动裁剪/格式转换/质量压缩
- **图标优化**：SVG Sprite / Icon Font
- **懒加载实现**：原生 loading="lazy" vs IntersectionObserver
- **Base64 内联**：仅适合极小图标

### 3.5 内存优化

- **内存泄漏常见场景**：
  - 未移除的事件监听
  - 闭包持有大对象引用
  - 未清理的定时器
  - DOM 引用未释放
- **排查方法**：Chrome DevTools Memory 面板 / Heap Snapshot 对比
- **大列表优化**：
  - 虚拟滚动（Virtual Scroll）原理与实现
  - 时间分片渲染
- **WeakRef / FinalizationRegistry**（了解）

### 3.6 首屏优化

- **骨架屏（Skeleton Screen）**：
  - 通用骨架屏组件设计
  - 按页面定制骨架屏
- **SSR / 预渲染**：
  - Nuxt.js / next.js 服务端渲染
  - prerender-spa-plugin 预渲染
- **关键 CSS 内联**：critters 插件
- **页面预加载策略**：quicklink / guess.js
- **首屏直出数据**：SSR inline state

### 3.7 运行时性能

- **长任务（Long Task）分片**：
  - requestIdleCallback
  - scheduler.yield()
  - 时间切片（Time Slicing）
- **Web Worker**：
  - 主线程 vs Worker 线程
  - 适合放入 Worker 的计算任务
  - Worker 通信（postMessage / Transferable）
- **requestAnimationFrame**：
  - 与 setTimeout 的区别
  - 流畅动画的 60fps 标准
- **CSS 动画 vs JS 动画**性能对比

### 3.8 前端监控体系

- **Performance API**：
  - performance.getEntriesByType('navigation')
  - performance.getEntriesByType('resource')
  - PerformanceObserver 监听
- **错误监控**：
  - window.onerror / window.addEventListener('error')
  - unhandledrejection 事件
  - 框架级错误边界（Vue errorHandler / React ErrorBoundary）
- **自定义上报方案**：
  - sendBeacon API（不影响页面卸载）
  - 1x1 GIF 像素上报
  - 批量上报 + 队列
- **监控面板**：数据可视化展示（可选 Grafana / 自建）

---

## 实战产出（必须完成）

| 编号 | 产出 | 验收标准 | 应用项目 |
|------|------|---------|---------|
| 1 | 性能监控接入 | web-vitals 采集 + 自定义上报 | caidiaweb |
| 2 | 骨架屏组件 | 通用可配置骨架屏，支持多种布局 | caidiaweb |
| 3 | 图片懒加载 | 实现带占位图的懒加载方案 | odvp-web |
| 4 | 大数据量优化 | 电磁态势图渲染优化（虚拟化/降采样） | odvp-web |
| 5 | 错误监控上报 | 全局错误捕获 + 上报 + 降级方案 | caidiaweb |
| 6 | 性能优化报告 | 优化前后的指标对比文档 | 全项目 |

---

## 推荐资源

### 在线
- web.dev/learn (Google Web 性能课程)
- web.dev/vitals (Core Web Vitals 详解)
- Lighthouse 官方文档

### 书籍
- 《高性能网站建设指南》
- 《高性能网站建设进阶》
- 《Web 性能权威指南》

### 工具
- Chrome DevTools — Performance / Memory / Network / Coverage
- Lighthouse / PageSpeed Insights
- Webpack Bundle Analyzer / rollup-plugin-visualizer

---

## 检验标准

- [ ] 能让项目 LCP < 2.5s、FCP < 1.8s
- [ ] 能让项目 CLS < 0.1（无布局抖动）
- [ ] 能实现虚拟滚动处理万级数据列表
- [ ] 能用 Memory 面板排查内存泄漏
- [ ] 能搭建完整的前端监控上报系统

---

> **下一阶段**：完成本阶段后，进入「阶段4-前端工程化体系」
