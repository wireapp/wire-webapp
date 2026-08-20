/*
 * Wire
 * Flat ESLint configuration (ESLint 9+)
 */

import * as emotionPlugin from '@emotion/eslint-plugin';
import stylisticPlugin from '@stylistic/eslint-plugin';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import betterStyledComponentsPlugin from 'eslint-plugin-better-styled-components';
import importPlugin from 'eslint-plugin-import';
import jestPlugin from 'eslint-plugin-jest';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import noUnsanitizedPlugin from 'eslint-plugin-no-unsanitized';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import unicornPlugin from 'eslint-plugin-unicorn';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import tsParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import headerPlugin from '@tony.ganchev/eslint-plugin-header';
import globals from 'globals';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const year = new Date().getFullYear();
const repositoryRootDirectory = dirname(fileURLToPath(import.meta.url));
const runtimeGlobals = {
  ...globals.es2020,
  ...globals.browser,
  ...globals.node,
};

const ignores = [
  '.git/',
  'docs/',
  'bin/',
  '**/node_modules/',
  'apps/webapp/assets/',
  'resource/',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  'apps/webapp/resource/',
  'apps/webapp/bin/',
  '**/*.config.*',
  'apps/webapp/*.config.*',
  'apps/webapp/src/sw.js',
  'apps/server/bin/',
  'apps/server/coverage/',
  'apps/server/dist/',
  'apps/server/node_modules/',
  'apps/webapp/src/ext/',
  'apps/webapp/src/script/localization/**/webapp*.js',
  'apps/webapp/src/worker/',
  'apps/webapp/src/script/components/icon.tsx',
  '**/storybook-static/',
  '**/.storybook/',
  'apps/webapp/playwright-report/',
  'libraries/core/lib/',
  'libraries/api-client/lib/',
  'libraries/core/.tmp/',
  'libraries/config/lib/',
  'libraries/react-ui-kit/lib/',
  'libraries/*/lib/',
  'libraries/react-ui-kit/emotion.d.ts',
];

const productionFileIgnorePatterns = [
  'apps/webapp/test/**',
  'libraries/core/src/test/**',
  '**/test/**',
  '**/__mocks__/**',
  '*.js',
  '**/setupTests.*',
  '**/*.test.*',
  '**/*.spec.*',
  '**/*.stories.*',
  '**/jest.setup.*',
  'apps/webapp/.copyconfigrc.js',
  'libraries/react-ui-kit/emotion.d.ts',
];

function addProductionFileIgnores(configuration) {
  return {
    ...configuration,
    ignores: [...(configuration.ignores ?? []), ...productionFileIgnorePatterns],
  };
}

const legacySettings = {
  react: {
    version: 'detect',
  },
  'import/parsers': {
    '@typescript-eslint/parser': ['.js', '.jsx', '.ts', '.tsx'],
  },
  'import/resolver': {
    typescript: {
      alwaysTryTypes: true,
      paths: './tsconfig.json',
    },
  },
};

const legacyRules = {
  'constructor-super': 'error',
  curly: 'error',
  'header-tony/header': 'off',
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
  'no-magic-numbers': [
    'warn',
    {
      ignore: [-1, 0, 1],
      ignoreArrayIndexes: true,
      ignoreDefaultValues: true,
    },
  ],
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
  'no-nested-ternary': 'error',
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
  'jest/no-jasmine-globals': 'error',
  'jest/no-identical-title': 'warn',
  'jest/no-done-callback': 'warn',
  'jest/no-disabled-tests': 'warn',
  'jest/no-conditional-expect': 'warn',
  'jsx-a11y/media-has-caption': 'warn',
  'jsx-a11y/no-noninteractive-tabindex': 'warn',
  'react/jsx-uses-react': 'error',
  'react/jsx-uses-vars': 'error',
  'react/prefer-stateless-function': 'error',
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
  'react/no-unknown-property': ['error', {ignore: ['css']}],
  'sort-vars': 'error',
  '@typescript-eslint/require-array-sort-compare': 'warn',
  strict: ['error', 'global'],
  'unused-imports/no-unused-imports': 'error',
  'import/no-unresolved': 'error',
  'import/no-default-export': 'error',
  'import/order': [
    'error',
    {
      groups: ['external', 'builtin', 'internal', 'sibling', 'parent', 'index'],
      pathGroups: [
        {
          pattern: 'react',
          group: 'external',
          position: 'before',
        },
        {
          pattern: '@wireapp/*',
          group: 'internal',
          position: 'before',
        },
      ],
      pathGroupsExcludedImportTypes: ['react', '@wireapp/*'],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
      warnOnUnassignedImports: true,
    },
  ],
  'better-styled-components/sort-declarations-alphabetically': 2,
};

