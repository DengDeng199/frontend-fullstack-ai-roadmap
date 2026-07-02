# 4.2 Vite 插件开发

> 前端工程化 · Vite 插件 API · 虚拟模块 · 代码注入 · 路由自动生成

---

## 目录

1. [插件 API 全景](#1-插件-api-全景)
2. [通用钩子](#2-通用钩子)
3. [构建钩子](#3-构建钩子)
4. [生成钩子](#4-生成钩子)
5. [实践：虚拟模块插件](#5-实践虚拟模块插件)
6. [实践：代码注入插件](#6-实践代码注入插件)
7. [实践：路由自动生成插件](#7-实践路由自动生成插件)
8. [插件调试](#8-插件调试)
9. [面试高频考点](#9-面试高频考点)

---

## 1. 插件 API 全景

### 1.1 钩子分类总览

```
┌──────────────────────────────────────────────────────────────┐
│              Vite 插件钩子全景                                 │
├──────────────┬──────────────────────┬────────────────────────┤
│    类别       │        钩子           │        触发时机          │
├──────────────┼──────────────────────┼────────────────────────┤
│   通用钩子    │ config               │ Vite 配置解析前          │
│  (Vite 独有)  │ configResolved       │ Vite 配置解析完成        │
│              │ configureServer      │ Dev Server 创建时        │
│              │ configurePreviewServer│ Preview Server 创建时   │
│              │ transformIndexHtml   │ 转换 index.html         │
│              │ handleHotUpdate      │ HMR 自定义处理           │
├──────────────┼──────────────────────┼────────────────────────┤
│   构建钩子    │ options              │ Rollup 选项收集后         │
│ (Rollup 通用) │ buildStart           │ 构建开始                 │
│              │ resolveId            │ 模块路径解析             │
│              │ load                 │ 模块加载                 │
│              │ transform            │ 模块代码转换             │
│              │ buildEnd             │ 构建结束                 │
├──────────────┼──────────────────────┼────────────────────────┤
│   生成钩子    │ outputOptions        │ 输出选项生成后           │
│ (Rollup 通用) │ renderStart          │ 输出生成开始             │
│              │ generateBundle       │ 输出生成完成（写入前）     │
│              │ writeBundle          │ 文件写入完成（写入后）     │
│              │ renderChunk          │ 单个chunk生成时           │
└──────────────┴──────────────────────┴────────────────────────┘
```

### 1.2 插件基本结构

```javascript
// plugins/my-plugin.js — Vite 插件最小示例

export default function myPlugin(options = {}) {
  // 配置项处理
  const resolvedOptions = {
    enabled: true,
    ...options,
  };

  return {
    // 插件名称（必需，调试用）
    name: 'vite-plugin-my-plugin',

    // enforce 控制执行顺序
    // 'pre'   → 在其他插件之前
    // 默认    → 正常顺序
    // 'post'  → 在其他插件之后
    enforce: 'pre',

    // apply 控制插件在什么环境生效
    // 'serve' → 仅在 dev server
    // 'build' → 仅在构建
    // 不传   → 两者都生效
    apply: 'serve',

    // ===== 各个钩子 =====
    config(config, env) {
      // 修改 Vite 配置（在解析之前）
    },

    configResolved(resolvedConfig) {
      // 获取最终解析后的配置（只读）
      console.log('最终配置:', resolvedConfig.root);
    },

    configureServer(server) {
      // 开发服务器中间件、自定义路由等
    },

    resolveId(id, importer, options) {
      // 自定义模块路径解析
    },

    load(id) {
      // 自定义模块加载
    },

    transform(code, id) {
      // 转换模块代码
    },

    generateBundle(options, bundle) {
      // 构建产物生成后、写入文件前
    },

    writeBundle(options, bundle) {
      // 产物写入文件后
    },
  };
}
```

---

## 2. 通用钩子

### 2.1 config — 修改配置

```javascript
// plugins/custom-config.js
export default function customConfig(options = {}) {
  return {
    name: 'vite-plugin-custom-config',

    // 在 Vite 解析用户配置之前运行
    config(config, { command, mode }) {
      console.log(`[${mode}] 环境配置注入`);

      return {
        // 合并用户的 alias
        resolve: {
          alias: {
            '@custom': '/src/custom',
          },
        },

        // 注入环境变量
        define: {
          __APP_VERSION__: JSON.stringify('1.0.0'),
          __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
        },

        // 开发服务器默认端口
        server: {
          port: 3000,
        },
      };
    },

    // 在 Vite 解析完所有配置之后运行（只读）
    configResolved(resolvedConfig) {
      // 保存最终配置，供其他钩子使用
      // 注意：这是只读的，不要修改
      console.log('项目根目录:', resolvedConfig.root);
      console.log('构建模式:', resolvedConfig.mode);
      console.log('所有插件:', resolvedConfig.plugins.map(p => p.name));
    },
  };
};
```

### 2.2 configureServer — 开发服务器增强

```javascript
// plugins/dev-api-mock.js
export default function devApiMock(mockData = {}) {
  return {
    name: 'vite-plugin-dev-api-mock',
    apply: 'serve', // 仅在 dev 环境生效

    configureServer(server) {
      // 添加自定义中间件（在 Vite 内置中间件之前）
      server.middlewares.use('/api/mock', (req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const path = url.pathname.replace('/api/mock', '');

        if (mockData[path]) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(mockData[path]));
          return;
        }

        next(); // 交给下一个中间件
      });

      // 添加中间件（在 Vite 内置中间件之后）
      return () => {
        server.middlewares.use((req, res, next) => {
          console.log(`[Mock] ${req.method} ${req.url}`);
          next();
        });
      };
    },

    // 自定义 HMR 处理
    handleHotUpdate({ file, server, modules }) {
      // 如果某个特定文件变化，扩展 HMR 范围
      if (file.endsWith('.global.css')) {
        // CSS 变量变化 → 通知所有使用它的模块
        const affectedModules = server.moduleGraph.getModulesByFile(
          file.replace('.global.css', '.vue')
        );
        return [...modules, ...(affectedModules || [])];
      }
      // 返回 null 或 undefined 则走默认逻辑
    },
  };
};
```

### 2.3 transformIndexHtml — HTML 注入

```javascript
// plugins/html-inject.js
export default function htmlInject(options = {}) {
  const { version = '1.0.0', analyticsId = '' } = options;

  return {
    name: 'vite-plugin-html-inject',

    transformIndexHtml(html, ctx) {
      // ctx 包含：filename, server, bundle, chunk

      return {
        // 注入到 HTML 的 head 中
        html,
        tags: [
          // 注入 meta 标签
          {
            tag: 'meta',
            attrs: { name: 'app-version', content: version },
            injectTo: 'head-prepend',
          },
          // 注入 script（生产环境 GA）
          ...(analyticsId && ctx.bundle ? [{
            tag: 'script',
            attrs: { src: `https://analytics.js?id=${analyticsId}`, async: true },
            injectTo: 'head',
          }] : []),
          // 注入内联 script
          {
            tag: 'script',
            children: `window.__APP_VERSION__ = '${version}';`,
            injectTo: 'body',
          },
        ],
      };
    },
  };
};
```

---

## 3. 构建钩子

### 3.1 resolveId — 自定义模块解析

```javascript
// plugins/alias-resolver.js
// 场景：将 @icons/* 映射到实际的 SVG 文件路径

export default function aliasResolver(aliasMap) {
  return {
    name: 'vite-plugin-alias-resolver',

    resolveId(id, importer) {
      // 遍历 alias 映射
      for (const [alias, target] of Object.entries(aliasMap)) {
        if (id.startsWith(alias)) {
          // 返回真实路径
          const resolved = id.replace(alias, target);
          console.log(`[Alias] ${id} → ${resolved}`);
          // 返回 undefined → 让其他插件继续处理
          // 返回字符串 → 直接使用该路径
          return resolved;
        }
      }
      // 返回 undefined → 不处理，交给下一个插件
      return undefined;
    },
  };
};
```

### 3.2 load — 自定义模块加载

```javascript
// plugins/virtual-css.js
// 场景：动态生成 CSS 变量文件

export default function virtualCSS(themeConfig) {
  const VIRTUAL_ID = 'virtual:theme.css';
  const RESOLVED_ID = '\0' + VIRTUAL_ID; // \0 前缀标记为虚拟模块

  return {
    name: 'vite-plugin-virtual-css',

    resolveId(id) {
      if (id === VIRTUAL_ID) {
        return RESOLVED_ID; // 返回带 \0 的 ID
      }
    },

    load(id) {
      if (id === RESOLVED_ID) {
        // 动态生成 CSS 内容
        const css = `
          :root {
            --color-primary: ${themeConfig.primaryColor || '#1890ff'};
            --color-success: ${themeConfig.successColor || '#0cce6b'};
            --color-warning: ${themeConfig.warningColor || '#ffa400'};
            --color-danger: ${themeConfig.dangerColor || '#ff4e42'};
            --font-size-base: ${themeConfig.fontSize || '14px'};
            --border-radius: ${themeConfig.borderRadius || '4px'};
          }
        `;
        return css;
      }
    },
  };
};

// 使用：
// import 'virtual:theme.css';
```

### 3.3 transform — 代码转换（最常用）

```javascript
// plugins/env-replace.js
// 场景：编译时替换环境变量（比 define 更灵活）

export default function envReplace(variables) {
  return {
    name: 'vite-plugin-env-replace',

    transform(code, id) {
      // 只处理 JS/TS/Vue 文件
      if (!/\.(js|ts|vue)$/.test(id)) return;

      let transformed = code;
      let hasChange = false;

      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`process\\.env\\.${key}`, 'g');
        if (regex.test(transformed)) {
          transformed = transformed.replace(regex, JSON.stringify(value));
          hasChange = true;
        }
      }

      if (hasChange) {
        return {
          code: transformed,
          map: null, // 如果没有 sourcemap 就返回 null
        };
      }

      // 返回 null 或 undefined 表示不处理
      return null;
    },
  };
};
```

---

## 4. 生成钩子

### 4.1 generateBundle — 产物生成后处理

```javascript
// plugins/bundle-stats.js
// 场景：生成构建产物统计报告

