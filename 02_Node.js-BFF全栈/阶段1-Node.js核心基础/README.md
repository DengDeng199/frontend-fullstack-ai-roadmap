# 阶段1 — Node.js 核心基础

> 预计时间：第 4-6 个月
> 目标水平：L3 精通
> 每日投入：工作日 1h + 周末 3h
> 前置依赖：完成前端阶段1 JS 语言深度

---

## 学习目标

掌握 Node.js 运行时核心机制，理解与服务端开发相关的基础概念，为后续 Nest.js 框架学习打下基础。

---

## 学习内容

### 1.1 Node.js 架构概览

- **V8 引擎**：JavaScript 执行、JIT 编译、垃圾回收
- **Libuv**：C 语言编写的异步 I/O 库
  - 事件循环（Event Loop）
  - 线程池（Thread Pool）
  - 异步 I/O 操作封装
- **单线程模型**：
  - 主线程（Event Loop）— 处理事件循环
  - Worker Threads（工作线程）— CPU 密集型任务
  - 为什么单线程也能高并发
- **Node.js 与浏览器的区别**：
  - 没有 DOM / BOM
  - 有文件系统 / 网络 / 进程管理等 API
  - 全局对象：global vs window

### 1.2 模块系统

- **CommonJS（CJS）**：
  - `require()` — 同步加载
  - `module.exports` — 导出
  - `__dirname` / `__filename`
  - `require.cache` — 模块缓存
- **ES Modules（ESM）**：
  - `import / export` — 静态分析
  - `"type": "module"` 在 package.json 中启用
  - `import.meta.url` / `import.meta.dirname`
- **CJS vs ESM 差异**：
  - CJS 值拷贝 vs ESM 值引用（live binding）
  - CJS 运行时加载 vs ESM 编译时确定
  - ESM 顶部 this 为 undefined
- **动态 import()**：运行时按需加载

### 1.3 核心模块深入学习

**fs 文件系统**：
- `fs.readFile / fs.writeFile` — 回调方式
- `fs.promises.readFile / writeFile` — Promise 方式（推荐）
- `fs.createReadStream / createWriteStream` — 流式读写
- `fs.watch / fs.watchFile` — 文件监听
- `fs.stat / fs.access` — 文件信息与权限检查

**path 路径处理**：
- `path.join()` — 路径拼接
- `path.resolve()` — 绝对路径解析
- `path.extname()` — 扩展名
- `path.parse()` — 路径解析
- `path.dirname()` / `path.basename()`

**http 模块**：
- `http.createServer()` — 创建服务器
- `req` 对象：method / url / headers
- `res` 对象：statusCode / setHeader / end
- 静态文件服务实现（MIME 类型识别）
- 请求体解析（Buffer 拼接 + JSON.parse）

**events 事件模块**：
- `EventEmitter` 类
- `on / emit / once / off` 方法
- 事件监听器数量限制（maxListeners）
- 错误事件（error 事件不监听会抛异常）

**stream 流**：
- 四种流类型：Readable / Writable / Duplex / Transform
- `pipe()` — 管道连接
- 流的事件：data / end / error / finish / drain
- 背压（Backpressure）机制
- `Readable.from()` — 可迭代对象转流

**buffer 与编码**：
- `Buffer.alloc()` / `Buffer.from()`
- 编码格式：utf8 / ascii / base64 / hex
- Buffer 拼接与切片

### 1.4 Node.js Event Loop

**6 个阶段（按顺序执行）**：
1. **timers** — setTimeout / setInterval 回调
2. **pending callbacks** — I/O 回调
3. **idle, prepare** — 内部使用
4. **poll** — 获取新 I/O 事件
5. **check** — setImmediate 回调
6. **close callbacks** — close 事件回调

**微任务**：
- `process.nextTick()` — 优先级高于其他微任务
- `Promise.then()` — 在每个阶段完成后执行

**与浏览器 Event Loop 的关键差异**：
- Node.js 有多个宏任务队列（timers / I/O / check）
- `setImmediate` vs `setTimeout(fn, 0)` 的执行顺序取决于阶段
- `process.nextTick` 优先级高于 Promise microtask

### 1.5 错误处理

- **try-catch**：同步代码错误捕获
- **Error-first callback**：`callback(err, result)` 约定
- **Promise .catch()**：异步错误捕获
- **async/await try-catch**：推荐方式
- **unhandledRejection** / **uncaughtException**：全局兜底
- **自定义错误类**：继承 Error

### 1.6 包管理

- **npm / pnpm / yarn** 常用命令对比
- **package.json 字段详解**：
  - dependencies vs devDependencies vs peerDependencies
  - main / module / exports / bin / scripts
  - engines / browserslist
- **依赖版本管理**：
  - ^1.2.3（兼容 1.x.x）/ ~1.2.3（兼容 1.2.x）/ 1.2.3（精确版本）
  - package-lock.json / pnpm-lock.yaml

---

## 实战产出（必须完成）

| 编号 | 产出 | 验收标准 |
|------|------|---------|
| 1 | 静态文件服务器 | 用 http + fs 实现目录浏览、MIME 识别 |
| 2 | 大文件 Stream 读写 | 用 Stream 处理 GB 级文件不爆内存 |
| 3 | 手写 EventEmitter | 含 on/off/once/emit |
| 4 | CLI 工具 | 如文件批量重命名 / 日志分析工具 |

---

## 推荐资源

### 书籍
- 《Node.js 设计模式》第 2 版 — **必读**
- 朴灵《深入浅出 Node.js》

### 在线
- Node.js 官方文档 (nodejs.org/docs/latest/api/)
- Node.js 最佳实践 (github.com/goldbergyoni/nodebestpractices)

---

## 检验标准

- [ ] 能解释 Node.js 事件循环的 6 个阶段和执行顺序
- [ ] 能说出 Node.js 与浏览器 Event Loop 的 5 点差异
- [ ] 能用 Stream 处理大文件读写
- [ ] 能用原生 http 模块写一个静态文件服务器
- [ ] 理解 CJS 和 ESM 的核心差异

---

> **下一阶段**：完成本阶段后，进入「阶段2-Nest.js 框架实战」
