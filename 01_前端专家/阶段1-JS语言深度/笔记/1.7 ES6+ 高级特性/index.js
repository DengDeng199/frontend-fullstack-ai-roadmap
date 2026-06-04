// WeakSet 特性与案例
// 特性：只能存储引用类型（对象、数组），不能存入基本数据类型，元素唯一、不可重复，弱引用、不可遍历、无size属性、无clear方法

// // 实战：存储临时DOM对象，DOM销毁后自动释放内存
// const weakSet = new WeakSet();

// let dom1 = { id: 1 };
// let dom2 = { id: 2 };

// weakSet.add(dom1);
// weakSet.add(dom2);

// console.log(weakSet.has(dom1));

// // 解除强引用，GC自动回收该对象
// dom1 = null;
// // 浏览器空闲时，dom1 会被自动回收，weakSet 自动清除该元素


// WeakMap 特性与案例（开发高频）
// 特性：键必须时引用类型，值可以是任意类型，键为弱引用，值为强引用，不可遍历、无size属性、无clear方法

// // 实战：对象私有缓存，防止内存泄漏
// const userCache = new WeakMap();
// let user1 = { name: "张三" };
// let user2 = { name: "李四" };
// //给对象绑定私有缓存数据
// userCache.set(user1, {age:18, token:"123456"});
// userCache.set(user2, {age:20, token:"654321"});
// console.log(userCache.get(user1)); // { age: 18, token: '123456' }
// // 销毁用户对象，缓存数据自动回收
// user1 = null;
// // GC 自动清除 user1 对应的缓存，彻底释放内存


// Proxy实战案例：简易 Vue3 响应式

// // 原始数据
// const rawData = { name: "小明", age: 18 };
// // 响应式拦截
// const reactiveData = new Proxy(rawData, {
//     // 拦截读取属性
//     get(target, prop){
//         console.log("读取属性：", prop);
//         return Reflect.get(target, prop)
//     },
//     // 拦截修改属性
//     set(target, prop, value){
//         console.log("更新属性：", prop, value);
//         // Reflect 返回布尔值，判断是否修改成功
//         const res = Reflect.set(target, prop, value)
//         return res
//     },
//     // 拦截删除属性
//     deleteProperty(target, prop){
//         console.log("删除属性：", prop)
//         return Reflect.deleteProperty(target, prop)
//     }
// })

// // 测试
// reactiveData.name = "小红"
// console.log(reactiveData.name);
// delete reactiveData.name
// console.log(reactiveData.name);


// Symbol（唯一私有属性键）
// 核心特性：
// ES6 新增第七种原始数据类型；
// 绝对唯一，解决对象属性名冲突问题；
// 不可遍历（for/in、Object.keys 无法遍历），实现私有属性；
// Symbol() === Symbol() // false。

// // 基础实战案例
// // 1. 创建唯一 Symbol
// const s1 = Symbol("key");
// const s2 = Symbol("key");
// console.log(s1 === s2); // false
// // 2.作为对象私有属性
// const obj = {
//     [s1]: "私有属性"
// }
// console.log(obj[s1]);  // 私有数据
// console.log(Object.keys(obj)) // [] 遍历不到
// console.log(JSON.stringify(obj))  // {} 序列化后丢失

// 全局Symbol与内置Symbol
// 全局注册表（可复用）
// const s3 = Symbol.for("global");
// const s4 = Symbol.for("global");
// console.log(s3 === s4);  // true

// 内置Symbol（修改原生底层行为）
// Symbol.iterator：自定义迭代规则
// Symbol.hasInstance：自定义 instanceof 逻辑
// Symbol.toStringTag：自定义对象打印标签

// 四、Iterator 与 Generator（迭代协议、惰性求值）
// 1. Iterator 迭代器（统一遍历协议）
// 核心：只要拥有Symbol.iterator属性，就可以被for...of遍历
// 原生可迭代对象：Array、String、Map、Set、Arguments、NodeList、DOM 集合

// // 自定义迭代器案例
// const myIterObj = {
//     list: [10, 20, 30],
//     [Symbol.iterator](){
//         let index = 0;
//         const self = this;
//         return {
//             next(){
//                 // next 返回 {value, done}
//                 return index < self.list.length
//                 ? {value: self.list[index++], done: false}
//                 : {value: undefined, done: true}
//             }
//         }
//     }
// }

