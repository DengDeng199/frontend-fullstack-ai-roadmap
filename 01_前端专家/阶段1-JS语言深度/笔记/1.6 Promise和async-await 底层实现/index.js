// 1. Promise 三种私有状态
// pending(等待)：初始状态，异步任务未完成
// fulfilled(成功)：异步任务执行成功，返回结果
// rejected(失败)：异步任务执行失败，抛出错误

// 2.状态流转核心规则
// 初始状态为pending;
// pending可单向流转变为fulfilled或rejected；
// 状态一旦改变，永久固定，无法二次修改；
// resolve()触发成功状态，reject()触发失败状态；

// 3.状态流转实战案例
// //  基础状态流转
// const p1 = new Promise((resolve, reject) => {
//     resolve("成功结果"); // pending => fulfilled
//     reject("失败结果"); // 无效! 状态已固定，无法修改
// })
// p1.then(res => console.log(res)).catch(err => console.log(err));
// // 输出：成功结果

// // 初始pending状态
// const p2 = new Promise(()=>{});
// console.log(p2);
// // 关键结论：Promise 状态单向不可逆，是链式调用的底层基础。


// 手写源码实现 Promise.allSettled
// 执行规则
// 接收 Promise 数组，所有 Promise 成功，结果数组按顺序返回；
// 任意一个失败，立即返回该失败结果（短路机制）。
// Promise.myAllSettled = function(promiseList){
//     return new Promise((resolve)=>{
//         if(!Array.isArray(promiseList)){
//             throw new TypeError("参数必须是数组");
//         }
//         const result = [];
//         const len = promiseList.length;
//         let count = 0;

//         for(let i = 0; i < len; i++){
//             Promise.resolve(promiseList[i]).then(res => {
//                 result[i] = {
//                     status: "fulfilled",
//                     value: res
//                 }
//             }).catch(err => {
//                 result[i] = {
//                     status: "rejected",
//                     reason: err
//                 }
//             }).finally(() => {
//                 count++;
//                 if(count === len){
//                     resolve(result);
//                 }
//             })
//         }
//     })
// }

// // 测试案例
// const p3 = Promise.resolve("成功");
// const p4 = Promise.reject("失败");
// // Promise.allSettled([p3, p4]).then(res => console.log(res))
// Promise.myAllSettled([p3, p4]).then(res => console.log(res))


// Promise.race（竞速机制，最先完成者胜出）
// 执行规则：竞速模式，谁先执行完成（成功/失败），返回谁的结果；其余未完成 Promise 继续执行，但结果被忽略。
// Promise.myRace = function(promiseList){
//     return new Promise((resolve, reject)=>{
//         if(!Array.isArray(promiseList)){
//             throw new TypeError("参数必须是数组");
//         }
//         for(let i = 0; i < promiseList.length; i++){
//             Promise.resolve(promiseList[i]).then(res => {
//                 resolve(res);
//             }).catch(err => {
//                 reject(err);
//             })
//         }
//     })
// }
// //测试案例
// const timer1 = new Promise(res => setTimeout(()=> res("1秒"),1000))
// const timer2 = new Promise(res => setTimeout(()=> res("2秒"),2000))
// // Promise.race([timer1, timer2]).then(res => console.log(res))
// Promise.race([timer1, timer2]).then(res => console.log(res))


//  Promise.any（最先成功，全部失败才失败）
// 执行规则：最先成功，全部失败才失败；
// Promise.myAny = function(promiseList){
//    return new Promise((resolve, reject)=>{
//         if(!Array.isArray(promiseList)){
//             return reject(new Error("参数必须是数组"))
//         }
//         const errList = [];
//         let count = 0;
//         const len = promiseList.length;
//         if(len === 0) reject(new AggregateError([], "All promises were rejected"))

//         for(let i = 0; i < len; i++){
//             Promise.resolve(promiseList[i]).then(res => {
//                 resolve(res); // 第一个成功直接返回
//             }).catch(err => {
//                 errList[i] = err;
//                 count++;
//                 // 全部失败，抛出聚合错误
//                 if(count === len) reject(new AggregateError(errList, "All promises were rejected"))
//             })
//         }
//    })
// }
// // 测试案例
// const p5 = Promise.reject("失败1");
// const p6 = Promise.resolve("成功2");
// const p7 = Promise.reject("失败2");

// Promise.myAny([p5, p6, p7]).then(res => console.log(res)); // 成功2


// async/await 底层本质：Generator + Promise 语法糖

// // 日常 async/await 写法
// async function fn() {
//     const res = await Promise.resolve("异步结果");
//     console.log(res);
// }
// // 底层等价 Generator 实现
// function* gen(){
//     const res = yield Promise.resolve("异步结果");
//     console.log(res);
// }
// // 自动执行器（async底层自动封装）
// function run(gen){
//     const g = gen();
//     function next(data){
//         const {value, done} = g.next(data);
//         if(done) return;
//         Promise.resolve(value).then(res => next(res));
//     }
//     next();
// }
// run(gen);


// Promise / async-await 错误处理策略
// 方案1：Promise 链式 .catch()
// Promise.reject("接口报错").then(res => res).catch(err => {
//     console.log("捕获错误：", err);
// })
// 方案2 async/await + try-catch
// async function request() {
//     try{
//         const res = await Promise.reject("请求失败")
//     } catch(err){
//         console.log("捕获错误：", err);
//     }
// }
// request()


// 1.手写通用并发控制器
class PromiseLimit {
    constructor(limit){
        this.limit = limit; // 并发控制数
        this.taskQueue = []; 
        this.running = 0
    }
    // 添加任务
    add(task){
        return new Promise((resolve) => {
            this.taskQueue.push({
                task,
                resolve
            })
            this.run()
        })
    }
    // 执行任务
    run(){
        if(this.running > this.limit || this.taskQueue.length === 0) return
        const { task, resolve } = this.taskQueue.shift()
        this.running++
        task().then(res => {
            resolve(res)
        }).finally(() => {
            this.running--
            this.run()
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
