const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.{idea,git,cache,output,temp}/**',
  ],
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
};
