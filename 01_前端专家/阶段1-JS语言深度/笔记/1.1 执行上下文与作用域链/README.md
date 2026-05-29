# JavaScript 执行上下文与作用域链 完整学习指南

这是JavaScript最核心、最容易混淆的基础概念，也是面试必考点。本文将按照**\&\#34;基础规则→运行环境→存储机制→查找机制→特殊行为\&\#34;**的逻辑顺序，结合大量可直接运行的代码案例，帮助开发者彻底掌握相关知识点。

> **核心前置结论**：JavaScript 的作用域在代码编写时就已确定（词法作用域），并非运行时确定。
> 
> 

## 一、核心基石：词法作用域 vs 动态作用域

### 1\. 本质区别（重中之重）

|特性|词法作用域（静态作用域）|动态作用域|
|---|---|---|
|**确定时机**|代码**编写/定义时**就完全确定|代码**运行/调用时**才确定|
|**决定因素**|函数/变量**定义的位置**|函数**调用的位置**|
|**代表语言**|JavaScript、Java、C\+\+|Bash、Perl（早期）|

> ✅ **必记核心**：JavaScript 采用**词法作用域**。函数可访问的变量，由定义位置决定，与调用位置无关。
> 
> 

### 2\. 对比实战案例

```javascript
// 词法作用域（JavaScript 真实运行行为）
var a = 1;

function foo() {
  console.log(a); // 读取函数定义时外层的全局变量 a
}

function bar() {
  var a = 2;
  foo(); // 调用位置不改变 foo 的作用域
}

bar(); // 输出：1（而非2）

```

若JS是动态作用域，代码会输出2。实际输出1，直接验证了JS的词法作用域特性。

## 二、代码运行环境：执行上下文（Execution Context）

JS引擎执行代码时，会创建专属的运行环境，即**执行上下文**，它管控代码可访问的变量、函数、this指向，是代码运行的核心载体。

### 1\. 三种执行上下文类型

|类型|创建时机|生命周期|核心特点|
|---|---|---|---|
|**全局执行上下文**|程序启动初始化时|页面关闭/脚本执行结束|全局唯一，变量对象为 window|
|**函数执行上下文**|函数被调用时|函数执行完毕后销毁|每次调用生成全新上下文，相互独立|
|**eval 执行上下文**|eval\(\) 执行代码时|eval 代码执行完毕后销毁|存在安全隐患、性能差，项目禁止使用|

### 2\. 执行上下文生命周期（核心流程）

所有执行上下文均经历两个阶段，**变量提升、作用域链创建、this绑定均发生在创建阶段**：

#### 阶段一：创建阶段（代码执行前）

引擎提前完成三件事：

1. 创建**变量对象\(VO\)**：存储变量声明、函数声明、函数形参

2. 创建**作用域链**：基于词法作用域，关联外层上下文变量对象

3. 绑定**this 指向**：根据函数调用方式确定this值

#### 阶段二：执行阶段

逐行解析执行代码，完成变量赋值、函数调用、逻辑运算等操作。

### 3\. 执行上下文栈（调用栈）

JS为单线程语言，通过**执行上下文栈**管理所有运行上下文，遵循**后进先出**规则：

- 栈底固定为**全局执行上下文**（全程存在）

- 函数调用时，新上下文压入栈顶

- 函数执行完毕，上下文弹出栈顶并销毁

#### 案例：调用栈执行流程

```javascript
function fn1() {
  fn2();
  console.log('fn1执行完毕');
}

function fn2() {
  console.log('fn2执行完毕');
}

fn1();
console.log('全局代码执行完毕');

// 调用栈变化过程：
// 1. 初始状态：[全局EC]
// 2. 调用fn1：[全局EC, fn1 EC]
// 3. fn1调用fn2：[全局EC, fn1 EC, fn2 EC]
// 4. fn2执行完毕弹出：[全局EC, fn1 EC]
// 5. fn1执行完毕弹出：[全局EC]
// 6. 全局代码执行完成

// 输出顺序：
// fn2执行完毕
// fn1执行完毕
// 全局代码执行完毕

```

