# 重排\(Reflow\)与重绘\(Repaint\) 核心知识点\+实操案例完整版笔记

**前置联动知识**：承接浏览器渲染流水线：Render树 → **Layout重排** → **Paint重绘** → Composite合成，三者执行层级不可逆，开销逐级递减

执行链路优先级：合成Composite \< 重绘Repaint \< 重排Reflow

---

# 一、核心概念定义

## 1\. 重排 Reflow（回流/布局）

**定义**：页面元素**几何布局属性**发生改变，浏览器重新计算元素位置、宽高、占位坐标等布局信息，更新Render树几何数据的过程。

**核心特质**：改动元素占位空间，会影响自身、父级、同级、子级所有关联元素布局

### ✅ 重排触发条件（几何属性变更）

- 盒子模型属性：width、height、margin、padding、border

- 布局显示属性：display、float、position、top/left/right/bottom

- DOM结构变更：新增/删除/移动DOM节点

- 页面视口变更：浏览器窗口缩放、横竖屏切换

- 布局值读取：读取offset系列、scroll系列、client系列布局属性

## 2\. 重绘 Repaint

**定义**：页面元素**视觉外观属性**改变，元素占位大小、位置无变化，浏览器仅重新绘制像素颜色、样式，不计算布局的过程。

**核心特质**：只改样貌、不改位置，不会影响页面整体布局

### ✅ 重绘触发条件（外观属性变更）

- 色彩样式：color、background\-color、background\-image

- 圆角阴影：border\-radius、box\-shadow、text\-shadow

- 透明度样式：visibility:hidden（仅隐藏像素，不改变布局）

- 文本装饰：text\-decoration

---

# 二、重排 \& 重绘 核心对比（面试必背）

|对比维度|重排 Reflow|重绘 Repaint|
|---|---|---|
|改动范围|元素几何占位、页面布局|元素像素外观、视觉样式|
|性能开销|**开销极大**，开销远大于重绘|开销较小，仅像素层重绘|
|联动关系|重排**一定会触发重绘**|重绘**绝对不会触发重排**|
|最终阶段|Layout布局阶段|Paint绘制阶段|

---

# 三、顶级最优方案：仅触发合成Composite（无重排、无重绘）

**最优动画属性：transform \+ opacity**

原理：浏览器自动为该元素开启独立GPU图层，修改属性仅由GPU完成图层合成，不进入Layout、Paint阶段，零重排、零重绘，动画丝滑无性能损耗

避坑：不要用top/left做位移动画，会高频触发全局重排

```css
/* ❌ 劣写法：高频重排，页面卡顿 */
.box{ left: 20px; transition: left 0.3s; }
/* ✅ 优写法：仅图层合成，性能最优 */
.box{ transform: translateX(20px); transition: transform 0.3s; }
```

---

# 四、高频性能问题：强制同步布局（重点易错）

## 1\. 概念

浏览器存在**布局队列优化机制**：会批量收集JS样式修改，统一执行一次重排，减少渲染次数；

若代码中**先读布局属性、立刻修改布局属性**，浏览器必须立刻执行重排返回最新布局值，打破批量优化，产生**强制同步布局**，成倍加重排开销。

## 2\. 正反案例代码

```javascript
const box = document.querySelector('.box')

// ❌ 错误写法：循环读写穿插，触发强制同步布局，多次重排
for(let i=0;i<10;i++){
  // 读取布局：强制浏览器立即重排获取最新width
  let w = box.offsetWidth
  // 修改布局
  box.style.width = w + 10 + 'px'
}

// ✅ 正确写法：先批量读、后批量改，只触发1次重排
// 第一步：统一读取，缓存布局信息
let w = box.offsetWidth
// 第二步：统一修改
box.style.width = w + 100 + 'px'
```

---

# 五、全局优化策略\+落地代码案例

## 策略1：缓存布局信息，分离读写（规避强制同步布局）

核心原则：**先读完所有布局值，再统一修改所有样式**，利用浏览器批量重排优化

## 策略2：使用class类名批量改样式，替代逐行style修改

```css
/* 预定义样式类 */
.active{
  width: 200px;
  height: 200px;
  background: red;
  margin: 20px;
}
```

```javascript
const box = document.querySelector('.box')
// ❌ 劣写法：四次style修改，四次重排
box.style.width = '200px'
box.style.height = '200px'
box.style.background = 'red'
box.style.margin = '20px'

// ✅ 优写法：新增class，仅1次重排
box.classList.add('active')
```

## 策略3：减少原生DOM操作：DocumentFragment文档碎片

场景：批量新增DOM节点，直接append会多次触发重排，使用文档碎片离线组装DOM，一次性插入页面，仅触发1次重排

```javascript
// ❌ 劣写法：循环插入，10次重排
const ul = document.querySelector('ul')
for(let i=0;i<10;i++){
  const li = document.createElement('li')
  li.innerText = i
  ul.appendChild(li)
}

// ✅ 优写法：文档碎片，仅1次重排
const ul = document.querySelector('ul')
// 创建离线碎片，不挂载页面
const frag = document.createDocumentFragment()
for(let i=0;i<10;i++){
  const li = document.createElement('li')
  li.innerText = i
  frag.appendChild(li)
}
// 一次性挂载
ul.appendChild(frag)
```

## 策略4：大数据DOM优化：虚拟列表

长列表上千条数据渲染，放弃全部DOM渲染，仅渲染可视区域DOM，极大减少DOM节点数量，从根源减少重排次数，项目大屏、订单列表常用优化方案。

## 策略5：高频元素开启GPU独立图层

给频繁变动元素添加 `will-change: transform`，提前告知浏览器开启图层，规避连带重排。

---

# 六、高频易错考点汇总

1. `display:none`：触发重排\+重绘，直接移出Render树，页面不占位

2. `visibility:hidden`：仅触发重绘，页面保留元素占位空间

3. 修改字体font\-size：属于几何属性，触发全局重排

4. 批量改样式最优顺序：class \> 离线DOM碎片 \> 分离读写style

5. 动画开发铁律：位移、缩放、透明度永远用transform/opacity

> （注：文档部分内容可能由 AI 生成）
