# 4.6 CI/CD

> 阶段 4 · 前端工程化体系
> 学习目标：掌握 GitHub Actions 的 Workflow 语法与常用 Action，理解 Jenkins Pipeline 多阶段构建，能独立设计一条「lint → type-check → test → build → deploy」的标准前端 CI 流水线，并接入缓存优化与失败通知。

---

## 目录

| 章节 | 内容 |
|------|------|
| [一、CI/CD 概念基础](#一cicd-概念基础) | 什么是 CI/CD、流水线价值、关键指标 |
| [二、GitHub Actions](#二github-actions) | Workflow 语法、常用 Action、Matrix 策略、Secrets 管理 |
| [三、Jenkins](#三jenkins) | Pipeline 脚本、多阶段构建、与 Actions 对比 |
| [四、CI 流水线设计](#四ci-流水线设计) | 标准五段流、并行优化、缓存策略、失败通知 |
| [五、caidiaweb 实践案例](#五caidiaweb-实践案例) | 完整 GitHub Actions 工作流 + 钉钉通知 |
| [六、面试考点](#六面试考点) | 高频面试题与标准回答 |

---

## 一、CI/CD 概念基础

### 1.1 什么是 CI/CD

| 术语 | 全称 | 含义 |
|------|------|------|
| **CI** | Continuous Integration 持续集成 | 开发者频繁（每天多次）把代码合并到主干，每次合并自动触发**构建+测试**，尽早发现集成错误 |
| **CD** | Continuous Delivery 持续交付 | 在 CI 基础上，保证代码**随时可发布**到生产（手动点一下部署） |
| **CD** | Continuous Deployment 持续部署 | 在 Delivery 基础上，**自动**部署到生产，无需人工干预 |

```text
开发者 push ──▶ [CI] 拉代码→装依赖→lint→test→build ──▶ [CD] 部署到环境
                          │                                        │
                     发现错误立刻红 ✕                          成功则上线 ✅
```

### 1.2 为什么需要流水线

| 无 CI/CD（手工） | 有 CI/CD（自动） |
|-----------------|-----------------|
| 本地能跑、线上报错 ❌ | 统一环境，构建即验证 ✅ |
| 合并前才发现问题，冲突爆炸 ❌ | 每次 PR 自动测，尽早暴露 ✅ |
| 部署靠「记得步骤」+ 手敲命令 ❌ | 一键/自动部署，可回滚 ✅ |
| 没人敢动老代码 ❌ | 测试守护，重构有底气 ✅ |

### 1.3 关键指标

- **构建时长**：单条流水线建议 < 10 分钟（含缓存）
- **构建成功率**：越高越好，频繁红 = 流程有问题
- **部署频率 / 前置时长（Lead Time）**：从提交到上线的时间
- **MTTR**（平均恢复时间）：出事到修复的时长

---

## 二、GitHub Actions

### 2.1 Workflow 核心语法

```yaml
# .github/workflows/ci.yml
name: CI                      # 工作流名称（显示在 Actions 页）
on:                           # 触发条件
  push:
    branches: [main]          # 推送到 main 触发
  pull_request:
    branches: [main]          # 提 PR 到 main 触发

jobs:                         # 作业集合（默认并行）
  build:
    runs-on: ubuntu-latest    # 运行环境（虚拟机）
    steps:                    # 步骤（顺序执行）
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Build
        run: pnpm build
```

**三要素口诀**：`on` 决定「何时跑」，`jobs` 决定「在哪跑、跑什么」，`steps` 决定「具体怎么做」。

### 2.2 常用 Action

| Action | 作用 | 关键参数 |
|--------|------|---------|
| `actions/checkout@v4` | 拉取仓库代码 | `fetch-depth: 0`（给 turbo 算 affected 需要完整历史） |
| `actions/setup-node@v4` | 安装 Node | `node-version`、`cache: pnpm` |
| `actions/cache@v4` | 自定义缓存目录 | `path` + `key`（如 `node_modules`、构建产物） |
| `actions/upload-artifact@v4` | 上传产物 | `path` + `name`（供后续 job/下载） |
| `actions/download-artifact@v4` | 下载产物 | `name` |

```yaml
# 缓存 pnpm store（官方 setup-node 已支持 cache: pnpm）
- uses: pnpm/action-setup@v4
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm            # 自动缓存 ~/.pnpm-store
```

### 2.3 Matrix 策略（多版本并行测试）

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20, 22]        # 三个 Node 版本并行
        os: [ubuntu-latest, windows-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
```

效果：6 个组合（3 Node × 2 OS）**同时跑**，单 job 失败不影响其他，快速验证兼容性。

### 2.4 Secrets 管理

```yaml
# 在仓库 Settings → Secrets → Actions 中配置
# 使用时通过 ${{ secrets.XXX }} 引用，不会出现在日志中

steps:
  - name: Deploy
    run: ./deploy.sh
    env:
      DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
      SERVER_HOST: ${{ secrets.SERVER_HOST }}
```

**安全原则**：
- 密钥永远不写进代码/日志（`set -x` 打印前先 `unset`）
- 用 `permissions:` 最小授权（如只读 `contents: read`）
- 定期轮换 Secrets

---

## 三、Jenkins

### 3.1 Pipeline 脚本（Declarative）

```groovy
// Jenkinsfile（仓库根目录）
pipeline {
    agent any
    environment {
        NODE_VERSION = '20'
    }
    stages {
        stage('Install') {
            steps {
                sh 'pnpm install --frozen-lockfile'
            }
        }
        stage('Lint & Test') {
            parallel {                  // 并行执行
                stage('Lint') { steps { sh 'pnpm lint' } }
                stage('Test') { steps { sh 'pnpm test' } }
            }
        }
        stage('Build') {
            steps { sh 'pnpm build' }
        }
        stage('Deploy') {
            when { branch 'main' }      // 仅 main 分支部署
            steps { sh './deploy.sh' }
        }
    }
    post {
        failure {
            // 失败通知（见 4.4 节）
            sh 'curl -X POST ${DINGTALK_WEBHOOK} ...'
        }
    }
}
```

### 3.2 多阶段构建

`stages` 把流水线拆成清晰阶段，每个阶段失败立即中断（除非 `parallel` 或 `allowFailure`）。配合 `when` 条件控制阶段是否执行（如只有 tag 才发布）。

### 3.3 GitHub Actions vs Jenkins 对比

| 维度 | GitHub Actions | Jenkins |
|------|---------------|--------|
| 部署方式 | SaaS，无需运维 ✅ | 自托管，需维护服务器 |
| 配置位置 | 仓库内 `.github/workflows` ✅ | 仓库内 `Jenkinsfile` 或 UI 配置 |
| 学习成本 | 低，YAML 直观 ✅ | 较高，Groovy + 插件体系 |
| 扩展性 | Marketplace Action 丰富 ✅ | 插件生态极庞大 |
| 企业内网 | 需 GitHub 可达 | 完全内网可用 ✅（公司常用） |
| 并行/矩阵 | 原生 Matrix ✅ | `parallel` 阶段 |

**结论**：caidiaweb 若代码在 GitHub/GitLab 云 → 优先 Actions；若在**公司内网 GitLab** → 通常用 Jenkins（正如你的 HRM 系统在内网），二者语法理念相通。

---

## 四、CI 流水线设计

### 4.1 标准五段流

```
┌─────────┐   ┌──────────┐   ┌────────┐   ┌───────┐   ┌────────┐
│  lint   │──▶│ type-check│──▶│  test  │──▶│ build │──▶│ deploy │
└─────────┘   └──────────┘   └────────┘   └───────┘   └────────┘
   风格         类型安全        功能正确      产物可发     上线
```

**为什么这个顺序**：越靠前的检查越便宜、越能早失败。lint 秒级、type-check 秒级、test 分钟级、build 分钟级、deploy 不可逆——把便宜的放前面，省下昂贵步骤的执行。

### 4.2 并行优化

```yaml
jobs:
  lint: { runs-on: ubuntu-latest, steps: [...] }   # 三个 job 默认并行
  type-check: { runs-on: ubuntu-latest, steps: [...] }
  test: { runs-on: ubuntu-latest, steps: [...] }
  build:
    needs: [lint, type-check, test]   # build 等前三个都通过
    runs-on: ubuntu-latest
    steps: [...]
  deploy:
    needs: [build]                     # deploy 等 build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps: [...]
```

### 4.3 缓存策略（提速关键）

| 缓存对象 | 方式 | 效果 |
|---------|------|------|
| pnpm/npm store | `cache: pnpm` 或 `actions/cache` | 跳过重复下载，**省 60-80% 安装时间** |
| 构建产物 | `upload/download-artifact` | 跨 job 传递 dist，避免重建 |
| Turbo 缓存 | `TURBO_TOKEN` 远程缓存 | 团队/CI 共享构建结果 |
| 依赖锁文件 | `--frozen-lockfile` | 保证环境一致，防意外升级 |

```yaml
# 三重缓存示例
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm
- run: pnpm install --frozen-lockfile
- run: pnpm turbo run build --filter=[HEAD~1]   # 只构建受影响包
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
```

### 4.4 失败通知（邮件 / 钉钉 / 企业微信）

```yaml
# 钉钉通知（机器人 Webhook）
- name: Notify DingTalk
  if: failure()                    # 仅失败时
  run: |
    curl -X POST "${{ secrets.DINGTALK_WEBHOOK }}" \
      -H 'Content-Type: application/json' \
      -d '{
        "msgtype": "markdown",
        "markdown": {
          "title": "CI 失败",
          "text": "## ❌ caidiaweb CI 失败\n> 分支: ${{ github.ref }}\n> 提交: ${{ github.sha }}\n> [查看](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})"
        }
      }'
```

> 企业微信用「群机器人 Webhook」同理，只是 JSON 格式为 `{"msgtype":"markdown","markdown":{"content":"..."}}`。

---

## 五、caidiaweb 实践案例

### 5.1 完整工作流（GitHub Actions）

```yaml
# .github/workflows/ci.yml
name: caidiaweb CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  quality:                          # 质量门禁（并行）
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Lint
        run: pnpm lint
      - name: Type Check
        run: pnpm run type-check
      - name: Test
        run: pnpm test -- --run

  build:
    needs: [quality]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Build
        run: pnpm build
        env:
          VITE_API_BASE: ${{ secrets.VITE_API_BASE }}
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    needs: [build]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      - name: Deploy to server
        run: |
          # 用 scp/rsync 推到 172.39.8.61
          rsync -az --delete dist/ ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}:/var/www/caidiaweb/
      - name: Notify
        if: always()
        run: |
          STATUS="${{ job.status == 'success' && '✅ 成功' || '❌ 失败' }}"
          curl -X POST "${{ secrets.DINGTALK_WEBHOOK }}" \
            -H 'Content-Type: application/json' \
            -d "{\"msgtype\":\"markdown\",\"markdown\":{\"title\":\"部署通知\",\"text\":\"## caidiaweb 部署 ${STATUS}\n> 提交: ${{ github.sha }}\"}}"
```

### 5.2 配套 package.json 脚本

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "type-check": "vue-tsc --noEmit",
    "test": "vitest"
  }
}
```

### 5.3 落地检查清单

- [ ] 在仓库 `.github/workflows/` 放置 `ci.yml`
- [ ] 配置 Secrets：`VITE_API_BASE`、`DEPLOY_HOST`、`DEPLOY_USER`、`DINGTALK_WEBHOOK`
- [ ] 本地先跑 `pnpm lint && pnpm type-check && pnpm test && pnpm build` 全绿再推
- [ ] 提 PR 验证流水线自动跑
- [ ] 合并 main 验证自动部署 + 钉钉通知
- [ ] 若公司用内网 GitLab，改用 Jenkinsfile（语法对应转换）

---

## 六、面试考点

### Q1：CI 和 CD 的区别？
**答**：CI（持续集成）= 频繁合并代码 + 自动构建测试，目标是「尽早发现集成错误」；CD 有双层——Delivery（持续交付，代码随时可发布，手动点部署）和 Deployment（持续部署，自动上线生产）。简单说：CI 保证「能合、能跑」，CD 保证「能发、能上」。

### Q2：GitHub Actions 的 on / jobs / steps 各自作用？
**答**：`on` 定义触发条件（push/PR/定时/custom event）；`jobs` 定义一组作业，每个 job 在独立 runner 上运行，默认并行，可用 `needs` 设依赖顺序；`steps` 是 job 内的顺序执行步骤，可以是 `run`（命令）或 `uses`（引用 Action）。

### Q3：Matrix 策略有什么用？
**答**：在同一 job 定义多组变量组合（如 Node 18/20/22 × ubuntu/windows），GitHub 自动展开为多个并行实例，一次性验证多环境兼容性，且单实例失败不阻断其他，快速暴露环境相关问题。

### Q4：如何给 CI 提速？
**答**：① 缓存依赖（pnpm/npm store）；② 缓存构建产物（artifact / Turbo 远程缓存）；③ 并行 job（`needs` 只依赖必要前置）；④ `--filter=[HEAD~1]` 只构建受影响包；⑤ `frozen-lockfile` 避免意外解析；⑥ 把 lint/test/type-check 并行而非串行。

### Q5：Secrets 如何安全使用？
**答**：在仓库 Secrets 配置，YAML 中通过 `${{ secrets.X }}` 引用，运行时注入环境变量，**不会出现在日志**；配合 `permissions:` 最小授权；密钥定期轮换；日志打印前避免 echo 含密变量。

### Q6：流水线为什么是 lint → type-check → test → build → deploy 这个顺序？
**答**：按「检查成本递增、可逆性递减」排序。lint 和 type-check 秒级且 cheapest，先挡掉低级错误；test 分钟级验证功能；build 产出产物；deploy 不可逆放最后。早失败省下后续昂贵步骤，整体反馈最快。

### Q7：GitHub Actions 和 Jenkins 怎么选？
**答**：代码在云端 GitHub/GitLab 且团队不想运维 → Actions（SaaS、YAML、Marketplace 丰富）；代码在**公司内网**、需完全自主可控、已有 Jenkins 体系 → Jenkins（自托管、Groovy Pipeline、插件极多）。二者阶段化理念一致，Jenkinsfile 与 workflow 可互转。

---

> 📌 **学习建议**：先在自己仓库建一个最小 `ci.yml`（只跑 `pnpm lint && pnpm test`），推一两个 commit 看 Actions 面板变绿，再逐步加 type-check、build、deploy 和通知，理解会更深。