export default function bundleStats() {
  let startTime = 0;

  return {
    name: 'vite-plugin-bundle-stats',

    buildStart() {
      startTime = Date.now();
    },

    generateBundle(options, bundle) {
      const stats = {
        buildTime: Date.now() - startTime,
        totalSize: 0,
        files: [],
      };

      for (const [fileName, chunk] of Object.entries(bundle)) {
        const size = chunk.type === 'chunk'
          ? Buffer.byteLength(chunk.code, 'utf-8')
          : chunk.source.length;

        stats.totalSize += size;
        stats.files.push({
          name: fileName,
          type: chunk.type, // 'chunk' | 'asset'
          size,
          sizeKB: (size / 1024).toFixed(1),
        });
      }

      // 按大小排序
      stats.files.sort((a, b) => b.size - a.size);
      stats.totalSizeKB = (stats.totalSize / 1024).toFixed(1);

      // 打印统计（或写入文件）
      console.log('\n📦 构建产物统计:');
      console.log(`   构建耗时: ${(stats.buildTime / 1000).toFixed(2)}s`);
      console.log(`   总大小: ${stats.totalSizeKB}KB`);
      console.log('   最大的5个文件:');
      stats.files.slice(0, 5).forEach(f => {
        console.log(`   ${f.sizeKB}KB  ${f.name}`);
      });

      // 写入 stats.json
      this.emitFile({
        type: 'asset',
        fileName: 'bundle-stats.json',
        source: JSON.stringify(stats, null, 2),
      });
    },
  };
};
```

### 4.2 writeBundle — 产物写入后处理

```javascript
// plugins/gzip-compress.js
// 场景：构建完成后自动生成 .gz 压缩文件

