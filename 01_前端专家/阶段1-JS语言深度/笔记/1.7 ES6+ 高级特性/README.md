# ES6\+ 高级特性 精讲文档（含实战案例\+底层原理）

**核心前置认知**：ES6\+ 高级特性是前端工程化、框架源码（Vue3/React）、算法优化的底层基础。区别于基础语法，这批特性主打**数据隐私、底层劫持、迭代可控、内存优化、语法极简**，是进阶高级前端的必备知识点。

## 一、WeakSet / WeakMap（弱引用集合）

### 1\. 核心概念：弱引用 vs 强引用

- **强引用（Set / Map）**：只要引用存在，垃圾回收器（GC）永远不会回收对象，容易造成内存泄漏；

- **弱引用（WeakSet / WeakMap）**：引用不计入垃圾回收计数，**若对象无其他强引用，GC 会自动回收**，内存友好。

### 2\. WeakSet 特性与案例

**特性**：

- 只能存储**引用类型**（对象、数组），不能存基本数据类型；

- 元素唯一、不可重复；

- 弱引用、不可遍历、无 size 属性、无 clear 方法。

```javascript
// 实战：存储临时DOM对象，DOM销毁后自动释放内存
const weakSet = new WeakSet();

let dom1 = { id: 1 };
let dom2 = { id: 2 };

weakSet.add(dom1);
weakSet.add(dom2);

console.log(weakSet.has(dom1)); // true

// 解除强引用，GC自动回收该对象
dom1 = null;
// 浏览器空闲时，dom1 会被自动回收，weakSet 自动清除该元素

```

### 3\. WeakMap 特性与案例（开发高频）

**特性**：

- **键必须是引用类型**，值可以是任意类型；

- 键为弱引用，值为强引用；

- 不可遍历、无 size、适合存储**对象私有数据、临时缓存数据**。

```javascript
// 实战：对象私有缓存，防止内存泄漏
const userCache = new WeakMap();

let user1 = { name: "张三" };
let user2 = { name: "李四" };

// 给对象绑定私有缓存数据
userCache.set(user1, { age: 18, token: "123456" });
userCache.set(user2, { age: 20, token: "654321" });

console.log(userCache.get(user1)); // { age: 18, token: '123456' }

// 销毁用户对象，缓存数据自动回收
user1 = null; 
// GC 自动清除 user1 对应的缓存，彻底释放内存

```

### 4\. 适用场景

- DOM 节点临时存储、状态标记；

- 对象私有数据存储、缓存数据管理；

- 解决 Map/Set 长期持有对象导致的**内存泄漏**问题。

## 二、Proxy 与 Reflect（元编程 / Vue3 响应式核心）

### 1\. 核心概念

- **元编程**：可以**拦截、修改 JS 语言底层默认行为**（对象读写、删除、遍历等）；

- **Proxy**：拦截器，监听对象的各种操作；

- **Reflect**：替代 Object 静态方法，**统一 API、返回布尔状态、适配 Proxy**。

### 2\. Proxy 常用拦截操作

支持拦截：属性读取、赋值、删除、遍历、in 判断、构造函数调用等。

### 3\. 实战案例：简易 Vue3 响应式

```javascript
// 原始数据
const rawData = { name: "小明", age: 18 };

// 响应式拦截
const reactiveData = new Proxy(rawData, {
  // 拦截读取属性
  get(target, prop) {
    console.log("读取属性：", prop);
    return Reflect.get(target, prop);
  },
  // 拦截修改属性
  set(target, prop, value) {
    console.log("更新属性：", prop, value);
    // Reflect 返回布尔值，判断是否修改成功
    const res = Reflect.set(target, prop, value);
    // 可触发视图更新
    return res;
  },
  // 拦截删除属性
  deleteProperty(target, prop) {
    console.log("删除属性：", prop);
    return Reflect.deleteProperty(target, prop);
  }
});

// 测试
reactiveData.name = "小红"; // 更新属性
console.log(reactiveData.name); // 读取属性
delete reactiveData.age; // 删除属性

```

