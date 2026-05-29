# 阶段1 — Java 语法速通（与 JS 对比学习）

> 预计时间：第 6-7 个月
> 目标水平：L1 了解级
> 每日投入：每天 15-20 分钟（低频学习）
> 学习方法：与 JavaScript 对比，只关注差异部分

---

## 学习目标

用已有的 JavaScript 知识快速理解 Java 语法，能阅读公司 Java 后端项目中的基础代码。

---

## 核心定位

> **你不是要成为 Java 开发者。** 你的目标是能看懂代码、能改配置、能和后端同学高效沟通。

---

## 学习内容（JS vs Java 对比）

### 1.1 类型系统对比

| 特性 | JavaScript | Java |
|------|-----------|------|
| 类型系统 | 动态类型 | 静态类型（编译时检查） |
| 声明变量 | let x = 1 | int x = 1; |
| 数字类型 | number（不区分整型浮点） | int / long / double / float |
| 字符串 | string（基本类型） | String（引用类型，不可变） |
| 布尔 | boolean | boolean |
| 未定义 | undefined / null | null（基本类型有默认值） |
| 类型检查 | typeof / instanceof | instanceof / Class.isInstance() |

**重点理解**：
- Java 的 `int` 是基本类型，`Integer` 是包装类型（自动装箱/拆箱）
- Java 方法参数是值传递（引用类型传递引用的副本）

### 1.2 面向对象对比

| 特性 | JavaScript | Java |
|------|-----------|------|
| 类定义 | class / 原型链 | class（编译时确定） |
| 继承 | extends / 原型链 | extends（单继承）/ implements（多接口） |
| 接口 | TypeScript interface | interface（只有方法签名） |
| 抽象类 | 无原生支持 | abstract class |
| 访问修饰符 | 无（靠闭包/约定） | public / private / protected / default |
| 方法重载 | 不支持 | 支持（同名不同参数） |

**重点理解**：
- Java 的 `interface` 只有方法声明，没有实现
- Java 的 `abstract class` 可以有部分实现
- Java 的访问修饰符是编译时强制的

### 1.3 集合框架对比

| JS 类型 | Java 等价 | 注意事项 |
|---------|----------|---------|
| Array | ArrayList / 数组 | ArrayList 动态扩容 |
| Set | HashSet | 基于 HashMap |
| Map | HashMap | 键值对存储 |
| WeakMap | WeakHashMap | 弱引用 |
| [1,2,3].map() | list.stream().map().collect() | Stream API |

### 1.4 异常处理对比

| 特性 | JavaScript | Java |
|------|-----------|------|
| try-catch | try {} catch(e) {} | try {} catch(Exception e) {} |
| 必须捕获 | 否 | checked exception 必须处理 |
| 抛出异常 | throw new Error() | throw new RuntimeException() |
| 声明异常 | 无 | throws Exception |

**重点理解**：Java 的 checked exception 是编译器强制你处理的异常。

### 1.5 Lambda 与 Stream

```java
// Java Stream（类似 JS 数组方法）
List<String> names = users.stream()
    .filter(u -> u.getAge() > 18)     // 类似 .filter()
    .map(User::getName)                // 类似 .map()
    .sorted()                          // 类似 .sort()
    .collect(Collectors.toList());     // 收集结果

// Java Lambda（类似 JS 箭头函数）
list.forEach(item -> System.out.println(item));
```

### 1.6 枚举与注解

- **enum**：`enum Season { SPRING, SUMMER, AUTUMN, WINTER }`
- **注解（Annotation）**：
  - `@Override` — 重写父类方法
  - `@Autowired` — 自动注入（Spring）
  - `@RequestMapping` — 路由映射（Spring MVC）
  - `@Transactional` — 事务管理

### 1.7 构建工具

| npm/pnpm | Maven | Gradle |
|----------|-------|--------|
| package.json | pom.xml | build.gradle |
| npm install | mvn install | gradle build |
| node_modules | ~/.m2/repository | ~/.gradle/caches |

---

## 实战产出

| 编号 | 产出 | 验收标准 |
|------|------|---------|
| 1 | JS vs Java 语法对比速查表 | 整理为参考文档，存入笔记文件夹 |

---

## 推荐资源

- 《Java 核心技术 卷I》前 8 章（跳过 Swing/AWT 图形界面部分）
- 菜鸟教程 Java 部分（做语法速查）
- 公司 Java 项目源码（最好的学习资料）

---

## 检验标准

- [ ] 能看懂公司 Java 后端的 Controller/Service 基础代码
- [ ] 能理解 Java 接口定义和实现关系
- [ ] 能识别常用注解的含义（@Autowired / @RequestMapping 等）

---

> **下一阶段**：完成本阶段后，进入「阶段2-Spring Boot 能读懂」