const productionPlugins = {
  '@typescript-eslint': typescriptPlugin,
  '@emotion': emotionPlugin,
  'better-styled-components': betterStyledComponentsPlugin,
  'no-unsanitized': noUnsanitizedPlugin,
  prettier: prettierPlugin,
  'react-hooks': reactHooksPlugin,
  unicorn: unicornPlugin,
  'unused-imports': unusedImportsPlugin,
  'header-tony': headerPlugin,
};
const webappImportOrderRule = [
  'error',
  {
    groups: ['external', 'builtin', 'internal', 'sibling', 'parent', 'index'],
    pathGroups: [
      {pattern: 'react', group: 'external', position: 'before'},
      {pattern: '@wireapp/*', group: 'internal', position: 'before'},
      // One group for all webapp TS path aliases — alphabetize sorts Components/…/Util/…/src/…
      {
        pattern: '{apps,Components,Hooks,I18n,Repositories,Resource,src,Util}/**',
        group: 'internal',
        position: 'after',
      },
    ],
    pathGroupsExcludedImportTypes: ['react', '@wireapp/*'],
    'newlines-between': 'always',
    alphabetize: {
      order: 'asc',
      caseInsensitive: true,
    },
    warnOnUnassignedImports: true,
  },
];

const strictBooleanExpressionsRule = [
  'error',
  {
    allowAny: false,
    allowNullableBoolean: false,
    allowNullableEnum: false,
    allowNullableNumber: false,
    allowNullableObject: false,
    allowNullableString: false,
    allowNumber: false,
    allowString: false,
  },
];

const emptyArrowFunctionRestrictions = [
  {
    selector: "ArrowFunctionExpression[async=false][body.type='BlockStatement'][body.body.length=0]",
    message: 'Use noop from noop-esm instead of an empty arrow function.',
  },
  {
    selector: "ArrowFunctionExpression[async=true][body.type='BlockStatement'][body.body.length=0]",
    message: 'Use asyncNoop from noop-esm instead of an empty async arrow function.',
  },
];

const restrictedSyntaxRule = [
  'error',
  {
    selector: "CallExpression[callee.property.name='splice']",
    message:
      'Use toSpliced() instead of splice() to avoid mutating arrays. Reassign the toSpliced() result when ordering must be preserved.',
  },
  {
    selector: "ImportDeclaration[source.value='@sindresorhus/is'] > ImportDefaultSpecifier",
    message: 'Use named imports from @sindresorhus/is instead of its default API object.',
  },
  {
    selector: "ImportDeclaration[source.value='@sindresorhus/is'] > ImportNamespaceSpecifier",
    message: 'Use named imports from @sindresorhus/is instead of a namespace import.',
  },
  ...emptyArrowFunctionRestrictions,
];

const emptyArrowFunctionRule = ['error', ...emptyArrowFunctionRestrictions];

const jestMockRestrictionRule = [
  'warn',
  {
    mock: 'Do not use jest.mock(). Pass dependencies explicitly instead of intercepting modules.',
  },
];

const jestRecommendedProductionConfig = {
  ...jestPlugin.configs['flat/recommended'],
  plugins: {},
};

