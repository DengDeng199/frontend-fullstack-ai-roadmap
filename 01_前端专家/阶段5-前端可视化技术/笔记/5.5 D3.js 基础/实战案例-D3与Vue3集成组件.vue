<!--
  ============================================
  D3.js + Vue3 集成实战组件
  知识点对照 (README 第8章)：
  ① Vue 管容器，D3 管 SVG 内部
  ② onMounted 初始化 D3
  ③ watch 数据变化重渲染
  ④ onBeforeUnmount 清理 simulation
  ============================================
-->
<template>
  <div class="d3-dashboard">
    <h2>设备信号监测仪表盘</h2>

    <!-- 控制栏：切换数据、刷新 -->
    <div class="controls">
      <select v-model="selectedDataset">
        <option value="1">数据集 A — 正常工作状态</option>
        <option value="2">数据集 B — 高负载状态</option>
        <option value="3">数据集 C — 异常波动</option>
      </select>
      <button @click="randomize" class="btn-refresh">随机刷新</button>
      <span class="info">
        节点数：<strong>{{ currentData.length }}</strong>
        均值：<strong>{{ avgValue }}</strong>
      </span>
    </div>

    <div class="charts-grid">
      <!-- 图表1：柱状图（D3 接管） -->
      <div class="chart-card">
        <h3>📊 信号强度柱状图</h3>
        <svg ref="barRef" class="chart-svg"></svg>
      </div>

      <!-- 图表2：力导向拓扑图（D3 接管） -->
      <div class="chart-card">
        <h3>🔗 设备拓扑关系</h3>
        <svg ref="forceRef" class="chart-svg"></svg>
        <p class="hint">可拖拽节点查看交互效果</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as d3 from 'd3';

// ==================== 响应式数据 ====================
const selectedDataset = ref('1');
const barRef = ref(null);
const forceRef = ref(null);

// 模拟数据
const datasets = {
  1: [
    { name: '监测站A', value: 85 }, { name: '监测站B', value: 62 },
    { name: '监测站C', value: 73 }, { name: '监测站D', value: 91 },
    { name: '传感器X', value: 55 }, { name: '传感器Y', value: 68 },
  ],
  2: [
    { name: '监测站A', value: 92 }, { name: '监测站B', value: 88 },
    { name: '监测站C', value: 95 }, { name: '监测站D', value: 78 },
    { name: '传感器X', value: 81 }, { name: '传感器Y', value: 86 },
  ],
  3: [
    { name: '监测站A', value: 35 }, { name: '监测站B', value: 72 },
    { name: '监测站C', value: 28 }, { name: '监测站D', value: 63 },
    { name: '传感器X', value: 91 }, { name: '传感器Y', value: 44 },
  ],
};

const currentData = computed(() => datasets[selectedDataset.value]);
const avgValue = computed(() => {
  const d = currentData.value;
  return (d.reduce((s, i) => s + i.value, 0) / d.length).toFixed(1);
});

function randomize() {
  const key = selectedDataset.value;
  datasets[key] = datasets[key].map(d => ({
    name: d.name,
    value: Math.floor(Math.random() * 80 + 15),
  }));
}

// ==================== 柱状图渲染（D3 接管） ====================
let barSvg, barG, barXScale, barYScale;

