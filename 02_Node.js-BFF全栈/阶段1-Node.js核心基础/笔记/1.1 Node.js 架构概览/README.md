# 1.1 Node.js 架构概览

> 阶段 1 — Node.js 核心基础 / 第 1 章
> 核心目标：搞懂 Node.js 不是「一门语言」而是「运行时」，理解 V8 + Libuv + 单线程事件循环如何协作，建立服务端思维。

---

## 目录

1. [Node.js 是什么](#1-nodejs-是什么)
2. [整体架构分层](#2-整体架构分层)
3. [V8 引擎](#3-v8-引擎)
4. [Libuv：异步 I/O 的基石](#4-libuv异步-io-的基石)
5. [单线程模型与高并发之谜](#5-单线程模型与高并发之谜)
6. [Node.js 与浏览器的区别](#6-nodejs-与浏览器的区别)
7. [caidiaweb / BFF 视角](#7-caidiaweb--bff-视角)
8. [面试考点](#8-面试考点)

---

## 1. Node.js 是什么

> 一句话：**Node.js 是一个基于 Chrome V8 引擎的 JavaScript 运行时（Runtime），让 JS 能脱离浏览器跑在服务端。**

```
┌─────────────────────────────────────────────┐
│            写业务代码（JavaScript）           │
├─────────────────────────────────────────────┤
│  Node.js 内置 API：fs / http / path / events │  ← 浏览器没有的
├─────────────────────────────────────────────┤
│  Libuv        → 事件循环 / 线程池 / 异步 I/O  │
├─────────────────────────────────────────────┤
│  V8 引擎       → 编译执行 JavaScript           │
├─────────────────────────────────────────────┤
│  操作系统：Linux / Windows / macOS            │
└─────────────────────────────────────────────┘
```

| 常见误解 | 正确认知 |
|---------|---------|
| Node.js 是一门新语言 | ❌ 它跑的还是 JavaScript |
| Node.js 只能做后端 | ❌ 也能写 CLI、桌面（Electron）、构建工具 |
| Node.js 天生多线程 | ❌ 主线程是**单线程**事件循环，I/O 靠 Libuv 线程池 |
| Node.js 比 Java 慢 | ⚠️ I/O 密集场景更快，CPU 密集需 Worker Threads |

---

## 2. 整体架构分层

Node.js 从外到内分为四层：

```
┌──────────────────────────────────────────────────────────┐
│ ① 你的 JavaScript 应用代码（业务层）                       │
│    import fs from 'fs'; fs.readFile(...)                  │
├──────────────────────────────────────────────────────────┤
│ ② Node.js 标准库（JS + C++ 绑定）                          │
│    fs / http / net / crypto / stream ...                  │
│    ├─ 部分纯 JS 实现（如 events）                          │
│    └─ 部分 C++ 绑定（如 fs 底层调用操作系统）               │
├──────────────────────────────────────────────────────────┤
│ ③ 核心依赖库                                              │
│    ├─ V8         （Google，C++）JavaScript 引擎           │
│    ├─ Libuv      （C）异步 I/O / 事件循环 / 线程池         │
│    ├─ llhttp     （C）HTTP 解析器                          │
│    ├─ OpenSSL    （C）加密 / TLS                           │
│    ├─ c-ares     （C）DNS 解析                             │
│    └─ zlib       （C）压缩                                 │
├──────────────────────────────────────────────────────────┤
│ ④ 操作系统（Linux / macOS / Windows）                     │
└──────────────────────────────────────────────────────────┘
```

> **关键认知**：Node.js 把「JS 引擎」+「操作系统能力」用 Libuv 这个中间层缝合起来。你写的 JS 只是冰山一角，下面全靠 C/C++ 干活。

---

## 3. V8 引擎

### 3.1 V8 负责什么

V8 是 Google 用 C++ 写的开源 JS 引擎，Chrome 和 Node.js 都用它。它负责：

1. **解析（Parse）**：把 JS 源码 → 抽象语法树（AST）
2. **编译（JIT）**：AST → 字节码 → 机器码（即时编译）
3. **执行**：在 CPU 上跑机器码
4. **垃圾回收（GC）**：自动管理内存

### 3.2 JIT 编译（即时编译）

```
源码 ──▶ Parser ──▶ AST ──▶ Ignition(解释器) ──▶ 字节码
                                              │
                              TurboFan(编译器) │ 热点代码（执行多次）
                                              ▼
                                          机器码（优化后）
```

| 阶段 | 角色 | 特点 |
|------|------|------|
| Ignition | 解释器 | 启动快，直接执行字节码 |
| TurboFan | 优化编译器 | 把反复执行的「热点函数」编译成高效机器码 |
| 去优化（Deopt） | 兜底 | 假设失败时回退到字节码（如类型变了） |

> **为什么 Node 启动快**：Ignition 先跑字节码，不必等全量编译完成；热点代码才被 TurboFan 编译。

### 3.3 垃圾回收（GC）简述

V8 用**分代式 GC**：

```
┌─────────────┐  ┌──────────────────────────┐
│ 新生代 (Young)│  │ 老生代 (Old)              │
│ 存放短命对象  │  │ 存放存活久的对象           │
│ Scavenge 算法 │  │ Mark-Sweep / Mark-Compact │
│ 很快（复制）  │  │ 较慢（标记-整理）          │
└─────────────┘  └──────────────────────────┘
```

- **新生代**：新对象，存活一次就晋升到老生代。用 Scavenge（复制算法），极快。
- **老生代**：长期存活对象。用 Mark-Sweep（标记清除）+ Mark-Compact（标记整理）防止内存碎片。

> **前端关联**：你之前在阶段 3「3.5 内存优化」学的闭包泄漏、Detached DOM，本质就是对象无法被 GC 回收。Node 端同理——全局变量持有大对象会撑爆老生代。

### 3.4 内存上限

V8 默认有堆内存上限（防单个进程吃光内存）：

| 环境 | 默认上限 |
|------|---------|
| 老版 Node（<12） | 约 1.4 GB（64 位） |
| 新版 Node | 老生代约 2 GB，新生代约 0.25 GB（会随内存自动调整） |

处理大文件/大数组时若报 `heap out of memory`，用流式（Stream）而非一次性读入内存。

---

## 4. Libuv：异步 I/O 的基石

> Libuv 是 Node.js 高性能的**真正秘密**。它是 C 写的跨平台异步 I/O 库，封装了事件循环、线程池和各类系统调用。

### 4.1 Libuv 的三件大事

```
┌─────────────────────────────────────────────┐
│                Libuv 核心                      │
│                                               │
│  ① 事件循环 Event Loop  ──▶ 调度回调（单线程）  │
│       │                                       │
│       ├──▶ ② 线程池 Thread Pool               │
│       │       （默认 4 个线程，处理阻塞操作）   │
│       │       · 文件 I/O（fs.*）              │
│       │       · DNS 解析（c-ares 同步部分）    │
│       │       · 压缩（zlib）                  │
│       │                                       │
│       └──▶ ③ 异步 I/O 封装                    │
│               · epoll / kqueue / IOCP         │
│               · 网络 I/O（不占线程池，OS 级）  │
└─────────────────────────────────────────────┘
```

### 4.2 事件循环（Event Loop）

事件循环是 Libuv 的「心跳」，不断检查「有没有事情要做」。它在一个**单线程**里跑宏任务队列：

```
   ┌──── 无限循环 ────┐
   │                  │
   ▼                  │
┌──────────────────────────┐
│ timers        执行 setTimeout/setInterval │
│ pending cb    执行推迟的 I/O 回调          │
│ idle/prepare  内部使用                     │
│ poll          取新 I/O 事件（核心）         │
│ check         执行 setImmediate            │
│ close cb      执行 close 事件              │
└──────────────────────────┘
   │
   └──────────── 回到顶部
```

> 注意：这是**整体架构的宏观事件循环**（Libuv 层）。微任务（Promise / process.nextTick）在每个阶段切换时穿插执行。1.4 章节会讲 6 阶段细节，这里先建立「单线程 + 队列」的直觉。

### 4.3 线程池（Thread Pool）

- 默认 **4 个线程**（`UV_THREADPOOL_SIZE` 环境变量可改，最大 1024）。
- 处理**会阻塞主线程**的操作：文件读写、DNS、压缩。
- 网络 I/O（HTTP 请求、数据库 TCP 连接）**不走线程池**，而是用 OS 原生的异步机制（epoll/kqueue/IOCP），因此并发连接极多也不占线程。

### 4.4 异步 I/O 封装

Libuv 在不同 OS 上用不同机制实现「非阻塞」：

| 操作系统 | 机制 |
|---------|------|
| Linux | epoll |
| macOS | kqueue |
| Windows | IOCP |

Node.js 帮你屏蔽了这些差异——**同一套 JS API，跨平台异步 I/O**。

---

## 5. 单线程模型与高并发之谜

### 5.1 单线程指的是什么

```
┌──────────────────────────────────────────┐
│ 主线程（单线程）                           │
│   Event Loop 不断转：取任务 → 执行回调     │
│   你的 JS 业务代码全在这里串行执行         │
└──────────────────────────────────────────┘
        │ 遇到 I/O 时委托给 ↓
┌──────────────────────────────────────────┐
│ Libuv 线程池（4 个线程）                    │
│   文件读写 / DNS / 压缩（真正的并行）       │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ Worker Threads（可选，显式开启）            │
│   把 CPU 密集计算（加密/图像处理）移出去    │
└──────────────────────────────────────────┘
```

**「单线程」仅指执行 JS 业务代码的主线程是单线程**。真正的 I/O 并行靠 Libuv 线程池和 OS 异步机制。

### 5.2 为什么单线程还能高并发

```
传统服务端（如 Apache + PHP）：
   每来 1 个请求 → 开 1 个线程/进程 → 阻塞等 I/O → 线程空转等磁盘
   10000 并发 = 10000 线程 = 内存爆炸 + 上下文切换开销大

Node.js：
   1 个主线程 + 事件循环
   请求进来 → 注册回调 → 立刻去接下一个请求（不阻塞）
   I/O 完成 → Libuv 通知 → 回调回到主线程执行
   10000 并发 = 仍是 1 个主线程 + 少量线程池线程
```

| 对比 | 多线程阻塞模型 | Node 单线程事件循环 |
|------|---------------|-------------------|
| 并发成本 | 每连接一个线程（重） | 几乎零额外线程（轻） |
| I/O 等待 | 线程阻塞空转 | 主线程去接新请求 |
| 上下文切换 | 频繁、昂贵 | 极少 |
| 适用 | CPU 密集 | **I/O 密集**（Web / API / BFF） |

### 5.3 单线程的代价

单线程不是银弹，**CPU 密集任务会卡死整个事件循环**：

```js
// ❌ 致命：主线程被长计算占满，所有请求都排不上队
function fib(n) { return n < 2 ? n : fib(n-1) + fib(n-2); }
app.get('/calc', (req, res) => {
  const r = fib(45); // 算 10 秒，期间服务器「假死」
  res.json({ r });
});

// ✅ 解法 1：Worker Threads 把计算移到子线程
// ✅ 解法 2：拆分任务 + setImmediate 让出事件循环
// ✅ 解法 3：用已有 C++ 扩展 / 现成库（它们内部已用线程池）
```

### 5.4 Worker Threads

```js
// main.js
import { Worker } from 'worker_threads';
const worker = new Worker('./calc-worker.js');
worker.postMessage(45);
worker.on('message', (r) => console.log('结果', r));

// calc-worker.js
import { parentPort } from 'worker_threads';
parentPort.on('message', (n) => {
  parentPort.postMessage(fib(n)); // 重计算在子线程，不卡主线程
});
```

| 对比 | Cluster（多进程） | Worker Threads（多线程） |
|------|------------------|------------------------|
| 内存 | 各自独立（重） | 共享内存（轻） |
| 通信 | IPC 序列化 | `SharedArrayBuffer` / `MessageChannel` |
| 场景 | 利用多核 CPU 起多实例 | CPU 密集计算卸载 |

---

## 6. Node.js 与浏览器的区别

### 6.1 能力矩阵

| 能力 | 浏览器 | Node.js |
|------|--------|---------|
| DOM / BOM | ✅ | ❌ |
| `window` / `document` | ✅ | ❌ |
| 文件系统 `fs` | ❌ | ✅ |
| 网络 `http` / `net` | 受限（CORS） | ✅ 自由 |
| 进程管理 `process` / `child_process` | ❌ | ✅ |
| 环境变量 | ❌ | ✅ `process.env` |
| 全局对象 | `window` | `globalThis` / `global` |
| 模块化 | ESM（原生） | CJS + ESM |

### 6.2 全局对象差异

```js
// 浏览器
console.log(window === globalThis); // true
console.log(this === window);       // true（顶层）

// Node.js（CJS 模块内）
console.log(global === globalThis); // true
console.log(this === module.exports); // true（模块顶层 this 指向 exports，不是 global）

// Node.js（ESM 模块内）
console.log(this); // undefined（顶层 this 为 undefined）
```

### 6.3 没有 DOM/BOM 意味着什么

你在前端写的 `document.querySelector`、`window.addEventListener('resize')` 在 Node 端**全部报错**。反过来，Node 端的 `fs.readFile`、创建 HTTP 服务器在浏览器端没有。

> **思维转换**：浏览器 JS 围绕「操作页面」；Node JS 围绕「操作文件/网络/进程」。这正是 BFF（Backend For Frontend） layer 的价值——用 JS 把后端数据加工成前端想要的形状。

---

## 7. caidiaweb / BFF 视角

### 7.1 Node 在 caidiaweb 技术栈的位置

```
前端（Vue + ECharts）
      │  HTTP 请求
      ▼
┌──────────────────────────┐
│ BFF 层（Node.js / Nest.js）│  ← 你下一阶段要学的
│  · 聚合多个后端接口        │
│  · 数据处理/裁剪字段       │
│  · 鉴权 / 限流             │
└──────────────────────────┘
      │
      ▼
后端微服务（Java / Go）
```

### 7.2 为什么 caidiaweb 适合用 Node 做 BFF

| 需求 | Node 优势 |
|------|----------|
| 聚合监测站 + 设备 + 告警多个接口 | I/O 密集，Node 事件循环天生擅长 |
| 把后端大 JSON 裁剪成大屏所需字段 | JS 操作 JSON 零成本（同语言） |
| 实时数据推送（WebSocket） | 单线程事件循环 + `ws` 库轻松支撑万级连接 |
| 对接前端团队 | 同一套 JS，前后端复用类型/工具 |

### 7.3 一个 BFF 聚合示例（提前感受）

```js
// BFF 把 3 个后端接口聚合成 1 个前端友好的响应
import express from 'express';
const app = express();

app.get('/api/dashboard/:stationId', async (req, res) => {
  // 三个请求并行发出（不阻塞，事件循环去接别的请求）
  const [station, devices, alarms] = await Promise.all([
    fetch(`${BACKEND}/stations/${req.params.stationId}`).then(r => r.json()),
    fetch(`${BACKEND}/stations/${req.params.stationId}/devices`).then(r => r.json()),
    fetch(`${BACKEND}/alarms?stationId=${req.params.stationId}`).then(r => r.json()),
  ]);

  // 裁剪字段，只返回大屏需要的
  res.json({
    name: station.name,
    deviceCount: devices.length,
    onlineRate: devices.filter(d => d.online).length / devices.length,
    alarms: alarms.slice(0, 10), // 只取前 10 条
  });
});
```

> 这个例子体现了 Node 的精髓：**I/O 并行 + JSON 原生处理 + 同语言对接前端**。

---

## 8. 面试考点

### Q1：Node.js 是单线程还是多线程？
**主线程是单线程**（执行 JS 业务代码的事件循环），但 Libuv 有默认 4 个线程的线程池处理文件 I/O / DNS / 压缩，网络 I/O 走 OS 级异步。所以「单线程」是相对的。

### Q2：Node.js 为什么能高并发？
因为**非阻塞 I/O + 事件循环**：遇到 I/O 不等待，立刻注册回调去处理下一个请求；I/O 完成后由 Libuv 通知，回调回到主线程。避免了多线程模型的线程创建/切换开销，特别适合 I/O 密集场景。

### Q3：Node.js 由哪些部分组成？
V8 引擎（执行 JS）+ Libuv（事件循环/线程池/异步 I/O）+ 标准库（fs/http 等）+ 其他 C/C++ 依赖（llhttp、OpenSSL、zlib 等）。

### Q4：V8 的 JIT 编译是什么？
Ignition 先把 JS 编译成字节码快速执行；TurboFan 把反复执行的「热点函数」优化编译成机器码。假设失败会去优化回退到字节码。兼顾启动速度与运行效率。

### Q5：CPU 密集任务会怎样？怎么解决？
会长时间占用主线程，事件循环卡住，所有请求无法响应（「假死」）。解法：Worker Threads 卸载计算、拆分任务让出事件循环、或用已有 C++ 扩展。

### Q6：Node.js 和浏览器的全局对象、能力有何不同？
浏览器有 `window`/`document`（DOM/BOM），没有文件系统；Node 有 `global`/`process`/`fs`/`http`，没有 DOM/BOM。模块化两者都支持 ESM，但 Node 还兼容 CJS。

### Q7：Libuv 线程池默认几个线程？处理什么？
默认 4 个（可经 `UV_THREADPOOL_SIZE` 调整）。处理文件 I/O、DNS 解析、zlib 压缩等会阻塞的操作。**网络 I/O 不走线程池**（走 OS 异步机制）。

### Q8：为什么 Node 不适合纯 CPU 密集场景？
单线程事件循环意味着一次只能跑一个 JS 任务。CPU 密集计算（如大循环、复杂加密）会独占主线程，拖累所有并发请求。这类场景更适合 Java/Go 多线程，或用 Node 的 Worker Threads 隔离。

---

> **本章小结**：Node.js = V8（跑 JS）+ Libuv（事件循环 + 线程池 + 异步 I/O）+ 标准库。单线程指的是执行 JS 的主线程，高并发靠的是「非阻塞 I/O + 事件循环」而非多线程。理解这套架构，你就能解释「为什么 Node 适合做 BFF / API 网关」，也能预判「什么场景会卡死服务器」。下一章 **1.2 模块系统** 将深入 CJS 与 ESM 的差异与实战。
