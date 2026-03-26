export type Strategy = 'ssr' | 'isr' | 'ssg';
export type StrategyShortcut = Strategy | number;

export interface NextFetchRequestConfig {
  revalidate?: number | false;
  tags?: string[];
}

export interface f4nOptions extends Omit<RequestInit, 'body'> {
  // Strategy can still be specified here, or via shortcut
  baseURL?: string;
  strategy?: Strategy;
  revalidate?: number;
  /**
   * Return the raw Response object instead of parsing JSON.
   * @deprecated Use .res() or .text() methods on the return chain instead.
   */
  raw?: boolean;
  next?: NextFetchRequestConfig;
}

export interface f4nResponse<T = any> {
  data: T;
  response: Response;
  error?: Error;
}

export interface f4nPromise<T> extends Promise<T> {
  /**
   * Parse the response as text.
   */
  text(): Promise<string>;

  /**
   * Parse the response as Blob.
   */
  blob(): Promise<Blob>;

  /**
   * Parse the response as ArrayBuffer.
   */
  arrayBuffer(): Promise<ArrayBuffer>;

  /**
   * Get the raw Response object.
   */
  res(): Promise<Response>;
}

export interface ExtendedRequestInit extends RequestInit {
  next?: NextFetchRequestConfig;
}

export interface F4nConfig extends ExtendedRequestInit {
  url: string;
  method: string;
}

export interface InterceptorManager<V> {
  use(
    onFulfilled?: ((value: V) => V | Promise<V>) | null,
    onRejected?: ((error: any) => any) | null,
  ): number;
  eject(id: number): void;
  forEach(
    fn: (handler: {
      fulfilled?: (value: V) => V | Promise<V>;
      rejected?: (error: any) => any;
    }) => void,
  ): void;
}

export interface F4nInterceptors {
  request: InterceptorManager<F4nConfig>;
  response: InterceptorManager<Response>;
}
