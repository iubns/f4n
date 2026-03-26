/**
 * Usage Examples for Next.js App Router
 *
 * This file demonstrates how to use f4next in a typical Next.js application.
 */

import { f4next } from 'f4next';

// Type definition for our data
interface Post {
  id: number;
  title: string;
}

// -------------------------------------------------------------
// 1. Static Page (SSG) - Default behavior
// This page is generated at build time (or cached on first request)
// -------------------------------------------------------------
export async function generateStaticParams() {
  const posts = await f4next.get<Post[]>('https://api.example.com/posts');
  return posts.map((post) => ({ id: post.id.toString() }));
}

export async function StaticPage() {
  // Uses { cache: 'force-cache' } implicitly
  const data = await f4next.get<Post[]>('https://api.example.com/posts');

  return (
    <div>
      <h1>Static Posts</h1>
      <ul>
        {data.map((p) => (
          <li key={p.id}>{p.title}</li>
        ))}
      </ul>
    </div>
  );
}

// -------------------------------------------------------------
// 2. Dynamic Page (SSR)
// This page is rendered on every request with fresh data
// -------------------------------------------------------------
export async function DynamicPage() {
  // Use 'ssr' shortcut
  const data = await f4next.get<Post[]>(
    'https://api.example.com/trending',
    'ssr',
  );

  return (
    <div>
      <h1>Trending Now (Live)</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

// -------------------------------------------------------------
// 3. ISR Page (Revalidation)
// This page is cached but updates in the background after 60s
// -------------------------------------------------------------
export async function ISRPage() {
  // Use 'isr' shortcut (default 60s)
  const data = await f4next.get<Post[]>('https://api.example.com/news', 'isr');

  return <div>News</div>;
}

// -------------------------------------------------------------
// 4. Custom Revalidation
// -------------------------------------------------------------
export async function CustomISRPage() {
  // Use number shortcut (seconds)
  const data = await f4next.get<Post[]>(
    'https://api.example.com/reports',
    3600,
  );

  return <div>Hourly Report</div>;
}

// -------------------------------------------------------------
// 5. Server Actions (Mutations)
// -------------------------------------------------------------
export async function createPostAction(formData: FormData) {
  'use server';

  const title = formData.get('title');

  try {
    // Basic POST request (implicitly SSG/default)
    await f4next.post('https://api.example.com/posts', { title });

    // OR: Explicitly avoid caching for mutations (Recommended)
    // await f4next.post('https://api.example.com/posts', { title }, 'ssr');

    // Revalidate usage with standard Next.js API
    // revalidatePath('/posts');
  } catch (err) {
    throw new Error('Failed to create post');
  }
}

// -------------------------------------------------------------
// 6. Update Action (PUT)
// -------------------------------------------------------------
export async function updatePostAction(id: string, formData: FormData) {
  'use server';

  const title = formData.get('title');

  try {
    // PUT with 'ssr' shortcut to prevent caching the response
    await f4next.put(`https://api.example.com/posts/${id}`, { title }, 'ssr');
  } catch (err) {
    throw new Error('Failed to update post');
  }
}

// -------------------------------------------------------------
// 7. Delete Action (DELETE)
// -------------------------------------------------------------
export async function deletePostAction(id: string) {
  'use server';

  try {
    // DELETE with 'ssr' shortcut
    await f4next.delete(`https://api.example.com/posts/${id}`, 'ssr');
  } catch (err) {
    throw new Error('Failed to delete post');
  }
}

// -------------------------------------------------------------
// 8. Custom Response Parsing (Chainable API)
// -------------------------------------------------------------
export async function customResponseParsing() {
  // 1. Text Response
  const html = await f4next.get<string>('https://google.com').text();

  // 2. Blob Response (Images, Files)
  const imageBlob = await f4next
    .get<Blob>('https://example.com/image.png')
    .blob();

  // 3. ArrayBuffer (Binary Data)
  const buffer = await f4next
    .get<ArrayBuffer>('https://example.com/data.bin')
    .arrayBuffer();

  // 4. Raw Response (Headers, Status Check)
  const response = await f4next.get('https://api.example.com/health').res();
  console.log('Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
}
