export class F4nError extends Error {
  constructor(
    public message: string,
    public status: number,
    public statusText: string,
    public response: Response,
  ) {
    super(message);
    this.name = 'F4nError';
  }
}
