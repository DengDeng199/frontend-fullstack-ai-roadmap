# 6.1 设计模式在前端中的应用

> 阶段 6 前端架构设计 · 第 1 章
> 配套项目：caidiaweb（数据自动采集分析展示系统，Vue3 + ECharts 大屏）
> 本章目标：掌握 8 种在真实前端项目中高频出现的设计模式，能识别场景、选型落地、看懂框架源码中的模式影子。

---

## 1. 为什么前端需要设计模式

### 1.1 设计模式的本质

设计模式不是"银弹"，而是**被反复验证过的、针对特定场景的代码组织套路**。它的价值在于：

| 维度 | 带来的收益 |
|------|-----------|
| 复用 | 同一套思路解决一类问题，不用每次从头造轮子 |
| 沟通 | 一说"这里用观察者模式"团队立刻懂结构 |
| 解耦 | 把"变的部分"和"不变的部分"分开，改需求不牵一发动全身 |
| 可维护 | 结构清晰，新人能顺着模式摸清代码脉络 |

### 1.2 前端的三层模式认知

前端世界里模式无处不在，但要分清层次：

```
框架级模式    → Vue 的响应式、React 的虚拟 DOM（这些是框架作者用的，我们"用"）
架构级模式    →  MVC / MVVM / 单向数据流（项目整体分层，我们"搭"）
代码级模式    →  本章讲的 8 种（策略/观察者/工厂...，我们"写"）
```

本章聚焦**代码级模式**——你今天写业务代码就能直接用上的那种。

### 1.3 一个常见误解

> ❌ "背下 23 种 GOF 模式就能写好代码"

真相：前端常用到的不到 10 种，而且**模式是结果不是目标**。先有"这段代码好乱、好难改"的痛，再引入模式去治，才是正道。硬套模式反而过度设计。

---

## 2. 设计原则速记（模式的底层逻辑）

模式是"术"，原则是"道"。记住 5 条核心原则，能帮你判断该不该上模式：

| 原则 | 缩写 | 一句话 |
|------|------|--------|
| 单一职责 | SRP | 一个模块只做一件事 |
| 开放封闭 | OCP | 对扩展开放、对修改封闭 |
| 里氏替换 | LSP | 子类能替换父类而不出错 |
| 接口隔离 | ISP | 别依赖用不到的接口 |
| 依赖倒置 | DIP | 依赖抽象，不依赖具体实现 |

> 本章 8 个模式，大多是在**实现 OCP（开放封闭）**：新增一种策略/一种组件/一种适配器，不用改原有代码。

---

## 3. 策略模式（Strategy）

### 3.1 场景与定义

**问题**：表单有多种校验规则（必填、手机号、邮箱、长度），如果写成 `if/else` 大杂烩，加一条规则就要改函数。

**模式**：把"算法族"封装成独立策略对象，运行时按 key 动态选用，上下文（Context）不关心具体算法。

### 3.2 反例 vs 正例

❌ 面条式校验：
```js
function validate(value, type) {
  if (type === 'required') return value !== ''
  if (type === 'phone') return /^1\d{10}$/.test(value)
  if (type === 'email') return /^.+@.+\..+$/.test(value)
  // 每次加规则都在这里改 → 违反 OCP
}
```

✅ 策略模式：
```js
// 策略对象：每个校验是一个独立函数
const validators = {
  required: (v) => v !== '' || '不能为空',
  phone: (v) => /^1\d{10}$/.test(v) || '手机号格式错误',
  email: (v) => /^.+@.+\..+$/.test(v) || '邮箱格式错误',
  length: (v, max) => v.length <= max || `不能超过${max}字`,
}

// 上下文：只负责调度，不关心算法细节
function validateField(value, rules) {
  for (const rule of rules) {
    const { type, ...args } = rule
    const result = validators[type](value, ...Object.values(args))
    if (result !== true) return result // 返回错误文案
  }
  return true
}

// 使用：规则可配置化
validateField('', [{ type: 'required' }, { type: 'phone' }])
```

### 3.3 caidiaweb 实战

