/**
 * Usage Examples for Next.js App Router
 *
 * This file demonstrates how to use f4n in a typical Next.js application.
 */

import { f4n } from 'f4n';

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
  const posts = await f4n.get<Post[]>('https://api.example.com/posts');
  return posts.map((post) => ({ id: post.id.toString() }));
}

export async function StaticPage() {
  // Uses { cache: 'force-cache' } implicitly
  const data = await f4n.get<Post[]>('https://api.example.com/posts');

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
  const data = await f4n.get<Post[]>('https://api.example.com/trending', 'ssr');

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
  const data = await f4n.get<Post[]>('https://api.example.com/news', 'isr');

  return <div>News</div>;
}

// -------------------------------------------------------------
// 4. Custom Revalidation
// -------------------------------------------------------------
export async function CustomISRPage() {
  // Use number shortcut (seconds)
  const data = await f4n.get<Post[]>('https://api.example.com/reports', 3600);

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
    await f4n.post('https://api.example.com/posts', { title });

    // OR: Explicitly avoid caching for mutations (Recommended)
    // await f4n.post('https://api.example.com/posts', { title }, 'ssr');

    // Revalidate usage with standard Next.js API
    // revalidatePath('/posts');
  } catch (err) {
    throw new Error('Failed to create post');
  }
}

// -------------------------------------------------------------
// 6. Update Action (PUT)
// -------------------------------------------------------------
export async function updatePost(id: string, formData: FormData) {
  'use server';
  const title = formData.get('title');
  await f4n.put(`https://api.example.com/posts/${id}`, { title });
}

// -------------------------------------------------------------
// 7. Interceptors (Advanced)
// -------------------------------------------------------------
// You can set up interceptors globally, e.g., in a separate configuration file
// or at the top of your application entry point.

// Request Interceptor
f4n.interceptors.request.use((config) => {
  // Add auth token to every request
  config.headers = new Headers(config.headers);
  config.headers.set('Authorization', 'Bearer my-token');
  console.log(`[Request] ${config.method} ${config.url}`);
  return config;
});

// Response Interceptor
f4n.interceptors.response.use(
  (response) => {
    // Modify response or just log
    console.log(`[Response] ${response.status}`);
    return response;
  },
  async (error) => {
    // Handle global errors (e.g., 401 Unauthorized)
    const originalRequest = error.config;
    if (error.status === 401 && originalRequest && !originalRequest._retry) {
      console.log('Token expired, refreshing...');
      // Mark as retried to avoid infinite loops
      originalRequest._retry = true;

      // ... Perform token refresh logic here ...
      // await f4n.post('/refresh-token', {});

      // Retry original request
      // return f4n.request(originalRequest.url, originalRequest.method, originalRequest.body, originalRequest);
    }
    return Promise.reject(error);
  },
);

// -------------------------------------------------------------
export async function updatePostAction(id: string, formData: FormData) {
  'use server';

  const title = formData.get('title');

  try {
    // PUT with 'ssr' shortcut to prevent caching the response
    await f4n.put(`https://api.example.com/posts/${id}`, { title }, 'ssr');
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
    await f4n.delete(`https://api.example.com/posts/${id}`, 'ssr');
  } catch (err) {
    throw new Error('Failed to delete post');
  }
}

// -------------------------------------------------------------
// 8. Custom Response Parsing (Chainable API)
// -------------------------------------------------------------
export async function customResponseParsing() {
  // 1. Text Response
  const html = await f4n.get<string>('https://google.com').text();

  // 2. Blob Response (Images, Files)
  const imageBlob = await f4n.get<Blob>('https://example.com/image.png').blob();

  // 3. ArrayBuffer (Binary Data)
  const buffer = await f4n
    .get<ArrayBuffer>('https://example.com/data.bin')
    .arrayBuffer();

  // 4. Raw Response (Headers, Status Check)
  const response = await f4n.get('https://api.example.com/health').res();
  console.log('Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
}

// -------------------------------------------------------------
// 9. Advanced Configuration with f4n.create()
// -------------------------------------------------------------
// Create a reusable instance with baseURL and default headers
const api = f4n.create({
  baseURL: 'https://api.example.com/v1',
  headers: {
    Authorization: 'Bearer my-secret-token',
    'Content-Type': 'application/json',
  },
  // Set default strategy for this instance
  strategy: 'isr',
  revalidate: 60,
});

export async function ProfilePage() {
  // Uses baseURL: https://api.example.com/v1/me
  // Merged headers: Authorization + Content-Type
  const user = await api.get<any>('/me');

  // Override specific headers (merged deeply)
  const posts = await api.get<Post[]>('/posts', 'ssr', {
    headers: { 'X-Custom-Time': 'now' },
  });

  return (
    <div>
      <h1>User: {user.name}</h1>
    </div>
  );
}
