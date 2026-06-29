# 3.3 代码分割策略

> 前端性能优化 · 路由/组件级分割 · SplitChunks · Tree Shaking · Bundle 分析

---

## 目录

1. [代码分割核心概念](#1-代码分割核心概念)
2. [路由级代码分割](#2-路由级代码分割)
3. [组件级代码分割](#3-组件级代码分割)
4. [SplitChunks 策略](#4-splitchunks-策略)
5. [Tree Shaking 深度](#5-tree-shaking-深度)
6. [Bundle 分析工具](#6-bundle-分析工具)
7. [综合实践：caidiaweb 代码分割优化](#7-综合实践caidiaweb-代码分割优化)
8. [面试高频考点](#8-面试高频考点)

---

## 1. 代码分割核心概念

### 1.1 为什么需要代码分割

```
问题：不做分割的 SPA 应用

┌─────────────────────────────────────┐
│         app.bundle.js (3.2MB)       │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  vue + vue-router + pinia  │    │
│  │  element-plus (全量)        │    │
│  │  echarts (全量)             │    │
│  │  dayjs + lodash + axios    │    │
│  │  所有路由组件...             │    │
│  │  所有弹窗组件...             │    │
│  └─────────────────────────────┘    │
│                                     │
│  用户只访问了首页 = 下载了全部代码      │
│  首屏加载 8s+，TTI 10s+              │
└─────────────────────────────────────┘

目标：分割后的产物

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ vue.js   │ │ element  │ │ echarts  │ │ utils    │
│ 120KB    │ │ 400KB    │ │ 800KB    │ │ 30KB     │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐
│ 首页     │ │ 频谱页    │ │ 统计页    │  ← 按路由分割
│ 80KB     │ │ 60KB     │ │ 50KB     │
└──────────┘ └──────────┘ └──────────┘

首屏只需加载：vue + element + 首页 ≈ 600KB
其余页面点击时才加载
```

### 1.2 分割的三个层次

```
┌──────────────────────────────────────────────────┐
│              代码分割三层架构                       │
│                                                  │
│  Layer 1: 路由级分割（最粗粒度）                    │
│  ├── 按路由拆分 → 每个页面独立 chunk               │
│  └── 适用：SPA 多页面应用                          │
│                                                  │
│  Layer 2: 组件级分割（中粒度）                     │
│  ├── 大型组件按需加载 → 图表/编辑器/地图            │
│  └── 适用：包含重型组件的页面                      │
│                                                  │
│  Layer 3: 库级分割（精细化）                       │
│  ├── 第三方库独立打包 → vue / echarts / lodash     │
│  └── 适用：所有项目                                │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 1.3 动态 import() 基础

```javascript
// 动态 import() 是代码分割的基础语法

// 静态导入（打包在一起）
import { heavy } from './heavy-module.js';

// 动态导入（独立 chunk，运行时按需加载）
import('./heavy-module.js').then(mod => {
  mod.heavy();
});

// 现代用法：async/await
const { heavy } = await import('./heavy-module.js');
heavy();

// 魔法注释（Webpack）—— 自定义 chunk 名称
import(/* webpackChunkName: "heavy-module" */ './heavy-module.js');

// 预加载提示（Webpack）
import(/* webpackChunkName: "charts" */ /* webpackPrefetch: true */ './charts.vue');
// webpackPreload：当前页面就需要
// webpackPrefetch：未来可能需要（空闲时下载）
```

---

## 2. 路由级代码分割

### 2.1 Vue Router 基础分割

```javascript
// router/index.js — Vue Router 路由级分割

import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ❌ 错误：静态导入 → 所有页面组件打包进入口 chunk
    // import HomePage from '@/views/HomePage.vue';

    // ✅ 正确：动态 import → 每个页面独立 chunk
    {
      path: '/',
      name: 'Home',
      component: () => import(/* webpackChunkName: "page-home" */ '@/views/HomePage.vue'),
      meta: { title: '首页' },
    },
    {
      path: '/tech-facility',
      name: 'TechFacility',
      component: () => import(/* webpackChunkName: "page-tech-facility" */ '@/views/TechFacility.vue'),
      meta: { title: '技术设施', priority: 'high' },
    },
    {
      path: '/spectrum',
      name: 'Spectrum',
      component: () => import(/* webpackChunkName: "page-spectrum" */ '@/views/Spectrum.vue'),
      meta: { title: '频谱资源' },
    },
    {
      path: '/statistics',
      name: 'Statistics',
      component: () => import(/* webpackChunkName: "page-statistics" */ '@/views/Statistics.vue'),
      meta: { title: '统计分析' },
    },

    // 嵌套路由：父路由和子路由各自独立分割
    {
      path: '/settings',
      component: () => import(/* webpackChunkName: "layout-settings" */ '@/views/SettingsLayout.vue'),
      children: [
        {
          path: '',
          redirect: { name: 'Profile' },
        },
        {
          path: 'profile',
          name: 'Profile',
          component: () => import(/* webpackChunkName: "page-profile" */ '@/views/settings/Profile.vue'),
        },
        {
          path: 'security',
          name: 'Security',
          component: () => import(/* webpackChunkName: "page-security" */ '@/views/settings/Security.vue'),
        },
      ],
    },
  ],
});

export default router;
```

### 2.2 路由预加载策略

```javascript
// router/prefetch.js — 智能路由预加载

import router from './index';

// 策略1：悬停时预加载（最常用）
export function setupLinkPrefetch() {
  document.addEventListener('mouseover', (e) => {
    const link = e.target.closest('a[href^="/"]');
    if (!link) return;

    const path = link.getAttribute('href');
    const route = router.resolve(path);
    if (!route.matched.length) return;

    const component = route.matched[0].components.default;

    // 触发动态 import 预加载
    if (typeof component === 'function') {
      component().catch(() => {});
    }
  }, { capture: true, passive: true });
}

// 策略2：视口内链接预加载
export function setupViewportPrefetch() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const link = entry.target;
      const path = link.getAttribute('href');
      const route = router.resolve(path);
      if (!route.matched.length) return;

      const component = route.matched[0].components.default;
      if (typeof component === 'function') {
        component().catch(() => {});
      }

      observer.unobserve(link);
    });
  }, { rootMargin: '200px' });

  // 观察侧边栏菜单链接（用户大概率会点击它们）
  document.querySelectorAll('nav a[href^="/"]').forEach(link => {
    observer.observe(link);
  });
}

