# 跨域与前端安全 核心知识点全解（含原理\+案例\+防御）

本文覆盖前端面试与工程最核心的 **同源策略、CORS跨域、CSP安全策略、XSS、CSRF、点击劫持**，全部搭配通俗原理、真实攻击案例、标准防御方案，适合理解记忆、面试背诵与项目落地。

---

# 一、同源策略（浏览器安全基石）

## 1\. 同源定义

**三要素全部相同才算同源：协议 \+ 域名 \+ 端口**

- 协议：http / https

- 域名：www\.xxx\.com

- 端口：80 / 443 / 8080（端口不同一定跨域）

## 2\. 跨域判定案例

主页面：`http://www.a.com:80`

- `https://www.a.com` ❌ 跨域（协议不同）

- `http://api.a.com` ❌ 跨域（子域名不同）

- `http://www.a.com:8080` ❌ 跨域（端口不同）

- `http://www.a.com` ✅ 同源（三要素一致）

## 3\. 同源策略限制内容

浏览器禁止非同源页面之间：**读写Cookie、DOM、LocalStorage、AJAX数据请求**，防止恶意网站窃取用户数据。

---

# 二、CORS 跨域资源共享

CORS 是**服务端开启的跨域放行机制**，是目前最主流、最规范的跨域方案。

## 1\. 两种请求类型核心区别

### ✅ 简单请求（无预检）

满足全部条件：

- 请求方法：`GET / POST / HEAD`

- 请求头仅为默认头，无自定义Header

- Content\-Type 仅限：`text/plain、application/x-www-form-urlencoded、multipart/form-data`

**流程**：直接发起一次真实请求，服务端返回跨域响应头，浏览器判断是否放行。

### ❌ 预检请求 OPTIONS（复杂请求）

只要不满足简单请求，都会**先发一次 OPTIONS 预检请求**，询问服务器是否允许跨域，通过后再发真实请求。

常见触发场景：

- 使用 `PUT / DELETE` 等方法

- 自定义请求头（如 Token、Authorization）

- Content\-Type 为 `application/json`

## 2\. 服务端核心响应头（必记）

```http

# 允许指定域名跨域
Access-Control-Allow-Origin: https://xxx.com
# 允许携带 Cookie
Access-Control-Allow-Credentials: true
# 允许自定义请求头
Access-Control-Allow-Headers: *
# 允许请求方法
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
# 预检缓存时长（减少OPTIONS请求）
Access-Control-Max-Age: 86400
    
```

## 3\. 关键注意点

- 开启 **Credentials 携带Cookie** 时，**Origin 不能为 \***，必须写死域名

- 前端请求必须配置：`xhr.withCredentials = true` / axios `withCredentials:true`

---

# 三、CSP 内容安全策略（前端防注入核心）

## 1\. 核心作用

**限制页面所有资源的加载来源**，禁止加载未知域名的 JS、CSS、图片、iframe，从根源拦截恶意脚本注入执行。

## 2\. 开启方式

### 方式1：HTTP响应头（推荐）

```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.cdn.com
```

### 方式2：Meta标签

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'">
```

## 3\. 常用指令

- `default-src 'self'`：默认仅允许本站资源

- `script-src`：限制 JS 来源，禁止内联脚本、eval（强效防XSS）

- `img-src`：限制图片来源

- `frame-src`：限制iframe嵌入来源

## 4\. 核心价值

即便网站被注入恶意代码，**CSP 可以直接阻止恶意脚本执行**，是 XSS 最强防御手段。

---

# 四、XSS 跨站脚本攻击（前端最高危漏洞）

## 1\. 原理

攻击者向页面注入恶意 JS 代码，**浏览器误将恶意代码当作正常代码执行**，窃取用户 Cookie、劫持页面、钓鱼跳转。

## 2\. 三种分类（面试必背）

### ① 存储型 XSS（危害最大）

**流程**：恶意代码提交到服务器数据库 → 所有用户访问页面都会加载执行

**案例**：评论区输入 `<script>窃取cookie并上传</script>`，所有人看评论都中招。

### ② 反射型 XSS（一次性）

**流程**：恶意参数通过 URL 传入 → 服务端直接反射回页面渲染 → 单次触发

**案例**：`xxx.com?name=<script>恶意代码</script>`，用户点开链接立刻执行。

### ③ DOM 型 XSS（纯前端漏洞）

**流程**：服务端无问题，前端 JS 直接解析 URL/DOM 数据导致执行

**案例**：前端直接把 location\.hash 内容 innerHTML 渲染到页面。

## 3\. XSS 三大防御方案

1. **输入输出转义**：前端/后端对 \< \> \& " ' 等特殊字符转义，杜绝脚本注入

2. **CSP 策略**：禁止未知脚本、内联脚本、eval 执行

3. **Cookie 设置 HttpOnly**：JS 无法读取 Cookie，即便 XSS 成功也偷不到登录态

---

# 五、CSRF 跨站请求伪造

## 1\. 攻击原理

**用户已登录A网站**，攻击者诱导用户打开恶意B网站，B网站伪造请求访问A网站，**浏览器自动携带A网站Cookie**，冒充用户操作（改密码、下单、转账）。

## 2\. 三大主流防御方案

### ① SameSite Cookie（最简单、首选）

设置 Cookie `SameSite=Strict / Lax`，**禁止跨站请求携带Cookie**，从根源杜绝伪造请求。

```http
Set-Cookie: token=xxx; SameSite=Lax; Secure
```

### ② CSRF Token（最通用、最稳妥）

服务端下发随机 Token，前端请求必须手动携带 Token，**恶意网站无法获取本站 Token**，请求直接拦截。

### ③ 双重 Cookie 校验

一份数据存在 Cookie，一份放请求参数，服务端比对两份数据一致才放行，跨站无法同步伪造。

---

# 六、Clickjacking 点击劫持防御

## 1\. 攻击原理

攻击者将目标网站通过 **iframe 透明嵌套** 在恶意页面上层，诱导用户点击虚假按钮，实则点击了目标网站的敏感操作（授权、支付、关注）。

## 2\. 防御方案

### ① X\-Frame\-Options 响应头（最简方案）

```http

# 禁止任何iframe嵌套
X-Frame-Options: DENY
# 仅允许同源嵌套
X-Frame-Options: SAMEORIGIN
    
```

### ② CSP 防御

```http
Content-Security-Policy: frame-src 'self'
```

### ③ JS 页面防嵌套

```javascript
if (top !== self) top.location.href = self.location.href;
```

---

# 七、面试终极速记总结

- **同源策略**：协议、域名、端口三统一，浏览器安全隔离核心

- **CORS**：简单请求直接走，带自定义头/json触发OPTIONS预检

- **CSP**：限制资源加载源，阻止恶意脚本执行，XSS终极防御

- **XSS三类**：存储型永久危害、反射型URL触发、DOM型前端漏洞

- **XSS防御**：转义 \+ CSP \+ HttpOnly Cookie

- **CSRF防御**：SameSite、CSRF Token、双重Cookie

- **点击劫持**：X\-Frame\-Options \+ CSP frame\-src

> （注：部分内容可能由 AI 生成）
