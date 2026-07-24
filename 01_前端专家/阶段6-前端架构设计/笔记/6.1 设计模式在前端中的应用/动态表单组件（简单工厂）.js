// 工厂：根据字段类型返回对应渲染组件
const widgetFactory = {
    input: markRaw(TextInput),
    select: markRaw(SelectInput),
    date: markRaw(DatePicker),
    upload: markRaw(FileUpload),
}
// 动态表单组件
function DynamicField({type, ...props}){
    const widget = widgetFactory[type] || widgetFactory.input
    return h(widget, props) // 渲染对应组件
}

// 使用：配置驱动UI
const formSchema = [
    { type: 'input', key: 'name', name: '名称' },
    { type: 'select', key: 'type', name: '类型', options: [{label:'类型1', value:1}, {label:'类型2', value:2}] },
    { type: 'date', key: 'date', name: '日期' },
    { type: 'upload', key: 'file', name: '文件' },
]