// 策略3：高频页面在首页加载完成后立即预加载
export function preloadHighPriorityRoutes() {
  const highPriorityRoutes = ['TechFacility', 'Spectrum'];

  // 首页加载完成后 3 秒（此时用户在看首页内容）开始预加载
  window.addEventListener('load', () => {
    setTimeout(() => {
      highPriorityRoutes.forEach(name => {
        const route = router.resolve({ name });
        const component = route?.matched[0]?.components?.default;
        if (typeof component === 'function') {
          component().catch(() => {});
        }
      });
    }, 3000);
  });
}
```

```javascript
// main.js — 在应用入口注册预加载
import { setupLinkPrefetch, setupViewportPrefetch, preloadHighPriorityRoutes } from './router/prefetch';

const app = createApp(App);
app.use(router);

// 注册所有预加载策略
setupLinkPrefetch();
setupViewportPrefetch();
preloadHighPriorityRoutes();

app.mount('#app');
```

---

## 3. 组件级代码分割

### 3.1 重型组件按需加载

```vue
<!-- views/TechFacility.vue — 包含多个重型组件的页面 -->
<template>
  <div class="tech-facility-page">
    <!-- 始终显示的轻量组件：打包进路由 chunk -->
    <PageHeader title="技术设施" />
    <StatCards :data="statsData" />

    <!-- 首屏可见的地图组件：async load -->
    <Suspense>
      <template #default>
        <TechMap :data="mapData" />
      </template>
      <template #fallback>
        <SkeletonMap />
      </template>
    </Suspense>

    <!-- 非首屏图表组件：IntersectionObserver 懒加载 -->
    <div ref="chartSection" v-if="showCharts">
      <Suspense>
        <template #default>
          <ChartsPanel :data="chartData" />
        </template>
        <template #fallback>
          <SkeletonChart />
        </template>
      </Suspense>
    </div>
  </div>
