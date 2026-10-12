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

import {execFileSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {discoverStableWebAppReleases, selectLatestStableWebAppRelease} from './webappStableReleaseGit.ts';
import type {StableWebAppRelease} from './webappStableReleaseGit.ts';
import type {ExecuteWebAppReleaseGitCommand} from './webappReleaseHistoryGit.ts';
import {validateWebAppVersion} from './webappVersion.ts';

type TemporaryGitRepository = {
  readonly directoryPath: string;
  readonly executeGitCommand: ExecuteWebAppReleaseGitCommand;
};

type GitCommandOptions = {
  readonly arguments: readonly string[];
  readonly directoryPath: string;
};

type GitTagOptions = {
  readonly directoryPath: string;
  readonly tagName: string;
  readonly taggerDate?: string;
};

type CreateStableReleaseOptions = {
  readonly version: string;
  readonly tagName: string;
  readonly commitSha: string;
};

function runGitCommand(options: GitCommandOptions): string {
  return execFileSync('git', [...options.arguments], {
    cwd: options.directoryPath,
    encoding: 'utf8',
  });
}

function createTemporaryGitRepository(): TemporaryGitRepository {
  const directoryPath = mkdtempSync(join(tmpdir(), 'wire-webapp-stable-tags-'));
  runGitCommand({arguments: ['init', '--quiet'], directoryPath});
  runGitCommand({arguments: ['config', 'user.name', 'Release Test'], directoryPath});
  runGitCommand({arguments: ['config', 'user.email', 'release-test@example.invalid'], directoryPath});
  runGitCommand({arguments: ['config', 'commit.gpgsign', 'false'], directoryPath});
  runGitCommand({arguments: ['config', 'tag.gpgsign', 'false'], directoryPath});

  return {
    directoryPath,
    executeGitCommand: async commandArguments => {
      return runGitCommand({arguments: commandArguments, directoryPath});
    },
  };
}

function createCommit(directoryPath: string, fileName: string, fileContents: string): string {
  const filePath = join(directoryPath, fileName);
  writeFileSync(filePath, fileContents, 'utf8');
  runGitCommand({arguments: ['add', fileName], directoryPath});
  runGitCommand({arguments: ['commit', '--quiet', '-m', `Create ${fileName}`], directoryPath});

  return runGitCommand({arguments: ['rev-parse', 'HEAD'], directoryPath}).trim();
}

function createAnnotatedTag(options: GitTagOptions): void {
  const commandEnvironment: NodeJS.ProcessEnv = {...process.env};
  if (options.taggerDate !== undefined) {
    commandEnvironment.GIT_COMMITTER_DATE = options.taggerDate;
  }

  execFileSync('git', ['tag', '-a', options.tagName, '-m', `Tag ${options.tagName}`], {
    cwd: options.directoryPath,
    env: commandEnvironment,
    stdio: 'pipe',
  });
}

function createStableRelease(options: CreateStableReleaseOptions): StableWebAppRelease {
  const versionResult = validateWebAppVersion(options.version);
  assert(versionResult.isOk);

  return Object.freeze({version: versionResult.value, tagName: options.tagName, commitSha: options.commitSha});
}

describe('WebApp stable release Git discovery', () => {
  it('ignores library, legacy, and Beta tags and resolves annotated WebApp tags to commits', async () => {
    const temporaryRepository = createTemporaryGitRepository();

    try {
      const oldStableCommit = createCommit(temporaryRepository.directoryPath, 'old.txt', 'old');
      createAnnotatedTag({directoryPath: temporaryRepository.directoryPath, tagName: 'v0.2.0'});
      const bootstrapCommit = createCommit(temporaryRepository.directoryPath, 'bootstrap.txt', 'bootstrap');
      createAnnotatedTag({directoryPath: temporaryRepository.directoryPath, tagName: 'v1.0.0'});
      createAnnotatedTag({directoryPath: temporaryRepository.directoryPath, tagName: 'v1.1.0-beta.1'});
      createAnnotatedTag({directoryPath: temporaryRepository.directoryPath, tagName: '2026-10-06.1-production'});
      createAnnotatedTag({directoryPath: temporaryRepository.directoryPath, tagName: '@wireapp/core@1.2.3'});

      const actualReleasesResult = await discoverStableWebAppReleases({
        executeGitCommand: temporaryRepository.executeGitCommand,
      });

      assert(actualReleasesResult.isOk);
      expect(actualReleasesResult.value).toEqual([
        createStableRelease({version: '0.2.0', tagName: 'v0.2.0', commitSha: oldStableCommit}),
        createStableRelease({version: '1.0.0', tagName: 'v1.0.0', commitSha: bootstrapCommit}),
      ]);
    } finally {
      rmSync(temporaryRepository.directoryPath, {force: true, recursive: true});
    }
  });

  it('selects by SemVer even when an older version has a newer tagger timestamp', async () => {
    const temporaryRepository = createTemporaryGitRepository();

    try {
      const commitSha = createCommit(temporaryRepository.directoryPath, 'release.txt', 'stable');
      createAnnotatedTag({
        directoryPath: temporaryRepository.directoryPath,
        tagName: 'v1.10.0',
        taggerDate: '2020-01-01T00:00:00Z',
      });
      createAnnotatedTag({
        directoryPath: temporaryRepository.directoryPath,
        tagName: 'v1.9.0',
        taggerDate: '2030-01-01T00:00:00Z',
      });

      const stableReleasesResult = await discoverStableWebAppReleases({
        executeGitCommand: temporaryRepository.executeGitCommand,
      });
      assert(stableReleasesResult.isOk);

      const actualLatestReleaseResult = selectLatestStableWebAppRelease({stableReleases: stableReleasesResult.value});

      assert(actualLatestReleaseResult.isOk);
      expect(actualLatestReleaseResult.value).toEqual(
        createStableRelease({version: '1.10.0', tagName: 'v1.10.0', commitSha}),
      );
    } finally {
      rmSync(temporaryRepository.directoryPath, {force: true, recursive: true});
    }
  });

  it('rejects lightweight stable tags', async () => {
    const temporaryRepository = createTemporaryGitRepository();

    try {
      createCommit(temporaryRepository.directoryPath, 'release.txt', 'stable');
      runGitCommand({arguments: ['tag', 'v1.0.0'], directoryPath: temporaryRepository.directoryPath});

      const actualReleasesResult = await discoverStableWebAppReleases({
        executeGitCommand: temporaryRepository.executeGitCommand,
      });

      assert(actualReleasesResult.isErr);
      expect(actualReleasesResult.error.message).toBe('Stable WebApp tag must be annotated: v1.0.0');
    } finally {
      rmSync(temporaryRepository.directoryPath, {force: true, recursive: true});
    }
  });

  it('fails closed for malformed WebApp-like tags', async () => {
    const temporaryRepository = createTemporaryGitRepository();

    try {
      createCommit(temporaryRepository.directoryPath, 'release.txt', 'stable');
      createAnnotatedTag({directoryPath: temporaryRepository.directoryPath, tagName: 'v1.0.0-production'});

      const actualReleasesResult = await discoverStableWebAppReleases({
        executeGitCommand: temporaryRepository.executeGitCommand,
      });

      assert(actualReleasesResult.isErr);
      expect(actualReleasesResult.error.message).toContain('Malformed WebApp SemVer tag');
    } finally {
      rmSync(temporaryRepository.directoryPath, {force: true, recursive: true});
    }
  });

  it('reports an explicit error when no stable WebApp tag exists', () => {
    const actualLatestReleaseResult = selectLatestStableWebAppRelease({stableReleases: []});

    assert(actualLatestReleaseResult.isErr);
    expect(actualLatestReleaseResult.error.message).toContain('No stable WebApp SemVer tag exists');
  });
});
