# f4n

[English](https://github.com/iubns/f4n/blob/main/README.md) | [한국어](https://github.com/iubns/f4n/blob/main/README.ko.md) | [中文](https://github.com/iubns/f4n/blob/main/README.zh.md) | [日本語](https://github.com/iubns/f4n/blob/main/README.ja.md)

**f4n** (Fetch For Next)는 **Next.js 13+ App Router**를 위해 특별히 설계된 경량화되고 타입 안전한 `fetch` 래퍼입니다.
복잡한 캐싱 옵션을 `ssr`, `isr`, `ssg`와 같은 직관적인 전략으로 추상화하여 데이터 가져오기를 단순화합니다.

## 특징

- 🚀 **Next.js 13+ 준비 완료**: App Router 서버 컴포넌트용으로 제작되었습니다.
- 🛠 **전략 기반 캐싱**: 더 이상 `cache: 'no-store'`나 `next: { revalidate: N }`을 외울 필요가 없습니다.
- 🛡 **타입 안전성**: TypeScript 제네릭으로 완전히 타입이 지정되었습니다.
- 📦 **설정 없는 기본값**: Next.js처럼 기본적으로 공격적인 캐싱(SSG)을 수행합니다.
- ⚡ **경량화**: 의존성이 없습니다 (Next.js 피어 의존성 제외).

## 설치

```bash
npm install @iubns/f4n
# 또는
yarn add @iubns/f4n
# 또는
pnpm add @iubns/f4n
```

## 빠른 시작

### 1. 기본 사용법

Axios처럼 `f4n.get`, `post`, `put`, `delete`를 사용하세요. 하지만 내부적으로는 기본 Fetch API를 사용합니다.

```typescript
import { f4n } from '@iubns/f4n';

interface User {
  id: number;
  name: string;
}

// 서버 컴포넌트 내부
export default async function Page() {
  const user = await f4n.get<User>('https://api.example.com/me');
  return <div>Hello {user.name}</div>;
}
```

### 2. 캐싱 전략 (단축키)

f4n은 전략 설정을 위한 "매직 인자"를 지원합니다. 문자열이나 숫자로 전략을 직접 전달할 수 있습니다.

#### 정적 사이트 생성 (기본값)

```typescript
// 요청이 무기한 캐시됩니다
const data = await f4n.get('/api/static');
// 명시적으로 지정
const data = await f4n.get('/api/static', 'ssg');
```

#### 서버 사이드 렌더링 (동적)

두 번째 인자로 `'ssr'`을 전달하세요.

```typescript
// 항상 최신 데이터를 가져옵니다 (cache: 'no-store')
const data = await f4n.get('/api/dynamic', 'ssr');
```

#### 증분 정적 재생성 (ISR)

재검증 시간(초 단위)을 직접 전달하세요.

```typescript
// 60초 동안 캐시됨 (기본값)
const data = await f4n.get('/api/news', 'isr');

// 5분 동안 캐시됨
const data = await f4n.get('/api/news', 300);
```

### 3. POST 요청 및 본문

본문이 있는 메서드(`post`, `put`, `patch`)의 경우, 단축키는 3번째 인자입니다. `f4n`은 자동으로 본문을 문자열화하고 `Content-Type: application/json`을 설정합니다.

```typescript
await f4n.post('/api/users', { name: 'John' }, 'ssr');
```

### 4. 응답 파싱 (체이닝 API)

기본적으로 `f4n`은 `await`할 때 응답을 JSON으로 파싱 하려고 시도합니다. 그러나 메서드를 체이닝하여 응답 처리 방식을 변경할 수 있습니다.

```typescript
// 기본 (JSON)
const user = await f4n.get<User>('/api/user');

// 텍스트 (Text)
const html = await f4n.get('/home').text();

// Blob 또는 ArrayBuffer
const blob = await f4n.get('/image.png').blob();
```

### 5. 인터셉터 (Interceptors)

`then`이나 `catch`에 도달하기 전에 요청이나 응답을 가로챌 수 있습니다. 인증 토큰 추가, 로깅 또는 401 Unauthorized와 같은 전역 에러 처리에 유용합니다.

#### 요청 인터셉터 (Request Interceptor)

```typescript
f4n.interceptors.request.use((config) => {
  // 모든 요청에 인증 토큰 추가
  config.headers = new Headers(config.headers);
  config.headers.set('Authorization', 'Bearer my-token');
  console.log(`[Request] ${config.method} ${config.url}`);
  return config;
});
```

#### 응답 인터셉터 (Response Interceptor)

```typescript
f4n.interceptors.response.use(
  (response) => {
    // 2xx 범위의 상태 코드는 이 함수를 트리거합니다.
    return response;
  },
  async (error) => {
    // 2xx 범위를 벗어난 상태 코드는 이 함수를 트리거합니다.
    const originalRequest = error.config;

    // 예제: 401 에러 발생 시 토큰 갱신
    if (error.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 1. 토큰 갱신 로직 실행
        // const { accessToken } = await refreshToken();
        // 2. 헤더 업데이트
        // originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
        // 3. 원래 요청 재시도
        // 여기서 원래 요청을 다시 실행하는 로직이 필요합니다.
        // 현재는 수동 재시도 로직을 구현해야 합니다.
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);
```

const image = await f4n.get('/logo.png').blob();
const buffer = await f4n.get('/data.bin').arrayBuffer();

// 원본 응답 (헤더, 상태 확인 등)
const res = await f4n.get('/api/raw').res();
console.log(res.headers.get('content-type'));

````

### 5. 고급 옵션

헤더와 같은 표준 `fetch` 옵션과 단축키를 혼합하여 사용할 수 있습니다.

```typescript
// 단축키 + 옵션
await f4n.get('/api/secure', 'ssr', {
  headers: { Authorization: 'Bearer ...' },
});

// 옵션만 사용 (레거시 스타일)
await f4n.get('/api/legacy', { strategy: 'ssr' });
````

### 6. 에러 처리

`f4n`은 `response.ok`가 false이면 자동으로 `F4nError`를 던집니다. 이 커스텀 에러 클래스에는 상태 코드, 상태 텍스트, 그리고 원본 응답 객체가 포함되어 있습니다.

#### Try-Catch (Async/Await)

```typescript
import { F4nError } from '@iubns/f4n';

try {
  await f4n.get('/api/protected');
} catch (error) {
  if (error instanceof F4nError) {
    console.error('Status:', error.status); // 401
    // 필요한 경우 응답 본문에 접근할 수 있습니다
    const errorBody = await error.response.json();
    console.error('Message:', errorBody.message);
  }
}
```

#### Promise Catch 메서드

`.catch` 메서드를 직접 사용하여 에러를 처리할 수도 있습니다.

```typescript
f4n
  .get('/api/user')
  .then((data) => console.log('Success:', data))
  .catch((error) => {
    // 1. HTTP API 에러 (4xx, 5xx)
    if (error instanceof F4nError) {
      console.error('API Error:', error.status);
    }
    // 2. 네트워크 에러 (오프라인, DNS 오류 등)
    else {
      console.error('Network Error:', error);
    }
  });
```

### 7. 전역 설정 (f4n.create)

`baseURL`이나 기본 헤더, 공통 전략을 미리 설정한 인스턴스를 생성할 수 있습니다 (`axios.create`와 유사).

```typescript
// lib/api.ts
import { f4n } from '@iubns/f4n';

export const api = f4n.create({
  baseURL: 'https://api.example.com/v1',
  headers: {
    Authorization: 'Bearer my-token',
    'Content-Type': 'application/json',
  },
  // 이 인스턴스의 기본 전략 설정
  strategy: 'isr',
  revalidate: 60,
});

// app/page.tsx
import { api } from '@/lib/api';

// 자동으로 변환됨: GET https://api.example.com/v1/users
// 헤더 병합됨: Authorization + Content-Type 포함
const users = await api.get('/users');
```

## API 참조

### `f4n.get<T>(url, options?)`

### `f4n.post<T>(url, body, options?)`

### `f4n.put<T>(url, body, options?)`

### `f4n.delete<T>(url, options?)`

**옵션 (`F4nOptions`):**

- `strategy`: `'ssg' | 'ssr' | 'isr'` (기본값: 메서드에 따라 동적)
- `revalidate`: `number` (기본값: 전략이 `'isr'`일 때 `60`)
- 모든 표준 `RequestInit` 옵션 (`headers` 등).

## 라이선스

MIT © iubns