## 三、变量存储机制：变量对象（VO）与活动对象（AO）

执行上下文中的所有变量、函数、参数，统一存储在变量对象中，VO/AO是理解变量提升的关键。

### 1\. 核心定义

- **变量对象（VO）**：执行上下文**创建阶段**的抽象对象，仅存储声明，无赋值

- **活动对象（AO）**：函数执行上下文**执行阶段**激活后的VO，新增arguments实参对象，可完成变量赋值

- 全局上下文的VO即为 window 对象，无AO概念

### 2\. VO 存储优先级（从高到低）

1. 函数形参（无实参则为undefined）

2. 函数声明（整体提升，优先级最高）

3. var 变量声明（仅声明提升，默认undefined）

### 3\. VO/AO 完整实战案例

```javascript
function test(a, b) {
  var c = 10;
  function d() {}
  var e = function() {};
}

test(1); // 调用函数，生成执行上下文

```

**创建阶段 VO 结构**：

```javascript
VO(test) = {
  arguments: {0:1, length:1},
  a: 1,
  b: undefined,
  d: ƒ d(), // 函数声明完整提升
  c: undefined,
  e: undefined // 函数表达式仅变量名提升
}

```

**执行阶段 AO 结构**：

```javascript
AO(test) = {
  arguments: {0:1, length:1},
  a: 1,
  b: undefined,
  d: ƒ d(),
  c: 10, // 完成赋值
  e: ƒ () // 完成赋值
}

```

## 四、变量查找核心：作用域链的形成与查找机制

作用域链是JS变量查找的唯一链路，基于词法作用域生成，贯穿代码整个运行过程。

### 1\. 作用域链形成规则

在**执行上下文创建阶段**生成，链路结构固定：
**当前上下文AO → 外层函数上下文AO → \.\.\. → 全局上下文VO**

内层作用域可访问外层变量，外层无法访问内层变量，链路单向不可逆。

### 2\. 变量查找机制

1. 从**当前作用域顶端（自身AO）**开始查找变量

2. 找到变量立即终止查找，使用当前值

3. 未找到则向上遍历外层作用域链

4. 遍历至全局作用域仍未找到，抛出 `ReferenceError`

### 3\. 实战案例：作用域链查找

```javascript
var globalVar = '全局变量';

function outer() {
  var outerVar = '外层变量';
  
  function inner() {
    var innerVar = '内层变量';
    console.log(innerVar); // 1. 当前AO直接找到
    console.log(outerVar); // 2. 向上查找外层outer的AO
    console.log(globalVar); // 3. 向上查找全局VO
    console.log(notExist); // 4. 全局未找到，报错
  }
  
  inner();
}

outer();

```

**inner函数作用域链**：\[AO\(inner\), AO\(outer\), VO\(全局\)\]

### 4\. 变量遮蔽（Shadowing）

内层作用域声明与外层同名变量时，内层变量会遮蔽外层变量，优先使用内层值：

```javascript
var a = 1;

function foo() {
  var a = 2; // 遮蔽全局a
  console.log(a); // 输出：2
}

foo();
console.log(a); // 输出：1（全局变量不受影响）

```

## 五、变量提升（Hoisting）：函数声明 vs 函数表达式

变量提升是执行上下文**创建阶段**的特有行为，引擎会提前扫描并提升声明，赋值操作保留在原位置。

### 1\. var 变量提升规则

- 仅**声明**提升，**赋值不提升**

- 提升后变量初始值为 `undefined`

```javascript
console.log(a); // 输出：undefined
var a = 10;
console.log(a); // 输出：10

// 等价解析
var a; // 声明提升
console.log(a);
a = 10; // 赋值保留原位
console.log(a);

```

### 2\. 函数声明提升（完整提升）

函数声明会**整体提升（声明\+函数体）**，可在声明前调用：

```javascript
foo(); // 正常执行，输出：我是函数声明

function foo() {
  console.log('我是函数声明');
}

```

### 3\. 函数表达式提升（仅变量名提升）

函数表达式本质是var变量声明，仅变量名提升，值为undefined，无法提前调用：

