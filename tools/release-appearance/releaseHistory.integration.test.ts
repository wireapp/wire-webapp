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
  readonly commit: string;
  readonly taggerDate: string;
};

async function runGitCommand(runGitCommandOptions: RunGitCommandOptions): Promise<string> {
  const {repositoryPath, commandArguments, environmentOverrides = {}} = runGitCommandOptions;
  const commandResult = await executeFile('git', commandArguments, {
    cwd: repositoryPath,
    encoding: 'utf8',
    env: {...deterministicGitEnvironment, ...environmentOverrides},
  });

  return commandResult.stdout;
}

async function createCommit(createCommitOptions: CreateCommitOptions): Promise<string> {
  const {repositoryPath, fileName, fileContents, commitDate} = createCommitOptions;
  await writeFile(`${repositoryPath}/${fileName}`, fileContents, 'utf8');
  await runGitCommand({repositoryPath, commandArguments: ['add', '--', fileName]});
  await runGitCommand({
    repositoryPath,
    commandArguments: ['commit', '--quiet', '--message', fileName],
    environmentOverrides: {
      GIT_AUTHOR_DATE: commitDate,
      GIT_COMMITTER_DATE: commitDate,
    },
  });

  return (await runGitCommand({repositoryPath, commandArguments: ['rev-parse', 'HEAD']})).trim();
}

async function createAnnotatedTag(createAnnotatedTagOptions: CreateAnnotatedTagOptions): Promise<void> {
  const {repositoryPath, tagName, commit, taggerDate} = createAnnotatedTagOptions;
  await runGitCommand({
    repositoryPath,
    commandArguments: ['tag', '--annotate', tagName, '--message', `Release ${tagName}`, commit],
    environmentOverrides: {GIT_COMMITTER_DATE: taggerDate},
  });
}

async function createTemporaryGitRepository(scenario: TemporaryRepositoryScenario): Promise<void> {
  const repositoryPath = await mkdtemp(`${tmpdir()}/release-history-`);

  try {
    await runGitCommand({
      repositoryPath,
      commandArguments: ['init', '--quiet', '--initial-branch', 'main'],
    });
    await runGitCommand({
      repositoryPath,
      commandArguments: ['config', 'user.name', 'Release History Test User'],
    });
    await runGitCommand({
      repositoryPath,
      commandArguments: ['config', 'user.email', 'release-history@example.com'],
    });
    await runGitCommand({
      repositoryPath,
      commandArguments: ['config', 'commit.gpgSign', 'false'],
    });
    await runGitCommand({
      repositoryPath,
      commandArguments: ['config', 'tag.gpgSign', 'false'],
    });

    async function executeGitCommand(commandArguments: readonly string[]): Promise<string> {
      return runGitCommand({repositoryPath, commandArguments});
    }
    await scenario(repositoryPath, executeGitCommand);
  } finally {
    await rm(repositoryPath, {force: true, recursive: true});
  }
}

async function createProductionBaseline(
  repositoryPath: string,
  tagName: string = '2026-01-01.1-production',
): Promise<string> {
  const productionCommit = await createCommit({
    repositoryPath,
    fileName: 'production.txt',
    fileContents: 'production',
    commitDate: '2026-01-01T00:00:00+0000',
  });
  await createAnnotatedTag({
    repositoryPath,
    tagName,
    commit: productionCommit,
    taggerDate: '2026-01-01T01:00:00+0000',
  });
  return productionCommit;
}

test('plans Beta history when the annotated tag points to the supplied commit', async () => {
  await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
    const productionCommit = await createProductionBaseline(repositoryPath);
    const betaCommit = await createCommit({
      repositoryPath,
      fileName: 'beta.txt',
      fileContents: 'beta',
      commitDate: '2026-01-02T00:00:00+0000',
    });
    const betaTag = '2026-01-02.1-beta.1';
    await createAnnotatedTag({
      repositoryPath,
      tagName: betaTag,
      commit: betaCommit,
      taggerDate: '2026-01-02T01:00:00+0000',
    });

    const actualResult = await planBetaReleaseHistory({
      executeGitCommand,
      currentBetaTag: betaTag,
      releaseCommit: betaCommit,
    });

    assert(actualResult.isOk);
    assert.equal(actualResult.value.kind, 'beta');
    if (actualResult.value.kind !== 'beta') {
      assert.fail('Expected a Beta history plan');
    }
    assert.equal(actualResult.value.commitRange.baseCommit, productionCommit);
    assert.equal(actualResult.value.commitRange.endCommit, betaCommit);
    assert.deepStrictEqual(actualResult.value.commitRange.commits, [betaCommit]);
  });
});

