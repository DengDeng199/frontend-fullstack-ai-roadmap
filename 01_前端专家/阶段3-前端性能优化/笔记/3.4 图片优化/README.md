# 3.4 图片优化

> 前端性能优化 · 现代格式、响应式图片、CDN 处理、图标方案、懒加载

---

## 目录

1. [现代图片格式对比](#1-现代图片格式对比)
2. [响应式图片](#2-响应式图片)
3. [图片 CDN 处理](#3-图片-cdn-处理)
4. [图标优化方案](#4-图标优化方案)
5. [懒加载实现对比](#5-懒加载实现对比)
6. [Base64 内联场景](#6-base64-内联场景)
7. [综合实践：caidiaweb 图片优化方案](#7-综合实践caidiaweb-图片优化方案)
8. [面试高频考点](#8-面试高频考点)

---

## 1. 现代图片格式对比

### 1.1 格式总览

```
图片优化决策树：

┌─ 照片/复杂图像 ──► WebP (首选) / AVIF (高级) / JPEG (兜底)
│
├─ 图标/Logo/插画 ──► SVG (矢量，无限缩放)
│
├─ 截图/UI 界面 ───► PNG-8 (256色) / PNG-24 (真彩色)
│
└─ 动图 ─────────► WebP 动画 / AVIF 动画 / 视频替代 GIF
```

### 1.2 格式详细对比

| 格式 | 压缩类型 | 透明支持 | 动画 | 典型压缩率 | 浏览器兼容 |
|------|---------|---------|------|-----------|-----------|
| **JPEG** | 有损 | ❌ | ❌ | 基准 | 所有浏览器 |
| **PNG** | 无损 | ✅ | ❌ | 大文件 | 所有浏览器 |
| **GIF** | 有损 | ✅ | ✅ | 非常大 | 所有浏览器 |
| **WebP** | 有损/无损 | ✅ | ✅ | 比 JPEG 小 25-35% | 97%+ |
| **AVIF** | 有损/无损 | ✅ | ✅ | 比 JPEG 小 50% | 93%+ |

### 1.3 实际压缩率对比

```
同一张 2000×1500 的照片，各格式文件大小：

JPEG (质量80)    ████████████████████ 320KB
WebP (质量80)    █████████████        220KB  (-31%)
AVIF (质量50)    █████████            140KB  (-56%)
PNG (无损)       ████████████████████████████████████████ 680KB

结论：照片类 → WebP/AVIF；截图/Logo → PNG；简单的图标 → SVG
```

### 1.4 格式选择实战

```html
<!-- 方案：<picture> 渐进增强，浏览器自动选择最佳格式 -->
<picture>
  <!-- 最优先：AVIF（体积最小，最现代） -->
  <source srcset="/images/dashboard.avif" type="image/avif" />
  
  <!-- 降级：WebP（兼容性最好） -->
  <source srcset="/images/dashboard.webp" type="image/webp" />
  
  <!-- 兜底：JPEG（所有浏览器都支持） -->
  <img
    src="/images/dashboard.jpg"
    alt="仪表盘"
    width="1200"
    height="800"
    loading="lazy"
    decoding="async"
  />
</picture>
```

### 1.5 构建时自动转换（Vite 插件）

```bash
npm install -D vite-plugin-imagemin
```

```javascript
// vite.config.js — 构建时自动压缩 + 转换 WebP
import { defineConfig } from 'vite';
import viteImagemin from 'vite-plugin-imagemin';

export default defineConfig({
  plugins: [
    viteImagemin({
      // GIF → WebP 动图
      gifsicle: { optimizationLevel: 3, interlaced: false },
      
      // PNG 压缩
      optipng: { optimizationLevel: 5 },
      
      // JPEG 压缩
      mozjpeg: { quality: 80, progressive: true },
      
      // SVG 压缩
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: false },
        ],
      },
      
      // 自动生成 WebP 版本（推荐！）
      webp: { quality: 80 },
    }),
  ],
});
```

### 1.6 图片质量权衡

```javascript
// 不同场景选择不同压缩质量
const QUALITY_PRESETS = {
  // 背景图/装饰图：质量可以稍低
  background: { quality: 60, format: 'webp' },
  
  // 产品图/核心内容：保持高清晰度
  hero: { quality: 85, format: 'webp' },
  
  // 缩略图/列表图：强压缩
  thumbnail: { quality: 50, format: 'webp', width: 300 },
  
  // 用户头像：非常小
  avatar: { quality: 70, format: 'webp', width: 80, height: 80 },
};

// 通常 70-85 是照片质量的甜点区
// 低于 65 会出现明显压缩伪影
// AVIF 在 quality 40-50 就能达到 WebP quality 80 的效果
```

---

## 2. 响应式图片

### 2.1 srcset + sizes 详解

```html
<!-- 
  srcset 语法：
    图片URL + 空格 + 宽度描述符(w) 或 像素密度描述符(x)
  
  sizes 语法：
    媒体条件 + 空格 + 图片显示宽度
-->

<!-- 方案1：基于像素密度（旧方案，不推荐） -->
<img
  src="photo@1x.jpg"
  srcset="photo@1x.jpg 1x, photo@2x.jpg 2x, photo@3x.jpg 3x"
  alt=""
/>

<!-- 方案2：基于宽度（推荐） -->
<img
  src="photo-800w.jpg"
  srcset="
    photo-400w.jpg   400w,
    photo-800w.jpg   800w,
    photo-1200w.jpg 1200w,
    photo-1600w.jpg 1600w
  "
  sizes="
    (max-width: 600px) 100vw,
    (max-width: 1200px) 50vw,
    33vw
  "
  alt="响应式图片"
/>

<!-- 解读 sizes：
  - 屏幕宽度 ≤ 600px → 图片显示宽度 = 100vw（全屏）
  - 屏幕宽度 ≤ 1200px → 图片显示宽度 = 50vw（半屏）
  - 屏幕宽度 > 1200px → 图片显示宽度 = 33vw（1/3 屏）
  
  浏览器根据这些信息，从 srcset 中选择最合适的尺寸 -->
```

### 2.2 响应式图片业务实例

```html
<!-- 数据大屏场景：Hero 背景图响应式 -->
<picture>
  <!-- 移动端竖屏：使用竖版裁剪 -->
  <source
    media="(max-width: 768px) and (orientation: portrait)"
    srcset="
      /images/hero-mobile.webp    768w,
      /images/hero-mobile@2x.webp 1536w
    "
    sizes="100vw"
    type="image/webp"
  />
  
  <!-- 平板横屏 -->
  <source
    media="(max-width: 1024px)"
    srcset="
      /images/hero-tablet.webp    1024w,
      /images/hero-tablet@2x.webp 2048w
    "
    sizes="100vw"
    type="image/webp"
  />
  
  <!-- 桌面端全宽 -->
  <source
    srcset="
      /images/hero-desktop.webp     1600w,
      /images/hero-desktop@2x.webp  3200w
    "
    sizes="100vw"
    type="image/webp"
  />
  
  <!-- 兜底 -->
  <img
    src="/images/hero-desktop.jpg"
    alt="技术设施管理系统"
    fetchpriority="high"
    width="1600"
    height="600"
  />
</picture>
```

### 2.3 Vue 响应式图片组件

```vue
<!-- components/ResponsiveImage.vue — 通用响应式图片组件 -->
<template>
  <picture>
    <source
      v-for="(source, idx) in sources"
      :key="idx"
      :media="source.media"
      :srcset="source.srcset"
      :sizes="source.sizes"
      :type="source.type"
    />
    <img
      :src="fallback"
      :alt="alt"
      :width="width"
      :height="height"
      :loading="loading"
      :fetchpriority="fetchpriority"
      :decoding="decoding"
      :class="{ 'lazy-img': loading === 'lazy' }"
      @load="onLoad"
      @error="onError"
    />
  </picture>
</template>

<script setup>
defineProps({
  sources: {
    type: Array,
    default: () => [],
    // 示例：
    // [
    //   { media: '(max-width: 768px)', srcset: '/img-sm.webp 400w', type: 'image/webp' },
    //   { srcset: '/img-lg.webp 1200w', type: 'image/webp' },
    // ]
  },
  fallback: { type: String, required: true },
  alt: { type: String, default: '' },
  width: { type: Number, default: null },
  height: { type: Number, default: null },
  loading: { type: String, default: 'lazy' },
  fetchpriority: { type: String, default: 'auto' },
  decoding: { type: String, default: 'async' },
});

const emit = defineEmits(['loaded', 'error']);

function onLoad(e) { emit('loaded', e); }
function onError(e) { emit('error', e); }
</script>
```

```vue
<!-- 使用示例 -->
<ResponsiveImage
  :sources="[
    {
      srcset: '/images/map-bg-600.avif 600w, /images/map-bg-1200.avif 1200w',
      sizes: '(max-width: 768px) 100vw, 60vw',
      type: 'image/avif',
    },
    {
      srcset: '/images/map-bg-600.webp 600w, /images/map-bg-1200.webp 1200w',
      sizes: '(max-width: 768px) 100vw, 60vw',
      type: 'image/webp',
    },
  ]"
  fallback="/images/map-bg.jpg"
  alt="电磁环境地图"
  :width="1200"
  :height="800"
  fetchpriority="high"
/>
```

---

## 3. 图片 CDN 处理

### 3.1 CDN 图片处理能力

```
传统方式：
  设计出图 → 手动多尺寸切图 → 上传静态资源

CDN 图片处理：
  上传一张原图 → CDN URL 参数动态裁剪/压缩/转格式
  
  例如：
  原图：https://cdn.example.com/banner.png (2MB)
  
  处理后：
  https://cdn.example.com/banner.png?imageView2/2/w/800/h/400/format/webp/q/80
  输出：800×400 WebP，质量 80%，约 40KB
  
  节省：98% 体积！
```

### 3.2 常见 CDN 图片处理参数

```javascript
// utils/image-cdn.js — CDN 图片 URL 构建工具

// 基础 CDN URL 配置
const CDN_BASE = 'https://cdn.caidiaweb.com';

/**
 * 构建 CDN 处理后的图片 URL
 * 
 * 云服务商 API 参考：
 * 腾讯云 COS (imageMogr2)：
 *   ?imageMogr2/format/webp/quality/80/thumbnail/800x
 * 
 * 阿里云 OSS (x-oss-process)：
 *   ?x-oss-process=image/resize,w_800/format,webp/quality,q_80
 * 
 * 七牛 (imageView2)：
 *   ?imageView2/2/w/800/format/webp/q/80
 */

const PRESETS = {
  // 缩略图：强压缩
  thumbnail: '?imageView2/1/w/300/h/200/format/webp/q/60',
  
  // 中等尺寸：均衡
  medium: '?imageView2/2/w/800/format/webp/q/80',
  
  // 大图：保持清晰度
  large: '?imageView2/2/w/1600/format/webp/q/85',
  
  // 头像：正方形裁剪
  avatar: '?imageView2/1/w/80/h/80/format/webp/q/75',
  
  // 原图（仅格式转换）
  original: '?imageView2/0/format/webp/q/80',
};

export function getCdnUrl(path, preset = 'medium') {
  const base = path.startsWith('http') ? path : `${CDN_BASE}${path}`;
  return `${base}${PRESETS[preset] || ''}`;
}

// 自定义参数
export function getCdnUrlCustom(path, {
  width,
  height,
  quality = 80,
  format = 'webp',
  fit = 'cover', // cover | contain | fill
} = {}) {
  const base = path.startsWith('http') ? path : `${CDN_BASE}${path}`;
  const params = [];
  
  if (width || height) {
    params.push(`w/${width || ''}`);
    if (height) params.push(`h/${height}`);
  }
  params.push(`format/${format}`);
  params.push(`q/${quality}`);
  
  return `${base}?imageView2/2/${params.join('/')}`;
}
```

```vue
<!-- 组件中使用 -->
<template>
  <img
    :src="getCdnUrl('/images/station.jpg', 'large')"
    :srcset="`
      ${getCdnUrl('/images/station.jpg', 'thumbnail')} 400w,
      ${getCdnUrl('/images/station.jpg', 'medium')} 800w,
      ${getCdnUrl('/images/station.jpg', 'large')} 1600w
    `"
    sizes="(max-width: 768px) 100vw, 50vw"
    alt="监测站"
    loading="lazy"
  />
</template>
```

### 3.3 渐进式加载方案

```vue
<!-- components/ProgressiveImage.vue — 渐进式图片加载 -->
<template>
  <div class="progressive-image" :style="{ aspectRatio: `${width}/${height}` }">
    <!-- LQIP：低质量占位（模糊 → 清晰） -->
    <img
      :src="lqipSrc"
      class="progressive-image__placeholder"
      :class="{ loaded: mainLoaded }"
      aria-hidden="true"
    />
    
    <!-- 主图 -->
    <img
      :src="mainSrc"
      :srcset="mainSrcset"
      :alt="alt"
      class="progressive-image__main"
      :class="{ loaded: mainLoaded }"
      @load="mainLoaded = true"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { getCdnUrl } from '@/utils/image-cdn';

const props = defineProps({
  path: { type: String, required: true },
  alt: { type: String, default: '' },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
});

const mainLoaded = ref(false);

// LQIP：低质量占位图（10px 宽，极度压缩）
const lqipSrc = getCdnUrl(props.path, {
  width: 20,
  quality: 20,
  format: 'webp',
});

// 主图：正常尺寸
const mainSrc = getCdnUrl(props.path, {
  width: props.width,
  quality: 80,
  format: 'webp',
});
</script>

<style scoped>
.progressive-image {
  position: relative;
  overflow: hidden;
  background: #f0f0f0;
}

.progressive-image__placeholder,
.progressive-image__main {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 模糊占位 → 加载完成后隐藏 */
.progressive-image__placeholder {
  filter: blur(20px);
  transform: scale(1.05);
  transition: opacity 0.5s ease;
}

.progressive-image__placeholder.loaded {
  opacity: 0;
}

/* 主图加载完成后渐入 */
.progressive-image__main {
  opacity: 0;
  transition: opacity 0.5s ease;
}

.progressive-image__main.loaded {
  opacity: 1;
}
</style>
```

---

## 4. 图标优化方案

### 4.1 方案对比

```
┌──────────────────────────────────────────────────────┐
│              图标方案选型决策                           │
├────────────┬──────────┬──────────┬───────────────────┤
│    方案     │  体积     │  性能    │     适用场景       │
├────────────┼──────────┼──────────┼───────────────────┤
│ SVG Sprite │  小       │  最好    │ 项目自有图标(推荐)  │
│ Icon Font  │  中       │  一般    │ 少量简单图标       │
│ SVG 组件   │  最小     │  好      │ Vue/React 组件库   │
│ PNG/SVG图  │  大       │  差      │ 不推荐             │
└────────────┴──────────┴──────────┴───────────────────┘
```

### 4.2 SVG Sprite（推荐）

```html
<!-- public/icons/sprite.svg — 图标精灵图 -->
<!-- 构建时由 vite-plugin-svg-icons 自动生成 -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <symbol id="icon-station" viewBox="0 0 24 24">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </symbol>
  
  <symbol id="icon-spectrum" viewBox="0 0 24 24">
    <path d="M3 13h2v8H3v-8zm4-3h2v11H7V10zm4 6h2v5h-2v-5zm4-9h2v14h-2V7zm4 5h2v9h-2v-9z"/>
  </symbol>
  
  <symbol id="icon-dashboard" viewBox="0 0 24 24">
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
  </symbol>
</svg>
```

```vue
<!-- components/SvgIcon.vue — SVG Sprite 图标组件 -->
<template>
  <svg
    class="svg-icon"
    :style="{ width: size, height: size, color: color }"
    aria-hidden="true"
  >
    <use :href="`/icons/sprite.svg#icon-${name}`" />
  </svg>
</template>

<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: String, default: '24px' },
  color: { type: String, default: 'currentColor' },
});
</script>

<style scoped>
.svg-icon {
  display: inline-block;
  vertical-align: middle;
  fill: currentColor;
  flex-shrink: 0;
}
</style>
```

```vue
<!-- 使用示例 -->
<SvgIcon name="station" size="20px" color="#1890ff" />
<SvgIcon name="spectrum" size="16px" />
```

### 4.3 Vite 自动生成 SVG Sprite

```bash
npm install -D vite-plugin-svg-icons
```

```javascript
// vite.config.js — SVG Sprite 自动生成
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import path from 'path';

export default defineConfig({
  plugins: [
    createSvgIconsPlugin({
      // SVG 图标存放目录
      iconDirs: [path.resolve('src/assets/icons')],
      // symbolId 格式
      symbolId: 'icon-[name]',
      // 自定义 svgo 压缩
      svgoOptions: true,
      // 生成类型声明
      inject: 'body-last',
      customDomId: '__svg__icons__dom__',
    }),
  ],
});
```

### 4.4 Icon Font 方案（了解）

```
Icon Font 的优点：
  ✅ 兼容性好（IE6+）
  ✅ 可以用 CSS color/font-size 控制

Icon Font 的缺点：
  ❌ 文件包含所有图标（即使用户只看到 3 个）
  ❌ 只支持单色
  ❌ 下载时文字闪烁（FOUT）

建议：新项目统一使用 SVG Sprite
```

---

## 5. 懒加载实现对比

### 5.1 原生 loading="lazy" vs IntersectionObserver

```
┌──────────────────────────────────────────────────────┐
│              两种懒加载方式对比                         │
├──────────────┬─────────────────┬─────────────────────┤
│    方式       │   loading=lazy  │ IntersectionObserver │
├──────────────┼─────────────────┼─────────────────────┤
│ 代码量        │ 属性一行         │ 需要 20-30 行代码    │
│ 触发距离      │ 浏览器决定       │ 可自定义(rootMargin) │
│ 占位/过渡效果  │ 不支持           │ 完全可控             │
│ 兼容性        │ Chrome 77+       │ 需要 polyfill       │
│ 跨框架        │ 原生支持         │ 通用                 │
│ 图片以外       │ img/iframe      │ 任意元素             │
└──────────────┴─────────────────┴─────────────────────┘
```

### 5.2 选择策略

```javascript
// utils/lazyLoad.js — 统一懒加载入口（自动选择最佳方案）

export function initLazyImages() {
  // 如果浏览器支持原生 loading="lazy"，不额外处理
  if ('loading' in HTMLImageElement.prototype) {
    return; // 模板中 <img loading="lazy"> 即可
  }
  
  // 降级：使用 IntersectionObserver
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        
        const img = entry.target;
        const src = img.dataset.src;
        if (!src) return;
        
        // 加载真实图片
        const temp = new Image();
        temp.onload = () => {
          img.src = src;
          img.classList.add('loaded');
        };
        temp.src = src;
        
        observer.unobserve(img);
      });
    },
    { rootMargin: '200px 0px' }
  );
  
  // 观察所有带 data-src 的图片
  document.querySelectorAll('img[data-src]').forEach(img => {
    observer.observe(img);
  });
}
```

### 5.3 带占位的懒加载封装

```vue
<!-- components/LazyImage.vue — 通用懒加载图片组件 -->
<template>
  <div
    class="lazy-image-wrapper"
    :style="{ aspectRatio: `${width}/${height}`, backgroundColor: bgColor }"
  >
    <!-- 模糊占位（可选 LQIP） -->
    <div
      v-if="!loaded && placeholder"
      class="lazy-image-placeholder"
      :style="{ backgroundImage: placeholder ? `url(${placeholder})` : 'none' }"
    />
    
    <!-- 骨架屏（无占位图时） -->
    <div v-if="!loaded && !placeholder" class="lazy-image-skeleton" />
    
    <!-- 真实图片 -->
    <img
      ref="imgRef"
      :src="loaded ? src : undefined"
      :data-src="!loaded && !nativeSupport ? src : undefined"
      :alt="alt"
      :loading="nativeSupport ? 'lazy' : undefined"
      :decoding="decoding"
      :class="{ loaded: loaded }"
      @load="onLoad"
      @error="onError"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  width: { type: Number, default: 16 },
  height: { type: Number, default: 9 },
  placeholder: { type: String, default: '' },
  decoding: { type: String, default: 'async' },
  bgColor: { type: String, default: '#f0f0f0' },
});