```javascript
bar(); // 报错：TypeError: bar is not a function

var bar = function() {
  console.log('我是函数表达式');
};

// 等价解析
var bar; // 变量名提升，值为undefined
bar(); // 调用undefined报错
bar = function() {}; // 赋值保留原位

```

### 4\. 提升优先级：函数声明 \&gt; 变量声明

同作用域同名的函数声明和变量声明，函数声明优先提升，变量声明不会覆盖：

```javascript
console.log(typeof foo); // 输出：function

var foo = 10;
function foo() {}

console.log(typeof foo); // 输出：number

```

创建阶段VO优先存入函数，执行阶段变量赋值才会覆盖函数值。

## 六、ES6 块级作用域：let/const 与暂时性死区（TDZ）

ES5 仅有全局、函数作用域，存在变量泄露问题；ES6 新增 `let/const` 实现**块级作用域**，并引入暂时性死区机制。

### 1\. 块级作用域特性

`\{\}` 包裹的代码块即为独立块级作用域，let/const 变量仅在当前块内有效：

```javascript
// var 无块级作用域，变量泄露
if (true) {
  var a = 1;
}
console.log(a); // 输出：1

// let/const 有块级作用域，变量隔离
if (true) {
  let b = 2;
}
console.log(b); // 报错：ReferenceError

```

### 2\. 暂时性死区（TDZ）核心

let/const 变量**不存在变量提升**，从块级作用域开始到变量声明语句之前的区域，即为**暂时性死区**，禁止访问变量，否则报错。

```javascript
// TDZ 开始
console.log(a); // 报错：Cannot access 'a' before initialization
let a = 10; // TDZ 结束
console.log(a); // 输出：10

```

**TDZ 本质**：创建阶段预留变量位置，但不初始化；执行到声明语句才完成初始化，初始化前禁止访问。

### 3\. var / let / const 完整对比

|特性|var|let/const|
|---|---|---|
|作用域范围|全局、函数作用域|块级作用域|
|变量提升|有（初始undefined）|无（存在TDZ）|
|重复声明|允许覆盖|禁止，报语法错误|
|全局挂载|挂载到window|不挂载到window|
|重新赋值|允许|let允许，const禁止|

### 4\. 经典实战：循环闭包问题解决

```javascript
// var 问题：无块级作用域，全局仅一个i
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000);
}
// 输出：3 3 3

// let 解决：每次循环生成独立块级作用域，独立i变量
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000);
}
// 输出：0 1 2

```

## 七、核心知识点终极串联总结

1. **底层基石**：JS 为词法作用域，作用域由代码**定义位置**决定，与运行调用位置无关。

2. **运行载体**：代码运行依赖执行上下文，分为全局、函数、eval三种，遵循创建、执行双阶段。

3. **变量存储**：创建阶段生成VO，执行阶段函数VO激活为AO，存储所有变量、参数、函数。

4. **查找规则**：作用域链在创建阶段生成，变量从内向外单向查找，存在变量遮蔽机制。

5. **提升规则**：函数声明完整提升，变量/函数表达式仅声明提升，函数声明优先级更高。

6. **ES6 优化**：let/const 实现块级作用域，无变量提升、含暂时性死区，解决var的变量污染问题。

## 八、自测习题（含答案解析）

### 习题1

```javascript
var a = 1;
function foo() {
  console.log(a);
  var a = 2;
}
foo();

```

**答案**：undefined
**解析**：函数内var a声明提升，覆盖全局a，提升后初始值为undefined，赋值操作未执行。

### 习题2

```javascript
console.log(foo);
function foo() { return 1; }
var foo = 2;
console.log(foo);

```

**答案**：function、2
**解析**：函数声明提升优先级高于变量，初始为函数；执行阶段变量赋值覆盖为数字。

### 习题3

```javascript
let a = 10;
if (true) {
  console.log(a);
  let a = 20;
}

```

**答案**：ReferenceError
**解析**：块内let a形成独立作用域，声明前处于暂时性死区，禁止访问。

> （注：文档部分内容可能由 AI 生成）
