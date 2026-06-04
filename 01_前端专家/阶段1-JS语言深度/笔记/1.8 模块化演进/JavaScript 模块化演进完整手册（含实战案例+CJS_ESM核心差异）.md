# JavaScript 模块化演进完整手册（含实战案例\+CJS/ESM核心差异）

**核心前言**：JavaScript 最初无模块化设计，随着业务迭代，从 **全局混乱代码** 逐步迭代出各类模块规范。最终形成两大主流规范：**Node 端 CommonJS\(CJS\)**、**浏览器原生 ESM**。

**完整演进链路**：全局变量野蛮时代 → IIFE 隔离作用域 → CommonJS\(Node\) → AMD\(浏览器异步模块\) → UMD\(通用兼容模块\) → ESM\(统一标准\) → 动态import\(按需加载\)

## 一、无模块时代（模块化雏形）

JS 早期没有任何模块系统，所有代码默认挂载在**全局作用域**，存在严重的全局污染、变量冲突、依赖无序问题。

### 1\. 全局变量模式（原始写法）

所有变量、函数直接暴露在 window/global，多文件变量互相覆盖，极易冲突。

```javascript
// a.js
var name = "张三";
function sayHi() {}

// b.js 会直接覆盖同名变量，造成 bug
var name = "李四";

```

**致命缺点**：全局变量泛滥、命名冲突、无依赖管理、无法复用。

### 2\. IIFE 自执行函数（作用域隔离方案）

通过立即执行函数创建**局部作用域**，隔离私有变量，仅暴露少量 API 到全局，是最早的模块化解决方案。

```javascript
// 模拟私有模块，避免全局污染
(function() {
  // 私有变量，外部无法访问
  const age = 18;
  function getAge() {
    return age;
  }

  // 暴露全局API
  window.userModule = {
    getAge
  }
})()

console.log(userModule.getAge()); // 18
console.log(age); // Uncaught ReferenceError: age is not defined

```

**优缺点**：解决全局污染，但依然**无依赖管理、无法按需加载、模块耦合严重**，仅适用于简单页面。

## 二、CommonJS（CJS）—— Node\.js 默认规范

**适用场景**：Node\.js 服务端默认模块规范，同步加载，适用于本地文件模块。

**核心语法**：`require()` 导入、`module.exports / exports` 导出

### 1\. 基础实战案例

#### module\.js（模块文件）

```javascript
// 单个导出
const name = "CommonJS";
const getName = () => name;

// 导出方式1：module.exports（推荐，优先级最高）
module.exports = {
  name,
  getName
}

// 导出方式2：exports 追加
exports.age = 20;

```

#### index\.js（导入使用）

```javascript
// 同步导入模块
const mod = require("./module.js");

console.log(mod.name); // CommonJS
console.log(mod.getName()); // CommonJS
console.log(mod.age); // 20

```

### 2\. CommonJS 核心特性

- **运行时加载**：代码执行阶段才会加载模块

- **同步加载**：适合服务端本地文件，不适合浏览器网络请求

- **值拷贝**：导出的是变量的**副本**，原模块变量更新，导入值不会更新

- **模块缓存**：模块首次加载后会缓存，后续 require 直接读取缓存

## 三、AMD / UMD（历史淘汰规范，面试了解）

### 1\. AMD（Asynchronous Module Definition）

**适用场景**：早期浏览器端异步模块规范（代表：RequireJS），解决浏览器同步加载阻塞问题。

**核心特点**：异步加载、前置依赖、浏览器专用、语法繁琐，目前已完全被 ESM 取代。

```javascript
// AMD 规范语法（了解即可）
define(["jquery"], function($) {
  function render() {
    $("body").text("AMD模块");
  }
  return { render };
})

```

### 2\. UMD（Universal Module Definition）

**核心作用**：**兼容 CJS / AMD / 全局变量**的通用模块方案，是库的兼容兜底方案（如 jQuery、Lodash 旧版本）。

**本质**：判断当前环境，自动适配 Node / 浏览器 / 模块化环境，目前仅老项目可见。

## 四、ES Modules（ESM）—— 浏览器原生标准

**地位**：JS 官方统一模块化标准，**浏览器原生支持、Node\.js 高版本支持**，是目前项目主流规范。

**核心语法**：`import / export`

**启动条件**：浏览器 script 标签添加 `type="module"`，Node\.js 设置 `"type":"module"`。

### 1\. 基础实战案例

#### esm\.js（模块文件）

