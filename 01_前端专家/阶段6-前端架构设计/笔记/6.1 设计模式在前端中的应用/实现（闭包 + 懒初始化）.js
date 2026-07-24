let instance = null
class WebSocketManager{
    constructor(){
        if(instance) return instance // 已存在直接返回
        this.ws = new WebSocket(WS_URL)
        instance = this
    }
    send(data){
        this.ws.send(JSON.parse(data))
    }
}

export default WebSocketManager() // 模块级单例