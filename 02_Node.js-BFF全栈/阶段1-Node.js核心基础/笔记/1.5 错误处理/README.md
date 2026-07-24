# 1.5 错误处理

> 阶段 1 — Node.js 核心基础 / 第 5 章
> 核心目标：掌握同步/异步/全局各层级错误处理，理解 Node 里「未捕获异常会崩进程」的残酷现实，建立 BFF 服务的健壮性意识。

---

## 目录

1. [为什么 Node 错误处理特别重要](#1-为什么-node-错误处理特别重要)
2. [同步错误处理：try-catch](#2-同步错误处理try-catch)
3. [异步错误处理：三套范式](#3-异步错误处理三套范式)
4. [全局兜底](#4-全局兜底)
5. [自定义错误类](#5-自定义错误类)
6. [caidiaweb / BFF 实践](#6-caidiaweb--bff-实践)
7. [面试考点](#7-面试考点)

---

## 1. 为什么 Node 错误处理特别重要

> 在浏览器里，一个未捕获异常最多让当前页面报错；在 **Node 服务端，一个未捕获的异常/拒绝默认会直接终止整个进程**——所有用户请求全部断开。

```
浏览器：异常 → 控制台报错 → 页面还在，其他代码继续跑
Node  ：异常 → 进程崩溃 → 服务下线，需 pm2/容器重启
```

> **核心差异**：服务端进程是「单点」，错误处理不是「让代码不报错」，而是「**即使出错也不让服务挂掉**」。这是 Node 工程化的第一道生命线。

---

## 2. 同步错误处理：try-catch

```js
try {
  JSON.parse('not json'); // 抛 SyntaxError
} catch (err) {
  console.error('解析失败:', err.message);
  // 可降级处理，不崩溃
}

// ⚠️ try-catch 只能捕获「同步」错误
try {
  setTimeout(() => { throw new Error('boom'); }, 0); // 异步！try-catch 抓不到
} catch (e) {
  console.log('抓不到'); // 不会执行，错误逃逸到全局
}
```

| 能捕获 | 不能捕获 |
|--------|---------|
| 同步抛出的异常 | 异步回调里的异常（setTimeout/Promise/回调） |
| `JSON.parse` 等同步 API | `process.nextTick` 里的异常（需全局兜底） |

---

## 3. 异步错误处理：三套范式

### 3.1 Error-first Callback（老式约定）

> Node 早期回调风格：回调第一个参数永远是 `err`，有错则 err 非空。

```js
fs.readFile('a.txt', 'utf8', (err, data) => {
  if (err) {                       // 必检查 err
    console.error('读失败', err);
    return;
  }
  console.log(data);
});
```

> **约定**：`callback(err, result)`。忘记 `if (err) return` 是最常见的隐性 bug——错误被静默吞掉。

### 3.2 Promise .catch()

```js
fetchData()
  .then((data) => render(data))
  .catch((err) => console.error('链上任意环节错误都到这里')); // 捕获整条链

// 注意：.catch 只捕获其前面的 .then 错误
Promise.reject(new Error('x'))
  .then(() => {})        // 跳过
  .catch((e) => console.log(e)); // 捕获
```

### 3.3 async/await + try-catch（推荐 ✅）

```js
async function getData() {
  try {
    const data = await fetchData();
    return render(data);
  } catch (err) {
    console.error('获取失败', err);
    throw new AppError('DATA_FETCH_FAILED', err); // 可包装后继续抛
  }
}
```

| 范式 | 适用 | 推荐度 |
|------|------|--------|
| Error-first callback | 老 CJS 代码 | ⚠️ 历史遗留 |
| Promise .catch | 纯 Promise 链 | ✅ 可用 |
| async/await + try-catch | 新代码 | ⭐ 首选 |

---

## 4. 全局兜底

> 单点 try-catch 不可能包住所有代码。**全局兜底**是最后防线——捕获那些「漏网」的异常和 Promise 拒绝，至少能优雅记录、避免静默崩溃。

### 4.1 uncaughtException（同步未捕获）

```js
process.on('uncaughtException', (err) => {
  console.error('未捕获异常:', err);
  // ⚠️ 官方建议：记录日志后主动退出，由进程管理器（pm2/k8s）重启
  // 因为状态下已不可信，继续跑风险更高
  process.exit(1); // 或做清理后退出
});
```

> **重要认知**：Node 官方**不推荐**在 `uncaughtException` 里「继续运行」。异常发生时内存/V8 状态可能已损坏，最安全的做法是记录 + 退出 + 让管理器重启。它是「最后日志」，不是「恢复手段」。

### 4.2 unhandledRejection（Promise 未处理）

```js
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
  // Node 15+ 未处理 rejection 会触发 uncaughtException 并退出
});

// 一个没 catch 的 Promise
Promise.reject(new Error('忘记 catch')); // 触发 unhandledRejection
```

> **最佳实践**：所有 Promise 链都要有 `.catch`，所有 `await` 都在 `try` 里。全局兜底只是「兜底」不是「日常」。

### 4.3 监听顺序与防重复

```js
// 进程退出前的统一清理钩子
process.on('uncaughtException', (err) => {
  logger.fatal(err);
  gracefulShutdown().finally(() => process.exit(1));
});

async function gracefulShutdown() {
  await db.close();
  server.close();
}
```

---

## 5. 自定义错误类

> 用「错误类型」区分业务错误，便于上层精准处理（如 404 不报警、5xx 才告警）。

```js
// 基类
class AppError extends Error {
  constructor(message, code, status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;       // 业务错误码：DATA_FETCH_FAILED
    this.status = status;   // HTTP 状态码
    Error.captureStackTrace(this, this.constructor); // 保留正确调用栈
  }
}

// 子类
class NotFoundError extends AppError {
  constructor(resource = '资源') {
    super(`${resource}不存在`, 'NOT_FOUND', 404);
  }
}
class ValidationError extends AppError {
  constructor(msg) { super(msg, 'VALIDATION', 400); }
}

// 使用
try {
  const user = await findUser(id);
  if (!user) throw new NotFoundError('用户');
} catch (err) {
  if (err instanceof NotFoundError) return res.status(404).json({ code: err.code });
  if (err instanceof AppError) return res.status(err.status).json({ msg: err.message });
  throw err; // 未知错误继续向上
}
```

> **为什么继承 Error 而非 `throw new Error(msg)`**：自定义类带 `code`/`status`，且 `instanceof` 判断可精准分流（BFF 里区分「客户端错误 4xx」与「服务端错误 5xx」）。

---

## 6. caidiaweb / BFF 实践

### 6.1 BFF 统一错误处理中间件（Express 风格）

```js
// errorHandler.js
import { AppError, NotFoundError } from './errors.js';

export function errorMiddleware(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ code: err.code, msg: err.message });
  }
  console.error('未预期错误:', err);
  res.status(500).json({ code: 'INTERNAL', msg: '服务内部错误' });
}

// 404 兜底
export function notFound(req, res) {
  throw new NotFoundError(`路由 ${req.path}`); // 交给 errorMiddleware
}
```

### 6.2 全局兜底（服务入口）

```js
// index.js
process.on('unhandledRejection', (reason) => {
  logger.fatal('UnhandledRejection', reason);
});
process.on('uncaughtException', (err) => {
  logger.fatal('UncaughtException', err);
  process.exit(1); // 交 pm2 重启
});
```

### 6.3 检查清单

- [ ] 所有 `await` 在 `try-catch` 内，或 Promise 链有 `.catch`
- [ ] 自定义 `AppError` 带 `code`/`status`，精准分流 4xx/5xx
- [ ] BFF 用统一错误处理中间件，不让原始报错泄露给前端
- [ ] 全局 `uncaughtException`/`unhandledRejection` 做**最后日志 + 退出**
- [ ] 不在 `uncaughtException` 里「假装没事继续跑」（状态可能已损坏）
- [ ] 由 pm2 / 容器编排负责崩溃后的自动重启

---

## 7. 面试考点

### Q1：Node 和浏览器错误处理最大区别？
浏览器未捕获异常只报错、页面继续；Node 服务端未捕获异常/未处理 Promise 拒绝默认**终止整个进程**，所有请求断开。所以 Node 错误处理核心目标是「即使出错也不让服务挂掉」。

### Q2：try-catch 能捕获异步错误吗？
**不能**。try-catch 只能抓同步错误。setTimeout/回调/Promise 里的异常会逃逸到全局，需 `Promise.catch` 或全局 `uncaughtException` 兜底。

### Q3：async/await 怎么处理错误？为什么推荐？
用 `try-catch` 包住 `await`。推荐因为它让异步代码写出同步的可读结构，错误栈清晰，且能用一个 catch 覆盖整段异步逻辑，比嵌套 `.catch` 更直观。

### Q4：Error-first callback 是什么？
Node 早期回调约定：`callback(err, result)`，第一个参数永远是错误对象，有错则非空。调用时必 `if (err) return` 检查，否则错误被静默吞掉。

### Q5：uncaughtException 里应该做什么？
官方建议记录日志后**主动退出**（`process.exit(1)`），由进程管理器（pm2/k8s）重启。因为异常发生时 V8/内存状态可能已损坏，继续运行风险更高。它是「最后日志」不是「恢复手段」。

### Q6：unhandledRejection 是什么？Node 15+ 行为？
Promise 被 reject 却无 `.catch` 处理时触发。Node 15+ 起，未处理 rejection 会触发 `uncaughtException` 并最终退出进程。最佳实践是所有 Promise 链都接 `.catch`。

### Q7：为什么自定义错误类继承 Error？
自定义类带 `code`/`status` 业务字段，且可用 `instanceof` 精准分流（4xx 客户端错 vs 5xx 服务端错）。直接 `throw new Error(msg)` 无法区分错误类型。`Error.captureStackTrace` 保留正确调用栈。

### Q8：BFF 为什么要统一错误处理中间件？
避免原始报错（含堆栈/内部路径）泄露给前端（安全风险）；统一返回结构化错误（code/msg）；精准分流 4xx/5xx 便于监控告警。是服务端健壮性的标配。

---

> **本章小结**：Node 服务端错误处理的核心是「**不让单点异常拖垮整进程**」。同步用 try-catch（抓不到异步）；异步三范式（Error-first / Promise.catch / async+try 首选）；全局 `uncaughtException`/`unhandledRejection` 做最后日志+退出（不假装继续跑）；自定义 `AppError` 用 `code/status` 精准分流 4xx/5xx。这是 BFF 服务健壮性的第一道防线。下一章 **1.6 包管理** 将讲 npm/pnpm/yarn 与 package.json 工程化配置，为实际项目落地收尾。
