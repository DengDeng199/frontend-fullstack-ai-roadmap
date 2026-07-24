export function createSubmitter({ validate, request, onSuccess }){
    return {
        async submit(data) {
            if(!validate?.(data)) return MessageChannel.error('参数校验失败')
                try {
                    const res = await request(data)
                    onSuccess?.(res)
                    return res
                } catch (e) {
                    Message.error(e.message)                    
                }
        }
    }
}