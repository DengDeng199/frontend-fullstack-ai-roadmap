# JavaScript this 五大绑定规则学习资料（含案例\+优先级）

## 一、核心前置认知

**this 的核心本质**：`this` 的指向**由函数调用方式决定**，和函数定义位置无关。JavaScript 中所有 `this` 指向问题，都可以通过 5 大绑定规则 \+ 优先级完全判定。

五大绑定规则：默认绑定、隐式绑定、显式绑定、new 绑定、箭头函数绑定

通用优先级：**new 绑定 \&gt; 显式绑定 \&gt; 隐式绑定 \&gt; 默认绑定**

## 二、五大绑定规则详解（含实战案例）

### 1\. 默认绑定（最基础、兜底规则）

#### 1\.1 核心规则

函数独立调用（无任何修饰、无对象调用、无绑定、无 new）时触发默认绑定：

- **非严格模式**：this 指向 **全局对象**（浏览器：`window`，Node：`globalThis`）

- **严格模式（use strict）**：this 指向 **undefined**

#### 1\.2 实战案例

```javascript
// 非严格模式
function fn() {
  console.log(this); // 浏览器：Window 全局对象
}
fn(); // 独立调用，触发默认绑定

// 严格模式
function strictFn() {
  'use strict';
  console.log(this); // undefined
}
strictFn();
```

#### 1\.3 适用场景

普通函数直接调用、匿名函数自执行、定时器回调（无绑定情况下）等无调用主体的场景。

### 2\. 隐式绑定（对象调用规则）

#### 2\.1 核心规则

函数被 **对象\.方法** 的形式调用时，触发隐式绑定：**this 指向调用该方法的层级最近的对象**。

#### 2\.2 基础案例

```javascript
const obj = {
  name: '张三',
  sayName() {
    console.log(this.name); // this 指向 obj
  }
}

obj.sayName(); // 输出：张三
```

#### 2\.3 重点：隐式丢失（高频易错）

隐式绑定会在**函数赋值、回调传参**时丢失绑定对象，降级为默认绑定。

```javascript
const obj = {
  name: '李四',
  sayName() {
    console.log(this.name);
  }
}

// 场景1：函数赋值，丢失隐式绑定
const fn = obj.sayName;
fn(); // 非严格模式：undefined（全局无name属性），严格模式：报错

// 场景2：定时器回调，丢失隐式绑定
setTimeout(obj.sayName, 1000); // 同样触发默认绑定，输出 undefined
```

### 3\. 显式绑定（手动强制修改 this 指向）

JS 提供 3 个方法手动修改函数 this 指向：`call\(\)`、`apply\(\)`、`bind\(\)`，不受调用方式影响，优先级高于隐式、默认绑定。

#### 3\.1 三个方法核心区别

- **call**：立即执行函数，参数逐个传递

- **apply**：立即执行函数，参数以数组形式传递

- **bind**：**硬绑定**，返回一个新函数（不立即执行），永久绑定 this 指向，无法被二次修改

#### 3\.2 实战案例

```javascript
function sayName(age, gender) {
  console.log(this.name, age, gender);
}

const person = { name: '王五' };

// call 用法
sayName.call(person, 20, '男'); // 输出：王五 20 男

// apply 用法
sayName.apply(person, [22, '女']); // 输出：王五 22 女

// bind 硬绑定用法
const newFn = sayName.bind(person, 18, '男');
newFn(); // 输出：王五 18 男

// 硬绑定验证：二次绑定无效
const newFn2 = newFn.bind({ name: '赵六' });
newFn2(); // 仍输出：王五 18 男
```

### 4\. new 绑定（构造函数专属规则）

#### 4\.1 核心规则

通过 `new` 关键字调用构造函数时，触发 new 绑定：**this 指向当前 new 出来的实例对象**。

new 执行过程：创建空实例对象 → 绑定 this 到实例 → 执行构造函数代码 → 默认返回该实例。

#### 4\.2 实战案例

```javascript
function Person(name, age) {
  // this 指向 new 创建的实例
  this.name = name;
  this.age = age;
  console.log(this); // Person { name: '小明', age: 18 }
}

// new 绑定
const p1 = new Person('小明', 18);
console.log(p1.name); // 输出：小明
```

#### 4\.3 注意点

new 绑定优先级最高，会覆盖显式、隐式、默认所有绑定规则。

### 5\. 箭头函数绑定规则（特殊规则，无 this）

#### 5\.1 核心规则

箭头函数**没有自己的 this**，不适用上述 4 种绑定规则！

箭头函数的 this 只会**继承外层最近一层词法作用域的 this**，且绑定后永久固定，无法修改（call/apply/bind/new 均无效）。

#### 5\.2 实战案例（解决定时器 this 丢失痛点）

```javascript
const obj = {
  name: '小红',
  sayName() {
    // 箭头函数继承外层 sayName 的 this（指向 obj）
    setTimeout(() => {
      console.log(this.name); // 输出：小红
    }, 1000)
  }
}

obj.sayName();
```

#### 5\.3 易错坑点

```javascript
// 对象属性的箭头函数，外层作用域是全局，this 指向全局
const obj2 = {
  name: '小绿',
  fn: () => {
    console.log(this.name); // 全局无name，输出 undefined
  }
}
obj2.fn();
```

## 三、this 绑定优先级（全网通用标准）

### 3\.1 优先级从高到低

**new 绑定 \&gt; 显式绑定（bind 硬绑定） \&gt; 隐式绑定 \&gt; 默认绑定**

### 3\.2 优先级验证案例

```javascript
// 1. 显式 > 隐式
const obj1 = { name: 'A' };
function test() {
  console.log(this.name);
}
obj1.test = test;
obj1.test.call({ name: 'B' }); // 输出 B，显式覆盖隐式

// 2. new > 显式
function Test() {
  this.name = 'C';
}
const bindTest = Test.bind({ name: 'D' });
const res = new bindTest();
console.log(res.name); // 输出 C，new 覆盖显式绑定
```

## 四、核心知识点总结表

|绑定规则|触发条件|this 指向|优先级|
|---|---|---|---|
|new 绑定|new 调用构造函数|新创建的实例对象|最高|
|显式绑定|call / apply / bind 手动绑定|手动指定的对象|次高|
|隐式绑定|对象\.方法 调用|调用方法的对象|中等|
|默认绑定|无任何绑定、独立调用|全局对象/undefined（严格模式）|最低|
|箭头函数|箭头函数专属|继承外层词法作用域 this|独立规则，不参与优先级对比|

## 五、核心总结

1. 普通函数 this 由**调用方式**决定，遵循四大优先级规则；

2. 箭头函数无独立 this，仅继承外层作用域，彻底规避 this 丢失问题；

3. 隐式丢失、bind 硬绑定、new 优先级覆盖是面试/开发高频考点；

4. 所有 this 问题，可通过「先看箭头函数→再看new→再看显式→再看隐式→最后默认」流程快速判定。



> （注：文档部分内容可能由 AI 生成）
