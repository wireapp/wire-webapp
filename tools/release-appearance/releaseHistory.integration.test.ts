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

import {
  findLatestBetaReleaseTag,
  planBetaReleaseHistory,
  planNextBetaPreviewHistory,
  planProductionReleaseHistory,
} from './releaseHistory.ts';
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

type CreateAnnotatedTagsOptions = {
  readonly repositoryPath: string;
  readonly commit: string;
  readonly tagDefinitions: readonly Pick<CreateAnnotatedTagOptions, 'tagName' | 'taggerDate'>[];
};

type CreateLightweightTagOptions = {
  readonly repositoryPath: string;
  readonly tagName: string;
  readonly commit: string;
};

async function createLightweightTag(createLightweightTagOptions: CreateLightweightTagOptions): Promise<void> {
  const {repositoryPath, tagName, commit} = createLightweightTagOptions;

  await runGitCommand({repositoryPath, commandArguments: ['tag', tagName, commit]});
}

async function createAnnotatedTags(createAnnotatedTagsOptions: CreateAnnotatedTagsOptions): Promise<void> {
  const {repositoryPath, commit, tagDefinitions} = createAnnotatedTagsOptions;

  for (const tagDefinition of tagDefinitions) {
    await createAnnotatedTag({...tagDefinition, repositoryPath, commit});
  }
}

async function createSelectionCommit(repositoryPath: string, commitDate: string): Promise<string> {
  return createCommit({repositoryPath, fileName: 'release.txt', fileContents: 'release', commitDate});
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

describe('release history planning', () => {
  it('plans Beta history when the annotated tag points to the supplied commit', async () => {
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
      expect(actualResult.value.kind).toBe('beta');
      if (actualResult.value.kind !== 'beta') {
        assert.fail('Expected a Beta history plan');
      }
      expect(actualResult.value.commitRange.baseCommit).toBe(productionCommit);
      expect(actualResult.value.commitRange.endCommit).toBe(betaCommit);
      expect(actualResult.value.commitRange.commits).toEqual([betaCommit]);
    });
  });

  it('plans only the delta introduced by the current Beta candidate', async () => {
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
      expect(actualResult.value.kind).toBe('beta');
      if (actualResult.value.kind !== 'beta') {
        assert.fail('Expected a Beta history plan');
      }
      expect(actualResult.value.precedingTag).toBe(betaOneTag);
      expect(actualResult.value.commitRange.startTag).toBe(betaOneTag);
      expect(actualResult.value.commitRange.endTag).toBe(betaTwoTag);
      expect(actualResult.value.commitRange.baseCommit).toBe(betaOneCommit);
      expect(actualResult.value.commitRange.endCommit).toBe(betaTwoCommit);
      expect(actualResult.value.commitRange.commits).toEqual([betaTwoCommit]);
      expect(actualResult.value.commitRange.commits).not.toContain(betaOneCommit);
    });
  });

  it('selects the preceding Production tag by annotated creation order across sibling branches', async () => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
      const commonBaseCommit = await createCommit({
        repositoryPath,
        fileName: 'common-base.txt',
        fileContents: 'common base',
        commitDate: '2026-01-01T00:00:00+0000',
      });
      const olderAncestorProductionCommit = await createCommit({
        repositoryPath,
        fileName: 'older-production.txt',
        fileContents: 'older production',
        commitDate: '2026-01-02T00:00:00+0000',
      });
      const olderAncestorProductionTag = '2026-01-02.1-production';
      await createAnnotatedTag({
        repositoryPath,
        tagName: olderAncestorProductionTag,
        commit: olderAncestorProductionCommit,
        taggerDate: '2026-01-02T01:00:00+0000',
      });

      await runGitCommand({
        repositoryPath,
        commandArguments: ['switch', '--quiet', '--create', 'sibling-release', commonBaseCommit],
      });
      const newerSiblingProductionCommit = await createCommit({
        repositoryPath,
        fileName: 'newer-sibling-production.txt',
        fileContents: 'newer sibling production',
        commitDate: '2026-01-03T00:00:00+0000',
      });
      const newerSiblingProductionTag = '2026-01-03.1-production';
      await createAnnotatedTag({
        repositoryPath,
        tagName: newerSiblingProductionTag,
        commit: newerSiblingProductionCommit,
        taggerDate: '2026-01-03T01:00:00+0000',
      });

      await runGitCommand({
        repositoryPath,
        commandArguments: ['switch', '--quiet', 'main'],
      });
      const currentReleaseCommit = await createCommit({
        repositoryPath,
        fileName: 'current-release.txt',
        fileContents: 'current release',
        commitDate: '2026-01-04T00:00:00+0000',
      });
      const currentBetaTag = '2026-01-04.1-beta.1';
      await createAnnotatedTag({
        repositoryPath,
        tagName: currentBetaTag,
        commit: currentReleaseCommit,
        taggerDate: '2026-01-04T01:00:00+0000',
      });

      const actualResult = await planBetaReleaseHistory({
        executeGitCommand,
        currentBetaTag,
        releaseCommit: currentReleaseCommit,
      });

      assert(actualResult.isOk);
      expect(actualResult.value.kind).toBe('beta');
      if (actualResult.value.kind !== 'beta') {
        assert.fail('Expected a Beta history plan');
      }
      expect(actualResult.value.precedingProductionTag).toBe(newerSiblingProductionTag);
      expect(actualResult.value.precedingTag).toBe(newerSiblingProductionTag);
      expect(actualResult.value.precedingProductionTag).not.toBe(olderAncestorProductionTag);
      expect(actualResult.value.commitRange.startTag).toBe(newerSiblingProductionTag);
      expect(actualResult.value.commitRange.endTag).toBe(currentBetaTag);
      expect(actualResult.value.commitRange.baseCommit).toBe(commonBaseCommit);
      expect(actualResult.value.commitRange.endCommit).toBe(currentReleaseCommit);
      expect(actualResult.value.commitRange.commits).toEqual([olderAncestorProductionCommit, currentReleaseCommit]);
    });
  });

  it('rejects a Beta tag that does not point to the supplied commit', async () => {
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
      expect(actualResult.error.message).toMatch(/Beta tag does not point to the release commit/);
    });
  });

  it('rejects abbreviated release commit SHAs before executing Git', async () => {
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
    expect(actualResult.error.message).toMatch(/exactly 40 hexadecimal characters/);
    expect(gitWasExecuted).toBe(false);
  });

  it('validates matching Production and promoted Beta commits', async () => {
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
      expect(actualResult.value.kind).toBe('production');
    });
  });

  it('reconstructs Production only through promoted beta.2 when beta.3 exists later', async () => {
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
      expect(actualResult.value.kind).toBe('production');
      if (actualResult.value.kind !== 'production') {
        assert.fail('Expected a Production history plan');
      }
      expect(
        actualResult.value.candidateRanges.map(candidateRange => {
          return candidateRange.candidateTag;
        }),
      ).toEqual([betaOneTag, betaTwoTag]);
    });
  });

  it('requires candidate continuity through the promoted Beta tag', async () => {
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
      expect(actualResult.error.message).toMatch(/Missing Beta candidate 2026-01-02\.1-beta\.2/);
    });
  });

  it('bootstraps when no new-format Production baseline exists', async () => {
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
      expect(actualResult.value).toEqual({kind: 'bootstrap'});
    });
  });
});

