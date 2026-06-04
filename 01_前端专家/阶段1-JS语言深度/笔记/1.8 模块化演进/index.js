// 同步导入模块
const mod = require("./module.js");

console.log(mod.name);
console.log(mod.getName());
console.log(mod.age);


// 导入默认导出 + 解构导入
// import sayHello, { name, getTime } from "./esm.js";

// sayHello(); // Hello ESM
// console.log(name); // ESM模块
// console.log(getTime()); // 时间戳