监测站表单有多种参数类型（数值/枚举/经纬度），校验规则随字段类型变化：

```js
// src/utils/validators.js
export const fieldValidators = {
  number: (v) => !isNaN(Number(v)) || '必须是数字',
  enum: (v, options) => options.includes(v) || '取值不在范围内',
  coord: (v) => {
    const [lon, lat] = v.split(',').map(Number)
    return (lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90) || '经纬度越界'
  },
}

// 字段配置即"策略组合"，新增字段类型零改动核心逻辑
export const stationFields = {
  frequency: { label: '频率', rules: [{ type: 'number' }] },
  status: { label: '状态', rules: [{ type: 'enum', options: ['在线', '离线'] }] },
  position: { label: '坐标', rules: [{ type: 'coord' }] },
}
```

---

## 4. 观察者模式（Observer）

### 4.1 场景与定义

**问题**：组件 A 的数据变了，组件 B、C、D 都要跟着变，但 A 不想直接 import B/C/D（紧耦合）。

**模式**：发布者（Subject）维护订阅列表，订阅者（Observer）注册回调；状态变化时通知所有订阅者。这就是**事件系统**的本质。

### 4.2 手写一个 EventEmitter

```js
class EventEmitter {
  constructor() {
    this.events = new Map() // 事件名 → 回调数组
  }
  on(name, fn) {
    if (!this.events.has(name)) this.events.set(name, [])
    this.events.get(name).push(fn)
    return () => this.off(name, fn) // 返回取消订阅函数，避免内存泄漏
  }
  off(name, fn) {
    const list = this.events.get(name) || []
    this.events.set(name, list.filter((f) => f !== fn))
  }
  emit(name, ...args) {
    ;(this.events.get(name) || []).forEach((fn) => fn(...args))
  }
}

// 使用
const bus = new EventEmitter()
const unsub = bus.on('station-update', (data) => console.log('收到', data))
bus.emit('station-update', { id: 1, value: 99 })
unsub() // 及时取消
```

### 4.3 框架中的影子

- Vue3 的 `mitt` / `eventBus` 就是观察者模式
- Vue 的响应式系统：`effect` 订阅 `reactive` 数据，数据变 → 触发 effect（本质是观察者）
- 浏览器原生：`addEventListener` 也是观察者（你订阅了 'click'，浏览器在点击时通知你）

### 4.4 caidiaweb 实战

大屏多个图表订阅"时间范围切换"事件，统一刷新：

```js
// src/utils/eventBus.js
import mitt from 'mitt'
export const bus = mitt()

// 任一组件发出
bus.emit('range-change', { start, end })

// 各图表组件订阅（onMounted 里订阅，onUnmounted 里取消）
bus.on('range-change', (range) => chart.setOption(buildOption(range)))
```

---

## 5. 工厂模式（Factory）

### 5.1 场景与定义

**问题**：根据配置/类型动态创建不同的组件或对象，但调用方不想知道"具体 new 哪个类/渲染哪个组件"。

**模式**：把"创建逻辑"集中到一个工厂函数/类里，调用方只传类型，工厂返回实例。

### 5.2 三种形态

| 形态 | 适用 |
|------|------|
| 简单工厂 | 一个函数根据 type 返回不同对象 |
| 工厂方法 | 子类决定创建什么（前端较少用） |
| 抽象工厂 | 创建一组相关对象（前端少） |

### 5.3 动态表单组件（简单工厂）

```js
// 工厂：根据字段类型返回对应渲染组件
const widgetFactory = {
  input: markRaw(TextInput),
  select: markRaw(SelectInput),
  date: markRaw(DatePicker),
  upload: markRaw(FileUpload),
}

// 动态表单组件
function DynamicField({ type, ...props }) {
  const Widget = widgetFactory[type] || widgetFactory.input
  return h(Widget, props) // 渲染对应组件
}

// 使用：配置驱动 UI
const formSchema = [
  { type: 'input', key: 'name', label: '名称' },
  { type: 'select', key: 'type', label: '类型', options: [...] },
  { type: 'date', key: 'time', label: '时间' },
]
```

