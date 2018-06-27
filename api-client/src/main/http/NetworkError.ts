class NetworkError extends Error {
  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, NetworkError.prototype);
    this.name = 'NetworkError';
    this.stack = new Error().stack;
  }
}

export {NetworkError};
