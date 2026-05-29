# 阶段2 — Nest.js 框架实战

> 预计时间：第 6-8 个月
> 目标水平：L3 精通
> 每日投入：工作日 1h + 周末 3h
> 前置依赖：完成 Node.js 阶段1

---

## 学习目标

掌握 Nest.js 框架的核心概念和请求处理全链路，能独立搭建 RESTful API 服务。

---

## 学习内容

### 2.1 Nest.js 核心概念

- **装饰器（Decorators）**：
  - `@Controller()` — 定义控制器
  - `@Get() / @Post() / @Put() / @Patch() / @Delete()` — 路由方法
  - `@Body() / @Param() / @Query() / @Headers()` — 参数提取
  - `@HttpCode() / @Header() / @Redirect()` — 响应配置
- **依赖注入（DI）与 IoC 容器**：
  - 控制反转原则
  - Nest.js IoC 容器自动管理依赖
  - Provider 注入与生命周期
- **模块化架构**：
  - `@Module()` — 定义模块
  - imports / controllers / providers / exports
  - 全局模块（@Global）
  - 动态模块（forRoot / forRootAsync）

### 2.2 Controller 层

- 路由定义与参数验证
- DTO（Data Transfer Object）设计
- 响应格式统一（NestJS 拦截器）
- 文件上传处理（@UseInterceptors + FilesInterceptor）
- 路由分组与版本控制

### 2.3 Service 层

- 业务逻辑组织
- 依赖注入其他 Service
- 事务管理（TypeORM Transaction）
- 异常抛出（HttpException / 业务异常封装）

### 2.4 请求处理全链路

```
请求 → Middleware → Guards → Interceptors(before) → Pipes → Controller → Service → Interceptors(after) → 响应
```

- **Guards（守卫）**：
  - 鉴权守卫（JWTAuthGuard）
  - 角色守卫（RolesGuard）
  - 自定义守卫（CanActivate 接口）
- **Interceptors（拦截器）**：
  - 响应格式转换（TransformInterceptor）
  - 日志记录（LoggingInterceptor）
  - 缓存（CacheInterceptor）
  - 超时处理（TimeoutInterceptor）
- **Pipes（管道）**：
  - 数据验证（ValidationPipe + class-validator）
  - 类型转换（ParseIntPipe / ParseUUIDPipe）
  - 自定义管道（PipeTransform 接口）
- **Filters（过滤器）**：
  - 异常过滤器（HttpExceptionFilter）
  - 自定义异常响应格式
  - 全局异常处理
- **Middleware（中间件）**：
  - 日志中间件
  - CORS 配置
  - 请求耗时统计

### 2.5 配置管理

- `@nestjs/config` — ConfigModule
- 环境变量（.env 文件）
- 配置命名空间（registerAs）
- 配置验证（Joi / zod schema 验证）
- 多环境配置（.env.development / .env.production）

### 2.6 日志系统

- 内置 Logger 使用
- `winston` 集成 — 多传输通道（控制台/文件/远程）
- `pino` 集成 — 高性能 JSON 日志
- 日志级别控制
- 请求日志中间件

### 2.7 Swagger 集成

- `@nestjs/swagger` 配置
- DTO 自动生成文档（@ApiProperty）
- 接口分组与标签（@ApiTags）
- 响应示例定义（@ApiResponse）
- 认证配置（@ApiBearerAuth）

### 2.8 健康检查

- `@nestjs/terminus`
- HealthIndicator（数据库 / Redis / 磁盘等检查项）
- 健康检查端点（/health）

---

## 实战产出（必须完成）

| 编号 | 产出 | 验收标准 |
|------|------|---------|
| 1 | Nest.js 项目骨架 | 含分层架构/配置/日志/健康检查/错误处理 |
| 2 | CRUD RESTful API | 含分页/搜索/排序/参数校验 |
| 3 | 全局异常处理 | 统一响应格式 + 错误码规范 |
| 4 | Swagger 文档 | 自动生成完整 API 文档 |

---

## 推荐资源

### 官方
- Nest.js 官方文档 (docs.nestjs.com) — **最佳学习资源**

### 课程
- 掘金小册《Nest.js 通关秘籍》
- B 站戴铭《Nest.js 优雅的后端开发框架》

### 参考
- Nest.js 官方示例 (github.com/nestjs/nest/tree/master/sample)
- class-validator 文档 (github.com/typestack/class-validator)

---

## 检验标准

- [ ] 能从零搭建 Nest.js 项目并完成带鉴权的 CRUD API
- [ ] 理解 Guards/Interceptors/Pipes/Filters 的执行顺序和作用
- [ ] 能集成 Swagger 并自动生成 API 文档
- [ ] 能实现全局统一响应格式和异常处理

---

> **下一阶段**：完成本阶段后，进入「阶段3-数据库与ORM」