const productionConfigs = [
  jestRecommendedProductionConfig,
  jsxA11yPlugin.flatConfigs.recommended,
  typescriptPlugin.configs['flat/eslint-recommended'],
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  eslintConfigPrettier,
  {
    plugins: productionPlugins,
    settings: legacySettings,
    rules: {
      ...legacyRules,
      'no-unsanitized/property': 'error',
      'no-unsanitized/method': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,cjs,mjs}'],
    plugins: {
      '@stylistic': stylisticPlugin,
    },
    rules: {
      '@stylistic/eol-last': ['error', 'always'],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // Enable type-aware linting for TypeScript sources with project references support
        projectService: true,
        tsconfigRootDir: repositoryRootDirectory,
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...runtimeGlobals,
        React: 'readonly',
        JSX: 'readonly',
        amplify: 'readonly',
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@emotion': emotionPlugin,
      'react-hooks': reactHooksPlugin,
      unicorn: unicornPlugin,
      'header-tony': headerPlugin,
    },
    rules: {
      '@emotion/pkg-renaming': 'error',
      '@emotion/no-vanilla': 'error',
      '@emotion/import-from-emotion': 'error',
      '@emotion/styled-import': 'error',
      'unicorn/no-array-reverse': 'error',
      'unicorn/no-array-sort': 'error',
      'header-tony/header': [
        'error',
        {
          header: {
            commentType: 'block',
            lines: [
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
          },
          trailingEmptyLines: {
            minimum: 2,
          },
        },
      ],
      'id-length': 'warn',
      'no-restricted-syntax': restrictedSyntaxRule,
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^(_?err(or)?|error)$',
          varsIgnorePattern: '^(_?err(or)?|error)$',
        },
      ],
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',
      '@typescript-eslint/typedef': 'off',
      'no-dupe-class-members': 'off',
      'no-unsanitized/property': 'off',
      'prefer-promise-reject-errors': 'off',
      'jest/no-jasmine-globals': 'off',
      'jsx-a11y/media-has-caption': 'off',
      'no-empty': 'error',
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
  },
  {
    files: [
      'apps/server/**/*.{ts,tsx}',
      'libraries/api-client/**/*.{ts,tsx}',
      'libraries/commons/**/*.{ts,tsx}',
      'libraries/certificate-check/**/*.{ts,tsx}',
      'libraries/core/**/*.{ts,tsx}',
      'libraries/copy-config/**/*.{ts,tsx}',
      'libraries/license-collector/**/*.{ts,tsx}',
      'libraries/store-engine/**/*.{ts,tsx}',
      'libraries/store-engine-dexie/**/*.{ts,tsx}',
      'libraries/react-ui-kit/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/strict-boolean-expressions': strictBooleanExpressionsRule,
    },
  },
  {
    files: ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
    plugins: {
      unicorn: unicornPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: null,
        tsconfigRootDir: repositoryRootDirectory,
      },
      globals: runtimeGlobals,
    },
    rules: {
      // Disable TS-only rules on JS mocks/shims
      '@typescript-eslint/require-array-sort-compare': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unicorn/no-array-reverse': 'error',
      'unicorn/no-array-sort': 'error',
      'no-restricted-syntax': restrictedSyntaxRule,
    },
  },
  {
    files: ['**/*.test.tsx', '**/*.test.ts', '**/*.spec.tsx', '**/*.spec.ts', '**/test/**/*', '**/mocks/**/*'],
    rules: {
      'no-magic-numbers': 'off',
      'id-length': 'off',
    },
  },
  {
    files: ['apps/webapp/**/*.{ts,tsx}'],
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './apps/webapp/tsconfig.json',
        },
      },
    },
    rules: {
      '@typescript-eslint/strict-boolean-expressions': 'off',
      // Webapp path aliases (Util/*, Components/*, …) resolve to lowercase dirs on disk.
      'import/no-unresolved': ['error', {caseSensitive: false}],
      // Pin alias import order so Linux CI and macOS agree on webapp path aliases.
      'import/order': webappImportOrderRule,
    },
  },
  {
    files: ['libraries/react-ui-kit/**/*.{ts,tsx}'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    files: [
      'apps/webapp/src/script/components/Modals/PrimaryModal/**/*.{ts,tsx}',
      'apps/webapp/src/script/components/Modals/LeaveGroupAdminModal/**/*.{ts,tsx}',
      'apps/webapp/src/script/components/Modals/QualityFeedbackModal/**/*.{ts,tsx}',
      'apps/webapp/src/script/components/Modals/DetailViewModal/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'src/script/page/RootProvider',
              importNames: ['useApplicationContext'],
              message: 'This modal is rendered outside RootProvider. Pass required dependencies explicitly instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/webapp/src/script/page/components/WindowTitleUpdater.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'src/script/page/RootProvider',
              importNames: ['useApplicationContext'],
              message:
                'This component is rendered outside RootProvider. Pass required dependencies explicitly instead.',
            },
            {
              name: '../RootProvider',
              importNames: ['useApplicationContext'],
              message:
                'This component is rendered outside RootProvider. Pass required dependencies explicitly instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'apps/webapp/src/script/components/Badge/components/VerificationBadges/VerificationBadges.tsx',
      'apps/webapp/src/script/components/Cells/common/useCellPublicLink/useCellPublicLink.ts',
      'apps/webapp/src/script/components/CellsGlobalView/CellsGlobalView.tsx',
      'apps/webapp/src/script/components/CellsGlobalView/CellsHeader/CellsFilters/CellsFiltersMenu/CellsFiltersMenu.tsx',
      'apps/webapp/src/script/components/CellsGlobalView/CellsHeader/CellsFilters/CellsFiltersMenu/useGetAllTags/useGetAllTags.ts',
      'apps/webapp/src/script/components/CellsGlobalView/CellsTable/CellsTableColumns/CellsShareModal/CellsShareModal.tsx',
      'apps/webapp/src/script/components/CellsGlobalView/CellsTable/CellsTableColumns/CellsTableRowOptions/CellsTableRowOptions.tsx',
      'apps/webapp/src/script/components/CellsGlobalView/useSearchCellsNodes/useSearchCellsNodes.ts',
      'apps/webapp/src/script/components/ConfigToolbar/ConfigToolbar.tsx',
      'apps/webapp/src/script/components/Conversation/Conversation.tsx',
      'apps/webapp/src/script/components/Conversation/ConversationCells/ConversationCells.tsx',
      'apps/webapp/src/script/components/Conversation/ConversationCells/CellsTable/CellsTableColumns/CellsNodeShareModal/CellsNodeShareModal.tsx',
      'apps/webapp/src/script/components/Conversation/ConversationCells/CellsTable/CellsTableColumns/CellsTableRowOptions/CellsMoveNodeModal/CellsMoveNodeModal.tsx',
      'apps/webapp/src/script/components/Conversation/ConversationCells/CellsTable/CellsTableColumns/CellsTableRowOptions/CellsMoveNodeModal/useGetCellsFolders/useGetCellsFolders.ts',
      'apps/webapp/src/script/components/Conversation/ConversationCells/CellsTable/CellsTableColumns/CellsTableRowOptions/CellsTableRowOptions.tsx',
      'apps/webapp/src/script/components/Conversation/ConversationCells/CellsTable/CellsTableColumns/CellsTableRowOptions/CellsTagsModal/useTagsManagement/useGetAllTags/useGetAllTags.ts',
      'apps/webapp/src/script/components/Conversation/ConversationCells/CellsTable/CellsTableColumns/CellsTableRowOptions/CellsTagsModal/useTagsManagement/useTagsManagement.ts',
      'apps/webapp/src/script/components/Conversation/ConversationCells/common/useGetAllTags/useGetAllTags.ts',
      'apps/webapp/src/script/components/Conversation/ConversationCells/useConversationSearch/useConversationSearchFiles.ts',
      'apps/webapp/src/script/components/Conversation/ConversationCells/useGetAllCellsNodes/useGetAllCellsNodes.ts',
      'apps/webapp/src/script/components/Conversation/ConversationCells/useRefreshCellsState/useRefreshCellsState.ts',
      'apps/webapp/src/script/components/FileFullscreenModal/FileEditor/FileEditor.tsx',
      'apps/webapp/src/script/components/InputBar/InputBar.tsx',
      'apps/webapp/src/script/components/InputBar/FilePreviews/useFilePreview/useFilePreview.ts',
      'apps/webapp/src/script/components/InputBar/usePing/usePing.ts',
      'apps/webapp/src/script/components/InputBar/useMessageHandling/useDraftState/useDraftState.ts',
      'apps/webapp/src/script/components/MessagesList/Message/ContentMessage/asset/common/useGetAssetUrl/useGetAssetUrl.ts',
      'apps/webapp/src/script/components/MessagesList/Message/ContentMessage/asset/MultipartAssets/MultipartAssets.tsx',
      'apps/webapp/src/script/components/MessagesList/Message/ContentMessage/asset/MultipartAssets/useGetMultipartAsset/useGetMultipartAsset.ts',
      'apps/webapp/src/script/components/MessagesList/Message/MessageWrapper.tsx',
      'apps/webapp/src/script/components/MessagesList/VirtualizedMessagesList/VirtualizedMessagesList.tsx',
      'apps/webapp/src/script/components/MessagesList/VirtualizedMessagesList/useLoadMessages.ts',
      'apps/webapp/src/script/components/MessagesList/utils/useLoadConversation.ts',
      'apps/webapp/src/script/components/Modals/FileHistoryModal/FileVersionItem.tsx',
      'apps/webapp/src/script/components/Modals/FileHistoryModal/hooks/useFileVersions.ts',
      'apps/webapp/src/script/components/Modals/DetailViewModal/DetailViewModalFooter.tsx',
      'apps/webapp/src/script/components/UserSearchableList/UserSearchableList.tsx',
      'apps/webapp/src/script/components/calling/CallingCell/CallingCell.tsx',
      'apps/webapp/src/script/components/calling/CallingOverlayContainer.tsx',
      'apps/webapp/src/script/components/calling/FullscreenVideoCall.tsx',
    ],
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      'no-void': 'error',
    },
  },
].map(addProductionFileIgnores);