</template>

<script setup>
import { ref, defineAsyncComponent, onMounted } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import StatCards from '@/components/StatCards.vue';
import SkeletonMap from '@/components/SkeletonMap.vue';
import SkeletonChart from '@/components/SkeletonChart.vue';

// 大型地图组件：defineAsyncComponent 分割
const TechMap = defineAsyncComponent({
  loader: () => import(/* webpackChunkName: "comp-tech-map" */ '@/components/TechMap.vue'),
  loadingComponent: SkeletonMap,
  delay: 200,
  timeout: 15000,
});

// 大型图表组件：仅在需要时分割
const ChartsPanel = defineAsyncComponent(() =>
  import(/* webpackChunkName: "comp-charts-panel" */ '@/components/ChartsPanel.vue')
);

// 非首屏组件仅当用户滚动到区域时才加载
const chartSection = ref(null);
const showCharts = ref(false);

onMounted(() => {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      showCharts.value = true;
      observer.disconnect();
    }
  }, { rootMargin: '300px' });

  if (chartSection.value) {
    observer.observe(chartSection.value);
  }
});
</script>
```

### 3.2 ECharts 按需引入

```javascript
// utils/echarts-loader.js — ECharts 按需加载（不引入全量 800KB+）

/*
 * 问题：import * as echarts from 'echarts' 引入全量 800KB+
 * 解决：按需引入，只打包实际使用的图表类型
 */

