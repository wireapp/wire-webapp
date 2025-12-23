module.exports = {
  extends: ['@wireapp/eslint-config'],
  env: {
    jasmine: true,
  },
  globals: {
    React: 'readonly',
    JSX: 'readonly',
    amplify: 'readonly',
  },
  ignorePatterns: [
    '.git/',
    'docs/',
    'bin/',
    '**/node_modules/',
    'assets/',
    'resource/',
    'server/bin/',
    'server/dist/',
    'server/node_modules/',
    'src/ext/',
    'src/script/localization/**/webapp*.js',
    'src/worker/',
    'src/script/components/Icon.tsx',
    '*.js',
    'src/types/i18n.d.ts',
    'test/',
  ],
  parserOptions: {
    project: ['./tsconfig.build.json', './server/tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@emotion', 'import'],
  rules: {
    '@emotion/pkg-renaming': 'error',
    '@emotion/no-vanilla': 'error',
    '@emotion/import-from-emotion': 'error',
    '@emotion/styled-import': 'error',
    'id-length': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/typedef': 'off',
    'no-dupe-class-members': 'off',
    'no-unsanitized/property': 'off',
    'prefer-promise-reject-errors': 'off',
    'valid-jsdoc': 'off',
    'jest/no-jasmine-globals': 'off',
    'jsx-a11y/media-has-caption': 'off',
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: [__dirname + '/tsconfig.build.json', __dirname + './server/tsconfig.json'],
      },
    },
  },
  overrides: [
    {
      files: ['**/*.test.tsx', '**/*.test.ts', '**/test/**/*', '**/mocks/**/*'],
      rules: {
        'no-magic-numbers': 'off',
        'id-length': 'off',
      },
    },
  ],
};
