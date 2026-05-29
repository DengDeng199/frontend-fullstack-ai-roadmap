// 2. 隐式绑定（对象调用规则）
// const obj = {
//     name:'李四',
//     sayName: function(){
//         console.log(this.name);
//     }
// }

// obj.sayName()
// const fn = obj.sayName;
// fn();


// 3. 显式绑定（手动强制修改 this 指向）
// function sayName(age, gender){
//     console.log(this.name, age, gender);
// }

// const person = { name: '王五' };
// // call用法
// sayName.call(person, 18, '男')
// // apply用法
// sayName.call(person, [22, '女'])
// // bind 硬绑定用法
// const newFn = sayName.bind(person, 21, '男')
// newFn();

// // 硬绑定验证：二次绑定无效
// const newFn2 = newFn.bind(person, 23, '女')
// newFn2();

// 4. new 绑定（构造函数专属规则）
// function Person(name, age){
//     // this指向new创建的实例
//     this.name = name;
//     this.age = age;
//     console.log(this); // Person {name: "张三", age: 18}
// }

// // new绑定
// const p1 = new Person('张三', 18);
// console.log(p1.name); // 输出 小明 


// 5. 箭头函数绑定规则（特殊规则，无 this）
// 5.2 实战案例（解决定时器 this 丢失痛点）
// const obj = {
//     name: '小红',
//     sayName(){
//         // 箭头函数继承外层 sayName 的 this（指向 obj）
//         setTimeout(() => {
//             console.log(this.name); // 输出：小红
//         }, 1000)
//     }
// }
// 5.3 易错坑点
const obj2 = {
    name: '小明',
    fn:() => {
        console.log(this.name);
    }
}
obj2.fn(); // 全局无name，输出undefined

// obj.sayName()

// 三、this 绑定优先级（全网通用标准）
// 3.1 优先级从高到低 new 绑定 > 显示绑定 > 隐式绑定 > 默认绑定
// 3.2 优先级验证案例

    // 1. 显示 > 隐式
    const obj1 = { name: 'A' };
    function test(){
        console.log(this.name);
    }
    obj1.test = test;
    obj1.test.call({name:'B'}) // 输出：B，显示绑定优先级更高

    // 2. new > 显示
    function Test(){
        this.name = 'C';
    }
    const bindTest = Test.bind({ name:'D' });
    const res = new bindTest();
    console.log(res.name);  // 输出 C，new 覆盖显示绑定