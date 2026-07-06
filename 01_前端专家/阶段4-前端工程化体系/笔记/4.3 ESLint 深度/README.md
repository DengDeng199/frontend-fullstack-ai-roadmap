# 4.3 ESLint 深度

> 前端工程化 · Flat Config · 自定义规则 · Prettier 集成 · TypeScript/Vue 支持

---

## 目录

1. [Flat Config 新配置格式](#1-flat-config-新配置格式)
2. [自定义 ESLint 规则](#2-自定义-eslint-规则)
3. [与 Prettier 集成](#3-与-prettier-集成)
4. [TypeScript 支持](#4-typescript-支持)
5. [Vue 支持](#5-vue-支持)
6. [Lint 规则分层体系](#6-lint-规则分层体系)
7. [面试高频考点](#7-面试高频考点)

---

## 1. Flat Config 新配置格式

### 1.1 旧格式 vs Flat Config

```
ESLint 8 及以前（.eslintrc）：

{
  "extends": ["eslint:recommended"],
  "env": { "browser": true, "node": true },
  "parserOptions": { "ecmaVersion": 2022 },
  "rules": { "no-console": "warn" },
  "overrides": [
    { "files": ["*.ts"], "parser": "@typescript-eslint/parser" }
  ]
}


ESLint 9+ Flat Config（eslint.config.js）：

import js from '@eslint/js';
import ts from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    rules: { 'no-console': 'warn' },
  },
];
```

### 1.2 Flat Config 核心变化

| 维度 | 旧格式 (.eslintrc) | Flat Config (ESLint 9+) |
|------|-------------------|------------------------|
| 格式 | JSON / YAML / JS | 纯 JavaScript (ESM) |
| 插件声明 | 字符串 + extends | import 后直接使用 |
| 规则覆盖 | `overrides` 配置 | 数组顺序 + `files` 字段 |
| 解析器 | `parser` 字符串 | `languageOptions.parser` 对象 |
| 扩展性 | 受限于 JSON schema | 完全编程能力 |

### 1.3 Flat Config 完整示例

```javascript
// eslint.config.js — caidiaweb 项目完整配置

import js from '@eslint/js';
import ts from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import pluginPrettier from 'eslint-plugin-prettier/recommended';

export default [
  // ===== 第1层：全局忽略 =====
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.min.js',
      '*.d.ts',
    ],
  },

  // ===== 第2层：JS 基础规则 =====
  js.configs.recommended,

  // ===== 第3层：TS 规则 =====
  ...ts.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // 放宽某些 TS 规则
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      // 要求类型导入使用 import type
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  // ===== 第4层：Vue 规则 =====
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser, // Vue SFC 中 <script> 使用 TS parser
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/attribute-hyphenation': ['error', 'always'],
    },
  },

  // ===== 第5层：项目自定义规则 =====
  {
    rules: {
      // 错误级别
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',

      // 风格
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'always-multiline'],

      // 最佳实践
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
  },

  // ===== 第6层：Prettier（必须最后，确保不冲突） =====
  pluginPrettier,
  {
    rules: {
      'prettier/prettier': ['error', {
        singleQuote: true,
        semi: true,
        trailingComma: 'all',
        printWidth: 100,
        tabWidth: 2,
      }],
    },
  },

  // ===== 第7层：测试文件特殊规则 =====
  {
    files: ['**/*.test.*', '**/*.spec.*'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
```

### 1.4 从 .eslintrc 迁移

```bash
# ESLint 官方的自动迁移工具
npx @eslint/migrate-config .eslintrc.cjs

# 输出 eslint.config.js 并保留旧文件为 .eslintrc.cjs.bak
```

```javascript
// 迁移对照速查

// 旧: env: { browser: true, es2022: true }
// 新:
import globals from 'globals';
{ languageOptions: { globals: globals.browser } }

// 旧: parser: '@typescript-eslint/parser'
// 新:
{ languageOptions: { parser: ts.parser } }

// 旧: plugins: ['vue'], extends: ['plugin:vue/recommended']
// 新:
import pluginVue from 'eslint-plugin-vue';
...pluginVue.configs['flat/recommended']

// 旧: overrides: [{ files: ['*.ts'], rules: {...} }]
// 新: 直接放在数组中的下一个配置对象
{ files: ['**/*.ts'], rules: {...} }
```

---

## 2. 自定义 ESLint 规则

### 2.1 AST 节点遍历基础

```
代码                          AST（抽象语法树）

const x = 1;                 VariableDeclaration
                               ├── kind: "const"
                               └── declarations: [
                                     VariableDeclarator
                                       ├── id: Identifier (name: "x")
                                       └── init: Literal (value: 1)
                                   ]

import { ref } from 'vue';   ImportDeclaration
                               ├── specifiers: [
                               │     ImportSpecifier
                               │       └── imported: Identifier (name: "ref")
                               │   ]
                               └── source: Literal (value: "vue")
```

### 2.2 编写第一个自定义规则

```javascript
// eslint-rules/no-timestamp-console.js
// 规则：禁止使用 console.log 打印时间戳（如 console.log(Date.now())）

export default {
  meta: {
    type: 'suggestion',           // problem | suggestion | layout
    docs: {
      description: '禁止在 console 中打印时间戳',
      recommended: false,
    },
    fixable: 'code',              // 是否支持自动修复
    schema: [],                   // 配置项 JSON Schema
    messages: {
      noTimestamp: '不要在 console.log 中打印时间戳，请使用专门的日志工具',
    },
  },

  create(context) {
    return {
      // 监听所有 CallExpression 节点
      CallExpression(node) {
        // 检查是否是 console.log 调用
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.name === 'console' &&
          node.callee.property.name === 'log'
        ) {
          // 检查参数中是否有 Date.now() 或 new Date()
          const hasTimestamp = node.arguments.some(arg => {
            if (arg.type === 'CallExpression' &&
                arg.callee.type === 'MemberExpression' &&
                arg.callee.object.name === 'Date' &&
                arg.callee.property.name === 'now') {
              return true;
            }
            if (arg.type === 'NewExpression' &&
                arg.callee.name === 'Date') {
              return true;
            }
            return false;
          });

          if (hasTimestamp) {
            context.report({
              node,
              messageId: 'noTimestamp',
            });
          }
        }
      },
    };
  },
};
```

### 2.3 实战：禁止特定导入规则

```javascript
// eslint-rules/no-restricted-api.js
// 规则：禁止直接从特定包导入，强制使用项目封装的工具函数

const RESTRICTED_IMPORTS = {
  'axios': { message: '请使用 @/utils/request 封装的请求工具' },
  'lodash': { message: '请使用 lodash-es 的按需导入' },
  'dayjs': { message: '请使用 @/utils/formatDate 封装的时间工具' },
};

export default {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止直接导入特定库',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          restricted: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                allowDefaultImport: { type: 'boolean' },
              },
            },
          },
        },
      },
    ],
    messages: {
      restricted: '{{message}}',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const restricted = options.restricted || RESTRICTED_IMPORTS;

    return {
      ImportDeclaration(node) {
        const importSource = node.source.value;

        // 检查是否匹配被限制的包
        for (const [pkg, config] of Object.entries(restricted)) {
          if (importSource === pkg || importSource.startsWith(pkg + '/')) {
            context.report({
              node,
              messageId: 'restricted',
              data: {
                message: config.message || `禁止直接导入 ${pkg}`,
              },
            });
          }
        }
      },
    };
  },
};
```

### 2.4 实战：组件命名规范规则

```javascript
// eslint-rules/component-name-rule.js
// 规则：Vue 组件文件名必须以大写字母开头（PascalCase），目录以 kebab-case 命名

import path from 'path';

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Vue 组件文件必须使用 PascalCase 命名',
      recommended: true,
    },
    schema: [],
    messages: {
      invalidName: 'Vue 组件文件名必须使用 PascalCase（如 MyComponent.vue）',
    },
  },

  create(context) {
    return {
      Program(node) {
        const filename = context.filename || context.getFilename();

        // 只检查 .vue 文件
        if (!filename.endsWith('.vue')) return;

        // 排除特殊文件（如 index.vue, app.vue）
        const base = path.basename(filename, '.vue');
        const excludeFiles = ['index', 'app', 'App'];
        if (excludeFiles.includes(base)) return;

        // 检查是否 PascalCase
        const pascalCaseRegex = /^[A-Z][a-zA-Z0-9]*$/;
        if (!pascalCaseRegex.test(base)) {
          context.report({
            node,
            loc: { line: 1, column: 0 },
            messageId: 'invalidName',
          });
        }
      },
    };
  },
};
```

### 2.5 在项目中使用自定义规则

```javascript
// eslint.config.js
import noTimestampConsole from './eslint-rules/no-timestamp-console.js';
import noRestrictedApi from './eslint-rules/no-restricted-api.js';
import componentNameRule from './eslint-rules/component-name-rule.js';

export default [
  {
    plugins: {
      'caidiaweb': {
        rules: {
          'no-timestamp-console': noTimestampConsole,
          'no-restricted-api': noRestrictedApi,
          'component-name': componentNameRule,
        },
      },
    },
    rules: {
      'caidiaweb/no-timestamp-console': 'error',
      'caidiaweb/no-restricted-api': ['error', {
        restricted: {
          'axios': { message: '请使用 @/utils/request' },
        },
      }],
      'caidiaweb/component-name': 'warn',
    },
  },
];
```

---

## 3. 与 Prettier 集成

### 3.1 集成策略

```
目标：ESLint 管代码质量，Prettier 管格式

冲突问题：
  ESLint 的格式规则（如 quotes, semi）和 Prettier 冲突
  → 解决办法：关掉 ESLint 的格式规则，让 Prettier 统一管理

集成步骤：
  1. 安装 eslint-config-prettier → 关闭所有与 Prettier 冲突的 ESLint 规则
  2. 安装 eslint-plugin-prettier → 将 Prettier 作为 ESLint 的一条规则运行
```

### 3.2 安装与配置

```bash
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
```

```javascript
// eslint.config.js
import pluginPrettier from 'eslint-plugin-prettier/recommended';

export default [
  // ... 其他配置

  // eslint-plugin-prettier/recommended 内部做了两件事：
  // 1. 注册 prettier 插件
  // 2. 添加 eslint-config-prettier 的所有规则覆盖（关闭冲突规则）
  // 3. 添加 prettier/prettier 规则为 error
  pluginPrettier,

  {
    rules: {
      'prettier/prettier': ['error', {
        singleQuote: true,
        semi: true,
        trailingComma: 'all',
        printWidth: 100,
        tabWidth: 2,
        arrowParens: 'always',
        endOfLine: 'lf',
      }],
    },
  },
];
```

```json
// .prettierrc — 与项目其他工具共享（VS Code、CI 等）
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### 3.3 package.json 脚本配置

```json
{
  "scripts": {
    "lint": "eslint . --fix --cache",
    "lint:check": "eslint . --cache",
    "format": "prettier --write \"src/**/*.{js,ts,vue,css,scss}\"",
    "format:check": "prettier --check \"src/**/*.{js,ts,vue,css,scss}\""
  },
  "lint-staged": {
    "*.{js,ts,vue}": ["eslint --fix", "prettier --write"],
    "*.{css,scss,json,md}": ["prettier --write"]
  }
}
```

---

## 4. TypeScript 支持

### 4.1 安装与基础配置

```bash
npm install -D typescript typescript-eslint
```

```javascript
// eslint.config.js
import ts from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**'],
  },
  // 使用 typescript-eslint 的推荐配置
  ...ts.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // 需要 tsconfig.json 来进行类型感知的检查
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ===== 覆盖默认规则 =====

      // any 降级为 warning
      '@typescript-eslint/no-explicit-any': 'warn',

      // 未使用变量：允许 _ 前缀的变量
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // 强制类型导入使用 import type
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports',
      }],

      // 强制使用可选链
      '@typescript-eslint/prefer-optional-chain': 'error',

      // 强制使用空值合并
      '@typescript-eslint/prefer-nullish-coalescing': 'error',

      // 禁止空 interface
      '@typescript-eslint/no-empty-interface': 'error',

      // 数组类型使用 T[] 而非 Array<T>
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],

      // 禁止使用 namespace
      '@typescript-eslint/no-namespace': 'error',

      // 要求函数显式返回类型（公共 API）
      '@typescript-eslint/explicit-function-return-type': 'off', // 通常太繁琐
    },
  },
];
```

### 4.2 类型感知 vs 非类型感知

```javascript
// 非类型感知（只检查语法）
...ts.configs.recommended

