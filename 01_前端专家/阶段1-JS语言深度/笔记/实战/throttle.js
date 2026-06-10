/**
 * 节流 - 定时器版
 * @param {Function} fn
 * @param {number} interval 时间间隔(ms)
 * @returns {Function}
 */

function throttle(fn, interval){
    let timer = null;
    return function(...args){
        if(!timer){
            timer = setTimeout(() => {
               fn.apply(this, args)
                timer = null;
            }, interval);
        }
    }
}