import { gzipSync } from 'zlib';
import fs from 'fs';
import path from 'path';

export default function gzipCompress(options = {}) {
  const { threshold = 10240 } = options; // 大于 10KB 才压缩

  return {
    name: 'vite-plugin-gzip-compress',
    apply: 'build',

    writeBundle(outputOptions, bundle) {
      const outDir = outputOptions.dir || path.dirname(outputOptions.file);

      for (const [fileName, chunk] of Object.entries(bundle)) {
        let source;

        if (chunk.type === 'chunk') {
          source = chunk.code;
        } else if (typeof chunk.source === 'string') {
          source = chunk.source;
        } else {
          source = Buffer.from(chunk.source);
        }

        // 小于阈值跳过
        if (source.length < threshold) continue;

        // 生成 .gz 文件
        const gzipped = gzipSync(source, { level: 9 });
        const gzPath = path.join(outDir, fileName + '.gz');
        fs.mkdirSync(path.dirname(gzPath), { recursive: true });
        fs.writeFileSync(gzPath, gzipped);

        const ratio = ((1 - gzipped.length / source.length) * 100).toFixed(1);
        console.log(`  ${fileName}.gz  (${(gzipped.length / 1024).toFixed(1)}KB, -${ratio}%)`);
      }

      console.log('✅ Gzip 压缩完成');
    },
  };
};
```

---

## 5. 实践：虚拟模块插件

### 5.1 场景

```
需求：在代码中 import 'virtual:app-config'，获取编译时注入的应用配置
不需要在项目中创建真实的 config 文件

