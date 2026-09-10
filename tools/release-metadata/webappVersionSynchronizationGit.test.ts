/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import assert from 'node:assert';
import {Buffer} from 'node:buffer';

import {
  createWebAppVersionSynchronizationGitAuthenticationEnvironment,
  redactWebAppVersionSynchronizationGitFailureMessage,
  parseWebAppVersionSynchronizationPackageDocument,
  validateWebAppVersionSynchronizationBranch,
  webAppVersionSynchronizationPackageFilePaths,
} from './webappVersionSynchronizationGit.ts';
import type {WebAppVersionSynchronizationBranchInspection} from './webappVersionSynchronizationGit.ts';

const releaseIdentifier = '2026-09-09.1';
const synchronizationBranchName = 'webapp-version-2026-09-09.1-1.0.0';
const mainCommitSha = 'a'.repeat(40);
const branchTipCommitSha = 'b'.repeat(40);

describe('WebApp synchronization package document parsing', () => {
  it('parses a JSON package document as a validated object', () => {
    const actualResult = parseWebAppVersionSynchronizationPackageDocument(
      '{"name":"@wireapp/example","version":"0.27.0"}',
      'package.json',
    );

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual({name: '@wireapp/example', version: '0.27.0'});
  });

  it.each([
    ['malformed JSON', '{'],
    ['an array', '[]'],
    ['null', 'null'],
    ['a string', '"package"'],
    ['a number', '42'],
    ['a boolean', 'true'],
  ])('rejects %s', (_description, packageContents) => {
    const actualResult = parseWebAppVersionSynchronizationPackageDocument(packageContents, 'package.json');

    assert(actualResult.isErr);
  });

  it('rejects an empty package document', () => {
    const actualResult = parseWebAppVersionSynchronizationPackageDocument('', 'package.json');

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe('Empty package document: package.json');
  });
});

function createPackageDocument(version: string): Readonly<Record<string, unknown>> {
  return {
    name: '@wireapp/example',
    private: true,
    version,
    scripts: {test: 'jest'},
  };
}

function createValidBranchInspection(): WebAppVersionSynchronizationBranchInspection {
  return {
    branchName: synchronizationBranchName,
    mainCommitSha,
    branchTipCommitSha,
    baseCommitSha: mainCommitSha,
    commitParentCount: 1,
    isNormalCommit: true,
    isBasedOnMainHistory: true,
    changedFilePaths: webAppVersionSynchronizationPackageFilePaths,
    baseRootPackageDocument: createPackageDocument('0.27.0'),
    baseWebAppPackageDocument: createPackageDocument('0.27.0'),
    branchRootPackageDocument: createPackageDocument('1.0.0'),
    branchWebAppPackageDocument: createPackageDocument('1.0.0'),
  };
}

type ValidateBranchOptions = {
  readonly branchInspection?: WebAppVersionSynchronizationBranchInspection;
  readonly expectedReleaseIdentifier?: string;
  readonly expectedWebAppVersion?: string;
};

function validateBranch(
  options: ValidateBranchOptions = {},
): ReturnType<typeof validateWebAppVersionSynchronizationBranch> {
  return validateWebAppVersionSynchronizationBranch({
    branchInspection: options.branchInspection ?? createValidBranchInspection(),
    expectedReleaseIdentifier: options.expectedReleaseIdentifier ?? releaseIdentifier,
    expectedWebAppVersion: options.expectedWebAppVersion ?? '1.0.0',
  });
}

