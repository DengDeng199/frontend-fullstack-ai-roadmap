// 1.私有变量封装
// function createPerson(name){
//     // 私有变量：外部无法直接访问、修改
//     let age = 18;

//     // 暴露公有方法（闭包），操作私有变量
//     return{
//         getName: function(){
//             return name;
//         },
//         getAge: function(){
//             return age;
//         },
//         growUp: function(){
//             age++;
//         }
//     }
// }

// const p = createPerson("张三");
// console.log(p.getName()); // 张三
// console.log(p.getAge()); // 18
// p.growUp();
// console.log(p.getAge()); // 19
// console.log(p.age); // undefined（私有变量，无法直接访问）


// 2.模块化模式（IIFE + 闭包）
// IIFE 立即执行函数：独立作用域
// const Module = (function(){
//     // 私有变量、私有方法（外部无法访问）
//     let baseUrl = 'http://www.api.com';
//     function logInfo(str){
//         console.log('日志：' + str);
//     }

//     // 暴露公共API（闭包引用私有内容）
//     return{
//         getUrl: function(){
//             logInfo('获取接口地址');
//             return baseUrl;
//         },
//         setUrl: function(newUrl){
//             logInfo('修改接口地址');
//             baseUrl = newUrl;
//         }
//     }
// })();

// // 外部仅能操作暴露的方法
// console.log(Module.getUrl()); // http://www.api.com
// Module.setUrl('http://www.api2.com');
// console.log(Module.getUrl());  // http://www.api2.com

// // 无法访问私有内容
// console.log(Module.baseUrl); // undefined


// 3.通用柯里化函数
// 原始多参函数
function add(a, b, c){
    return a + b + c;
}

// // 定义通用柯里化函数
function currying(fn){
    return function curry(...args){
        if(args.length < fn.length){
            return function(...args2){
                return curry(...args, ...args2);
            }
        }
        return fn(...args);
    }   
}

// // 测试
const addCurrying = currying(add);
console.log(addCurrying(1, 2, 3)); 
console.log(addCurrying(1)(2, 3)); 
console.log(addCurrying(1)(2)(3)); 



// 接口地址拼接
// function getUrl(base, path) {
//     return base + path;
// }

// // 柯里化后面固定base地址，复用参数
// const getApiUrl = currying(getUrl)('http://www.api.com');
// console.log(getApiUrl('/user'));  // http://www.api.com/user
// console.log(getApiUrl('/order')); //    http://www.api.com/order

// 4.偏函数（Partial Application）
// 通用偏函数
// function partial(fn, ...fixedArgs){
//     // 闭包缓存固定参数 fixedArgs
//     return function(...restArgs){
//         return fn(...fixedArgs, ...restArgs);
//     }
// }

// // 原始函数：日志打印
// function log(type, msg){
//     console.log(`[${type}] ${msg}`);
// }

// // 偏函数固定type参数，生成定制函数
// const errorLog = partial(log, 'ERROR');
// const successLog = partial(log, 'SUCCESS');

// // 只传入剩余参数
// errorLog('请求失败'); 
// successLog('请求成功');


// 5.防抖函数（Debounce）
// 防抖函数（闭包保存timer）
function debounce(fn, delay = 500){
    let timer = null;
    return function(...args){
        if(timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    }
}

function fn(){
    console.log('执行函数')
}

const debounceFn = debounce(fn, 1000);
debounceFn()


// 6. 函数节流（Throttle）
// 节流函数（闭包保存上一次执行时间）
function throttle(fn, interval = 500){
   let lastTime = 0;
   return function(...args){
     const nowTime = Date.now();
     if(nowTime - lastTime > interval){
        fn.apply(this, fn)
        lastTime = nowTime;
     }
   }
}

// 测试：滚动监听
function handleScroll(){
    console.log('滚动监听...')
}

// 生成节流函数
const throttleScroll = throttle(handleScroll, 1000);
window.onscroll = throttleScroll;