# Promise / async\-await 底层实现全解（含手写源码\+实战案例）

**核心前置认知**：Promise 是 JS 异步编程的核心解决方案，彻底解决**回调地狱**问题；**async/await** 是 Generator \+ Promise 的语法糖，让异步代码拥有同步写法，是目前项目开发主流异步方案。二者均属于**微任务**，遵从事件循环执行机制。

## 一、Promise 核心基础：三种状态与流转规则

### 1\. Promise 三种私有状态

Promise 实例一生只会存在三种状态，状态**私有、不可逆、只能变更一次**：

- **pending（等待中）**：初始状态，异步任务未完成

- **fulfilled（成功态）**：异步任务执行成功，返回结果

- **rejected（失败态）**：异步任务执行失败，抛出错误

### 2\. 状态流转核心规则（必考）

1. 初始状态为 **pending**；

2. pending 可单向流转为 **fulfilled** 或 **rejected**；

3. **状态一旦变更，永久固定，无法二次修改**；

4. resolve\(\) 触发成功态，reject\(\) 触发失败态。

### 3\. 状态流转实战案例

```javascript
// 1. 基础状态流转
const p1 = new Promise((resolve, reject) => {
  resolve("成功结果"); // pending => fulfilled
  reject("失败结果"); // 无效！状态已固定，无法修改
});
p1.then(res => console.log(res)).catch(err => console.log(err));
// 输出：成功结果

// 2. 初始pending状态
const p2 = new Promise(() => {});
console.log(p2); // Promise { <pending> }

```

**关键结论**：Promise 状态**单向不可逆**，是链式调用的底层基础。

## 二、then / catch / finally 链式调用底层原理

### 1\. 核心原理

链式调用的本质：**then / catch / finally 方法执行后，永远返回一个全新的 Promise 实例**，因此可以持续链式调用。

- 若回调返回**普通值**：新 Promise 自动变为 fulfilled 状态；

- 若回调**抛出错误**：新 Promise 变为 rejected 状态；

- 若回调返回**Promise**：最终状态跟随返回的 Promise 状态。

### 2\. 三大方法特性详解

#### （1）then\(\)

接收两个参数：成功回调、失败回调，用于处理 Promise 成功/失败结果。

#### （2）catch\(\)

专门捕获失败状态，等价于 `then\(null, errFn\)`，可**冒泡捕获上游所有错误**。

#### （3）finally\(\)

无论 Promise 成功/失败都会执行，**不接收参数、不改变结果**，常用于关闭加载、终止请求等收尾操作。

### 3\. 链式调用实战案例

```javascript
new Promise((resolve) => {
  resolve(100);
}).then(res => {
  console.log(res); // 100
  return res * 2; // 返回普通值，触发新Promise成功
}).then(res => {
  console.log(res); // 200
  throw new Error("手动报错"); // 抛出错误，触发失败态
}).catch(err => {
  console.log(err.message); // 手动报错
}).finally(() => {
  console.log("代码执行完毕，收尾操作");
});

```

## 三、四大 Promise 静态方法【手写源码\+实战】

原生静态方法是面试高频考点，核心掌握**执行规则、边界场景、手写实现**。

### 1\. Promise\.all（全部成功才成功，一个失败即失败）

#### 执行规则

- 接收 Promise 数组，**所有 Promise 成功，结果数组按顺序返回**；

- **任意一个失败，立即返回该失败结果**（短路机制）。

#### 手写源码实现

```javascript
Promise.myAll = function(promiseList) {
  return new Promise((resolve, reject) => {
    // 非数组直接报错
    if (!Array.isArray(promiseList)) {
      return reject(new Error("参数必须为数组"));
    }
    const result = [];
    let count = 0;
    const len = promiseList.length;
    // 空数组直接返回空结果
    if (len === 0) resolve([]);

    for (let i = 0; i < len; i++) {
      // 统一转为Promise，兼容普通值
      Promise.resolve(promiseList[i]).then(res => {
        result[i] = res;
        count++;
        // 全部执行完成，返回结果
        if (count === len) resolve(result);
      }).catch(err => {
        // 一个失败直接失败
        reject(err);
      })
    }
  })
}

// 测试案例
const p1 = Promise.resolve(1);
const p2 = Promise.resolve(2);
Promise.myAll([p1, p2]).then(res => console.log(res)); // [1,2]

```

