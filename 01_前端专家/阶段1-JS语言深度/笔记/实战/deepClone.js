// 实现深拷贝
function deepClone(target) {
    // 1.基础类型数据直接返回
    if(target === null || typeof target !== "object") return target;

    // 2.判断数组还是对象，创建对应的容器
    const cloneTarget = Array.isArray(target) ? [] : {};

    // 3.遍历属性递归拷贝
    for(let key in target){
        cloneTarget[key] = deepClone(target[key])
    }
    return cloneTarget;
}

// 测试
const obj = {
    a: 1,
    b: [2 ,3],
    c: {
        d : 4
    }
}
const cloneOjb = deepClone(obj)
cloneOjb.a = 2
cloneOjb.b[0] = 3
cloneOjb.c.d = 5
console.log(obj)
console.log(cloneOjb)