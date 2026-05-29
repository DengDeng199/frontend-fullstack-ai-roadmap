# 阶段3 — AI 应用搭建（Dify / RAG / LangChain）

> 预计时间：第 5-8 个月
> 目标水平：L2 熟练
> 每日投入：融入日常工作
> 前置依赖：完成阶段1-2

---

## 学习目标

能搭建基于 AI 的应用工具，服务团队和项目，将 AI 从个人工具提升为团队级基础设施。

---

## 学习内容

### 3.1 Dify 平台

**工作流编排（Workflow）**：
- 可视化拖拽搭建 AI 工作流
- 节点类型：LLM / 代码 / HTTP 请求 / 条件判断 / 变量聚合
- 工作流调试与发布

**知识库搭建**：
- 文档上传（PDF / Word / Markdown / 网页）
- 文档切分策略（按段落/按长度/按语义）
- 向量化（Embedding）— 将文本转为向量
- 检索设置（Top K / 相似度阈值）

**Agent 模式**：
- ReAct 模式（推理 + 行动循环）
- 工具调用（Function Calling）
- 自定义工具（HTTP API / 代码执行）

**API 集成**：
- Dify 提供的 RESTful API
- 在前端项目中调用 Dify 接口
- 流式输出支持

### 3.2 RAG 原理

**检索增强生成（Retrieval-Augmented Generation）**：
```
用户提问 → 向量化 → 在知识库中检索相关文档 → 组装 Prompt → LLM 生成回答
```

**核心组件**：
- **文档切分（Chunking）**：
  - 固定长度切分
  - 按段落切分
  - 语义切分（按句子边界）
  - 重叠切分（保留上下文）
- **向量化（Embedding）**：
  - 将文本转为高维向量
  - 常用模型：text-embedding-ada-002 / BGE / M3E
  - 向量相似度：余弦相似度
- **向量数据库**：
  - 检索最近邻向量
  - 常用：Milvus / Weaviate / Chroma / Pinecone
- **检索策略优化**：
  - 混合检索（向量 + 关键词）
  - 重排序（Reranking）
  - 查询改写（Query Rewrite）
  - 父子文档检索

### 3.3 n8n 自动化

**工作流搭建**：
- 可视化拖拽
- Trigger 触发器（Webhook / 定时 / 事件）
- HTTP 请求节点
- 条件判断与循环
- 变量传递

**常用场景**：
- 自动生成周报（从 Git 提交 + 任务管理 → AI 总结）
- 自动代码审查（PR 事件 → AI 审查 → 钉钉通知）
- 自动文档更新（代码变更 → AI 更新文档）

### 3.4 LangChain.js 基础

**LLM 调用封装**：
```js
import { ChatOpenAI } from 'langchain/openai';
const model = new ChatOpenAI({ model: 'gpt-4' });
const response = await model.invoke('你好');
```

**Chain 链式调用**：
```js
import { ChatPromptTemplate } from 'langchain/prompts';
import { StringOutputParser } from 'langchain/schema/output_parser';

const chain = ChatPromptTemplate.fromMessages([
  ['system', '你是一个技术助手'],
  ['user', '{input}']
]).pipe(model).pipe(new StringOutputParser());
```

**Memory 记忆管理**：
- BufferMemory — 保存完整对话历史
- ConversationSummaryMemory — 摘要记忆
- 滑动窗口记忆

**Tool 工具定义**：
```js
import { DynamicTool } from 'langchain/tools';
const tool = new DynamicTool({
  name: 'search',
  description: '搜索项目文档',
  func: async (query) => { /* ... */ }
});
```

### 3.5 大模型 API 使用

- **OpenAI API**：gpt-4 / gpt-3.5-turbo
- **国产模型**：
  - 通义千问（阿里）
  - 文心一言（百度）
  - 智谱 GLM（清华）
  - DeepSeek
- **流式输出（SSE）**：
  ```js
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: '你好' }],
    stream: true
  });
  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
  ```
- **Token 管理**：估算 Token 数量、控制成本

---

## 实战产出（必须完成）

| 编号 | 产出 | 验收标准 |
|------|------|---------|
| 1 | 项目文档知识库 | 用 Dify 搭建，支持智能问答 |
| 2 | 自动化工作流 | 用 Dify/n8n 搭建至少 1 个实用自动化 |
| 3 | AI 对话应用 | 用 LangChain.js 做一个简单 Web 应用 |
| 4 | 团队集成 | 将 AI 应用集成到公司内部工具中 |

---

## 推荐资源

- Dify 官方文档 (docs.dify.ai)
- n8n 官方文档 (docs.n8n.io)
- LangChain.js 文档 (js.langchain.com)
- LangChain 中文入门教程

---

## 检验标准

- [ ] 能用 Dify 搭建知识库问答并集成到前端
- [ ] 能用 n8n 搭建自动化工作流
- [ ] 理解 RAG 的完整流程和核心组件
- [ ] 能用 LangChain.js 实现简单的 AI 对话应用

---

> **下一阶段**：完成本阶段后，进入「阶段4-AI 与前端集成」
