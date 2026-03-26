# f4n

[English](README.md) | [한국어](README.ko.md) | [中文](README.zh.md) | [日本語](README.ja.md)

**f4n** (Fetch For Next) は、**Next.js 13+ App Router** 向けに特別に設計された、軽量で型安全な `fetch` ラッパーです。
複雑なキャッシュオプションを `ssr`、`isr`、`ssg` のような直感的な戦略に抽象化することで、データ取得を簡素化します。

## 特徴

- 🚀 **Next.js 13+ 対応**: App Router サーバーコンポーネント向けに構築されています。
- 🛠 **戦略ベースのキャッシュ**: `cache: 'no-store'` や `next: { revalidate: N }` を覚える必要はもうありません。
- 🛡 **型安全性**: TypeScript のジェネリクスで完全に型付けされています。
- 📦 **ゼロ設定のデフォルト**: Next.js と同様に、デフォルトで積極的なキャッシュ (SSG) を行います。
- ⚡ **軽量**: 依存関係ゼロ (Next.js のピア依存関係を除く)。

## インストール

```bash
npm install @iubns/f4n
# または
yarn add @iubns/f4n
# または
pnpm add @iubns/f4n
```

## クイックスタート

### 1. 基本的な使い方

Axios のように `f4n.get`、`post`、`put`、`delete` を使用しますが、内部ではネイティブの Fetch API を使用します。

```typescript
import { f4n } from '@iubns/f4n';

interface User {
  id: number;
  name: string;
}

// サーバーコンポーネント内
export default async function Page() {
  const user = await f4n.get<User>('https://api.example.com/me');
  return <div>Hello {user.name}</div>;
}
```

### 2. キャッシュ戦略 (ショートカット)

F4n は戦略を設定するための「マジック引数」をサポートしています。文字列または数値として戦略を直接渡すことができます。

#### 静的サイト生成 (デフォルト)

```typescript
// リクエストは無期限にキャッシュされます
const data = await f4n.get('/api/static');
// 明示的に指定
const data = await f4n.get('/api/static', 'ssg');
```

#### サーバーサイドレンダリング (動的)

第2引数として `'ssr'` を渡します。

```typescript
// 常に最新データを取得します (cache: 'no-store')
const data = await f4n.get('/api/dynamic', 'ssr');
```

#### インクリメンタル静的再生成 (ISR)

再検証時間（秒単位）を直接渡します。

```typescript
// 60秒間キャッシュ (デフォルト)
const data = await f4n.get('/api/news', 'isr');

// 5分間キャッシュ
const data = await f4n.get('/api/news', 300);
```

### 3. POST リクエストとボディ

ボディを持つメソッド (`post`, `put`, `patch`) の場合、ショートカットは3番目の引数になります。`f4n` は自動的にボディを文字列化し、`Content-Type: application/json` を設定します。

```typescript
await f4n.post('/api/users', { name: 'John' }, 'ssr');
```

### 4. レスポンスの解析 (チェーン可能な API)

デフォルトでは、`f4n` は `await` 時にレスポンスを JSON として解析しようとします。しかし、メソッドをチェーンしてレスポンスの処理方法を変更することができます。

```typescript
// デフォルト (JSON)
const user = await f4n.get<User>('/api/user');

// テキスト (Text)
const html = await f4n.get('/home').text();

// Blob または ArrayBuffer
const image = await f4n.get('/logo.png').blob();
const buffer = await f4n.get('/data.bin').arrayBuffer();

// 生のレスポンス (ヘッダー、ステータス確認など)
const res = await f4n.get('/api/raw').res();
console.log(res.headers.get('content-type'));
```

### 5. 高度なオプション

ショートカットとヘッダーなどの標準的な `fetch` オプションを組み合わせて使用できます。

```typescript
// ショートカット + オプション
await f4n.get('/api/secure', 'ssr', {
  headers: { Authorization: 'Bearer ...' },
});

// オプションのみ (レガシースタイル)
await f4n.get('/api/legacy', { strategy: 'ssr' });
```

### 6. エラーハンドリング

`response.ok` が false の場合、`f4n` は自動的にエラーをスローします。

```typescript
try {
  await f4n.get('/api/protected');
} catch (error) {
  console.error('Fetch failed:', error.message);
}
```

## API リファレンス

### `f4n.get<T>(url, options?)`

### `f4n.post<T>(url, body, options?)`

### `f4n.put<T>(url, body, options?)`

### `f4n.delete<T>(url, options?)`

**オプション (`F4nOptions`):**

- `strategy`: `'ssg' | 'ssr' | 'isr'` (デフォルト: メソッドに基づく動的設定)
- `revalidate`: `number` (デフォルト: 戦略が `'isr'` の場合 `60`)
- すべての標準 `RequestInit` オプション (`headers` など)。

## ライセンス

MIT © iubns
