export default class RecordTypeError extends Error {
  public code: number;

  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, RecordTypeError.prototype);

    this.code = 3;
    this.message = message;
    this.name = (<any>this).constructor.name;
    this.stack = new Error().stack;
  }
}
