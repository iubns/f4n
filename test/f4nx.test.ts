import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { f4nx, ExtendedRequestInit } from '../src/f4nx';

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('f4nx', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
      text: async () => '{"success":true}',
      blob: async () => new Blob(['blob-content']),
      arrayBuffer: async () => new ArrayBuffer(8),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Strategies & Shortcuts', () => {
    it('should perform a simple GET request (SSG default)', async () => {
      const result = await f4nx.get('/api/test');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET',
          cache: 'force-cache',
        }),
      );
      // Default await behavior parses as JSON
      expect(result).toEqual({ success: true });
    });

    it('should support "ssr" shortcut', async () => {
      await f4nx.get('/api/ssr', 'ssr');
      const callArgs = fetchMock.mock.calls[0][1] as ExtendedRequestInit;
      expect(callArgs.cache).toBe('no-store');
    });

    it('should support "ssg" shortcut', async () => {
      await f4nx.get('/api/ssg', 'ssg');
      const callArgs = fetchMock.mock.calls[0][1] as ExtendedRequestInit;
      expect(callArgs.cache).toBe('force-cache');
    });

    it('should support "isr" string shortcut (default 60s)', async () => {
      await f4nx.get('/api/isr', 'isr');
      const callArgs = fetchMock.mock.calls[0][1] as ExtendedRequestInit;
      expect(callArgs.next?.revalidate).toBe(60);
    });

    it('should support number shortcut for ISR', async () => {
      await f4nx.get('/api/isr-custom', 300);
      const callArgs = fetchMock.mock.calls[0][1] as ExtendedRequestInit;
      expect(callArgs.next?.revalidate).toBe(300);
    });

    it('should support POST with shortcut', async () => {
      await f4nx.post('/api/post', { a: 1 }, 'ssr');
      const callArgs = fetchMock.mock.calls[0][1] as RequestInit;
      expect(callArgs.method).toBe('POST');
      expect(callArgs.cache).toBe('no-store');
      expect(callArgs.body).toBe(JSON.stringify({ a: 1 }));
    });

    it('should support POST with shortcut and options', async () => {
      await f4nx.post('/api/post', { a: 1 }, 'ssr', {
        headers: { 'X-Test': '1' },
      });
      const callArgs = fetchMock.mock.calls[0][1] as RequestInit;
      expect(callArgs.cache).toBe('no-store');
      expect((callArgs.headers as Headers).get('X-Test')).toBe('1');
    });
  });

  describe('Response Parsing (Chainable API)', () => {
    it('should allow chaining .text()', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => 'hello world',
      });
      const result = await f4nx.get('/api/text').text();
      expect(result).toBe('hello world');
    });

    it('should allow chaining .blob()', async () => {
      const result = await f4nx.get('/api/blob').blob();
      expect(result).toBeInstanceOf(Blob);
    });

    it('should allow chaining .arrayBuffer()', async () => {
      const result = await f4nx.get('/api/buffer').arrayBuffer();
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should allow chaining .res() to get raw Response', async () => {
      const result = await f4nx.get('/api/raw').res();
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
    });

    it('should throw on HTTP error (default json)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404, // status is number
        statusText: 'Not Found',
      });
      await expect(f4nx.get('/api/404')).rejects.toThrow(
        'HTTP Error: 404 Not Found',
      );
    });

    it('should throw on HTTP error (chained method)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500, // status is number, and vitest mock needs proper number
        statusText: 'Server Error',
      });
      await expect(f4nx.get('/api/500').text()).rejects.toThrow(
        'HTTP Error: 500 Server Error',
      );
    });

    it('should handle 204 No Content gracefully (default json)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204, // status is number
        text: async () => '',
      });
      const result = await f4nx.get('/api/204');
      expect(result).toEqual({});
    });
  });
});
