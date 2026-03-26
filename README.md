# f4n

[English](https://github.com/iubns/f4n/blob/main/README.md) | [한국어](https://github.com/iubns/f4n/blob/main/README.ko.md) | [中文](https://github.com/iubns/f4n/blob/main/README.zh.md) | [日本語](https://github.com/iubns/f4n/blob/main/README.ja.md)

**f4n** (Fetch For Next) is a lightweight, type-safe wrapper around `fetch` designed specifically for the **Next.js 13+ App Router**.

It simplifies data fetching by abstracting complex caching options into intuitive strategies like `ssr`, `isr`, and `ssg`.

## Features

- 🚀 **Next.js 13+ Ready**: Built for App Router server components.
- 🛠 **Strategy-Based Caching**: No more memorizing `cache: 'no-store'` or `next: { revalidate: N }`.
- 🛡 **Type-Safe**: Fully typed with TypeScript generics.
- 📦 **Zero-Config Defaults**: Defaults to aggressive caching (SSG), just like Next.js.
- ⚡ **Lightweight**: Zero dependencies (besides Next.js peer dependency).

## Installation

```bash
npm install @iubns/f4n
# or
yarn add @iubns/f4n
# or
pnpm add @iubns/f4n
```

## Quick Start

### 1. Basic Usage

Use `f4n.get`, `post`, `put`, `delete` just like you would with Axios, but it uses the native Fetch API under the hood.

```typescript
import { f4n } from '@iubns/f4n';

interface User {
  id: number;
  name: string;
}

// In a Server Component
export default async function Page() {
  const user = await f4n.get<User>('https://api.example.com/me');
  return <div>Hello {user.name}</div>;
}
```

### 2. Caching Strategies (Shortcuts)

F4n supports "Magic Arguments" for setting strategies. You can pass the strategy directly as a string or number.

#### Static Site Generation (Default)

```typescript
// Requests are cached indefinitely
const data = await f4n.get('/api/static');
// Explicitly
const data = await f4n.get('/api/static', 'ssg');
```

#### Server-Side Rendering (Dynamic)

Pass `'ssr'` as the second argument.

```typescript
// Always fetches fresh data (cache: 'no-store')
const data = await f4n.get('/api/dynamic', 'ssr');
```

#### Incremental Static Regeneration (ISR)

Pass the revalidation time (in seconds) directly.

```typescript
// Cached for 60 seconds (default)
const data = await f4n.get('/api/news', 'isr');

// Cached for 5 minutes
const data = await f4n.get('/api/news', 300);
```

### 3. POST Requests & Body

For methods with a body (`post`, `put`, `patch`), the shortcut is the 3rd argument. `f4n` automatically stringifies your body and sets `Content-Type: application/json`.

```typescript
await f4n.post('/api/users', { name: 'John' }, 'ssr');
```

### 4. Response Parsing (Chainable API)

By default, `f4n` attempts to parse the response as JSON when you `await` it. However, you can chain methods to change how the response is handled.

```typescript
// Default (JSON)
const user = await f4n.get<User>('/api/user');

// Text
const html = await f4n.get('/home').text();

// Blob or ArrayBuffer
const blob = await f4n.get('/image.png').blob();
```

### 5. Interceptors

You can intercept requests or responses before they are handled by `then` or `catch`. This is useful for adding authentication tokens, logging, or handling global errors like 401 Unauthorized.

#### Request Interceptor

```typescript
f4n.interceptors.request.use((config) => {
  // Add auth token to every request
  config.headers = new Headers(config.headers);
  config.headers.set('Authorization', 'Bearer my-token');
  console.log(`[Request] ${config.method} ${config.url}`);
  return config;
});
```

#### Response Interceptor

```typescript
f4n.interceptors.response.use(
  (response) => {
    // Any status code within the range of 2xx triggers this function
    return response;
  },
  async (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    const originalRequest = error.config;

    // Example: Refresh token on 401
    if (error.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 1. Refresh token
        // const { accessToken } = await refreshToken();
        // 2. Update header
        // originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
        // 3. Retry original request
        // You would need to re-execute the request here.
        // Currently, manual retry logic needs to be implemented.
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);
```

// Blob or ArrayBuffer
const image = await f4n.get('/logo.png').blob();
const buffer = await f4n.get('/data.bin').arrayBuffer();

// Raw Response (for headers, status check, etc)
const res = await f4n.get('/api/raw').res();
console.log(res.headers.get('content-type'));

````

### 5. Advanced Options

You can mix shortcuts with standard `fetch` options like headers.

```typescript
// Shortcut + Options
await f4n.get('/api/secure', 'ssr', {
  headers: { Authorization: 'Bearer ...' },
});

// Options only (Legacy style)
await f4n.get('/api/legacy', { strategy: 'ssr' });
````

### 6. Error Handling

`f4n` throws `F4nError` automatically if `response.ok` is false. This custom error class includes the status code, status text, and the original response object.

#### Try-Catch (Async/Await)

```typescript
import { F4nError } from '@iubns/f4n';

try {
  await f4n.get('/api/protected');
} catch (error) {
  if (error instanceof F4nError) {
    console.error('Status:', error.status); // 401
    // You can access the response body if needed
    const errorBody = await error.response.json();
    console.error('Message:', errorBody.message);
  }
}
```

#### Promise Catch Method

You can also use the `.catch` method directly.

```typescript
f4n
  .get('/api/user')
  .then((data) => console.log('Success:', data))
  .catch((error) => {
    // 1. API Error (4xx, 5xx)
    if (error instanceof F4nError) {
      console.error('API Error:', error.status);
    }
    // 2. Network/Unknown Error
    else {
      console.error('Network Error:', error);
    }
  });
```

### 7. Global Configuration (axios-style)

You can create a pre-configured instance with `baseURL`, default headers, and strategies.

```typescript
// api/client.ts
import { f4n } from '@iubns/f4n';

export const api = f4n.create({
  baseURL: 'https://api.example.com/v1',
  headers: {
    Authorization: 'Bearer my-token',
    'Content-Type': 'application/json',
  },
  // Default strategy for all requests from this client
  strategy: 'isr',
  revalidate: 60,
});

// usage.tsx
import { api } from '@/api/client';

// Normalized to: GET https://api.example.com/v1/users
// Headers merged: Authorization + Content-Type included
const users = await api.get('/users');
```

## API Reference

### `f4n.get<T>(url, options?)`

### `f4n.post<T>(url, body, options?)`

### `f4n.put<T>(url, body, options?)`

### `f4n.delete<T>(url, options?)`

**Options (`F4nOptions`):**

- `strategy`: `'ssg' | 'ssr' | 'isr'` (Default: Dynamic based on method)
- `revalidate`: `number` (Default: `60` when strategy is `'isr'`)
- All standard `RequestInit` options (`headers`, etc).

## License

MIT © iubns