const emit = defineEmits(['loaded', 'error']);

const imgRef = ref(null);
const loaded = ref(false);
let observer = null;

// 检测浏览器原生支持
const nativeSupport = 'loading' in HTMLImageElement.prototype;

onMounted(() => {
  // 不支持原生 lazy → IntersectionObserver 降级
  if (!nativeSupport && imgRef.value) {
    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loaded.value = true;
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(imgRef.value);
    return;
  }
  
  // 支持原生 lazy 或不需要懒加载
  loaded.value = true;
});

onBeforeUnmount(() => observer?.disconnect());

function onLoad() { emit('loaded'); }
function onError() {
  emit('error');
  // 加载失败：可根据业务设置回退图
  if (imgRef.value) {
    imgRef.value.src = '/images/fallback.png';
  }
}
</script>

<style scoped>
.lazy-image-wrapper {
  position: relative;
  overflow: hidden;
}

.lazy-image-placeholder {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(20px);
  transform: scale(1.1);
  transition: opacity 0.4s;
}

.lazy-image-skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.4s ease;
}

img.loaded {
  opacity: 1;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>
```

---

## 6. Base64 内联场景

### 6.1 什么时候用 Base64

```
适合 Base64 内联：
  ✅ 极小图片（<2KB，约 1.5KB Base64）
  ✅ 首屏必须的图标（避免额外请求）
  ✅ CSS 中的小装饰图
  ✅ 图标/logo 的占位

不适合 Base64：
  ❌ 大于 4KB 的图片（Base64 体积增大 33%）
  ❌ 会重复出现的大图（无法缓存）
  ❌ 照片类图片（体积太大）
```

### 6.2 实战案例

```css
/* CSS 中的小图标 — 适合 Base64 */
.loading-spinner {
  background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQi...');
}

/* logo 占位 */
.logo-placeholder {
  width: 120px;
  height: 40px;
  background: url('data:image/svg+xml;base64,...') no-repeat center;
}
```

```javascript
// Vite/Webpack 自动内联策略
// vite.config.js
export default {
  build: {
    // 小于 4KB 的资源自动转为 Base64 内联
    assetsInlineLimit: 4096, // 4KB
  },
};

// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 4 * 1024, // 4KB 以下转为 Base64
          },
        },
      },
    ],
  },
};
```

### 6.3 Base64 体积对比

```
原图 1KB PNG：
  ├── 文件形式传输：1KB（HTTP 请求一次）
  └── Base64 内联：1.33KB（增大 33%，但省掉一次请求）

