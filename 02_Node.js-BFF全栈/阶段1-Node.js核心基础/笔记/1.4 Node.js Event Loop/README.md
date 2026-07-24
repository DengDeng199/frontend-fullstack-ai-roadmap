# 1.4 Node.js Event Loop

> 阶段 1 — Node.js 核心基础 / 第 4 章
> 核心目标：彻底搞懂 Node 事件循环的 6 个阶段、宏任务/微任务的执行顺序，理解它与浏览器 Event Loop 的差异——这是面试高频题，也是排查异步 bug 的底层基础。

---

## 目录

1. [为什么需要 Event Loop](#1-为什么需要-event-loop)
2. [Event Loop 的 6 个阶段](#2-event-loop-的-6-个阶段)
3. [微任务：nextTick 与 Promise](#3-微任务nexttick-与-promise)
4. [一次完整 tick 的执行顺序](#4-一次完整-tick-的执行顺序)
5. [经典例题](#5-经典例题)
6. [与浏览器 Event Loop 的差异](#6-与浏览器-event-loop-的差异)
7. [caidiaweb / BFF 实践](#7-caidiaweb--bff-实践)
8. [面试考点](#8-面试考点)

---

## 1. 为什么需要 Event Loop

> 回顾 1.1：Node 主线程是单线程，靠「非阻塞 I/O + 事件循环」支撑高并发。Event Loop 就是那个**不停转的调度器**——从任务队列取回调执行，让单线程「看起来」在同时处理很多事。

```
主线程执行栈空了 ↓
Event Loop 启动一轮循环 ↓
  按阶段顺序取出该阶段的回调执行 ↓
  阶段间穿插执行微任务 ↓
一轮结束，检查是否还有待处理 ↓
  是 → 继续下一轮；否 → 进程退出
```

> **进程何时退出**：当没有待处理的定时器、I/O、句柄时，Event Loop 停止，进程退出。这也是「为啥 Node 程序不写东西就退出了」——没有挂住的异步任务。

---

## 2. Event Loop 的 6 个阶段

> 每一轮循环按**固定顺序**走过 6 个阶段，每个阶段有自己的回调队列（FIFO）。

```
┌─────────────────────────── 一轮循环 ───────────────────────────┐
│                                                                │
│  ① timers                                                     │
│     └─ 执行 setTimeout / setInterval 到期的回调               │
│                                                                │
│  ② pending callbacks                                          │
│     └─ 执行上一轮推迟的 I/O 回调（如 TCP 错误）                │
│                                                                │
│  ③ idle, prepare                                             │
│     └─ 内部使用（开发者一般碰不到）                             │
│                                                                │
│  ④ poll （核心阶段）                                          │
│     └─ 检索新的 I/O 事件（文件/网络）                          │
│     └─ 执行 I/O 回调（除 close/timer/check 外的几乎所有回调）  │
│     └─ 若队列空且无可执行 timer → 在此停留等待新 I/O           │
│                                                                │
│  ⑤ check                                                      │
│     └─ 执行 setImmediate 回调                                 │
│                                                                │
│  ⑥ close callbacks                                           │
│     └─ 执行 close 事件回调（如 socket.on('close')）           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
        ↑ 一轮结束后回到 ① 继续，直到无任务可处理
```

| 阶段 | 执行什么 | 常见来源 |
|------|---------|---------|
| timers | `setTimeout`/`setInterval` 到期回调 | 延时任务 |
| pending | 推迟的 I/O 回调 | 系统错误回调 |
| poll | **新的 I/O 事件回调**（文件/网络/子进程） | fs/http 回调 |
| check | `setImmediate` 回调 | 当前轮 I/O 后立即执行 |
| close | `close` 事件 | socket 关闭 |

---

## 3. 微任务：nextTick 与 Promise

> 微任务**不在 6 个阶段里**，而是在「每个阶段切换的间隙」清空。微任务优先级高于下一阶段的宏任务。

### 3.1 两类微任务

| 微任务 | 优先级 | 说明 |
|--------|--------|------|
| `process.nextTick()` | **最高** | 不在 Event Loop 队列，独立队列，**本轮任何阶段前都优先清空** |
| `Promise.then()` / `queueMicrotask` | 次之 | 标准微任务，阶段间清空 |

### 3.2 微任务执行时机

```
阶段执行中产生了微任务
   ↓
该阶段**当前回调**执行完
   ↓
立即清空微任务队列（Promise.then 等）
   ↓
若微任务里又产生 nextTick → 继续插队（nextTick 优先于 Promise 微任务）
   ↓
微任务清空后，才进入下一阶段
```

> **关键**：`process.nextTick` 的回调会在「当前操作完成后、Event Loop 继续前」立即执行，比 Promise 微任务还早。滥用 nextTick 会「饿死」I/O（因为总插队）。

```js
Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('nextTick'));
console.log('sync');
// 输出：sync → nextTick → promise
// 解释：sync 先（同步）→ nextTick（最高微任务）→ promise（标准微任务）
```

---

## 4. 一次完整 tick 的执行顺序

```
同步代码（栈）
   ↓
（栈空）清空所有 nextTick 队列
   ↓
清空所有 Promise 微任务队列
   ↓
进入 timers 阶段，执行到期的 setTimeout/setInterval
   ↓
阶段末：再清空 nextTick + Promise 微任务
   ↓
pending callbacks → idle/prepare → poll
   ↓
poll 阶段：执行 I/O 回调 + 阶段末微任务清空
   ↓
check 阶段：执行 setImmediate
   ↓
close callbacks
   ↓
一轮结束 → 下一轮（若还有任务）
```

**记忆口诀**：
> **同步代码先跑完，nextTick 最优先，Promise 微任务随后，然后才进 6 阶段，每阶段结束再清一遍微任务。**

---

## 5. 经典例题

### 例 1：setTimeout vs setImmediate

```js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
```

**结果不确定**，取决于 Event Loop 启动耗时：
- 若 Node 准备时间 > 1ms：`setTimeout` 在 timers 阶段先到期 → 输出 `timeout → immediate`
- 若 < 1ms：`setTimeout` 还没到期，先到 check 阶段 → 输出 `immediate → timeout`

> 但若把两者放进 **I/O 回调（poll 阶段）内**：

```js
const fs = require('fs');
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});
// 一定输出：immediate → timeout
// 因为 poll 阶段之后紧接 check 阶段，setImmediate 先执行
```

### 例 2：nextTick 与 Promise 混合

```js
Promise.resolve().then(() => console.log('p1'));
process.nextTick(() => console.log('n1'));
Promise.resolve().then(() => console.log('p2'));
process.nextTick(() => console.log('n2'));
// 输出：n1 → n2 → p1 → p2
// nextTick 全部优先于 Promise 微任务
```

### 例 3：综合顺序

```js
console.log('start');                 // 同步
setTimeout(() => console.log('T1'), 0);
Promise.resolve().then(() => console.log('P1'));
process.nextTick(() => console.log('N1'));
setImmediate(() => console.log('I1'));
console.log('end');                   // 同步

// 输出：
// start → end → N1 → P1 → T1 → I1
```

---

## 6. 与浏览器 Event Loop 的差异

| 维度 | 浏览器 | Node.js |
|------|--------|---------|
| 宏任务队列 | 多个（task queue） | **6 个阶段**，每阶段一个队列 |
| 微任务 | Promise/MutationObserver | Promise + `process.nextTick` |
| nextTick | 无 | **有，优先级高于 Promise** |
| setTimeout(0) vs setImmediate | 一般 timeout 先 | **不确定**（同例1） |
| 渲染 | 每轮可能渲染 | 无渲染概念 |

> **最大差异**：Node 把宏任务拆成 6 个有序阶段（timers/poll/check…），浏览器只是笼统的 task queue；且 Node 独有 `process.nextTick`（优先级高于 Promise 微任务），浏览器没有。

---

## 7. caidiaweb / BFF 实践

### 7.1 用 nextTick 错开重计算（防饿死 I/O）

```js
// 不阻塞当前 I/O 回调，让其他 I/O 先处理
function processBatch(items, done) {
  if (items.length === 0) return done();
  const item = items.shift();
  handle(item);
  process.nextTick(() => processBatch(items, done)); // 让出，给其他事件
}
```

### 7.2 避免「sync 处理」卡死事件循环

```js
// ❌ 大数组同步处理，期间所有请求排不上
app.get('/calc', (req, res) => {
  const r = hugeArray.map(heavyCompute); // 卡住事件循环
  res.json(r);
});

// ✅ 分批 + nextTick 让出，或使用 Worker Threads（见 1.1）
function processChunk(arr, i = 0, res) {
  const end = Math.min(i + 1000, arr.length);
  for (; i < end; i++) arr[i] = heavyCompute(arr[i]);
  if (i < arr.length) process.nextTick(() => processChunk(arr, i, res));
  else res.json(arr);
}
```

### 7.3 排查异步 bug 的心态

- 回调「不按顺序」→ 先判断它属于哪个阶段（timer/IO/check）。
- `setImmediate` 想「当前 I/O 后立即做」用它；`setTimeout(0)` 想「尽快但下一轮 timer 阶段」用它。
- 别滥用 `nextTick` 递归——会饿死 I/O 阶段。

---

## 8. 面试考点

### Q1：Node 事件循环有几个阶段？按顺序说。
6 个阶段，按序：① timers（setTimeout/setInterval）② pending callbacks（推迟的 I/O 回调）③ idle/prepare（内部）④ poll（检索新 I/O、执行 I/O 回调，核心阶段）⑤ check（setImmediate）⑥ close callbacks（close 事件）。

### Q2：process.nextTick 和 Promise.then 谁先执行？
`process.nextTick` 先。nextTick 有独立队列，在本轮任何操作完成后、Event Loop 继续前立即清空，优先级高于 Promise 微任务。

### Q3：setTimeout(fn,0) 和 setImmediate 谁先？
不确定。取决于 Node 启动耗时：准备 >1ms 则 timer 先；<1ms 则先到 check 阶段 immediate 先。但若两者在 I/O 回调（poll 阶段）内，则一定 immediate 先（poll 之后紧跟 check）。

### Q4：Node 和浏览器 Event Loop 的核心差异？
① Node 宏任务拆成 6 个有序阶段，浏览器是笼统 task queue；② Node 独有 `process.nextTick` 且优先级高于 Promise；③ 浏览器每轮可能渲染，Node 无渲染概念；④ `setTimeout(0)` vs `setImmediate` 顺序语义不同。

### Q5：为什么滥用 nextTick 会饿死 I/O？
因为 nextTick 队列总在阶段切换前插队清空，若在 nextTick 回调里又加 nextTick（递归），Event Loop 永远进不到 poll 阶段处理 I/O，导致 I/O 回调迟迟不执行。

### Q6：同步代码、微任务、宏任务的输出顺序？
同步代码 → nextTick 队列 → Promise 微任务 → 进入 6 阶段（timers 起）→ 每阶段结束再清微任务 → 直到任务清空。口诀：同步先跑，nextTick 最优先，Promise 随后，再进阶段。

### Q7：poll 阶段是干什么的？
检索新的 I/O 事件（文件/网络/子进程），执行除 close/timer/check 之外的几乎所有 I/O 回调。若队列空且无可执行 timer，会在 poll 停留等待新 I/O（这是 Event Loop 的「心脏」）。

### Q8：Node 进程什么时候退出？
当没有待处理的定时器、I/O 句柄、请求时，Event Loop 停止，进程退出。这解释了不挂异步任务的小脚本执行完就退出了。

---

> **本章小结**：Event Loop 是 Node 单线程高并发的调度核心——6 个阶段（timers→pending→idle→poll→check→close）按序循环，每个阶段执行自己的宏任务队列；微任务（nextTick 最高、Promise 次之）在阶段间隙清空。**setTimeout vs setImmediate 顺序不确定**（I/O 内则 immediate 先），nextTick 优先级高于 Promise。下一章 **1.5 错误处理** 将讲如何在异步世界里兜住错误，不让一个异常拖垮整个服务。
