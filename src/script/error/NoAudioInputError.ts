class NoAudioInputError extends Error {
  constructor(originalError: Error) {
    super(originalError.message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
  }
}

export {NoAudioInputError};