// ✅ 方案1：按需引入（推荐）
// 单独安装：npm install echarts
import * as echarts from 'echarts/core';
import { MapChart, BarChart, GaugeChart, LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  VisualMapComponent,
  GeoComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 注册实际使用的图表和组件
echarts.use([
  MapChart,
  BarChart,
  GaugeChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  VisualMapComponent,
  GeoComponent,
  CanvasRenderer,
]);

export default echarts;

// 对比：
// 全量引入：~800KB (gzip: ~250KB)
// 按需引入：~350KB (gzip: ~110KB)
// 节省 56%
```

```javascript
// ✅ 方案2：动态加载 ECharts（适合非核心页面）
// components/ChartLoader.vue
<script setup>
// ECharts 作为可选依赖，只在有需要的页面动态加载
async function loadChart(container, options) {
  const [echarts, mapJson] = await Promise.all([
    import('echarts/core').then(mod => {
      // 并行加载所需组件
      return Promise.all([
        import('echarts/charts').then(m => m.MapChart),
        import('echarts/components').then(m => m.GeoComponent),
        import('echarts/renderers').then(m => m.CanvasRenderer),
      ]).then(([MapChart, Geo, Renderer]) => {
        // 注册
        mod.use([MapChart, Geo, Renderer]);
        return mod;
      });
    }),
    fetch('/api/map/china-geo').then(r => r.json()),
  ]);

  // 注册地图数据
  echarts.registerMap('china', mapJson);

  const chart = echarts.init(container);
  chart.setOption(options);
  return chart;
}
</script>
```

### 3.3 弹窗/抽屉组件懒加载

```vue
<!-- views/HomePage.vue — 弹窗级懒加载 -->
<template>
  <div>
    <!-- 列表数据 -->
    <StationList @view-detail="openDetail" />

    <!-- 详情弹窗：点击按钮时才加载弹窗组件 -->
    <DetailDialog
      v-if="detailVisible"
      :data="detailData"
      @close="detailVisible = false"
    />
  </div>
</template>

<script setup>
import { ref, defineAsyncComponent } from 'vue';

// ❌ 错误：静态导入 → 弹窗组件打包进首页
// import DetailDialog from '@/components/DetailDialog.vue';

// ✅ 正确：点击时才加载弹窗组件
const DetailDialog = defineAsyncComponent(() =>
  import(/* webpackChunkName: "dialog-detail" */ '@/components/DetailDialog.vue')
);

const detailVisible = ref(false);
const detailData = ref(null);

async function openDetail(station) {
  detailData.value = station;
  detailVisible.value = true;
  // defineAsyncComponent 会自动触发 import()
}
</script>
```

---

## 4. SplitChunks 策略

### 4.1 Webpack SplitChunks 配置

```javascript
// webpack.config.js — 精细化 SplitChunks 策略

module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',           // 对所有 chunk 生效（async + initial）
      minSize: 20000,          // 最小 20KB 才分割（太小不值得）
      maxSize: 244000,         // 最大 244KB（超过会尝试二次分割）
      minChunks: 1,            // 最少被引用 1 次
      maxAsyncRequests: 30,    // 最大并行异步请求数
      maxInitialRequests: 30,  // 最大并行初始请求数

      cacheGroups: {
        // ===== 组1：Vue 全家桶 =====
        vue: {
          test: /[\\/]node_modules[\\/](vue|vue-router|pinia|@vue)[\\/]/,
          name: 'chunk-vue',
          priority: 40,
          reuseExistingChunk: true,
        },

        // ===== 组2：UI 组件库（体积大，单独打包） =====
        'element-plus': {
          test: /[\\/]node_modules[\\/]element-plus[\\/]/,
          name: 'chunk-element-plus',
          priority: 35,
          reuseExistingChunk: true,
        },

        // ===== 组3：图表库（仅地图/统计页需要） =====
        echarts: {
          test: /[\\/]node_modules[\\/](echarts|zrender)[\\/]/,
          name: 'chunk-echarts',
          priority: 30,
          reuseExistingChunk: true,
        },

        // ===== 组4：工具库 =====
        utils: {
          test: /[\\/]node_modules[\\/](lodash|dayjs|axios|qs)[\\/]/,
          name: 'chunk-utils',
          priority: 25,
          minChunks: 2,  // 至少被 2 个 chunk 引用
          reuseExistingChunk: true,
        },

        // ===== 组5：公共组件（项目中多处复用的组件） =====
        'common-components': {
          test: /[\\/]src[\\/]components[\\/](shared|common)[\\/]/,
          name: 'chunk-common-components',
          priority: 20,
          minChunks: 2,
          reuseExistingChunk: true,
        },

        // ===== 默认兜底：其余 node_modules =====
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'chunk-vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
      },
    },

    // 运行时代码单独提取（防止 hash 频繁变化）
    runtimeChunk: 'single',
  },
};
```

### 4.2 Vite (Rollup) 分割配置

```javascript
// vite.config.js — Vite/Rollup 的 manualChunks 策略

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    vue(),
    visualizer({ open: true, gzipSize: true, brotliSize: true }),
  ],

  build: {
    rollupOptions: {
      output: {
        // manualChunks 函数形式（最灵活）
        manualChunks(id) {
          // Vue 生态
          if (id.includes('node_modules/vue') ||
              id.includes('node_modules/@vue') ||
              id.includes('node_modules/vue-router') ||
              id.includes('node_modules/pinia')) {
            return 'vue';
          }

          // Element Plus
          if (id.includes('node_modules/element-plus')) {
            return 'element-plus';
          }

          // ECharts（体积大，独立打包）
          if (id.includes('node_modules/echarts') ||
              id.includes('node_modules/zrender')) {
            return 'echarts';
          }

          // 工具库
          if (id.includes('node_modules/lodash') ||
              id.includes('node_modules/dayjs') ||
              id.includes('node_modules/axios')) {
            return 'utils';
          }

          // 其余 node_modules
          if (id.includes('node_modules')) {
            return 'vendors';
          }
        },

        // chunk 文件命名（含 hash 用于缓存）
        chunkFileNames: 'assets/js/[name]-[hash:8].js',
        entryFileNames: 'assets/js/[name]-[hash:8].js',
        assetFileNames: 'assets/[ext]/[name]-[hash:8].[ext]',
      },
    },

    // 单个 chunk 大小警告阈值
    chunkSizeWarningLimit: 500, // 500KB（ECharts 可能超过）
  },
});
```

### 4.3 常见 SplitChunks 反模式

```
❌ 反模式1：分割过细
chunk-a.js (3KB) + chunk-b.js (4KB) + chunk-c.js (5KB)
→ 12 个小文件，HTTP/1.1 队头阻塞严重
→ 解决：提高 minSize 到 20KB，合并小 chunk

