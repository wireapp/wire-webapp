export default class CryptoboxError extends Error {
  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, CryptoboxError.prototype);

    this.message = message;
    this.name = (<any>this).constructor.name;
    this.stack = new Error().stack;
  }
}
