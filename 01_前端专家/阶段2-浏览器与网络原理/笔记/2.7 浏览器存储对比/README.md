# 浏览器四大存储方案核心知识点汇总（对照表\+实战案例）

本文整理前端常用的四种浏览器本地存储：**Cookie、SessionStorage、LocalStorage、IndexedDB**。全覆盖容量、生命周期、跨标签特性、适用场景、代码案例、面试易错点，精准贴合业务开发与面试考点。

---

# 一、四大存储核心参数总览表（基础必背）

|存储方式|最大容量|生命周期|跨标签通信|核心用途|
|---|---|---|---|---|
|**Cookie**|4KB（极小）|可自定义过期时间/会话级|**同域跨标签共享**|用户登录标识、会话维持、身份校验|
|**SessionStorage**|5\~10MB|浏览器标签关闭即清空|**不支持跨标签**（标签隔离）|临时表单缓存、页面临时状态存储|
|**LocalStorage**|5\~10MB|永久存储，手动清除才失效|**同域跨标签共享**|用户偏好设置、静态配置、本地缓存数据|
|**IndexedDB**|数百MB\+（最大）|永久存储|**同域跨标签共享**|大量结构化数据、离线缓存、本地数据库|

---

# 二、各存储方案深度解析 \+ 实战代码案例

## 1\. Cookie（服务端\+前端共用，身份认证核心）

### 核心特性

- 容量极小仅 4KB，仅适合存储少量文本信息

- **自动随 HTTP 请求携带**到服务端（独有特性）

- 支持设置过期时间，可持久化；不设置则为会话 Cookie，关闭浏览器失效

- 同域所有标签、窗口共享，支持子域名共享

### 独有属性（安全重点）

- `HttpOnly`：禁止 JS 读取，防止 XSS 窃取登录态

- `Secure`：仅 HTTPS 环境下携带传输

- `SameSite`：防止 CSRF 跨站请求伪造

### 实战代码

```javascript
// 设置 Cookie，7天过期
document.cookie = "token=xxxxxx; max-age=60*60*24*7; path=/"

// 读取 Cookie
console.log(document.cookie)

// 删除 Cookie（设置过期时间为0）
document.cookie = "token=; max-age=0; path=/"

```

### 业务场景

网站登录 Token、SessionId、用户身份标识、跨页面会话维持

## 2\. SessionStorage（标签级临时存储）

### 核心特性

- 生命周期绑定**当前浏览器标签页**，刷新页面不丢失，关闭标签直接清空

- **严格标签隔离**，同域名新开标签无法读取数据

- 仅前端可用，不会随 HTTP 请求发送给服务端

### 实战代码

```javascript
// 存储
sessionStorage.setItem("tempForm", "用户名、手机号临时数据")

// 读取
sessionStorage.getItem("tempForm")

// 删除单个
sessionStorage.removeItem("tempForm")

// 清空全部
sessionStorage.clear()

```

### 业务场景

分步表单临时缓存、页面单次操作状态、弹窗显示状态、临时页面数据（无需持久化）

## 3\. LocalStorage（永久本地存储）

### 核心特性

- 永久存储，除非用户手动清除缓存/代码删除，否则永久存在

- 同域名下**所有标签、窗口共享数据**

- 容量远大于 Cookie，适合存储前端配置类数据

- 仅前端存储，不参与网络请求传输

### 实战代码

```javascript
// 存储用户主题偏好
localStorage.setItem("theme", "dark")

// 读取配置
const theme = localStorage.getItem("theme")

// 删除、清空
localStorage.removeItem("theme")
localStorage.clear()

```

### 业务场景

深色/浅色模式、字体大小、记住登录状态、页面布局配置、本地静态缓存数据

## 4\. IndexedDB（前端本地数据库）

### 核心特性

- 浏览器**唯一大容量结构化存储**，支持数百MB甚至更多数据

- 支持索引、查询、事务、增删改查，是真正的前端数据库

- 支持异步操作，不阻塞主线程

- 同域跨标签共享、永久存储

### 业务场景

离线文档、大数据列表缓存、本地日志存储、PWA离线应用、海量表单数据缓存

---

# 三、高频面试核心区别（易混点总结）

## 1\. LocalStorage vs SessionStorage 最大区别

- **生命周期**：LocalStorage 永久 / SessionStorage 标签关闭即销毁

- **跨标签**：LocalStorage 同域共享 / SessionStorage 标签隔离互不干扰

## 2\. Cookie vs LocalStorage 最大区别

- **网络传输**：Cookie 自动带请求头传给后端，LocalStorage 完全不参与网络请求

- **容量**：Cookie 4KB 极小 / LocalStorage 10MB 大容量

- **用途**：Cookie 做身份认证 / LocalStorage 做前端本地配置

## 3\. IndexedDB 定位

小数据用 LocalStorage，**大量结构化数据、离线存储必须用 IndexedDB**

---

# 四、业务选型最佳实践（直接照抄使用）

1. **登录态、Token、会话信息** → 优先 Cookie（可配合 HttpOnly 安全加固）

2. **页面临时表单、临时状态** → SessionStorage（关闭标签自动销毁，无残留）

3. **用户主题、偏好、本地配置** → LocalStorage（永久保存，全局共享）

4. **离线数据、大量列表、本地缓存库** → IndexedDB（大容量、结构化、高性能）

> （注：部分内容可能由 AI 生成）