// 类型感知（需要 tsconfig.json，更强大但更慢）
...ts.configs.recommendedTypeChecked

// 区别：
// 非类型感知 → 检查 import/export 语法、变量命名等
// 类型感知 → 额外检查类型错误、null 安全等（需要编译器信息）

// 建议：
// - lint-staged 中使用非类型感知（快速）
// - CI 中使用类型感知（全面）
```

---

## 5. Vue 支持

### 5.1 安装与配置

```bash
npm install -D eslint-plugin-vue
```

```javascript
// eslint.config.js
import pluginVue from 'eslint-plugin-vue';
import ts from 'typescript-eslint';

export default [
  // ... JS/TS 配置

  // Vue 推荐配置（包含所有 vue3-essential 规则）
  ...pluginVue.configs['flat/recommended'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        // Vue SFC 中的 <script> 和 <script setup> 使用 TS parser
        parser: ts.parser,
        // 支持 JSX
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // ===== Vue 特有规则 =====

      // 放宽：允许单单词组件名（如 index.vue）
      'vue/multi-word-component-names': 'off',

      // 模板中组件名使用 PascalCase
      'vue/component-name-in-template-casing': ['error', 'PascalCase', {
        registeredComponentsOnly: false,
      }],

      // 属性使用连字符（kebab-case）
      'vue/attribute-hyphenation': ['error', 'always'],

      // 组件属性顺序规范
      'vue/order-in-components': ['error', {
        order: [
          'el', 'name', 'key', 'parent', 'functional',
          ['delimiters', 'comments'],
          ['components', 'directives', 'filters'],
          'extends', 'mixins', 'provide', 'inject',
          'ROUTER_GUARDS',
          'layout', 'middleware',
          'validate', 'scrollToTop',
          'transition', 'loading',
          'inheritAttrs',
          'model', ['props', 'propsData'], 'emits', 'setup',
          'data', 'computed',
          'watch', 'LIFECYCLE_HOOKS',
          'methods',
          ['template', 'render'],
          'renderError',
        ],
      }],

      // 要求 v-for 必须有 key
      'vue/require-v-for-key': 'error',

      // 禁止 v-if 和 v-for 同时使用
      'vue/no-use-v-if-with-v-for': 'error',

      // 计算属性中禁止异步操作
      'vue/no-async-in-computed-properties': 'error',

      // 禁止修改 props
      'vue/no-mutating-props': 'error',

      // 模板中禁止复杂表达式
      'vue/no-template-shadow': 'error',

      // 要求 emit 声明
      'vue/require-explicit-emits': 'warn',

      // 单文件组件顶层元素顺序
      'vue/component-tags-order': ['error', {
        order: ['template', 'script', 'style'],
      }],
    },
  },
];
```

### 5.2 Vue + TypeScript + ESLint 全配置

```javascript
// eslint.config.js — caidiaweb 完整 Vue+TS 配置

