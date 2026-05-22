/*
 * Wire
 * Flat ESLint configuration (ESLint 9+)
 */

import {FlatCompat} from '@eslint/eslintrc';
// @ts-ignore - No types available for @emotion/eslint-plugin with ESLint 9
import emotionPlugin from '@emotion/eslint-plugin';
import stylisticPlugin from '@stylistic/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import unicornPlugin from 'eslint-plugin-unicorn';
import tsParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import headerPlugin, {HeaderOptions, HeaderRuleConfig} from '@tony.ganchev/eslint-plugin-header';
import globals from 'globals';
import type {Linter} from 'eslint';

const year = new Date().getFullYear();
const runtimeGlobals = {
  ...globals.es2020,
  ...globals.browser,
  ...globals.node,
};

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

const ignores = [
  '.git/',
  'docs/',
  'bin/',
  '**/node_modules/',
  'apps/webapp/assets/',
  'resource/',
  'apps/webapp/resource/',
  'apps/webapp/test/',
  '**/__mocks__/**',
  '**/setupTests.*',
  '**/*.config.*',
  'apps/webapp/*.config.*',
  'apps/webapp/src/sw.js',
  'apps/server/bin/',
  'apps/server/dist/',
  'apps/server/node_modules/',
  'apps/webapp/src/ext/',
  'apps/webapp/src/script/localization/**/webapp*.js',
  'apps/webapp/src/worker/',
  'apps/webapp/src/script/components/icon.tsx',
  '**/*.test.*',
  '**/*.spec.*',
  '**/*.stories.*',
  '**/storybook-static/',
  '**/.storybook/',
  '*.js',
  'apps/webapp/playwright-report/',
  'libraries/core/lib/',
  'libraries/api-client/lib/',
  'libraries/core/.tmp/',
  'libraries/core/src/test/',
  'libraries/config/lib/',
  'libraries/react-ui-kit/lib/',
  'libraries/*/lib/',
  '**/jest.setup.ts',
];

const base = compat.extends('@wireapp/eslint-config');
// Remove 'project' from parserOptions in all base configs to avoid conflict with projectService
const cleanedBase = base.map(cfg => {
  if (cfg.languageOptions?.parserOptions) {
    const parserOptions = cfg.languageOptions.parserOptions as Record<string, unknown>;
    const {project, ...rest} = parserOptions;
    return {
      ...cfg,
      languageOptions: {
        ...cfg.languageOptions,
        parserOptions: rest,
      },
    };
  }
  return cfg;
});
const webappImportOrderRule: Linter.RuleEntry = [
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

const config: Linter.Config[] = [
  {ignores},
  ...cleanedBase,
  {
    // Adjust legacy bits from extended config
    rules: {
      'no-unsanitized/DOM': 'off', // deprecated config variant; rely on recommended defaults instead
      'valid-jsdoc': 'off', // rule removed in ESLint 9
      'header/header': 'off', // disable existing header rule to use our own
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
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...runtimeGlobals,
        React: 'readonly',
        JSX: 'readonly',
        amplify: 'readonly',
        NodeJS: 'readonly',
      },
    },
    // @ts-ignore - Plugin type compatibility issues with ESLint 9 flat config
    plugins: {
      '@emotion': emotionPlugin,
      import: importPlugin,
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
        } as HeaderOptions,
      ] as HeaderRuleConfig,
      'id-length': 'warn',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='splice']",
          message:
            'Use toSpliced() instead of splice() to avoid mutating arrays. Reassign the toSpliced() result when ordering must be preserved.',
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'error',
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
    files: ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
    plugins: {
      unicorn: unicornPlugin,
    },
    languageOptions: {
      parser: require('espree'),
      parserOptions: {
        project: null,
        tsconfigRootDir: __dirname,
      },
      globals: runtimeGlobals,
    },
    rules: {
      // Disable TS-only rules on JS mocks/shims
      '@typescript-eslint/require-array-sort-compare': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unicorn/no-array-reverse': 'error',
      'unicorn/no-array-sort': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='splice']",
          message:
            'Use toSpliced() instead of splice() to avoid mutating arrays. Reassign the toSpliced() result when ordering must be preserved.',
        },
      ],
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
    files: ['apps/webapp/src/script/components/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/strict-boolean-expressions': 'error',
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
];

export default config;