❌ 反模式2：所有 node_modules 打在一起
chunk-vendors.js (2.5MB)
→ 哪个页面都加载这个大文件
→ 解决：按库类型分组（UI 库、图表库、工具库）

❌ 反模式3：公共模块未提取
页面A和页面B都引入了 utils.js（未分割）
→ utils.js 代码在两个 chunk 中重复
→ 解决：设置 minChunks: 2，公共部分自动提取

❌ 反模式4：动态 import 滥用
每个小组件都用动态 import
→ 网络请求数暴增，加载瀑布变长
→ 解决：组件分割只用于 >30KB 的组件
```

---

## 5. Tree Shaking 深度

### 5.1 Tree Shaking 原理

```
Tree Shaking 工作流程：

源代码                    依赖图                    产物
┌──────────┐           ┌──────────┐           ┌──────────┐
│ export a │──────────►│    a     │──────────►│    a     │
│ export b │           │   (使用)  │           │  (保留)   │
│ export c │           └──────────┘           └──────────┘
└──────────┘           ┌──────────┐           
                       │    b     │           ┌──────────┐
                       │   (未使用)│──────────►│   b      │
                       └──────────┘           │  (删除)   │
                       ┌──────────┐           └──────────┘
                       │    c     │           
                       │   (使用)  │──────────►    c (保留)
                       └──────────┘           

关键条件：
1. 使用 ES Module（import/export）—— 静态分析
2. 标记未使用代码为 dead code（sideEffects 声明）
3. 压缩阶段（Terser/esbuild）移除死代码
```

### 5.2 sideEffects 配置

```json
// package.json — 声明 sideEffects

{
  "name": "caidiaweb",
  // ✅ 声明所有文件都是无副作用的（最激进，适合纯逻辑库）
  "sideEffects": false,

  // ✅ 指定有副作用的文件（精确声明，推荐）
  "sideEffects": [
    "*.css",                          // CSS 文件有副作用（样式注入）
    "*.scss",
    "./src/styles/**",                // 样式目录
    "./src/utils/polyfills.js",       // polyfill 有副作用
    "./src/register-service-worker.js" // SW 注册有副作用
  ]
}
```

### 5.3 确保 Tree Shaking 有效的代码写法

```javascript
// utils/formatters.js


// ✅ 好的写法：命名导出（易被 Tree Shake）
export function formatDate(date, format) { /* ... */ }
export function formatNumber(num, precision) { /* ... */ }
export function formatCurrency(amount) { /* ... */ }

// 使用方只引入需要的
import { formatDate } from '@/utils/formatters';
// 打包结果只包含 formatDate，不含 formatNumber 和 formatCurrency


// ❌ 坏的写法：默认导出一个对象（不容易 Tree Shake）
export default {
  formatDate: (date, format) => { /* ... */ },
  formatNumber: (num, precision) => { /* ... */ },
  formatCurrency: (amount) => { /* ... */ },
};

// 使用方
import formatters from '@/utils/formatters';
formatters.formatDate(date);
// 打包结果包含整个 formatters 对象，所有方法都进来了


// ❌ 坏的写法：副作用导入
import 'lodash'; // 全量引入 500KB+

// ✅ 好的写法：按需引入
import debounce from 'lodash/debounce'; // 只引入 debounce
import { debounce } from 'lodash-es';   // lodash-es 原生 ESM
```

### 5.4 Tree Shaking 效果验证

```javascript
// 验证某个库是否被 Tree Shook

// 方法1：Bundle Analyzer 查看最终产物
// 方法2：查看打包后文件，搜索预期被删除的函数名
// 方法3：使用 webpack 的 usedExports 配置

// webpack.config.js
{
  optimization: {
    usedExports: true,  // 标记未使用导出
    minimize: true,     // 压缩时移除标记的死代码
  }
}

