module.exports = {
  testMatch: ['**/?(*.)+(spec|test).?([mc])[jt]s?(x)'],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'require', 'default'],
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/out-tsc/'],
  coverageReporters: ['html'],
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.{idea,git,cache,output,temp}/**',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': '@swc/jest',
    '^.+\\.(js|jsx)$': '@swc/jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(true-myth|p-timeout|p-cancelable|@sindresorhus/is)/)'],
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
};
