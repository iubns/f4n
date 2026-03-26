import { F4nConfig } from './types.js';

export class F4nError extends Error {
  constructor(
    public message: string,
    public status: number,
    public statusText: string,
    public response?: Response,
    public config?: F4nConfig,
  ) {
    super(message);
    this.name = 'F4nError';
  }
}
