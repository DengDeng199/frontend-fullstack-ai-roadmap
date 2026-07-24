# 1.3 核心模块深入学习

> 阶段 1 — Node.js 核心基础 / 第 3 章
> 核心目标：掌握 Node 内置核心模块 fs / path / http / events / stream / buffer，这是写 BFF、CLI、工具脚本的「基本功」。

---

## 目录

1. [核心模块总览](#1-核心模块总览)
2. [fs 文件系统](#2-fs-文件系统)
3. [path 路径处理](#3-path-路径处理)
4. [http 模块](#4-http-模块)
5. [events 事件模块](#5-events-事件模块)
6. [stream 流](#6-stream-流)
7. [buffer 与编码](#7-buffer-与编码)
8. [caidiaweb / BFF 实践](#8-caidiaweb--bff-实践)
9. [面试考点](#9-面试考点)

---

## 1. 核心模块总览

| 模块 | 用途 | 阶段关联 |
|------|------|---------|
| `fs` | 文件读写、监听、信息 | BFF 配置文件、日志 |
| `path` | 路径拼接/解析 | 任何文件路径操作 |
| `http` | 创建服务器、发起请求 | BFF 核心 |
| `events` | 事件发布订阅 | 框架底层机制 |
| `stream` | 流式处理大文件 | 大文件、代理 |
| `buffer` | 二进制数据 | 网络/文件底层 |

> Node 大部分 API 都有「回调版」和「Promise 版（`fs.promises`）」。**新代码一律用 Promise 版 + async/await**，可读性最好。

---

## 2. fs 文件系统

### 2.1 三种读写方式

```js
// ① 回调版（老式，不推荐新代码）
const fs = require('fs');
fs.readFile('./a.txt', 'utf8', (err, data) => {
  if (err) throw err;
  console.log(data);
});

// ② Promise 版（推荐）✅
import { readFile, writeFile } from 'node:fs/promises';
const data = await readFile('./a.txt', 'utf8');
await writeFile('./b.txt', data);

// ③ 同步版（阻塞主线程，仅在启动时配置读取用）
import { readFileSync } from 'node:fs';
const cfg = readFileSync('./config.json', 'utf8');
```

### 2.2 流式读写（大文件必备）

```js
import { createReadStream, createWriteStream } from 'node:fs';

const rs = createReadStream('big.iso');      // 默认 64KB 一块
const ws = createWriteStream('copy.iso');
rs.pipe(ws);                                  // 管道：边读边写，内存恒定

rs.on('data', (chunk) => { /* 逐块处理 */ });
rs.on('end', () => console.log('读完'));
```

### 2.3 文件监听与信息

```js
import { watch, stat, access } from 'node:fs/promises';

await watch('./dir', (event, filename) => {
  console.log(`文件变化：${event} - ${filename}`);
});

const info = await stat('./a.txt');
console.log(info.size, info.isFile(), info.mtime); // 大小/是否文件/修改时间

// 权限检查（不抛错，返回布尔）
import { access, constants } from 'node:fs/promises';
const ok = await access('./a.txt', constants.R_OK).then(() => true).catch(() => false);
```

> **watch vs watchFile**：`watch`（底层 inotify/FSEvents，高效，推荐）；`watchFile`（轮询，低效，仅兜底）。

---

## 3. path 路径处理

> 永远用 `path` 模块拼路径，**别用字符串拼接**（`+ '/'` 在 Windows 会错）。

```js
import path from 'node:path';

path.join('/a', 'b', 'c.txt');        // /a/b/c.txt  （自动处理分隔符，跨平台）
path.resolve('src', 'app.js');        // 绝对路径（基于 cwd 解析）
path.extname('a.bundle.js');          // .js
path.basename('/a/b/c.txt');          // c.txt
path.dirname('/a/b/c.txt');           // /a/b
path.parse('/a/b/c.txt');             // { root, dir, base, ext, name }
```

| 方法 | 作用 | 注意 |
|------|------|------|
| `join()` | 拼接并规范化 | **最常用**，跨平台安全 |
| `resolve()` | 转绝对路径 | 相对 cwd，可能非预期 |
| `extname()` | 取扩展名 | 多重点返回最后一段 `.js` |
| `parse()` | 拆成对象 | 需要各段时用 |

> **ESM 中拼文件路径**：`new URL('./data/x.json', import.meta.url)` 是最标准做法，避免 `__dirname` 缺失问题。

---

## 4. http 模块

### 4.1 创建服务器

```js
import http from 'node:http';

const server = http.createServer(async (req, res) => {
  const { method, url, headers } = req;
  console.log(method, url); // GET /api/stations

  if (url === '/api/stations' && method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ list: [/* ... */] }));
    return;
  }

  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(3000, () => console.log('监听 3000'));
```

### 4.2 解析请求体（Buffer 拼接）

```js
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));   // 数据分块到达
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      resolve(raw ? JSON.parse(raw) : {});
    });
  });
}

http.createServer(async (req, res) => {
  if (req.method === 'POST') {
    const body = await readBody(req);
    console.log('收到:', body);
    res.end('ok');
  }
});
```

### 4.3 静态文件服务（含 MIME）

```js
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
};

http.createServer(async (req, res) => {
  const filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  try {
    const data = await readFile(filePath);
    res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.statusCode = 404; res.end('Not Found');
  }
}).listen(8080);
```

> **注意**：真实项目用 `express`/`koa`/`fastify` 而非裸 http。但理解裸 http 有助于看懂框架底层。caidiaweb BFF 用 Nest.js（底层也是 http）。

---

## 5. events 事件模块

> Node 大量 API 基于 `EventEmitter`（流、http、进程…）。理解它 = 理解 Node 的异步原语。

### 5.1 基本用法

```js
import { EventEmitter } from 'node:events';

class MyEmitter extends EventEmitter {}
const em = new MyEmitter();

em.on('data', (payload) => console.log('收到', payload)); // 监听
em.emit('data', { id: 1 });                               // 触发

em.once('ready', () => console.log('只触发一次'));        // 一次性
em.off('data', handler);                                 // 取消监听（需保存 handler 引用）
```

### 5.2 监听器数量限制与 error

```js
em.setMaxListeners(20); // 默认 10，超过警告（防内存泄漏）

// ⚠️ error 事件：若不监听，抛出未捕获异常直接崩进程！
em.on('error', (err) => console.error('捕获错误', err));
em.emit('error', new Error('boom')); // 不崩，走上面 handler
```

> **黄金规则**：用 EventEmitter 必监听 `error` 事件，否则一个错误事件就会让整个进程挂掉。

---

## 6. stream 流

> 处理大文件/大数据时，**流 = 边产生边消费**，内存恒定。一次性 `readFile` 大文件会撑爆内存。

### 6.1 四种流类型

| 类型 | 方向 | 例 |
|------|------|-----|
| `Readable` | 可读 | `createReadStream`、HTTP 请求体 |
| `Writable` | 可写 | `createWriteStream`、HTTP 响应 |
| `Duplex` | 双向 | `net.Socket`、zlib |
| `Transform` | 读写+转换 | 压缩、加密、解压 |

### 6.2 pipe 与背压（Backpressure）

```js
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';

// Transform 流在管道中做转换（压缩）
const rs = createReadStream('big.txt');
const gzip = createGzip();
const ws = createWriteStream('big.txt.gz');

rs.pipe(gzip).pipe(ws); // 自动处理背压：下游慢时上游自动暂停
```

> **背压机制**：下游消费慢时，pipe 会自动暂停上游，防止内存堆积。手写 `data` 事件时要自己实现背压（`rs.pause()/resume()`），用 pipe 则自动。

### 6.3 流事件与 Readable.from

```js
import { Readable } from 'node:stream';

// 把可迭代对象转成流（适合逐条推送）
const rs = Readable.from([1, 2, 3]);
rs.on('data', (d) => console.log(d)); // 1 2 3
rs.on('end', () => console.log('完成'));
```

| 事件 | 触发 |
|------|------|
| `data` | 收到数据块 |
| `end` | 读完了 |
| `error` | 出错 |
| `finish` | 写完了（Writable） |
| `drain` | 可继续写（背压恢复） |

---

## 7. buffer 与编码

> Buffer 是 Node 对**二进制数据**的封装（Buffer 类是 Uint8Array 子类）。网络/文件数据本质都是 Buffer。

```js
import { Buffer } from 'node:buffer';

const b1 = Buffer.from('你好', 'utf8');  // 字符串 → Buffer
console.log(b1.length);                  // 6（中文 UTF-8 占 3 字节）
console.log(b1.toString('utf8'));        // 你好

const b2 = Buffer.alloc(10);             // 分配 10 字节（清零）
const b3 = Buffer.from([0x48, 0x69]);    // 字节数组

// 编码互转
Buffer.from('aGVsbG8=', 'base64').toString('utf8'); // 'hello'
```

| 编码 | 用途 |
|------|------|
| `utf8` | 文本（默认） |
| `base64` | 二进制转文本（图片内联、传输） |
| `hex` | 十六进制（哈希、密钥） |
| `ascii` | 单字节 ASCII |

> **拼接 Buffer**：用 `Buffer.concat([...])`（不要用 `+` 字符串拼接二进制）。之前 http 解析请求体就是 `Buffer.concat(chunks)`。

---

## 8. caidiaweb / BFF 实践

### 8.1 BFF 读取后端聚合（http + stream）

```js
import http from 'node:http';
import { request } from 'node:https';

// BFF 代理：把后端响应流式透传给前端（大数据不占 BFF 内存）
http.createServer((req, res) => {
  const proxy = request(
    `https://backend${req.url}`,
    (backendRes) => {
      res.writeHead(backendRes.statusCode, backendRes.headers);
      backendRes.pipe(res); // 后端 → 前端 流式转发（背压自动）
    }
  );
  req.pipe(proxy); // 前端请求体 → 后端
});
```

### 8.2 大文件日志归档（stream + zlib）

```js
import { createReadStream } from 'node:fs';
import { createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';

function archive(src, dest) {
  return new Promise((resolve, reject) => {
    createReadStream(src)
      .pipe(createGzip())
      .pipe(createWriteStream(dest))
      .on('finish', resolve)
      .on('error', reject);
  });
}
```

### 8.3 落地检查清单

- [ ] 文件操作用 `fs.promises` + async/await（非回调）
- [ ] 路径拼接用 `path.join`（跨平台，别手写 `+`）
- [ ] 大文件用 stream，避免 `readFile` 一次性进内存
- [ ] EventEmitter 必监听 `error` 事件（防崩进程）
- [ ] pipe 自动处理背压，手写 data 要自己 pause/resume
- [ ] 二进制用 Buffer，拼接用 `Buffer.concat`
- [ ] 真实 BFF 用框架（Nest/Express），底层仍是这些模块

---

## 9. 面试考点

### Q1：fs 的回调版/Promise 版/同步版怎么选？
新代码用 **Promise 版（`fs.promises`）+ async/await**（可读性最好）。回调版是老式、易陷入回调地狱。同步版（`readFileSync`）阻塞主线程，仅适合启动时读配置。

### Q2：什么是流（stream）？什么时候用？
流是「边产生边消费」的数据处理方式，内存恒定。处理大文件、代理转发、实时日志时必须用流，否则一次性 `readFile` 会把整个文件读进内存导致 OOM。

### Q3：pipe 和背压（backpressure）是什么？
`pipe` 把可读流连到可写流，自动转发数据。**背压**是当下游消费慢时，pipe 自动暂停上游防止内存堆积。手写 `data` 事件要自己实现 `pause/resume`，用 pipe 则自动处理。

### Q4：Node 的 EventEmitter 为什么必须监听 error？
EventEmitter 触发 `error` 事件时若无监听器，会作为未捕获异常抛出，**直接崩溃进程**。所以凡是用 EventEmitter 的地方必 `on('error', ...)`。

### Q5：Buffer 是什么？常见编码？
Buffer 是 Node 对二进制数据的封装（Uint8Array 子类）。常见编码：utf8（文本）、base64（二进制转文本传输）、hex（哈希/密钥）、ascii。二进制拼接用 `Buffer.concat`。

### Q6：path.join 和 path.resolve 区别？
`join` 拼接并规范化路径（跨平台安全，最常用）；`resolve` 把相对路径解析成基于 cwd 的绝对路径（可能不符合预期）。拼路径一律用 `join`。

### Q7：http 模块怎么解析 POST 请求体？
`req` 是 Readable 流，数据分块到达。监听 `data` 把 chunk 推入数组，`end` 时用 `Buffer.concat(chunks).toString()` 得到完整 Body，再 `JSON.parse`。

### Q8：watch 和 watchFile 区别？
`watch` 基于 OS 文件事件（inotify/FSEvents），高效，推荐；`watchFile` 是轮询，低效，仅作兜底。监听文件变化用 `watch`。

---

> **本章小结**：Node 核心模块是写服务端的基本功——`fs` 文件操作（Promise 版 + stream 大文件）、`path` 跨平台拼路径、`http` 裸服务器、`events` 事件原语（必监听 error）、`stream` 流式+背压、`buffer` 二进制。掌握它们，既能看懂 Nest.js 等框架的底层，也能手写 BFF 代理/工具脚本。下一章 **1.4 Node.js Event Loop** 将深入事件循环的 6 阶段与微任务机制。
