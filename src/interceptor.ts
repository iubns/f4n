// src/interceptor.ts
import { InterceptorManager } from './types.js';

export class F4nInterceptorManager<V> implements InterceptorManager<V> {
  private handlers: Array<{
    fulfilled?: (value: V) => V | Promise<V>;
    rejected?: (error: any) => any;
  } | null> = [];

  public use(
    onFulfilled?: ((value: V) => V | Promise<V>) | null,
    onRejected?: ((error: any) => any) | null,
  ): number {
    this.handlers.push({
      fulfilled: onFulfilled as any,
      rejected: onRejected as any,
    });
    return this.handlers.length - 1;
  }

  public eject(id: number): void {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  public forEach(
    fn: (handler: {
      fulfilled?: (value: V) => V | Promise<V>;
      rejected?: (error: any) => any;
    }) => void,
  ): void {
    this.handlers.forEach((h) => {
      if (h !== null) {
        fn(h);
      }
    });
  }
}
