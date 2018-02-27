export default class RecordNotFoundError extends Error {
  public code: number;

  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, RecordNotFoundError.prototype);

    this.code = 2;
    this.message = message;
    this.name = (<any>this).constructor.name;
    this.stack = new Error().stack;
  }
}
