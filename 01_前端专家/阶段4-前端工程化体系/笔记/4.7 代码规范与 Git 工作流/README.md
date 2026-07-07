# 4.7 代码规范与 Git 工作流

> 阶段 4 · 前端工程化体系
> 学习目标：用 Husky + lint-staged + commitlint 在提交阶段拦截不规范代码，掌握 Conventional Commits 提交规范，理解 Git Flow 与 GitHub Flow 的分支策略差异，建立可落地的 Code Review 规范。

---

## 目录

| 章节 | 内容 |
|------|------|
| [一、为什么需要提交门禁](#一为什么需要提交门禁) | 问题背景、防御层模型 |
| [二、Husky](#二husky) | Git hooks 管理、v9 新配置方式 |
| [三、lint-staged](#三lint-staged) | 只对暂存文件 lint、配置示例 |
| [四、commitlint + Conventional Commits](#四commitlint--conventional-commits) | 提交信息规范、type 速查表 |
| [五、Git Flow vs GitHub Flow](#五git-flow-vs-github-flow) | 两种分支策略对比、选型 |
| [六、Code Review 规范](#六code-review-规范) | PR 模板、Review Checklist |
| [七、caidiaweb 实践案例](#七caidiaweb-实践案例) | 完整 husky + lint-staged + commitlint 接入 |
| [八、面试考点](#八面试考点) | 高频面试题与标准回答 |

---

## 一、为什么需要提交门禁

### 1.1 问题背景

没有门禁时，团队常遇到：
- 有人提交带了 `console.log`、未格式化的代码 → 仓库风格混乱
- ESLint 报错只在 CI 才暴露 → 反馈太晚，已合入主干
- 提交信息写成 `update`、`fix bug` → 半年后看 git log 一头雾水，无法自动生成 changelog

### 1.2 防御层模型（越早拦截越便宜）

```
开发者写代码
   │
   ├─[编辑器] Prettier 保存即格式化        ← 实时，最便宜
   │
   ├─[git commit] Husky + lint-staged      ← 提交前，本地拦截 ⭐ 本章重点
   │       └─ commitlint 校验提交信息
   │
   ├─[git push] 远程 pre-push hook（可选跑 test）
   │
   └─[CI] lint + type-check + test          ← 最后兜底，团队可见
```

**核心思想**：把可自动化的检查尽量左移到**本地提交阶段**，既保护仓库质量，又不浪费 CI 资源。

---

## 二、Husky

### 2.1 是什么

Husky 是 **Git hooks 管理工具**。Git 本身支持 `pre-commit`、`commit-msg`、`pre-push` 等钩子，但原生钩子脚本存在 `.git/hooks/` 不会被提交、难以团队共享。Husky 把钩子配置进仓库，每人 `install` 后自动生效。

### 2.2 Husky v9 配置（2024+ 推荐）

```bash
# 1. 安装
pnpm add -D husky

# 2. 初始化（生成 .husky/ 目录 + 准备脚本）
pnpm husky init
```

```jsonc
// package.json —— 用 prepare 脚本自动安装钩子
{
  "scripts": {
    "prepare": "husky"        // npm/pnpm install 后自动启用 husky
  }
}
```

```bash
# 3. 添加 pre-commit 钩子（提交前跑 lint-staged）
echo "pnpm lint-staged" > .husky/pre-commit

# 4. 添加 commit-msg 钩子（提交信息校验）
echo "pnpm commitlint --edit \$1" > .husky/commit-msg
```

> 📌 Husky v9 改用 `echo` 直接写脚本（不再需要老版的 `.husky.sh` 包装），`$1` 是 commit-msg 时 Git 传入的临时消息文件路径。

### 2.3 钩子类型速查

| 钩子 | 触发时机 | 典型用途 |
|------|---------|---------|
| `pre-commit` | `git commit` 前 | 跑 lint-staged（lint + format） |
| `commit-msg` | 输入提交信息后 | 跑 commitlint 校验格式 |
| `pre-push` | `git push` 前 | 跑 test / type-check（可选，较重） |
| `pre-rebase` | rebase 前 | 保护进行中的工作 |

---

## 三、lint-staged

### 3.1 为什么不用全量 lint

全量 `eslint .` 在提交时跑，大项目要几十秒甚至分钟级，且会检查**未修改的文件**（骚扰他人遗留问题）。`lint-staged` 只对你 `git add` 暂存区里的文件执行，快且聚焦。

### 3.2 配置示例

```jsonc
// package.json 或 .lintstagedrc.json
{
  "lint-staged": {
    "*.{js,ts,vue}": [
      "eslint --fix",          // 自动修复可修复项
      "prettier --write"       // 格式化
    ],
    "*.{json,md,yml}": [
      "prettier --write"
    ]
  }
}
```

```bash
# 安装
pnpm add -D lint-staged
```

执行流程：`git commit` → husky 触发 `pre-commit` → `lint-staged` 取暂存文件 → 对每个匹配文件跑 eslint --fix + prettier --write → **自动把修复结果重新加入暂存区** → 提交完成。

### 3.3 与 ESLint Flat Config 配合

```jsonc
// .lintstagedrc.json（显式指定配置，避免和 Flat Config 冲突）
{
  "*.{js,ts,vue}": [
    "eslint --fix --config eslint.config.js",
    "prettier --write"
  ]
}
```

> ⚠️ 若 eslint 找不到配置，在 lint-staged 里显式 `--config eslint.config.js`（对应 4.3 章的 Flat Config）。

---

## 四、commitlint + Conventional Commits

### 4.1 Conventional Commits 规范

提交信息格式：

```
<type>(<scope>): <subject>

<body>          （可选，说明为什么）
<footer>        （可选，如 BREAKING CHANGE / 关联 issue）
```

示例：
```
feat(map): 新增地图框选站点功能

fix(api): 修复 token 过期未刷新导致 401

refactor(utils): 抽取坐标转换公共函数

chore(deps): 升级 vite 到 5.4
```

### 4.2 type 速查表

| type | 含义 | 触发版本 |
|------|------|---------|
| `feat` | 新功能 | MINOR |
| `fix` | 修复 bug | PATCH |
| `docs` | 仅文档 | — |
| `style` | 格式（不影响逻辑，如空格/分号） | — |
| `refactor` | 重构（非新功能非修 bug） | — |
| `perf` | 性能优化 | — |
| `test` | 增删测试 | — |
| `build` | 构建/依赖变动 | — |
| `ci` | CI 配置变动 | — |
| `chore` | 其他杂务 | — |
| `revert` | 回滚提交 | — |

### 4.3 commitlint 配置

```bash
pnpm add -D @commitlint/cli @commitlint/config-conventional
```

```js
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 自定义：scope 必填（团队要求标注模块）
    'scope-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert']
    ]
  }
}
```

校验失败示例：
```
⧗   input: 修改了bug
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]
```

---

## 五、Git Flow vs GitHub Flow

### 5.1 Git Flow（经典重流程）

```
main ────●──────────────●──────────  (生产稳定版，永远可发布)
          \            /
develop ───●────●────●────●─────────  (集成分支)
            \  / \  /
feature/A   ●    ●
feature/B        ●
hotfix ─────────────●──────────────  (紧急修复，从 main 拉)
```

**分支角色**：
- `main`：生产代码，每次合并即一个 release 标签
- `develop`：日常集成
- `feature/*`：功能开发，从 develop 拉，合回 develop
- `release/*`：发布准备（测试/修 bug），合回 main + develop
- `hotfix/*`：生产紧急修复，从 main 拉，合回 main + develop

**适用**：版本节奏明确、需要长期维护多版本（如客户端软件、有 LTS 版本）。

### 5.2 GitHub Flow（轻量主流）

```
main ──●────●────●────●────●──  (永远可部署)
        \  / \  / \  /
feature  ●    ●    ●            (从 main 拉，PR 合回 main)
```

**规则**：
- `main` 永远可部署
- 任何功能从 main 拉短生命周期分支
- 通过 PR + Review 合回 main
- 合并即部署（或手动触发）

**适用**：Web 应用、SaaS、持续部署团队（**caidiaweb 推荐此模式**）。

### 5.3 对比与选型

| 维度 | Git Flow | GitHub Flow |
|------|---------|------------|
| 分支数量 | 多（5 类） | 少（main + feature） |
| 复杂度 | 高，易出错 | 低，易上手 |
| 发布节奏 | 固定版本 | 持续部署 |
| 多版本维护 | 强 ✅ | 弱 |
| 适合场景 | 客户端/有 LTS | Web/SaaS |

**结论**：caidiaweb 是内部 Web 系统 → **GitHub Flow**；若后续出独立客户端 SDK 需多版本 → 该包改用 Git Flow。

---

## 六、Code Review 规范

### 6.1 PR 模板

```markdown
<!-- .github/pull_request_template.md -->
## 变更说明
<!-- 这个 PR 做了什么，为什么 -->

## 变更类型
- [ ] feat（新功能）
- [ ] fix（缺陷修复）
- [ ] refactor（重构）
- [ ] docs / style / test / chore

## 自测清单
- [ ] 本地 `pnpm lint` 通过
- [ ] 本地 `pnpm test` 通过
- [ ] 已在浏览器验证主要功能
- [ ] 无新增 console / 无硬编码密钥

## 影响范围
<!-- 涉及哪些模块/页面 -->
```

### 6.2 Review Checklist（ reviewer 用）

| 维度 | 检查项 |
|------|--------|
| **功能** | 是否实现需求？边界条件是否处理？ |
| **性能** | 有无明显性能问题（大循环/重复渲染/未防抖）？ |
| **安全** | 有无 XSS/注入风险？密钥是否外泄？ |
| **规范** | 命名清晰？提交信息符合 Conventional Commits？ |
| **测试** | 关键逻辑有无测试覆盖？ |
| **可读性** | 复杂逻辑有无注释？函数是否过长？ |

**Review 礼仪**：对事不对人；用「建议」而非「命令」；先赞后批；不阻塞式挑刺。

---

## 七、caidiaweb 实践案例

### 7.1 一键接入脚本

```bash
# 在 caidiaweb 前端仓库根目录执行
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional

# 初始化 husky
pnpm husky init

# 写入钩子（Husky v9 语法）
echo "pnpm lint-staged" > .husky/pre-commit
echo "pnpm commitlint --edit \$1" > .husky/commit-msg
```

### 7.2 配套配置文件

```jsonc
// package.json （追加）
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{js,ts,vue}": [
      "eslint --fix --config eslint.config.js",
      "prettier --write"
    ],
    "*.{json,md,yml,css,scss}": ["prettier --write"]
  }
}
```

```js
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'build', 'ci', 'chore', 'revert'
    ]]
  }
}
```

### 7.3 效果演示

```bash
# ❌ 不规范提交被拦截
$ git commit -m "修改地图bug"
⧗   input: 修改地图bug
✖   type may not be empty [type-empty]

# ✅ 规范提交通过，且自动修复了格式
$ git commit -m "fix(map): 修复框选后坐标偏移问题"
✔ 已自动 prettier 格式化 2 个文件
[main a1b2c3d] fix(map): 修复框选后坐标偏移问题
```

### 7.4 落地检查清单

- [ ] 安装 husky / lint-staged / commitlint 三个依赖
- [ ] `pnpm husky init` + `prepare` 脚本
- [ ] 写入 `.husky/pre-commit` 和 `.husky/commit-msg`
- [ ] 配置 `lint-staged`（与 4.3 的 eslint.config.js 对齐）
- [ ] 配置 `commitlint.config.js`（extends conventional）
- [ ] 添加 `pull_request_template.md`
- [ ] 团队宣贯 Conventional Commits 规范
- [ ] 在 GitHub 仓库设置「main 分支保护 + 要求 PR Review」

---

## 八、面试考点

### Q1：Husky 解决了什么问题？
**答**：原生 Git hooks 脚本存在 `.git/hooks/` 目录、不被 Git 跟踪，无法团队共享。Husky 把钩子配置进仓库（`.husky/`），通过 `prepare` 脚本在 `install` 时自动启用，保证每人提交都触发相同的 lint / commitlint 检查。

### Q2：lint-staged 和直接跑 eslint 有什么区别？
**答**：`eslint .` 全量检查所有文件，慢且会报他人遗留问题，体验差；`lint-staged` 只对你**暂存区（git add）的文件**执行，快且聚焦本次改动，并自动把 `--fix` 结果重新加入暂存区。它是 pre-commit 钩子的标准搭档。

### Q3：Conventional Commits 的 type 有哪些？各自对应什么版本？
**答**：`feat`(MINOR) / `fix`(PATCH) / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`。只有 `feat` 升 MINOR、`fix` 升 PATCH，其余（docs/style/test/chore 等）不触发版本号变化，但 `BREAKING CHANGE` 脚注会强制 MAJOR。

### Q4：Git Flow 和 GitHub Flow 怎么选？
**答**：Git Flow 分支多（main/develop/feature/release/hotfix），适合需要维护多版本、发布节奏固定的项目（如客户端）；GitHub Flow 只有 main + feature 短分支，合并即部署，适合 Web/SaaS 持续交付。caidiaweb 是内部 Web 系统，推荐 GitHub Flow。

### Q5：commitlint 校验失败会怎样？如何绕过（不推荐）？
**答**：校验失败则 `git commit` 被 hooks 中断，提交不成功，必须修改信息重提。绕过方式（强烈不推荐）是 `git commit --no-verify`，但会破坏规范、导致 changeset 无法正确生成 changelog，团队应禁用此习惯。

### Q6：Code Review 应该关注什么？
**答**：功能正确性、性能隐患（大循环/重复渲染）、安全（XSS/密钥泄露）、代码规范（命名/提交格式）、测试覆盖、可读性。用 PR 模板引导说明、用 Checklist 保证不漏项，对事不对人。

### Q7：为什么把 lint 放在 pre-commit 而不是只放 CI？
**答**：pre-commit 在本地提交阶段拦截，反馈即时（秒级）、不污染仓库、不浪费 CI 资源；CI 是团队可见的最后兜底。两层结合，既保证质量又保证效率。只在 CI 检查会导致问题已合入主干、修复成本高。

---

> 📌 **学习建议**：在本机 clone 一个小项目，按第七章一步步把 husky + lint-staged + commitlint 接上，故意用 `git commit -m "test"` 试一次被拦截，再用规范信息提交一次看自动格式化效果，体会最直观。