const testTypeScriptFilePatterns = [
  'apps/**/test/**/*.ts',
  'libraries/**/test/**/*.ts',
  'apps/**/__mocks__/**/*.ts',
  'libraries/**/__mocks__/**/*.ts',
  'apps/**/*.test.ts',
  'libraries/**/*.test.ts',
  'apps/**/*.test.*.ts',
  'libraries/**/*.test.*.ts',
  'apps/**/*.spec.ts',
  'libraries/**/*.spec.ts',
  'apps/**/*.spec.*.ts',
  'libraries/**/*.spec.*.ts',
  'apps/**/*.stories.ts',
  'libraries/**/*.stories.ts',
  'apps/**/*.stories.*.ts',
  'libraries/**/*.stories.*.ts',
  'apps/**/setupTests.ts',
  'libraries/**/setupTests.ts',
  'apps/**/jest.setup.ts',
  'libraries/**/jest.setup.ts',
  'tools/**/*.test.ts',
];

const testTsxFilePatterns = testTypeScriptFilePatterns.map(filePattern => filePattern.replaceAll('.ts', '.tsx'));

const testJavaScriptFilePatterns = [
  'apps/**/test/**/*.js',
  'libraries/**/test/**/*.js',
  'apps/**/__mocks__/**/*.js',
  'libraries/**/__mocks__/**/*.js',
  'apps/**/*.test.js',
  'libraries/**/*.test.js',
  'apps/**/*.test.*.js',
  'libraries/**/*.test.*.js',
  'apps/**/*.spec.js',
  'libraries/**/*.spec.js',
  'apps/**/*.spec.*.js',
  'libraries/**/*.spec.*.js',
  'apps/**/*.stories.js',
  'libraries/**/*.stories.js',
  'apps/**/*.stories.*.js',
  'libraries/**/*.stories.*.js',
  'apps/**/setupTests.js',
  'libraries/**/setupTests.js',
  'apps/**/jest.setup.js',
  'libraries/**/jest.setup.js',
  'apps/**/test/**/*.cjs',
  'libraries/**/test/**/*.cjs',
  'apps/**/__mocks__/**/*.cjs',
  'libraries/**/__mocks__/**/*.cjs',
  'apps/**/*.test.cjs',
  'libraries/**/*.test.cjs',
  'apps/**/*.test.*.cjs',
  'libraries/**/*.test.*.cjs',
  'apps/**/*.spec.cjs',
  'libraries/**/*.spec.cjs',
  'apps/**/*.spec.*.cjs',
  'libraries/**/*.spec.*.cjs',
  'apps/**/*.stories.cjs',
  'libraries/**/*.stories.cjs',
  'apps/**/*.stories.*.cjs',
  'libraries/**/*.stories.*.cjs',
  'apps/**/setupTests.cjs',
  'libraries/**/setupTests.cjs',
  'apps/**/jest.setup.cjs',
  'libraries/**/jest.setup.cjs',
  'apps/**/test/**/*.mjs',
  'libraries/**/test/**/*.mjs',
  'apps/**/__mocks__/**/*.mjs',
  'libraries/**/__mocks__/**/*.mjs',
  'apps/**/*.test.mjs',
  'libraries/**/*.test.mjs',
  'apps/**/*.test.*.mjs',
  'libraries/**/*.test.*.mjs',
  'apps/**/*.spec.mjs',
  'libraries/**/*.spec.mjs',
  'apps/**/*.spec.*.mjs',
  'libraries/**/*.spec.*.mjs',
  'apps/**/*.stories.mjs',
  'libraries/**/*.stories.mjs',
  'apps/**/*.stories.*.mjs',
  'libraries/**/*.stories.*.mjs',
  'apps/**/setupTests.mjs',
  'libraries/**/setupTests.mjs',
  'apps/**/jest.setup.mjs',
  'libraries/**/jest.setup.mjs',
];