import { apiBase, version, env } from 'virtual:app-config';
// 编译时由插件动态生成模块内容
```

### 5.2 完整实现

```javascript
// plugins/virtual-app-config.js
// 虚拟模块：根据环境和构建参数动态生成配置

const VIRTUAL_PREFIX = 'virtual:app-config';
const RESOLVED_PREFIX = '\0' + VIRTUAL_PREFIX;

export default function virtualAppConfig(userConfig = {}) {
  let resolvedConfig;

  return {
    name: 'vite-plugin-virtual-app-config',
    enforce: 'pre',

    configResolved(config) {
      resolvedConfig = config;
    },

    resolveId(id) {
      // 匹配 virtual:app-config 和 virtual:app-config/xxx
      if (id === VIRTUAL_PREFIX || id.startsWith(RESOLVED_PREFIX)) {
        return RESOLVED_PREFIX;
      }
    },

    load(id) {
      if (id !== RESOLVED_PREFIX) return;

      // 根据构建模式生成不同的配置
      const isDev = resolvedConfig.mode === 'development';
      const isProd = resolvedConfig.mode === 'production';

      const appConfig = {
        apiBase: isProd
          ? userConfig.prodApi || 'https://api.caidiaweb.com'
          : userConfig.devApi || 'http://localhost:8080',
        version: userConfig.version || '0.0.0',
        env: resolvedConfig.mode,
        debug: isDev,
        features: {
          newDashboard: userConfig.features?.newDashboard ?? isDev,
          darkMode: userConfig.features?.darkMode ?? true,
        },
      };

      // 生成 ES Module 代码
      return `
        export const apiBase = ${JSON.stringify(appConfig.apiBase)};
        export const version = ${JSON.stringify(appConfig.version)};
        export const env = ${JSON.stringify(appConfig.env)};
        export const debug = ${JSON.stringify(appConfig.debug)};
        export const features = ${JSON.stringify(appConfig.features)};
        export default ${JSON.stringify(appConfig)};
      `;
    },
  };
};
```

```javascript
// vite.config.js — 使用插件
import virtualAppConfig from './plugins/virtual-app-config';

