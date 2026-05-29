# 阶段2 — Spring Boot 能读懂

> 预计时间：第 8-9 个月
> 目标水平：L1 了解级
> 每日投入：每天 15-20 分钟（低频学习）
> 前置依赖：完成阶段1 Java 语法速通

---

## 学习目标

理解 Spring Boot 项目结构和核心注解，能直接阅读公司 Java 后端代码理解业务逻辑。

---

## 学习内容

### 2.1 Spring Boot 项目结构

```
src/
├── main/
│   ├── java/com/example/project/
│   │   ├── Application.java          # 启动类
│   │   ├── controller/               # 控制层（接收请求）
│   │   ├── service/                  # 服务层（业务逻辑）
│   │   ├── mapper/                   # 数据访问层（MyBatis）
│   │   ├── entity/                   # 实体类
│   │   ├── dto/                      # 数据传输对象
│   │   ├── config/                   # 配置类
│   │   └── common/                   # 公共类（工具/异常等）
│   └── resources/
│       ├── application.yml           # 配置文件
│       ├── mapper/                   # MyBatis XML 文件
│       └── static/                   # 静态资源
└── test/                             # 测试代码
```

### 2.2 核心注解理解

**启动与配置**：
- `@SpringBootApplication` — 启动类，包含 @Configuration + @EnableAutoConfiguration + @ComponentScan
- `@Configuration` — 配置类（类似 Vue 的 provide）
- `@Bean` — 手动注册 Bean（类似 Vue 的 inject）
- `@Value("${key}")` — 读取配置项
- `@ConfigurationProperties(prefix = "xxx")` — 批量读取配置

**请求处理**：
- `@RestController` — 标记控制器（@Controller + @ResponseBody）
- `@RequestMapping("/api/users")` — 路由前缀
- `@GetMapping / @PostMapping / @PutMapping / @DeleteMapping` — HTTP 方法
- `@RequestParam` — 查询参数（?name=xxx）
- `@PathVariable` — 路径参数（/users/{id}）
- `@RequestBody` — 请求体（JSON → 对象）

**依赖注入**：
- `@Service` — 标记服务类
- `@Component` — 通用组件标记
- `@Repository` — 标记数据访问层
- `@Autowired` — 自动注入依赖（构造器注入推荐）

**其他常用注解**：
- `@Transactional` — 事务管理
- `@Valid / @NotNull / @Size` — 参数校验
- `@Slf4j` — Lombok 日志注解
- `@Data` — Lombok 自动生成 getter/setter/toString

### 2.3 分层架构理解

```
前端请求 → Controller（参数校验/路由） → Service（业务逻辑） → Mapper/DAO（数据访问） → 数据库
                ↑                          ↑                          ↑
          @RequestParam              @Autowired               MyBatis XML
          @RequestBody               @Transactional           @Select
```

### 2.4 配置文件

```yaml
# application.yml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
    password: xxx
    driver-class-name: com.mysql.cj.jdbc.Driver

mybatis:
  mapper-locations: classpath:mapper/*.xml
  type-aliases-package: com.example.entity
```

### 2.5 依赖注入（IoC）

- **IoC 容器**：Spring 管理所有 Bean 的创建和注入
- **依赖注入方式**：
  1. 构造器注入（推荐）
  2. 字段注入 `@Autowired`
  3. Setter 注入
- **Bean 生命周期**：实例化 → 属性注入 → 初始化 → 使用 → 销毁

### 2.6 AOP 基础概念（能看懂即可）

- **切面（Aspect）**：横切关注点（如日志、事务）
- **通知（Advice）**：切面在特定点执行的动作
- **切点（Pointcut）**：定义通知在哪里执行
- **常见使用**：日志切面、权限切面、事务管理

---

## 实战产出

| 编号 | 产出 | 验收标准 |
|------|------|---------|
| 1 | 阅读公司 Java 代码 | 能理解 Controller/Service/Mapper 业务逻辑 |
| 2 | 理解 Swagger 文档 | 能对应到 Java Controller 方法 |

---

## 推荐资源

- Spring Boot 官方 Guide (spring.io/guides)
- **公司内部 Java 项目源码** — 最好的学习资料
- 与后端同学交流（最快的学习方式）

---

## 检验标准

- [ ] 能在接口联调时看 Java Controller 定位参数不匹配问题
- [ ] 能看懂 application.yml 配置项含义
- [ ] 能理解 @Autowired 依赖注入的工作方式

---

> **下一阶段**：完成本阶段后，进入「阶段3-MyBatis 映射理解」
