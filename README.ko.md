# f4next

[English](README.md) | [한국어](README.ko.md) | [中文](README.zh.md) | [日本語](README.ja.md)

**f4next** (Fetch For Next)는 **Next.js 13+ App Router**를 위해 특별히 설계된 경량화되고 타입 안전한 `fetch` 래퍼입니다.
복잡한 캐싱 옵션을 `ssr`, `isr`, `ssg`와 같은 직관적인 전략으로 추상화하여 데이터 가져오기를 단순화합니다.

## 특징

- 🚀 **Next.js 13+ 준비 완료**: App Router 서버 컴포넌트용으로 제작되었습니다.
- 🛠 **전략 기반 캐싱**: 더 이상 `cache: 'no-store'`나 `next: { revalidate: N }`을 외울 필요가 없습니다.
- 🛡 **타입 안전성**: TypeScript 제네릭으로 완전히 타입이 지정되었습니다.
- 📦 **설정 없는 기본값**: Next.js처럼 기본적으로 공격적인 캐싱(SSG)을 수행합니다.
- ⚡ **경량화**: 의존성이 없습니다 (Next.js 피어 의존성 제외).

## 설치

```bash
npm install f4next
# 또는
yarn add f4next
# 또는
pnpm add f4next
```

## 빠른 시작

### 1. 기본 사용법

Axios처럼 `f4next.get`, `post`, `put`, `delete`를 사용하세요. 하지만 내부적으로는 기본 Fetch API를 사용합니다.

```typescript
import { f4n } from 'f4next';

interface User {
  id: number;
  name: string;
}

// 서버 컴포넌트 내부
export default async function Page() {
  const user = await f4next.get<User>('https://api.example.com/me');
  return <div>Hello {user.name}</div>;
}
```

### 2. 캐싱 전략 (단축키)

f4next은 전략 설정을 위한 "매직 인자"를 지원합니다. 문자열이나 숫자로 전략을 직접 전달할 수 있습니다.

#### 정적 사이트 생성 (기본값)

```typescript
// 요청이 무기한 캐시됩니다
const data = await f4next.get('/api/static');
// 명시적으로 지정
const data = await f4next.get('/api/static', 'ssg');
```

#### 서버 사이드 렌더링 (동적)

두 번째 인자로 `'ssr'`을 전달하세요.

```typescript
// 항상 최신 데이터를 가져옵니다 (cache: 'no-store')
const data = await f4next.get('/api/dynamic', 'ssr');
```

#### 증분 정적 재생성 (ISR)

재검증 시간(초 단위)을 직접 전달하세요.

```typescript
// 60초 동안 캐시됨 (기본값)
const data = await f4next.get('/api/news', 'isr');

// 5분 동안 캐시됨
const data = await f4next.get('/api/news', 300);
```

### 3. POST 요청 및 본문

본문이 있는 메서드(`post`, `put`, `patch`)의 경우, 단축키는 3번째 인자입니다. `f4next`은 자동으로 본문을 문자열화하고 `Content-Type: application/json`을 설정합니다.

```typescript
await f4next.post('/api/users', { name: 'John' }, 'ssr');
```

### 4. 응답 파싱 (체이닝 API)

기본적으로 `f4next`은 `await`할 때 응답을 JSON으로 파싱 하려고 시도합니다. 그러나 메서드를 체이닝하여 응답 처리 방식을 변경할 수 있습니다.

```typescript
// 기본 (JSON)
const user = await f4next.get<User>('/api/user');

// 텍스트 (Text)
const html = await f4next.get('/home').text();

// Blob 또는 ArrayBuffer
const image = await f4next.get('/logo.png').blob();
const buffer = await f4next.get('/data.bin').arrayBuffer();

// 원본 응답 (헤더, 상태 확인 등)
const res = await f4next.get('/api/raw').res();
console.log(res.headers.get('content-type'));
```

### 5. 고급 옵션

헤더와 같은 표준 `fetch` 옵션과 단축키를 혼합하여 사용할 수 있습니다.

```typescript
// 단축키 + 옵션
await f4next.get('/api/secure', 'ssr', {
  headers: { Authorization: 'Bearer ...' },
});

// 옵션만 사용 (레거시 스타일)
await f4next.get('/api/legacy', { strategy: 'ssr' });
```

### 6. 에러 처리

`f4n`은 `response.ok`가 false이면 자동으로 에러를 던집니다.

```typescript
try {
  await f4next.get('/api/protected');
} catch (error) {
  console.error('Fetch failed:', error.message);
}
```

## API 참조

### `f4next.get<T>(url, options?)`

### `f4next.post<T>(url, body, options?)`

### `f4next.put<T>(url, body, options?)`

### `f4next.delete<T>(url, options?)`

**옵션 (`F4nOptions`):**

- `strategy`: `'ssg' | 'ssr' | 'isr'` (기본값: 메서드에 따라 동적)
- `revalidate`: `number` (기본값: 전략이 `'isr'`일 때 `60`)
- 모든 표준 `RequestInit` 옵션 (`headers` 등).

## 라이선스

MIT © iubns
