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

type CreateLightweightTagOptions = {
  readonly repositoryPath: string;
  readonly tagName: string;
  readonly commit: string;
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
    environmentOverrides: {
      GIT_COMMITTER_DATE: taggerDate,
    },
  });
}

async function createLightweightTag(createLightweightTagOptions: CreateLightweightTagOptions): Promise<void> {
  const {repositoryPath, tagName, commit} = createLightweightTagOptions;

  await runGitCommand({repositoryPath, commandArguments: ['tag', tagName, commit]});
}

async function createTemporaryGitRepository(scenario: TemporaryRepositoryScenario): Promise<void> {
  const repositoryPath = await mkdtemp(`${tmpdir()}/release-history-`);

  try {
    await runGitCommand({repositoryPath, commandArguments: ['init', '--quiet', '--initial-branch', 'main']});
    await runGitCommand({repositoryPath, commandArguments: ['config', 'user.name', 'Release History Test User']});
    await runGitCommand({repositoryPath, commandArguments: ['config', 'user.email', 'release-history@example.com']});
    await runGitCommand({repositoryPath, commandArguments: ['config', 'commit.gpgSign', 'false']});
    await runGitCommand({repositoryPath, commandArguments: ['config', 'tag.gpgSign', 'false']});

    const executeGitCommand: ExecuteGitCommand = async (commandArguments): Promise<string> => {
      return runGitCommand({repositoryPath, commandArguments});
    };

    await scenario(repositoryPath, executeGitCommand);
  } finally {
    await rm(repositoryPath, {force: true, recursive: true});
  }
}