原图 10KB PNG：
  ├── 文件形式传输：10KB（可缓存、可CDN）
  └── Base64 内联：13.3KB（不可缓存、每次下载）

权衡：
  <2KB  → Base64 赚（省掉 HTTP 请求开销）
  2-4KB → 看情况（首屏关键图用 Base64，其他不要）
  >4KB  → 文件形式（可缓存 + CDN 收益更大）
```

---

## 7. 综合实践：caidiaweb 图片优化方案

### 7.1 现状分析与优化清单

```
caidiaweb 图片使用现状：

1. 统计卡片图标 → 10+ 个独立 PNG，每个 2-5KB
   优化：统一为 SVG Sprite → 1 份文件，HTTP/2 一个请求

2. 地图标记点图标 → 157 个区县点，每点一张 2KB PNG
   优化：SVG 组件内联 + Canvas 渲染标记

3. 桌面端背景图 → 1 张 800KB JPEG
   优化：WebP 格式 + srcset 多尺寸 + CDN 自动裁剪

4. 登录页 Logo → 单张 PNG 120KB
   优化：SVG 内联 + WebP 降级方案

5. 列表中的缩略图 → 大量 200×150 JPEG
   优化：loading="lazy" + CDN 缩略图参数
```

### 7.2 优化实施代码

```javascript
// vite.config.js — caidiaweb 图片优化完整配置
import { defineConfig } from 'vite';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import viteImagemin from 'vite-plugin-imagemin';
import path from 'path';

