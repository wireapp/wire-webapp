export class InvalidPreKeyFormatError extends Error {
  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidPreKeyFormatError.prototype);
    this.name = (<any>this).constructor.name;
    this.message = message;
    this.stack = new Error().stack;
  }
}
