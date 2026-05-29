// 3. 实战案例
// 1.定义构造函数
// function Person(name){
//     this.name = name;
// }

// // 2.给函数的prototype 挂载共享方法
// Person.prototype.sayHello = function(){
//     console.log(`你好，我是${this.name}`);
// }

// // 3.创建实例对象
// const p1 = new Person('张三');

// // 验证指向关系
// console.log(Person.prototype); // 原型对象（函数的显示原型）
// console.log(p1.__proto__ === Person.prototype); // true 核心等式


// constructor 属性
// 1. 核心原理:
// constructor 是原型对象（prototype）上的默认属性，指向该原型对应的构造函数
// 所有实例对象可通过 __proto__ 溯源找到 constructor，因此实例也能访问该属性。
// function Person(){}
// const p1 = new Person();

// // 1.原型对象的constructor属性，指向自身构造函数
// console.log(Person.prototype.constructor === Person); // true

// // 2.实例通过原型链访问 constructor
// console.log(p1.constructor === Person); // true

// // 3.易错点：重写prototype会丢失constructor，需要手动修复
// Person.prototype = {
//     sayHello: function(){}
// }
// console.log(p1.constructor === Person) // false（指向Object）

// // 手动修复 constructor
// Person.prototype.constructor = Person;
// console.log(p1.constructor === Person) // true


// 原型链查找机制（核心重点）实战案例
// 构造函数
// function Person(name){
//     this.name = name; // 自身属性
// }

// // 一级原型方法
// Person.prototype.sayHello = function(){
//     console.log(this.name);
// }

// // 顶层Object原型方法（所有对象共享）
// console.log(Person.prototype.__proto__ === Object.prototype) // true
// const p1 = new Person('李四');

// // 1.查找自身属性
// console.log(p1.name);  // 李四（自身存在，直接返回）

// // 2.查找原型链一级方法
// p1.sayName(); // 李四（自身无，找到Person.prototype）

// // 3.查找顶层Object原型方法
// console.log(p1.toString()); // [object Object]（自身、Person原型均无，找到Object原型）

// // 4.无该属性，返回undefined
// console.log(p1.age); //undefined


// 1. 原型链继承
// 原理：将子类的 prototype 指向父类的实例，子类实例可通过原型链访问父类属性方法。

// // 父类
// function Parent(name){
//     this.name = name;
//     this.hobbies = ['篮球', '足球'];
// }
// Parent.prototype.sayHello = function(){
//     console.log(`你好，我是${this.name}`);
// }
// // 子类
// function Child(){}
// Child.prototype = new Parent("张三"); 
// const c1 = new Child();
// c1.sayHello();
// console.log(c1.hobbies)


// 2.构造函数继承（借用构造函数）
// 原理：在子类构造函数中，通过 call/apply 调用父类构造函数，绑定子类 this。

// // 父类
// function Parent(name){
//     this.name = name;
//     this.hobbies = ['篮球', '足球'];
// }
// // 子类
// function Child(name){
//     Parent.call(this, name);
// }
// const c1 = new Child('张三');
// c1.hobbies.push('乒乓球')
// console.log(c1.hobbies)

// 3. 组合继承（原型链+构造函数）
// 原理：结合两种继承优点，构造函数继承实例属性，原型链继承原型方法。

// // 父类
// function Parent(name){
//     this.name = name;
//     this.hobbies = ['篮球', '足球'];
// }
// Parent.prototype.sayHello = function(){
//     console.log(`你好，我是${this.name}`);
// }
// // 子类
// function Child(name){
//     Parent.call(this, name);
// }
// Child.prototype = new Parent();
// const c1 = new Child('张三');
// c1.hobbies.push('乒乓球')
// console.log(c1.hobbies)
// c1.sayHello()

// 4. 原型式继承（Object.create）
// 原理：基于已有对象，创建一个新对象，新对象的 __proto__ 指向原对象，实现浅继承。

// const obj = {
//     name: "父对象",
//     hobbies: ['篮球', '足球']
// }
// const c1 = Object.create(obj);
// const c2 = Object.create(obj);
// c1.name = "子对象"
// c1.hobbies.push('乒乓球')
// console.log(c1.name, c1.hobbies)
// console.log(c1.name, c2.hobbies)

// 5. 寄生式继承
// 原理：在原型式继承基础上，封装函数、新增自定义方法，增强对象。

// function createObj(parentObj){
//     // 原型式继承创建进新对象
//     const child = Object.create(parentObj);
//     // 寄生:新增自定义方法
//     child.sayHi = function(){
//         console.log("你好")
//     }
//     return child;
// }
// const parent = {name: "父对象"};
// const child = createObj(parent)
// child.sayHi();
// console.log(child.name)



// 6. 寄生组合式继承（最理想方案）
// 原理：解决组合继承的两次构造函数执行问题，只继承父类原型，不执行父类构造函数。

// // 父类
// function Parent(name){
//     this.name = name;
//     this.hobbies = ['篮球', '足球'];
// }
// Parent.prototype.sayHello = function(){
//     console.log(`你好，我是${this.name}`);
// }
// // 子类
// function Child(name){
//     Parent.call(this, name);
// }
// Child.prototype = Object.create(Parent.prototype); // 继承原型方法,不调用父类构造函数
// Child.prototype.constructor = Child; // 修复构造函数



// 7. ES6 class extends（语法糖）
// 原理：ES6 类继承语法糖，底层基于寄生组合式继承实现，语法更简洁。

// 父类
class Parent{
    constructor(name){
        this.name = name;
        this.hobbies = ['篮球', '足球'];
    }
    sayHello(){
        console.log(`你好，我是${this.name}`);
    }
}
// 子类
class Child extends Parent{
    constructor(name, age){
        super(name);
        this.age = age
    }
    sayAge(){
        console.log("我的年龄是" + this.age)
    }
}
const c1 = new Child('张三', 18)



// 五、hasOwnProperty / in / instanceof 工作原理与案例

// 1. hasOwnProperty()
// 原理：仅检测对象自身是否拥有该属性，不遍历原型链。
// function Person(){
//     this.name = "张三";
// }
// Person.prototype.age = 18;
// const p1 = new Person();
// console.log(p1.hasOwnProperty('name')); 
// console.log(p1.hasOwnProperty('age'))

// 2. in 运算符
// 原理：检测属性是否存在于对象自身或原型链中，只要链路中存在即返回true
// console.log('name' in p1) // true（自身）
// console.log('age' in p1) // true（原型链）
// console.log('ses' in p1) // false（不存在）

// 3. instanceof 运算符
// 原理：检测构造函数的prototype是否出现在实例的原型链上，判断对象是否为某个构造函数的实例。

// function Person(){}
// const p1 = new Person();

// console.log(p1 instanceof Person) // true
// console.log(p1 instanceof Object) // true（所有对象都继承自Object）
// console.log([] instanceof Array) // true
// console.log([] instanceof Object) // true
// console.log(Array instanceof Object) // true
// console.log(p1 instanceof Array) // false