# 阶段2 — 浏览器与网络原理

> 预计时间：第 2-4 个月
> 目标水平：L3 精通
> 每日投入：工作日 1h + 周末 3h
> 前置依赖：完成阶段1 JS 语言深度

---

## 学习目标

理解浏览器工作原理与网络协议基础，建立对"浏览器如何把代码变成页面"的完整认知，能排查渲染性能问题。

---

## 学习内容

### 2.1 浏览器渲染管线

**完整流程**：HTML → DOM 树 → CSSOM → Render Tree → Layout → Paint → Composite

- **HTML 解析**：字节 → 字符 → Token → 节点 → DOM 树
- **CSS 解析**：CSSOM 树构建（CSS 解析阻塞渲染）
- **Render Tree**：DOM + CSSOM 合成（不可见元素不参与）
- **Layout（布局/回流）**：计算几何信息（位置、大小）
- **Paint（绘制）**：将元素绘制到图层上
- **Composite（合成）**：GPU 合成各图层，最终输出
- CSS 与 JS 的阻塞关系：
  - CSS 阻塞渲染（但可通过 media 属性解除）
  - JS 阻持 HTML 解析（但 async/defer 可优化）

### 2.2 重排（Reflow）与重绘（Repaint）

- **重排触发条件**：几何属性变化（width/height/margin/padding/display 等）
- **重绘触发条件**：外观属性变化（color/background/border-radius 等）
- **性能影响**：重排代价 >> 重绘代价
- **批量读写优化**：缓存布局信息，一次性修改样式
- **优化策略**：
  - 使用 transform/opacity（仅触发合成，不触发重排/重绘）
  - 避免频繁操作 DOM（DocumentFragment / 虚拟列表）
  - 使用 class 批量修改样式
  - 避免强制同步布局（force synchronous layout）

### 2.3 虚拟 DOM 与 Diff 算法

- 虚拟 DOM 的本质：用 JS 对象描述 DOM 结构
- Vue3 Diff 策略：
  - 同层比较（不跨层级）
  - 最长递增子序列（旧节点复用最大化）
  - Patch Flag（静态标记，跳过不需要更新的节点）
- React Fiber 架构（了解即可）
- 虚拟 DOM 的优势与局限
- Key 的重要性（为什么不能用 index）

### 2.4 CSS 渲染优化

- **层叠上下文（Stacking Context）**：z-index 的真正工作原理
- **GPU 加速**：will-change / transform: translateZ(0) / isolate
- **CSS Containment**：contain 属性限制渲染范围
- **CSS 动画性能**：transform / opacity vs width / height
- **CSS Houdini**（了解，前沿方向）
- 字体加载优化：font-display: swap

### 2.5 HTTP/HTTPS 协议

- **HTTP/1.1**：持久连接、管线化（但有队头阻塞）
- **HTTP/2**：
  - 二进制分帧
  - 多路复用（解决队头阻塞）
  - 头部压缩（HPACK）
  - 服务器推送
- **HTTP/3（QUIC）**：基于 UDP、解决 TCP 层队头阻塞
- **HTTPS 握手过程**：
  - TCP 三次握手
  - TLS 握手（Client Hello → Server Hello → 证书验证 → 密钥交换）
  - 对称加密 vs 非对称加密
- HTTP 缓存：强缓存（Cache-Control / Expires）vs 协商缓存（ETag / Last-Modified）

### 2.6 TCP/IP 基础

- TCP 三次握手（SYN → SYN-ACK → ACK）
- TCP 四次挥手（FIN → ACK → FIN → ACK）
- TCP 拥塞控制（慢启动 / 拥塞避免 / 快重传 / 快恢复）
- IP 协议基础、DNS 解析流程

### 2.7 浏览器存储

| 存储 | 容量 | 生命周期 | 跨标签 | 用途 |
|------|------|---------|--------|------|
| Cookie | 4KB | 可设过期 | 同域 | 用户标识、会话 |
| SessionStorage | 5-10MB | 标签关闭 | 否 | 临时表单数据 |
| LocalStorage | 5-10MB | 永久 | 同域 | 用户偏好设置 |
| IndexedDB | 数百MB+ | 永久 | 同域 | 大量结构化数据 |

### 2.8 跨域与安全

- **同源策略**：协议 + 域名 + 端口
- **CORS**：简单请求 vs 预检请求（OPTIONS）
- **CSP（Content Security Policy）**：限制资源加载来源
- **XSS 防御**：
  - 存储型 / 反射型 / DOM 型
  - 防御：转义、CSP、HttpOnly Cookie
- **CSRF 防御**：
  - SameSite Cookie / CSRF Token / 双重 Cookie
- Clickjacking 防御

### 2.9 V8 引擎机制

- **垃圾回收**：
  - 新生代（Scavenge 算法）→ 老生代（标记清除/标记整理）
  - 增量标记（Incremental Marking）减少 STW
  - 并行回收（Parallel）与并发回收（Concurrent）
- **隐藏类（Hidden Class）**：V8 优化对象属性访问
- **内联缓存（Inline Cache）**：加速属性查找
- **TurboFan 优化编译器**：JIT 编译优化

### 2.10 Service Worker 与 PWA

- Service Worker 生命周期：install → waiting → active
- 离线缓存策略：
  - Cache First
  - Network First
  - Stale While Revalidate
- PWA 基础：manifest.json、install prompt

---

## 实战产出（必须完成）

| 编号 | 产出 | 验收标准 |
|------|------|---------|
| 1 | caidiaweb 首页性能分析 | 用 Chrome DevTools Performance 面板分析，输出瓶颈报告 |
| 2 | Service Worker 离线缓存 Demo | 实现离线可用的小页面 |
| 3 | 浏览器渲染管线笔记 | 用自己的话写出完整渲染流程，存入笔记文件夹 |
| 4 | HTTP 缓存实验 | 用 Nginx 配置强缓存 + 协商缓存，验证效果 |

---

## 推荐资源

### 书籍
- 《Web 性能权威指南》
- 《图解 HTTP》

### 在线
- web.dev (Google 官方 Web 性能指南)
- 极客时间《浏览器工作原理与实践》
- Chrome DevTools 文档

### 工具
- Chrome DevTools — Performance / Network / Coverage 面板
- Lighthouse
- WebPageTest (webpagetest.org)

---

## 检验标准

- [ ] 能画出完整浏览器渲染流程图并解释每一步
- [ ] 能分析任意页面的 FCP/LCP 指标并给出 3 条以上优化建议
- [ ] 能解释 HTTP/1.1、HTTP/2、HTTP/3 的核心差异
- [ ] 能解释 HTTPS 完整握手过程
- [ ] 能实现 CORS 跨域配置
- [ ] 能说出 V8 新生代和老生代的垃圾回收策略

---

> **下一阶段**：完成本阶段后，进入「阶段3-前端性能优化」
