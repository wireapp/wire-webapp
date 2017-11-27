export default class RecordTypeError extends Error {
  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, RecordTypeError.prototype);

    this.message = message;
    this.name = (<any>this).constructor.name;
    this.stack = new Error().stack;
  }
}
