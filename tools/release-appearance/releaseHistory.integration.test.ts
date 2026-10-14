/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import assert from 'node:assert';
import {execFile} from 'node:child_process';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {promisify} from 'node:util';

import {planBetaReleaseHistory, planProductionReleaseHistory} from './releaseHistory.ts';
import type {ExecuteGitCommand} from './releaseHistory.ts';

const executeFile = promisify(execFile);
const deterministicGitEnvironment: NodeJS.ProcessEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Release History Test Author',
  GIT_AUTHOR_EMAIL: 'release-history-author@example.com',
  GIT_COMMITTER_NAME: 'Release History Test Committer',
  GIT_COMMITTER_EMAIL: 'release-history-committer@example.com',
  LC_ALL: 'C',
  TZ: 'UTC',
};

type TemporaryRepositoryScenario = (repositoryPath: string, executeGitCommand: ExecuteGitCommand) => Promise<void>;

type RunGitCommandOptions = {
  readonly repositoryPath: string;
  readonly commandArguments: readonly string[];
  readonly environmentOverrides?: NodeJS.ProcessEnv;
};

type CreateCommitOptions = {
  readonly repositoryPath: string;
  readonly fileName: string;
  readonly fileContents: string;
  readonly commitDate: string;
};

type CreateAnnotatedTagOptions = {
  readonly repositoryPath: string;
  readonly tagName: string;
  readonly commitSha: string;
  readonly taggerDate: string;
};

async function runGitCommand(options: RunGitCommandOptions): Promise<string> {
  const {repositoryPath, commandArguments, environmentOverrides = {}} = options;
  const commandResult = await executeFile('git', commandArguments, {
    cwd: repositoryPath,
    encoding: 'utf8',
    env: {...deterministicGitEnvironment, ...environmentOverrides},
  });

  return commandResult.stdout;
}

async function createCommit(options: CreateCommitOptions): Promise<string> {
  const {repositoryPath, fileName, fileContents, commitDate} = options;
  await writeFile(`${repositoryPath}/${fileName}`, fileContents, 'utf8');
  await runGitCommand({repositoryPath, commandArguments: ['add', '--', fileName]});
  await runGitCommand({
    repositoryPath,
    commandArguments: ['commit', '--quiet', '--message', fileName],
    environmentOverrides: {GIT_AUTHOR_DATE: commitDate, GIT_COMMITTER_DATE: commitDate},
  });

  return (await runGitCommand({repositoryPath, commandArguments: ['rev-parse', 'HEAD']})).trim();
}

async function createAnnotatedTag(options: CreateAnnotatedTagOptions): Promise<void> {
  const {repositoryPath, tagName, commitSha, taggerDate} = options;
  await runGitCommand({
    repositoryPath,
    commandArguments: ['tag', '--annotate', tagName, '--message', `Release ${tagName}`, commitSha],
    environmentOverrides: {GIT_COMMITTER_DATE: taggerDate},
  });
}

async function createTemporaryGitRepository(scenario: TemporaryRepositoryScenario): Promise<void> {
  const repositoryPath = await mkdtemp(`${tmpdir()}/release-history-`);

  try {
    await runGitCommand({repositoryPath, commandArguments: ['init', '--quiet', '--initial-branch', 'main']});
    await runGitCommand({repositoryPath, commandArguments: ['config', 'user.name', 'Release History Test User']});
    await runGitCommand({repositoryPath, commandArguments: ['config', 'user.email', 'release-history@example.com']});
    await runGitCommand({repositoryPath, commandArguments: ['config', 'commit.gpgSign', 'false']});
    await runGitCommand({repositoryPath, commandArguments: ['config', 'tag.gpgSign', 'false']});

    async function executeGitCommand(commandArguments: readonly string[]): Promise<string> {
      return runGitCommand({repositoryPath, commandArguments});
    }

    await scenario(repositoryPath, executeGitCommand);
  } finally {
    await rm(repositoryPath, {force: true, recursive: true});
  }
}

function releaseHistoryDependencies(executeGitCommand: ExecuteGitCommand): {
  readonly executeGitCommand: ExecuteGitCommand;
} {
  return {executeGitCommand};
}

