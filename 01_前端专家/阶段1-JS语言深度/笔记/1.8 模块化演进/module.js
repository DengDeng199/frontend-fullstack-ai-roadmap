// CJS 顶层this
console.log(this === module.exports); // true
console.log(this === exports); // true
console.log(module.exports === exports); // true


// 单个导出
const name = "CommonJS";
const getName = () => {
    return name;
}

// 方式1
// module.exports.name = name;
// module.exports.getName = getName;
// exports.age = 20; // 此时仍然有效，因为 module.exports 没有被重新赋值


// 方式2
// module.exports = {
//     name,
//     getName,
//     age: 20
// };

// 方式3
exports.name = name;
exports.getName = getName;
exports.age = 20;


