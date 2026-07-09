# 5.3 WebGL 入门

> 阶段 5 — 前端可视化技术 / 第 3 章
> 核心目标：理解 GPU 渲染管线（着色器 + 缓冲区），能用 Three.js 搭出可交互 3D 场景，理解底层 WebGL 原理。

---

## 目录

1. [WebGL 概念基础](#1-webgl-概念基础)
2. [原生 WebGL 绘制三角形（理解底层）](#2-原生-webgl-绘制三角形理解底层)
3. [着色器基础与 GLSL](#3-着色器基础与-glsl)
4. [Three.js 快速入门](#4-threejs-快速入门)
5. [Three.js 渲染核心：几何体 / 材质 / 网格](#5-threejs-渲染核心几何体--材质--网格)
6. [光照系统与动画](#6-光照系统与动画)
7. [Three.js 进阶](#7-threejs-进阶)
8. [caidiaweb 实践](#8-caidiaweb-实践)
9. [面试考点](#9-面试考点)

---

## 1. WebGL 概念基础

### 1.1 什么是 WebGL

WebGL（Web Graphics Library）是一套基于 **OpenGL ES 2.0** 的 JavaScript API，允许网页直接与 GPU 通信，在 `<canvas>` 上渲染 **2D / 3D 图形**。

```
┌─────────────────────────────────────────────────┐
│               JavaScript (CPU 侧)                │
│   描述「场景里有啥」：顶点数据 / 着色器代码 / 状态  │
└───────────────────┬─────────────────────────────┘
                    │  API 调用 (gl.*)
                    ▼
┌─────────────────────────────────────────────────┐
│                  WebGL 驱动                      │
│  把数据传给 GPU，提交绘制命令                       │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│                GPU (并行计算核心)                 │
│  顶点着色器 → 光栅化 → 片段着色器 → 帧缓冲         │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
              屏幕像素 (Canvas)
```

### 1.2 为什么需要 WebGL

| 维度 | Canvas 2D | WebGL |
|------|-----------|-------|
| 渲染单元 | CPU 逐像素绘制 | GPU 并行计算 |
| 适合场景 | 少量图形、2D 图表 | 海量点、3D、实时特效 |
| 性能上限 | 几千个元素卡顿 | 几十万粒子流畅 |
| 学习成本 | 低 | 高（需学 GLSL） |

> **经验法则**：2D 图表用 SVG/Canvas 2D 足够；3D 场景、粒子系统、海量数据点的实时渲染才上 WebGL / Three.js。

### 1.3 三大核心概念

1. **着色器（Shader）**：运行在 GPU 上的小程序，决定每个顶点/像素长什么样。分两类（详见第 3 章）。
2. **缓冲区（Buffer）**：在 GPU 显存中开辟的一块内存，存放顶点位置、颜色、纹理坐标等数据。
3. **GPU 渲染管线**：数据从顶点 → 屏幕像素 经历的固定流程。

```
顶点数据 ──▶ [顶点着色器] ──▶ 图元装配 ──▶ 光栅化 ──▶ [片段着色器] ──▶ 帧缓冲 ──▶ 屏幕
```

### 1.4 WebGL 1 vs 2

| 特性 | WebGL 1 | WebGL 2 |
|------|---------|---------|
| 基础标准 | OpenGL ES 2.0 | OpenGL ES 3.0 |
| GLSL 版本 | 100 | 300 es |
| 默认支持 | 广泛 | 现代浏览器（2017+） |
| Three.js | 兼容 | `WebGLRenderer` 自动检测 |

> 实际开发中基本用 Three.js，**不用关心 1/2 区别**——Three.js 会帮你处理。但理解原生流程有助于排查"黑屏""顶点错位"等问题。

---

## 2. 原生 WebGL 绘制三角形（理解底层）

> 不依赖任何库，手写 WebGL 画一个三角形。这是理解 Three.js「封装了什么」的最佳方式。

### 2.1 完整代码

```html
<canvas id="gl" width="400" height="400"></canvas>
<script>
  const canvas = document.getElementById('gl');
  const gl = canvas.getContext('webgl');
  if (!gl) throw new Error('当前浏览器不支持 WebGL');

  // ===== 1. 顶点着色器源码（GLSL）=====
  const vsSource = `
    attribute vec2 aPosition;
    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0); // 裁剪空间坐标
    }
  `;

  // ===== 2. 片段着色器源码（GLSL）=====
  const fsSource = `
    precision mediump float;
    void main() {
      gl_FragColor = vec4(0.2, 0.6, 1.0, 1.0); // RGBA 蓝色
    }
  `;

  // ===== 3. 编译着色器 =====
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // ===== 4. 链接着色器程序 =====
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);

  // ===== 5. 顶点数据写入缓冲区 =====
  const vertices = new Float32Array([
     0.0,  0.8,  // 上
    -0.8, -0.8,  // 左下
     0.8, -0.8,  // 右下
  ]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // ===== 6. 关联 attribute =====
  const aPosition = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  // ===== 7. 绘制 =====
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
</script>
```

### 2.2 七个步骤拆解

| 步骤 | 作用 | Three.js 对应 |
|------|------|---------------|
| 1-2 写 GLSL | 描述顶点/像素逻辑 | 内置材质已封装 |
| 3 编译着色器 | GPU 编译小程序 | `ShaderMaterial` |
| 4 链接 Program | 组合两个着色器 | 自动 |
| 5 写缓冲区 | 上传顶点数据到 GPU | `BufferGeometry` |
| 6 关联 attribute | 告诉 GPU 数据怎么读 | 自动 |
| 7 绘制 | 提交绘制命令 | `renderer.render()` |

> **关键认知**：Three.js 的本质 = 帮你自动完成「编译链接着色器 + 管理缓冲区 + 处理矩阵变换」这三件最繁琐的事。

---

## 3. 着色器基础与 GLSL

### 3.1 两类着色器

```
┌─────────────────┐         ┌──────────────────┐        ┌──────────────┐
│ 顶点着色器       │         │   光栅化          │        │ 片段着色器    │
│ Vertex Shader   │ ──────▶ │ Rasterization   │ ─────▶ │ Fragment     │
│ 每个顶点执行一次 │         │ 把图元变成像素   │        │ Shader       │
│ 计算位置/颜色    │         │                  │        │ 每个像素执行  │
│                 │         │                  │        │ 计算最终颜色  │
└─────────────────┘         └──────────────────┘        └──────────────┘
```

| 对比 | 顶点着色器 | 片段着色器 |
|------|-----------|-----------|
| 执行频率 | 每个顶点 1 次 | 每个像素 1 次 |
| 核心输出 | `gl_Position`（裁剪坐标） | `gl_FragColor`（像素颜色） |
| 典型任务 | 模型变换、顶点动画 | 纹理采样、光照计算、特效 |
| 可访问 | attribute / uniform / varying | varying / uniform |

### 3.2 GLSL 语法基础

GLSL（OpenGL Shading Language）类似 C 语言，运行在 GPU。

```glsl
// ===== 顶点着色器 =====
attribute vec3 aPosition;   // 从 JS 传入的顶点属性（每顶点不同）
attribute vec3 aColor;
uniform mat4 uModelView;    // 从 JS 传入的全局变量（所有顶点相同）
uniform mat4 uProjection;
varying vec3 vColor;        // 传递给片段着色器的插值变量

void main() {
  vColor = aColor;          // varying 会被光栅化器插值
  gl_Position = uProjection * uModelView * vec4(aPosition, 1.0);
}

// ===== 片段着色器 =====
precision mediump float;    // 必须声明浮点精度
varying vec3 vColor;        // 接收顶点着色器插值后的值

void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
```

### 3.3 三种变量类型

| 类型 | 关键字 | 作用域 | 谁赋值 |
|------|--------|--------|--------|
| 属性 | `attribute` | 顶点着色器 | JS 每顶点传入（如位置） |
| 全局 | `uniform` | 两者 | JS 全局传入（如矩阵、时间） |
| 插值 | `varying` | 两者 | 顶点着色器写，片段着色器读（自动插值） |

### 3.4 常用内置类型

```glsl
vec2 / vec3 / vec4     // 2/3/4 维浮点向量
mat4                  // 4x4 矩阵（变换矩阵）
float / int / bool
sampler2D             // 2D 纹理采样器
```

> **caidiaweb 实战提示**：大屏里的「粒子流光」「地球辉光」等特效，本质就是片段着色器里用 `uniform float uTime` 驱动 `sin/cos` 算出来的。理解 GLSL 你就能调出自己的特效。

---

## 4. Three.js 快速入门

> Three.js 是目前最流行的 WebGL 封装库，把「顶点/着色器/矩阵」封装成直观的 3D 对象模型。

### 4.1 四大核心对象

```
Scene（场景）        容纳所有物体的容器
  │
  ├── Mesh（网格）   可见物体 = Geometry（形状） + Material（材质）
  ├── Light（光照）  让物体有明暗
  └── ...
  │
Camera（相机）       决定「从哪看、看多大范围」
  │
Renderer（渲染器）   把 Scene + Camera 算成像素画到 Canvas
```

### 4.2 最小可运行示例

```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 1. 场景
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e1a);

// 2. 相机（透视相机：近大远小）
//   参数：fov 视野角, aspect 宽高比, near 近裁剪面, far 远裁剪面
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

// 3. 渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 高清屏适配，封顶 2 倍
document.body.appendChild(renderer.domElement);

// 4. 几何体 + 材质 + 网格
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x4f9dff, metalness: 0.3, roughness: 0.6 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// 5. 光照
scene.add(new THREE.AmbientLight(0xffffff, 0.6)); // 环境光：整体提亮
const dir = new THREE.DirectionalLight(0xffffff, 1.0); // 平行光：产生明暗
dir.position.set(5, 10, 7);
scene.add(dir);

// 6. 交互控制器
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // 阻尼，惯性滑动

// 7. 动画循环
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  controls.update();
  renderer.render(scene, camera);
}
animate();

// 8. 窗口自适应
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

### 4.3 包引入方式（Vite 项目）

```bash
npm install three
npm install -D @types/three   # TypeScript 类型
```

```js
// 主包
import * as THREE from 'three';
// 插件（addons，旧版叫 examples/jsm）
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
```

> **版本注意**：Three.js 从 r150+ 起推荐 `three/addons/...` 路径（内部映射到 `examples/jsm`）。旧教程写的 `examples/jsm/...` 也能用但已不推荐。

---

## 5. Three.js 渲染核心：几何体 / 材质 / 网格

### 5.1 Geometry（几何体）—— 定义「形状」

| 几何体 | 用途 |
|-------|------|
| `BoxGeometry` | 立方体、设备机箱 |
| `SphereGeometry` | 地球、球体 |
| `PlaneGeometry` | 地面、面板 |
| `CylinderGeometry` | 柱状图、管道 |
| `TorusGeometry` | 环形、装饰 |
| `BufferGeometry` | 自定义顶点（粒子系统必备） |

```js
// 自定义几何体（手动写顶点）
const geo = new THREE.BufferGeometry();
const positions = new Float32Array([0,0,0, 1,0,0, 0,1,0]);
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
```

### 5.2 Material（材质）—— 定义「外观」

| 材质 | 特点 | 适用 |
|------|------|------|
| `MeshBasicMaterial` | 不受光照影响 | 纯色/线框 |
| `MeshStandardMaterial` | PBR 物理材质（推荐） | 真实感物体 |
| `MeshPhongMaterial` | 高光塑料感 | 老式高光 |
| `MeshLambertMaterial` | 哑光漫反射 | 低成本 |
| `ShaderMaterial` | 自定义 GLSL | 特效 |

```js
const mat = new THREE.MeshStandardMaterial({
  color: 0x4f9dff,
  metalness: 0.4,   // 金属度 0~1
  roughness: 0.5,   // 粗糙度 0~1（越小越亮）
  transparent: true,
  opacity: 0.85,
});
```

### 5.3 Mesh（网格）= Geometry + Material

```js
const mesh = new THREE.Mesh(geometry, material);
mesh.position.set(1, 2, 0);   // 位置
mesh.rotation.y = Math.PI / 4; // 旋转
mesh.scale.set(2, 2, 2);       // 缩放
scene.add(mesh);
```

### 5.4 相机选择

| 相机 | 特点 | 适用 |
|------|------|------|
| `PerspectiveCamera` | 透视（近大远小） | 绝大多数 3D 场景 |
| `OrthographicCamera` | 正交（无透视变形） | 2.5D 大屏、工程视图 |

```js
// 正交相机常用于大屏「伪 3D」避免透视畸变
const camera = new THREE.OrthographicCamera(-w/2, w/2, h/2, -h/2, 0.1, 1000);
```

---

## 6. 光照系统与动画

### 6.1 四种光照

```
环境光 AmbientLight   ── 整体均匀提亮，无方向无阴影
平行光 DirectionalLight ─ 类似太阳，有方向，可投影
点光源 PointLight     ─ 类似灯泡，从一点向四周发散
聚光 SpotLight        ─ 类似舞台灯，有锥角方向
```

```js
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(10, 20, 10);
sun.castShadow = true;            // 开启投影
sun.shadow.mapSize.set(2048, 2048); // 阴影清晰度
scene.add(sun);

const bulb = new THREE.PointLight(0x4f9dff, 2, 50); // 颜色, 强度, 距离
bulb.position.set(0, 5, 0);
scene.add(bulb);
```

> **PBR 材质必须有光才能看见**——场景全黑时第一反应是「加环境光」，不是调材质。

### 6.2 阴影配置三步

```js
renderer.shadowMap.enabled = true;          // 1. 渲染器开阴影
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

sun.castShadow = true;                       // 2. 光源投射
mesh.castShadow = true;                      // 3. 物体投射
floor.receiveShadow = true;                  // 3. 地面接收
```

### 6.3 动画：requestAnimationFrame + OrbitControls

```js
const clock = new THREE.Clock(); // 精确计时，避免帧率波动导致速度不一致

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  cube.rotation.y = t * 0.5;          // 用时间驱动，帧率无关
  material.emissiveIntensity = 0.5 + Math.sin(t * 2) * 0.3; // 呼吸光效
  controls.update();                  // OrbitControls 阻尼必须每帧 update
  renderer.render(scene, camera);
}
animate();
```

> **性能提示**：`renderer.render()` 每帧调用一次即可。多场景/多相机才需要多次调用。

---

## 7. Three.js 进阶

### 7.1 粒子系统（Points + BufferGeometry）

> 大屏「星河」「信号点阵」核心方案。一个 `Points` 可渲染十万级粒子，性能远超 DOM。

```js
// 生成 10000 个随机粒子
const count = 10000;
const positions = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);
for (let i = 0; i < count; i++) {
  positions[i*3]   = (Math.random() - 0.5) * 100;
  positions[i*3+1] = (Math.random() - 0.5) * 100;
  positions[i*3+2] = (Math.random() - 0.5) * 100;
  colors[i*3] = Math.random();
  colors[i*3+1] = 0.6 + Math.random() * 0.4;
  colors[i*3+2] = 1.0;
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const mat = new THREE.PointsMaterial({
  size: 0.3,
  vertexColors: true,    // 使用顶点颜色
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending, // 叠加混合，发光感
});

const points = new THREE.Points(geo, mat);
scene.add(points);

// 动画：让整个粒子云旋转
function animate() {
  requestAnimationFrame(animate);
  points.rotation.y += 0.001;
  renderer.render(scene, camera);
}
```

### 7.2 加载模型（GLTFLoader / OBJLoader）

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load(
  '/models/device.glb',
  (gltf) => {
    const model = gltf.scene;
    model.scale.set(0.5, 0.5, 0.5);
    scene.add(model);
  },
  (progress) => {
    console.log(`加载进度：${(progress.loaded / progress.total * 100).toFixed(1)}%`);
  },
  (error) => console.error('模型加载失败', error)
);
```

| 格式 | 特点 | 推荐度 |
|------|------|--------|
| `.glb` | 二进制、单文件、含贴图 | ⭐ 首选 |
| `.gltf` | JSON + 外部资源 | 调试用 |
| `.obj` | 老格式、无动画 | 不推荐 |

> **大屏优化**：模型用 `.glb` + Draco 压缩（Three.js 提供 `DRACOLoader`），体积可缩小 70%+。

### 7.3 后期处理（EffectComposer）

> 给整个画面加「辉光 / 泛光 / 景深」等电影级特效。常用在大屏的科技感氛围。

```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera)); // 基础渲染

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.6,  // strength 强度
  0.4,  // radius 半径
  0.85  // threshold 阈值（亮度超过才发光）
);
composer.addPass(bloom);

// 动画循环里改用 composer.render()
function animate() {
  requestAnimationFrame(animate);
  composer.render(); // 替代 renderer.render(scene, camera)
}
```

> **注意**：后期处理会显著增加 GPU 负担，大屏低端设备要谨慎。可只对关键元素用 `SelectiveBloom`（选择性泛光）。

---

## 8. caidiaweb 实践

### 8.1 应用场景映射

| caidiaweb 需求 | WebGL 方案 |
|---------------|-----------|
| 监测站分布「星图」 | `Points` 粒子系统 + 经纬度映射 |
| 电磁态势 3D 地球 | `SphereGeometry` + 贴图 + 辉光 |
| 设备机箱 3D 预览 | `GLTFLoader` 加载 `.glb` |
| 大屏科技氛围 | `UnrealBloomPass` 泛光 |
| 信号流光特效 | 片段着色器 `ShaderMaterial` |

### 8.2 实战：监测站粒子星图

```vue
<!-- StationPoints.vue -->
<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = ref(null);
let renderer, scene, camera, controls, points, raf;

// 经纬度 → 3D 球面坐标
function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}

function init(stations) {
  const w = container.value.clientWidth;
  const h = container.value.clientHeight;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
  camera.position.set(0, 0, 12);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.value.appendChild(renderer.domElement);

  // 球体底图
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(5, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x0a1a3a, wireframe: true })
  );
  scene.add(sphere);

  // 站点粒子
  const positions = new Float32Array(stations.length * 3);
  stations.forEach((s, i) => {
    const v = latLngToVector3(s.lat, s.lng, 5.1);
    positions[i*3] = v.x; positions[i*3+1] = v.y; positions[i*3+2] = v.z;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.25, color: 0x4f9dff,
    transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  points = new THREE.Points(geo, mat);
  scene.add(points);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;       // 自动旋转，大屏常驻
  controls.autoRotateSpeed = 0.5;

  const animate = () => {
    raf = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();
}

onMounted(() => {
  // 假设从接口拿到 stations: [{lat, lng}, ...]
  fetch('/api/stations').then(r => r.json()).then(init);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  renderer?.dispose();
});
</script>

<template>
  <div ref="container" class="station-points"></div>
</template>

<style scoped>
.station-points { width: 100%; height: 100%; min-height: 400px; }
</style>
```

### 8.3 性能检查清单

- [ ] `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` 封顶 2 倍（4K 屏否则爆炸）
- [ ] `onBeforeUnmount` 里 `renderer.dispose()` 释放 GPU 资源（避免内存泄漏）
- [ ] 粒子用单个 `Points` 而非多个 Mesh（10 万粒子 Mesh 会卡死）
- [ ] 模型用 `.glb` + Draco 压缩
- [ ] 大屏低端机关闭 `UnrealBloomPass` 或降 resolution
- [ ] 用 `OrbitControls.autoRotate` 替代手写旋转逻辑

---

## 9. 面试考点

### Q1：WebGL 渲染管线是什么？
顶点数据 → 顶点着色器 → 图元装配 → 光栅化 → 片段着色器 → 帧缓冲 → 屏幕。顶点着色器算位置，片段着色器算颜色。

### Q2：顶点着色器和片段着色器区别？
顶点着色器**每个顶点执行一次**，输出裁剪坐标；片段着色器**每个像素执行一次**，输出颜色。前者处理几何变换，后者处理外观着色。

### Q3：attribute / uniform / varying 区别？
- `attribute`：顶点着色器输入，每顶点不同（如位置）。
- `uniform`：全局变量，所有顶点/像素相同（如矩阵、时间）。
- `varying`：顶点着色器输出、片段着色器输入，GPU 自动插值（如颜色）。

### Q4：为什么 Three.js 场景是黑的？
最常见原因：**没有加光照** + 用了 `MeshStandardMaterial`（PBR 必须有光）。解决：加 `AmbientLight` 或换 `MeshBasicMaterial`。

### Q5：Three.js 里 10 万粒子怎么渲染？
用**单个 `THREE.Points`** + `BufferGeometry` 存所有顶点，一次 `drawArrays` 提交。绝不用 10 万个独立 Mesh（每个 Mesh 一次 draw call，直接卡死）。

### Q6：WebGL 和 Canvas 2D 怎么选？
少量 2D 图形/图表用 Canvas 2D 或 SVG；3D 场景、海量粒子、实时 GPU 特效用 WebGL / Three.js。Canvas 2D 是 CPU 绘制，WebGL 是 GPU 并行。

### Q7：setPixelRatio 为什么要封顶 2？
`devicePixelRatio` 在 4K/Retina 屏可能是 3~4，会导致渲染分辨率翻倍平方（像素数 ×16），GPU 负载爆炸。封顶 2 兼顾清晰与性能。

---

> **本章小结**：WebGL 是 GPU 渲染的底层 API，核心是「着色器 + 缓冲区 + 渲染管线」；Three.js 把这套流程封装成 Scene/Camera/Renderer + Geometry/Material/Mesh 的直观模型。掌握原生三角形绘制能帮你理解 Three.js 封装了什么，遇到黑屏/顶点错位也能快速定位。下一章 **5.4 ECharts 深度** 将回到数据可视化主战场。
