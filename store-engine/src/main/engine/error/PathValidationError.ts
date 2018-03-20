export default class PathValidationError extends Error {
  static get TYPE() {
    return {
      INVALID_NAME: 'Invalid file name has been detected. Aborting.',
      PATH_TRAVERSAL: 'Path traversal has been detected. Aborting.',
    };
  }

  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, PathValidationError.prototype);

    this.message = message;
    this.name = this.constructor.name;
    this.stack = new Error().stack;
  }
}