### 4\. 为什么搭配 Reflect？

- Object 方法报错终止，Reflect 会返回**布尔值状态**，代码更健壮；

- 函数式写法，统一参数顺序，适配 Proxy 拦截逻辑；

- 保留原生默认行为，只做增强不覆盖。

## 三、Symbol（唯一私有属性键）

### 1\. 核心特性

- ES6 新增**第七种原始数据类型**；

- **绝对唯一**，解决对象属性名冲突问题；

- 不可遍历（for/in、Object\.keys 无法遍历），实现私有属性；

- Symbol\(\) === Symbol\(\) // false。

### 2\. 基础实战案例

```javascript
// 1. 创建唯一 Symbol
const s1 = Symbol("key");
const s2 = Symbol("key");
console.log(s1 === s2); // false

// 2. 作为对象私有属性
const obj = {
  [s1]: "私有数据"
};

console.log(obj[s1]); // 私有数据
console.log(Object.keys(obj)); // [] 遍历不到
console.log(JSON.stringify(obj)); // {} 序列化丢失

```

### 3\. 全局 Symbol 与内置 Symbol

```javascript
// 全局注册表（可复用）
const s3 = Symbol.for("global");
const s4 = Symbol.for("global");
console.log(s3 === s4); // true

// 内置Symbol（修改原生底层行为）
// Symbol.iterator：自定义迭代规则
// Symbol.hasInstance：自定义 instanceof 逻辑
// Symbol.toStringTag：自定义对象打印标签

```

### 4\. 适用场景

- 定义对象**私有属性**，防止外部篡改；

- 解决多人开发、第三方库的属性名冲突；

- 修改 JS 原生底层行为（内置 Symbol）。

## 四、Iterator 与 Generator（迭代协议、惰性求值）

### 1\. Iterator 迭代器（统一遍历协议）

**核心**：只要拥有 `Symbol.iterator` 方法，就是可迭代对象，可被 `for...of` 遍历。

原生可迭代对象：Array、String、Map、Set、arguments、NodeList。

### 2\. 自定义迭代器案例

```javascript
// 自定义可迭代对象
const myIterObj = {
  list: [10, 20, 30],
  [Symbol.iterator]() {
    let index = 0;
    const self = this;
    return {
      next() {
        // next 返回 { value, done }
        return index < self.list.length 
          ? { value: self.list[index++], done: false }
          : { value: undefined, done: true }
      }
    }
  }
}

// 可直接 for...of 遍历
for (const item of myIterObj) {
  console.log(item); // 10 20 30
}

```

### 3\. Generator 生成器（惰性迭代）

**核心特性**：

- 函数声明：`function*`，通过 `yield` 暂停执行；

- **惰性求值**：调用 next\(\) 才会执行下一步，按需取值，节省内存；

- 分段执行、可暂停、可恢复，是 async/await 底层核心。

### 4\. Generator 实战案例

```javascript
function* countGenerator() {
  yield 1;
  yield 2;
  yield 3;
}

const gen = countGenerator();
console.log(gen.next()); // { value: 1, done: false }
console.log(gen.next()); // { value: 2, done: false }
console.log(gen.next()); // { value: 3, done: false }
console.log(gen.next()); // { value: undefined, done: true }
```

## 五、async Generator 异步迭代

**解决问题**：普通 Generator 只支持同步迭代，**async Generator 支持异步按需迭代**，用于异步数据流、分页拉取、文件流读取。

### 实战案例：异步迭代分页数据

```javascript
// 异步生成器
async function* asyncDataGenerator() {
  // 模拟异步请求
  yield await new Promise(res => setTimeout(() => res("第一页数据"), 1000));
  yield await new Promise(res => setTimeout(() => res("第二页数据"), 1000));
  yield await new Promise(res => setTimeout(() => res("第三页数据"), 1000));
}

// for await...of 遍历异步迭代器
async function getData() {
  for await (const page of asyncDataGenerator()) {
    console.log(page); // 每秒输出一条，按需迭代
  }
}
getData();

```