### 5.4 caidiaweb 实战

图表类型由后端配置下发，前端用工厂决定渲染哪种 ECharts 实例：

```js
// src/charts/factory.js
import LineChart from './LineChart'
import BarChart from './BarChart'
import MapChart from './MapChart'

export function createChart(type, el) {
  const map = { line: LineChart, bar: BarChart, map: MapChart }
  const Cls = map[type] || LineChart
  return new Cls(el) // 统一返回带 setOption/dispose 的实例
}
```

---

## 6. 装饰器模式（Decorator）

### 6.1 场景与定义

**问题**：想给函数加日志、权限校验、缓存，但不想改原函数（违反 OCP）。

**模式**：用一个"包装函数"包裹原功能，在不修改源码的前提下增强行为。

### 6.2 函数装饰器（最常用）

```js
// 日志装饰器
function withLog(fn) {
  return async (...args) => {
    console.time(fn.name)
    const result = await fn(...args)
    console.timeEnd(fn.name)
    return result
  }
}

// 缓存装饰器（记忆化）
function withCache(fn, keyFn = (...a) => JSON.stringify(a)) {
  const cache = new Map()
  return (...args) => {
    const key = keyFn(...args)
    if (cache.has(key)) return cache.get(key)
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

// 使用：组合增强
const fetchStation = withCache(withLog(api.getStation))
```

### 6.3 TS 装饰器（类/方法级）

```ts
function RequireAuth(target: any, key: string, desc: PropertyDescriptor) {
  const original = desc.value
  desc.value = function (...args: any[]) {
    if (!store.isLogin) throw new Error('请先登录')
    return original.apply(this, args)
  }
}

class StationAPI {
  @RequireAuth
  static delete(id: string) { /* ... */ }
}
```

### 6.4 caidiaweb 实战

给所有 API 请求统一加 loading + 错误兜底：

```js
function withLoading(fn) {
  return async (...args) => {
    store.loading = true
    try { return await fn(...args) }
    finally { store.loading = false }
  }
}
api.queryStation = withLoading(api.queryStation)
```

---

## 7. 代理模式（Proxy）

### 7.1 场景与定义

**问题**：访问某个对象时想加一层控制——懒加载、缓存、权限、统计。

**模式**：用一个"代理对象"代替真实对象，调用方无感知，代理在中间做拦截。

### 7.2 ES6 Proxy 实现缓存代理

```js
function cacheProxy(target) {
  const cache = new Map()
  return new Proxy(target, {
    get(obj, prop) {
      if (prop in cache) return cache.get(prop)
      const value = obj[prop]
      cache.set(prop, value)
      return value
    },
  })
}

const heavyConfig = cacheProxy(loadHeavyConfig()) // 重复读取不重复计算
```

### 7.3 图片懒加载代理（经典案例）

```js
// 真实图片对象
class RealImage {
  constructor(src) { this.img = new Image(); this.img.src = src }
  display() { document.body.appendChild(this.img) }
}

// 代理：先用占位图，滚动到视口再加载真图
class LazyImage {
  constructor(src) { this.src = src; this.loaded = false }
  display(container) {
    container.innerHTML = '<div class="placeholder">加载中…</div>'
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.loaded) {
        new RealImage(this.src).display()
        this.loaded = true
      }
    })
    io.observe(container)
  }
}
```

### 7.4 Vue3 中的 Proxy

Vue3 的 `reactive()` 底层就是 `Proxy`——拦截 `get/set`，在读取时收集依赖（观察者模式），在写入时触发更新。理解代理模式，就看懂了响应式一半。

---

## 8. 单例模式（Singleton）

### 8.1 场景与定义

**问题**：某些对象全局只能有一个实例——WebSocket 连接、全局配置、日志器。重复创建会浪费资源或状态错乱。

**模式**：确保一个类只有一个实例，并提供全局访问点。

### 8.2 实现（闭包 + 懒初始化）

