export default class PathValidationError extends Error {
  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, PathValidationError.prototype);

    this.message = message;
    this.name = this.constructor.name;
    this.stack = new Error().stack;
  }
}
