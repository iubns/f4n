# f4n

[English](README.md) | [한국어](README.ko.md) | [中文](README.zh.md) | [日本語](README.ja.md)

**f4n** (Fetch For Next) 是专为 **Next.js 13+ App Router** 设计的轻量级、类型安全的 `fetch` 包装器。
它通过将复杂的缓存选项抽象为直观的策略（如 `ssr`、`isr` 和 `ssg`）来简化数据获取。

## 特性

- 🚀 **Next.js 13+ 就绪**: 专为 App Router 服务器组件构建。
- 🛠 **基于策略的缓存**: 无需再记住 `cache: 'no-store'` 或 `next: { revalidate: N }`。
- 🛡 **类型安全**: 完全使用 TypeScript 泛型进行类型定义。
- 📦 **零配置默认值**:像 Next.js 一样，默认为激进缓存 (SSG)。
- ⚡ **轻量级**: 零依赖（除了 Next.js 对等依赖）。

## 安装

```bash
npm install f4n
# 或
yarn add f4n
# 或
pnpm add f4n
```

## 快速开始

### 1. 基本用法

像使用 Axios 一样使用 `f4n.get`、`post`、`put`、`delete`，但它在底层使用原生 Fetch API。

```typescript
import { f4n } from 'f4n';

interface User {
  id: number;
  name: string;
}

// 在服务器组件中
export default async function Page() {
  const user = await f4n.get<User>('https://api.example.com/me');
  return <div>Hello {user.name}</div>;
}
```

### 2. 缓存策略 (快捷方式)

F4n 支持设置策略的“魔法参数”。您可以直接传递字符串或数字作为策略。

#### 静态站点生成 (默认)

```typescript
// 请求被无限期缓存
const data = await f4n.get('/api/static');
// 显式指定
const data = await f4n.get('/api/static', 'ssg');
```

#### 服务器端渲染 (动态)

传递 `'ssr'` 作为第二个参数。

```typescript
// 总是获取最新数据 (cache: 'no-store')
const data = await f4n.get('/api/dynamic', 'ssr');
```

#### 增量静态再生 (ISR)

直接传递重新验证时间（以秒为单位）。

```typescript
// 缓存 60 秒 (默认)
const data = await f4n.get('/api/news', 'isr');

// 缓存 5 分钟
const data = await f4n.get('/api/news', 300);
```

### 3. POST 请求与 Body

对于带有 body 的方法 (`post`, `put`, `patch`)，快捷方式是第 3 个参数。`f4n` 会自动将 body 字符串化并设置 `Content-Type: application/json`。

```typescript
await f4n.post('/api/users', { name: 'John' }, 'ssr');
```

### 4. 响应解析 (链式 API)

默认情况下，当您 `await` 时，`f4n` 会尝试将响应解析为 JSON。但是，您可以链式调用方法来更改响应的处理方式。

```typescript
// 默认 (JSON)
const user = await f4n.get<User>('/api/user');

// 文本 (Text)
const html = await f4n.get('/home').text();

// Blob 或 ArrayBuffer
const image = await f4n.get('/logo.png').blob();
const buffer = await f4n.get('/data.bin').arrayBuffer();

// 原始响应 (Headers, 状态检查等)
const res = await f4n.get('/api/raw').res();
console.log(res.headers.get('content-type'));
```

### 5. 高级选项

您可以将快捷方式与标准 `fetch` 选项（如 headers）混合使用。

```typescript
// 快捷方式 + 选项
await f4n.get('/api/secure', 'ssr', {
  headers: { Authorization: 'Bearer ...' },
});

// 仅选项 (旧版风格)
await f4n.get('/api/legacy', { strategy: 'ssr' });
```

### 6. 错误处理

如果 `response.ok` 为 false，`f4n` 会自动抛出错误。

```typescript
try {
  await f4n.get('/api/protected');
} catch (error) {
  console.error('Fetch failed:', error.message);
}
```

## API 参考

### `f4n.get<T>(url, options?)`

### `f4n.post<T>(url, body, options?)`

### `f4n.put<T>(url, body, options?)`

### `f4n.delete<T>(url, options?)`

**选项 (`F4nOptions`):**

- `strategy`: `'ssg' | 'ssr' | 'isr'` (默认: 基于方法的动态策略)
- `revalidate`: `number` (默认: 当策略为 `'isr'` 时为 `60`)
- 所有标准 `RequestInit` 选项 (`headers` 等)。

## 许可证

MIT © iubns
