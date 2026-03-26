# f4nx

[English](README.md) | [한국어](README.ko.md) | [中文](README.zh.md) | [日本語](README.ja.md)

**f4nx** (Fetch For Next) is a lightweight, type-safe wrapper around `fetch` designed specifically for the **Next.js 13+ App Router**.

It simplifies data fetching by abstracting complex caching options into intuitive strategies like `ssr`, `isr`, and `ssg`.

## Features

- 🚀 **Next.js 13+ Ready**: Built for App Router server components.
- 🛠 **Strategy-Based Caching**: No more memorizing `cache: 'no-store'` or `next: { revalidate: N }`.
- 🛡 **Type-Safe**: Fully typed with TypeScript generics.
- 📦 **Zero-Config Defaults**: Defaults to aggressive caching (SSG), just like Next.js.
- ⚡ **Lightweight**: Zero dependencies (besides Next.js peer dependency).

## Installation

```bash
npm install f4nx
# or
yarn add f4nx
# or
pnpm add f4nx
```

## Quick Start

### 1. Basic Usage

Use `f4nx.get`, `post`, `put`, `delete` just like you would with Axios, but it uses the native Fetch API under the hood.

```typescript
import { f4n } from 'f4nx';

interface User {
  id: number;
  name: string;
}

// In a Server Component
export default async function Page() {
  const user = await f4nx.get<User>('https://api.example.com/me');
  return <div>Hello {user.name}</div>;
}
```

### 2. Caching Strategies (Shortcuts)

F4n supports "Magic Arguments" for setting strategies. You can pass the strategy directly as a string or number.

#### Static Site Generation (Default)

```typescript
// Requests are cached indefinitely
const data = await f4nx.get('/api/static');
// Explicitly
const data = await f4nx.get('/api/static', 'ssg');
```

#### Server-Side Rendering (Dynamic)

Pass `'ssr'` as the second argument.

```typescript
// Always fetches fresh data (cache: 'no-store')
const data = await f4nx.get('/api/dynamic', 'ssr');
```

#### Incremental Static Regeneration (ISR)

Pass the revalidation time (in seconds) directly.

```typescript
// Cached for 60 seconds (default)
const data = await f4nx.get('/api/news', 'isr');

// Cached for 5 minutes
const data = await f4nx.get('/api/news', 300);
```

### 3. POST Requests & Body

For methods with a body (`post`, `put`, `patch`), the shortcut is the 3rd argument. `f4n` automatically stringifies your body and sets `Content-Type: application/json`.

```typescript
await f4nx.post('/api/users', { name: 'John' }, 'ssr');
```

### 4. Response Parsing (Chainable API)

By default, `f4n` attempts to parse the response as JSON when you `await` it. However, you can chain methods to change how the response is handled.

```typescript
// Default (JSON)
const user = await f4nx.get<User>('/api/user');

// Text
const html = await f4nx.get('/home').text();

// Blob or ArrayBuffer
const image = await f4nx.get('/logo.png').blob();
const buffer = await f4nx.get('/data.bin').arrayBuffer();

// Raw Response (for headers, status check, etc)
const res = await f4nx.get('/api/raw').res();
console.log(res.headers.get('content-type'));
```

### 5. Advanced Options

You can mix shortcuts with standard `fetch` options like headers.

```typescript
// Shortcut + Options
await f4nx.get('/api/secure', 'ssr', {
  headers: { Authorization: 'Bearer ...' },
});

// Options only (Legacy style)
await f4nx.get('/api/legacy', { strategy: 'ssr' });
```

### 6. Error Handling

`f4n` throws an error automatically if `response.ok` is false.

```typescript
try {
  await f4nx.get('/api/protected');
} catch (error) {
  console.error('Fetch failed:', error.message);
}
```

## API Reference

### `f4nx.get<T>(url, options?)`

### `f4nx.post<T>(url, body, options?)`

### `f4nx.put<T>(url, body, options?)`

### `f4nx.delete<T>(url, options?)`

**Options (`F4nOptions`):**

- `strategy`: `'ssg' | 'ssr' | 'isr'` (Default: Dynamic based on method)
- `revalidate`: `number` (Default: `60` when strategy is `'isr'`)
- All standard `RequestInit` options (`headers`, etc).

## License

MIT © iubns
