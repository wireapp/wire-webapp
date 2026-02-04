export const datadogRum = {
  init: jest.fn(),
  startSessionReplayRecording: jest.fn(),
  getInternalContext: jest.fn(() => ({session_id: 'test-session-id'})),
  setUser: jest.fn(),
};
