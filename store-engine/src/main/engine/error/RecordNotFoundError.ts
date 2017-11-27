export default class RecordNotFoundError extends Error {
  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, RecordNotFoundError.prototype);

    this.message = message;
    this.name = (<any>this).constructor.name;
    this.stack = new Error().stack;
  }
}
