const year = new Date().getFullYear();

module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: true
  },
  extends: [
    "plugin:jest/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "prettier",
    "plugin:import/recommended",
    "plugin:import/typescript",
    'plugin:react/recommended',
    'plugin:no-unsanitized/DOM',
    'plugin:react/jsx-runtime',
  ],
  ignorePatterns: [
    ".git/",
    "docs/",
    "bin/",
    "**/node_modules/",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: ".",
    sourceType: "module",
    project: ["./tsconfig.json"]
  },
  plugins: [
    'jsdoc',
    'no-unsanitized',
    'prettier',
    'react',
    'react-hooks',
    'header',
    "import",
    "react-hooks",
    "eslint-plugin-testing-library",
    "@typescript-eslint",
    'unused-imports',
    "eslint-plugin-jest-dom",
    "better-styled-components"
  ],
  rules: {
    'constructor-super': 'error',
    curly: 'error',
    'header/header': [
      'error',
      'block',
      [
        '',
        ' * Wire',
        {
          pattern: ' \\* Copyright \\(C\\) \\d{4} Wire Swiss GmbH',
          template: ` * Copyright (C) ${year} Wire Swiss GmbH`,
        },
        ' *',
        ' * This program is free software: you can redistribute it and/or modify',
        ' * it under the terms of the GNU General Public License as published by',
        ' * the Free Software Foundation, either version 3 of the License, or',
        ' * (at your option) any later version.',
        ' *',
        ' * This program is distributed in the hope that it will be useful,',
        ' * but WITHOUT ANY WARRANTY; without even the implied warranty of',
        ' * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the',
        ' * GNU General Public License for more details.',
        ' *',
        ' * You should have received a copy of the GNU General Public License',
        ' * along with this program. If not, see http://www.gnu.org/licenses/.',
        ' *',
        ' ',
      ],
      2,
    ],
    'no-cond-assign': 'error',
    'no-console': [
      'error',
      {
        allow: ['error', 'info', 'warn'],
      },
    ],
    'no-const-assign': 'error',
    'no-dupe-class-members': 'error',
    'no-duplicate-case': 'error',
    'no-else-return': 'error',
    'no-inner-declarations': 'error',
    'no-lonely-if': 'error',
    "no-magic-numbers": ["warn", {
      "ignore": [-1, 0, 1],
      "ignoreArrayIndexes": true,
      "ignoreDefaultValues": true
    }],
    'no-restricted-globals': [
      'warn',
      {
        message: 'Do not commit `fit`. Use `it` instead.',
        name: 'fit',
      },
      {
        message: 'Do not commit `fdescribe`. Use `describe` instead.',
        name: 'fdescribe',
      },
    ],
    'no-sequences': 'error',
    'no-sparse-arrays': 'error',
    'no-trailing-spaces': 'error',
    'no-undef': 'error',
    'no-unneeded-ternary': 'error',
    'no-unused-expressions': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'none',
      },
    ],
    'no-useless-return': 'error',
    'no-var': 'error',
    'one-var': ['error', 'never'],
    'prefer-arrow-callback': 'error',
    'prefer-const': 'error',
    'prefer-object-spread': 'error',
    'prefer-promise-reject-errors': 'error',
    'prefer-spread': 'error',
    'prefer-template': 'error',
    'prettier/prettier': 'error',
    "jest/no-jasmine-globals": "error",
    "jest/no-identical-title": "warn",
    "jest/no-done-callback": "warn",
    "jest/no-disabled-tests": "warn",
    "jest/no-conditional-expect": "warn",
    "jsx-a11y/media-has-caption": "warn",
    "jsx-a11y/no-noninteractive-tabindex": "warn",
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    'react/prefer-stateless-function': 'error',
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "react/no-unknown-property": ["error", { "ignore": ["css"] }],
    'sort-vars': 'error',
    strict: ['error', 'global'],
    "unused-imports/no-unused-imports": "error",
    "import/no-unresolved": "error",
    "import/no-default-export": "error",
    "import/order": [
      "error",
      {
        "groups": ["external", "builtin", "internal", "sibling", "parent", "index"],
        "pathGroups": [
          {
            "pattern": "react",
            "group": "external",
            "position": "before"
          },
          {
            "pattern": "@wireapp/*",
            "group": "internal",
            "position": "before"
          }
        ],
        "pathGroupsExcludedImportTypes": ["react", "@wireapp/*"],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        },
        "warnOnUnassignedImports": true
      }
    ],
    "better-styled-components/sort-declarations-alphabetically": 2,
    'valid-jsdoc': [
      'error',
      {
        prefer: {
          class: 'class',
          return: 'returns',
        },
        preferType: {
          Boolean: 'boolean',
          Number: 'number',
          object: 'Object',
          String: 'string',
        },
        requireParamDescription: true,
        requireReturnDescription: true,
      },
    ],
  },
  settings: {
    react: {
      version: "detect"
    },
    "import/parsers": {
      "@typescript-eslint/parser": [".js", ".jsx", ".ts", ".tsx"]
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
        paths: "./tsconfig.json"
      }
    }
  },
}