export default defineConfig({
  plugins: [
    virtualAppConfig({
      version: '2.3.1',
      prodApi: 'https://api.caidiaweb.com',
      devApi: 'http://localhost:8080',
      features: {
        newDashboard: true,
        darkMode: true,
      },
    }),
  ],
});
```

```typescript
// 为了让 TypeScript 识别虚拟模块，需要声明类型
// types/virtual.d.ts
declare module 'virtual:app-config' {
  export const apiBase: string;
  export const version: string;
  export const env: string;
  export const debug: boolean;
  export const features: Record<string, boolean>;
  const config: {
    apiBase: string;
    version: string;
    env: string;
    debug: boolean;
    features: Record<string, boolean>;
  };
  export default config;
}
```

---

## 6. 实践：代码注入插件

### 6.1 场景

```
需求：自动在 setup script 中注入 import 语句和代码片段
例如：自动引入所有 Vue API（ref, computed 等），减少手动 import

import { ref, computed, watch } from 'vue';
//            ↑ 自动注入
```

### 6.2 完整实现

```javascript
// plugins/auto-import-vue-api.js

export default function autoImportVueAPI(options = {}) {
  const { imports = [] } = options;
  // 默认注入的 API
  const defaultImports = ['ref', 'computed', 'watch', 'onMounted', 'onBeforeUnmount'];
  const allImports = [...new Set([...defaultImports, ...imports])];

  return {
    name: 'vite-plugin-auto-import-vue-api',

    transform(code, id) {
      // 只处理 Vue SFC 文件的 <script setup> 部分
      if (!id.endsWith('.vue')) return;

      // 提取 <script setup> 内容
      const setupMatch = code.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);
      if (!setupMatch) return;

      const setupContent = setupMatch[1];

      // 检查是否已经有 vue 的 import
      const hasVueImport = /from\s+['"]vue['"]/.test(setupContent);

      if (!hasVueImport) {
        // 生成 import 语句
        const importStatement = `import { ${allImports.join(', ')} } from 'vue';\n`;

        // 注入到 script setup 开头
        const newSetup = setupMatch[0].replace(
          setupContent,
          importStatement + setupContent
        );

        return code.replace(setupMatch[0], newSetup);
      }
    },
  };
};

// 使用：
// autoImportVueAPI({ imports: ['provide', 'inject', 'nextTick'] })
```

### 6.3 更实用的版本：环境标识注入

```javascript
// plugins/build-info-inject.js
// 在构建产物头部注入构建信息注释

export default function buildInfoInject() {
  return {
    name: 'vite-plugin-build-info',
    apply: 'build',

    renderChunk(code, chunk) {
      // 只在入口 chunk 注入
      if (!chunk.isEntry) return null;

      const banner = [
        '/*!',
        ` * caidiaweb - 技术设施管理系统`,
        ` * Version: ${process.env.npm_package_version || '0.0.0'}`,
        ` * Built: ${new Date().toISOString()}`,
        ` * Mode: ${this.mode || 'production'}`,
        ' */',
        '',
      ].join('\n');

      return {
        code: banner + code,
        map: null,
      };
    },
  };
};
```

---

## 7. 实践：路由自动生成插件

### 7.1 场景

```
需求：根据 src/views 目录结构自动生成 Vue Router 路由配置

src/views/
├── Home.vue              → { path: '/', component: ... }
├── TechFacility.vue      → { path: '/tech-facility', component: ... }
├── Spectrum.vue          → { path: '/spectrum', component: ... }
└── settings/
    ├── Profile.vue       → { path: '/settings/profile', component: ... }
    └── Security.vue      → { path: '/settings/security', component: ... }

自动生成 virtual:routes 模块
```

### 7.2 完整实现

```javascript
// plugins/auto-routes.js
import { globSync } from 'glob';
import path from 'path';

