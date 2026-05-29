# JavaScript 原型与原型链 超全归纳（含实战案例）

**核心前置认知**：原型链是 JavaScript 面向对象编程的底层基础，JS 中**万物皆对象**，几乎所有对象的属性、方法复用、继承特性，全部依赖原型与原型链机制实现。

## 一、核心基础概念：原型、prototype 与 \_\_proto\_\_

### 1\. 核心定义

- **显式原型 prototype**：**仅函数拥有**（构造函数、普通函数、类），是函数的一个属性，值为一个对象。作用：**存储所有实例共享的属性和方法**。

- **隐式原型 \_\_proto\_\_**：**所有对象都拥有**（实例对象、数组、正则、普通对象等），是对象的一个内置属性。作用：**指向创建该对象的构造函数的 prototype**，是原型链查找的核心链路。

### 2\. prototype 与 \_\_proto\_\_ 核心区别

|特性|prototype（显式原型）|\_\_proto\_\_（隐式原型）|
|---|---|---|
|所属主体|仅 **函数** 拥有|所有**对象** 拥有|
|核心作用|挂载实例共享的属性、方法|构建原型链，实现属性方法查找|
|可操作性|开发者可主动修改、新增属性方法|ES 标准不推荐直接修改（浏览器兼容属性）|
|指向关系|函数\.prototype = 原型对象|实例\.\_\_proto\_\_ = 构造函数\.prototype|

### 3\. 实战案例

```javascript
// 1. 定义构造函数
function Person(name) {
  this.name = name;
}

// 2. 给函数的 prototype 挂载共享方法
Person.prototype.sayHello = function() {
  console.log(`你好，我是${this.name}`);
}

// 3. 创建实例对象
const p1 = new Person("张三");

// 验证指向关系
console.log(Person.prototype); // 原型对象（函数的显式原型）
console.log(p1.__proto__ === Person.prototype); // true 核心等式

```

## 二、constructor 属性

### 1\. 核心原理

**constructor** 是**原型对象（prototype）**上的默认属性，指向**该原型对应的构造函数**。

所有实例对象可通过 \_\_proto\_\_ 溯源找到 constructor，因此实例也能访问该属性。

### 2\. 实战案例

```javascript
function Person() {}
const p1 = new Person();

// 1. 原型对象的 constructor 指向自身构造函数
console.log(Person.prototype.constructor === Person); // true

// 2. 实例通过原型链访问 constructor
console.log(p1.constructor === Person); // true

// 3. 易错点：重写 prototype 会丢失 constructor，需要手动修复
Person.prototype = {
  sayHello: function() {}
}
console.log(p1.constructor === Person); // false（指向 Object）

// 手动修复 constructor
Person.prototype.constructor = Person;
console.log(p1.constructor === Person); // true

```

**关键注意**：手动改写原型对象时，必须重置 constructor，否则会导致实例构造函数溯源错误。

## 三、原型链查找机制（核心重点）

### 1\. 完整查找规则

1. 当访问一个对象的属性/方法时，**优先查找对象自身**；

2. 如果自身不存在，通过 **\_\_proto\_\_** 向上查找其原型对象；

3. 逐级向上递归查找，直到 **Object\.prototype**（顶层原型）；

4. 若 Object\.prototype 仍未找到，返回 **undefined**，原型链终止于 **null**（Object\.prototype\.\_\_proto\_\_ === null）。

### 2\. 实战案例

```javascript
// 构造函数
function Person(name) {
  this.name = name; // 自身属性
}

// 一级原型方法
Person.prototype.sayName = function() {
  console.log(this.name);
}

// 顶层 Object 原型方法（所有对象共享）
console.log(Person.prototype.__proto__ === Object.prototype); // true

const p1 = new Person("李四");

// 1. 查找自身属性
console.log(p1.name); // 李四（自身存在，直接返回）

// 2. 查找原型链一级方法
p1.sayName(); // 李四（自身无，找到 Person.prototype）

// 3. 查找顶层原型方法
console.log(p1.toString()); // [object Object]（自身、Person原型均无，找到Object原型）

// 4. 无该属性，返回undefined
console.log(p1.age); // undefined
```

## 四、JavaScript 七种继承实现方式（全解析\+案例\+优劣）

JS 继承的核心目的：**复用父类的属性和方法**，实现代码复用，基于原型链机制实现。

### 1\. 原型链继承

**原理**：将子类的 prototype 指向父类的实例，子类实例可通过原型链访问父类属性方法。

```javascript
// 父类
function Parent(name) {
  this.name = name;
  this.hobbies = ["读书", "运动"];
}
Parent.prototype.sayName = function() {
  console.log(this.name);
}

// 子类
function Child() {}
// 核心：子类原型 = 父类实例
Child.prototype = new Parent("父类");

const c1 = new Child();
c1.sayName(); // 父类
console.log(c1.hobbies); // ["读书", "运动"]

```

**优缺点**：
✅ 实现简单
❌ 无法给父类传参；❌ 引用类型属性会被所有实例共享，修改相互影响

### 2\. 构造函数继承（借用构造函数）

**原理**：在子类构造函数中，通过 `call/apply` 调用父类构造函数，绑定子类 this。

```javascript
function Parent(name) {
  this.name = name;
  this.hobbies = ["读书", "运动"];
}

function Child(name) {
  // 核心：借用父类构造函数
  Parent.call(this, name);
}

const c1 = new Child("子类1");
const c2 = new Child("子类2");

c1.hobbies.push("画画");
console.log(c1.hobbies); // ["读书", "运动", "画画"]
console.log(c2.hobbies); // ["读书", "运动"]（互不影响）

```

**优缺点**：
✅ 可传参、解决引用类型共享问题
❌ 只能继承父类实例属性，无法继承原型方法；❌ 方法无法复用

