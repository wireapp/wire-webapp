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

import {execFile} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import assert from 'node:assert';

import {resolveReleaseAppearanceRange} from './releaseAppearanceCli';
import type {GitCommand, ResolveReleaseAppearanceRangeParameters} from './releaseAppearanceCli';

type TemporaryGitRepository = {
  readonly executeGitCommand: GitCommand;
  readonly path: string;
};

type CreateCommitTagParameters = {
  readonly executeGitCommand: GitCommand;
  readonly message: string;
  readonly tagName: string;
};

type ResolveRangeParameters = {
  readonly baselineTagName?: string;
  readonly environment: 'beta' | 'production';
  readonly releaseTagName: string;
  readonly repository: TemporaryGitRepository;
};

const fixedGitEnvironment = {
  GIT_AUTHOR_EMAIL: 'release-appearance-tests@example.invalid',
  GIT_AUTHOR_NAME: 'Release Appearance Tests',
  GIT_COMMITTER_EMAIL: 'release-appearance-tests@example.invalid',
  GIT_COMMITTER_NAME: 'Release Appearance Tests',
  GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z',
  GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z',
};

function executeGitCommandInRepository(repositoryPath: string, commandArguments: readonly string[]): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    execFile(
      'git',
      ['-C', repositoryPath, ...commandArguments],
      {encoding: 'utf8', env: {...process.env, ...fixedGitEnvironment}},
      (error, standardOutput) => {
        if (error !== null) {
          reject(error);
          return;
        }

        resolve(standardOutput);
      },
    );
  });
}

async function createTemporaryGitRepository(): Promise<TemporaryGitRepository> {
  const repositoryPath = await mkdtemp(join(tmpdir(), 'wire-webapp-release-appearance-'));
  const executeGitCommand: GitCommand = async (commandArguments: readonly string[]): Promise<string> => {
    return executeGitCommandInRepository(repositoryPath, commandArguments);
  };

  await executeGitCommand(['init', '--quiet', '--initial-branch', 'main']);
  await executeGitCommand(['config', 'user.email', 'release-appearance-tests@example.invalid']);
  await executeGitCommand(['config', 'user.name', 'Release Appearance Tests']);
  await executeGitCommand(['config', 'commit.gpgsign', 'false']);
  await executeGitCommand(['config', 'tag.gpgSign', 'false']);
  await createCommit(executeGitCommand, 'root');

  return {executeGitCommand, path: repositoryPath};
}

async function createCommit(executeGitCommand: GitCommand, message: string): Promise<string> {
  await executeGitCommand(['commit', '--quiet', '--allow-empty', '--message', message]);
  return (await executeGitCommand(['rev-parse', 'HEAD'])).trim();
}

async function createAnnotatedTag(executeGitCommand: GitCommand, tagName: string): Promise<void> {
  await executeGitCommand(['tag', '--annotate', tagName, '--message', `Release ${tagName}`]);
}

async function createCommitTag(parameters: CreateCommitTagParameters): Promise<string> {
  const commitHash = await createCommit(parameters.executeGitCommand, parameters.message);
  await createAnnotatedTag(parameters.executeGitCommand, parameters.tagName);
  return commitHash;
}

async function readRevisionHashes(executeGitCommand: GitCommand, revisionRange: string): Promise<readonly string[]> {
  const output = await executeGitCommand(['rev-list', '--reverse', revisionRange]);
  return output
    .trim()
    .split('\n')
    .filter(revisionHash => revisionHash.length > 0);
}

async function resolveRange(
  parameters: ResolveRangeParameters,
): Promise<Awaited<ReturnType<typeof resolveReleaseAppearanceRange>>> {
  const currentCommitHash = (await parameters.repository.executeGitCommand(['rev-parse', 'HEAD'])).trim();
  const releaseRangeParameters: ResolveReleaseAppearanceRangeParameters = {
    currentCommitHash,
    environment: parameters.environment,
    executeGitCommand: parameters.repository.executeGitCommand,
    releaseTagName: parameters.releaseTagName,
  };

  if (parameters.baselineTagName !== undefined) {
    releaseRangeParameters.baselineTagName = parameters.baselineTagName;
  }

  return resolveReleaseAppearanceRange(releaseRangeParameters);
}