function renderBarChart() {
  if (!barRef.value) return;

  const el = barRef.value;
  const width = el.clientWidth;
  const height = el.clientHeight;
  const margin = { top: 20, right: 20, bottom: 40, left: 45 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // 首次初始化 SVG 结构
  if (!barSvg) {
    barSvg = d3.select(barRef.value);
    barG = barSvg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    barG.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${innerH})`);
    barG.append('g').attr('class', 'y-axis');
    barG.append('g').attr('class', 'grid');
  }

  barSvg.attr('viewBox', `0 0 ${width} ${height}`);

  const data = currentData.value;

  // 比例尺
  barXScale = d3.scaleBand().domain(data.map(d => d.name)).range([0, innerW]).padding(0.3);
  barYScale = d3.scaleLinear().domain([0, d3.max(data, d => d.value) * 1.15]).range([innerH, 0]);

  // 轴
  barG.select('.x-axis').transition().duration(500)
    .call(d3.axisBottom(barXScale).tickSizeOuter(0));
  barG.select('.y-axis').transition().duration(500)
    .call(d3.axisLeft(barYScale).ticks(5));
  barG.select('.grid').transition().duration(500)
    .call(d3.axisLeft(barYScale).ticks(5).tickSize(-innerW).tickFormat(''));

  // Enter-Update-Exit
  const bars = barG.selectAll('.bar').data(data, d => d.name);

  bars.exit()
    .transition().duration(400)
    .attr('y', innerH).attr('height', 0).style('opacity', 0)
    .remove();

  const enterBars = bars.enter().append('rect').attr('class', 'bar')
    .attr('y', innerH).attr('height', 0).style('opacity', 0)
    .attr('rx', 4)
    .attr('fill', (d, i) => ['#4f9dff', '#00d4c8', '#ffb454', '#ff5d85', '#a78bfa', '#34d399'][i % 6]);

  enterBars.merge(bars)
    .transition().duration(600).delay((d, i) => i * 60)
    .attr('x', d => barXScale(d.name))
    .attr('width', barXScale.bandwidth())
    .attr('y', d => barYScale(d.value))
    .attr('height', d => innerH - barYScale(d.value))
    .style('opacity', 1);

  // 标签
  const labels = barG.selectAll('.label').data(data, d => d.name);
  labels.exit().remove();
  const enterL = labels.enter().append('text').attr('class', 'label')
    .attr('text-anchor', 'middle').attr('font-size', '11px').attr('fill', '#8ba0c0');
  enterL.merge(labels).transition().duration(600)
    .attr('x', d => barXScale(d.name) + barXScale.bandwidth() / 2)
    .attr('y', d => barYScale(d.value) - 8)
    .text(d => d.value);
}

// ==================== 力导向图渲染（D3 接管） ====================
let forceSimulation;

const forceData = {
  nodes: [
    { id: 'core', name: '核心交换', group: 'net' },
    { id: 's1', name: '服务器1', group: 'srv' },
    { id: 's2', name: '服务器2', group: 'srv' },
    { id: 'a', name: '站A', group: 'stn' },
    { id: 'b', name: '站B', group: 'stn' },
    { id: 'c', name: '站C', group: 'stn' },
    { id: 'sn1', name: '传感器1', group: 'sen' },
    { id: 'sn2', name: '传感器2', group: 'sen' },
    { id: 'sn3', name: '传感器3', group: 'sen' },
  ],
  links: [
    { source: 'core', target: 's1' },
    { source: 'core', target: 's2' },
    { source: 'core', target: 'a' },
    { source: 'core', target: 'b' },
    { source: 'core', target: 'c' },
    { source: 'a', target: 'sn1' },
    { source: 'b', target: 'sn2' },
    { source: 'c', target: 'sn3' },
  ],
};

const groupColor = { net: '#ff6b6b', srv: '#4f9dff', stn: '#00d4c8', sen: '#ffb454' };

function renderForceGraph() {
  if (!forceRef.value) return;

  // 停止旧 simulation
  if (forceSimulation) forceSimulation.stop();

  const el = forceRef.value;
  const width = el.clientWidth;
  const height = el.clientHeight;
  const svg = d3.select(el);

  svg.selectAll('*').remove();
  svg.attr('viewBox', `0 0 ${width} ${height}`);

  // 深拷贝数据避免引用污染
  const nodes = forceData.nodes.map(n => ({ ...n }));
  const links = forceData.links.map(l => ({ ...l }));

  forceSimulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(80))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide().radius(12));

  const link = svg.append('g')
    .selectAll('line').data(links).join('line')
    .attr('stroke', '#1e3050').attr('stroke-width', 1.5);

  const node = svg.append('g')
    .selectAll('g').data(nodes).join('g')
    .call(d3.drag()
      .on('start', (e, d) => {
        if (!e.active) forceSimulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => {
        if (!e.active) forceSimulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      })
    );

  node.append('circle')
    .attr('r', d => d.group === 'net' ? 10 : d.group === 'srv' ? 8 : 6)
    .attr('fill', d => groupColor[d.group])
    .attr('stroke', '#111827').attr('stroke-width', 2);

  node.append('text')
    .text(d => d.name)
    .attr('font-size', '10px').attr('fill', '#8ba0c0')
    .attr('text-anchor', 'middle').attr('dy', d => (d.group === 'net' ? 10 : d.group === 'srv' ? 8 : 6) + 12);

  node.append('title').text(d => d.name);

  forceSimulation.on('tick', () => {
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });
}

// ==================== 生命周期 ====================
onMounted(async () => {
  await nextTick();
  // Vue 提供 ref 容器，D3 在 onMounted 后接管内部渲染
  renderBarChart();
  renderForceGraph();
});

// 数据变化 → watch 驱动重渲染（而非 v-for）
watch(selectedDataset, async () => {
  await nextTick();
  renderBarChart();
});

onBeforeUnmount(() => {
  // 关键：清理力导向 simulation，防止定时器内存泄漏
  if (forceSimulation) forceSimulation.stop();
});
</script>

<style scoped>
.d3-dashboard {
  padding: 24px;
  background: #0c1222;
  min-height: 100vh;
  color: #cdd6e8;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
h2 {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #4f9dff, #00d4c8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.controls select {
  padding: 6px 12px;
  border: 1px solid #2a4a7a;
  border-radius: 6px;
  background: #111827;
  color: #cdd6e8;
  font-size: 13px;
  font-family: inherit;
}
.btn-refresh {
  padding: 6px 16px;
  border: 1px solid #2a4a7a;
  border-radius: 6px;
  background: #1a2d50;
  color: #8ba0c0;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}
.btn-refresh:hover { background: #2a4a7a; color: #fff; }
.info { font-size: 12px; color: #5a6f8a; }
.info strong { color: #00d4c8; }

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}
.chart-card {
  background: #111827;
  border: 1px solid #1e2d45;
  border-radius: 12px;
  padding: 16px;
}
.chart-card h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #8ba0c0;
}
.chart-svg {
  width: 100%;
  height: 300px;
  border-radius: 8px;
}
.hint {
  font-size: 11px;
  color: #5a6f8a;
  margin-top: 6px;
  text-align: center;
}

/* D3 轴样式（穿透 scoped 给 D3 生成的 SVG 元素） */
:deep(.x-axis line),
:deep(.y-axis line),
:deep(.x-axis path),
:deep(.y-axis path) {
  stroke: #1e2d45;
}
:deep(.x-axis text),
:deep(.y-axis text) {
  fill: #5a6f8a;
  font-size: 11px;
}
:deep(.grid line) {
  stroke: #1a2538;
  stroke-dasharray: 2 4;
}
:deep(.grid path) {
  display: none;
}
</style>
