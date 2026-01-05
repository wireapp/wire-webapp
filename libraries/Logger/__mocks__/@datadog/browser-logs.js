export const datadogLogs = {
  init: jest.fn(),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  setUser: jest.fn(),
};
