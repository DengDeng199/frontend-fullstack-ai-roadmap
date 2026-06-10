/**
 * 基础防抖
 * @param {Function} fn 目标函数
 * @param {Number} delay 延迟时间(ms)
 * @returns {Function} 防抖函数
 */
function debounce(fn, delay){
    let timer = null
    return function(...args){
        if(timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args)
            timer = null;
        }, delay)
    }
}