// 实现（JS 用"钩子函数"模拟）
class FormSubmitter {
    // 模板方法：固定流程
    async submit(data){
        if(!this.validate(data)) return this.onOnvalid(data)
        try {
            const res = await this.request(data)
            return this.onSuccess(res)
        } catch (error) {
            return this.onError(error)
        }
    }
    // 可变步骤：子类/配置覆盖
    validate(data) { return true }
    async request(data) { throw new Error('需要实现 request') }
    onSuccess(res) { console.log('成功', res) }
    onError(err) { console.log('失败', err) }
    onInvalid(data) { console.log('校验失败', data) }
}

// 具体表单只关心差异
class StationForm extends FormSubmitter{
    validate(d) { return d.name && d.frequency }
    async request(d) { return AudioParam.createStation(d) }
    onSuccess(res) { router.push('/list') }
}

