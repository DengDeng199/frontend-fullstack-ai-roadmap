# 阶段3 — 数据库与 ORM

> 预计时间：第 8-10 个月
> 目标水平：L3 精通
> 每日投入：工作日 1h + 周末 3h
> 前置依赖：完成 Nest.js 阶段2

---

## 学习目标

掌握关系型数据库设计、SQL 优化和 ORM 使用，为 BFF 层实战开发储备数据层能力。

---

## 学习内容

### 3.1 MySQL 基础与进阶

- **数据类型与表设计**：
  - 整数类型（INT / BIGINT）vs 字符类型（VARCHAR / TEXT）
  - 日期时间类型（DATETIME / TIMESTAMP）
  - JSON 类型
  - 范式（1NF / 2NF / 3NF）vs 反范式设计
- **索引原理**：
  - B+ 树结构
  - 聚簇索引 vs 非聚簇索引（二级索引）
  - 覆盖索引
  - 联合索引与最左前缀原则
  - 索引失效场景（函数/隐式转换/OR/NOT/左模糊）
- **事务**：
  - ACID 特性（原子性/一致性/隔离性/持久性）
  - 4 种隔离级别：
    - READ UNCOMMITTED — 脏读
    - READ COMMITTED — 不可重复读
    - REPEATABLE READ（MySQL 默认）— 幻读
    - SERIALIZABLE — 串行化
  - 事务传播行为
- **慢查询分析与优化**：
  - EXPLAIN 执行计划（type / key / rows / Extra）
  - Slow Query Log 开启与分析
  - 常见优化策略（索引优化/SQL 改写/分库分表）
- **SQL 注入防御**：参数化查询、ORM 自动转义

### 3.2 Redis 缓存

- **数据结构与适用场景**：
  - String — 缓存对象、计数器、分布式锁
  - Hash — 用户信息、对象属性
  - Set — 标签、共同好友
  - ZSet（有序集合）— 排行榜、时间线
  - List — 消息队列、最新列表
- **缓存策略**：
  - Cache Aside — 旁路缓存（最常用）
  - Read Through — 读穿透
  - Write Through — 写穿透
  - Write Behind — 异步写入
- **缓存常见问题**：
  - 缓存穿透 — 布隆过滤器 / 空值缓存
  - 缓存击穿 — 互斥锁 / 热点预加载
  - 缓存雪崩 — 过期时间随机化 / 多级缓存
- **过期策略与内存淘汰**：
  - 定时删除 / 惰性删除
  - noeviction / allkeys-lru / volatile-lru / allkeys-random

### 3.3 ORM 框架（选一个深入学习）

**推荐 Prisma**（更现代、类型安全）：

- **Schema 定义**：
  ```prisma
  model User {
    id    Int      @id @default(autoincrement())
    email String   @unique
    name  String
    posts Post[]
  }
  ```
- **数据库迁移**：`prisma migrate dev / deploy`
- **类型安全查询**：自动生成 TypeScript 类型
- **CRUD 操作**：findMany / findUnique / create / update / delete
- **关联查询**：include / select
- **分页**：skip / take
- **事务**：`prisma.$transaction()`

**备选 TypeORM**：

- Entity / Repository 模式
- QueryBuilder 复杂查询
- 关系映射（@OneToMany / @ManyToOne / @ManyToMany）
- 与 Nest.js 集成（@nestjs/typeorm）

### 3.4 数据库连接管理

- 连接池配置（最小/最大连接数）
- 连接泄漏排查
- 慢查询日志监控

---

## 实战产出（必须完成）

| 编号 | 产出 | 验收标准 |
|------|------|---------|
| 1 | 数据库 Schema 设计 | 设计一个业务数据库（如干扰排查工单管理） |
| 2 | ORM CRUD + 关联查询 | 用 Prisma/TypeORM 实现完整的增删改查 |
| 3 | Redis 缓存层 | 实现热点数据缓存 + 缓存失效策略 |
| 4 | 慢查询优化 | 用 EXPLAIN 分析并优化 3 条慢查询 |

---

## 推荐资源

### 书籍
- 《高性能 MySQL》第 3 版 — **必读**
- 《Redis 设计与实现》

### 在线
- Prisma 官方文档 (prisma.io/docs)
- MySQL 官方文档 — EXPLAIN 章节
- Redis 命令参考 (redis.io/commands)

---

## 检验标准

- [ ] 能独立设计合理的数据库表结构（范式/索引）
- [ ] 能用 EXPLAIN 分析执行计划并优化慢查询
- [ ] 能用 ORM 实现复杂查询（关联/分页/事务）
- [ ] 能实现 Redis 缓存层并解决缓存穿透/击穿/雪崩

---

> **下一阶段**：完成本阶段后，进入「阶段4-BFF 层实战开发」