**核心优势**：**惰性异步**，不用一次性加载所有数据，极大优化大数据量场景性能。

## 六、可选链 ?\. 与 空值合并 ??

### 1\. 可选链 Optional Chaining ?\.

**作用**：安全读取**深层嵌套属性**，中途遇到 null/undefined 直接返回 undefined，不报错。

```javascript
const user = { info: { name: "张三" } };

// 传统写法（层层判断，冗余）
const city = user && user.info && user.info.address && user.info.address.city;

// 可选链写法
const city2 = user.info.address?.city;
console.log(city2); // undefined 不报错

```

### 2\. 空值合并 Nullish Coalescing ??

**作用**：仅 **null / undefined** 时走默认值，**0、''、false 视为有效真值**（修复 \|\| 的 bug）。

```javascript
// || 缺陷：0、空字符串会被重置
const num1 = 0 || 100; 
console.log(num1); // 100（不符合预期）

// ?? 正确判断
const num2 = 0 ?? 100;
console.log(num2); // 0（符合预期）

const name = undefined ?? "默认姓名";
console.log(name); // 默认姓名

```

### 3\. 组合使用（项目高频）

```javascript
const address = user.info.address?.city ?? "未知城市";

```

## 七、数组扁平化：flat / flatMap

### 1\. Array\.flat\(\) 扁平化数组

**用法**：flat\(层数\)，去除数组嵌套，默认 1 层，**Infinity 彻底扁平化**。

```javascript
const arr = [1, [2, 3], [4, [5, 6]]];

console.log(arr.flat()); // 1层扁平化 [1,2,3,4,[5,6]]
console.log(arr.flat(Infinity)); // 彻底扁平化 [1,2,3,4,5,6]

// 经典场景：扁平化 + 去重
const newArr = [...new Set(arr.flat(Infinity))];

```

### 2\. Array\.flatMap\(\)

**等价逻辑**：先 map 遍历，再 flat\(1\) 扁平化，**只能扁平化1层**，简化代码。

```javascript
const list = ["前端 JS", "ES6 高级特性"];

// 拆分字符串并扁平化
const res = list.flatMap(item => item.split(" "));
console.log(res); // ['前端', 'JS', 'ES6', '高级特性']

```

## 八、Object 扩展方法（entries / values / fromEntries）

### 1\. Object\.values\(\)：获取对象值数组

```javascript
const obj = { name: "小明", age: 18 };
console.log(Object.values(obj)); // ["小明", 18]

```

### 2\. Object\.entries\(\)：对象转键值对数组

```javascript
console.log(Object.entries(obj)); 
// [["name","小明"], ["age",18]]

// 可直接遍历
for (const [key, val] of Object.entries(obj)) {
  console.log(key, val);
}
```

### 3\. Object\.fromEntries\(\)：键值对数组转回对象

**entries 反向操作**，支持数组、Map 转对象。

```javascript
const arr = [["name", "小红"], ["age", 20]];
const newObj = Object.fromEntries(arr);
console.log(newObj); // { name: '小红', age: 20 }

// Map 转对象
const map = new Map([["a", 1], ["b", 2]]);
console.log(Object.fromEntries(map)); // { a:1, b:2 }

```

## 九、核心总结与面试高频考点

- **WeakSet/WeakMap**：弱引用、GC 自动回收、解决内存泄漏、不可遍历；

- **Proxy/Reflect**：元编程、拦截对象行为、Vue3 响应式底层原理；

- **Symbol**：唯一键、私有属性、防冲突、修改原生底层行为；

- **Iterator/Generator**：统一迭代协议、惰性求值、async/await 底层；

- **async Generator**：异步惰性迭代，适配大数据流、分页场景；

- **?\. / ??**：安全取值、精准空值兜底，规避 JS 隐式转换 bug；

- **flat/flatMap**：快速数组扁平化，简化嵌套数组处理；

- **Object 扩展方法**：实现对象与数组、Map 的快速互转，极简数据处理。

> （注：文档部分内容可能由 AI 生成）