export default function autoRoutes(options = {}) {
  const {
    // 页面目录
    pagesDir = 'src/views',
    // 文件扩展名
    extensions = ['.vue', '.tsx', '.jsx'],
    // 排除文件
    exclude = ['**/components/**', '**/utils/**'],
  } = options;

  const VIRTUAL_ID = 'virtual:routes';
  const RESOLVED_ID = '\0' + VIRTUAL_ID;

  return {
    name: 'vite-plugin-auto-routes',
    enforce: 'pre',

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },

    load(id) {
      if (id !== RESOLVED_ID) return;

      // 扫描 views 目录
      const pattern = path.resolve(process.cwd(), pagesDir, '**/*');
      const files = globSync(pattern, {
        ignore: exclude,
      }).filter(f => extensions.includes(path.extname(f)));

      // 生成路由配置
      const routes = files.map(filePath => {
        // 计算路由路径
        const relativePath = path.relative(
          path.resolve(process.cwd(), pagesDir),
          filePath
        );
        const withoutExt = relativePath.replace(/\.(vue|tsx|jsx)$/, '');
        const routePath = withoutExt
          .replace(/\\/g, '/')
          .replace(/\/index$/, '')
          .replace(/^\/?/, '/')
          .toLowerCase()
          .replace(/\/_/g, '/:'); // /user/_id → /user/:id

        // 生成组件名（用于路由名称）
        const name = withoutExt
          .replace(/\\/g, '-')
          .replace(/\/index$/, '')
          .replace(/\/_/g, '-')
          .toLowerCase();

        return {
          path: routePath,
          name: name || 'home',
          component: `() => import('${filePath.replace(/\\/g, '/')}')`,
        };
      });

      // 生成 JS 代码
      const routesCode = routes.map(route => {
        return `  {
    path: '${route.path}',
    name: '${route.name}',
    component: ${route.component},
  }`;
      }).join(',\n');

      return `
// 自动生成的路由配置（由 vite-plugin-auto-routes 生成）
// 请勿手动修改
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
${routesCode}
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
export { routes };
`;
    },
  };
};
```

```javascript
// vite.config.js — 使用插件
import autoRoutes from './plugins/auto-routes';

export default defineConfig({
  plugins: [
    autoRoutes({
      pagesDir: 'src/views',
      exclude: ['**/components/**', '**/*.test.*'],
    }),
  ],
});
```

```javascript
// main.js — 使用自动生成的路由
import router from 'virtual:routes';
import { createApp } from 'vue';

const app = createApp(App);
app.use(router);
app.mount('#app');
```

---

## 8. 插件调试

### 8.1 vite-plugin-inspect

```bash
npm install -D vite-plugin-inspect
```

```javascript
// vite.config.js
import Inspect from 'vite-plugin-inspect';

export default defineConfig({
  plugins: [
    vue(),
    // 放在插件列表最后，可以看到所有插件的中间产物
    Inspect(),
  ],
});
```

```
访问 http://localhost:5173/__inspect/ 可以看到：

┌──────────────────────────────────────────────────────────────┐
│  vite-plugin-inspect 面板                                    │
│                                                              │
│  左侧：所有被处理的模块列表                                   │
│  右侧：选中模块的 transform 历史记录                          │
│    ├── 原始代码                                              │
│    ├── 经过 vite:vue 后的代码                                │
│    ├── 经过 vite:esbuild 后的代码                            │
│    └── ...                                                  │
│                                                              │
│  可以清晰看到每个插件对代码做了什么修改                        │
└──────────────────────────────────────────────────────────────┘
```

### 8.2 调试技巧

```javascript
// 调试技巧1：在钩子中打印详细信息
{
  transform(code, id) {
    if (id.includes('target-file')) {
      console.log('=== Transform Debug ===');
      console.log('File:', id);
      console.log('Before length:', code.length);
      console.log('---');
    }
  },
}

// 调试技巧2：使用 debug 库（条件输出）
// npm install debug
import debug from 'debug';
const log = debug('vite:my-plugin');

