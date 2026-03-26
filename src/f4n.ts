import {
  f4nOptions,
  ExtendedRequestInit,
  StrategyShortcut,
  f4nPromise,
  F4nConfig,
  InterceptorManager,
  F4nInterceptors,
} from './types.js';
import { F4nError } from './errors.js';
import { F4nInterceptorManager } from './interceptor.js';

class f4nRequest<T> implements f4nPromise<T> {
  private _promiseResolver: Promise<Response>;
  private _config: F4nConfig;

  constructor(promiseResolver: Promise<Response>, config: F4nConfig) {
    this._promiseResolver = promiseResolver;
    this._config = config;
  }

  // --- Internal Helper ---
  private async _checkOk(res: Response): Promise<Response> {
    if (!res.ok) {
      throw new F4nError(
        `HTTP Error: ${res.status} ${res.statusText}`,
        res.status,
        res.statusText,
        res,
        this._config,
      );
    }
    return res;
  }

  // --- Default JSON Implementation (Thenable) ---
  public then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    // Default parsing: JSON/Fallback Text
    const jsonPromise = this._promiseResolver
      .catch((err) => {
        // Handle network errors (e.g. DNS failure, offline)
        // These are typically TypeError thrown by fetch
        if (err instanceof F4nError) {
          throw err;
        }
        throw new F4nError(
          err instanceof Error ? err.message : 'Network Error',
          0,
          'NETWORK_ERROR',
          undefined,
          this._config,
        );
      })
      .then(async (res) => {
        await this._checkOk(res);
        if (res.status === 204) return {} as T;

        const text = await res.text();
        // If empty body, return empty object
        if (!text) return {} as T;

        try {
          return JSON.parse(text) as T;
        } catch {
          // Fallback to text if JSON parsing fails
          return text as unknown as T;
        }
      });
    return jsonPromise.then(onfulfilled, onrejected);
  }

  public catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<T | TResult> {
    return this.then(undefined, onrejected);
  }

  public finally(onfinally?: (() => void) | null): Promise<T> {
    return this.then().finally(onfinally);
  }

  public get [Symbol.toStringTag]() {
    return 'f4nPromise';
  }

  // --- Fluent Parsing Methods ---

  public async text(): Promise<string> {
    const res = await this._promiseResolver;
    await this._checkOk(res);
    return res.text();
  }

  public async blob(): Promise<Blob> {
    const res = await this._promiseResolver;
    await this._checkOk(res);
    return res.blob();
  }

  public async arrayBuffer(): Promise<ArrayBuffer> {
    const res = await this._promiseResolver;
    await this._checkOk(res);
    return res.arrayBuffer();
  }

  public async res(): Promise<Response> {
    const res = await this._promiseResolver;
    await this._checkOk(res);
    return res;
  }
}

class F4n {
  private defaultOptions: f4nOptions;
  public interceptors: F4nInterceptors;

  constructor(defaults: f4nOptions = {}) {
    this.defaultOptions = defaults;
    this.interceptors = {
      request: new F4nInterceptorManager(),
      response: new F4nInterceptorManager(),
    };
  }

  private mergeArgs(
    arg1?: StrategyShortcut | f4nOptions,
    arg2?: f4nOptions,
  ): f4nOptions {
    if (typeof arg1 === 'string' || typeof arg1 === 'number') {
      const options = arg2 || {};
      if (typeof arg1 === 'number') {
        return { ...options, strategy: 'isr', revalidate: arg1 };
      }
      return { ...options, strategy: arg1 as 'ssr' | 'ssg' | 'isr' };
    }
    return arg1 || {};
  }

  private applyStrategy(
    options: f4nOptions & { body?: any },
  ): ExtendedRequestInit {
    // Default caching strategy:
    // - For GET: 'ssg' (force-cache) to align with Next.js defaults.
    // - For others (POST, PUT, DELETE, etc): 'ssr' (no-store) for safer mutations.
    const method = options.method ? options.method.toUpperCase() : 'GET';
    const isMutation = method !== 'GET' && method !== 'HEAD';
    const defaultStrategy = isMutation ? 'ssr' : 'ssg';

    const {
      strategy = defaultStrategy,
      revalidate = 60,
      next,
      ...rest
    } = options;
    const finalOptions: ExtendedRequestInit = { ...rest };

    switch (strategy) {
      case 'ssr':
        finalOptions.cache = 'no-store';
        if (next) {
          finalOptions.next = { ...next };
          delete finalOptions.next.revalidate;
        }
        break;

      case 'isr':
        finalOptions.next = { ...next, revalidate };
        if (
          finalOptions.cache === 'force-cache' ||
          finalOptions.cache === 'no-store'
        ) {
          delete finalOptions.cache;
        }
        break;

      case 'ssg':
      default:
        finalOptions.cache = 'force-cache';
        if (next) {
          finalOptions.next = { ...next };
          delete finalOptions.next.revalidate;
        }
        break;
    }
    return finalOptions;
  }