import js from '@eslint/js';
import ts from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import pluginPrettier from 'eslint-plugin-prettier/recommended';

export default [
  { ignores: ['dist/**', 'node_modules/**', '*.d.ts'] },

  js.configs.recommended,
  ...ts.configs.recommended,

  // ===== 所有 TS 文件 =====
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
    },
  },

  // ===== Vue 文件 =====
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: ts.parser },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/attribute-hyphenation': ['error', 'always'],
    },
  },

  // ===== 全局规则 =====
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'eqeqeq': 'error',
    },
  },

  pluginPrettier,
  {
    rules: {
      'prettier/prettier': ['error', {
        singleQuote: true,
        semi: true,
        trailingComma: 'all',
        printWidth: 100,
      }],
    },
  },
];
```

---

## 6. Lint 规则分层体系

### 6.1 四层架构

```
┌──────────────────────────────────────────────────────────────┐
│              ESLint 规则分层体系                              │
├──────────┬────────────────────┬──────────────────────────────┤
│   层级    │       规则数        │           定位               │
├──────────┼────────────────────┼──────────────────────────────┤
│ Base     │ ~10 条             │ 必须遵守，零容忍              │
│ (基础)    │ no-debugger        │ 误报率接近 0                  │
│          │ no-eval            │ CI 阻断级                    │
│          │ eqeqeq 等           │                              │
├──────────┼────────────────────┼──────────────────────────────┤
│ Recom-   │ ~50 条             │ 强烈建议，极少例外             │
│ mended   │ (eslint:recommended│ 覆盖常见错误和最佳实践         │
│ (推荐)    │  + TS/Vue 推荐)    │ PR Review 检查                │
├──────────┼────────────────────┼──────────────────────────────┤
│ Strict   │ ~30 条             │ 团队统一规范                   │
│ (严格)    │ (自定义规则)        │ 如禁止 lodash、命名规范        │
│          │                    │ CI 阻断级                    │
├──────────┼────────────────────┼──────────────────────────────┤
│ Custom   │ 几条               │ 特定场景专用                  │
│ (自定义)   │ (业务规则)         │ 如禁止 console 打印时间戳     │
│          │                    │ 建议级，不阻断 CI              │
└──────────┴────────────────────┴──────────────────────────────┘
```

### 6.2 分层配置实现

```javascript
// eslint.config.js — 按层级组织

