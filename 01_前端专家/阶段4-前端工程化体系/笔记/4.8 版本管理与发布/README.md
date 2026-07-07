# 4.8 版本管理与发布

> 阶段 4 · 前端工程化体系（最后一章）
> 学习目标：理解 semver 语义化版本规则，掌握 changeset 自动化版本管理与 changelog 生成，了解 release-it 一键发布流程，并能把内部包发布到 npm / 私有 registry。

---

## 目录

| 章节 | 内容 |
|------|------|
| [一、semver 语义化版本](#一semver-语义化版本) | MAJOR.MINOR.PATCH 规则、预发版、范围符号 |
| [二、changeset](#二changeset) | 自动化版本管理、changelog 生成、CI 发版流 |
| [三、release-it](#三release-it) | 一键发布流程、与 changeset 对比 |
| [四、npm 发包](#四npm-发包) | 包配置、私有 registry、发布与撤回 |
| [五、caidiaweb 实践案例](#五caidiaweb-实践案例) | 用 changeset 管理 @caidiaweb/components 发版 |
| [六、面试考点](#六面试考点) | 高频面试题与标准回答 |

---

## 一、semver 语义化版本

### 1.1 版本号三段含义

```
MAJOR.MINOR.PATCH
  │      │      │
  │      │      └─ PATCH：向后兼容的缺陷修复（修 bug）
  │      └──────── MINOR：向后兼容的新功能（加 feat）
  └─────────────── MAJOR：不兼容的 API 变更（破坏性）
```

示例：`2.3.1` → 第 2 大版、第 3 次功能迭代、第 1 次补丁。

**核心契约**：相同 MAJOR 内，低版本应**向后兼容**高版本（即 `2.x` 的任何更新都不破坏 `2.0` 的用法）。

### 1.2 何时升级哪一段

| 变更类型 | 升级 | 示例 |
|---------|------|------|
| 修 bug、不改 API | PATCH (1.0.0 → 1.0.1) | 修复坐标计算精度 |
| 加新功能、兼容旧 API | MINOR (1.0.0 → 1.1.0) | 新增地图框选组件 |
| 改/删 API、不兼容 | MAJOR (1.0.0 → 2.0.0) | 删除旧的 `formatCoord` 导出 |
| 带 `BREAKING CHANGE` 脚注 | 强制 MAJOR | 任何提交含 BREAKING CHANGE |

### 1.3 预发版与构建元

```
1.0.0-alpha.1    预发版（alpha/beta/rc），不稳定
1.0.0-rc.2       发布候选，接近稳定
1.0.0+build.123  构建元数据（不参与比较）
```

比较优先级：`1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-rc.1 < 1.0.0`

### 1.4 依赖范围符号

| 符号 | 含义 | 允许升级到 | 风险 |
|------|------|-----------|------|
| `^1.2.3` | 兼容更新 | `>=1.2.3 <2.0.0` | 中（MINOR 可能带行为变化） |
| `~1.2.3` | 近似更新 | `>=1.2.3 <1.3.0` | 低（仅 PATCH） |
| `1.2.3` | 精确 | 仅 `1.2.3` | 无（但无安全更新） |
| `*` | 任意 | 最新 | 高 |
| `>=1.2.3` | 不低于 | 任意更高 | 可能跳 MAJOR |

> 💡 caidiaweb 内部共享包建议 `^`；锁文件（lockfile）保证可复现安装，缓解 `^` 的波动风险。

---

## 二、changeset

### 2.1 解决什么问题

手工维护版本号和 CHANGELOG 容易出错、易遗漏。changeset 让你**在写代码时就记录「这次改动要怎么发版」**，发版时自动：
- 根据记录算出正确的 semver
- 更新各包 `package.json` 版本
- 生成/追加 `CHANGELOG.md`
- 打 git tag
- 发布到 npm

### 2.2 工作流

```bash
# 1. 安装并初始化（Monorepo 见 4.5 章）
pnpm add -Dw @changesets/cli
pnpm changeset init        # 生成 .changeset/config.json + README

# 2. 开发完成后，记录本次变更
pnpm changeset
#   交互式：选包 → 选 bump 类型（major/minor/patch）→ 写描述
#   生成 .changeset/odd-tiger.md
```

```markdown
# .changeset/odd-tiger.md（自动生成，可手改）
---
'@caidiaweb/components': minor
---

新增地图框选站点组件 MapSelector
```

```bash
# 3. 发版前：把所有 changeset 汇总结算
pnpm changeset version
#   → 更新 package.json 版本
#   → 生成/更新 CHANGELOG.md
#   → 删除已消费的 .changeset/*.md
#   → 自动 git commit

# 4. 发布到 npm
pnpm changeset publish
```

### 2.3 配置

```jsonc
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,                       // version 后是否自动 commit
  "fixed": [],                           // 固定同步发版的包组
  "linked": [],
  "access": "public",                    // npm 包可见性（私有包用 "restricted"）
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### 2.4 CI 自动化发版（推荐）

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]
permissions:
  contents: write
  pull-requests: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      # 有 changeset 未消费 → 自动提 "Version Packages" PR
      - name: Create Release Pull Request
        uses: changesets/action@v1
        with:
          version: pnpm changeset version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      # 合并该 PR 后 → 自动 publish
      - name: Publish
        if: steps.changesets.outputs.published == 'true'
        run: pnpm changeset publish
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**流程闭环**：开发提 changeset → 合并 main → Action 自动开「Version Packages」PR → 合并该 PR → Action 自动 `publish` + 打 tag。

---

## 三、release-it

### 3.1 是什么

release-it 是**单包一键发布**工具：一条命令完成「版本 bump → 生成 CHANGELOG → git commit/tag/push → 发布 npm → 发 GitHub Release」。相比 changeset 偏 Monorepo 多包，release-it 偏**单包、简单直接**。

### 3.2 配置与命令

```bash
pnpm add -D release-it
```

```jsonc
// .release-it.json
{
  "git": {
    "commitMessage": "chore: release v${version}",
    "tagName": "v${version}"
  },
  "github": {
    "release": true
  },
  "npm": {
    "publish": true
  },
  "plugins": {
    "@release-it/conventional-changelog": {
      "preset": "angular"
    }
  }
}
```

```bash
release-it            # 交互式：选版本 → 确认 → 自动完成全流程
release-it minor      # 直接指定 minor 发版
release-it --ci       # 非交互（CI 中用）
```

### 3.3 changeset vs release-it 对比

| 维度 | changeset | release-it |
|------|-----------|-----------|
| 最佳场景 | Monorepo 多包独立发版 ✅ | 单包一键发布 ✅ |
| 版本决策 | 开发时记录 changeset | 发版时交互/指定 |
| CHANGELOG | 基于 changeset 聚合 | 基于 conventional-changelog |
| Git tag | 支持 | 支持 |
| GitHub Release | 需配 Action | 内置 |
| CI 集成 | changesets/action 成熟 ✅ | `--ci` 模式 |

**选型**：caidiaweb 用 Monorepo（4.5 章）→ **changeset**；若只有一个独立 npm 包 → release-it 更轻。

---

## 四、npm 发包

### 4.1 package.json 关键字段

```jsonc
{
  "name": "@caidiaweb/components",   // 作用域包（推荐，避免命名冲突）
  "version": "1.0.0",                 // 必须 semver
  "type": "module",                   // ESM
  "main": "./dist/index.cjs",         // CommonJS 入口
  "module": "./dist/index.js",        // ESM 入口
  "types": "./dist/index.d.ts",       // 类型声明
  "exports": {                        // 现代入口解析（优先级高于 main/module）
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./style": "./dist/style.css"
  },
  "files": ["dist"],                  // 只发布 dist，排除源码/test
  "sideEffects": false,               // 配合 Tree Shaking（见 3.3 章）
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org"
  }
}
```

### 4.2 发布到私有 registry（公司内部包）

```bash
# 方式一：.npmrc 指定（项目级）
# .npmrc
@caidiaweb:registry=https://npm.internal.company.com/

# 方式二：publishConfig 指定（见上）
pnpm publish --registry https://npm.internal.company.com/
```

```bash
# 登录私有源
npm login --registry https://npm.internal.company.com/
```

### 4.3 发布与撤回

```bash
pnpm build                  # 先构建产出 dist
pnpm publish                # 发布（changeset publish / release-it 内部也会调）

# ⚠️ 撤回（仅限发布后 72 小时内、且版本未被依赖）
npm unpublish @caidiaweb/components@1.0.0
# 现代 npm 不鼓励 unpublish，建议用 deprecate 标记废弃：
npm deprecate @caidiaweb/components@1.0.0 "请升级到 1.0.1，存在坐标精度问题"
```

### 4.4 发版前检查清单

- [ ] `version` 符合 semver
- [ ] `files` 只包含必要产物（dist），不含密钥/测试
- [ ] `exports` / `types` 指向正确
- [ ] `README` 描述清晰、有用法示例
- [ ] CHANGELOG 已更新
- [ ] 已打 git tag
- [ ] 私有包 registry 配置正确

---

## 五、caidiaweb 实践案例

### 5.1 场景

caidiaweb Monorepo（4.5 章结构）中，`packages/components`（`@caidiaweb/components`）需要独立发版供其他内部系统复用。

### 5.2 完整接入

```bash
# 根目录
pnpm add -Dw @changesets/cli
pnpm changeset init
```

```jsonc
// packages/components/package.json
{
  "name": "@caidiaweb/components",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "vite build"        // 产出库（见 vite lib 模式）
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://npm.internal.company.com"
  }
}
```

```bash
# 日常开发
git commit -m "feat(components): 新增 MapSelector 组件"   # 4.7 章规范
pnpm changeset          # 选 @caidiaweb/components → minor → 描述
git add . && git commit -m "chore: add changeset for MapSelector"
git push

# CI 自动开 Version Packages PR → 合并 → 自动 publish 到私有 registry
```

### 5.3 版本演进示例

```
0.1.0  初始发布（alpha 阶段）
0.1.1  fix：修复主题色变量未生效
0.2.0  feat：新增 MapSelector、StationCard 组件
1.0.0  feat：移除旧的 legacy 导出（BREAKING CHANGE，升 MAJOR）
1.0.1  fix：兼容 IE 兜底（如有需要）
```

---

## 六、面试考点

### Q1：semver 三段分别什么时候升级？
**答**：PATCH = 向后兼容的 bug 修复；MINOR = 向后兼容的新功能（加 API 不改旧 API）；MAJOR = 不兼容的 API 变更（改/删 API）。含 `BREAKING CHANGE` 脚注的提交强制升 MAJOR。核心契约是「同 MAJOR 内向后兼容」。

### Q2：^ 和 ~ 的区别？
**答**：`^1.2.3` 允许 `>=1.2.3 <2.0.0`（MINOR/PATCH 都可升）；`~1.2.3` 允许 `>=1.2.3 <1.3.0`（仅 PATCH 升）。`^` 更常用但波动大，靠 lockfile 保证可复现。

### Q3：changeset 的工作流是怎样的？
**答**：开发后 `pnpm changeset` 记录「哪个包、升什么版本、改了啥」→ 生成 `.changeset/*.md`；发版时 `pnpm changeset version` 汇总所有 changeset、算 semver、更新 package.json 版本、生成 CHANGELOG、删除已消费记录；`pnpm changeset publish` 发布。配合 `changesets/action` 可在 CI 自动开 Version PR 并发布。

### Q4：changeset 和 release-it 怎么选？
**答**：changeset 适合 Monorepo 多包独立发版（版本决策前置到开发时）；release-it 适合单包一键发布（发版时交互/指定版本，内置 GitHub Release）。caidiaweb 是 Monorepo → 选 changeset。

### Q5：npm 发包要注意什么？
**答**：`version` 必须 semver；用 `files` 只发 dist 不含密钥/测试；`exports`/`types` 指向正确；作用域包 `@scope/name` 需 `access: public`（公开）或配私有 registry；发版前打 git tag。撤回仅限 72h 内，建议用 `deprecate` 而非 `unpublish`。

### Q6：私有包如何发布到公司内部 registry？
**答**：两种——① 项目 `.npmrc` 写 `@scope:registry=https://私有源`；② `package.json` 的 `publishConfig.registry` 指定。发布时 `pnpm publish`，它会读取对应 registry 配置推上去，团队内 `pnpm add @scope/pkg` 即可拉取。

### Q7：为什么 CHANGELOG 重要？如何自动生成？
**答**：CHANGELOG 让用户/协作者快速了解每个版本「改了啥、是否破坏性」，是发版透明度的核心。可基于 changeset（聚合 changeset 文件）或 conventional-changelog（解析 Conventional Commits 的 git log）自动生成，避免手工维护遗漏。

---

> 📌 **学习建议**：在本地建一个最小包，跑通「`pnpm changeset` → `changeset version` → `changeset publish --dry-run`」全流程（dry-run 不真发），理解版本号与 CHANGELOG 如何自动算出。这是阶段 4 工程化体系的最后一环。

---

## 阶段 4 · 前端工程化体系 总览

| 章节 | 主题 | 关键产出 |
|------|------|---------|
| 4.1 | Vite 构建原理 | ESM 预构建、HMR、Rollup 打包 |
| 4.2 | Vite 插件开发 | 虚拟模块、代码注入、路由自动生成 |
| 4.3 | ESLint 深度 | Flat Config、自定义规则、Vue/TS 支持 |
| 4.4 | 自动化测试 | Vitest、组件测试、Cypress E2E |
| 4.5 | Monorepo 管理 | pnpm workspace、Turborepo、Nx |
| 4.6 | CI/CD | GitHub Actions、Jenkins、流水线设计 |
| 4.7 | 代码规范与 Git 工作流 | Husky、lint-staged、commitlint、Flow |
| **4.8** | **版本管理与发布** | **semver、changeset、release-it、npm 发包** |

至此阶段 4 全部 8 章笔记完成 ✅，与阶段 3（性能优化）共同构成前端专家能力模型的核心工程底座。