  private request<T = unknown>(
    url: string,
    method: string,
    body?: unknown,
    options: f4nOptions = {},
  ): f4nPromise<T> {
    // 1. Handle baseURL logic
    let finalUrl = url;
    if (this.defaultOptions.baseURL && !/^https?:\/\//i.test(url)) {
      const baseURL = this.defaultOptions.baseURL.replace(/\/$/, '');
      const path = url.startsWith('/') ? url.slice(1) : url;
      finalUrl = `${baseURL}/${path}`;
    }

    // 2. Merge headers deeply
    const headers = new Headers(this.defaultOptions.headers);
    if (options.headers) {
      const requestHeaders = new Headers(options.headers);
      requestHeaders.forEach((value, key) => {
        headers.set(key, value);
      });
    }

    // 3. Combine options
    const mergedOptions: f4nOptions & { body?: any } = {
      ...this.defaultOptions, // Global defaults
      ...options, // Per-request overrides
      method,
      headers, // Use merged headers
    };

    // Auto-serialize JSON body
    if (body) {
      mergedOptions.body = JSON.stringify(body);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }

    // 4. Transform for fetch (strip custom props like baseURL, strategy, etc)
    const finalConfig = this.applyStrategy(mergedOptions);

    const config: F4nConfig = { ...finalConfig, url: finalUrl, method };

    const chain: any[] = [
      (conf: F4nConfig) => fetch(conf.url, conf),
      undefined,
    ];

    this.interceptors.request.forEach((interceptor) => {
      chain.unshift(interceptor.fulfilled, interceptor.rejected);
    });

    this.interceptors.response.forEach((interceptor) => {
      chain.push(interceptor.fulfilled, interceptor.rejected);
    });

    let promise: Promise<any> = Promise.resolve(config);

    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }

    // Return custom f4nPromise for chaining
    return new f4nRequest<T>(promise as Promise<Response>, config);
  }

  // --- Public API ---

  // Overloads for GET (no body)
  public get<T = unknown>(url: string, options?: f4nOptions): f4nPromise<T>;
  public get<T = unknown>(
    url: string,
    strategy: StrategyShortcut,
    options?: f4nOptions,
  ): f4nPromise<T>;
  public get<T = unknown>(
    url: string,
    arg1?: StrategyShortcut | f4nOptions,
    arg2?: f4nOptions,
  ): f4nPromise<T> {
    const options = this.mergeArgs(arg1, arg2);
    return this.request<T>(url, 'GET', undefined, options);
  }

  // Overloads for POST (with body)
  public post<T = unknown>(
    url: string,
    body: unknown,
    options?: f4nOptions,
  ): f4nPromise<T>;
  public post<T = unknown>(
    url: string,
    body: unknown,
    strategy: StrategyShortcut,
    options?: f4nOptions,
  ): f4nPromise<T>;
  public post<T = unknown>(
    url: string,
    body: unknown,
    arg1?: StrategyShortcut | f4nOptions,
    arg2?: f4nOptions,
  ): f4nPromise<T> {
    const options = this.mergeArgs(arg1, arg2);
    return this.request<T>(url, 'POST', body, options);
  }

  // Overloads for PUT
  public put<T = unknown>(
    url: string,
    body: unknown,
    options?: f4nOptions,
  ): f4nPromise<T>;
  public put<T = unknown>(
    url: string,
    body: unknown,
    strategy: StrategyShortcut,
    options?: f4nOptions,
  ): f4nPromise<T>;
  public put<T = unknown>(
    url: string,
    body: unknown,
    arg1?: StrategyShortcut | f4nOptions,
    arg2?: f4nOptions,
  ): f4nPromise<T> {
    const options = this.mergeArgs(arg1, arg2);
    return this.request<T>(url, 'PUT', body, options);
  }

  // Overloads for DELETE
  public delete<T = unknown>(url: string, options?: f4nOptions): f4nPromise<T>;
  public delete<T = unknown>(
    url: string,
    strategy: StrategyShortcut,
    options?: f4nOptions,
  ): f4nPromise<T>;
  public delete<T = unknown>(
    url: string,
    arg1?: StrategyShortcut | f4nOptions,
    arg2?: f4nOptions,
  ): f4nPromise<T> {
    const options = this.mergeArgs(arg1, arg2);
    return this.request<T>(url, 'DELETE', undefined, options);
  }

  // Overloads for PATCH
  public patch<T = unknown>(
    url: string,
    body: unknown,
    options?: f4nOptions,
  ): f4nPromise<T>;
  public patch<T = unknown>(
    url: string,
    body: unknown,
    strategy: StrategyShortcut,
    options?: f4nOptions,
  ): f4nPromise<T>;
  public patch<T = unknown>(
    url: string,
    body: unknown,
    arg1?: StrategyShortcut | f4nOptions,
    arg2?: f4nOptions,
  ): f4nPromise<T> {
    const options = this.mergeArgs(arg1, arg2);
    return this.request<T>(url, 'PATCH', body, options);
  }

  public create(defaults: f4nOptions): F4n {
    return new F4n(defaults);
  }
}

export const f4n = new F4n();