import baseConfig from './eslint-configs/base.js';
import recommendedConfig from './eslint-configs/recommended.js';
import strictConfig from './eslint-configs/strict.js';
import customConfig from './eslint-configs/custom.js';

export default [
  // 忽略文件
  { ignores: ['dist/**', 'node_modules/**'] },

  // Layer 1: Base — 绝对不能违反
  ...baseConfig,

  // Layer 2: Recommended — 强烈建议
  ...recommendedConfig,

  // Layer 3: Strict — 团队规范
  ...strictConfig,

  // Layer 4: Custom — 业务定制
  ...customConfig,
];
```

```javascript
// eslint-configs/base.js — 基础层
export default [
  {
    rules: {
      // ===== 致命错误（永远不能关闭） =====
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-iterator': 'error',

      // ===== 可靠的正确性检查 =====
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-unsafe-negation': 'error',
      'no-compare-neg-zero': 'error',

      // ===== 变量声明 =====
      'no-undef': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-redeclare': 'error',
      'no-shadow': 'error',
    },
  },
];
```

```javascript
// eslint-configs/strict.js — 严格层（团队规范）
export default [
  {
    rules: {
      // ===== 导入规范 =====
      'import/no-default-export': 'off',
      'import/order': ['error', {
        groups: [
          'builtin',      // Node 内置
          'external',     // npm 包
          'internal',     // 别名导入 (@/)
          'parent',       // 父级目录
          'sibling',      // 同级目录
          'index',        // 当前目录 index
        ],
        'newlines-between': 'ignore',
        alphabetize: { order: 'asc' },
      }],

      // ===== 命名规范 =====
      'camelcase': ['error', { properties: 'never' }],

      // ===== 最佳实践强制 =====
      'no-param-reassign': 'error',
      'prefer-destructuring': ['warn', {
        array: false,
        object: true,
      }],
      'no-multi-assign': 'error',
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    },
  },
];
```

### 6.3 针对目录的分层配置

```javascript
// eslint.config.js
export default [
  // ... 基础配置

  // src/utils 目录：要求纯函数，禁止副作用
  {
    files: ['src/utils/**/*.ts'],
    rules: {
      'no-console': 'error',    // 工具函数不能直接打印
      'no-alert': 'error',
    },
  },

  // src/views 目录：放宽 console 限制
  {
    files: ['src/views/**/*.vue'],
    rules: {
      'no-console': 'off',      // 页面可以 console（开发调试用）
    },
  },

  // src/api 目录：强制错误处理
  {
    files: ['src/api/**/*.ts'],
    rules: {
      'no-throw-literal': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
    },
  },

  // 测试文件：放宽所有限制
  {
    files: ['**/*.test.*', '**/*.spec.*'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
];
```

---

## 7. 面试高频考点

### Q1：Flat Config 相比 .eslintrc 有什么优势？

| 优势 | 说明 |
|------|------|
| **JS 原生** | 使用 JS/TS 编写，支持条件判断、动态计算、import 模块 |
| **精确共享** | 通过 npm 包共享，不再依赖 `extends` 字符串解析 |
| **性能更好** | 直接引用对象，不需要 `require()` 动态解析 |
| **Glob 支持** | 原生 glob 匹配，不再需要 `overrides` 的 `files` 数组 |
| **类型安全** | 如果使用 TS 编写，可以获得完整类型提示 |

### Q2：如何调试自定义 ESLint 规则？

```javascript
// 方法1：在线 AST 工具
// https://astexplorer.net/ → 选择 espree parser → 粘贴代码 → 查看 AST 结构

// 方法2：本地单文件测试
// test/no-timestamp-console.test.js
import { RuleTester } from 'eslint';
import rule from '../eslint-rules/no-timestamp-console.js';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2022 } });

