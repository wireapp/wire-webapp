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
    'apps/webapp/assets/',
    'resource/',
    'apps/server/bin/',
    'apps/server/dist/',
    'apps/server/node_modules/',
    'apps/webapp/src/ext/',
    'apps/webapp/src/script/localization/**/webapp*.js',
    'apps/webapp/src/worker/',
    'apps/webapp/src/script/components/Icon.tsx',
    '*.js',
    'apps/webapp/src/types/i18n.d.ts',
  ],
  parserOptions: {
    project: ['./tsconfig.eslint.json'],
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
        alwaysTryTypes: true,
        project: [__dirname + '/tsconfig.eslint.json'],
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  overrides: [
    {
      files: ['**/*.test.tsx', '**/*.test.ts', '**/*.spec.tsx', '**/*.spec.ts', '**/test/**/*', '**/mocks/**/*'],
      rules: {
        'no-magic-numbers': 'off',
        'id-length': 'off',
      },
    },
  ],
};