// // 可直接for...of遍历
// for(const item of myIterObj){
//     console.log(item); // 10 20 30
// }


// Generator 生成器（惰性迭代）
// 核心特性：
// 1.函数声明：function* 而不是 function，通过yield 暂停执行；
// 2.惰性求值：调用next()才会执行下一步，按需求取值，节省内存；
// 3.分段执行、可暂停、可恢复，是async/await 底层核心；

// Generator 实战案例
// function* countGenerator(){
//     yield 1;
//     yield 2;
//     yield 3;
// }
// const gen = countGenerator();
// console.log(gen.next()); // { value: 1, done: false }
// console.log(gen.next()); // { value: 2, done: false }
// console.log(gen.next()); // { value: 3, done: false }
// console.log(gen.next()); // { value: undefined, done: true }

// async Generator 异步迭代
// 解决问题：普通Generator 只支持同步迭代，async Generator 支持异步按需迭代，用于异步数据流、分页拉去、文件流读取。

// 实战案例：异步迭代分页数据
// // 异步生成器
// async function* asyncDataGenerator(){
//     // 模拟异步请求
//     yield await new Promise(res => setTimeout(()=> res("第1页数据"), 1000))
//     yield await new Promise(res => setTimeout(()=> res("第2页数据"), 1000))
//     yield await new Promise(res => setTimeout(()=> res("第3页数据"), 1000))
// }

// // for await...of 遍历异步迭代器
// async function getData() {
//     for await(const page of asyncDataGenerator()){
//         console.log(page); // 每秒输出一条，按需迭代
//     }
// }
// getData();


// 可选链 ?. 与 空值合并 ??
// 1.可选链Optional Chaining ?.
// 作用：安全读取深层嵌套属性，中途遇到null/undefined 直接返回 undefined，不报错

// const user = { info: { name: "张三" } };
// // 传统写法（层层判断，冗余）
// const city = user && user.info && user.info.address && user.info.address.city;

// // 可选链写法 node版本14+ 支持
// const city2 = user?.info?.address?.city;
// console.log(city);  // 不报错


// 空值合并 Nullish Coalescing ??
// 作用：仅 null / undefined 时走默认值，0、''、false 视为有效真值（修复 || 的 bug）。

// // || 缺陷：0、空字符串会被重置
// const num1 = 0 || 100;
// console.log(num1); // 100（不符合预期）

// // ?? 正确判断
// const num2 = 0 ?? 100;
// console.log(num2); // 0（符合预期）

// const name3 = "" ?? "张三"
// console.log(name3);  // 默认姓名

// 组合使用（项目高频）
// const address = user?.info?.address ?? {city:"北京"}

// 数组扁平化：flat / flatMap
// // 1. Array.flat() 扁平化数组
// // 用法：flat(层数)，去除数组嵌套，默认1层，Infinity 彻底扁平化
// const arr = [1, [2, 3],[4, [5, 6]]];
// console.log(arr.flat()); // 1层扁平化 [1,2,3,4,[5,6]
// console.log(arr.flat(Infinity)); // 彻底扁平化 [1,2,3,4,5,6]
// // 经典场景：扁平化 + 去重
// const newArr = [...new Set(arr.flat(Infinity))]

// 2.Array.flatMap()
// // 等价逻辑:先map遍历,再flat(1)扁平化,只能扁平化1层
// const list = ["前端 JS", "ES6 高级特性"];
// // 拆分字符串并扁平化
// const res = list.flatMap(item => item.split(" "))
// console.log(res); 
// let res1 = list.map(item => item.split(" "))
// res1 = res1.flat()
// console.log(res1); 


// Object 扩展方法（entries / values / fromEntries）

// 1. Object.values()：获取对象值数组
// const obj = {name:"张三", age:18};
// console.log(Object.values(obj));  // ["张三", 18]

// 2.Object.entries()：对象转键值对数组
// console.log(Object.entries(obj));
// // [['name', '张三'], ['age', 18]]
// // 可以直接遍历
// for(const [key, value] of Object.entries(obj)){
//     console.log(key, value);
// }

// 3.Object.fromEntries()：键值对数组转回对象
// entries反向操作,支持数组、Map转对象
const arr = [["name", "小红"], ["age", 20]];
const newObj = Object.fromEntries(arr);
console.log(newObj);

// Map 转对象
const map = new Map([["a", 1],["b", 2]]);
console.log(Object.fromEntries(map)); // {a:1, b:2}