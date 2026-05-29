# 阶段5 — Docker 与部署

> 预计时间：第 12-14 个月
> 目标水平：L3 精通
> 每日投入：工作日 1h + 周末 3h
> 前置依赖：完成阶段1-4

---

## 学习目标

掌握容器化部署能力，能将 BFF 服务 Docker 化并通过 CI/CD 自动部署到公司服务器。

---

## 学习内容

### 5.1 Docker 基础

- **核心概念**：
  - 镜像（Image）— 只读模板，分层结构
  - 容器（Container）— 镜像的运行实例
  - UnionFS — 联合文件系统
  - Docker Daemon — 后台服务进程
- **常用命令**：
  - `docker build / run / ps / logs / exec / stop / rm`
  - `docker images / rmi`
  - `docker network / volume`

### 5.2 Dockerfile 编写

- **指令详解**：
  - `FROM` — 基础镜像
  - `WORKDIR` — 工作目录
  - `COPY / ADD` — 文件复制
  - `RUN` — 构建时执行命令
  - `EXPOSE` — 声明端口
  - `CMD / ENTRYPOINT` — 容器启动命令
  - `ENV / ARG` — 环境变量
- **多阶段构建（重要）**：
  ```dockerfile
  # 阶段1：构建
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  # 阶段2：运行
  FROM node:20-alpine
  WORKDIR /app
  COPY --from=builder /app/dist ./dist
  COPY package*.json ./
  RUN npm ci --production
  EXPOSE 3000
  CMD ["node", "dist/main.js"]
  ```
- **镜像优化**：
  - Alpine 基础镜像（更小）
  - node_modules 缓存层（先 COPY package.json）
  - .dockerignore 文件
  - 目标：最终镜像 < 200MB

### 5.3 Docker Compose

- **编排多服务**：
  ```yaml
  services:
    bff:
      build: .
      ports:
        - "3000:3000"
      depends_on:
        - mysql
        - redis
    mysql:
      image: mysql:8
      environment:
        MYSQL_ROOT_PASSWORD: xxx
      volumes:
        - mysql_data:/var/lib/mysql
    redis:
      image: redis:7-alpine
  ```
- **网络配置**：bridge / host
- **数据卷**：持久化存储
- **环境变量**：.env 文件

### 5.4 Nginx 反向代理

- **基础配置**：
  ```nginx
  server {
    listen 80;
    server_name api.example.com;
    location / {
      proxy_pass http://bff:3000;
      proxy_set_header Host $host;
    }
  }
  ```
- **HTTPS 配置**：Let's Encrypt / certbot
- **Gzip 压缩**：`gzip on`
- **静态资源缓存**：`expires` 指令
- **负载均衡**：upstream 模块

### 5.5 PM2 进程管理

- **启动配置**：
  ```json
  {
    "apps": [{
      "name": "bff",
      "script": "dist/main.js",
      "instances": "max",
      "exec_mode": "cluster",
      "max_memory_restart": "300M",
      "log_date_format": "YYYY-MM-DD HH:mm:ss"
    }]
  }
  ```
- **Cluster 模式**：多核 CPU 利用
- **零停机重启**：`pm2 reload`
- **日志管理**：pm2 logs / pm2 install pm2-logrotate
- **监控面板**：pm2 monit / pm2 plus

### 5.6 日志收集

- **结构化日志**：JSON 格式输出
- **日志轮转**：pm2-logrotate / logrotate
- **日志收集方案**（了解）：ELK Stack / Loki + Grafana

### 5.7 CI/CD 集成

- **GitHub Actions 部署**：
  ```yaml
  - name: Build and Push
    run: docker build -t bff:latest .
  - name: Deploy
    run: docker-compose up -d
  ```
- **部署策略**：
  - 蓝绿部署
  - 滚动更新
- **健康检查**：
  - Docker HEALTHCHECK
  - /health 端点
  - 自动重启策略

### 5.8 监控告警（了解）

- **Prometheus**：指标采集
- **Grafana**：可视化面板
- **告警规则**：CPU/内存/接口错误率

---

## 实战产出（必须完成）

| 编号 | 产出 | 验收标准 |
|------|------|---------|
| 1 | Dockerfile | 多阶段构建，最终镜像 < 200MB |
| 2 | Docker Compose | 编排 BFF + MySQL + Redis |
| 3 | Nginx 配置 | 反向代理 + HTTPS + Gzip |
| 4 | PM2 配置 | Cluster 模式 + 日志管理 |
| 5 | CI/CD 流水线 | 自动构建 + 部署 + 健康检查 |

---

## 推荐资源

### 官方
- Docker 官方文档 (docs.docker.com)
- Docker Hub (hub.docker.com)
- PM2 官方文档 (pm2.keymetrics.io)
- Nginx 官方文档 (nginx.org/en/docs)

### 书籍
- 《Docker 实战》

---

## 检验标准

- [ ] 能编写优化的多阶段 Dockerfile
- [ ] 能用 Docker Compose 编排多服务
- [ ] 能配置 Nginx 反向代理和 HTTPS
- [ ] 能实现 CI/CD 自动部署到服务器
- [ ] 能配置 PM2 集群模式和日志管理

---

> **下一阶段**：完成本阶段后，进入「阶段6-进阶能力」