export default defineConfig({
  plugins: [
    // SVG 图标自动生成 Sprite
    createSvgIconsPlugin({
      iconDirs: [path.resolve('src/assets/icons')],
      symbolId: 'icon-[name]',
      svgoOptions: {
        plugins: [
          { name: 'removeAttrs', params: { attrs: '(fill|stroke)' } },
        ],
      },
    }),
    
    // 构建时压缩图片 + 转 WebP
    viteImagemin({
      mozjpeg: { quality: 80 },
      optipng: { optimizationLevel: 5 },
      webp: { quality: 80 },
    }),
  ],

  build: {
    // 小于 2KB 图片转 Base64
    assetsInlineLimit: 2048,
    
    rollupOptions: {
      output: {
        // 图片文件命名（含 hash 用于长期缓存）
        assetFileNames: (asset) => {
          if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(asset.name)) {
            return 'images/[name]-[hash:8].[ext]';
          }
          return 'assets/[name]-[hash:8].[ext]';
        },
      },
    },
  },
});
```

```vue
<!-- views/TechFacility.vue — 优化后的地图页面 -->
<template>
  <div class="tech-facility-page">
    <!-- Hero 区域：响应式 WebP -->
    <picture class="hero-bg">
      <source
        media="(max-width: 768px)"
        :srcset="`${getCdnUrl('/images/hero-bg.jpg', { width: 768, quality: 75 })}`"
        type="image/webp"
      />
      <source
        :srcset="`${getCdnUrl('/images/hero-bg.jpg', { width: 1920, quality: 85 })}`"
        type="image/webp"
      />
      <img :src="getCdnUrl('/images/hero-bg.jpg', { width: 1920 })" alt="" fetchpriority="high" />
    </picture>

    <!-- 统计卡片图标：SVG Sprite -->
    <div class="stat-cards">
      <div class="stat-card">
        <SvgIcon name="online" size="32px" color="#0cce6b" />
        <span>在线率</span>
      </div>
      <div class="stat-card">
        <SvgIcon name="device" size="32px" color="#1890ff" />
        <span>设备总数</span>
      </div>
    </div>

    <!-- 列表图片：懒加载 + CDN 缩略图 -->
    <div class="station-list">
      <LazyImage
        v-for="station in stations"
        :key="station.id"
        :src="getCdnUrl(station.image, { width: 300, height: 200, quality: 60 })"
        :width="3"
        :height="2"
        :alt="station.name"
      />
    </div>
  </div>