### 2\. Promise\.allSettled（等待全部完成，无论成败）

#### 执行规则

- 等待**所有 Promise 执行完毕**（成功/失败都等待）；

- 返回结果数组，每项包含 `status`（fulfilled/rejected）和对应 value/reason。

#### 手写源码实现

```javascript
Promise.myAllSettled = function(promiseList) {
  return new Promise((resolve) => {
    if (!Array.isArray(promiseList)) {
      return reject(new Error("参数必须为数组"));
    }
    const result = [];
    let count = 0;
    const len = promiseList.length;
    if (len === 0) resolve([]);

    for (let i = 0; i < len; i++) {
      Promise.resolve(promiseList[i]).then(res => {
        result[i] = { status: "fulfilled", value: res };
      }).catch(err => {
        result[i] = { status: "rejected", reason: err };
      }).finally(() => {
        count++;
        if (count === len) resolve(result);
      })
    }
  })
}

// 测试案例
const p3 = Promise.resolve("成功");
const p4 = Promise.reject("失败");
Promise.myAllSettled([p3, p4]).then(res => console.log(res));
// [{status: 'fulfilled', value: '成功'}, {status: 'rejected', reason: '失败'}]

```

### 3\. Promise\.race（竞速机制，最先完成者胜出）

#### 执行规则

- 竞速模式，**谁先执行完成（成功/失败），返回谁的结果**；

- 其余未完成 Promise 继续执行，但结果被忽略。

#### 手写源码实现

```javascript
Promise.myRace = function(promiseList) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promiseList)) {
      return reject(new Error("参数必须为数组"));
    }
    for (let item of promiseList) {
      Promise.resolve(item).then(res => {
        resolve(res); // 最先成功的直接返回
      }).catch(err => {
        reject(err); // 最先失败的直接返回
      })
    }
  })
}

// 测试案例
const timer1 = new Promise(res => setTimeout(() => res("1秒"), 1000));
const timer2 = new Promise(res => setTimeout(() => res("0.5秒"), 500));
Promise.myRace([timer1, timer2]).then(res => console.log(res)); // 0.5秒

```

### 4\. Promise\.any（最先成功，全部失败才失败）

#### 执行规则

- 取**第一个成功**的 Promise 结果；

- 所有 Promise 全部失败，才返回聚合失败错误 `AggregateError`。

#### 手写源码实现

```javascript
Promise.myAny = function(promiseList) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promiseList)) {
      return reject(new Error("参数必须为数组"));
    }
    const errList = [];
    let count = 0;
    const len = promiseList.length;
    if (len === 0) reject(new AggregateError([], "All promises were rejected"));

    for (let i = 0; i < len; i++) {
      Promise.resolve(promiseList[i]).then(res => {
        resolve(res); // 第一个成功直接返回
      }).catch(err => {
        errList[i] = err;
        count++;
        // 全部失败，抛出聚合错误
        if (count === len) reject(new AggregateError(errList, "All promises were rejected"));
      })
    }
  })
}

// 测试案例
const p5 = Promise.reject("失败1");
const p6 = Promise.resolve("成功2");
Promise.myAny([p5, p6]).then(res => console.log(res)); // 成功2

```

## 四、async/await 底层本质：Generator \+ Promise 语法糖

### 1\. 底层核心原理

**async/await 不是新语法，是 Generator 生成器 \+ Promise 的语法糖**：

- **Generator**：可以暂停、恢复执行的函数（function\* \+ yield），解决异步分段执行；

- **Promise**：提供异步状态与结果；

- **async**：修饰函数，内部默认返回 Promise 实例；

- **await**：暂停代码执行，**等待 Promise 完成**，解锁同步写法。

### 2\. 底层等价拆解

