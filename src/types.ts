export type Strategy = 'ssr' | 'isr' | 'ssg';
export type StrategyShortcut = Strategy | number;

export interface NextFetchRequestConfig {
  revalidate?: number | false;
  tags?: string[];
}

export interface F4nOptions extends Omit<RequestInit, 'body'> {
  // Strategy can still be specified here, or via shortcut
  strategy?: Strategy;
  revalidate?: number;
  /**
   * Return the raw Response object instead of parsing JSON.
   * @deprecated Use .res() or .text() methods on the return chain instead.
   */
  raw?: boolean;
  next?: NextFetchRequestConfig;
}

export interface F4nResponse<T = any> {
  data: T;
  response: Response;
  error?: Error;
}

export interface F4nPromise<T> extends Promise<T> {
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