test('plans only the delta introduced by the current Beta candidate', async () => {
  await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
    await createProductionBaseline(repositoryPath);
    const betaOneCommit = await createCommit({
      repositoryPath,
      fileName: 'beta-one.txt',
      fileContents: 'beta one',
      commitDate: '2026-01-02T00:00:00+0000',
    });
    const betaOneTag = '2026-01-02.1-beta.1';
    await createAnnotatedTag({
      repositoryPath,
      tagName: betaOneTag,
      commit: betaOneCommit,
      taggerDate: '2026-01-02T01:00:00+0000',
    });
    const betaTwoCommit = await createCommit({
      repositoryPath,
      fileName: 'beta-two.txt',
      fileContents: 'beta two',
      commitDate: '2026-01-03T00:00:00+0000',
    });
    const betaTwoTag = '2026-01-02.1-beta.2';
    await createAnnotatedTag({
      repositoryPath,
      tagName: betaTwoTag,
      commit: betaTwoCommit,
      taggerDate: '2026-01-03T01:00:00+0000',
    });

    const actualResult = await planBetaReleaseHistory({
      executeGitCommand,
      currentBetaTag: betaTwoTag,
      releaseCommit: betaTwoCommit,
    });

    assert(actualResult.isOk);
    assert.equal(actualResult.value.kind, 'beta');
    if (actualResult.value.kind !== 'beta') {
      assert.fail('Expected a Beta history plan');
    }
    assert.equal(actualResult.value.precedingTag, betaOneTag);
    assert.equal(actualResult.value.commitRange.startTag, betaOneTag);
    assert.equal(actualResult.value.commitRange.endTag, betaTwoTag);
    assert.equal(actualResult.value.commitRange.baseCommit, betaOneCommit);
    assert.equal(actualResult.value.commitRange.endCommit, betaTwoCommit);
    assert.deepStrictEqual(actualResult.value.commitRange.commits, [betaTwoCommit]);
    assert.equal(actualResult.value.commitRange.commits.includes(betaOneCommit), false);
  });
});

test('rejects a Beta tag that does not point to the supplied commit', async () => {
  await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
    await createProductionBaseline(repositoryPath);
    const betaCommit = await createCommit({
      repositoryPath,
      fileName: 'beta.txt',
      fileContents: 'beta',
      commitDate: '2026-01-02T00:00:00+0000',
    });
    const laterCommit = await createCommit({
      repositoryPath,
      fileName: 'later.txt',
      fileContents: 'later',
      commitDate: '2026-01-03T00:00:00+0000',
    });
    const betaTag = '2026-01-02.1-beta.1';
    await createAnnotatedTag({
      repositoryPath,
      tagName: betaTag,
      commit: betaCommit,
      taggerDate: '2026-01-02T01:00:00+0000',
    });

    const actualResult = await planBetaReleaseHistory({
      executeGitCommand,
      currentBetaTag: betaTag,
      releaseCommit: laterCommit,
    });

    assert(actualResult.isErr);
    assert.match(actualResult.error.message, /Beta tag does not point to the release commit/);
  });
});

test('rejects abbreviated release commit SHAs before executing Git', async () => {
  let gitWasExecuted = false;
  async function executeGitCommand(): Promise<string> {
    gitWasExecuted = true;
    return '';
  }

  const actualResult = await planBetaReleaseHistory({
    executeGitCommand,
    currentBetaTag: '2026-01-02.1-beta.1',
    releaseCommit: 'abcdef0',
  });

  assert(actualResult.isErr);
  assert.match(actualResult.error.message, /exactly 40 hexadecimal characters/);
  assert.equal(gitWasExecuted, false);
});

test('validates matching Production and promoted Beta commits', async () => {
  await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
    await createProductionBaseline(repositoryPath);
    const releaseCommit = await createCommit({
      repositoryPath,
      fileName: 'release.txt',
      fileContents: 'release',
      commitDate: '2026-01-02T00:00:00+0000',
    });
    const betaTag = '2026-01-02.1-beta.1';
    const productionTag = '2026-01-02.1-production';
    await createAnnotatedTag({
      repositoryPath,
      tagName: betaTag,
      commit: releaseCommit,
      taggerDate: '2026-01-02T01:00:00+0000',
    });
    await createAnnotatedTag({
      repositoryPath,
      tagName: productionTag,
      commit: releaseCommit,
      taggerDate: '2026-01-02T02:00:00+0000',
    });

    const actualResult = await planProductionReleaseHistory({
      executeGitCommand,
      currentProductionTag: productionTag,
      promotedBetaTag: betaTag,
      releaseCommit,
    });

    assert(actualResult.isOk);
    assert.equal(actualResult.value.kind, 'production');
  });
});