// 方法4：快速命令行验证（Vite/Rollup）
// npx rollup -p "import { formatDate } from './utils/formatters'" -f es
// 输出中不应包含 formatNumber 和 formatCurrency
```

---

## 6. Bundle 分析工具

### 6.1 rollup-plugin-visualizer（推荐）

```bash
npm install -D rollup-plugin-visualizer
```

```javascript
// vite.config.js
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    vue(),
    visualizer({
      filename: 'stats.html',   // 输出文件名
      open: true,                // 构建完成后自动打开浏览器
      gzipSize: true,            // 显示 gzip 压缩后大小
      brotliSize: true,          // 显示 brotli 压缩后大小
      template: 'treemap',       // 可视化方式：treemap/sunburst/network
    }),
  ],
};
```

### 6.2 webpack-bundle-analyzer

```bash
npm install -D webpack-bundle-analyzer
```

```javascript
// vue.config.js 或 webpack.config.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',      // 生成 HTML 报告
      reportFilename: 'bundle-report.html',
      openAnalyzer: true,
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json',
    }),
  ],
};
```

### 6.3 分析报告解读指南

```
Treemap 视图分析步骤：

1. 找到最大的矩形 → 它占据的包体积最大
   - 如果是 node_modules → 看能否换成更轻量的替代品
   - 如果是自己的代码 → 看是否有重复逻辑

2. 找重复的库
   - 例如两个 chunk 都包含 lodash → 用 SplitChunks 提取到公共 chunk

3. 找意外引入的库
   - 例如没有用到 moment.js 但被打包了
   → 使用 npm ls moment 追踪依赖来源，用别名替换

4. 看 chunk 数量
   - 太少（<5）→ 需要更多分割
   - 太多（>30）→ 分割过细，合并小 chunk

5. 关注体积 > 100KB 的单个文件
   - 这是优化的首要目标
```

---

## 7. 综合实践：caidiaweb 代码分割优化

### 7.1 现状分析

```
caidiaweb 依赖清单：
├── vue@3.x          ~120KB (gzip: ~40KB)
├── vue-router@4.x    ~25KB
├── pinia@2.x         ~15KB
├── element-plus      ~400KB (gzip: ~130KB)  ← 需按需引入
├── echarts@5.x       ~800KB (gzip: ~250KB)  ← 需按需引入
├── dayjs              ~7KB
├── lodash-es         ~70KB (gzip: ~25KB)    ← 需 Tree Shaking
├── axios             ~14KB
├── 业务代码           ~150KB
│
└── 预估总体积：~1.6MB (gzip: ~500KB)
```

### 7.2 优化配置（完整版）

```javascript
// vite.config.js — caidiaweb 完整优化配置

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    vue(),

    // Element Plus 按需自动导入（不再全量引入 400KB）
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),

    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],

  build: {
    target: 'es2015',
    cssCodeSplit: true,     // CSS 也按 chunk 分割
    sourcemap: false,       // 生产环境关闭 sourcemap

    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vue 生态
          if (id.includes('node_modules/vue') ||
              id.includes('node_modules/@vue') ||
              id.includes('node_modules/vue-router') ||
              id.includes('node_modules/pinia')) {
            return 'vue-ecosystem';
          }

          // Element Plus（已按需引入，剩余体积 <50KB）
          if (id.includes('node_modules/element-plus')) {
            return 'element-plus';
          }

          // ECharts + 地图数据（只有技术设施/频谱页面需要）
          if (id.includes('node_modules/echarts') ||
              id.includes('node_modules/zrender')) {
            return 'echarts';
          }

          // 通用工具库
          if (id.includes('node_modules/lodash-es') ||
              id.includes('node_modules/dayjs') ||
              id.includes('node_modules/axios') ||
              id.includes('node_modules/qs')) {
            return 'utils';
          }

          // 其余 node_modules
          if (id.includes('node_modules')) {
            return 'vendors';
          }

          // 业务公共组件
          if (id.includes('src/components/common') ||
              id.includes('src/components/shared')) {
            return 'common-components';
          }
        },

        chunkFileNames: 'js/[name]-[hash:8].js',
        entryFileNames: 'js/[name]-[hash:8].js',
        assetFileNames: '[ext]/[name]-[hash:8].[ext]',
      },
    },

    chunkSizeWarningLimit: 500,
  },

  // 开发环境也启用依赖预构建
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'element-plus', 'echarts', 'lodash-es', 'dayjs'],
  },
});
```

### 7.3 优化效果验证清单

```
验证步骤：

