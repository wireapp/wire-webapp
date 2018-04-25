export default class UnsupportedError extends Error {
  public code: number;

  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, UnsupportedError.prototype);

    this.code = 4;
    this.message = message;
    this.name = this.constructor.name;
    this.stack = new Error().stack;
  }
}
