// 词法作用域（JavaScript 真实运行行为）

// var a = 1;
// function foo(){
//     console.log(a); // 读取函数定义时外层的全局变量a
// }
// function bar(){
//     var a = 2;
//     foo(); // 调用位置不改变foo的作用域
// }
// bar();


// 习题1
// var a = 1;
// function foo(){
//     console.log(a);
//     var a = 2;
// }
// foo();
// 答案：undefined 解析：函数内var a声明提升，覆盖全局a，提升后初始值为undefined，赋值操作未执行。



// 习题2
// console.log(foo);
// function foo(){ return 1; }
// var foo = 2;
// console.log(foo);
// 答案：function、2 解析：函数声明提升优先级高于变量，初始为函数；执行阶段变量赋值覆盖为数字。

// 习题3
// let a = 10;
// if(true){
//     console.log(a);
//     let a = 20;
// }
// 答案：ReferenceError 解析：块内let a形成独立作用域，声明前处于暂时性死区，禁止访问。