```js
let instance = null
class WebSocketManager {
  constructor() {
    if (instance) return instance // 已存在直接返回
    this.ws = new WebSocket(WS_URL)
    instance = this
  }
  send(data) { this.ws.send(JSON.parse(data)) }
}
export default new WebSocketManager() // 模块级单例
```

### 8.3 框架中的影子

- **Pinia Store 就是单例**：整个应用共享同一份状态
- ES Module 天然单例：`export default new XX()` 在任意文件 import 拿到的都是同一个对象

### 8.4 caidiaweb 实战

实时数据 WebSocket 全局唯一连接：

```js
// src/utils/ws.js
let ws = null
export function getSocket() {
  if (!ws) ws = new WebSocket('ws://172.39.8.61:301/ws')
  return ws
}
// 所有组件 import { getSocket } 共享同一条连接，避免重复握手
```

---

## 9. 适配器模式（Adapter）

### 9.1 场景与定义

**问题**：两个接口不兼容——比如要接入高德地图和百度地图，但 API 完全不同；或者老接口返回的数据结构跟新组件对不上。

**模式**：写一个"适配器"把一方的接口转换成另一方期望的接口，双方都不用改。

### 9.2 多地图 API 适配

```js
// 统一接口
interface IMap {
  render(container): void
  setCenter(lng, lat): void
}

// 高德适配器
class AMapAdapter implements IMap {
  constructor() { this.map = new AMap.Map() }
  render(c) { this.map.setContainer(c) }
  setCenter(lng, lat) { this.map.setCenter([lng, lat]) }
}

// 百度适配器
class BMapAdapter implements IMap {
  constructor() { this.map = new BMap.Map() }
  render(c) { this.map = new BMap.Map(c) }
  setCenter(lng, lat) { this.map.centerAndZoom(new BMap.Point(lng, lat), 12) }
}

// 业务代码只依赖 IMap，换地图只换适配器
const map = useBaidu ? new BMapAdapter() : new AMapAdapter()
map.setCenter(116.39, 39.9)
```

### 9.3 数据格式适配（前端更常见）

```js
// 后端老接口返回 { code, data }，新组件要 { status, payload }
function adaptLegacy(resp) {
  return { status: resp.code === 0 ? 'ok' : 'fail', payload: resp.data }
}
```

### 9.4 caidiaweb 实战

不同数据源（MQTT / WebSocket / REST）上报的监测数据格式不一，用适配器归一化：

```js
function adaptToStation(raw, source) {
  const adapters = {
    mqtt: (r) => ({ id: r.stationId, value: r.val, ts: r.timestamp }),
    rest: (r) => ({ id: r.id, value: r.measure, ts: r.time }),
  }
  return adapters[source]?.(raw) ?? raw
}
```

---

## 10. 模板方法模式（Template Method）

### 10.1 场景与定义

**问题**：多个流程骨架相同，只有某些步骤不同（如各种表单提交：校验→请求→成功处理→失败处理）。

**模式**：父类定义"算法骨架"（模板方法），把可变步骤声明为抽象方法，子类只填可变部分。

### 10.2 实现（JS 用"钩子函数"模拟）

```js
class FormSubmitter {
  // 模板方法：固定流程
  async submit(data) {
    if (!this.validate(data)) return this.onInvalid(data)
    try {
      const res = await this.request(data)
      return this.onSuccess(res)
    } catch (e) {
      return this.onError(e)
    }
  }
  // 可变步骤：子类/配置覆盖
  validate(data) { return true }
  async request(data) { throw new Error('需要实现 request') }
  onSuccess(res) { console.log('成功', res) }
  onError(e) { console.error('失败', e) }
  onInvalid(data) { console.warn('校验失败', data) }
}

// 具体表单只关心差异
class StationForm extends FormSubmitter {
  validate(d) { return d.name && d.frequency }
  async request(d) { return api.createStation(d) }
  onSuccess(res) { router.push('/list') }
}
```

### 10.3 caidiaweb 实战

多个表单（监测站/设备/用户）提交流程一致，用模板方法避免重复：

