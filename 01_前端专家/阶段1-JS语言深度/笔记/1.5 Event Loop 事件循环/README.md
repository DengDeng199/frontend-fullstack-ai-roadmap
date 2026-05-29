# Event Loop 事件循环 完整精讲文档（含实战案例\+执行顺序）

**核心前置认知**：JavaScript 是**单线程**语言，同一时间只能做一件事。为了实现异步非阻塞、避免代码阻塞页面，JS 通过 **调用栈 \+ 微任务队列 \+ 宏任务队列 \+ 事件循环** 机制调度代码执行，是 JS 异步编程的底层核心。

**终极执行口诀**：同步代码优先执行 → 清空所有微任务 → 执行一轮宏任务 → 循环往复

## 一、事件循环三大核心组件

### 1\. 调用栈（Call Stack）

调用栈是 JS 引擎执行代码的**主线程栈结构**，遵循**后进先出（LIFO）** 规则。

- 所有**同步代码**会直接进入调用栈，立即执行；

- 异步代码不会阻塞调用栈，会被移出主线程，交给浏览器/Node 后台线程处理；

- 调用栈**清空**是进入微任务、宏任务执行的前置条件。

**栈溢出场景**：递归无终止条件，会导致调用栈堆积，触发 `Maximum call stack size exceeded`。

### 2\. 宏任务队列（Macrotask Queue / Task Queue）

宏任务是**耗时较长、优先级较低**的异步任务，异步任务完成后，回调函数会进入宏任务队列排队。

**常见宏任务**：

- 定时器：`setTimeout`、`setInterval`

- IO 操作：文件读写、网络请求（Ajax/fetch）

- 浏览器专属：UI 渲染、用户交互事件（click、resize 等）

**执行特点**：**一次事件循环只执行一个宏任务**。

### 3\. 微任务队列（Microtask Queue）

微任务是**轻量、优先级极高**的异步任务，用于处理高优先级的异步回调。

**常见微任务**：

- `Promise\.then / catch / finally`（核心常用）

- `queueMicrotask`（原生微任务 API）

- `MutationObserver`（浏览器 DOM 监听）

**执行特点**：调用栈清空后，**一次性清空所有微任务**，再执行宏任务。

## 二、宏任务 \&amp; 微任务 核心对比

|对比维度|微任务（Microtask）|宏任务（Macrotask）|
|---|---|---|
|执行优先级|极高（优先执行）|较低（后置执行）|
|执行规则|一次性清空队列所有任务|每轮循环只执行一个任务|
|典型场景|Promise、DOM 监听|定时器、IO、UI 渲染|
|执行速度|快、轻量|慢、相对耗时|

## 三、浏览器 Event Loop 完整执行顺序（必考）

### 1\. 标准执行流程

1. **第一步：执行所有同步代码**，直至调用栈清空；

2. **第二步：清空全部微任务队列**（依次执行所有微任务回调，微任务中产生的新微任务，继续插队执行）；

3. **第三步：执行一个宏任务**（队列最靠前的第一个宏任务）；

4. **第四步：循环往复**，重复上述步骤，形成事件循环。

**关键细节**：微任务执行期间产生的**新微任务**，会加入当前微任务队列，优先于宏任务执行。

### 2\. 基础实战案例（入门）

```javascript
console.log("1. 同步代码");

// 宏任务
setTimeout(() => {
  console.log("4. 宏任务 setTimeout");
}, 0);

// 微任务
Promise.resolve().then(() => {
  console.log("3. 微任务 Promise");
})

console.log("2. 同步代码");

// 输出顺序：1 → 2 → 3 → 4

```

**执行解析**：

1. 执行同步代码，依次打印 `1、2`；

2. 调用栈清空，执行微任务，打印 `3`；

3. 微任务清空，执行宏任务，打印 `4`。

### 3\. 进阶实战案例（嵌套微任务）

```javascript
console.log("1 同步");

setTimeout(() => {
  console.log("5 宏任务");
}, 0);

Promise.resolve().then(() => {
  console.log("2 第一层微任务");
  // 微任务中嵌套新微任务
  queueMicrotask(() => {
    console.log("3 嵌套微任务");
  })
})

console.log("4 同步");

// 输出顺序：1 → 4 → 2 → 3 → 5

```

**核心考点**：嵌套微任务依然属于当前微任务队列，优先于所有宏任务执行。

### 4\. 高阶实战案例（混合嵌套）

```javascript
console.log("start");

setTimeout(() => {
  console.log("timer1");
  Promise.resolve().then(() => {
    console.log("timer1-micro");
  })
}, 0);

Promise.resolve().then(() => {
  console.log("micro1");
  setTimeout(() => {
    console.log("timer2");
  }, 0)
})

console.log("end");

// 最终输出顺序：start → end → micro1 → timer1 → timer1-micro → timer2

```

