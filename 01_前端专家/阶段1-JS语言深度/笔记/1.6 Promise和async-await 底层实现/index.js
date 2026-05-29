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
//  基础状态流转
const p1 = new Promise((resolve, reject) => {
    resolve("成功结果"); // pending => fulfilled
    reject("失败结果"); // 无效! 状态已固定，无法修改
})
p1.then(res => console.log(res)).catch(err => console.log(err));
// 输出：成功结果

// 初始pending状态
const p2 = new Promise(()=>{});
console.log(p2);
// 关键结论：Promise 状态单向不可逆，是链式调用的底层基础。