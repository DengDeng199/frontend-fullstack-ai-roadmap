# 阶段4 — BFF 层实战开发

> 预计时间：第 10-12 个月
> 目标水平：L3 精通
> 每日投入：工作日 1h + 周末 3h
> 前置依赖：完成阶段1-3

---

## 学习目标

理解 BFF 架构模式的核心价值，能为公司项目搭建 BFF 层，解决前后端协作中的接口聚合、数据裁剪等问题。

---

## 学习内容

### 4.1 BFF 架构理念

- **BFF（Backend For Frontend）的定义**：
  - 为前端量身定制的后端服务
  - 在前端和后端微服务之间加一层
- **BFF 解决的问题**：
  - 前端需要聚合多个后端接口
  - 后端返回的数据结构不适合前端直接使用
  - 不同客户端（Web/App/小程序）需要不同的数据格式
- **BFF vs API Gateway vs 直接调用**：

| 方案 | 适用场景 | 优势 | 劣势 |
|------|---------|------|------|
| 直接调用 | 小项目、接口简单 | 开发快 | 前端承担聚合逻辑 |
| API Gateway | 微服务架构 | 统一入口、限流鉴权 | 不关心前端数据需求 |
| BFF | 中大型项目 | 前端友好、数据裁剪 | 需要维护额外服务 |

- **什么时候需要 BFF**：
  - 前端频繁聚合 3+ 个后端接口
  - 后端返回数据字段冗余/结构不友好
  - 不同前端项目需要不同数据格式

### 4.2 BFF 核心能力

- **接口聚合**：
  - 并行调用多个后端接口（Promise.all）
  - 合并响应数据
  - 接口调用依赖编排
- **数据裁剪**：
  - 过滤前端不需要的字段
  - 转换数据格式（如后端 snake_case → 前端 camelCase）
  - 合并/拆分数据结构
- **协议转换**：
  - RESTful → GraphQL（可选）
  - RESTful → WebSocket
  - 按场景选择最优协议
- **字段裁剪**：
  - 减少 JSON 响应体积
  - 列表接口默认不返回详情字段

### 4.3 鉴权体系

- **JWT（JSON Web Token）原理**：
  - Header.Payload.Signature 结构
  - HS256 / RS256 签名算法
- **Access Token + Refresh Token**：
  - Access Token 短期（15min），用于接口鉴权
  - Refresh Token 长期（7d），用于刷新 Access Token
  - 双 Token 方案的安全考量
- **Session vs Token 对比**：
  - Session：服务端存储、CSRF 风险、适合单体应用
  - Token：无状态、CSRF 免疫、适合分布式
- **Nest.js 鉴权实现**：
  - @nestjs/passport + passport-jwt
  - AuthGuard 鉴权守卫
  - 自定义 JWT 策略
- **OAuth2.0 基础概念**（了解）：
  - 授权码模式
  - 第三方登录集成（微信/钉钉/GitHub）

### 4.4 SSR 服务端渲染

- **Nuxt.js 3 基础**：
  - 页面路由与数据获取（useFetch / useAsyncData）
  - 服务端组件 vs 客户端组件
  - 状态管理（useState / Pinia）
- **渲染模式对比**：

| 模式 | 特点 | 适用场景 |
|------|------|---------|
| CSR | 客户端渲染 | SPA 管理后台 |
| SSR | 服务端渲染 | SEO 重要页面 |
| SSG | 静态生成 | 内容不常变化 |
| ISR | 增量静态再生 | 频繁更新但可接受延迟 |

### 4.5 接口版本管理

- URL 版本：`/api/v1/users`
- Header 版本：`Accept: application/vnd.api.v1+json`
- 向后兼容策略

### 4.6 限流与熔断

- **Rate Limiting**：@nestjs/throttler
  - 固定窗口 / 滑动窗口
  - 按 IP / 用户限流
- **Circuit Breaker**：
  - 熔断器状态（关闭 / 打开 / 半开）
  - 后端不可用时的降级方案

---

## 实战产出（必须完成）

| 编号 | 产出 | 验收标准 | 应用项目 |
|------|------|---------|---------|
| 1 | BFF 层搭建 | 聚合 3-5 个 Java 后端接口 | caidiaweb |
| 2 | JWT 鉴权 | 实现 Access + Refresh Token 完整流程 | caidiaweb |
| 3 | SSR 页面 | 用 Nuxt.js 实现 1 个 SEO 重要页面 | 按需 |
| 4 | BFF 架构文档 | 输出设计文档（接口聚合/鉴权/部署方案） | 通用 |

---

## 推荐资源

### 书籍
- Sam Newman《Building Microservices》— BFF 章节
- 《微服务设计》

### 在线
- Nuxt.js 3 官方文档 (nuxt.com)
- Nest.js — Authentication 章节
- BFF 架构最佳实践文章

---

## 检验标准

- [ ] 能为实际项目从零搭建 BFF 层并上线
- [ ] 能实现完整的 JWT 鉴权流程
- [ ] 前后端联调效率提升 30%+
- [ ] 能输出清晰的 BFF 架构设计文档

---

> **下一阶段**：完成本阶段后，进入「阶段5-Docker 与部署」
