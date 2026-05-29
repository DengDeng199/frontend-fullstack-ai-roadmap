# 阶段3 — MyBatis 映射理解

> 预计时间：第 10-11 个月
> 目标水平：L1 了解级
> 每日投入：每天 15-20 分钟（低频学习）
> 前置依赖：完成阶段1-2

---

## 学习目标

能看懂 MyBatis SQL 映射文件，理解数据从数据库到 Java 对象的完整流转过程。

---

## 学习内容

### 3.1 MyBatis 基本概念

- **Mapper 接口**：Java 接口，定义数据库操作方法
- **XML Mapper 文件**：SQL 语句与接口方法的映射关系
- **SQL Session**：数据库会话管理

### 3.2 SQL 映射文件结构

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
  "http://mybatis.org/dtd/mybatis-3-mapper.dtd">

<mapper namespace="com.example.mapper.UserMapper">

  <!-- resultMap: 定义结果映射 -->
  <resultMap id="userResultMap" type="com.example.entity.User">
    <id property="id" column="user_id"/>
    <result property="name" column="user_name"/>
    <result property="email" column="email"/>
  </resultMap>

  <!-- select: 查询 -->
  <select id="findById" parameterType="long" resultMap="userResultMap">
    SELECT user_id, user_name, email FROM users WHERE user_id = #{id}
  </select>

  <!-- insert: 插入 -->
  <insert id="insert" parameterType="com.example.entity.User" useGeneratedKeys="true" keyProperty="id">
    INSERT INTO users (user_name, email) VALUES (#{name}, #{email})
  </insert>

  <!-- update: 更新 -->
  <update id="update" parameterType="com.example.entity.User">
    UPDATE users SET user_name = #{name}, email = #{email} WHERE user_id = #{id}
  </update>

  <!-- delete: 删除 -->
  <delete id="deleteById" parameterType="long">
    DELETE FROM users WHERE user_id = #{id}
  </delete>

</mapper>
```

**关键理解**：
- `#{}` — 参数占位符（预编译，防 SQL 注入）
- `${}` — 字符串替换（不安全，仅动态列名等场景使用）
- `namespace` — 对应 Mapper 接口的全限定名
- `resultMap` — 定义数据库列 → Java 属性的映射

### 3.3 动态 SQL

```xml
<!-- if: 条件判断 -->
<select id="findUsers" resultMap="userResultMap">
  SELECT * FROM users
  WHERE 1=1
  <if test="name != null and name != ''">
    AND user_name LIKE CONCAT('%', #{name}, '%')
  </if>
  <if test="email != null and email != ''">
    AND email = #{email}
  </if>
</select>

<!-- choose-when-otherwise: 多条件分支（类似 switch-case） -->
<select id="findActive" resultMap="userResultMap">
  SELECT * FROM users
  <where>
    <choose>
      <when test="type == 'name'">AND user_name = #{value}</when>
      <when test="type == 'email'">AND email = #{value}</when>
      <otherwise>AND status = 'ACTIVE'</otherwise>
    </choose>
  </where>
</select>

<!-- where: 自动处理 WHERE 关键字和 AND 前缀 -->
<!-- set: 自动处理 SET 关键字和逗号 -->

<!-- foreach: 遍历集合（IN 查询） -->
<select id="findByIds" resultMap="userResultMap">
  SELECT * FROM users WHERE user_id IN
  <foreach collection="ids" item="id" open="(" separator="," close=")">
    #{id}
  </foreach>
</select>

<!-- SQL 片段复用 -->
<sql id="userColumns">
  user_id, user_name, email, status, create_time
</sql>

<select id="findAll" resultMap="userResultMap">
  SELECT <include refid="userColumns"/> FROM users
</select>
```

### 3.4 关联查询

**一对一（association）**：
```xml
<resultMap id="orderWithUser" type="Order">
  <id property="id" column="order_id"/>
  <result property="amount" column="amount"/>
  <association property="user" javaType="User">
    <id property="id" column="user_id"/>
    <result property="name" column="user_name"/>
  </association>
</resultMap>
```

**一对多（collection）**：
```xml
<resultMap id="userWithOrders" type="User">
  <id property="id" column="user_id"/>
  <result property="name" column="user_name"/>
  <collection property="orders" ofType="Order">
    <id property="id" column="order_id"/>
    <result property="amount" column="amount"/>
  </collection>
</resultMap>
```

**嵌套查询 vs 嵌套结果**：
- 嵌套查询：N+1 问题（但简单）
- 嵌套结果：一次 JOIN 查询（推荐）

### 3.5 分页机制

- **PageHelper 插件**：
  ```java
  PageHelper.startPage(pageNum, pageSize);
  List<User> users = userMapper.findAll();
  PageInfo<User> pageInfo = new PageInfo<>(users);
  ```
- 理解分页参数如何传递到 SQL

### 3.6 MyBatis-Plus（如公司使用）

- CRUD 接口：`extends BaseMapper<User>`
- 条件构造器：`QueryWrapper` / `LambdaQueryWrapper`
- 自动填充：@TableField(fill = FieldFill.INSERT)
- 逻辑删除：@TableLogic

---

## 实战产出

| 编号 | 产出 | 验收标准 |
|------|------|---------|
| 1 | 阅读公司 Mapper XML | 能理解所有动态 SQL 逻辑 |
| 2 | 联调问题定位 | 能判断问题出在 SQL 层还是 Java 层 |

---

## 推荐资源

- MyBatis 官方文档 (mybatis.org/mybatis-3/zh/index.html)
- 公司项目的 Mapper XML 文件（直接阅读学习）

---

## 检验标准

- [ ] 能独立阅读复杂 MyBatis XML 并理解 SQL 逻辑
- [ ] 能理解 resultMap 的字段映射关系
- [ ] 能看懂动态 SQL（if/choose/foreach/where/set）
- [ ] 能理解 association 和 collection 的区别

---

> **下一阶段**：完成本阶段后，进入「阶段4-跨团队协作桥梁」