**逐行解析**：

1. 同步代码执行：打印 `start、end`，调用栈清空；

2. 执行微任务：打印 `micro1`，同时新增宏任务 timer2；

3. 微任务队列清空，执行第一个宏任务 timer1，打印`timer1`；

4. timer1 中产生微任务，立即执行，打印 `timer1\-micro`；

5. 下一轮循环，执行剩余宏任务 timer2，打印 `timer2`。

## 四、Node\.js Event Loop（6 大阶段 \+ 浏览器差异）

浏览器与 Node\.js 的事件循环**底层机制完全不同**，Node 基于**libuv** 引擎实现，分为 6 个固定阶段，执行顺序更严谨。

### 1\. Node\.js 事件循环 6 大阶段（从上到下依次执行）

**完整执行顺序**：**timers → pending → idle/prepare → poll → check → close**

- **timers 阶段**：执行 `setTimeout、setInterval` 回调（最先执行的宏任务阶段）

- **pending 阶段**：执行延迟的 I/O 回调

- **idle/prepare 阶段**：系统内部调用，开发者无需关注

- **poll 阶段（核心）**：执行绝大多数 I/O 回调、获取新的 I/O 事件，阻塞等待新任务

- **check 阶段**：专门执行`setImmediate` 回调（独有宏任务）

- **close 阶段**：执行关闭回调（如 socket 关闭）

### 2\. Node 与浏览器 Event Loop 核心差异

- **队列机制不同**：浏览器是「微任务优先于所有宏任务」；Node 是**按阶段执行宏任务**，执行完一个阶段所有宏任务，再清空微任务队列；

- **微任务执行时机不同**：浏览器调用栈清空后立即清空微任务；Node 在**每个事件循环阶段结束后**，清空一次微任务队列；

- **宏任务优先级不同**：浏览器无阶段划分；Node 有固定阶段优先级（timers \&gt; poll \&gt; check）；

- **独有 API**：Node 独有 `setImmediate`（check 阶段执行），浏览器无；

- **定时器误差**：浏览器定时器受 UI 渲染影响；Node 定时器精度更高；

- **IO 执行逻辑**：Node 集中处理 I/O 回调，浏览器 I/O 回调归入普通宏任务。

### 3\. Node 专属经典案例（setTimeout vs setImmediate）

```javascript
// 场景1：全局直接执行
setTimeout(() => {
  console.log("setTimeout");
}, 0);

setImmediate(() => {
  console.log("setImmediate");
});

// 结果：输出顺序**不确定**
// 原因：Node 初始化有耗时，若初始化完成 < 1ms，setImmediate 先执行；否则 setTimeout 先执行

```

```javascript
// 场景2：放入 I/O 回调中（顺序固定）
const fs = require("fs");
fs.readFile(__filename, () => {
  setTimeout(() => console.log("setTimeout"), 0);
  setImmediate(() => console.log("setImmediate"));
});

// 固定输出：setImmediate → setTimeout
// 原因：I/O 回调在 poll 阶段执行，执行完毕后直接进入 check 阶段，优先执行 setImmediate

```

## 五、手画事件循环执行顺序图（学习必备）

可直接临摹的**浏览器事件循环流程图**，快速梳理执行逻辑：

**主线程启动 → 执行同步代码（Call Stack）→ 调用栈清空**

**→ 遍历清空全部 Microtask 微任务（含新增微任务）**

**→ 执行一个 Macrotask 宏任务**

**→ 回到微任务判断，循环往复**

**画图核心要点**：微任务队列是「清空式执行」，宏任务队列是「单次轮询执行」。

## 六、高频易错点总结

- **易错1**：定时器延时 0ms 不是立即执行，会进入宏任务队列，等待同步、微任务执行完毕后才执行；

- **易错2**：微任务中产生的新微任务，会插队执行，优先于所有宏任务；

- **易错3**：Node 与浏览器执行逻辑不同，不要用浏览器逻辑套 Node 代码；

- **易错4**：`Promise` 同步代码立即执行，只有 `\.then` 回调属于微任务；

- **易错5**：每轮事件循环，微任务**全部执行**，宏任务**只执行一个**。

## 七、全文核心总结

1. JS 单线程异步的核心：**同步优先、微任务次之、宏任务最后**；

2. 微任务：优先级高、批量清空，包含 Promise、queueMicrotask 等；

3. 宏任务：优先级低、单次执行，包含定时器、IO、UI 渲染等；

4. 浏览器事件循环：栈空 → 清微任务 → 单宏任务 → 循环；

5. Node 事件循环：6 阶段有序执行，**阶段结束清空微任务**，与浏览器核心差异；

6. 解题、排错万能公式：先找同步、再找微任务、最后按顺序执行宏任务。

> （注：文档部分内容可能由 AI 生成）