```javascript
// 日常 async/await 写法
async function fn() {
  const res = await Promise.resolve("异步结果");
  console.log(res);
}

// 底层等价 Generator 实现
function* gen() {
  const res = yield Promise.resolve("异步结果");
  console.log(res);
}
// 自动执行器（async底层自动封装）
function run(gen) {
  const g = gen();
  function next(data) {
    const { value, done } = g.next(data);
    if (done) return;
    Promise.resolve(value).then(res => next(res));
  }
  next();
}
run(gen);

```

### 3\. 核心特性

- await 只能在 async 函数内使用；

- await 会阻塞后续代码执行，直至 Promise 完成；

- async 函数返回值自动包装为 Promise。

## 五、Promise / async\-await 错误处理策略

### 1\. 两种错误处理方案对比

#### 方案1：Promise 链式 \.catch\(\)

支持**错误冒泡**，可捕获上游所有链式错误，适合纯 Promise 调用。

```javascript
Promise.reject("接口报错").then(res => res).catch(err => {
  console.log("捕获错误：", err);
});

```

#### 方案2：async/await \+ try\-catch

同步风格错误捕获，精准捕获**当前 await 语句**错误，是项目主流方案。

```javascript
async function request() {
  try {
    const res = await Promise.reject("请求失败");
  } catch (err) {
    console.log("try-catch捕获：", err);
  }
}
request();
```

### 2\. 关键使用规则

- 多个 await 串行时，try\-catch 可包裹全部，也可单独包裹单个语句；

- Promise 内部报错若无 catch 捕获，会造成**未捕获的异常**；

- async 函数报错，会返回 rejected 状态的 Promise，可外部继续 \.catch。

## 六、Promise 并发控制（限制同时执行数量）

原生 Promise\.all 无并发限制，大量异步请求会同时触发，造成接口熔断、性能卡顿。手写**并发控制器**，限制同一时间执行的 Promise 数量。

### 1\. 手写通用并发控制器

```javascript
class PromiseLimit {
  // limit：最大并发数
  constructor(limit) {
    this.limit = limit;
    this.running = 0; // 当前正在执行的任务数
    this.taskQueue = []; // 等待执行的任务队列
  }

  // 添加任务
  add(task) {
    return new Promise(resolve => {
      this.taskQueue.push({ task, resolve });
      this.run();
    })
  }

  // 执行任务
  run() {
    // 超出并发数 / 无等待任务，终止执行
    if (this.running >= this.limit || this.taskQueue.length === 0) return;
    // 取出队首任务执行
    const { task, resolve } = this.taskQueue.shift();
    this.running++;
    task().then(res => {
      resolve(res);
    }).finally(() => {
      this.running--;
      // 递归执行下一个任务
      this.run();
    })
  }
}

// 实战测试：限制最大并发2
const limit = new PromiseLimit(2);
// 模拟10个异步请求
const tasks = Array.from({ length: 10 }, (_, i) => {
  return () => new Promise(res => setTimeout(() => res(`任务${i+1}完成`), 1000))
})

// 批量执行
tasks.forEach(task => {
  limit.add(task).then(res => console.log(res));
})

```

### 2\. 效果说明

上述案例同时最多只有 2 个任务执行，10 个任务分 5 轮执行，完美**控制请求并发、防止服务压垮**，适用于批量上传、批量接口请求场景。

## 七、核心总结 \+ 高频易错点

### 1\. 核心知识点复盘

- Promise 状态**单向不可逆**，是链式调用的底层支撑；

- 四大静态方法：all（全成则成）、allSettled（全部完成）、race（竞速）、any（首个成功）；

- async/await 本质是 **Generator \+ Promise 语法糖**，实现异步同步化；

- 错误处理：链式用 catch，同步写法用 try\-catch；

- 并发控制核心：队列缓存超额任务，执行完毕递归释放新任务。

### 2\. 高频易错点

- Promise 构造函数代码是**同步执行**，仅 then/catch 是微任务；

- await 会阻塞代码，多个 await 默认串行执行；

- Promise\.all 短路失败，allSettled 无短路，全部等待；

- 无并发控制的 Promise\.all 会一次性执行所有任务，存在性能风险。

> （注：文档部分内容可能由 AI 生成）
