# 阶段4 — 前端工程化体系

> 预计时间：第 7-10 个月
> 目标水平：L3 精通
> 每日投入：工作日 1h + 周末 3h
> 前置依赖：完成阶段1-3

---

## 学习目标

掌握前端工程化全链路能力，能搭建和维护团队的构建、测试、CI/CD 基础设施，成为团队开发效率的核心推动者。

---

## 学习内容

### 4.1 Vite 构建原理

- **ESM 预构建（Pre-bundling）**：esbuild 将 CJS 依赖转为 ESM
- **HMR 原理**：基于 ESM 的热模块替换、WebSocket 通信
- **Rollup 打包**：生产构建使用 Rollup，tree-shaking 优化
- **Vite 配置深入**：resolve.alias / plugins / server.proxy / build 配置
- **Vite vs Webpack**：设计理念差异、适用场景

### 4.2 Vite 插件开发

- **插件 API**：
  - 通用钩子：enforce / apply / configResolved
  - 构建钩子：resolveId / load / transform / buildStart / buildEnd
  - 生成钩子：generateBundle / writeBundle
- **Rollup 插件兼容**：Vite 插件同时支持 dev 和 build
- **常用插件模式**：虚拟模块（Virtual Module）/ 代码注入 / 路由自动生成
- **插件调试**：vite-plugin-inspect

### 4.3 ESLint 深度

- **Flat Config**：ESLint 9+ 新配置格式
- **规则自定义**：AST 节点遍历、编写自定义规则
- **与 Prettier 集成**：eslint-config-prettier + eslint-plugin-prettier
- **TypeScript 支持**：@typescript-eslint/parser + rules
- **Vue 支持**：eslint-plugin-vue
- **Lint 规则分层**：base / recommended / strict / custom

### 4.4 自动化测试

- **Vitest 单元测试**：
  - describe / it / expect 断言
  - Mock / Spy / Stub
  - 测试覆盖率（coverage）
  - 快照测试（snapshot）
- **Testing Library 组件测试**：
  - 用户行为驱动测试（模拟点击、输入）
  - 查询策略（getByText / getByRole / getByTestId）
  - 异步测试（waitFor / findBy）
- **Cypress E2E 测试**：
  - 页面交互测试
  - 网络请求拦截
  - 视觉回归测试（截图对比）
- **测试策略金字塔**：70% 单测 / 20% 组件测试 / 10% E2E

### 4.5 Monorepo 管理

- **pnpm workspace**：
  - workspace 协议（workspace:*）
  - pnpm-workspace.yaml 配置
  - 命令过滤（--filter）
- **Turborepo**：
  - 任务编排（pipeline 配置）
  - 远程缓存
  - 增量构建
- **Nx**（了解）：更重但功能更全
- **Monorepo 常见问题**：依赖管理、版本发布、CI 优化

### 4.6 CI/CD

- **GitHub Actions**：
  - Workflow 语法（on / jobs / steps）
  - 常用 Action（checkout / setup-node / cache）
  - Matrix 策略（多版本并行测试）
  - Secrets 管理
- **Jenkins**（公司可能使用）：
  - Pipeline 脚本
  - 多阶段构建
- **CI 流水线设计**：
  - lint → type-check → test → build → deploy
  - 并行优化、缓存策略
  - 失败通知（邮件/钉钉/企业微信）

### 4.7 代码规范与 Git 工作流

- **Husky**：Git hooks 管理
- **lint-staged**：只对暂存文件执行 lint
- **commitlint**：提交信息规范（Conventional Commits）
- **Conventional Commits**：feat / fix / docs / style / refactor / test / chore
- **Git Flow vs GitHub Flow**：分支管理策略
- **Code Review 规范**：PR 模板、Review Checklist

### 4.8 版本管理与发布

- **semver 语义化版本**：MAJOR.MINOR.PATCH
- **changeset**：自动化版本管理与变更日志生成
- **release-it**：自动化发布流程
- **npm 发包**（如团队内部包）

---

## 实战产出（必须完成）

| 编号 | 产出 | 验收标准 |
|------|------|---------|
| 1 | Vite 自定义插件 | 开发 1 个实用插件（如自动路由/自动导入） |
| 2 | 单元测试覆盖 | caidiaweb 核心模块覆盖率达到 80% |
| 3 | CI 流水线 | 配置 lint → test → build → deploy 完整流程 |
| 4 | 代码规范体系 | Husky + lint-staged + commitlint 全套配置 |
| 5 | ESLint 自定义规则 | 编写 1-2 个团队专属 lint 规则 |

---

## 推荐资源

### 在线
- Vite 官方文档 (vitejs.dev)
- Vitest 官方文档 (vitest.dev)
- Turborepo 官方文档 (turbo.build)
- GitHub Actions 文档

### 小册/课程
- 掘金小册《Vite 原理与插件开发》
- 掘金小册《前端工程化：从方法论到工业实践》

### 工具
- Vite Plugin Inspector
- rollup-plugin-visualizer（包体积分析）
- Speed Measure Plugin（Webpack 构建速度分析）

---

## 检验标准

- [ ] 能独立开发一个功能完整的 Vite 插件
- [ ] 能为项目搭建 lint + test + build + deploy 的 CI 流水线
- [ ] 能编写组件测试和 E2E 测试
- [ ] 能配置 Monorepo（pnpm workspace + Turborepo）
- [ ] 能自定义 ESLint 规则

---

> **下一阶段**：完成本阶段后，进入「阶段5-前端可视化技术」
