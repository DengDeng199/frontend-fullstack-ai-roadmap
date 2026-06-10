// 实现一个Promise
// 基础特性：三种状态、状态不可逆、then链式调用、异步执行、回调收集、不做复杂兼容/微任务/异常边界拓展，满足入门理解

// Promise 核心规则回顾：
// 1.三种状态：pending、fulfilled、rejected，状态一旦改变无法再切换
// 2.初始化为pending状态
// 3.执行器函数excutor立即执行，reject改为rejected
// 4.resolve把状态改为fulfilled，支持链式调用，返回新Promise
// 5.then方法接收成功回调和失败回调，支持链式调用，返回新Promise
// 6.异步场景下，pending状态时会收集回调，状态变更后再执行

class MyPromise {
    static PENDING = "pending";
    static FULFILLED = "fulfilled";
    static REJECTED = "rejected";

    constructor(excutor){
        // 定义属性
        this.state = MyPromise.PENDING;
        this.value = undefined;
        this.reason = undefined;
        this.onResolvedCallbacks = [];
        this.onRejectedCallbacks = [];

        // 定义resolve和reject
        const resolve = (value) => {
            if(this.state === MyPromise.PENDING){
                this.state = MyPromise.FULFILLED;
                this.value = value;
                this.onResolvedCallbacks.forEach(cb => cb());
            }
        }
        const reject= (reason) => {
            if(this.state === MyPromise.PENDING){
                this.state = MyPromise.REJECTED;
                this.reason = reason;
                this.onRejectedCallbacks.forEach(cb => cb());
            }
        }

        // 定义执行器
        try {
            excutor(resolve, reject)
        } catch (error) {
            reject(error)
        }
    }

    then(onFullfilled, onRejected){
        onFullfilled = typeof onFullfilled === "function" ? onFullfilled : value => value;
        onRejected = typeof onRejected === "function" ? onRejected : reason => {throw reason};

        return new MyPromise((resolve, reject) => {
            if(this.state === MyPromise.FULFILLED){
                try {
                    const res = onFullfilled(this.value);
                    resolve(res)
                } catch (error) {
                    reject(error)
                }
            }
            if(this.state === MyPromise.REJECTED){
                try {
                    const res = onRejected(this.reason);
                    resolve(res)
                } catch (error) {
                    reject(error)
                }
            }
            if(this.state === MyPromise.PENDING){
                this.onResolvedCallbacks.push((val) => {
                    try {
                        const res = onFullfilled(val);
                        resolve(res)
                    } catch (error) {
                        reject(error)
                    }
                })
                this.onRejectedCallbacks.push((val) => {
                    try {
                        const res = onRejected(val);
                        resolve(res)
                    } catch (error) {
                        reject(error)
                    }
                })
              
            }
        })
    }
    catch(onRejected){
        return this.then(undefined, onRejected)
    }
    finally(callback){
      return this.then(
        value => {
            callback();
            return value;
        },
        reason => {
            callback();
            throw reason;
        }
      )
    }
}


new MyPromise(resolve => resolve(1))
.then(num => {
  console.log(num);
  return num + 1;
})
.then(num => {
  console.log(num);
  throw new Error('主动抛出错误');
})
.catch(err => console.log('异常：', err.message))
.finally(() => console.log('流程结束'));