import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { f4n, ExtendedRequestInit, F4nError } from '../src/f4n';

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('f4n', () => {
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
      const result = await f4n.get('/api/test');
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
      await f4n.get('/api/ssr', 'ssr');
      const callArgs = fetchMock.mock.calls[0][1] as ExtendedRequestInit;
      expect(callArgs.cache).toBe('no-store');
    });

    it('should support "ssg" shortcut', async () => {
      await f4n.get('/api/ssg', 'ssg');
      const callArgs = fetchMock.mock.calls[0][1] as ExtendedRequestInit;
      expect(callArgs.cache).toBe('force-cache');
    });

    it('should support "isr" string shortcut (default 60s)', async () => {
      await f4n.get('/api/isr', 'isr');
      const callArgs = fetchMock.mock.calls[0][1] as ExtendedRequestInit;
      expect(callArgs.next?.revalidate).toBe(60);
    });

    it('should support number shortcut for ISR', async () => {
      await f4n.get('/api/isr-custom', 300);
      const callArgs = fetchMock.mock.calls[0][1] as ExtendedRequestInit;
      expect(callArgs.next?.revalidate).toBe(300);
    });

    it('should support POST with shortcut', async () => {
      await f4n.post('/api/post', { a: 1 }, 'ssr');
      const callArgs = fetchMock.mock.calls[0][1] as RequestInit;
      expect(callArgs.method).toBe('POST');
      expect(callArgs.cache).toBe('no-store');
      expect(callArgs.body).toBe(JSON.stringify({ a: 1 }));
    });

    it('should support POST with shortcut and options', async () => {
      await f4n.post('/api/post', { a: 1 }, 'ssr', {
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
      const result = await f4n.get('/api/text').text();
      expect(result).toBe('hello world');
    });

    it('should allow chaining .blob()', async () => {
      const result = await f4n.get('/api/blob').blob();
      expect(result).toBeInstanceOf(Blob);
    });

    it('should allow chaining .arrayBuffer()', async () => {
      const result = await f4n.get('/api/buffer').arrayBuffer();
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should allow chaining .res() to get raw Response', async () => {
      const result = await f4n.get('/api/raw').res();
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
    });

    it('should throw F4nError on HTTP error (default json)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      await expect(f4n.get('/api/404')).rejects.toThrow('HTTP Error: 404 Not Found');

      // Verify custom error properties
      try {
        await f4n.get('/api/404-check');
      } catch (err: any) {
        expect(err.name).toBe('F4nError');
        expect(err.status).toBe(404);
        expect(err.statusText).toBe('Not Found');
        expect(err.response).toBeDefined();
      }
    });

    it('should throw F4nError on HTTP error (chained method)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });
      await expect(f4n.get('/api/500').text()).rejects.toThrow('HTTP Error: 500 Server Error');
    });

    it('should expose response object in F4nError', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Validation failed' }),
      });

      try {
        await f4n.post('/api/users', { name: '' });
      } catch (err: any) {
        expect(err).toBeInstanceOf(F4nError);
        expect(err.status).toBe(400);
        // Verify we can access the response body
        const errorBody = await err.response.json();
        expect(errorBody).toEqual({ message: 'Validation failed' });
      }
    });

    it('should handle 204 No Content gracefully (default json)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204, // status is number
        text: async () => '',
      });
      const result = await f4n.get('/api/204');
      expect(result).toEqual({});
    });
  });

  describe('Configuration (create)', () => {
    it('should prepend baseURL to requests', async () => {
      const api = f4n.create({
        baseURL: 'https://api.example.com/v1',
      });

      await api.get('/users');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/v1/users',
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('should ignore baseURL if a full URL is provided', async () => {
      const api = f4n.create({
        baseURL: 'https://api.example.com/v1',
      });

      await api.get('https://other.com/api/users');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://other.com/api/users',
        expect.anything(),
      );
    });

    it('should merge default headers with request headers', async () => {
      const api = f4n.create({
        headers: {
          Authorization: 'Bearer token',
          'X-Global': 'true',
        },
      });

      await api.get('/test', {
        headers: {
          'X-Request': 'true',
        },
      });

      const calledHeaders = (fetchMock.mock.calls[0][1] as RequestInit)
        .headers as Headers;

      expect(calledHeaders.get('authorization')).toBe('Bearer token');
      expect(calledHeaders.get('x-global')).toBe('true');
      expect(calledHeaders.get('x-request')).toBe('true');
    });

    it('should override default headers with request headers', async () => {
      const api = f4n.create({
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await api.post(
        '/test',
        { foo: 'bar' },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const calledHeaders = (fetchMock.mock.calls[0][1] as RequestInit)
        .headers as Headers;

      // Request header should win
      expect(calledHeaders.get('content-type')).toBe(
        'application/x-www-form-urlencoded',
      );
    });
  });
});
