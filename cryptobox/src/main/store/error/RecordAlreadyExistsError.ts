export default class RecordAlreadyExistsError extends Error {
  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, RecordAlreadyExistsError.prototype);

    this.message = message;
    this.name = (<any>this).constructor.name;
    this.stack = new Error().stack;
  }
}
