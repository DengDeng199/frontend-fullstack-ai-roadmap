# 1.6 包管理

> 阶段 1 — Node.js 核心基础 / 第 6 章（阶段1收官）
> 核心目标：掌握 npm / pnpm / yarn 的差异与常用命令，精通 package.json 关键字段，理解语义化版本与依赖锁定，能独立初始化和发布一个 Node 项目。

---

## 目录

1. [为什么需要包管理](#1-为什么需要包管理)
2. [npm / pnpm / yarn 对比](#2-npm--pnpm--yarn-对比)
3. [package.json 字段详解](#3-packagejson-字段详解)
4. [依赖版本管理](#4-依赖版本管理)
5. [锁文件](#5-锁文件)
6. [caidiaweb / BFF 实践](#6-caidiaweb--bff-实践)
7. [面试考点](#7-面试考点)

---

## 1. 为什么需要包管理

> 没有包管理：手动下载库、手动处理依赖、版本冲突、无法复用。包管理解决：**安装、依赖解析、版本控制、脚本运行、发布共享**。

```
你的项目
  │ 依赖 express / lodash / dayjs
  ▼
包管理器（npm/pnpm/yarn）
  ├─ 从 registry 下载包
  ├─ 解析依赖树（A 依赖 B 的特定版本）
  ├─ 写锁文件（固定版本，保证团队一致）
  └─ 提供 scripts 命令（dev/build/test）
```

---

## 2. npm / pnpm / yarn 对比

### 2.1 三足鼎立

| 工具 | 特点 | 缺点 |
|------|------|------|
| **npm** | Node 自带、生态最通用 | 早期慢、有「幽灵依赖」问题 |
| **yarn** | 早期解决 npm 慢，引入 lock + workspaces | 与 npm 功能趋同 |
| **pnpm** | **快、省磁盘、无幽灵依赖**（硬链接 + 全局 store） | 个别老包兼容需配置 |

### 2.2 常用命令对照

| 操作 | npm | pnpm | yarn |
|------|-----|------|------|
| 安装全部 | `npm i` | `pnpm i` | `yarn` |
| 安装单包 | `npm i lodash` | `pnpm add lodash` | `yarn add lodash` |
| 开发依赖 | `npm i -D vite` | `pnpm add -D vite` | `yarn add -D vite` |
| 全局安装 | `npm i -g` | `pnpm add -g` | `yarn global add` |
| 删除 | `npm un lodash` | `pnpm remove lodash` | `yarn remove lodash` |
| 运行脚本 | `npm run dev` | `pnpm dev` | `yarn dev` |
| 仅装生产 | `npm ci --omit=dev` | `pnpm i --prod` | `yarn --prod` |

### 2.3 为什么推荐 pnpm

```
npm/yarn（传统）：
  node_modules/
    lodash/         ← 你没声明，但它依赖里带了，你却能直接 import（幽灵依赖！）
    express/
      node_modules/lodash/  ← 重复拷贝，磁盘爆炸

pnpm（硬链接 + 全局 store）：
  node_modules/.pnpm/        ← 所有包的真实文件（全局 store 硬链接）
  node_modules/lodash → 只暴露你声明的（无幽灵依赖）
```

| 优势 | 说明 |
|------|------|
| 无幽灵依赖 | 只能 import 你 `package.json` 里声明的包 |
| 省磁盘 | 全局 store + 硬链接，多项目不重复下载 |
| 快 | 并行 + 缓存命中率高 |
| 严格 | 依赖结构更接近真实声明 |

> **caidiaweb 启示**：阶段 4（4.5 Monorepo）已深入 pnpm workspace。BFF 项目统一用 **pnpm** 是当前最佳实践。

---

## 3. package.json 字段详解

```json
{
  "name": "caidiaweb-bff",          // 包名（发布用，npm 上需唯一）
  "version": "1.0.0",               // 语义化版本
  "type": "module",                 // ESM（见 1.2）；缺省为 commonjs
  "main": "dist/index.js",          // CJS 入口
  "module": "dist/index.mjs",       // ESM 入口
  "types": "dist/index.d.ts",       // TS 类型入口
  "exports": {                      // 现代入口（区分环境/条件导出）
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "bin": { "caidia": "./bin/cli.js" }, // 可执行命令
  "scripts": {
    "dev": "nest start --watch",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/main.js",
    "test": "vitest"
  },
  "dependencies": {                 // 生产依赖（运行时需要）
    "express": "^4.19.2"
  },
  "devDependencies": {              // 开发依赖（仅开发/构建时需要）
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  },
  "peerDependencies": {            // 宿主需提供的（插件/库用）
    "react": ">=18.0.0"
  },
  "engines": { "node": ">=18.0.0" },// 要求 Node 版本
  "browserslist": ["> 1%", "last 2 versions"] // 目标浏览器（构建工具用）
}
```

### 3.1 关键字段说明

| 字段 | 作用 | 何时用 |
|------|------|--------|
| `main` | CJS 入口 | 老式包/被 require |
| `module` | ESM 入口 | 打包工具优先用（可 tree-shake） |
| `exports` | 条件导出 | 同时支持 import/require 的现代做法（**推荐**） |
| `bin` | 注册 CLI 命令 | 写命令行工具 |
| `peerDependencies` | 宿主提供 | 开发插件/组件库（如 vite 插件需要宿主有 vite） |
| `engines` | 约束运行时 | 防止在低版本 Node 跑崩 |

---

## 4. 依赖版本管理

### 4.1 语义化版本 semver

```
^1.2.3
│ │ │ └ 补丁号 PATCH：修复 bug（1.2.3 → 1.2.4）
│ │ └── 次版本 MINOR：新增功能（向后兼容）（1.2.3 → 1.3.0）
│ └──── 主版本 MAJOR：破坏性变更（1.2.3 → 2.0.0）
```

### 4.2 版本范围符号

| 符号 | 含义 | 示例 `^1.2.3` 允许 |
|------|------|------------------|
| `^1.2.3` | 兼容 1.x.x（最左非零不变） | `1.2.3` ~ `1.9.9`（不含 2.0） |
| `~1.2.3` | 兼容 1.2.x | `1.2.3` ~ `1.2.9`（不含 1.3） |
| `1.2.3` | 精确版本 | 仅 `1.2.3` |
| `*` | 任意版本 | 全部 |
| `1.2.x` | 通配 | `1.2.*` |

> **`^` 的坑**：主版本 0 时（`^0.2.3`）`^` 只锁到次版本（因为 0.x 视为不稳定，0.2.3→0.2.9 不含 0.3），这点常踩雷。

### 4.3 升级策略

```bash
pnpm up            # 按 package.json 范围升级到最新合规版
pnpm up -L         # 升级到最新的主版本（跨 major，谨慎）
pnpm outdated      # 查看哪些包可升级
```

---

## 5. 锁文件

> 锁文件**固定依赖树每一层的精确版本**，保证「我本地能跑，团队/线上也能跑」。

| 工具 | 锁文件 | 特点 |
|------|--------|------|
| npm | `package-lock.json` | 记录完整依赖树 |
| pnpm | `pnpm-lock.yaml` | 更快解析、更强确定性 |
| yarn | `yarn.lock` | 经典 lock |

```bash
# CI 里用 ci 而非 install：严格按锁文件装，不更新锁，失败即报错
pnpm install --frozen-lockfile   # 等价于 npm ci
```

> **铁律**：锁文件**必须提交到 git**。`.gitignore` 里绝不该忽略它。没有锁文件，团队的依赖版本会「漂移」，出现「我这能跑你那报错」。

---

## 6. caidiaweb / BFF 实践

### 6.1 BFF 项目 package.json 示例

```json
{
  "name": "@caidiaweb/bff",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start:prod": "node dist/main.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "express": "^4.19.2",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  },
  "engines": { "node": ">=18.0.0" }
}
```

### 6.2 依赖安装规范（团队约定）

```bash
# 1. 用 pnpm（统一，避免幽灵依赖）
pnpm install

# 2. 加生产依赖
pnpm add axios

# 3. 加开发依赖（构建/测试用）
pnpm add -D vitest

# 4. CI 严格安装（不更新锁）
pnpm install --frozen-lockfile

# 5. 锁文件 + package.json 一起提交 git
git add pnpm-lock.yaml package.json
```

### 6.3 检查清单

- [ ] 项目统一用 **pnpm**（无幽灵依赖、省磁盘）
- [ ] `package.json` 的 `type` 与模块写法一致（ESM 配 `"type": "module"`）
- [ ] 生产/开发依赖分开（运行时不需要的放 devDependencies）
- [ ] 用 `^` 锁定兼容范围，关键包可锁精确版本
- [ ] 锁文件提交 git，CI 用 `--frozen-lockfile`
- [ ] `engines` 约束 Node 版本，防低版本踩坑
- [ ] 发布库用 `exports` 字段区分 ESM/CJS 入口

---

## 7. 面试考点

### Q1：npm / pnpm / yarn 有什么区别？为什么推荐 pnpm？
npm 是 Node 自带、通用但有幽灵依赖；yarn 早期解决慢、引入 lock；pnpm 用**硬链接+全局 store**，优势是**无幽灵依赖、省磁盘、快、依赖结构严格**。推荐 pnpm 是当前最佳实践。

### Q2：什么是幽灵依赖？
项目没在 `package.json` 声明、却因某依赖的子依赖而能直接 `import` 的包。npm/yarn 传统结构会出现，导致「依赖别人私货」、升级断裂。pnpm 通过严格结构杜绝幽灵依赖。

### Q3：^1.2.3 和 ~1.2.3 区别？
`^1.2.3` 允许 `1.x.x`（最左非零不变，1.2.3~1.9.9 不含 2.0）；`~1.2.3` 仅允许 `1.2.x`（1.2.3~1.2.9 不含 1.3）。`^` 更宽松。

### Q4：package.json 的 main/module/exports 区别？
`main` 是 CJS 入口；`module` 是 ESM 入口（打包工具优先用，可 tree-shake）；`exports` 是现代条件导出，可同时声明 import/require 不同入口，还能限制子路径访问。`exports` 优先级最高。

### Q5：dependencies 和 devDependencies 区别？
dependencies 是运行时必须的（express/axios）；devDependencies 仅开发/构建/测试时需要（typescript/vitest）。生产部署用 `pnpm i --prod` 只装 dependencies。

### Q6：锁文件有什么用？该不该提交 git？
锁文件固定依赖树每层精确版本，保证团队/CI/生产环境装到**完全一致**的依赖，避免「我这能跑你那报错」。**必须提交 git**，CI 用 `--frozen-lockfile` 严格按锁安装。

### Q7：peerDependencies 是什么？
声明「宿主环境必须提供的依赖」，不自动安装。用于开发插件/组件库（如 vite 插件声明 `peerDependencies: { vite: ">=4" }`），避免重复打包宿主的包。

### Q8：engines 字段干嘛的？
声明项目要求的 Node/npm 版本范围（如 `engines: { node: ">=18" }`）。低于要求时 npm 会警告（未开启 engine-strict 不报错），是防止低版本运行出错的保护。

---

> **本章小结**：包管理是 Node 工程化的落地工具——npm/pnpm/yarn 中 **pnpm 因无幽灵依赖+省磁盘最佳实践**；package.json 关键字段（type/exports/bin/scripts/dependencies/engines）要写对；版本用 `^`（兼容范围）或精确锁；锁文件必须交 git、CI 用 frozen 安装。掌握本章，你已具备从零初始化并规范维护一个 Node/BFF 项目的能力。
>
> 🎉 **阶段 1 Node.js 核心基础 6 章全部完成（1.1~1.6）**：架构概览 → 模块系统 → 核心模块 → Event Loop → 错误处理 → 包管理，形成了完整的 Node 运行时基础认知，为下一阶段 Nest.js 框架实战打好了地基。