### 3\. 组合继承（原型链\+构造函数）

**原理**：结合两种继承优点，**构造函数继承实例属性**，**原型链继承原型方法**。

```javascript
function Parent(name) {
  this.name = name;
  this.hobbies = ["读书"];
}
Parent.prototype.sayName = function() {
  console.log(this.name);
}

function Child(name, age) {
  Parent.call(this, name); // 继承实例属性
  this.age = age;
}
Child.prototype = new Parent(); // 继承原型方法
Child.prototype.constructor = Child; // 修复构造函数

const c1 = new Child("小明", 18);
c1.sayName(); // 小明
console.log(c1.age); // 18

```

**优缺点**：
✅ 可传参、属性不共享、方法可复用
❌ **父类构造函数执行两次**（一次call、一次new），存在冗余

### 4\. 原型式继承（Object\.create）

**原理**：基于已有对象，创建一个新对象，新对象的 \_\_proto\_\_ 指向原对象，实现浅继承。

```javascript
const parent = {
  name: "父对象",
  hobbies: ["跑步"]
}

// 核心：Object.create 实现原型式继承
const child1 = Object.create(parent);
const child2 = Object.create(parent);

child1.name = "子对象";
child1.hobbies.push("游泳");

console.log(child1.name); // 子对象（自身属性）
console.log(child2.hobbies); // ["跑步", "游泳"]（引用属性共享）

```

**优缺点**：
✅ 无需定义构造函数，适合简单对象继承
❌ 引用类型属性依然共享；❌ 无法传参

### 5\. 寄生式继承

**原理**：在原型式继承基础上，封装函数、新增自定义方法，增强对象。

```javascript
function createChild(parentObj) {
  // 原型式继承创建新对象
  const child = Object.create(parentObj);
  // 寄生：新增自定义方法
  child.sayHi = function() {
    console.log("你好");
  }
  return child;
}

const parent = { name: "父对象" };
const child = createChild(parent);
child.sayHi(); // 你好
console.log(child.name); // 父对象

```

**优缺点**：
✅ 可自定义扩展方法
❌ 方法无法复用，每个实例都会创建新方法

### 6\. 寄生组合式继承（**最理想方案**）

**原理**：解决组合继承的两次构造函数执行问题，**只继承父类原型，不执行父类构造函数**。

```javascript
function Parent(name) {
  this.name = name;
  this.hobbies = ["读书"];
}
Parent.prototype.sayName = function() {
  console.log(this.name);
}

function Child(name, age) {
  Parent.call(this, name); // 继承实例属性（仅执行一次）
  this.age = age;
}

// 核心：寄生组合继承关键代码
Child.prototype = Object.create(Parent.prototype); // 继承原型方法，不调用父类构造
Child.prototype.constructor = Child; // 修复构造函数

const c1 = new Child("小红", 20);
c1.sayName(); // 小红
console.log(c1.age); // 20

```

**优缺点**：
✅ 无冗余执行、可传参、属性不共享、方法可复用
✅ 几乎完美解决所有继承缺陷，**原生继承底层实现方案**

### 7\. ES6 class extends（语法糖）

**原理**：ES6 类继承语法糖，**底层基于寄生组合式继承实现**，语法更简洁。

```javascript
// 父类
class Parent {
  constructor(name) {
    this.name = name;
  }
  sayName() {
    console.log(this.name);
  }
}

// 子类继承父类
class Child extends Parent {
  constructor(name, age) {
    super(name); // 必须调用super，继承父类实例属性
    this.age = age;
  }
  sayAge() {
    console.log(this.age);
  }
}

const c1 = new Child("小刚", 19);
c1.sayName(); // 小刚
c1.sayAge(); // 19

```

**特点**：语法简洁、语义清晰，本质是寄生组合式继承的封装，是目前开发首选继承方式。

## 五、hasOwnProperty / in / instanceof 工作原理与案例

### 1\. hasOwnProperty\(\)

**原理**：**仅检测对象自身是否拥有该属性**，不遍历原型链。

```javascript
function Person() {
  this.name = "张三";
}
Person.prototype.age = 18;
const p1 = new Person();

console.log(p1.hasOwnProperty("name")); // true（自身属性）
console.log(p1.hasOwnProperty("age")); // false（原型属性）
```

### 2\. in 运算符

**原理**：检测**属性是否存在于对象自身或原型链中**，只要链路中存在即返回 true。

```javascript
console.log("name" in p1); // true（自身）
console.log("age" in p1); // true（原型链）
console.log("sex" in p1); // false（不存在）

```

### 3\. instanceof 运算符

**原理**：检测**构造函数的 prototype 是否出现在实例的原型链上**，判断对象是否为某个构造函数的实例。

```javascript
function Person() {}
const p1 = new Person();

console.log(p1 instanceof Person); // true
console.log(p1 instanceof Object); // true（所有对象都继承自Object）
console.log([] instanceof Array); // true
console.log([] instanceof Object); // true

```

## 六、核心总结

1. 原型链核心链路：**实例\.\_\_proto\_\_ → 构造函数\.prototype → Object\.prototype → null**；

2. prototype 是函数的模板，\_\_proto\_\_ 是对象的溯源链路，二者配合实现属性方法复用；

3. 继承迭代核心：从“功能残缺”到“完美复用”，**寄生组合式继承是底层最优解，ES6 class 是开发最优解**；

4. 属性检测三方法：**hasOwnProperty 只看自身、in 看全链路、instanceof 判原型链归属**；

5. 所有 JS 面向对象特性（继承、多态、复用），全部依托**原型链机制**实现，是 JS 核心底层原理。

> （注：文档部分内容可能由 AI 生成）