describe('WebApp synchronization Git authentication', () => {
  it('creates process-scoped GitHub authentication configuration', () => {
    const githubToken = 'otto-write-token';
    const basicCredential = Buffer.from(`x-access-token:${githubToken}`, 'utf8').toString('base64');
    const actualEnvironment = createWebAppVersionSynchronizationGitAuthenticationEnvironment({githubToken});

    expect(actualEnvironment).toEqual({
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
      GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basicCredential}`,
      GIT_TERMINAL_PROMPT: '0',
    });
    expect(JSON.stringify(actualEnvironment)).not.toContain(githubToken);
  });

  it('redacts credentials from a simulated Git push failure', () => {
    const githubToken = 'otto-write-token';
    const basicCredential = Buffer.from(`x-access-token:${githubToken}`, 'utf8').toString('base64');
    const simulatedFailureMessage = `fatal: authorization failed for ${githubToken} (${basicCredential})`;
    const actualFailureMessage = redactWebAppVersionSynchronizationGitFailureMessage(simulatedFailureMessage, [
      githubToken,
      basicCredential,
    ]);

    expect(actualFailureMessage).toBe('fatal: authorization failed for [REDACTED] ([REDACTED])');
    expect(actualFailureMessage).not.toContain(githubToken);
    expect(actualFailureMessage).not.toContain(basicCredential);
  });
});

describe('WebApp synchronization branch validation', () => {
  it('accepts a branch with one safe synchronization commit', () => {
    const actualResult = validateBranch();

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual({
      branchName: synchronizationBranchName,
      releaseIdentifier,
      webAppVersion: '1.0.0',
    });
  });

  it.each([
    {
      description: 'a different release identifier',
      branchInspection: createValidBranchInspection(),
      expectedReleaseIdentifier: '2026-09-16.1',
      expectedWebAppVersion: '1.0.0',
    },
    {
      description: 'a different branch version',
      branchInspection: createValidBranchInspection(),
      expectedReleaseIdentifier: releaseIdentifier,
      expectedWebAppVersion: '1.0.1',
    },
    {
      description: 'an empty main commit',
      branchInspection: {...createValidBranchInspection(), mainCommitSha: ''},
      expectedReleaseIdentifier: releaseIdentifier,
      expectedWebAppVersion: '1.0.0',
    },
    {
      description: 'a branch tip equal to its base',
      branchInspection: {...createValidBranchInspection(), branchTipCommitSha: mainCommitSha},
      expectedReleaseIdentifier: releaseIdentifier,
      expectedWebAppVersion: '1.0.0',
    },
    {
      description: 'multiple commits',
      branchInspection: {...createValidBranchInspection(), commitParentCount: 2},
      expectedReleaseIdentifier: releaseIdentifier,
      expectedWebAppVersion: '1.0.0',
    },
    {
      description: 'a non-normal commit',
      branchInspection: {...createValidBranchInspection(), isNormalCommit: false},
      expectedReleaseIdentifier: releaseIdentifier,
      expectedWebAppVersion: '1.0.0',
    },
    {
      description: 'a base outside main history',
      branchInspection: {...createValidBranchInspection(), isBasedOnMainHistory: false},
      expectedReleaseIdentifier: releaseIdentifier,
      expectedWebAppVersion: '1.0.0',
    },
    {
      description: 'an unexpected file change',
      branchInspection: {
        ...createValidBranchInspection(),
        changedFilePaths: [...webAppVersionSynchronizationPackageFilePaths, 'README.md'],
      },
      expectedReleaseIdentifier: releaseIdentifier,
      expectedWebAppVersion: '1.0.0',
    },
    {
      description: 'a missing package file change',
      branchInspection: {...createValidBranchInspection(), changedFilePaths: ['package.json']},
      expectedReleaseIdentifier: releaseIdentifier,
      expectedWebAppVersion: '1.0.0',
    },
    {
      description: 'a malformed base package document',
      branchInspection: {...createValidBranchInspection(), baseRootPackageDocument: []},
      expectedReleaseIdentifier: releaseIdentifier,
      expectedWebAppVersion: '1.0.0',
    },
    {
      description: 'disagreeing base package versions',
      branchInspection: {
        ...createValidBranchInspection(),
        baseWebAppPackageDocument: createPackageDocument('0.27.1'),
      },
      expectedReleaseIdentifier: releaseIdentifier,
      expectedWebAppVersion: '1.0.0',
    },
    {
      description: 'a branch version that does not follow its base version',
      branchInspection: createValidBranchInspection(),
      expectedReleaseIdentifier: releaseIdentifier,
      expectedWebAppVersion: '1.0.1',
    },
    {
      description: 'a malformed branch package document',
      branchInspection: {...createValidBranchInspection(), branchRootPackageDocument: 'not-an-object'},
      expectedReleaseIdentifier: releaseIdentifier,
      expectedWebAppVersion: '1.0.0',
    },
    {
      description: 'disagreeing branch package versions',
      branchInspection: {
        ...createValidBranchInspection(),
        branchWebAppPackageDocument: createPackageDocument('1.0.1'),
      },
      expectedReleaseIdentifier: releaseIdentifier,
      expectedWebAppVersion: '1.0.0',
    },
    {
      description: 'an unexpected package metadata change',
      branchInspection: {
        ...createValidBranchInspection(),
        branchRootPackageDocument: {...createPackageDocument('1.0.0'), description: 'unexpected'},
      },
      expectedReleaseIdentifier: releaseIdentifier,
      expectedWebAppVersion: '1.0.0',
    },
  ])('rejects %s', ({branchInspection, expectedReleaseIdentifier, expectedWebAppVersion}) => {
    const actualResult = validateBranch({
      branchInspection,
      expectedReleaseIdentifier,
      expectedWebAppVersion,
    });

    assert(actualResult.isErr);
  });

  it('rejects an invalid synchronization branch name', () => {
    const actualResult = validateBranch({
      branchInspection: {...createValidBranchInspection(), branchName: 'webapp-version-invalid'},
    });

    assert(actualResult.isErr);
  });
});