1. 构建项目
   npm run build

2. 查看 stats.html 可视化分析
   打开 dist/stats.html

3. 检查关键指标：
   □ 入口 chunk 是否 < 200KB（gzip）
   □ ECharts 是否独立到单独 chunk
   □ 每个路由页面是否有独立 chunk
   □ 是否有冗余依赖（在 treemap 中搜索意外的大矩形）
   □ lodash 是否只包含实际使用的方法

4. 用 Chrome DevTools Network 面板验证：
   □ 首页加载的 JS 总大小
   □ 切换路由时加载的额外 JS 大小
   □ 是否有重复加载的 chunk

5. 对比优化前后数据：
   ┌──────────────┬──────────┬──────────┬───────┐
   │    指标       │  优化前   │  优化后   │  效果  │
   ├──────────────┼──────────┼──────────┼───────┤
   │ 包总大小(gzip)│  ____KB  │  ____KB  │  ___% │
   │ 入口 chunk     │  ____KB  │  ____KB  │  ___% │
   │ 首屏 JS 总大小  │  ____KB  │  ____KB  │  ___% │
   │ chunk 数量     │  ____    │  ____    │       │
   │ 最大单个 chunk  │  ____KB  │  ____KB  │  ___% │
   └──────────────┴──────────┴──────────┴───────┘
```

---

## 8. 面试高频考点

### Q1：Tree Shaking 的条件是什么？为什么 CommonJS 不行？

- **必须使用 ESM**（`import`/`export`），因为 ESM 是**静态结构**，编译时就能确定依赖关系
- CommonJS 的 `require()` 是运行时动态的，无法在编译时分析
- `package.json` 中的 `sideEffects` 声明也是必要条件

### Q2：SplitChunks 中 chunks: 'all' / 'async' / 'initial' 的区别？

| 值 | 含义 | 适用场景 |
|----|------|---------|
| `all` | 所有类型 chunk 都参与分割 | 通用（推荐） |
| `async` | 只分割异步 import() 的 chunk | 初始加载优化要求高 |
| `initial` | 只分割入口 chunk | 减少初始请求数 |

### Q3：为什么 ECharts 打包后这么大？如何优化？

- ECharts 全量引入约 800KB（gzip 250KB），因为包含所有图表类型和组件
- **解决**：按需引入（`import { BarChart } from 'echarts/charts'`），通常可减少 50-60% 体积

### Q4：动态 import 过多会有问题吗？

- **会**。每个 `import()` 对应一次 HTTP 请求，过多会导致"请求瀑布"
- **平衡策略**：
  - 路由级：所有页面都分割（合理）
  - 组件级：只分割 >30KB 的组件
  - 弹窗级：用户大概率会打开的弹窗不必分割
  - 配合预加载（prefetch/preload）弥补分割带来的延迟

### Q5：Vite 和 Webpack 在代码分割上的主要区别？

| 维度 | Webpack | Vite (Rollup) |
|------|---------|---------------|
| 配置方式 | `splitChunks.cacheGroups` | `output.manualChunks` |
| 默认行为 | 自动分割 async chunk | 不自动分割 |
| 魔法注释 | `/* webpackChunkName */` | 文件名即 chunk 名 |
| 预加载注释 | `webpackPrefetch` / `webpackPreload` | 需手动 `<link>` |
| 分析工具 | webpack-bundle-analyzer | rollup-plugin-visualizer |

---

> **动手建议**：在 caidiaweb 项目中先运行 `npm run build`，找到 `dist/stats.html`（如果还没安装 visualizer 就先装），在 treemap 中找到最大的矩形，看它是什么内容，然后按第 4 节的 SplitChunks 策略逐步拆分。