```js
// src/utils/createSubmitter.js
export function createSubmitter({ validate, request, onSuccess }) {
  return {
    async submit(data) {
      if (!validate?.(data)) return Message.error('参数校验失败')
      try {
        const res = await request(data)
        onSuccess?.(res)
        return res
      } catch (e) {
        Message.error(e.message)
      }
    },
  }
}
```

---

## 11. caidiaweb 综合实战：模式组合

真实项目里模式是**组合使用**的。以"监测站实时卡片"为例：

```
┌─────────────────────────────────────────────┐
│ 数据层                                        │
│  • 单例(8)：WebSocketManager 全局唯一连接      │
│  • 适配器(9)：adaptToStation 归一化多源数据     │
│                                               │
│ 通信层                                        │
│  • 观察者(4)：eventBus 广播 range-change       │
│                                               │
│ 展示层                                        │
│  • 工厂(5)：createChart 按类型渲染图表          │
│  • 策略(3)：fieldValidators 配置化校验         │
│  • 装饰器(6)：withLoading 包 API               │
│  • 代理(7)：LazyImage 懒加载                   │
│  • 模板方法(10)：createSubmitter 统一提交流程   │
└─────────────────────────────────────────────┘
```

**关键认知**：不是"为了用模式而用"，而是每个模式都对应一个具体痛点（重复创建 / 紧耦合 / 难扩展）。

---

## 12. 模式选型决策表

| 你的痛点 | 该上的模式 |
|---------|-----------|
| 一堆 if/else 选算法 | 策略模式 |
| 一个变，多个要跟着变 | 观察者模式 |
| 根据类型动态造对象 | 工厂模式 |
| 给函数加日志/缓存/权限 | 装饰器模式 |
| 访问对象要加控制（懒加载/缓存） | 代理模式 |
| 全局只能有一个（连接/配置/状态） | 单例模式 |
| 接口对不上 | 适配器模式 |
| 流程固定、步骤可变 | 模板方法模式 |

---

## 13. 面试考点

**Q1：前端最常用的设计模式有哪些？为什么？**
策略（校验/算法切换）、观察者（事件/响应式）、单例（Store/连接）、工厂（动态组件）、装饰器（功能增强）。它们对应前端最高频的痛点：解耦通信、配置化、复用。

**Q2：观察者模式和发布订阅（Pub/Sub）的区别？**
严格说，观察者模式中 Subject 直接持有 Observer 引用；Pub/Sub 多了一个"事件中心"做中转，双方完全解耦（mitt 就是 Pub/Sub）。日常交流中两者常被混用。

**Q3：Vue3 的响应式用了哪些模式？**
核心是**代理模式**（Proxy 拦截 get/set）+ **观察者模式**（effect 订阅依赖、数据变触发更新）。

**Q4：单例模式有什么坑？**
- 全局状态难测试（用例间互相污染）
- 容易造成"隐式耦合"
- 现代更推荐用模块级单例（`export default new X()`）而非 class 内部判断，更简单

**Q5：策略模式和工厂模式怎么区分？**
策略关注"算法可替换"（运行时选行为）；工厂关注"对象可创建"（运行时造实例）。有时组合：工厂造出对象，对象内部用策略。

**Q6：装饰器和代理的区别？**
装饰器强调"增强功能"（日志/缓存/权限，结果通常不变）；代理强调"控制访问"（懒加载/权限拦截/统计，可能不让你访问真实对象）。实现上装饰器常包函数，代理常包对象且可拦截多种操作。

**Q7：什么时候不该用设计模式？**
简单逻辑硬套模式 = 过度设计。判断标准：如果模式带来的抽象比业务本身还难懂，就先别上。等"改一次需求痛一次"时再引入。

**Q8：适配器模式和代理模式的区别？**
适配器是"接口转换"（让不兼容的两方能对接，结构变但行为语义一致）；代理是"访问控制"（接口一样，但中间加拦截/增强）。

---

> 下一章预告：**6.2 组件设计模式**（Renderless / HOC / Composable / 控制反转），将把本章的模式思想落到 Vue3 组件复用上。