describe('release appearance range selection with real Git repositories', () => {
  it('uses the preceding verified Production tag for the first Beta candidate and returns only introduced commits', async (): Promise<void> => {
    const repository = await createTemporaryGitRepository();

    try {
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-01-production.0');
      const firstIntroducedCommitHash = await createCommit(repository.executeGitCommand, 'first introduced commit');
      const secondIntroducedCommitHash = await createCommit(repository.executeGitCommand, 'second introduced commit');
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-02.1-beta.1');

      const rangeResult = await resolveRange({
        environment: 'beta',
        releaseTagName: '2026-07-02.1-beta.1',
        repository,
      });

      assert(rangeResult.isOk);
      expect(rangeResult.value.range.baselineTagName).toBe('2026-07-01-production.0');
      await expect(
        readRevisionHashes(repository.executeGitCommand, rangeResult.value.range.revisionRange),
      ).resolves.toEqual([firstIntroducedCommitHash, secondIntroducedCommitHash]);
    } finally {
      await rm(repository.path, {force: true, recursive: true});
    }
  });

  it('uses Beta candidate 1 as the baseline for candidate 2', async (): Promise<void> => {
    const repository = await createTemporaryGitRepository();

    try {
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-01-production.0');
      await createCommitTag({
        executeGitCommand: repository.executeGitCommand,
        message: 'Beta candidate 1',
        tagName: '2026-07-02.1-beta.1',
      });
      const introducedCommitHash = await createCommit(repository.executeGitCommand, 'Beta candidate 2 change');
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-02.1-beta.2');

      const rangeResult = await resolveRange({
        environment: 'beta',
        releaseTagName: '2026-07-02.1-beta.2',
        repository,
      });

      assert(rangeResult.isOk);
      expect(rangeResult.value.range.baselineTagName).toBe('2026-07-02.1-beta.1');
      await expect(
        readRevisionHashes(repository.executeGitCommand, rangeResult.value.range.revisionRange),
      ).resolves.toEqual([introducedCommitHash]);
    } finally {
      await rm(repository.path, {force: true, recursive: true});
    }
  });

  it('selects Beta candidate 9 before candidate 10 and ignores another release identifier', async (): Promise<void> => {
    const repository = await createTemporaryGitRepository();

    try {
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-01-production.0');
      await createCommitTag({
        executeGitCommand: repository.executeGitCommand,
        message: 'Beta candidate 1',
        tagName: '2026-07-02.1-beta.1',
      });
      await createCommitTag({
        executeGitCommand: repository.executeGitCommand,
        message: 'Beta candidate 9',
        tagName: '2026-07-02.1-beta.9',
      });
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-01.1-beta.99');
      const introducedCommitHash = await createCommit(repository.executeGitCommand, 'Beta candidate 10 change');
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-02.1-beta.10');

      const rangeResult = await resolveRange({
        environment: 'beta',
        releaseTagName: '2026-07-02.1-beta.10',
        repository,
      });

      assert(rangeResult.isOk);
      expect(rangeResult.value.range.baselineTagName).toBe('2026-07-02.1-beta.9');
      await expect(
        readRevisionHashes(repository.executeGitCommand, rangeResult.value.range.revisionRange),
      ).resolves.toEqual([introducedCommitHash]);
    } finally {
      await rm(repository.path, {force: true, recursive: true});
    }
  });

  it('does not select the current Beta or current Production tag as its own baseline', async (): Promise<void> => {
    const repository = await createTemporaryGitRepository();

    try {
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-01-production.0');
      await createCommitTag({
        executeGitCommand: repository.executeGitCommand,
        message: 'Beta candidate 1',
        tagName: '2026-07-02.1-beta.1',
      });

      const betaRangeResult = await resolveRange({
        environment: 'beta',
        releaseTagName: '2026-07-02.1-beta.1',
        repository,
      });
      assert(betaRangeResult.isOk);
      expect(betaRangeResult.value.range.baselineTagName).toBe('2026-07-01-production.0');

      const productionCommitHash = await createCommit(repository.executeGitCommand, 'Production release');
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-02.1-production');
      const productionRangeResult = await resolveRange({
        environment: 'production',
        releaseTagName: '2026-07-02.1-production',
        repository,
      });

      assert(productionRangeResult.isOk);
      expect(productionRangeResult.value.range.baselineTagName).toBe('2026-07-01-production.0');
      expect(productionRangeResult.value.range.baselineCommitHash).not.toBe(productionCommitHash);
    } finally {
      await rm(repository.path, {force: true, recursive: true});
    }
  });

  it('selects the nearest Production baseline by ancestry', async (): Promise<void> => {
    const repository = await createTemporaryGitRepository();

    try {
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-01-production.0');
      await createCommitTag({
        executeGitCommand: repository.executeGitCommand,
        message: 'Near Production release',
        tagName: '2026-07-02.1-production',
      });
      await createCommit(repository.executeGitCommand, 'Current release change');
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-03.1-production');

      const rangeResult = await resolveRange({
        environment: 'production',
        releaseTagName: '2026-07-03.1-production',
        repository,
      });

      assert(rangeResult.isOk);
      expect(rangeResult.value.range.baselineTagName).toBe('2026-07-02.1-production');
    } finally {
      await rm(repository.path, {force: true, recursive: true});
    }
  });

  it('uses a legacy Production tag as the migration baseline', async (): Promise<void> => {
    const repository = await createTemporaryGitRepository();

    try {
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-01-production.0');
      await createCommit(repository.executeGitCommand, 'Migration release change');
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-02.1-beta.1');

      const rangeResult = await resolveRange({
        environment: 'beta',
        releaseTagName: '2026-07-02.1-beta.1',
        repository,
      });

      assert(rangeResult.isOk);
      expect(rangeResult.value.range.baselineTagName).toBe('2026-07-01-production.0');
    } finally {
      await rm(repository.path, {force: true, recursive: true});
    }
  });

  it('uses the explicitly designed merge-base range for a non-ancestor Production tag', async (): Promise<void> => {
    const repository = await createTemporaryGitRepository();

    try {
      const commonAncestorCommitHash = (await repository.executeGitCommand(['rev-parse', 'HEAD'])).trim();
      await repository.executeGitCommand(['checkout', '--quiet', '-b', 'release-side']);
      const nonAncestorCommitHash = await createCommit(repository.executeGitCommand, 'Side Production change');
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-01-production.0');
      await repository.executeGitCommand(['checkout', '--quiet', 'main']);
      await createCommit(repository.executeGitCommand, 'Main release change');
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-02.1-production');

      const rangeResult = await resolveRange({
        environment: 'production',
        releaseTagName: '2026-07-02.1-production',
        repository,
      });

      assert(rangeResult.isOk);
      expect(rangeResult.value.range.baselineTagName).toBe('2026-07-01-production.0');
      expect(rangeResult.value.range.mergeBaseCommitHash).toBe(commonAncestorCommitHash);
      expect(
        await readRevisionHashes(repository.executeGitCommand, rangeResult.value.range.revisionRange),
      ).not.toContain(nonAncestorCommitHash);
    } finally {
      await rm(repository.path, {force: true, recursive: true});
    }
  });

  it('rejects an unrelated explicit baseline and never falls back to the repository root', async (): Promise<void> => {
    const repository = await createTemporaryGitRepository();

    try {
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-01-production.0');
      await createCommit(repository.executeGitCommand, 'Current release change');
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-02.1-beta.1');

      const missingBaselineResult = await resolveRange({
        baselineTagName: '2026-07-03.1-production',
        environment: 'beta',
        releaseTagName: '2026-07-02.1-beta.1',
        repository,
      });
      assert(missingBaselineResult.isErr);
      expect(missingBaselineResult.error.message).toContain('Baseline tag does not exist');

      await repository.executeGitCommand(['checkout', '--quiet', '--orphan', 'unrelated-history']);
      await createCommitTag({
        executeGitCommand: repository.executeGitCommand,
        message: 'Unrelated history',
        tagName: '2026-07-03.1-production',
      });
      await repository.executeGitCommand(['checkout', '--quiet', 'main']);
      const unrelatedBaselineResult = await resolveRange({
        baselineTagName: '2026-07-03.1-production',
        environment: 'beta',
        releaseTagName: '2026-07-02.1-beta.1',
        repository,
      });
      assert(unrelatedBaselineResult.isErr);
      expect(unrelatedBaselineResult.error.message).toContain('Unable to inspect tag');

      const noBaselineRepository = await createTemporaryGitRepository();

      try {
        await createCommitTag({
          executeGitCommand: noBaselineRepository.executeGitCommand,
          message: 'Current release',
          tagName: '2026-07-02.1-beta.1',
        });
        const noBaselineResult = await resolveRange({
          environment: 'beta',
          releaseTagName: '2026-07-02.1-beta.1',
          repository: noBaselineRepository,
        });
        assert(noBaselineResult.isErr);
        expect(noBaselineResult.error.message).toContain('without using the repository root');
      } finally {
        await rm(noBaselineRepository.path, {force: true, recursive: true});
      }
    } finally {
      await rm(repository.path, {force: true, recursive: true});
    }
  });

  it('validates explicit baseline format, existence, identity, and ancestry before use', async (): Promise<void> => {
    const repository = await createTemporaryGitRepository();

    try {
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-01-production.0');
      await createCommit(repository.executeGitCommand, 'Current release change');
      await createAnnotatedTag(repository.executeGitCommand, '2026-07-02.1-beta.1');

      const malformedBaselineResult = await resolveRange({
        baselineTagName: 'not-a-release-tag',
        environment: 'beta',
        releaseTagName: '2026-07-02.1-beta.1',
        repository,
      });
      assert(malformedBaselineResult.isErr);
      expect(malformedBaselineResult.error.message).toContain('Beta baseline tag must be');

      const equalBaselineResult = await resolveRange({
        baselineTagName: '2026-07-02.1-beta.1',
        environment: 'beta',
        releaseTagName: '2026-07-02.1-beta.1',
        repository,
      });
      assert(equalBaselineResult.isErr);
      expect(equalBaselineResult.error.message).toContain('must not equal');

      const validOverrideResult = await resolveRange({
        baselineTagName: '2026-07-01-production.0',
        environment: 'beta',
        releaseTagName: '2026-07-02.1-beta.1',
        repository,
      });
      assert(validOverrideResult.isOk);
      expect(validOverrideResult.value.range.baselineTagName).toBe('2026-07-01-production.0');
    } finally {
      await rm(repository.path, {force: true, recursive: true});
    }
  });
});
