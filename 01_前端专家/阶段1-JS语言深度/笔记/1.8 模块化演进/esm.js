export const name = "ES模块";
export const getTime = () => Date.now();

// 新增默认导出
const sayHello = () => console.log("Hello ESM");
export default sayHello;