{
  resolveId(id) {
    log('resolveId:', id);
  },
}

// 运行时：set DEBUG=vite:my-plugin && npm run dev

// 调试技巧3：在 vite.config.js 中启用详细日志
export default defineConfig({
  logLevel: 'info', // 'info' | 'warn' | 'error' | 'silent'
  // 也可以在命令行中设置：
  // DEBUG=vite:* npm run dev
});
```

### 8.3 插件执行顺序控制

```javascript
// enforce 控制相对顺序
{
  name: 'plugin-a',
  enforce: 'pre',  // 先于普通插件执行
}

{
  name: 'plugin-b',
  // 默认 enforce → 在 pre 之后、post 之前
}

{
  name: 'plugin-c',
  enforce: 'post', // 后于普通插件执行
}

// 同 enforce 组内 → 按 plugins 数组中的顺序

// 完整执行顺序：
// Alias (vite:alias) → 用户 pre → Vite 核心插件 → 用户默认 → 用户 post → Vite 构建插件

// 实际例子：如果你要在 Vue SFC 编译之前拦截 .vue 文件
{
  name: 'my-vue-preprocessor',
  enforce: 'pre', // 确保在 vite:vue 之前运行
  transform(code, id) {
    if (id.endsWith('.vue')) {
      // 此时 .vue 文件还是原始内容，尚未被编译
    }
  },
}
```

---

## 9. 面试高频考点

### Q1：Vite 插件和 Rollup 插件是什么关系？

- Vite 插件是 Rollup 插件的**超集**
- Vite 插件可以使用所有 Rollup 钩子（resolveId/load/transform/renderChunk...）
- Vite 额外提供了自己的独特钩子（config/configureServer/transformIndexHtml/handleHotUpdate）
- 大部分 Rollup 插件可以直接在 Vite 中使用（如 @rollup/plugin-json）
- Vite 插件通过 `enforce` 和 `apply` 提供了更好的执行顺序和环境控制

### Q2：enforce: 'pre' / 'post' 有什么用？

- `pre`：在其他插件之前运行，适合在官方插件之前拦截文件（如在 vite:vue 编译 .vue 之前处理）
- `post`：在其他插件之后运行，适合在官方插件之后处理产物（如代码压缩后校验）
- 默认（不设）：按 plugin 数组顺序执行

### Q3：虚拟模块和真实模块的区别？

| 维度 | 真实模块 | 虚拟模块 |
|------|---------|---------|
| 存储 | 磁盘上有对应文件 | 运行内存中动态生成 |
| 修改方式 | 编辑器修改文件 | 修改插件配置 |
| 使用场景 | 业务代码、静态配置 | 构建时动态生成的内容 |
| 约定路径 | 普通路径 | 以 `\0` 开头的内部 ID |
| 例子 | `import './utils.js'` | `import 'virtual:config'` |

### Q4：transform 和 load 的区别？

- **load**：加载模块源代码（从磁盘读取），在此阶段可以**完全替换**模块内容
- **transform**：转换已经加载的代码（类似 Babel 处理），**渐进式修改**代码

实际执行顺序：`resolveId → load → transform → transform → ...`

一个文件可以被多个插件的 transform 连续处理。

### Q5：如何开发一个同时支持 dev 和 build 的插件？

- 默认情况下插件会在 dev 和 build 都生效
- 使用 `apply: 'serve'` 限定仅在 dev 环境
- 使用 `apply: 'build'` 限定仅在 build 环境
- 通用钩子（config/configureServer）只在 dev 有实际作用
- 构建钩子（resolveId/load/transform）在 dev 和 build 都可用

---

> **动手建议**：在 caidiaweb 项目中安装 `vite-plugin-inspect`，访问 `http://localhost:5173/__inspect/`，选择一个 .vue 文件查看它经过每个插件 transform 后的中间产物。然后试着写一个最简单的插件（在 transform 中给每个 .vue 文件注入一个 console.log），看看调试面板中的变化。