```javascript
// 1. 单独导出
export const name = "ESM模块";
export const getTime = () => Date.now();

// 2. 默认导出
export default function sayHello() {
  console.log("Hello ESM");
}

```

#### index\.html / index\.js

```javascript
// 导入默认导出 + 解构导入
import sayHello, { name, getTime } from "./esm.js";

sayHello(); // Hello ESM
console.log(name); // ESM模块
console.log(getTime()); // 时间戳

```

### 2\. ESM 核心特性

- **编译时确定**：模块依赖在编译阶段静态解析，支持 Tree\-Shaking

- **异步加载**：浏览器原生异步，不阻塞渲染

- **值引用（Live Binding）**：导出的是变量引用，原变量更新，导入值同步更新

- **顶层 this 为 undefined**（核心考点）

- **严格模式**：ESM 默认开启严格模式

## 五、动态 import\(\) — 按需加载（ESM 高级特性）

**解决问题**：静态 import 必须写在顶部、无法动态判断、无法按需加载；**import\(\) 实现运行时动态导入、懒加载、代码分割**。

**核心特性**：返回 Promise、异步加载、支持变量传参、路由懒加载核心原理。

### 实战案例：按需加载模块

```javascript
// 场景：点击按钮后才加载模块（懒加载）
async function loadModule() {
  // 动态按需导入
  const { name } = await import("./esm.js");
  console.log("动态加载模块：", name);
}

// 触发加载
loadModule();
```

**工程应用**：Vue/React 路由懒加载、组件按需加载、打包代码分割，减少首屏资源体积。

## 六、重中之重：CJS vs ESM 三大核心差异（面试必考）

这是前端高级面试**最高频考点**，全部搭配可运行案例，直观理解差异。

### 1\. 导出机制：CJS 值拷贝 VS ESM 实时引用（Live Binding）

#### CJS 值拷贝（断联机制）

导出的是**变量快照**，原模块变量更新，导入值**不会变化**。

```javascript
// cjs-module.js
let count = 1;
setInterval(() => count++, 1000);
module.exports = { count };

// index.js
const { count } = require("./cjs-module.js");
console.log(count); // 1
console.log(count); // 永远是1，不会更新

```

#### ESM 实时引用（Live Binding）

导出的是**变量地址引用**，原模块变量更新，导入值**实时同步更新**。

```javascript
// esm-module.js
export let count = 1;
setInterval(() => count++, 1000);

// index.js
import { count } from "./esm-module.js";
setInterval(() => {
  console.log(count); // 1、2、3、4... 实时更新
}, 1000)

```

### 2\. 加载时机：CJS 运行时加载 VS ESM 编译时静态解析

- **CJS**：运行时代码执行到 `require` 才加载，支持动态判断、条件加载，**不支持 Tree\-Shaking**

- **ESM**：编译阶段提前解析所有模块依赖，静态分析语法，**支持 Tree\-Shaking 按需打包**，删除未使用代码

```javascript
// CJS 支持动态条件加载
if (true) {
  require("./a.js"); // 合法，运行时执行
}

// ESM 静态import 不支持条件包裹（语法报错）
// if(true) { import "./a.js" } // 非法语法
// 如需动态加载，必须使用 import()

```

### 3\. 顶层 this 指向差异

- **CJS**：顶层 this 指向**当前模块的 module\.exports**

- **ESM**：顶层 this 严格等于 **undefined**（核心考点）

```javascript
// CJS 顶层this
console.log(this === module.exports); // true

// ESM 顶层this
console.log(this); // undefined
```

## 七、模块规范总结 \& 工程选型

### 1\. 各规范定位总结

- **无模块/IIFE**：远古方案，仅做技术演进了解，项目废弃

- **AMD/UMD**：历史兼容方案，旧库遗留，新项目不再使用

- **CommonJS**：Node\.js 默认规范，服务端首选，同步加载、运行时动态

- **ESM**：跨端统一标准，浏览器/Node 通用，支持 Tree\-Shaking、静态优化

- **动态import\(\)**：ESM 按需加载方案，工程化代码分割核心

### 2\. 高频面试终极总结

1. CJS：**运行时加载、值拷贝、this 指向模块导出对象、同步、无 Tree\-Shaking**

2. ESM：**编译时解析、值引用、顶层 this 为 undefined、异步、支持 Tree\-Shaking**

3. 动态 import\(\) 是 ESM 唯一支持的**运行时按需加载**方案

> （注：文档部分内容可能由 AI 生成）
