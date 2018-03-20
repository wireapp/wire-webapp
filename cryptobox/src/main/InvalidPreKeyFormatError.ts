class InvalidPreKeyFormatError extends Error {
  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidPreKeyFormatError.prototype);
    this.name = this.constructor.name;
    this.message = message;
    this.stack = new Error().stack;
  }
}

export default InvalidPreKeyFormatError;
