# 4.1 Vite 构建原理

> 前端工程化 · ESM 预构建 · HMR 热更新 · Rollup 打包 · Vite vs Webpack

---

## 目录

1. [Vite 核心设计理念](#1-vite-核心设计理念)
2. [ESM 预构建（Pre-bundling）](#2-esm-预构建pre-bundling)
3. [HMR 热模块替换原理](#3-hmr-热模块替换原理)
4. [Rollup 生产构建](#4-rollup-生产构建)
5. [Vite 配置深入](#5-vite-配置深入)
6. [Vite vs Webpack 全面对比](#6-vite-vs-webpack-全面对比)
7. [面试高频考点](#7-面试高频考点)

---

## 1. Vite 核心设计理念

### 1.1 为什么需要 Vite

```
Webpack 开发体验痛点（大型项目）：

启动：
  npm run dev → 等待 30-60s → 启动完成
  ↓
  原因：需要打包整个应用的所有模块才能启动 dev server
  模块越多 → 越慢 → 改一行代码等 2-3 秒 HMR

Vite 的解法：

启动：
  npm run dev → 启动 dev server (几乎瞬间)
  ↓
  原因：利用浏览器原生 ESM，按需编译，不打包整个应用
  只编译当前被浏览器请求的模块
```

### 1.2 架构对比

```
Webpack 架构（Bundle-based Dev Server）：

  源代码 ──► Webpack ──► Bundle.js ──► 浏览器加载 Bundle
              (打包全部)   (整个应用)

Vite 架构（ESM-based Dev Server）：

  源代码 ──► 浏览器请求 /src/main.js
              │
              ├── 该文件变更 → esbuild 编译 → 返回 ESM 模块
              ├── 其他文件不变 → 不编译（按需！）
              │
              └── node_modules 依赖 → esbuild 预构建 → 返回单个 ESM 文件
```

### 1.3 Vite 两大核心阶段

```
┌──────────────────────────────────────────────────────────────┐
│              Vite 的两个阶段                                  │
├─────────────────────┬────────────────────────────────────────┤
│      开发阶段         │              构建阶段                  │
│      (Dev)           │             (Build)                  │
├─────────────────────┼────────────────────────────────────────┤
│ 引擎：esbuild        │ 引擎：Rollup                           │
│ 方式：按需编译 (no bundle)│ 方式：完整打包                       │
│ 速度：极快 (Go 语言)  │ 优势：生态成熟 + Tree Shaking + 代码分割│
│ 特点：浏览器原生 ESM   │ 特点：生产级优化输出                    │
└─────────────────────┴────────────────────────────────────────┘
```

---

## 2. ESM 预构建（Pre-bundling）

### 2.1 预构建解决什么问题

```
开发阶段遇到的两个问题：

问题 1：node_modules 依赖是 CommonJS 格式
  import Vue from 'vue';
  → vue 是 CJS 模块，浏览器无法直接运行 CJS
  → esbuild 将 CJS 转为 ESM，放到 node_modules/.vite 下

问题 2：依赖内部有大量子模块（如 lodash 有 600+ 个小文件）
  import { debounce } from 'lodash-es';
  → 浏览器发 600+ 个 HTTP 请求
  → esbuild 将分散的模块合并成单个 ESM 文件（减少请求数）
```

### 2.2 预构建流程

```
源依赖                              预构建后

node_modules/
├── vue/                  ──►    node_modules/.vite/deps/
│   ├── dist/                    ├── vue.js          (CJS → ESM，合并)
│   │   └── vue.cjs.js           ├── vue-router.js
│   ├── package.json             ├── pinia.js
│   └── ...                      ├── element-plus.js
│                                └── echarts.js
├── element-plus/
│   └── ...                   缓存文件，下次冷启动直接读缓存
│  
└── lodash-es/
    ├── debounce.js            如果依赖没变（lockfile 没变），
    ├── throttle.js            预构建结果直接复用
    ├── ...（共 600+ 文件）
```

### 2.3 预构建配置

```javascript
// vite.config.js

export default defineConfig({
  optimizeDeps: {
    // 强制预构建某些依赖（自动检测不到的）
    include: [
      'vue',
      'vue-router',
      'pinia',
      'element-plus',
      'echarts',
      'lodash-es',
      'dayjs',
    ],

    // 排除某些不需要预构建的依赖
    exclude: [
      // 例如：某些不兼容 esbuild 的包
      // 'some-problematic-package',
    ],

    // esbuild 配置
    esbuildOptions: {
      // 目标环境
      target: 'es2020',
      // 是否压缩（开发环境不建议）
      // minify: false,
    },

    // 是否允许依赖自动发现
    // discovery: { concurrency: 32 },
  },

  // 缓存目录（默认 node_modules/.vite）
  cacheDir: 'node_modules/.vite',
});
```

### 2.4 esbuild 为什么这么快

```
esbuild 快的原因：

1. Go 语言编写，编译为原生代码（非解释执行）
     vs Webpack/Babel 是 JavaScript → V8 解释执行

2. 并行处理（充分利用多核 CPU）
     Webpack 的 JS 部分是单线程（只有部分 loader 用 worker）

3. 对构建流程做了极致优化
     不生成 AST → 直接操作 Token
     内存高效使用（减少 GC 压力）

实际对比（1000 个模块的项目）：
  esbuild 预构建：~200ms
  Webpack 构建：  ~15s
  速度差 75 倍
```

---

## 3. HMR 热模块替换原理

### 3.1 HMR 通信流程图

```
┌─────────────┐                        ┌─────────────┐
│   浏览器      │                        │  Vite Dev    │
│  (Client)    │                        │  Server      │
└──────┬──────┘                        └──────┬──────┘
       │                                       │
       │  ① WebSocket 连接建立                    │
       │◄────────────────────────────────────►│
       │                                       │
       │                                       │ ② 文件变更检测
       │                                       │   (chokidar 监听)
       │                                       │
       │  ③ 推送更新消息                         │
       │◄──── type: 'update', path, timestamp ──│
       │                                       │
       │ ④ 浏览器请求变更的模块                   │
       │── GET /src/components/Header.vue ────►│
       │   (带 ?t=timestamp 绕缓存)              │
       │                                       │
       │ ⑤ 服务端编译模块（esbuild）              │
       │◄─ 返回编译后的 ESM 代码 ─────────────│
       │                                       │
       │ ⑥ 浏览器执行 HMR 边界替换               │
       │   import.meta.hot.accept()            │
       │   替换旧模块，保留组件状态               │
```

### 3.2 HMR 客户端代码

```javascript
// Vite 自动在 HTML 中注入的 HMR 客户端（简化版）

// 1. 建立 WebSocket 连接
const socket = new WebSocket(`ws://localhost:5173`);

// 2. 监听服务端推送
socket.addEventListener('message', ({ data }) => {
  const payload = JSON.parse(data);

  switch (payload.type) {
    case 'connected':
      console.log('[vite] connected');
      break;

    case 'update':
      // payload.updates: [{ type: 'js-update', path, acceptedPath, timestamp }]
      handleUpdate(payload.updates);
      break;

    case 'full-reload':
      // 某些文件变更无法 HMR → 整页刷新
      location.reload();
      break;
  }
});

// 3. 处理模块更新
async function handleUpdate(updates) {
  for (const update of updates) {
    if (update.type === 'js-update') {
      // 动态 import 获取新模块代码
      const newModule = await import(`${update.path}?t=${update.timestamp}`);
      // 调用旧模块的 accept 回调，将新模块传进去
      hotModulesMap.get(update.path)?.forEach(cb => cb(newModule));
    }
  }
}
```

### 3.3 Vue 组件 HMR 实现原理

```javascript
// Vite 处理 .vue 文件时的 HMR 注入（简化）

// 编译后的 Vue SFC 文件头部自动注入：
import { createHotContext as __vite__createHotContext } from "/@vite/client";
const __vite__hot = __vite__createHotContext("/src/components/Header.vue");

// 组件定义
const __sfc__ = {
  setup() { /* ... */ },
  // ...
};

// 热更新边界
import.meta.hot.accept((newModule) => {
  // newModule.default 是更新后的组件
  // Vue 的 HMR runtime 会用新组件替换旧组件
  // 并保留组件状态（data、ref 等）
  __VUE_HMR_RUNTIME__.reload(__sfc__, newModule.default);
});
```

### 3.4 哪些变更会触发 full-reload

```
HMR 失败 → 整页刷新的情况：

❌ 修改 vite.config.js（服务端重启 → 需要重连）
❌ 修改 index.html（无 HMR 边界）
❌ 修改依赖导入的新文件（模块图结构变化）
❌ 修改 CSS @import 的新文件（依赖链断裂）
❌ 模块自身没有 accept 回调（需显式声明 import.meta.hot.accept()）

✅ 成功 HMR 的情况：
✅ 修改 .vue 文件（Vite 自动注入 accept）
✅ 修改 .css 文件（Vite 自动注入 accept）
✅ 修改 .ts/.js 文件（如果有 accept 回调）
✅ 修改 store（如果有 accept 回调）
```

---

## 4. Rollup 生产构建

### 4.1 为什么生产用 Rollup 而不是 esbuild

```
┌──────────────────────────────────────────────────────────────┐
│              为什么生产用 Rollup                              │
├──────────────┬───────────────┬───────────────┬───────────────┤
│     能力       │    Rollup     │    esbuild    │    说明       │
├──────────────┼───────────────┼───────────────┼───────────────┤
│ Tree Shaking  │  ✅ 成熟      │  ⚠️ 基本支持   │ Rollup 更精细│
│ 代码分割      │  ✅ 灵活      │  ❌ 不支持      │ Rollup 必须  │
│ 插件生态      │  ✅ 大量       │  ⚠️ 有限       │ Rollup 胜出  │
│ 构建速度      │  中           │  极快          │ esbuild 胜出 │
│ CSS 处理      │  ✅           │  ❌            │ Rollup 必须  │
│ 产物优化      │  ✅ 完善      │  ⚠️            │ Rollup 更好  │
└──────────────┴───────────────┴───────────────┴───────────────┘

结论：
  Rollup 在代码分割 + Tree Shaking + 插件生态上更成熟
  esbuild 在速度上无敌，但缺乏关键的生产特性
  未来可能被 Rolldown（Rust 版 Rollup）取代
```

### 4.2 Tree Shaking 工作原理

```javascript
// Rollup 如何做 Tree Shaking

// 源文件：utils.js
export function formatDate(date) { /* ... */ }
export function formatNumber(num) { /* ... */ }
export function formatCurrency(amount) { /* ... */ }

// 入口文件：main.js
import { formatDate } from './utils.js'; // 只用了 formatDate
console.log(formatDate(new Date()));

// ===== Rollup 的 Tree Shaking 过程 =====

// Step 1: 静态分析（分析 import/export 关系）
// 构建模块依赖图：
//   main.js → 使用了 formatDate（标记为 used）
//   utils.js → formatDate(used), formatNumber(unused), formatCurrency(unused)

// Step 2: 死代码消除（Dead Code Elimination）
// 未使用的导出被标记为 dead code

// Step 3: 输出产物
// 最终 bundle 只包含 formatDate 的代码
// formatNumber 和 formatCurrency 完全不存在于产物中

// output:
function formatDate(date) { /* ... */ }

console.log(formatDate(new Date()));
```

### 4.3 构建配置

```javascript
// vite.config.js — 生产构建配置

export default defineConfig({
  build: {
    // 目标浏览器
    target: 'es2015',

    // 输出目录
    outDir: 'dist',

    // 资源目录
    assetsDir: 'assets',

    // chunk 大小警告阈值（KB）
    chunkSizeWarningLimit: 500,

    // 是否生成 sourcemap
    sourcemap: false,

    // 是否压缩（默认 true，使用 esbuild）
    minify: 'esbuild', // 'esbuild' | 'terser' | false

    // CSS 代码分割
    cssCodeSplit: true,

    // Rollup 配置
    rollupOptions: {
      // 入口
      input: {
        main: 'index.html',
      },

      // 输出
      output: {
        // 入口 chunk 命名
        entryFileNames: 'js/[name]-[hash:8].js',
        // 异步 chunk 命名
        chunkFileNames: 'js/[name]-[hash:8].js',
        // 资源文件命名
        assetFileNames: 'assets/[name]-[hash:8].[ext]',

        // 代码分割
        manualChunks(id) {
          // Vue 生态单独打包
          if (id.includes('node_modules/vue') || id.includes('node_modules/@vue')) {
            return 'vue';
          }
          // Element Plus 单独打包
          if (id.includes('node_modules/element-plus')) {
            return 'element-plus';
          }
          // ECharts 单独打包
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) {
            return 'echarts';
          }
        },
      },
    },

    // Terser 配置（当 minify: 'terser' 时）
    terserOptions: {
      compress: {
        drop_console: true,   // 移除 console
        drop_debugger: true,  // 移除 debugger
      },
    },
  },
});
```

---

## 5. Vite 配置深入

### 5.1 resolve.alias — 路径别名

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@store': path.resolve(__dirname, 'src/store'),
    },

    // 文件扩展名省略（按顺序尝试）
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.vue', '.json'],

    // 主入口字段（优先级从高到低）
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
});
```

```json
// tsconfig.json — 同步别名（TypeScript 需要）
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

```javascript
// 使用别名
import Header from '@/components/Header.vue';
import { formatDate } from '@utils/formatters';
```

### 5.2 plugins — 插件列表

```javascript
// vite.config.js
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

export default defineConfig({
  plugins: [
    // Vue SFC 编译
    vue({
      reactivityTransform: false,
      template: {
        compilerOptions: {
          // 忽略自定义元素（Web Components）
          isCustomElement: tag => tag.startsWith('my-'),
        },
      },
    }),

    // JSX/TSX 支持
    vueJsx(),

    // Element Plus 按需自动导入
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
  ],
});
```

### 5.3 server.proxy — 开发代理

```javascript
// vite.config.js
export default defineConfig({
  server: {
    // 开发服务器端口
    port: 3000,

    // 自动打开浏览器
    open: true,

    // 监听所有网络接口（局域网可访问）
    host: '0.0.0.0',

    // HMR 配置
    hmr: {
      // HMR 连接地址（跨域时需要指定）
      // host: 'localhost',
      // port: 3000,
    },

    // 代理配置（解决开发环境跨域）
    proxy: {
      // 代理 /api 开头的请求
      '/api': {
        target: 'http://backend.caidiaweb.com:8080',
        changeOrigin: true,   // 修改请求头 origin
        rewrite: (path) => path.replace(/^\/api/, ''), // 重写路径
        // WebSocket 代理
        ws: true,
      },

      // 代理多个服务
      '/upload': {
        target: 'http://file.caidiaweb.com:9000',
        changeOrigin: true,
      },

      // 代理 WebSocket
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },

    // CORS 配置（对代理的请求生效）
    cors: true,

    // 静态文件服务
    fs: {
      // 只允许访问项目内的文件（安全）
      strict: true,
      // 允许访问的目录
      allow: [
        path.resolve(__dirname, 'src'),
        path.resolve(__dirname, 'node_modules'),
      ],
    },
  },
});
```

### 5.4 build — 构建配置

```javascript
// vite.config.js
export default defineConfig({
  build: {
    // ===== 资源内联阈值 =====
    // 小于 4KB 的图片/字体转为 Base64 内联
    assetsInlineLimit: 4096,

    // ===== CSS 配置 =====
    cssCodeSplit: true,          // CSS 代码分割
    cssTarget: 'chrome61',       // CSS 目标

    // ===== Source Map =====
    sourcemap: false,            // 生产关闭

    // ===== 压缩 =====
    minify: 'esbuild',           // esbuild(快) | terser(精细)
    // terser 额外配置
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },

    // ===== Rollup 配置 =====
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },

    // ===== 公共路径 =====
    // base: '/',   // 部署到根路径
    // base: '/caidiaweb/', // 部署到子路径

    // ===== 库模式 =====（开发组件库时使用）
    // lib: {
    //   entry: 'src/index.ts',
    //   name: 'caidiaweb-ui',
    //   formats: ['es', 'umd'],
    // },
  },
});
```

### 5.5 CSS 配置

```javascript
// vite.config.js
export default defineConfig({
  css: {
    // CSS 预处理器配置
    preprocessorOptions: {
      scss: {
        // 全局注入变量/混入
        additionalData: `
          @use "@/styles/variables.scss" as *;
          @use "@/styles/mixins.scss" as *;
        `,
        // Sass 选项
        // api: 'modern-compiler',
      },
      less: {
        modifyVars: {
          'primary-color': '#1890ff',
        },
        javascriptEnabled: true,
      },
    },

    // CSS Modules 配置
    modules: {
      localsConvention: 'camelCaseOnly', // 类名转换
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },

    // PostCSS 配置
    postcss: {
      plugins: [
        require('autoprefixer'),
        require('postcss-preset-env'),
      ],
    },

    // DevTools 中显示 CSS 源码位置
    devSourcemap: true,
  },
});
```

---

## 6. Vite vs Webpack 全面对比

### 6.1 核心差异

```
┌──────────────────────────────────────────────────────────────┐
│              Vite vs Webpack 对比                              │
├──────────────┬─────────────────────┬─────────────────────────┤
│     维度       │       Vite          │        Webpack          │
├──────────────┼─────────────────────┼─────────────────────────┤
│ 开发服务器    │ 原生 ESM（按需编译）  │ Bundle 模式（打包全部）   │
│ 冷启动速度    │ <1s                 │ 10-60s                  │
│ HMR 速度      │ <50ms               │ 200ms-3s                │
│ 构建引擎      │ esbuild + Rollup    │ Webpack                 │
│ 预构建       │ esbuild (Go)        │ Babel/TS-loader (JS)     │
│ 配置复杂度    │ 简洁（开箱即用）      │ 复杂（大量 loader/plugin）│
│ 插件生态      │ 快速增长             │ 最丰富                   │
│ 浏览器兼容    │ ESM 浏览器 (Chrome 63+)│ 所有浏览器              │
│ HTML 入口     │ 直接用 index.html     │ 需插件处理              │
│ CSS 处理      │ 原生支持             │ 需 css-loader/style-loader│
│ 适用项目      │ 新项目 / Vue/React SPA│ 老项目 / 复杂定制需求     │
└──────────────┴─────────────────────┴─────────────────────────┘
```

### 6.2 配置风格对比

```javascript
// ===== Vite 配置 =====
// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': '/src' },
  },
  server: {
    port: 3000,
    proxy: { '/api': 'http://localhost:8080' },
  },
});
// 简洁、开箱即用


// ===== Webpack 配置 =====
// webpack.config.js
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = {
  entry: './src/main.js',
  output: { path: 'dist', filename: '[name].[hash].js' },
  resolve: {
    alias: { '@': '/src' },
    extensions: ['.js', '.vue'],
  },
  module: {
    rules: [
      { test: /\.vue$/, use: 'vue-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      { test: /\.(png|jpg)$/, type: 'asset' },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({ template: 'index.html' }),
  ],
  devServer: {
    port: 3000,
    proxy: { '/api': 'http://localhost:8080' },
  },
};
// 需要大量 loader 和 plugin 配置
```

### 6.3 迁移决策

```
什么时候选 Vite：
  ✅ 新项目（Vue3/React18+）
  ✅ 中型 SPA 应用
  ✅ 开发体验优先
  ✅ 团队愿意接受 ESM 生态

什么时候用 Webpack：
  ✅ 遗留项目（已有复杂 webpack 配置）
  ✅ 需要兼容 IE11
  ✅ 使用大量 Webpack 专属插件
  ✅ React + CRA（Create React App 内置 webpack）

迁移建议：
  1. 新项目直接 Vite
  2. 老项目如果: 体积 < 500KB 且不需要 IE11 → 可以考虑迁移 Vite
  3. 老项目如果: 已有 50+ 个 webpack loader/plugin → 保留 Webpack
```

---

## 7. 面试高频考点

### Q1：Vite 为什么开发时快？

**三点核心原因**：

1. **原生 ESM按需编译**：不打包整个应用，浏览器请求什么就编译什么，冷启动从 O(n) 降到 O(1)
2. **esbuild 预构建**：Go 语言编写的 esbuild 比 JS 编写的 Babel/Webpack 快 10-100 倍
3. **HMR 精准更新**：基于 ESM 依赖图，只更新变化的模块链，不重新打包

### Q2：Vite 开发和生产用了不同的打包工具，为什么？

- **开发用 esbuild**：速度快，按需编译，不需要 Tree Shaking 和代码分割
- **生产用 Rollup**：插件生态成熟、Tree Shaking 精细、代码分割灵活、CSS 处理完善
- esbuild 目前不支持代码分割，且插件的精细化控制不如 Rollup

### Q3：Vite 的预构建做了什么？为什么要预构建？

1. **CJS → ESM**：node_modules 很多包是 CommonJS，浏览器无法运行，esbuild 转换为 ES Module
2. **合并子模块**：如 lodash-es 有 600+ 小文件，合并成 1 个文件，减少 HTTP 请求数
3. **缓存**：预构建结果缓存在 `node_modules/.vite`，锁文件没变则直接读缓存

### Q4：Vite 代理和 Nginx 代理的区别？

- **Vite proxy**：开发环境代理，解决开发时跨域问题，只在 `npm run dev` 时生效
- **Nginx 代理**：生产环境代理，处理真实流量、负载均衡、缓存、HTTPS 等
- Vite proxy 不能用于生产，Nginx 推荐用于生产

### Q5：Vite 不支持 CommonJS 模块怎么办？

```javascript
// 方法1：用 optimizeDeps.include 强制预构建
export default defineConfig({
  optimizeDeps: {
    include: ['some-cjs-package'],
  },
});

// 方法2：用 @rollup/plugin-commonjs（构建阶段）
import commonjs from '@rollup/plugin-commonjs';
export default defineConfig({
  build: {
    rollupOptions: {
      plugins: [commonjs()],
    },
  },
});

// 方法3：升级依赖到 ESM 版本
npm install some-package@latest
// 现在很多包都同时提供 CJS 和 ESM 版本
```

---

> **动手建议**：在 caidiaweb 项目中运行 `npx vite --debug`，观察控制台输出的预构建过程（哪些依赖被预构建了、耗时多少）。然后修改 `vite.config.js` 中的 `optimizeDeps.include`，对比冷启动速度的变化。
