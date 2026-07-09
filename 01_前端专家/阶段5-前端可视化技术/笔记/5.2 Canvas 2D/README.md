# 5.2 Canvas 2D

> 阶段 5 · 前端可视化技术
> 学习目标：掌握 Canvas 2D 的上下文获取、基础绘制 API、状态栈管理、文字与图片处理，并理解四大性能优化手段（离屏 Canvas、分层、rAF 循环、减少状态切换），能应对海量图形/实时渲染场景。

---

## 目录

| 章节 | 内容 |
|------|------|
| [一、Canvas 基础](#一canvas-基础) | 概念、获取上下文、坐标系、DPR 适配 |
| [二、绘制 API](#二绘制-api) | fillRect/strokeRect/arc/lineTo/bezierCurveTo |
| [三、状态管理](#三状态管理) | save/restore/translate/rotate/scale |
| [四、文字绘制](#四文字绘制) | fillText/measureText、文本对齐 |
| [五、图片处理](#五图片处理) | drawImage、getImageData/putImageData 像素操作 |
| [六、性能优化](#六性能优化) | 离屏 Canvas、分层、rAF、减少状态切换 |
| [七、caidiaweb 实践案例](#七caidiaweb-实践案例) | Canvas 绘制监测热力点 + 粒子背景 |
| [八、面试考点](#八面试考点) | 高频面试题与标准回答 |

---

## 一、Canvas 基础

### 1.1 什么是 Canvas

`<canvas>` 是一块**位图画布**，通过 JavaScript 在 2D 上下文上**逐像素绘制**。与 SVG 的「保留模式 DOM」相反，Canvas 是**立即模式**——画上去就定型，要改必须清除重画。适合海量图形、游戏、实时可视化。

```html
<canvas id="cv" width="400" height="300"></canvas>
<script>
  const cv = document.getElementById('cv')
  const ctx = cv.getContext('2d')   // 获取 2D 上下文
  ctx.fillStyle = '#409eff'
  ctx.fillRect(0, 0, 400, 300)
</script>
```

### 1.2 坐标系与 DPR 适配（易错点）

- 坐标系原点在**左上角**，x 向右、y 向下为正
- `width`/`height` 属性是**画布像素尺寸**（绘图缓冲区），CSS `width/height` 是显示尺寸——两者不一致会拉伸模糊
- **高清屏适配**：用 `devicePixelRatio` 放大缓冲区分辨率

```js
function setupHiDPICanvas(canvas, cssW, cssH) {
  const dpr = window.devicePixelRatio || 1
  canvas.style.width = cssW + 'px'
  canvas.style.height = cssH + 'px'
  canvas.width = cssW * dpr          // 缓冲区分辨率 × dpr
  canvas.height = cssH * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)                // 之后用 CSS 像素坐标绘制即可
  return ctx
}
```

> ⚠️ 每次改 `canvas.width/height` 会**清空画布并重置上下文状态**，重设 dpr 缩放要放在 resize 时。

---

## 二、绘制 API

### 2.1 矩形与路径

```js
ctx.fillStyle = '#409eff'
ctx.fillRect(10, 10, 100, 60)        // 填充矩形
ctx.strokeStyle = '#303133'
ctx.lineWidth = 2
ctx.strokeRect(10, 10, 100, 60)      // 描边矩形

// 通用路径（灵活，可组合任意形状）
ctx.beginPath()                       // 开始新路径
ctx.rect(130, 10, 100, 60)            // 添加矩形子路径
ctx.fill()                            // 填充当前路径
ctx.stroke()                          // 描边当前路径
ctx.closePath()                       // 闭合（可选，fill 会自动闭合）
```

### 2.2 圆与弧

```js
ctx.beginPath()
ctx.arc(100, 100, 50, 0, Math.PI * 2)   // (cx, cy, r, 起始角, 结束角)
ctx.fill()                               // 完整圆

ctx.beginPath()
ctx.arc(100, 100, 50, 0, Math.PI / 2)    // 0 → 90° 的四分之一弧
ctx.stroke()
```

角度单位**弧度**（deg × π / 180）。`arc` 最后一个参数 `anticlockwise`（可选）控制方向。

### 2.3 直线与曲线

```js
// 直线
ctx.beginPath()
ctx.moveTo(10, 10)                  // 落笔点
ctx.lineTo(100, 100)                // 连线到
ctx.lineTo(200, 50)
ctx.stroke()

// 二次贝塞尔曲线：Q cpX cpY, endX endY
ctx.quadraticCurveTo(150, 10, 200, 100)

// 三次贝塞尔曲线：C cp1X cp1Y, cp2X cp2Y, endX endY
ctx.bezierCurveTo(50, 10, 150, 190, 200, 100)
```

### 2.4 常用样式属性

| 属性 | 作用 | 示例 |
|------|------|------|
| `fillStyle` | 填充色/渐变 | `'#409eff'` / `gradient` |
| `strokeStyle` | 描边色 | `'#333'` |
| `lineWidth` | 线宽 | `2` |
| `lineCap` | 线端样式 | `'butt'`/`'round'`/`'square'` |
| `lineJoin` | 拐角样式 | `'miter'`/`'round'`/`'bevel'` |
| `globalAlpha` | 整体透明度 | `0.5` |
| `shadowBlur/Color` | 阴影 | 昂贵，慎用 |

```js
// 渐变
const g = ctx.createLinearGradient(0, 0, 200, 0)
g.addColorStop(0, '#409eff')
g.addColorStop(1, '#67c23a')
ctx.fillStyle = g
ctx.fillRect(0, 0, 200, 100)
```

---

## 三、状态管理

### 3.1 为什么需要 save / restore

Canvas 上下文是**有状态**的——`fillStyle`、`lineWidth`、`transform` 等设置会持续影响后续绘制。改多了容易「状态污染」。用 `save()` / `restore()` 形成**状态栈**，像局部变量一样隔离。

```js
ctx.save()                    // 压入当前状态
ctx.translate(100, 100)       // 平移坐标系
ctx.rotate(Math.PI / 4)       // 旋转
ctx.fillStyle = 'red'
ctx.fillRect(0, 0, 50, 50)
ctx.restore()                 // 弹出，恢复 save 前的状态（含坐标系）
```

> 常见 bug：忘记 `restore` 导致后续所有图形都被意外平移/变色。

### 3.2 变换：translate / rotate / scale

```js
ctx.translate(x, y)    // 把原点移到 (x,y)，之后坐标相对新原点
ctx.rotate(rad)        // 绕当前原点旋转
ctx.scale(sx, sy)      // 缩放坐标系

// 以某点为中心旋转的标准写法
ctx.save()
ctx.translate(cx, cy)
ctx.rotate(angle)
ctx.translate(-cx, -cy)   // 先平移到中心→旋转→平移回去
ctx.fillRect(...)         // 此时绕 (cx,cy) 旋转
ctx.restore()
```

### 3.3 组合变换与矩阵

连续 `translate/rotate/scale` 等价于左乘变换矩阵。复杂场景可用 `ctx.setTransform(a,b,c,d,e,f)` 直接设矩阵，或用 `ctx.transform(...)` 叠加。

---

## 四、文字绘制

### 4.1 fillText / strokeText

```js
ctx.font = 'bold 16px "Microsoft YaHei", sans-serif'  // CSS font 简写
ctx.fillStyle = '#303133'
ctx.textAlign = 'center'        // start|end|left|right|center
ctx.textBaseline = 'middle'      // top|middle|bottom|alphabetic
ctx.fillText('信号强度', 100, 50)   // 在 (100,50) 绘制填充文字
ctx.strokeText('描边字', 100, 80)   // 描边文字
```

### 4.2 measureText 测量宽度

```js
const text = '站点 A'
const w = ctx.measureText(text).width    // 当前 font 下的像素宽度
// 用于居中、自动换行、背景框自适应
const padding = 8
ctx.fillRect(x - w / 2 - padding, y - 12, w + padding * 2, 24)
ctx.fillText(text, x, y)
```

### 4.3 文本换行封装

```js
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = text.split('')
  let line = ''
  for (const ch of chars) {
    if (ctx.measureText(line + ch).width > maxWidth) {
      ctx.fillText(line, x, y)
      line = ch
      y += lineHeight
    } else {
      line += ch
    }
  }
  ctx.fillText(line, x, y)
}
```

---

## 五、图片处理

### 5.1 drawImage

```js
const img = new Image()
img.src = '/station.png'
img.onload = () => {
  ctx.drawImage(img, 0, 0)                    // 原尺寸绘制
  ctx.drawImage(img, 0, 0, 100, 60)           // 缩放绘制
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)  // 九参数：裁剪源→绘制到目标
}
```

> 注意：图片**必须 onload 后**才能 drawImage，否则画不出（异步坑）。

### 5.2 像素操作：getImageData / putImageData

```js
// 读取像素
const imgData = ctx.getImageData(0, 0, w, h)
const data = imgData.data          // Uint8ClampedArray：每像素 [R,G,B,A] × w × h
// 灰度化
for (let i = 0; i < data.length; i += 4) {
  const gray = (data[i] + data[i+1] + data[i+2]) / 3
  data[i] = data[i+1] = data[i+2] = gray
}
ctx.putImageData(imgData, 0, 0)    // 写回画布
```

**应用**：滤镜、热力图色阶映射、图像识别预处理。注意：`getImageData` 受**跨域污染**限制（跨域图需 `img.crossOrigin = 'anonymous'` 且服务器允许 CORS）。

---

## 六、性能优化

### 6.1 四大优化手段

| 手段 | 作用 | 适用 |
|------|------|------|
| **离屏 Canvas** | 预渲染静态部分到内存画布，主循环直接 `drawImage` 贴图 | 静态背景、重复元素 |
| **分层 Canvas** | 静态层 + 动态层分离，静态层不重绘 | 大屏（地图底图 + 动态点） |
| **rAF 动画循环** | `requestAnimationFrame` 对齐屏幕刷新，避免掉帧 | 所有逐帧动画 |
| **减少状态切换** | 批量同色/同线宽绘制，减少 `fillStyle` 等赋值 | 海量图形 |

### 6.2 离屏 Canvas 示例

```js
// 预渲染圆形图标到离屏画布（只需一次）
const off = document.createElement('canvas')
off.width = off.height = 40
const octx = off.getContext('2d')
octx.arc(20, 20, 18, 0, Math.PI * 2)
octx.fillStyle = '#f56c6c'
octx.fill()

// 主循环里直接贴图，避免每帧重画路径
function render() {
  ctx.clearRect(0, 0, W, H)
  for (const p of points) {
    ctx.drawImage(off, p.x - 20, p.y - 20)
  }
  requestAnimationFrame(render)
}
```

### 6.3 分层 Canvas 示例

```html
<canvas id="bg"></canvas>     <!-- 静态底图，一次绘制 -->
<canvas id="fg"></canvas>     <!-- 动态层，每帧重绘 -->
<style> #bg, #fg { position: absolute; inset: 0; } </style>
```

### 6.4 rAF 循环 + 减少状态切换

```js
function loop() {
  ctx.clearRect(0, 0, W, H)
  // 按颜色分组批量绘制，减少 fillStyle 赋值次数
  const byColor = groupBy(points, p => p.color)
  for (const [color, group] of byColor) {
    ctx.fillStyle = color
    ctx.beginPath()
    for (const p of group) {
      ctx.moveTo(p.x, p.y)
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
    }
    ctx.fill()                  // 一次 fill 画出整组
  }
  requestAnimationFrame(loop)
}
```

> 关键：用**单个 path + 一次 fill** 画同色海量点，比逐点 fill 快几个数量级。

---

## 七、caidiaweb 实践案例

### 7.1 场景：监测站热力点 Canvas 渲染

caidiaweb 大屏需要在地图上绘制数百个监测站信号点，用 Canvas 叠加在底图 SVG/图片上（呼应 5.1 章的 SVG/Canvas 混合策略）。

```js
// useStationCanvas.js —— 封装 Canvas 渲染逻辑
import { ref, onMounted, onUnmounted } from 'vue'

export function useStationCanvas(canvasRef, stationsRef) {
  let ctx, raf, dpr
  let offscreen = null

  function initOffscreen() {
    offscreen = document.createElement('canvas')
    offscreen.width = offscreen.height = 24
    const o = offscreen.getContext('2d')
    o.arc(12, 12, 10, 0, Math.PI * 2)
    o.fillStyle = '#f56c6c'
    o.fill()
  }

  function resize() {
    dpr = window.devicePixelRatio || 1
    const { clientWidth: w, clientHeight: h } = canvasRef.value
    canvasRef.value.width = w * dpr
    canvasRef.value.height = h * dpr
    ctx = canvasRef.value.getContext('2d')
    ctx.scale(dpr, dpr)
  }

  function draw() {
    const w = canvasRef.value.clientWidth
    const h = canvasRef.value.clientHeight
    ctx.clearRect(0, 0, w, h)
    ctx.globalAlpha = 0.9
    for (const s of stationsRef.value) {
      // 信号弱的点用半透明，强信号用实心
      ctx.globalAlpha = s.level / 4
      ctx.drawImage(offscreen, s.x - 12, s.y - 12)
    }
    raf = requestAnimationFrame(draw)
  }

  onMounted(() => { initOffscreen(); resize(); draw() })
  onUnmounted(() => cancelAnimationFrame(raf))
}
```

### 7.2 场景：大屏粒子背景

```js
// 粒子背景（少量装饰，性能敏感用 Canvas 而非 SVG）
function particleBg(canvas) {
  const ctx = setupHiDPICanvas(canvas, innerWidth, innerHeight)
  const ps = Array.from({ length: 80 }, () => ({
    x: Math.random() * innerWidth, y: Math.random() * innerHeight,
    vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 2 + 0.5
  }))
  function loop() {
    ctx.clearRect(0, 0, innerWidth, innerHeight)
    ctx.fillStyle = 'rgba(64,158,255,0.6)'
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy
      if (p.x < 0 || p.x > innerWidth) p.vx *= -1
      if (p.y < 0 || p.y > innerHeight) p.vy *= -1
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
    }
    requestAnimationFrame(loop)
  }
  loop()
}
```

### 7.3 落地检查清单

- [ ] 用 `devicePixelRatio` 适配高清屏，避免模糊
- [ ] 改 `width/height` 后重设上下文状态
- [ ] 复杂变换用 `save/restore` 隔离
- [ ] 图片等 `onload` 再 drawImage
- [ ] 静态元素预渲染到离屏 Canvas
- [ ] 海量同色图形用「单 path + 单次 fill」
- [ ] 动画统一走 `requestAnimationFrame`

---

## 八、面试考点

### Q1：Canvas 和 SVG 的本质区别？怎么选？
**答**：Canvas 是立即模式位图，脚本逐帧重绘，适合海量图形/实时渲染/像素处理，但无 DOM 不能直接绑事件；SVG 是保留模式矢量 DOM，可交互、SEO 友好、缩放无损，但元素过多卡顿。选型：少量+交互 → SVG；海量+实时 → Canvas。

### Q2：为什么 Canvas 在高清屏会模糊？怎么解决？
**答**：canvas 的 `width/height` 是绘图缓冲分辨率，CSS 尺寸是显示尺寸。默认 1:1，高清屏 devicePixelRatio>1 时一个 CSS 像素对应多个物理像素，缓冲不足就模糊。解决：`canvas.width = cssW * dpr`、`canvas.height = cssH * dpr`，再 `ctx.scale(dpr, dpr)`，并用 CSS 锁定显示尺寸。

### Q3：save / restore 的作用？不配对会怎样？
**答**：`save` 把当前上下文状态（样式、变换）压栈，`restore` 弹出恢复，用于隔离局部绘制状态。不配对 `restore` 会导致后续绘制被意外平移/变色/缩放——典型 bug 来源。

### Q4：Canvas 绘制大量点如何优化？
**答**：① 同色点合并到**一个 path 用一次 fill**；② 静态元素预渲染到**离屏 Canvas**，主循环贴图；③ 静态/动态**分层 Canvas**；④ 动画用 `requestAnimationFrame` 对齐刷新；⑤ 减少 `fillStyle` 等状态切换（按颜色分组批量）。

### Q5：getImageData 为什么要处理跨域？
**答**：读取像素会触发浏览器安全策略，跨域图片未设 CORS 会「污染」canvas，调用 `getImageData` 抛 SecurityError。解决：图片设 `img.crossOrigin = 'anonymous'` 且服务器返回 `Access-Control-Allow-Origin`。

### Q6：Canvas 文字如何居中对齐？
**答**：用 `ctx.textAlign = 'center'` + `ctx.textBaseline = 'middle'`，绘制坐标即文字中心。用 `measureText().width` 测宽实现背景框自适应或自动换行。

### Q7：Canvas 怎么实现动画？
**答**：标准做法 `requestAnimationFrame` 循环：每帧 `clearRect` 清屏 → 重绘新状态 → 请求下一帧。rAF 由浏览器在下次重绘前调用，自动对齐 60fps、后台标签页暂停，比 setInterval 更顺滑省电。

---

> 📌 **学习建议**：用一个 `<canvas>` 画 1000 个随机彩点，先逐点 `fillRect`（观察卡顿），再改成「按颜色分组 + 单 path 单次 fill」，对比帧率（DevTools Performance 看 FPS），对性能优化的体感最直观。