ruleTester.run('no-timestamp-console', rule, {
  valid: [
    'console.log("hello");',
    'console.warn(Date.now());',
    'logger.info(Date.now());',
  ],
  invalid: [
    {
      code: 'console.log(Date.now());',
      errors: [{ messageId: 'noTimestamp' }],
    },
  ],
});

// 方法3：--- npx eslint --rulesdir 直接测试
// npx eslint --rulesdir ./eslint-rules src/test-file.js
```

### Q3：ESLint 和 Prettier 的分工是什么？

- **ESLint**：代码质量（潜在 Bug、最佳实践、类型安全）
- **Prettier**：代码格式（缩进、引号、分号、换行）

集成要点：
1. `eslint-config-prettier` 关闭 ESLint 中与 Prettier 冲突的格式规则
2. `eslint-plugin-prettier` 将 Prettier 作为 ESLint 规则运行（运行 `eslint --fix` 同时格式化）
3. VS Code 可以配置 `editor.formatOnSave` 和 `editor.codeActionsOnSave`

### Q4：type-aware lint 和 non-type-aware 的区别？

- **Non-type-aware**：只做语法层面的检查（如 `no-unused-vars`），速度快
- **Type-aware**：需要 `tsconfig.json`，利用 TypeScript 编译器信息做深层检查（如检测 null 不安全操作），需要额外的编译步骤

建议：
- Git hooks（lint-staged）→ non-type-aware（快）
- CI 流程 → type-aware（全面）

### Q5：如何在团队中推广 ESLint 规则？如果有大量存量错误怎么办？

```
渐进式推广策略：

1. 初始阶段：全部设为 warn（不阻断）
2. 修复阶段：分批次将规则升级为 error
3. 存量豁免：对无法立即修复的文件使用 // eslint-disable-next-line
4. 增量管控：新代码必须通过所有规则

// eslint.config.js
export default [
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // 阶段1: warn
      // '@typescript-eslint/no-explicit-any': 'error', // 阶段2: error
    },
  },
  // 阶段3: 对老代码单独放宽
  {
    files: ['src/legacy/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
```

---

> **动手建议**：在 caidiaweb 项目中跑 `npx eslint src/ --format=json > lint-report.json`，看看现有的 lint 错误数量和分布。然后在 https://astexplorer.net 粘贴一段项目的真实代码，观察 AST 结构，尝试写一个检测特定模式的自定义规则（如禁止在 setup 中使用 async/await 而不加错误处理）。