test('reconstructs Production only through promoted beta.2 when beta.3 exists later', async () => {
  await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
    await createProductionBaseline(repositoryPath);
    const betaOneCommit = await createCommit({
      repositoryPath,
      fileName: 'beta-one.txt',
      fileContents: 'beta one',
      commitDate: '2026-01-02T00:00:00+0000',
    });
    const betaOneTag = '2026-01-02.1-beta.1';
    await createAnnotatedTag({
      repositoryPath,
      tagName: betaOneTag,
      commit: betaOneCommit,
      taggerDate: '2026-01-02T01:00:00+0000',
    });
    const betaTwoCommit = await createCommit({
      repositoryPath,
      fileName: 'beta-two.txt',
      fileContents: 'beta two',
      commitDate: '2026-01-03T00:00:00+0000',
    });
    const betaTwoTag = '2026-01-02.1-beta.2';
    await createAnnotatedTag({
      repositoryPath,
      tagName: betaTwoTag,
      commit: betaTwoCommit,
      taggerDate: '2026-01-03T01:00:00+0000',
    });
    const productionTag = '2026-01-02.1-production';
    await createAnnotatedTag({
      repositoryPath,
      tagName: productionTag,
      commit: betaTwoCommit,
      taggerDate: '2026-01-03T02:00:00+0000',
    });
    const betaThreeCommit = await createCommit({
      repositoryPath,
      fileName: 'beta-three.txt',
      fileContents: 'beta three',
      commitDate: '2026-01-04T00:00:00+0000',
    });
    await createAnnotatedTag({
      repositoryPath,
      tagName: '2026-01-02.1-beta.3',
      commit: betaThreeCommit,
      taggerDate: '2026-01-04T01:00:00+0000',
    });

    const actualResult = await planProductionReleaseHistory({
      executeGitCommand,
      currentProductionTag: productionTag,
      promotedBetaTag: betaTwoTag,
      releaseCommit: betaTwoCommit,
    });

    assert(actualResult.isOk);
    assert.equal(actualResult.value.kind, 'production');
    if (actualResult.value.kind !== 'production') {
      assert.fail('Expected a Production history plan');
    }
    assert.deepStrictEqual(
      actualResult.value.candidateRanges.map(candidateRange => {
        return candidateRange.candidateTag;
      }),
      [betaOneTag, betaTwoTag],
    );
  });
});

test('requires candidate continuity through the promoted Beta tag', async () => {
  await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
    await createProductionBaseline(repositoryPath);
    const betaOneCommit = await createCommit({
      repositoryPath,
      fileName: 'beta-one.txt',
      fileContents: 'beta one',
      commitDate: '2026-01-02T00:00:00+0000',
    });
    await createAnnotatedTag({
      repositoryPath,
      tagName: '2026-01-02.1-beta.1',
      commit: betaOneCommit,
      taggerDate: '2026-01-02T01:00:00+0000',
    });
    const betaThreeCommit = await createCommit({
      repositoryPath,
      fileName: 'beta-three.txt',
      fileContents: 'beta three',
      commitDate: '2026-01-03T00:00:00+0000',
    });
    const betaThreeTag = '2026-01-02.1-beta.3';
    const productionTag = '2026-01-02.1-production';
    await createAnnotatedTag({
      repositoryPath,
      tagName: betaThreeTag,
      commit: betaThreeCommit,
      taggerDate: '2026-01-03T01:00:00+0000',
    });
    await createAnnotatedTag({
      repositoryPath,
      tagName: productionTag,
      commit: betaThreeCommit,
      taggerDate: '2026-01-03T02:00:00+0000',
    });

    const actualResult = await planProductionReleaseHistory({
      executeGitCommand,
      currentProductionTag: productionTag,
      promotedBetaTag: betaThreeTag,
      releaseCommit: betaThreeCommit,
    });

    assert(actualResult.isErr);
    assert.match(actualResult.error.message, /Missing Beta candidate 2026-01-02\.1-beta\.2/);
  });
});

test('bootstraps when no new-format Production baseline exists', async () => {
  await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
    const releaseCommit = await createCommit({
      repositoryPath,
      fileName: 'release.txt',
      fileContents: 'release',
      commitDate: '2026-01-02T00:00:00+0000',
    });
    const betaTag = '2026-01-02.1-beta.1';
    await createAnnotatedTag({
      repositoryPath,
      tagName: betaTag,
      commit: releaseCommit,
      taggerDate: '2026-01-02T01:00:00+0000',
    });

    const actualResult = await planBetaReleaseHistory({
      executeGitCommand,
      currentBetaTag: betaTag,
      releaseCommit,
    });

    assert(actualResult.isOk);
    assert.deepStrictEqual(actualResult.value, {kind: 'bootstrap'});
  });
});
