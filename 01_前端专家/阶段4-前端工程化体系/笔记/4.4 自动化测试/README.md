# 4.4 自动化测试

> 前端工程化 · Vitest 单元测试 · Vue 组件测试 · Cypress E2E · 测试金字塔

---

## 目录

1. [Vitest 单元测试](#1-vitest-单元测试)
2. [Vue 组件测试](#2-vue-组件测试)
3. [Cypress E2E 测试](#3-cypress-e2e-测试)
4. [测试策略金字塔](#4-测试策略金字塔)
5. [综合实践：caidiaweb 核心模块测试](#5-综合实践caidiaweb-核心模块测试)
6. [面试高频考点](#6-面试高频考点)

---

## 1. Vitest 单元测试

### 1.1 环境搭建

```bash
npm install -D vitest @vitest/coverage-v8
```

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  test: {
    // 测试环境（jsdom 模拟浏览器 DOM）
    environment: 'jsdom',
    // 全局 API（无需每次 import describe/it/expect）
    globals: true,
    // 测试文件匹配
    include: ['src/**/*.{test,spec}.{js,ts}'],
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{js,ts,vue}'],
      exclude: ['src/**/*.test.*', 'src/**/*.spec.*'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### 1.2 基础断言

```javascript
// src/utils/__tests__/formatters.test.js
import { describe, it, expect } from 'vitest';
import { formatDate, formatNumber, formatStationStatus } from '../formatters';

describe('formatDate', () => {
  it('应该格式化标准日期为 yyyy-MM-dd', () => {
    const date = new Date('2026-06-15T10:30:00');
    expect(formatDate(date)).toBe('2026-06-15');
  });

  it('应该处理时间戳格式', () => {
    // 2026-06-15 00:00:00 的时间戳
    const timestamp = new Date('2026-06-15').getTime();
    expect(formatDate(timestamp)).toBe('2026-06-15');
  });

  it('应该对无效日期返回空字符串', () => {
    expect(formatDate('invalid')).toBe('');
    expect(formatDate(null)).toBe('');
  });
});

describe('formatNumber', () => {
  it('应该添加千分位分隔符', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(1000)).toBe('1,000');
  });

  it('应该保留指定小数位', () => {
    expect(formatNumber(1234.5678, 2)).toBe('1,234.57');
    expect(formatNumber(100, 0)).toBe('100');
  });
});

describe('formatStationStatus', () => {
  it.each([
    ['online', '在线'],
    ['offline', '离线'],
    ['maintenance', '维护中'],
    ['unknown', '未知'],
  ])('状态 %s 应显示为 %s', (input, expected) => {
    expect(formatStationStatus(input)).toBe(expected);
  });
});
```

### 1.3 Mock / Spy / Stub

```javascript
// src/api/__tests__/station-api.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStations, fetchStationDetail } from '../station-api';

// ===== Mock 全局 fetch =====
global.fetch = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
});

describe('fetchStations', () => {
  it('应该在请求成功时返回数据列表', async () => {
    // Mock 成功的 fetch 响应
    const mockData = [
      { id: 1, name: '深圳站', status: 'online' },
      { id: 2, name: '广州站', status: 'offline' },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchStations();
    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith('/api/stations');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('应该在请求失败时抛出错误', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(fetchStations()).rejects.toThrow('请求失败');
  });

  it('应该在网络错误时抛出错误', async () => {
    fetch.mockRejectedValueOnce(new Error('Network Error'));

    await expect(fetchStations()).rejects.toThrow('Network Error');
  });
});

// ===== Spy：监听已有函数的调用 =====
describe('fetchStationDetail', () => {
  it('应该对返回数据进行格式转换', async () => {
    // Spy 监听 console.warn
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: '深圳站' }),
    });

    await fetchStationDetail(1);

    // 验证 console.warn 是否被调用
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
```

### 1.4 测试覆盖率

```bash
# 运行覆盖率测试
npx vitest run --coverage
```

```
输出示例：

File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
src/utils/          |   85.71 |    75.00 |   80.00 |   85.71 |
  formatters.js     |   92.31 |    83.33 |  100.00 |   92.31 |
  validators.js     |   80.00 |    66.67 |   60.00 |   80.00 |
src/api/            |   90.00 |    85.00 |  100.00 |   90.00 |
  station-api.js    |   90.00 |    85.00 |  100.00 |   90.00 |
-------------------|---------|----------|---------|---------|
Total               |   87.50 |    80.00 |   90.00 |   87.50 |
```

**覆盖率指标含义**：

| 指标 | 含义 |
|------|------|
| % Stmts | 语句覆盖率：多少代码行被执行过 |
| % Branch | 分支覆盖率：if/else/switch 的分支是否都覆盖 |
| % Funcs | 函数覆盖率：多少函数被调用过 |
| % Lines | 行覆盖率：和 Stmts 类似 |

### 1.5 快照测试

```javascript
// src/utils/__tests__/config.test.js
import { describe, it, expect } from 'vitest';
import { buildChartOptions } from '../config';

describe('buildChartOptions', () => {
  it('生成的图表配置应该与快照一致', () => {
    const input = {
      title: '电磁环境监测',
      data: [10, 20, 30, 40],
      type: 'bar',
    };

    const options = buildChartOptions(input);

    // 首次运行 → 生成快照文件
    // 后续运行 → 对比快照，不一致则失败
    expect(options).toMatchSnapshot();
  });

  it('不同图表类型的配置快照应该不同', () => {
    expect(buildChartOptions({ type: 'bar', data: [1, 2] })).toMatchSnapshot('bar-chart');
    expect(buildChartOptions({ type: 'line', data: [1, 2] })).toMatchSnapshot('line-chart');
    expect(buildChartOptions({ type: 'pie', data: [1, 2] })).toMatchSnapshot('pie-chart');
  });
});
```

```bash
# 更新快照（预期结果变化时）
npx vitest run --update
# 或简写
npx vitest run -u
```

---

## 2. Vue 组件测试

### 2.1 环境搭建

```bash
npm install -D @vue/test-utils @testing-library/vue @testing-library/jest-dom jsdom
```

```javascript
// src/components/__tests__/setup.js — 全局测试配置
import { cleanup } from '@testing-library/vue';
import { afterEach } from 'vitest';

// 每次测试后自动清理 DOM
afterEach(() => {
  cleanup();
});
```

### 2.2 查询策略

```
┌──────────────────────────────────────────────────────────────┐
│              查询优先级（从高到低）                             │
├────────────┬─────────────────┬───────────────────────────────┤
│   优先级     │      方法        │             说明              │
├────────────┼─────────────────┼───────────────────────────────┤
│   最高      │ getByRole       │ 最接近用户交互方式，推荐首选     │
│            │ getByLabelText   │ 表单元素最佳选择               │
│            │ getByPlaceholder │ 输入框占位符                   │
│            │ getByText        │ 非交互元素（如 span/div）      │
│            │ getByDisplayValue│ 已填充的输入框值               │
│   最低      │ getByTestId      │ 以上都不可用时最后手段         │
└────────────┴─────────────────┴───────────────────────────────┘
```

### 2.3 Vue 组件测试实战

```vue
<!-- src/components/StationCard.vue -->
<template>
  <div class="station-card" :class="{ offline: station.status === 'offline' }">
    <h3 data-testid="station-name">{{ station.name }}</h3>
    <span role="status" :class="station.status">
      {{ statusText }}
    </span>
    <button
      aria-label="查看详情"
      :disabled="loading"
      @click="handleView"
    >
      {{ loading ? '加载中...' : '查看详情' }}
    </button>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  station: { type: Object, required: true },
});

const emit = defineEmits(['view']);
const loading = ref(false);
const error = ref('');

const statusText = computed(() => {
  const map = { online: '在线', offline: '离线', maintenance: '维护中' };
  return map[props.station.status] || '未知';
});

async function handleView() {
  loading.value = true;
  error.value = '';
  try {
    await emit('view', props.station.id);
  } catch (e) {
    error.value = '加载失败，请重试';
  } finally {
    loading.value = false;
  }
}
</script>
```

```javascript
// src/components/__tests__/StationCard.test.js
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import StationCard from '../StationCard.vue';

describe('StationCard', () => {
  const defaultProps = {
    station: { id: 1, name: '深圳监测站', status: 'online' },
  };

  // ===== 基础渲染测试 =====
  it('应该正确渲染监测站名称', () => {
    render(StationCard, { props: defaultProps });

    // getByText 查询
    expect(screen.getByText('深圳监测站')).toBeTruthy();
  });

  it('应该根据状态显示正确文字', () => {
    render(StationCard, { props: defaultProps });

    // getByRole 查询（推荐）
    expect(screen.getByRole('status')).toHaveTextContent('在线');
  });

  it('离线状态应该添加 offline 类名', () => {
    const props = {
      station: { id: 2, name: '广州站', status: 'offline' },
    };
    const { container } = render(StationCard, { props });

    expect(container.firstChild).toHaveClass('offline');
  });

  // ===== 用户交互测试 =====
  it('点击查看按钮应该触发 view 事件', async () => {
    const { emitted } = render(StationCard, { props: defaultProps });

    // getByRole('button') 查询
    const btn = screen.getByRole('button', { name: '查看详情' });
    await fireEvent.click(btn);

    expect(emitted()).toHaveProperty('view');
    expect(emitted().view[0]).toEqual([1]);
  });

  it('加载中时按钮应显示加载文字并禁用', async () => {
    // Mock 一个永不 resolve 的异步事件
    const { emitted } = render(StationCard, { props: defaultProps });

    const btn = screen.getByRole('button');
    await fireEvent.click(btn);

    // 按钮应变为加载状态
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('加载中...');
  });

  it('加载失败时应显示错误信息', async () => {
    // 模拟 emit 抛出异常
    const errorHandler = vi.fn();
    render(StationCard, {
      props: {
        ...defaultProps,
        onView: () => { throw new Error('fail'); },
      },
      global: {
        config: { errorHandler },
      },
    });

    // 触发点击
    const btn = screen.getByRole('button');
    await fireEvent.click(btn);

    // 等待错误信息出现
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('加载失败');
    });
  });
});
```

### 2.4 异步组件测试

```javascript
// src/views/__tests__/TechFacility.test.js
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/vue';
import TechFacility from '../TechFacility.vue';

// Mock API 调用
vi.mock('@/api/station-api', () => ({
  fetchStations: vi.fn().mockResolvedValue([
    { id: 1, name: '深圳站', status: 'online', value: 98.5 },
    { id: 2, name: '广州站', status: 'online', value: 95.2 },
  ]),
}));

describe('TechFacility 页面', () => {
  it('应该在数据加载完成后显示监测站列表', async () => {
    render(TechFacility);

    // 加载中 → 应该有 loading 状态
    expect(screen.getByText('加载中...')).toBeTruthy();

    // 等待数据加载完成
    await waitFor(() => {
      expect(screen.getByText('深圳站')).toBeTruthy();
    });

    // 列表应该有两项
    expect(screen.getByText('广州站')).toBeTruthy();
  });

  it('应该在 API 失败时显示错误信息', async () => {
    // 覆盖 mock 为失败
    const { fetchStations } = await import('@/api/station-api');
    fetchStations.mockRejectedValueOnce(new Error('Network Error'));

    render(TechFacility);

    await waitFor(() => {
      expect(screen.getByText(/加载失败/)).toBeTruthy();
    });
  });
});
```

---

## 3. Cypress E2E 测试

### 3.1 环境搭建

```bash
npm install -D cypress
npx cypress open
```

```javascript
// cypress.config.js
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    // 测试文件位置
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}',
    // 视口大小
    viewportWidth: 1280,
    viewportHeight: 720,
    // 设置默认超时
    defaultCommandTimeout: 10000,
    // 视频录制
    video: false,
    // 截图
    screenshotOnRunFailure: true,
  },
});
```

### 3.2 页面交互测试

```javascript
// cypress/e2e/tech-facility.cy.js
describe('技术设施页面', () => {
  beforeEach(() => {
    // 拦截 API 请求
    cy.intercept('GET', '/api/stations', {
      fixture: 'stations.json', // 使用 fixture 数据
    }).as('getStations');

    cy.intercept('GET', '/api/map/geo', {
      fixture: 'map-geo.json',
    }).as('getMapGeo');

    // 访问页面
    cy.visit('/tech-facility');
  });

  it('应该正常加载技术设施页面', () => {
    // 等待 API 完成
    cy.wait(['@getStations', '@getMapGeo']);

    // 页面标题应该出现
    cy.contains('技术设施').should('be.visible');

    // 统计卡片应该显示
    cy.get('.stat-card').should('have.length', 4);
  });

  it('点击监测站应该弹出详情面板', () => {
    cy.wait('@getStations');

    // 点击第一个监测站
    cy.get('.station-item').first().click();

    // 详情面板应该出现
    cy.get('.detail-panel').should('be.visible');
    cy.get('.detail-panel').contains('监测站详情');
  });

  it('搜索应该正确过滤列表', () => {
    cy.wait('@getStations');

    // 输入搜索关键词
    cy.get('input[placeholder*="搜索"]').type('深圳');

    // 列表应该只显示匹配项
    cy.get('.station-item').should('have.length', 1);
    cy.get('.station-item').contains('深圳');
  });

  it('切换 Tab 应该加载对应内容', () => {
    cy.wait('@getStations');

    // 点击频谱资源 Tab
    cy.contains('频谱资源').click();

    // URL 应该改变
    cy.url().should('include', '/spectrum');

    // 频谱页面元素应该出现
    cy.contains('频谱监测').should('be.visible');
  });
});
```

### 3.3 网络请求拦截

```javascript
// cypress/e2e/api-error.cy.js
describe('API 异常处理', () => {
  it('应该在 API 返回 500 时显示错误提示', () => {
    // Mock 服务器错误响应
    cy.intercept('GET', '/api/stations', {
      statusCode: 500,
      body: { message: '服务器内部错误' },
    }).as('getStationsError');

    cy.visit('/tech-facility');
    cy.wait('@getStationsError');

    // 应该显示错误提示
    cy.contains('加载失败').should('be.visible');
    // 应该有重试按钮
    cy.contains('重试').should('be.visible');
  });

  it('应该在网络超时时显示超时提示', () => {
    // Mock 网络超时
    cy.intercept('GET', '/api/stations', (req) => {
      req.reply({ delay: 15000, body: [] }); // 15s 延迟
    }).as('getStationsTimeout');

    cy.visit('/tech-facility');

    // 等待超时提示
    cy.contains('请求超时', { timeout: 20000 }).should('be.visible');
  });
});
```

### 3.4 视觉回归测试

```bash
npm install -D cypress-image-diff
```

```javascript
// cypress/e2e/visual-regression.cy.js
describe('视觉回归测试', () => {
  it('技术设施首页截图对比', () => {
    cy.intercept('GET', '/api/stations', { fixture: 'stations.json' });
    cy.intercept('GET', '/api/map/geo', { fixture: 'map-geo.json' });

    cy.visit('/tech-facility');
    cy.wait(['@getStations', '@getMapGeo']);

    // 等待渲染完成
    cy.get('.stat-cards').should('be.visible');

    // 截图对比（与基准图比较）
    cy.compareSnapshot('tech-facility-home', {
      capture: 'fullPage',
      errorThreshold: 0.02,   // 允许 2% 的像素差异
    });
  });
});
```

### 3.5 Cypress 常用命令速查

```javascript
// ===== 元素查询 =====
cy.get('.class-name')                // CSS 选择器
cy.contains('文本内容')               // 包含文本的元素
cy.get('[data-testid="id"]')         // 推荐：data-testid

// ===== 用户操作 =====
cy.get('button').click()             // 点击
cy.get('input').type('hello')        // 输入
cy.get('select').select('option1')   // 下拉选择
cy.get('input').clear()              // 清空

// ===== 断言 =====
cy.get('.result').should('be.visible')
cy.get('.count').should('have.text', '100')
cy.get('.items').should('have.length', 5)
cy.get('input').should('have.value', 'hello')
cy.url().should('include', '/dashboard')

// ===== 等待 =====
cy.wait(2000)                        // 等待 2s（不推荐）
cy.wait('@apiCall')                  // 等待拦截的请求
cy.get('.loading').should('not.exist') // 等待元素消失

// ===== 网络拦截 =====
cy.intercept('GET', '/api/**').as('api')
cy.intercept('POST', '/api/submit', { statusCode: 200 })
cy.intercept('GET', '/api/**', { fixture: 'data.json' })
```

---

## 4. 测试策略金字塔

### 4.1 金字塔模型

```
           ┌─────┐
           │ E2E │  ～10%  少量端到端测试
           │     │          覆盖核心用户流程
           └──┬──┘
        ┌─────┴─────┐
        │  组件测试   │  ～20%  组件交互测试
        │  (Testing   │         用户行为驱动
        │   Library)  │
        └─────┬─────┘
   ┌──────────┴──────────┐
   │      单元测试         │  ～70%  纯函数/逻辑测试
   │      (Vitest)        │         快、稳定、覆盖广
   └──────────────────────┘
```

### 4.2 三层测试职责

| 层级 | 测什么 | 不测什么 | 运行速度 |
|------|--------|---------|---------|
| 单元测试 | 工具函数、API 调用、状态管理 | DOM 结构、页面交互 | 毫秒级 |
| 组件测试 | 组件渲染、事件处理、交互结果 | 跨组件协作、后端真实请求 | 毫秒-秒级 |
| E2E | 核心用户流程、前后端联调 | 边界条件、每种交互状态 | 秒-分级 |

### 4.3 caidiaweb 测试分配建议

```
单元测试（70% = ~140 个用例）：
  src/utils/         → 工具函数（formatters、validators、helpers）
  src/api/           → API 调用（Mock fetch，测试请求/响应）
  src/stores/        → Pinia store（actions、getters、state 变化）

组件测试（20% = ~40 个用例）：
  src/components/StatCard     → 渲染 & 交互
  src/components/StationList  → 列表渲染 & 分页
  src/components/DetailPanel  → 条件渲染 & 事件

E2E 测试（10% = ~10 个用例）：
  登录 → 首页 → 技术设施 → 查看详情
  首页 → 切换 Tab → 频谱资源
  错误场景：API 500 → 错误提示 → 重试
```

### 4.4 测试脚本配置

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:all": "npm run test:run && npm run test:e2e"
  }
}
```

---

## 5. 综合实践：caidiaweb 核心模块测试

### 5.1 Store 状态管理测试

```javascript
// src/stores/__tests__/station-store.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useStationStore } from '../station-store';

// Mock API
vi.mock('@/api/station-api', () => ({
  fetchStations: vi.fn(),
  fetchStationDetail: vi.fn(),
}));

describe('useStationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('初始状态应该为空列表', () => {
    const store = useStationStore();
    expect(store.list).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('loadStations 应该更新列表', async () => {
    const { fetchStations } = await import('@/api/station-api');
    fetchStations.mockResolvedValue([
      { id: 1, name: '深圳站' },
      { id: 2, name: '广州站' },
    ]);

    const store = useStationStore();
    await store.loadStations();

    expect(store.list).toHaveLength(2);
    expect(store.loading).toBe(false);
  });

  it('loadStations 失败应该设置 error', async () => {
    const { fetchStations } = await import('@/api/station-api');
    fetchStations.mockRejectedValue(new Error('网络错误'));

    const store = useStationStore();
    await store.loadStations();

    expect(store.error).toBe('网络错误');
    expect(store.list).toEqual([]);
  });

  it('setFilter 应该正确过滤列表', () => {
    const store = useStationStore();
    store.list = [
      { id: 1, name: '深圳', status: 'online' },
      { id: 2, name: '广州', status: 'offline' },
      { id: 3, name: '北京', status: 'online' },
    ];

    store.setFilter({ status: 'online' });

    expect(store.filteredList).toHaveLength(2);
    expect(store.filteredList[0].name).toBe('深圳');
  });
});
```

### 5.2 组合式函数（Composable）测试

```javascript
// src/composables/__tests__/use-station-search.test.js
import { describe, it, expect, vi } from 'vitest';
import { useStationSearch } from '../use-station-search';

describe('useStationSearch', () => {
  const mockStations = [
    { id: 1, name: '深圳监测站', status: 'online' },
    { id: 2, name: '广州监测站', status: 'offline' },
    { id: 3, name: '北京指挥中心', status: 'online' },
  ];

  it('初始状态应该返回全部数据', () => {
    const { filteredStations } = useStationSearch(mockStations);
    expect(filteredStations.value).toHaveLength(3);
  });

  it('应该根据名称过滤', () => {
    const { filteredStations, search } = useStationSearch(mockStations);

    search.value = '深圳';

    expect(filteredStations.value).toHaveLength(1);
    expect(filteredStations.value[0].name).toBe('深圳监测站');
  });

  it('应该根据状态过滤', () => {
    const { filteredStations, statusFilter } = useStationSearch(mockStations);

    statusFilter.value = 'online';

    expect(filteredStations.value).toHaveLength(2);
    filteredStations.value.forEach(s => {
      expect(s.status).toBe('online');
    });
  });

  it('名称和状态组合过滤', () => {
    const { filteredStations, search, statusFilter } = useStationSearch(mockStations);

    search.value = '监测';
    statusFilter.value = 'online';

    expect(filteredStations.value).toHaveLength(1);
    expect(filteredStations.value[0].id).toBe(1);
  });

  it('无匹配时返回空数组', () => {
    const { filteredStations, search } = useStationSearch(mockStations);

    search.value = '不存在的站';

    expect(filteredStations.value).toHaveLength(0);
  });
});
```

### 5.3 CI 中运行测试

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-and-component:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test:run -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/

  e2e:
    runs-on: ubuntu-latest
    needs: unit-and-component
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots/
```

---

## 6. 面试高频考点

### Q1：测试金字塔的三层分别是什么？

| 层级 | 比例 | 工具 | 特点 |
|------|------|------|------|
| 单元测试 | 70% | Vitest/Jest | 快、稳定、覆盖纯逻辑 |
| 组件测试 | 20% | Testing Library | 测用户行为、模拟真实交互 |
| E2E | 10% | Cypress/Playwright | 覆盖核心流程、前后端联调 |

**底层多一点、上层少一点**：底层测试跑得快、问题定位精准；上层测试跑得慢、问题定位模糊但覆盖完整。

### Q2：Mock、Spy、Stub 的区别？

| 术语 | 含义 | 典型用法 |
|------|------|---------|
| Mock | 完全替换一个模块/函数 | `vi.mock('./api')` 替换整个模块 |
| Spy | 监听已有函数的调用（不改变行为） | `vi.spyOn(console, 'warn')` |
| Stub | 替换函数的返回值（常用于简化测试） | `fetch.mockResolvedValue(data)` |

### Q3：什么时候用快照测试？

- 适合：相对**稳定**的输出结果（配置文件、组件渲染结果、API 响应结构）
- 不适合：频繁变化的内容（动态时间戳、随机数、动画）
- 关键：快照需要 Code Review 确认变化是预期的

### Q4：如何测试 Vue Router 相关的组件？

```javascript
import { render } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';

// 为测试创建真实路由
const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: Home }, { path: '/detail/:id', component: Detail }],
});

render(Component, {
  global: {
    plugins: [router],
  },
});

// 然后使用 await router.push('/detail/1') 测试路由跳转
```

### Q5：单元测试覆盖率 100% 有意义吗？

- **追求 80-90%** 是合理的，覆盖核心逻辑
- 强行 100% 覆盖率会导致：
  - 大量无用测试（测试 getter/setter 等简单代码）
  - 为了覆盖而写的假测试
  - 维护成本高于收益
- 重点看 **分支覆盖率**，比行覆盖率更有意义

---

> **动手建议**：在 caidiaweb 中挑一个纯工具函数（如 `src/utils/formatters.js`），从 `describe + it.each` 开始写第一个单元测试。跑通 `npx vitest` 后，逐步为 API 模块和 Store 添加测试用例。