describe('latest Beta release tag selection', () => {
  it('ignores legacy, malformed, and unrelated tags and selects by annotation timestamp', async () => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
      const commit = await createSelectionCommit(repositoryPath, '2026-07-31T00:00:00+0000');
      const selectedTagName = '2026-07-30.1-beta.1';
      await createAnnotatedTags({
        repositoryPath,
        commit,
        tagDefinitions: [
          {tagName: '2026-07-31.1-beta.1', taggerDate: '2026-07-31T01:00:00+0000'},
          {tagName: selectedTagName, taggerDate: '2026-08-01T01:00:00+0000'},
          {tagName: '2026-07-31.1-production', taggerDate: '2026-08-02T01:00:00+0000'},
          {tagName: '2026-07-31-staging.0', taggerDate: '2026-08-03T01:00:00+0000'},
          {tagName: 'other-package-2026-08-03.1-beta.1', taggerDate: '2026-08-04T01:00:00+0000'},
          {tagName: '2026-08-03.1-beta.0', taggerDate: '2026-08-05T01:00:00+0000'},
        ],
      });

      const actualResult = await findLatestBetaReleaseTag(executeGitCommand);

      assert(actualResult.isOk);
      assert(actualResult.value.isJust);
      expect(actualResult.value.value.tagName).toBe(selectedTagName);
    });
  });

  it('uses numeric release and candidate ordering when annotation timestamps tie', async () => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
      const commit = await createSelectionCommit(repositoryPath, '2026-08-01T00:00:00+0000');
      const numericReleaseTag = '2026-08-01.10-beta.2';
      await createAnnotatedTags({
        repositoryPath,
        commit,
        tagDefinitions: [
          {tagName: '2026-08-01.2-beta.10', taggerDate: '2026-08-01T01:00:00+0000'},
          {tagName: numericReleaseTag, taggerDate: '2026-08-01T01:00:00+0000'},
        ],
      });

      const numericReleaseResult = await findLatestBetaReleaseTag(executeGitCommand);

      assert(numericReleaseResult.isOk);
      assert(numericReleaseResult.value.isJust);
      expect(numericReleaseResult.value.value.tagName).toBe(numericReleaseTag);
      const numericCandidateTag = '2026-08-02.1-beta.10';
      await createAnnotatedTags({
        repositoryPath,
        commit,
        tagDefinitions: [
          {tagName: '2026-08-02.1-beta.2', taggerDate: '2026-08-02T01:00:00+0000'},
          {tagName: numericCandidateTag, taggerDate: '2026-08-02T01:00:00+0000'},
        ],
      });

      const actualResult = await findLatestBetaReleaseTag(executeGitCommand);

      assert(actualResult.isOk);
      assert(actualResult.value.isJust);
      expect(actualResult.value.value.tagName).toBe(numericCandidateTag);
    });
  });

  it('rejects a matching lightweight Beta tag', async () => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
      const commit = await createSelectionCommit(repositoryPath, '2026-08-01T00:00:00+0000');
      const lightweightTagName = '2026-08-01.1-beta.1';
      await createLightweightTag({repositoryPath, tagName: lightweightTagName, commit});

      const actualResult = await findLatestBetaReleaseTag(executeGitCommand);

      assert(actualResult.isErr);
      expect(actualResult.error.message).toBe(`Release tag must be annotated: ${lightweightTagName}`);
    });
  });
});

