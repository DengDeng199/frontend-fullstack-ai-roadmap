// 手写一个EventEmitter
class EventEmitter{
    constructor(){
        this.events = new Map(); // 事件名 -> 回调数组
    }
    on(name, fn){
        if(!this.events.has(name)) this.events.set(name, [])
        this.events.get(name).push(fn)
        return () => this.off(name, fn) // 返回取消订阅函数，避免内存泄露
    }
    off(name, fn){
        const list = this.events.get(name) || []
        this.events.set(name, list.filter((f) => f !== fn))
    }
    emit(name, ...args){
        ;(this.events.get(name) || []).forEach((fn) => fn(...args))
    }
}

// 使用
const bus = new EventEmitter()
const unsub = bus.on('station-update', (data) => console.log('收到', data))
bus.emit('station-update', {id:1, value:99})
unsub() // 及时取消