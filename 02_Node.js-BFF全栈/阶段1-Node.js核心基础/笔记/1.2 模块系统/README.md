# 1.2 模块系统

> 阶段 1 — Node.js 核心基础 / 第 2 章
> 核心目标：搞懂 CommonJS 与 ES Modules 两套模块系统，理解它们的本质差异（值拷贝 vs 引用、运行时 vs 编译时），能正确混用并在工程里选型。

---

## 目录

1. [为什么需要模块系统](#1-为什么需要模块系统)
2. [CommonJS（CJS）](#2-commonjscjs)
3. [ES Modules（ESM）](#3-es-modulesesm)
4. [CJS vs ESM 核心差异](#4-cjs-vs-esm-核心差异)
5. [动态 import()](#5-动态-import)
6. [工程选型与混用](#6-工程选型与混用)
7. [caidiaweb / BFF 实践](#7-caidiaweb--bff-实践)
8. [面试考点](#8-面试考点)

---

## 1. 为什么需要模块系统

> 没有模块系统，所有代码堆在一个全局作用域——变量冲突、依赖混乱、无法复用。

模块系统解决三件事：
1. **作用域隔离**：每个文件是独立作用域，互不污染。
2. **依赖显式**：`require` / `import` 声明依赖来源。
3. **复用与组合**：导出接口，其他地方引入使用。

---

## 2. CommonJS（CJS）

> Node.js 的**传统默认**模块系统（2009 年随 Node 诞生）。同步加载，适合服务端。

### 2.1 基本用法

```js
// math.js —— 导出
function add(a, b) { return a + b; }
module.exports = { add };
// 或：exports.add = add;  （注意 exports 是 module.exports 的引用）

// main.js —— 引入
const { add } = require('./math'); // 同步！立即拿到结果
console.log(add(1, 2));
```

### 2.2 关键内建变量

| 变量 | 含义 |
|------|------|
| `require()` | 同步加载模块，返回 `module.exports` |
| `module.exports` | 本模块对外暴露的对象 |
| `exports` | `module.exports` 的引用（不能直接 `exports = xxx` 重赋值） |
| `__dirname` | 当前文件所在**目录**的绝对路径 |
| `__filename` | 当前文件的绝对路径（含文件名） |

```js
console.log(__dirname);  // /project/src/utils
console.log(__filename); // /project/src/utils/foo.js
```

> **坑**：`exports = { a: 1 }` 不生效——这只让 `exports` 指向新对象，断开了与 `module.exports` 的引用。要改导出对象必须用 `module.exports = ...`。

### 2.3 模块缓存 require.cache

```js
// 同一个模块首次 require 时执行，之后从缓存取，不重复执行
require('./config'); // 执行
require('./config'); // 直接返回缓存（同一实例）

// 清除缓存（常用于测试热重载/配置刷新）
delete require.cache[require.resolve('./config')];
```

> **后果**：模块顶层代码只跑一次。如果顶层有副作用（如 `setInterval`），多次 require 不会产生多个实例——但单例状态也会被所有引用共享。

---

## 3. ES Modules（ESM）

> JavaScript 官方标准模块系统（ES2015）。静态分析、异步加载、浏览器与 Node 通用。

### 3.1 启用方式

```json
// package.json
{ "type": "module" }  // 该包下 .js 默认按 ESM 解析
```
或文件用 `.mjs` 扩展名（无视 package.json 的 type）。

### 3.2 基本用法

```js
// math.mjs
export function add(a, b) { return a + b; }
export const PI = 3.14;
export default function main() {}; // 默认导出

// main.mjs
import main, { add, PI } from './math.mjs'; // 命名导入 + 默认导入
import * as math from './math.mjs';          // 命名空间导入
```

### 3.3 ESM 专属变量

```js
import.meta.url;        // 当前模块 URL（file:///.../foo.mjs）
import.meta.dirname;    // Node 20.11+ 当前目录（等于旧 __dirname）
import.meta.resolve('./x'); // 解析模块路径
```

> `import.meta.url` 是文件 URL，`new URL('./data', import.meta.url)` 是 ESM 里拼路径的标准做法（替代 `__dirname + path.join`）。

---

## 4. CJS vs ESM 核心差异

### 4.1 三大数据差异

| 维度 | CommonJS | ES Modules |
|------|----------|-----------|
| **导出语义** | **值拷贝**（导出时把值复制出去） | **值引用（live binding）** |
| **加载时机** | **运行时**加载（`require` 在代码执行到才加载） | **编译时**确定（import 在解析阶段就绑定） |
| **顶层 this** | 指向 `module.exports` | **undefined** |

### 4.2 值拷贝 vs 值引用（最易踩坑）

```js
// ===== CJS：值拷贝 =====
// counter.js
let count = 0;
function inc() { count++; }
module.exports = { count, inc };

// main.js
const { count, inc } = require('./counter');
inc(); inc();
console.log(count); // 0！因为解构时 count 已被拷贝成 0 的快照

// ===== ESM：live binding =====
// counter.mjs
export let count = 0;
export function inc() { count++; }

// main.mjs
import { count, inc } from './counter.mjs';
inc(); inc();
console.log(count); // 2！count 是活引用，随模块内部变化
```

> **记住**：CJS 解构导出会拿到「当时的值快照」，后续模块内变化拿不到；ESM 是实时绑定，永远最新。

### 4.3 运行时 vs 编译时

```js
// CJS：require 可以写在 if 里、可以动态拼接路径
if (env === 'dev') {
  var cfg = require('./dev.config'); // 运行时才决定加载谁
}

// ESM：import 必须顶层静态（编译时就确定依赖图，便于 tree-shaking）
import { a } from './mod'; // 不能写在 if 里（语法错误）
```

> 这解释了 why ESM 能被打包工具 tree-shake（编译期已知依赖图），CJS 不行。

---

## 5. 动态 import()

> ESM 的 `import()` **是个函数，返回 Promise**，能在运行时按需加载（突破静态限制）。

```js
// 条件加载
if (env === 'dev') {
  const devCfg = await import('./dev.config.mjs');
}

// 懒加载（优化首屏）
button.onclick = async () => {
  const { heavyChart } = await import('./heavyChart.mjs');
  heavyChart.render();
};

// 动态路径（模板）
const lang = 'zh';
const dict = await import(`./i18n/${lang}.mjs`);
```

| 特性 | 静态 import | 动态 import() |
|------|-----------|--------------|
| 位置 | 必须顶层 | 任意位置（函数内/if 内） |
| 返回 | 直接绑定 | Promise |
| 用途 | 常规依赖 | 懒加载 / 条件加载 |

---

## 6. 工程选型与混用

### 6.1 怎么选

| 场景 | 推荐 |
|------|------|
| 新项目 / 库 | **ESM**（标准、可 tree-shake、前后端统一） |
| 老 Node 项目 / 大量 CJS 生态 | **CJS**（兼容性好） |
| 既要又要 | 双格式发包（`exports` 字段区分） |

### 6.2 CJS 与 ESM 互操作

```js
// ESM 中引入 CJS 模块（Node 自动把 require 的 module.exports 当成 default）
import pkg from 'legacy-cjs-pkg';        // default = module.exports
import { something } from 'legacy-cjs-pkg'; // 命名导入（Node 尽力静态分析，可能失败）

// CJS 中引入 ESM（必须用动态 import，因为 CJS 不能顶层 await 静态 import）
async function main() {
  const mod = await import('./esm-module.mjs');
  mod.foo();
}
```

> **黄金法则**：在 ESM 文件里用静态 `import` 引 CJS 通常 OK；在 CJS 文件里引 ESM **只能**用动态 `import()`。新项目统一 ESM 最省心。

---

## 7. caidiaweb / BFF 实践

### 7.1 BFF 项目模块组织（ESM 推荐）

```js
// src/config/index.mjs
export const config = {
  port: process.env.PORT ?? 3000,
  backendBase: process.env.BACKEND_BASE,
};

// src/routes/dashboard.mjs
import { config } from '../config/index.mjs';
import { fetchStation } from '../services/station.mjs';

export async function dashboardRoute(req, res) {
  const data = await fetchStation(req.params.id);
  res.json({ ...config, data });
}
```

### 7.2 路径拼推荐用法（ESM）

```js
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataPath = join(__dirname, 'data', 'stations.json'); // 兼容写法
// 更现代：const dataUrl = new URL('./data/stations.json', import.meta.url);
```

### 7.3 踩坑清单

- [ ] 混用 CJS/ESM 时确认 package.json 的 `"type"` 字段，避免 `.js` 被错解析
- [ ] ESM 里别用 `__dirname`/`__filename`（undefined），用 `import.meta.dirname` 或 `fileURLToPath`
- [ ] CJS 引 ESM 只能用 `await import()`
- [ ] 顶层 `this` 在 ESM 是 undefined，别在模块顶层用 `this` 挂全局
- [ ] 需要 tree-shaking 的库优先 ESM 版本

---

## 8. 面试考点

### Q1：CommonJS 和 ES Modules 有什么区别？
CJS 是 Node 传统模块系统，同步加载、值拷贝导出、运行时确定依赖；ESM 是官方标准，异步/静态加载、live binding 引用导出、编译时确定依赖、可 tree-shake、前后端通用。

### Q2：CJS 导出是值拷贝还是引用？
CJS 是**值拷贝**——`require` 返回 `module.exports` 对象的引用，但如果你 `const { x } = require()` 解构，x 是当时的快照，模块内部后续改 x 拿不到。ESM 是 live binding，永远最新。

### Q3：为什么 ESM 能被 tree-shaking 而 CJS 不行？
ESM 的 `import/export` 是静态的，编译期就能确定完整依赖图，打包工具可分析哪些导出未被使用并删除。CJS 的 `require` 是运行时动态调用，依赖关系无法静态分析。

### Q4：ESM 顶层 this 是什么？为什么？
`undefined`。因为 ESM 设计上模块作用域不绑定到任何对象，避免隐式全局；而 CJS 顶层 `this === module.exports`。

### Q5：动态 import() 有什么用？
`import()` 是返回 Promise 的函数，可运行时按需加载（懒加载优化首屏）、条件加载、动态拼接路径。突破静态 import 必须顶层书写的限制。

### Q6：CJS 文件怎么引入 ESM 模块？
只能用动态 `import()`（因为 CJS 顶层不能 `await`，静态 `import` 会语法错误）。ESM 文件引入 CJS 通常可直接静态 `import`（Node 把 module.exports 当 default）。

### Q7：package.json 的 "type" 字段干嘛的？
决定 `.js` 文件按哪种模块系统解析：`"type": "module"` 下 `.js` 当作 ESM；缺省或 `"commonjs"` 当作 CJS。改用 `.mjs`/`.cjs` 扩展名可无视 type。

### Q8：require.cache 是什么？有什么用？
模块首次加载后会被缓存到 `require.cache`，再次 require 返回同一实例（模块顶层代码只跑一次）。测试时可 `delete require.cache[require.resolve(x)]` 清缓存强制重新加载，实现配置热更新。

---

> **本章小结**：模块系统有 CJS（Node 传统、值拷贝、运行时）和 ESM（官方标准、live binding、编译时、可 tree-shake）两套。新项目推荐 ESM，注意 ESM 没有 `__dirname`、顶层 `this` 为 undefined、CJS 引 ESM 只能用 `import()`。下一章 **1.3 核心模块深入学习** 将实操 fs/path/http/events/stream/buffer 这些 Node 内置能力。
