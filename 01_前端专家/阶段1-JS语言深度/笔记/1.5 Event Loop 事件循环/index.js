// 基础实战案例（入门）
// console.log("1.同步代码")
// // 宏任务
// setTimeout(()=>{
//     console.log("4. 宏任务 setTimeout")
// },0)
// // 微任务
// Promise.resolve().then(()=>{
//     console.log("3. 微任务 Promise")
// })
// console.log("2. 同步代码")

// // 输出顺序: 1-2-3-4


// 进阶实战案例（嵌套微任务）
// console.log("1.同步");
// setTimeout(()=>{
//     console.log("5.宏任务");
// })
// Promise.resolve().then(()=>{
//     console.log("2.第一层微任务");
//     //微任务中嵌套新微任务
//     queueMicrotask(()=>{
//         console.log("3.嵌套微任务");
//     })
// })
// console.log("4.同步");

// // 输出顺序: 1-4-2-3-5


// 高阶实战案例（混合嵌套）
// console.log("start");
// setTimeout(()=>{
//     console.log("timer1");
//     Promise.resolve().then(()=>{
//         console.log("timer1-micro");
//     })
// },0)
// Promise.resolve().then(()=>{
//     console.log("micro1");
//     setTimeout(()=>{
//         console.log("time2")
//     },0)
// })
// console.log("end")
// 最终输出顺序：start → end → micro1 → timer1 → timer1-micro → timer2


// Node 专属经典案例（setTimeout vs setImmediate）
// 场景1：全局直接执行
// setTimeout(() => {
//   console.log("setTimeout");
// }, 0);

// setImmediate(() => {
//   console.log("setImmediate");
// });

// 结果：输出顺序**不确定**
// 原因：Node 初始化有耗时，若初始化完成 < 1ms，setImmediate 先执行；否则 setTimeout 先执行


// 场景2：放入 I/O 回调中（顺序固定）
const fs = require("fs");
fs.readFile(__filename, () => {
  setTimeout(() => console.log("setTimeout"), 0);
  setImmediate(() => console.log("setImmediate"));
});

// 固定输出：setImmediate → setTimeout
// 原因：I/O 回调在 poll 阶段执行，执行完毕后直接进入 check 阶段，优先执行 setImmediate