describe('next Beta preview history planning', () => {
  it('plans changes after an ancestor Beta tag up to the exact target main commit', async () => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
      const commonCommit = await createCommit({
        repositoryPath,
        fileName: 'common.txt',
        fileContents: 'common',
        commitDate: '2026-07-01T00:00:00+0000',
      });
      const betaCommit = await createCommit({
        repositoryPath,
        fileName: 'beta.txt',
        fileContents: 'beta',
        commitDate: '2026-07-02T00:00:00+0000',
      });
      const betaTag = '2026-07-02.1-beta.1';
      await createAnnotatedTag({
        repositoryPath,
        tagName: betaTag,
        commit: betaCommit,
        taggerDate: '2026-07-02T01:00:00+0000',
      });
      const firstMainCommit = await createCommit({
        repositoryPath,
        fileName: 'main-one.txt',
        fileContents: 'main one',
        commitDate: '2026-07-03T00:00:00+0000',
      });
      const secondMainCommit = await createCommit({
        repositoryPath,
        fileName: 'main-two.txt',
        fileContents: 'main two',
        commitDate: '2026-07-04T00:00:00+0000',
      });
      await createCommit({
        repositoryPath,
        fileName: 'main-after-target.txt',
        fileContents: 'after target',
        commitDate: '2026-07-05T00:00:00+0000',
      });

      const actualResult = await planNextBetaPreviewHistory({
        executeGitCommand,
        targetMainCommit: secondMainCommit,
      });

      assert(actualResult.isOk);
      expect(actualResult.value.kind).toBe('preview');
      if (actualResult.value.kind !== 'preview') {
        assert.fail('Expected a next Beta preview history plan');
      }
      expect(actualResult.value.latestBetaReleaseTag.tagName).toBe(betaTag);
      expect(actualResult.value.latestBetaReleaseTag.commit).toBe(betaCommit);
      expect(actualResult.value.targetMainCommit).toBe(secondMainCommit);
      expect(actualResult.value.mergeBase).toBe(betaCommit);
      expect(actualResult.value.commits).toEqual([firstMainCommit, secondMainCommit]);
      expect(actualResult.value.commits).not.toContain(commonCommit);
      expect(actualResult.value.commits).not.toContain(betaCommit);
    });
  });

  it('uses the merge base when the latest Beta tag is on a sibling release branch', async () => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
      const commonCommit = await createCommit({
        repositoryPath,
        fileName: 'common.txt',
        fileContents: 'common',
        commitDate: '2026-07-01T00:00:00+0000',
      });
      await runGitCommand({
        repositoryPath,
        commandArguments: ['switch', '--quiet', '--create', 'beta-release', commonCommit],
      });
      const betaOnlyCommit = await createCommit({
        repositoryPath,
        fileName: 'beta-only.txt',
        fileContents: 'beta only',
        commitDate: '2026-07-02T00:00:00+0000',
      });
      const betaTag = '2026-07-02.1-beta.1';
      await createAnnotatedTag({
        repositoryPath,
        tagName: betaTag,
        commit: betaOnlyCommit,
        taggerDate: '2026-07-02T01:00:00+0000',
      });
      await runGitCommand({repositoryPath, commandArguments: ['switch', '--quiet', 'main']});
      const firstMainCommit = await createCommit({
        repositoryPath,
        fileName: 'main-one.txt',
        fileContents: 'main one',
        commitDate: '2026-07-03T00:00:00+0000',
      });
      const secondMainCommit = await createCommit({
        repositoryPath,
        fileName: 'main-two.txt',
        fileContents: 'main two',
        commitDate: '2026-07-04T00:00:00+0000',
      });

      const actualResult = await planNextBetaPreviewHistory({
        executeGitCommand,
        targetMainCommit: secondMainCommit,
      });

      assert(actualResult.isOk);
      expect(actualResult.value.kind).toBe('preview');
      if (actualResult.value.kind !== 'preview') {
        assert.fail('Expected a next Beta preview history plan');
      }
      expect(actualResult.value.latestBetaReleaseTag.commit).toBe(betaOnlyCommit);
      expect(actualResult.value.targetMainCommit).toBe(secondMainCommit);
      expect(actualResult.value.mergeBase).toBe(commonCommit);
      expect(actualResult.value.commits).toEqual([firstMainCommit, secondMainCommit]);
      expect(actualResult.value.commits).not.toContain(betaOnlyCommit);
    });
  });

  it('returns an empty range when Beta is at the target main commit', async () => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
      const betaCommit = await createCommit({
        repositoryPath,
        fileName: 'beta.txt',
        fileContents: 'beta',
        commitDate: '2026-07-02T00:00:00+0000',
      });
      await createAnnotatedTag({
        repositoryPath,
        tagName: '2026-07-02.1-beta.1',
        commit: betaCommit,
        taggerDate: '2026-07-02T01:00:00+0000',
      });

      const actualResult = await planNextBetaPreviewHistory({
        executeGitCommand,
        targetMainCommit: betaCommit,
      });

      assert(actualResult.isOk);
      expect(actualResult.value.kind).toBe('preview');
      if (actualResult.value.kind !== 'preview') {
        assert.fail('Expected a next Beta preview history plan');
      }
      expect(actualResult.value.mergeBase).toBe(betaCommit);
      expect(actualResult.value.commits).toEqual([]);
    });
  });

  it('returns unavailable when no new-format Beta tag exists', async () => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
      const targetCommit = await createSelectionCommit(repositoryPath, '2026-07-01T00:00:00+0000');
      await createAnnotatedTag({
        repositoryPath,
        tagName: '2026-07-01-staging.0',
        commit: targetCommit,
        taggerDate: '2026-07-01T01:00:00+0000',
      });
      await createAnnotatedTags({
        repositoryPath,
        commit: targetCommit,
        tagDefinitions: [
          {tagName: '2026-07-01.1-production', taggerDate: '2026-07-01T02:00:00+0000'},
          {tagName: 'other-package-2026-07-01.1-beta.1', taggerDate: '2026-07-01T03:00:00+0000'},
          {tagName: '2026-07-01.1-beta', taggerDate: '2026-07-01T04:00:00+0000'},
        ],
      });

      const actualResult = await planNextBetaPreviewHistory({
        executeGitCommand,
        targetMainCommit: targetCommit,
      });

      assert(actualResult.isOk);
      expect(actualResult.value).toEqual({kind: 'unavailable', targetMainCommit: targetCommit});
    });
  });

  it('rejects invalid target commits before planning history', async () => {
    await createTemporaryGitRepository(async (repositoryPath, executeGitCommand) => {
      let gitWasExecuted = false;
      async function executeTrackedGitCommand(commandArguments: readonly string[]): Promise<string> {
        gitWasExecuted = true;

        return executeGitCommand(commandArguments);
      }

      const abbreviatedResult = await planNextBetaPreviewHistory({
        executeGitCommand: executeTrackedGitCommand,
        targetMainCommit: 'abcdef0',
      });

      assert(abbreviatedResult.isErr);
      expect(abbreviatedResult.error.message).toMatch(/exactly 40 hexadecimal characters/);
      expect(gitWasExecuted).toBe(false);

      const unresolvedResult = await planNextBetaPreviewHistory({
        executeGitCommand,
        targetMainCommit: 'f'.repeat(40),
      });

      assert(unresolvedResult.isErr);
      expect(unresolvedResult.error.message).not.toContain('github-token');
      expect(unresolvedResult.error.message).not.toContain('stack trace');
    });
  });
});