describe('release history planning with real Git repositories', (): void => {
  test('ignores legacy tags and bootstraps without a new-format Production baseline', async (): Promise<void> => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand): Promise<void> => {
      const rootCommit = await createCommit({
        repositoryPath,
        fileName: 'root.txt',
        fileContents: 'root',
        commitDate: '2026-01-01T00:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: '2026-01-01-production.1',
        commit: rootCommit,
        taggerDate: '2026-01-01T01:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: '2026-01-01-beta.1',
        commit: rootCommit,
        taggerDate: '2026-01-01T02:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: '2026-01-02.1-beta.1',
        commit: rootCommit,
        taggerDate: '2026-01-02T01:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: '2026-01-02.1-production',
        commit: rootCommit,
        taggerDate: '2026-01-02T02:00:00+0000',
      });

      const betaPlanResult = await planBetaReleaseHistory(executeGitCommand, '2026-01-02.1-beta.1');
      assert(betaPlanResult.isOk);
      assert.deepStrictEqual(betaPlanResult.value, {kind: 'bootstrap'});

      const productionPlanResult = await planProductionReleaseHistory({
        executeGitCommand,
        currentProductionTag: '2026-01-02.1-production',
        promotedBetaTag: '2026-01-02.1-beta.1',
        releaseCommit: rootCommit,
      });
      assert(productionPlanResult.isOk);
      assert.deepStrictEqual(productionPlanResult.value, {kind: 'bootstrap'});
    });
  });

  test('starts Beta candidate 1 at the preceding Production tag', async (): Promise<void> => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand): Promise<void> => {
      const productionCommit = await createCommit({
        repositoryPath,
        fileName: 'production.txt',
        fileContents: 'production',
        commitDate: '2026-01-01T00:00:00+0000',
      });
      const precedingProductionTag = '2026-01-01.1-production';
      await createAnnotatedTag({
        repositoryPath,
        tagName: precedingProductionTag,
        commit: productionCommit,
        taggerDate: '2026-01-01T01:00:00+0000',
      });
      const betaCommit = await createCommit({
        repositoryPath,
        fileName: 'beta.txt',
        fileContents: 'beta',
        commitDate: '2026-01-02T00:00:00+0000',
      });
      const currentBetaTag = '2026-01-02.1-beta.1';
      await createAnnotatedTag({
        repositoryPath,
        tagName: currentBetaTag,
        commit: betaCommit,
        taggerDate: '2026-01-02T01:00:00+0000',
      });

      const actualResult = await planBetaReleaseHistory(executeGitCommand, currentBetaTag);

      assert(actualResult.isOk);
      assert(actualResult.value.kind === 'beta');
      assert.strictEqual(actualResult.value.precedingProductionTag, precedingProductionTag);
      assert.strictEqual(actualResult.value.precedingTag, precedingProductionTag);
      assert.strictEqual(actualResult.value.commitRange.startTag, precedingProductionTag);
      assert.strictEqual(actualResult.value.commitRange.endTag, currentBetaTag);
      assert.strictEqual(actualResult.value.commitRange.baseCommit, productionCommit);
      assert.strictEqual(actualResult.value.commitRange.endCommit, betaCommit);
      assert.deepStrictEqual(actualResult.value.commitRange.commits, [betaCommit]);
    });
  });

  test('starts Beta candidate 2 at candidate 1 and includes only new commits', async (): Promise<void> => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand): Promise<void> => {
      const productionCommit = await createCommit({
        repositoryPath,
        fileName: 'production.txt',
        fileContents: 'production',
        commitDate: '2026-01-01T00:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: '2026-01-01.1-production',
        commit: productionCommit,
        taggerDate: '2026-01-01T01:00:00+0000',
      });
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

      const actualResult = await planBetaReleaseHistory(executeGitCommand, betaTwoTag);

      assert(actualResult.isOk);
      assert(actualResult.value.kind === 'beta');
      assert.strictEqual(actualResult.value.precedingTag, betaOneTag);
      assert.deepStrictEqual(actualResult.value.commitRange.commits, [betaTwoCommit]);
      assert(!actualResult.value.commitRange.commits.includes(betaOneCommit));
    });
  });

  test('selects Beta candidate 9 before candidate 10 numerically', async (): Promise<void> => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand): Promise<void> => {
      const productionCommit = await createCommit({
        repositoryPath,
        fileName: 'production.txt',
        fileContents: 'production',
        commitDate: '2026-01-01T00:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: '2026-01-01.1-production',
        commit: productionCommit,
        taggerDate: '2026-01-01T01:00:00+0000',
      });
      const betaNineCommit = await createCommit({
        repositoryPath,
        fileName: 'beta-nine.txt',
        fileContents: 'beta nine',
        commitDate: '2026-01-02T00:00:00+0000',
      });
      const betaNineTag = '2026-01-02.1-beta.9';
      await createAnnotatedTag({
        repositoryPath,
        tagName: betaNineTag,
        commit: betaNineCommit,
        taggerDate: '2026-01-02T01:00:00+0000',
      });
      const betaTenCommit = await createCommit({
        repositoryPath,
        fileName: 'beta-ten.txt',
        fileContents: 'beta ten',
        commitDate: '2026-01-03T00:00:00+0000',
      });
      const betaTenTag = '2026-01-02.1-beta.10';
      await createAnnotatedTag({
        repositoryPath,
        tagName: betaTenTag,
        commit: betaTenCommit,
        taggerDate: '2026-01-03T01:00:00+0000',
      });

      const actualResult = await planBetaReleaseHistory(executeGitCommand, betaTenTag);

      assert(actualResult.isOk);
      assert(actualResult.value.kind === 'beta');
      assert.strictEqual(actualResult.value.precedingTag, betaNineTag);
      assert.deepStrictEqual(actualResult.value.commitRange.commits, [betaTenCommit]);
    });
  });

  test('selects the preceding Production tag by taggerdate even on a sibling branch', async (): Promise<void> => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand): Promise<void> => {
      const rootCommit = await createCommit({
        repositoryPath,
        fileName: 'root.txt',
        fileContents: 'root',
        commitDate: '2026-01-01T00:00:00+0000',
      });
      const oldAncestorCommit = await createCommit({
        repositoryPath,
        fileName: 'old-ancestor.txt',
        fileContents: 'old ancestor',
        commitDate: '2026-01-02T00:00:00+0000',
      });
      const oldAncestorProductionTag = '2026-01-01.1-production';
      await createAnnotatedTag({
        repositoryPath,
        tagName: oldAncestorProductionTag,
        commit: oldAncestorCommit,
        taggerDate: '2026-01-02T01:00:00+0000',
      });

      await runGitCommand({
        repositoryPath,
        commandArguments: ['switch', '--create', 'sibling-production', rootCommit],
      });
      const siblingCommit = await createCommit({
        repositoryPath,
        fileName: 'sibling.txt',
        fileContents: 'sibling',
        commitDate: '2026-01-03T00:00:00+0000',
      });
      const siblingProductionTag = '2026-01-02.1-production';
      await createAnnotatedTag({
        repositoryPath,
        tagName: siblingProductionTag,
        commit: siblingCommit,
        taggerDate: '2026-01-03T01:00:00+0000',
      });

      await runGitCommand({repositoryPath, commandArguments: ['switch', 'main']});
      const releaseCommit = await createCommit({
        repositoryPath,
        fileName: 'release.txt',
        fileContents: 'release',
        commitDate: '2026-01-04T00:00:00+0000',
      });
      const promotedBetaTag = '2026-01-03.1-beta.1';
      await createAnnotatedTag({
        repositoryPath,
        tagName: promotedBetaTag,
        commit: releaseCommit,
        taggerDate: '2026-01-04T01:00:00+0000',
      });
      const currentProductionTag = '2026-01-03.1-production';
      await createAnnotatedTag({
        repositoryPath,
        tagName: currentProductionTag,
        commit: releaseCommit,
        taggerDate: '2026-01-05T01:00:00+0000',
      });

      const actualResult = await planProductionReleaseHistory({
        executeGitCommand,
        currentProductionTag,
        promotedBetaTag,
        releaseCommit,
      });

      assert(actualResult.isOk);
      assert(actualResult.value.kind === 'production');
      assert.strictEqual(actualResult.value.precedingProductionTag, siblingProductionTag);
      assert.strictEqual(actualResult.value.candidateRanges[0].commitRange.startTag, siblingProductionTag);
      assert.strictEqual(actualResult.value.candidateRanges[0].commitRange.baseCommit, rootCommit);
      assert.deepStrictEqual(actualResult.value.candidateRanges[0].commitRange.commits, [
        oldAncestorCommit,
        releaseCommit,
      ]);
      assert(!actualResult.value.precedingProductionTag.includes(oldAncestorProductionTag));
    });
  });

  test('returns ordered Production ranges for every Beta candidate through the promoted candidate', async (): Promise<void> => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand): Promise<void> => {
      const productionCommit = await createCommit({
        repositoryPath,
        fileName: 'production.txt',
        fileContents: 'production',
        commitDate: '2026-01-01T00:00:00+0000',
      });
      const precedingProductionTag = '2026-01-01.1-production';
      await createAnnotatedTag({
        repositoryPath,
        tagName: precedingProductionTag,
        commit: productionCommit,
        taggerDate: '2026-01-01T01:00:00+0000',
      });
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
      const betaThreeCommit = await createCommit({
        repositoryPath,
        fileName: 'beta-three.txt',
        fileContents: 'beta three',
        commitDate: '2026-01-04T00:00:00+0000',
      });
      const betaThreeTag = '2026-01-02.1-beta.3';
      await createAnnotatedTag({
        repositoryPath,
        tagName: betaThreeTag,
        commit: betaThreeCommit,
        taggerDate: '2026-01-04T01:00:00+0000',
      });
      const currentProductionTag = '2026-01-02.1-production';
      await createAnnotatedTag({
        repositoryPath,
        tagName: currentProductionTag,
        commit: betaThreeCommit,
        taggerDate: '2026-01-05T01:00:00+0000',
      });

      const actualResult = await planProductionReleaseHistory({
        executeGitCommand,
        currentProductionTag,
        promotedBetaTag: betaThreeTag,
        releaseCommit: betaThreeCommit,
      });

      assert(actualResult.isOk);
      assert(actualResult.value.kind === 'production');
      assert.strictEqual(actualResult.value.precedingProductionTag, precedingProductionTag);
      assert.deepStrictEqual(
        actualResult.value.candidateRanges.map(candidateRange => {
          return candidateRange.candidateTag;
        }),
        [betaOneTag, betaTwoTag, betaThreeTag],
      );
      assert.deepStrictEqual(
        actualResult.value.candidateRanges.map(candidateRange => {
          return candidateRange.commitRange.startTag;
        }),
        [precedingProductionTag, betaOneTag, betaTwoTag],
      );
      assert.deepStrictEqual(
        actualResult.value.candidateRanges.map(candidateRange => {
          return candidateRange.commitRange.commits;
        }),
        [[betaOneCommit], [betaTwoCommit], [betaThreeCommit]],
      );
    });
  });

  test('rejects a promoted Beta tag that does not point to the Production commit', async (): Promise<void> => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand): Promise<void> => {
      const productionCommit = await createCommit({
        repositoryPath,
        fileName: 'production.txt',
        fileContents: 'production',
        commitDate: '2026-01-01T00:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: '2026-01-01.1-production',
        commit: productionCommit,
        taggerDate: '2026-01-01T01:00:00+0000',
      });
      const betaCommit = await createCommit({
        repositoryPath,
        fileName: 'beta.txt',
        fileContents: 'beta',
        commitDate: '2026-01-02T00:00:00+0000',
      });
      const promotedBetaTag = '2026-01-02.1-beta.1';
      await createAnnotatedTag({
        repositoryPath,
        tagName: promotedBetaTag,
        commit: betaCommit,
        taggerDate: '2026-01-02T01:00:00+0000',
      });
      const productionReleaseCommit = await createCommit({
        repositoryPath,
        fileName: 'production-release.txt',
        fileContents: 'production release',
        commitDate: '2026-01-03T00:00:00+0000',
      });
      const currentProductionTag = '2026-01-02.1-production';
      await createAnnotatedTag({
        repositoryPath,
        tagName: currentProductionTag,
        commit: productionReleaseCommit,
        taggerDate: '2026-01-03T01:00:00+0000',
      });

      const actualResult = await planProductionReleaseHistory({
        executeGitCommand,
        currentProductionTag,
        promotedBetaTag,
        releaseCommit: productionReleaseCommit,
      });

      assert(actualResult.isErr);
      assert.match(actualResult.error.message, /Promoted Beta tag does not point to the release commit/);
    });
  });

  test('rejects lightweight new-format release tags clearly', async (): Promise<void> => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand): Promise<void> => {
      const productionCommit = await createCommit({
        repositoryPath,
        fileName: 'production.txt',
        fileContents: 'production',
        commitDate: '2026-01-01T00:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: '2026-01-01.1-production',
        commit: productionCommit,
        taggerDate: '2026-01-01T01:00:00+0000',
      });
      const betaCommit = await createCommit({
        repositoryPath,
        fileName: 'beta.txt',
        fileContents: 'beta',
        commitDate: '2026-01-02T00:00:00+0000',
      });
      const lightweightBetaTag = '2026-01-02.1-beta.1';
      await createLightweightTag({repositoryPath, tagName: lightweightBetaTag, commit: betaCommit});

      const actualResult = await planBetaReleaseHistory(executeGitCommand, lightweightBetaTag);

      assert(actualResult.isErr);
      assert.match(actualResult.error.message, /Release tag must be annotated/);
    });
  });
});