</template>
```

---

## 8. 面试高频考点

### Q1：WebP 和 AVIF 的区别？实际项目中怎么选？

| 维度 | WebP | AVIF |
|------|------|------|
| 压缩率 | 比 JPEG 小 25-35% | 比 JPEG 小 50%+ |
| 兼容性 | 97%+（主流全支持） | 93%+（Safari 16.4+） |
| 编解码速度 | 快 | 慢（编码尤其慢） |

**选型建议**：用 `<picture>` 同时提供 AVIF + WebP + JPEG，浏览器自动选最佳。

### Q2：srcset 中的 w 描述符和 x 描述符有什么区别？

- **w 描述符**（`400w`）：告诉浏览器图片的**实际像素宽度**，配合 `sizes` 属性计算
- **x 描述符**（`2x`）：告诉浏览器图片的**设备像素比**，适用于固定显示尺寸

现代项目推荐 **w 描述符 + sizes**，因为浏览器能更精确地计算需要哪个尺寸。

### Q3：图片优化对 LCP 的影响有多大？

图片是 LCP 最常见的瓶颈。Google 统计约 70% 的页面 LCP 元素是图片。

优化手段对 LCP 的影响：
- `fetchpriority="high"`：LCP 可提前 200-500ms
- WebP 格式：传输体积减少 25-35%
- CDN 就近访问：减少 RTT 延迟
- `decoding="async"`：不阻塞主线程解码

### Q4：SVG Sprite 和 SVG 组件方式怎么选？

- **SVG Sprite**：图标多（>20个），适合全局使用的系统图标
- **SVG 组件**：图标少，需要动态控制（改变颜色/动画），组件化项目

caidiaweb 推荐 **SVG Sprite**：项目图标多，全局复用频率高。

### Q5：为什么 Base64 不推荐用于大图片？

- 体积膨胀 33%（Base64 编码开销）
- **无法缓存**：每次 HTML/CSS 加载都要重新传输
- **阻塞渲染**：内联在 HTML 中的 Base64 会阻塞关键渲染路径
- **阈值建议**：<2KB 用 Base64，>4KB 用文件 + CDN

---

> **动手建议**：打开 caidiaweb 的 Chrome DevTools → Network → 筛选 Img（图片），从大到小排序，找到前 5 大的图片，逐一用第 1 节的格式对比表看能换成 WebP/AVIF 的收益。然后挑一张 LCP 候选大图加上 `fetchpriority="high"` 观察性能面板中 LCP 时间的变化。
