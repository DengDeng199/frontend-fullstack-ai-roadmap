# 4.5 Monorepo 管理

> 阶段 4 · 前端工程化体系
> 学习目标：理解 Monorepo 的核心价值，掌握 pnpm workspace 的依赖管理、Turborepo 的任务编排与增量缓存，了解 Nx 的能力边界，并能把这些方案落地到真实项目中。

---

## 目录

| 章节 | 内容 |
|------|------|
| [一、Monorepo 概念基础](#一monorepo-概念基础) | 什么是 Monorepo、与 Multirepo 对比、适用场景 |
| [二、pnpm workspace](#二pnpm-workspace) | workspace 协议、yaml 配置、命令过滤、依赖提升 |
| [三、Turborepo](#三turborepo) | pipeline 任务编排、本地/远程缓存、增量构建 |
| [四、Nx（了解）](#四nx了解) | 能力全景、与 Turborepo 对比 |
| [五、Monorepo 常见问题](#五monorepo-常见问题) | 依赖管理、版本发布、CI 优化 |
| [六、caidiaweb 实践案例](#六caidiaweb-实践案例) | 用 pnpm + Turborepo 重构多包结构的完整方案 |
| [七、面试考点](#七面试考点) | 高频面试题与标准回答 |

---

## 一、Monorepo 概念基础

### 1.1 什么是 Monorepo

**Monorepo（单体仓库）**：把多个相关的项目/包放在**同一个 Git 仓库**中统一管理。

```
my-monorepo/
├── packages/
│   ├── shared-ui/        # 通用组件库
│   ├── utils/            # 工具函数库
│   └── eslint-config/    # 共享 ESLint 配置
├── apps/
│   ├── web/              # 主站（Vue）
│   └── admin/            # 管理后台（Vue）
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### 1.2 Monorepo vs Multirepo 对比

| 维度 | Monorepo（单体） | Multirepo（多仓） |
|------|-----------------|------------------|
| **代码共享** | 直接引用本地包，改一处全生效 ✅ | 需发 npm 包版本，跨仓同步成本高 ❌ |
| **依赖管理** | 单一 lockfile，去重彻底 ✅ | 各仓独立安装，版本漂移 ❌ |
| **重构影响面** | 跨包改名一键全局搜索替换 ✅ | 需逐个仓库提 PR，易遗漏 ❌ |
| **权限控制** | 粒度粗（仓库级） ❌ | 仓库级天然隔离 ✅ |
| **CI 速度** | 可增量构建/缓存命中 ✅ | 各仓库重复构建 ❌ |
| **仓库体积** | 随历史增长变大 ❌ | 单仓轻量 ✅ |

### 1.3 适用场景决策树

```
项目之间有代码共享需求？
├── 否 → Multirepo（独立发版、团队自治）
└── 是 → 需要统一构建/测试/规范？
         ├── 否 → Multirepo + 私有 npm registry
         └── 是 → ✅ Monorepo（pnpm workspace + Turborepo）
```

**典型适用**：中大型前端团队（组件库 + 多个业务应用）、BFF + 前端同仓、跨端共享逻辑（web/h5/mini）。

---

## 二、pnpm workspace

### 2.1 为什么选 pnpm

| 方案 | 问题 | pnpm 优势 |
|------|------|----------|
| npm/yarn | 扁平 node_modules 导致「幽灵依赖」（可访问未声明包） | **严格 node_modules**，只能访问显式声明依赖 ✅ |
| npm/yarn | 重复安装相同版本 | 内容寻址存储，**全局硬链接去重** ✅ |
| npm/yarn | 安装慢 | 并行 + 软硬链接，速度提升 2-3 倍 ✅ |

### 2.2 pnpm-workspace.yaml 配置

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'              # 所有应用
  - 'packages/*'          # 所有共享包
  - 'packages/**'         # 嵌套子包（可选）
  # 排除示例
  # - '!**/test/**'
```

### 2.3 workspace 协议（workspace:*）

包之间互相引用时，使用 `workspace:` 协议，pnpm 会**直接软链接本地包**，而不是从 registry 下载。

```jsonc
// apps/web/package.json
{
  "dependencies": {
    "shared-ui": "workspace:*",        // 链接本地 packages/shared-ui
    "@org/utils": "workspace:^1.0.0",  // 带版本约束的链接
    "lodash": "^4.17.21"               // 普通外部依赖照常
  }
}
```

**workspace 协议变体含义**：

| 写法 | 含义 |
|------|------|
| `workspace:*` | 始终链接本地最新版本（推荐开发期） |
| `workspace:^1.0.0` | 本地版本需满足 `^1.0.0` |
| `workspace:~1.0.0` | 本地版本需满足 `~1.0.0` |
| `workspace:1.0.0` | 精确匹配 |

> ⚠️ 发布到 npm 时，pnpm 会自动把 `workspace:*` 替换为实际版本号。

### 2.4 命令过滤（--filter）

```bash
# 在 web 包中执行 build
pnpm --filter web build

# 在所有包中执行 test
pnpm --filter "./packages/*" test

# 依赖 web 的所有包（含 web 自身）
pnpm --filter web... build

# web 依赖的包（不含 web）
pnpm --filter "...web" build

# 排除某包
pnpm --filter "!docs" build

# 多个过滤条件
pnpm --filter "{packages/**}..." --filter web test
```

### 2.5 共享依赖与根配置

```jsonc
// 根 package.json —— 用 catalogs 统一管理版本（pnpm 9+）
{
  "pnpm": {
    "catalogs": {
      "default": {
        "vue": "^3.4.0",
        "vite": "^5.0.0"
      }
    }
  }
}
```

```jsonc
// 各子包直接引用 catalog
{
  "devDependencies": {
    "vite": "catalog:",
    "vue": "catalog:"
  }
}
```

### 2.6 caidiaweb 当前痛点 → Monorepo 改造示例

假设 caidiaweb 目前有「主系统」+「数据大屏」+「公共组件」三块：

```bash
# 改造后目录
caidiaweb-monorepo/
├── apps/
│   ├── main/        # 主系统（172.39.8.61:301）
│   └── screen/      # 数据大屏
├── packages/
│   ├── components/  # 共享 Vue 组件（地图选点、图表卡片）
│   └── shared/      # 工具函数（坐标转换、请求封装）
```

```jsonc
// apps/main/package.json
{
  "dependencies": {
    "@caidiaweb/components": "workspace:*",
    "@caidiaweb/shared": "workspace:*"
  }
}
```

---

## 三、Turborepo

### 3.1 解决什么问题

pnpm workspace 解决的是**依赖共享**，但「谁来编排任务、谁来做缓存」需要 Turborepo：

- **任务编排**：`dev` / `build` / `test` 的包间依赖顺序
- **增量构建**：只重建受影响的包
- **远程缓存**：团队成员/CI 之间共享构建产物

### 3.2 turbo.json 配置

```jsonc
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["tsconfig.json"],   // 这些文件变化会失效所有缓存
  "globalEnv": ["NODE_ENV"],                 // 这些环境变量影响任务
  "tasks": {
    "build": {
      "dependsOn": ["^build"],               // 先构建依赖的包（^ 表示上游依赖）
      "outputs": ["dist/**", ".vite/**"]      // 缓存这些产物
    },
    "dev": {
      "cache": false,                         // 开发服务不缓存
      "persistent": true                      // 常驻进程
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []                           // 无产物，仅结果缓存
    }
  }
}
```

### 3.3 任务依赖图（dependsOn）

```
执行 `turbo run build` 时：

  packages/shared  (build)
        │
  packages/components (build)  ← 依赖 shared
        │
  apps/main (build)            ← 依赖 components
  apps/screen (build)          ← 依赖 components

▲ 带 ^ 的 dependsOn 表示「先构建我依赖的上游包」
```

### 3.4 本地缓存

```bash
# 首次构建（真实执行）
turbo run build
# > Tasks:    4 successful
# > Time:     38.2s
# > Cache:    0% hit

# 第二次什么都不改再构建（直接命中缓存）
turbo run build
# > Tasks:    4 successful
# > Time:     0.8s   ← 秒回
# > Cache:    100% hit
```

缓存位置：默认 `node_modules/.cache/turbo`，可提交到 Git 或上传远程。

### 3.5 远程缓存（团队/CI 共享）

```bash
# 1. 登录 Turborepo 账号（或用企业自建 Remote Cache 服务）
npx turbo login
npx turbo link

# 2. CI 中设置环境变量
TURBO_API="https://turbo.example.com"
TURBO_TOKEN="xxxx"
TURBO_TEAM="caidiaweb"
```

效果：同事 A 构建过 `components`，同事 B / CI 直接下载缓存，**跳过重复构建**。

### 3.6 配合 pnpm 使用

```jsonc
// 根 package.json —— 用 pnpm 脚本包装 turbo
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

```bash
pnpm install          # pnpm 负责依赖解析与软链接
pnpm build            # turbo 负责任务编排与缓存
```

---

## 四、Nx（了解）

### 4.1 能力全景

Nx 是比 Turborepo 更重的 Monorepo 方案，除任务编排/缓存外还内置：

- **代码生成器（Generators）**：`nx g @nx/vue:app` 一键脚手架
- **依赖图可视化**：`nx graph` 浏览器查看包关系
- **受影响分析**：`nx affected` 只测试/构建受当前改动影响的包
- **分布式任务执行（DTE）**：多机器并行跑任务
- **插件生态**：官方维护 React/Vue/Node/Go 等 30+ 插件

### 4.2 Turborepo vs Nx 对比

| 维度 | Turborepo | Nx |
|------|-----------|-----|
| 配置复杂度 | 极简（一个 turbo.json） ✅ | 较重（project.json + nx.json） |
| 上手速度 | 快 ✅ | 慢 |
| 任务缓存 | 本地 + 远程 ✅ | 本地 + 远程 + 分布式 ✅ |
| 代码生成 | 需自定义 | 内置丰富 Generators ✅ |
| 依赖图 | 基础 | 强大可视化 + affected ✅ |
| 生态绑定 | 构建工具无关 | 偏 Vite/Webpack/Nx 自有 |
| 适用规模 | 中小团队首选 ✅ | 大型企业级项目 |

**结论**：caidiaweb 当前规模推荐 **pnpm + Turborepo**；若后续演进为跨语言、多框架的大型平台，再评估 Nx。

---

## 五、Monorepo 常见问题

### 5.1 依赖管理

| 问题 | 解法 |
|------|------|
| 幽灵依赖（访问未声明包） | 用 pnpm 严格 node_modules；加 `pnpm.neverBuiltDependencies` 管控原生模块 |
| 版本漂移（各包 vue 版本不一致） | 用 `pnpm catalogs` 统一声明 |
| 某包想用新版、其他包想用旧版 | pnpm 支持**多版本共存**（自动建嵌套 node_modules） |
| 循环依赖 | 用 `madge --circular` 检测，拆分 `shared` 基础层打破环 |

```bash
# 检测循环依赖
npx madge --circular --extensions ts,tsx,vue packages/
```

### 5.2 版本发布

**方案 A：统一版本（固定模式）** —— 所有包同号发版，简单但不够灵活。

**方案 B：独立版本（changesets）** —— 推荐，按改动范围只发受影响的包：

```bash
# 1. 安装
pnpm add -Dw @changesets/cli
pnpm changeset init

# 2. 开发后记录改动
pnpm changeset        # 交互式选择包 + 版本类型（major/minor/patch）

# 3. CI 中自动发版
pnpm changeset version   # 更新版本号 + 生成 changelog
pnpm changeset publish   # 发布到 npm
```

`caidiaweb` 推荐用 changesets 管理 `packages/components` 的独立发版。

### 5.3 CI 优化

```yaml
# .github/workflows/ci.yml —— 基于 turbo 的增量 CI
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0          # 需要完整历史给 turbo 算 affected
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint test build --filter=[HEAD~1]   # 只跑受影响的包
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: caidiaweb
```

**CI 优化三板斧**：
1. `--filter=[HEAD~1]` 只构建当前 PR 影响的包
2. 远程缓存命中，跳过已构建产物
3. `pnpm store` 缓存 + `turbo` 缓存双缓存层

---

## 六、caidiaweb 实践案例

### 6.1 目标结构

```text
caidiaweb-monorepo/
├── apps/
│   ├── main/          # 主系统 Vue3 + Vite + Element Plus + ECharts
│   └── screen/        # 数据大屏（可视化）
├── packages/
│   ├── components/    # 共享组件（地图、图表卡片、表格）
│   ├── shared/        # 共享逻辑（请求封装、坐标转换、工具）
│   └── config-eslint/ # 共享 ESLint 配置（复用 4.3 成果）
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── .changeset/
```

### 6.2 完整配置文件

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```jsonc
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": ["NODE_ENV", "VITE_API_BASE"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": { "cache": false, "persistent": true },
    "lint": { "outputs": [] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] }
  }
}
```

```jsonc
// 根 package.json
{
  "name": "caidiaweb-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "changeset": "changeset",
    "release": "pnpm changeset publish"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0",
    "@changesets/cli": "^2.27.0"
  }
}
```

### 6.3 共享包示例

```ts
// packages/shared/src/request.ts
import axios from 'axios'

export const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '/api',
  timeout: 10000
})

// packages/shared/package.json
{
  "name": "@caidiaweb/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" }
}
```

```ts
// apps/main/src/main.ts —— 引用共享包
import { request } from '@caidiaweb/shared'
import { StationCard } from '@caidiaweb/components'
```

### 6.4 落地检查清单

- [ ] 安装 pnpm（`npm i -g pnpm`），初始化 `pnpm-workspace.yaml`
- [ ] 把公共逻辑抽到 `packages/shared`、`packages/components`
- [ ] 用 `workspace:*` 在 apps 中引用共享包
- [ ] 配置 `turbo.json`，跑通 `pnpm build` 验证缓存命中
- [ ] 接入 changesets 管理共享包发版
- [ ] CI 中用 `--filter=[HEAD~1]` + 远程缓存优化构建

---

## 七、面试考点

### Q1：Monorepo 和 Multirepo 怎么选？
**答**：看代码共享频率与团队规模。多项目强耦合、需统一规范/构建、频繁跨包重构 → Monorepo；项目独立、团队自治、发版节奏不同 → Multirepo。Monorepo 的核心收益是「改一处、全生效」和单一依赖源，代价是仓库体积与权限粒度粗。

### Q2：pnpm 相比 npm/yarn 解决了什么？
**答**：① 严格 node_modules（消除幽灵依赖）；② 内容寻址全局存储（去重、省磁盘）；③ 软硬链接安装快。它用 `.pnpm` 隐藏目录存放真实包，再通过符号链接把「显式声明的依赖」暴露到包的 node_modules，未声明的访问不到。

### Q3：workspace:* 协议是什么？发布时如何处理？
**答**：`workspace:*` 是 pnpm 的本地包引用协议，开发期直接软链接本地包而非下载。发布到 npm 时，pnpm 会自动把 `workspace:*` 改写为该包的**实际版本号**，保证外部用户能正常安装。

### Q4：Turborepo 的 dependsOn 中 `^build` 的 `^` 什么意思？
**答**：`^` 表示「上游依赖」。`build` 任务的 `dependsOn: ["^build"]` 意为：构建当前包前，先递归构建它**所依赖的所有包**（如 main 依赖 components，components 依赖 shared，则顺序 shared→components→main）。不带 `^` 的 `build` 表示「同一包内的其他任务依赖」。

### Q5：Turborepo 的缓存是如何工作的？远程缓存解决什么问题？
**答**：turbo 根据「任务输入（源文件哈希 + 依赖 + env）+ 配置」计算缓存 key，命中则直接复用 `outputs` 产物，跳过执行。本地缓存加速个人重复构建；**远程缓存**让团队成员和 CI 共享产物——A 构建过，B/CI 直接下载，避免全公司重复构建，是 Monorepo CI 提速的关键。

### Q6：Turborepo 和 Nx 怎么选？
**答**：中小团队、追求轻量上手中首选 Turborepo（配置极简、构建工具无关）；大型跨语言项目、需要代码生成器、依赖图可视化、分布式任务执行时选 Nx。caidiaweb 当前规模推荐前者。

### Q7：Monorepo 下如何做版本发布？
**答**：统一版本（所有包同号，简单但僵化）或独立版本（changesets，按 PR 改动范围只发受影响包，推荐）。changesets 流程：开发后 `pnpm changeset` 记录改动类型 → CI 中 `version` 改号生成 changelog → `publish` 发 npm。

---

> 📌 **学习建议**：先本地用 pnpm 搭一个最小 Monorepo（apps/web + packages/utils），跑通 `workspace:*` 引用和 `turbo run build` 缓存，再回看本章各节原理，理解会深刻很多。
