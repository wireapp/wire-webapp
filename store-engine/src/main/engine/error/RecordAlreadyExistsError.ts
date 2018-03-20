export default class RecordAlreadyExistsError extends Error {
  public code: number;

  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, RecordAlreadyExistsError.prototype);

    this.code = 1;
    this.message = message;
    this.name = this.constructor.name;
    this.stack = new Error().stack;
  }
}
