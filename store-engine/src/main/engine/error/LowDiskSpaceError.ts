class LowDiskSpaceError extends Error {
  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, LowDiskSpaceError.prototype);

    this.message = message;
    this.name = this.constructor.name;
    this.stack = new Error().stack;
  }
}

export default LowDiskSpaceError;