const testJsxFilePatterns = testJavaScriptFilePatterns.map(filePattern => filePattern.replaceAll('.js', '.jsx'));

const repositoryLinterOptions = {
  reportUnusedDisableDirectives: 'error',
};

const testLinterOptions = {
  reportUnusedInlineConfigs: 'error',
};

const config = [
  {ignores},
  {linterOptions: repositoryLinterOptions},
  ...productionConfigs,
  {
    files: testTypeScriptFilePatterns,
    linterOptions: testLinterOptions,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    files: testTsxFilePatterns,
    linterOptions: testLinterOptions,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    files: testJavaScriptFilePatterns,
    linterOptions: testLinterOptions,
  },
  {
    files: testJsxFilePatterns,
    linterOptions: testLinterOptions,
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    files: [
      ...testTypeScriptFilePatterns,
      ...testTsxFilePatterns,
      ...testJavaScriptFilePatterns,
      ...testJsxFilePatterns,
    ],
    rules: {
      'no-restricted-syntax': emptyArrowFunctionRule,
    },
  },
  {
    files: ['tools/**/*.{js,jsx,ts,tsx,cjs,mjs}'],
    plugins: {
      jest: jestPlugin,
    },
  },
  {
    files: ['apps/**/*.{js,jsx,ts,tsx,cjs,mjs}', 'libraries/**/*.{js,jsx,ts,tsx,cjs,mjs}'],
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      'jest/no-restricted-jest-methods': jestMockRestrictionRule,
    },
  },
];

export default config;
