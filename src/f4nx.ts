import {
  f4nxOptions,
  ExtendedRequestInit,
  StrategyShortcut,
  f4nxPromise,
} from './types.js';

class f4nxRequest<T> implements f4nxPromise<T> {
  private _url: string;
  private _config: RequestInit;
  private _promiseResolver: Promise<Response>;

  constructor(url: string, config: RequestInit) {
    this._url = url;
    this._config = config;
    this._promiseResolver = fetch(url, config);
  }

  // --- Internal Helper ---
  private async _checkOk(res: Response): Promise<Response> {
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
    }
    return res;
  }

  // --- Default JSON Implementation (Thenable) ---
  public then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    // Default parsing: JSON/Fallback Text
    const jsonPromise = this._promiseResolver.then(async (res) => {
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
    return 'f4nxPromise';
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

class F4nx {
  private defaultOptions: f4nxOptions;

  constructor(defaults: f4nxOptions = {}) {
    this.defaultOptions = defaults;
  }

  private mergeArgs(
    arg1?: StrategyShortcut | f4nxOptions,
    arg2?: f4nxOptions,
  ): f4nxOptions {
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
    options: f4nxOptions & { body?: any },
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
    options: f4nxOptions = {},
  ): f4nxPromise<T> {
    const mergedOptions: f4nxOptions & { body?: any } = {
      ...this.defaultOptions, // Global defaults
      ...options, // Per-request overrides
      method,
    };

    const headers = new Headers(mergedOptions.headers);

    // Auto-serialize JSON body
    if (body) {
      mergedOptions.body = JSON.stringify(body);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }
    mergedOptions.headers = headers;

    const finalConfig = this.applyStrategy(mergedOptions);

    // Return custom f4nxPromise for chaining
    return new f4nxRequest<T>(url, finalConfig);
  }

  // --- Public API ---

  // Overloads for GET (no body)
  public get<T = unknown>(url: string, options?: f4nxOptions): f4nxPromise<T>;
  public get<T = unknown>(
    url: string,
    strategy: StrategyShortcut,
    options?: f4nxOptions,
  ): f4nxPromise<T>;
  public get<T = unknown>(
    url: string,
    arg1?: StrategyShortcut | f4nxOptions,
    arg2?: f4nxOptions,
  ): f4nxPromise<T> {
    const options = this.mergeArgs(arg1, arg2);
    return this.request<T>(url, 'GET', undefined, options);
  }

  // Overloads for POST (with body)
  public post<T = unknown>(
    url: string,
    body: unknown,
    options?: f4nxOptions,
  ): f4nxPromise<T>;
  public post<T = unknown>(
    url: string,
    body: unknown,
    strategy: StrategyShortcut,
    options?: f4nxOptions,
  ): f4nxPromise<T>;
  public post<T = unknown>(
    url: string,
    body: unknown,
    arg1?: StrategyShortcut | f4nxOptions,
    arg2?: f4nxOptions,
  ): f4nxPromise<T> {
    const options = this.mergeArgs(arg1, arg2);
    return this.request<T>(url, 'POST', body, options);
  }

  // Overloads for PUT
  public put<T = unknown>(
    url: string,
    body: unknown,
    options?: f4nxOptions,
  ): f4nxPromise<T>;
  public put<T = unknown>(
    url: string,
    body: unknown,
    strategy: StrategyShortcut,
    options?: f4nxOptions,
  ): f4nxPromise<T>;
  public put<T = unknown>(
    url: string,
    body: unknown,
    arg1?: StrategyShortcut | f4nxOptions,
    arg2?: f4nxOptions,
  ): f4nxPromise<T> {
    const options = this.mergeArgs(arg1, arg2);
    return this.request<T>(url, 'PUT', body, options);
  }

  // Overloads for DELETE
  public delete<T = unknown>(
    url: string,
    options?: f4nxOptions,
  ): f4nxPromise<T>;
  public delete<T = unknown>(
    url: string,
    strategy: StrategyShortcut,
    options?: f4nxOptions,
  ): f4nxPromise<T>;
  public delete<T = unknown>(
    url: string,
    arg1?: StrategyShortcut | f4nxOptions,
    arg2?: f4nxOptions,
  ): f4nxPromise<T> {
    const options = this.mergeArgs(arg1, arg2);
    return this.request<T>(url, 'DELETE', undefined, options);
  }

  // Overloads for PATCH
  public patch<T = unknown>(
    url: string,
    body: unknown,
    options?: f4nxOptions,
  ): f4nxPromise<T>;
  public patch<T = unknown>(
    url: string,
    body: unknown,
    strategy: StrategyShortcut,
    options?: f4nxOptions,
  ): f4nxPromise<T>;
  public patch<T = unknown>(
    url: string,
    body: unknown,
    arg1?: StrategyShortcut | f4nxOptions,
    arg2?: f4nxOptions,
  ): f4nxPromise<T> {
    const options = this.mergeArgs(arg1, arg2);
    return this.request<T>(url, 'PATCH', body, options);
  }

  public create(defaults: f4nxOptions): F4nx {
    return new F4nx(defaults);
  }
}

export const f4nx = new F4nx();