describe('SemVer release history planning', () => {
  it('plans contiguous Beta candidate ranges from the preceding stable tag', async () => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
      const stableCommitSha = await createCommit({
        repositoryPath,
        fileName: 'stable.txt',
        fileContents: 'stable',
        commitDate: '2026-10-01T00:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: 'v1.0.0',
        commitSha: stableCommitSha,
        taggerDate: '2026-10-01T01:00:00+0000',
      });

      const firstBetaCommitSha = await createCommit({
        repositoryPath,
        fileName: 'first-beta.txt',
        fileContents: 'first beta',
        commitDate: '2026-10-02T00:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: 'v1.1.0-beta.1',
        commitSha: firstBetaCommitSha,
        taggerDate: '2026-10-02T01:00:00+0000',
      });

      const secondBetaCommitSha = await createCommit({
        repositoryPath,
        fileName: 'second-beta.txt',
        fileContents: 'second beta',
        commitDate: '2026-10-03T00:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: 'v1.1.0-beta.2',
        commitSha: secondBetaCommitSha,
        taggerDate: '2026-10-03T01:00:00+0000',
      });

      const actualResult = await planBetaReleaseHistory(
        {currentBetaTag: 'v1.1.0-beta.2', releaseCommit: secondBetaCommitSha},
        releaseHistoryDependencies(executeGitCommand),
      ).toPromise();

      assert(actualResult.isOk);
      expect(actualResult.value).toMatchObject({
        kind: 'beta',
        currentTag: 'v1.1.0-beta.2',
        precedingProductionTag: 'v1.0.0',
      });
      if (actualResult.value.kind !== 'beta') {
        throw new Error('Expected a Beta release history plan');
      }

      expect(actualResult.value.candidateRanges.map(candidateRange => {return candidateRange.candidateTag})).toEqual([
        'v1.1.0-beta.1',
        'v1.1.0-beta.2',
      ]);
      expect(actualResult.value.candidateRanges[0]?.commitRange.baseCommit).toBe(stableCommitSha);
      expect(actualResult.value.candidateRanges[1]?.commitRange.baseCommit).toBe(firstBetaCommitSha);
    });
  });

  it('reconstructs Production through the explicitly promoted Beta tag', async () => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
      const stableCommitSha = await createCommit({
        repositoryPath,
        fileName: 'stable.txt',
        fileContents: 'stable',
        commitDate: '2026-10-01T00:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: 'v1.0.0',
        commitSha: stableCommitSha,
        taggerDate: '2026-10-01T01:00:00+0000',
      });
      const firstBetaCommitSha = await createCommit({
        repositoryPath,
        fileName: 'first-beta.txt',
        fileContents: 'first beta',
        commitDate: '2026-10-02T00:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: 'v1.1.0-beta.1',
        commitSha: firstBetaCommitSha,
        taggerDate: '2026-10-02T01:00:00+0000',
      });
      const productionCommitSha = await createCommit({
        repositoryPath,
        fileName: 'production.txt',
        fileContents: 'production',
        commitDate: '2026-10-03T00:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: 'v1.1.0-beta.2',
        commitSha: productionCommitSha,
        taggerDate: '2026-10-03T01:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: 'v1.1.0',
        commitSha: productionCommitSha,
        taggerDate: '2026-10-04T01:00:00+0000',
      });

      const actualResult = await planProductionReleaseHistory(
        {
          currentProductionTag: 'v1.1.0',
          promotedBetaTag: 'v1.1.0-beta.2',
          releaseCommit: productionCommitSha,
        },
        releaseHistoryDependencies(executeGitCommand),
      ).toPromise();

      assert(actualResult.isOk);
      expect(actualResult.value).toMatchObject({
        kind: 'production',
        currentTag: 'v1.1.0',
        promotedBetaTag: 'v1.1.0-beta.2',
        releaseCommit: productionCommitSha,
        precedingProductionTag: 'v1.0.0',
      });
    });
  });

  it('rejects date-based tags from release appearance planning', async () => {
    const actualResult = await planBetaReleaseHistory(
      {currentBetaTag: '2026-10-06.1-beta.1', releaseCommit: 'a'.repeat(40)},
      releaseHistoryDependencies(async () => {
        throw new Error('Git must not run for an invalid tag');
      }),
    ).toPromise();

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('Invalid Beta candidate tag');
  });
});
