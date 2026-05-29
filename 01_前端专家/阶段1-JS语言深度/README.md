# 阶段1 — JS 语言深度

> 预计时间：第 1-2 个月
> 目标水平：L3 精通
> 每日投入：工作日 1h + 周末 3h

---

## 学习目标

精通 JavaScript 核心机制，建立对语言底层的深度理解。这是整个前端专家路线的地基，后续所有方向都建立在对 JS 的深刻理解之上。

---

## 学习内容

### 1.1 执行上下文与作用域链

- 词法作用域（Lexical Scope）vs 动态作用域
- 全局执行上下文、函数执行上下文、eval 执行上下文
- 变量对象（VO）与活动对象（AO）
- 作用域链的形成与查找机制
- 变量提升（hoisting）— 函数声明 vs 函数表达式
- 块级作用域 — let/const 的暂时性死区（TDZ）

**关键理解**：JavaScript 的作用域在代码编写时就已确定（词法作用域），不是运行时确定。

### 1.2 闭包原理与应用场景

- 闭包的本质：函数 + 其词法环境的组合
- 闭包形成的条件：函数在定义时的作用域外被调用
- 经典应用：
  - 模块化模式（IIFE + 闭包）
  - 函数柯里化（Currying）
  - 偏函数（Partial Application）
  - 防抖（Debounce）与节流（Throttle）
  - 私有变量封装
- 闭包的内存问题：内存泄漏场景与释放策略

**关键理解**：闭包不是"内存泄漏"，而是"有意保持对外部变量的引用"。

### 1.3 this 绑定规则

- 默认绑定（非严格模式指向全局，严格模式为 undefined）
- 隐式绑定（对象调用，隐式丢失场景）
- 显式绑定（call / apply / bind，bind 的硬绑定）
- new 绑定（构造函数中的 this）
- 箭头函数（无自己的 this，继承外层）
- 优先级：new > 显式 > 隐式 > 默认

**实战练习**：准备 20+ 道 this 指向题目，确保 100% 判断正确。

### 1.4 原型与原型链

- prototype 与 __proto__ 的区别
- constructor 属性
- 原型链查找机制
- 继承的多种实现方式：
  1. 原型链继承
  2. 构造函数继承（借用构造函数）
  3. 组合继承
  4. 原型式继承（Object.create）
  5. 寄生式继承
  6. 寄生组合式继承（最理想方案）
  7. ES6 class extends（语法糖）
- hasOwnProperty / in / instanceof 工作原理

**关键理解**：理解原型链是理解 JavaScript 面向对象编程的基础。

### 1.5 Event Loop 事件循环

- 调用栈（Call Stack）
- 任务队列（Task Queue / Macrotask Queue）
- 微任务队列（Microtask Queue）
- 执行顺序：同步代码 → 微任务 → 宏任务
- 常见宏任务：setTimeout / setInterval / I/O / UI 渲染
- 常见微任务：Promise.then / MutationObserver / queueMicrotask
- Node.js Event Loop 与浏览器的差异（6 个阶段）

**实战练习**：手画事件循环执行顺序图，能正确预测任意代码的输出顺序。

### 1.6 Promise / async-await 底层实现

- Promise 的三种状态：pending / fulfilled / rejected
- 状态流转规则（不可逆）
- then / catch / finally 链式调用原理
- 手写 Promise.all — 所有成功才成功
- 手写 Promise.allSettled — 等待所有完成
- 手写 Promise.race — 最先完成的
- 手写 Promise.any — 最先成功的
- async / await 的本质是 Generator + Promise 的语法糖
- 错误处理策略（try-catch vs .catch）
- Promise 并发控制（限制同时执行的 Promise 数量）

### 1.7 ES6+ 高级特性

- WeakMap / WeakSet — 弱引用、垃圾回收友好
- Proxy 与 Reflect — 元编程基础、Vue3 响应式原理
- Symbol — 唯一属性键、内置 Symbol
- Iterator 与 Generator — 迭代协议、惰性求值
- async Generator — 异步迭代
- Optional Chaining (?.) 与 Nullish Coalescing (??)
- Array 扁平化（flat / flatMap）
- Object 扩展方法（entries / values / fromEntries）

### 1.8 模块化演进

- 无模块时代（全局变量、IIFE）
- CommonJS（CJS）— require / module.exports（Node.js 默认）
- ES Modules（ESM）— import / export（浏览器原生支持）
- AMD / UMD（历史了解）
- 动态 import() — 按需加载
- CJS vs ESM 的关键差异：
  - CJS 值拷贝 vs ESM 值引用（live binding）
  - CJS 运行时加载 vs ESM 编译时确定
  - ESM 顶部 this 为 undefined

---

## 实战产出（必须完成）

| 编号 | 产出 | 验收标准 |
|------|------|---------|
| 1 | 手写完整 Promise | 含 then/catch/finally/all/allSettled/race/any |
| 2 | 手写深拷贝 | 处理循环引用、Symbol、RegExp、Date |
| 3 | 手写防抖节流 | 支持 cancel/leading/trailing 配置项 |
| 4 | 手写 EventEmitter | 含 on/off/once/emit/allOff |
| 5 | 手写 5 种继承 | 原型链/构造函数/组合/寄生式/寄生组合 |
| 6 | LeetCode 每日 1 题 | 简单-中等，累计 50+ 题 |

---

## 推荐资源

### 书籍
- 《你不知道的 JavaScript》上中下三册 — **必读**
- 《JavaScript 高级程序设计（第4版）》第 4-7 章
- 《JavaScript 语言精粹》

### 在线
- MDN Web Docs (developer.mozilla.org)
- JavaScript.info (zh.javascript.info) — 现代 JavaScript 教程
- LeetCode (leetcode.cn)

### 练习平台
- LeetCode 简单-中等题（数组/字符串/链表/栈/队列）
- JS 闭包/原型链专题练习

---

## 学习方法建议

1. **不要只看视频** — 看完一章立即手写代码验证
2. **用 Chrome DevTools 调试** — 断点、Scope 面板、Call Stack
3. **费曼学习法** — 尝试给别人（或录音）解释每个概念
4. **在 caidiaweb 项目中实践** — 找到使用闭包/Promise 的地方，理解其原理
5. **做笔记** — 每个概念用自己的话写一遍，存入「笔记」文件夹

---

## 检验标准

- [ ] 能脱离文档默写 Promise.all 的完整实现
- [ ] 能解释任意一段代码的 this 指向（正确率 100%）
- [ ] 能手写发布订阅模式（EventEmitter）
- [ ] 能画出闭包、原型链、Event Loop 的执行流程图
- [ ] 能说出 CJS 和 ESM 的 5 点核心差异
- [ ] LeetCode 累计完成 50+ 题简单-中等

---

> **下一阶段**：完成本阶段后，进入「阶段2-浏览器与网络原理」
