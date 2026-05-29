# 阶段4 — AI 与前端集成开发

> 预计时间：第 9-14 个月
> 目标水平：L2-L3
> 每日投入：融入日常工作
> 前置依赖：完成阶段1-3

---

## 学习目标

掌握 AI 功能的前端实现技术，能开发 AI 增强的前端产品，为公司项目添加 AI 能力。

---

## 学习内容

### 4.1 流式输出实现（SSE）

**Server-Sent Events 原理**：
- 单向实时推送（服务器 → 客户端）
- 基于 HTTP 协议，自动重连
- Content-Type: text/event-stream

**前端实现**：
```js
// Fetch API + ReadableStream
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ message: '你好' })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  // 解析 SSE 数据
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') return;
      // 追加内容到界面
      appendContent(JSON.parse(data).content);
    }
  }
}
```

**EventSource（简单场景）**：
```js
const source = new EventSource('/api/stream');
source.onmessage = (event) => {
  console.log(event.data);
};
```

**打字机效果实现**：
- 逐字追加内容
- 自动滚动到底部
- 光标闪烁效果

### 4.2 Markdown 渲染

**markdown-it 渲染**：
```js
import MarkdownIt from 'markdown-it';
const md = new MarkdownIt({ html: true, linkify: true });
const html = md.render('# Hello World');
```

**代码高亮**：
- **highlight.js**：轻量、语言支持多
- **Shiki**：VS Code 同款主题、精确语法高亮
- 代码块样式、行号、复制按钮、语言标签

**KaTeX 数学公式渲染**：
```js
import katex from 'katex';
// 行内公式 $E=mc^2$
// 块级公式 $$\sum_{i=1}^n x_i$$
```

### 4.3 AI 对话组件设计

**聊天界面 UI 组件**：
- 消息列表（区分用户消息和 AI 消息）
- 输入框（多行输入、快捷发送 Ctrl+Enter）
- 消息气泡样式
- 头像/角色标识
- 时间戳

**消息列表虚拟滚动**：
- 大量消息时性能优化
- 自动滚动到最新消息
- 滚动到顶部加载历史消息

**多轮对话状态管理**：
```js
const messages = ref([
  { role: 'system', content: '你是一个助手' },
  { role: 'user', content: '你好' },
  { role: 'assistant', content: '你好！有什么可以帮你的？' }
]);
```

### 4.4 AI 前端 SDK 集成

**Vercel AI SDK**（推荐）：
```js
import { useChat } from 'ai/react';

function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

**OpenAI SDK 前端调用**：
```js
import OpenAI from 'openai';
const openai = new OpenAI({ dangerouslyAllowBrowser: true, apiKey: '...' });
```

**错误处理与重试**：
- 网络错误重试
- 限流（429）处理
- 超时处理
- 降级方案（AI 不可用时的提示）

### 4.5 AI 功能 UX 设计

**加载状态设计**：
- 骨架屏 / 思考动画
- 进度指示（如"正在搜索文档..."）
- 部分结果展示（流式）

**错误状态与降级**：
- 友好的错误提示
- 重试机制
- 降级方案（回退到关键词搜索）

**用户引导**：
- 首次使用引导
- Prompt 建议（预设问题）
- 历史记录管理

### 4.6 多模态输入

**图片上传与预览**：
- 拖拽上传
- 粘贴上传
- 图片预览与压缩

**语音输入**：
- Web Speech API
- 语音识别 → 文本 → AI 回复

### 4.7 AI Agent 前端展示

**工具调用结果展示**：
- 显示 AI 正在使用的工具
- 工具执行结果的可视化
- 思维链过程展示

---

## 实战产出（必须完成）

| 编号 | 产出 | 验收标准 |
|------|------|---------|
| 1 | AI 对话 Web 组件 | 流式输出 + Markdown + 代码高亮 |
| 2 | 项目 AI 功能集成 | 在公司项目中集成 1 个 AI 功能 |
| 3 | AI 代码片段助手 | 输入需求 → 生成代码 + 预览 |

---

## 推荐资源

- Vercel AI SDK (sdk.vercel.ai)
- markdown-it 官方文档
- Shiki 主题预览 (shiki.style)
- ChatGPT / Claude 界面作为参考

---

## 检验标准

- [ ] 能独立开发包含流式对话 + Markdown 渲染的 AI 前端功能
- [ ] 能集成代码高亮和数学公式渲染
- [ ] 能设计合理的 AI 功能 UX（加载/错误/引导）
- [ ] 能使用 Vercel AI SDK 快速搭建 AI 聊天界面

---

> **下一阶段**：完成本阶段后，进入「阶段5-AI 驱动工程效率」
