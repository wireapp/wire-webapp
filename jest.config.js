const isContinuousIntegrationEnvironment = process.env.CI === 'true';
const reporters = isContinuousIntegrationEnvironment
  ? ['github-actions', 'summary']
  : [['jest-silent-reporter', {showPaths: true, showWarnings: true, useDots: true}], 'summary'];

module.exports = {
  cacheDirectory: '<rootDir>/target/jest/cache',
  coverageDirectory: '<rootDir>/target/coverage',
  coverageReporters: ['html', 'lcov', 'text-summary'],
  maxWorkers: 2,
  projects: [
    '<rootDir>/apps/*/jest.config.*',
    '<rootDir>/libraries/*/jest.config.js',
    '<rootDir>/tools/jest.config.js',
  ],
  reporters,
};
