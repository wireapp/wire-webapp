// Overcomes error from jest internals.. this thing: https://github.com/facebook/jest/issues/6248
const JSDomEnvironment = require('jest-environment-jsdom');

class FixedJSDomEnvironment extends JSDomEnvironment {
  constructor(config) {
    super({
      ...config,
      ...{
        globals: {
          ...config.globals,
          ...{
            ArrayBuffer: ArrayBuffer,
            Uint32Array: Uint32Array,
            Uint8Array: Uint8Array,
          },
        },
      },
    });
  }

  async setup() {}

  async teardown() {}
}

module.exports = FixedJSDomEnvironment;
