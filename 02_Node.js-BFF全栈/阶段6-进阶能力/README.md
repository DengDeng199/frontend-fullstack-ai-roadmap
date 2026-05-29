# 阶段6 — 进阶能力（消息队列与实时通信）

> 预计时间：第 14-15 个月
> 目标水平：L3 精通
> 每日投入：工作日 1h + 周末 3h
> 前置依赖：完成阶段1-5

---

## 学习目标

掌握 Node.js 进阶能力（消息队列、实时通信、文件处理），丰富后端技术栈，能实现更复杂的业务功能。

---

## 学习内容

### 6.1 消息队列 — Bull Queue

- **Bull Queue 基础**：
  - 基于 Redis 的 Node.js 消息队列
  - 生产者（Producer）→ 队列（Queue）→ 消费者（Consumer）
- **核心概念**：
  - 队列创建：`new Queue('task')`
  - 添加任务：`queue.add('task-name', data, options)`
  - 处理任务：`queue.process('task-name', handler)`
  - 任务状态：waiting / active / completed / failed / delayed
- **高级特性**：
  - 优先级队列（priority 选项）
  - 延迟任务（delay 选项）
  - 失败重试（attempts / backoff）
  - 任务事件监听（completed / failed / progress）
  - 任务进度报告
- **应用场景**：
  - 异步处理：邮件发送、报告生成
  - 削峰填谷：高并发请求缓冲
  - 任务解耦：前后端异步处理

### 6.2 定时任务

- **node-cron**：
  ```js
  cron.schedule('0 0 2 * * *', () => {
    // 每天凌晨 2 点执行
  })
  ```
- **@nestjs/schedule**：
  - `@Cron()` 装饰器
  - `@Interval()` / `@Timeout()`
- **Cron 表达式语法**：
  - `* * * * * *`（秒 分 时 日 月 周）
  - 常用示例速查
- **分布式定时任务注意事项**：
  - 避免重复执行
  - 分布式锁

### 6.3 WebSocket 实时通信

- **Socket.io**：
  - 服务端：`@nestjs/websockets` + `@nestjs/platform-socket.io`
  - 客户端：`socket.io-client`
  - 事件监听/发送（on / emit）
  - 房间机制（join / leave / to）
  - 命名空间（Namespace）
- **Nest.js Gateway**：
  - `@WebSocketGateway()` 装饰器
  - `@SubscribeMessage()` 消息处理
  - 鉴权（WS 鉴权中间件）
- **心跳检测与断线重连**：
  - ping/pong 心跳
  - 客户端自动重连
  - 连接状态管理
- **原生 WebSocket（ws 库）**：
  - 轻量级替代方案
  - 无额外依赖

### 6.4 文件处理

- **文件上传**：
  - multipart/form-data 解析
  - `@UseInterceptors(FilesInterceptor('file'))`
  - 文件大小限制
  - 文件类型校验（MIME Type + 扩展名）
- **大文件分片上传**：
  - 前端切片（Blob.slice）
  - 分片上传接口
  - 分片合并（fs.appendFileSync / Stream）
  - 断点续传（已上传分片检查）
  - 秒传（文件 Hash 检查）
- **文件存储**：
  - 本地存储（fs）
  - 云存储（OSS / S3 / COS）
  - `@nestjs/terminus` 健康检查

### 6.5 全链路日志与链路追踪

- **Trace ID 传递**：
  - 请求入口生成 Trace ID
  - HTTP Header 传递
  - 日志中携带 Trace ID
  - 跨服务追踪
- **请求日志结构化**：
  ```json
  {
    "traceId": "abc-123",
    "timestamp": "2026-05-26T10:00:00Z",
    "level": "info",
    "method": "GET",
    "url": "/api/users",
    "duration": 125,
    "statusCode": 200
  }
  ```
- **日志分级**：error / warn / info / debug

### 6.6 Node.js 安全最佳实践

- **Helmet**：安全 HTTP 头
  ```js
  app.use(helmet())
  ```
- **Rate Limiting**：
  - @nestjs/throttler
  - 按 IP / 用户限流
  - 暴力破解防护
- **输入净化**：
  - xss 库（XSS 防御）
  - 参数验证（class-validator）
- **SQL 注入防御**：ORM 参数化查询
- **依赖安全**：`npm audit` / Snyk
- **密钥管理**：环境变量 / 密钥管理服务

---

## 实战产出（必须完成）

| 编号 | 产出 | 验收标准 | 应用场景 |
|------|------|---------|---------|
| 1 | WebSocket 实时通知 | 工单状态变更实时推送 | caidiaweb |
| 2 | 文件上传功能 | 含大文件分片上传 + 断点续传 | 通用 |
| 3 | 异步任务队列 | 报告生成 / 数据导出等异步任务 | 通用 |
| 4 | 全链路日志 | Trace ID 贯穿请求全生命周期 | BFF |

---

## 推荐资源

### 官方
- Bull Queue 文档 (github.com/OptimalBits/bull)
- Socket.io 文档 (socket.io)
- @nestjs/websockets 文档

### 在线
- OWASP Node.js 安全指南
- Node.js Best Practices (github.com/goldbergyoni/nodebestpractices)

---

## 检验标准

- [ ] 能实现完整的 WebSocket 实时通知系统
- [ ] 能实现大文件分片上传和断点续传
- [ ] 能用 Bull Queue 实现异步任务处理
- [ ] 能实现全链路日志追踪
- [ ] 能配置基本的安全防护（Helmet / Rate Limiting）

---

> **恭喜完成 Node.js BFF 全栈路线！** 你现在已经具备了独立开发和部署后端服务的能力。继续保持实战积累。
