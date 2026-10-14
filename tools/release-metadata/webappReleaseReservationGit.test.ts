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

import {
  createWebAppReleaseReservationBranch,
  isWebAppReleaseCommitAncestor,
  prepareRemoteWebAppReleaseBranchCommit,
  readRemoteWebAppReleaseBranches,
} from './webappReleaseReservationGit.ts';
import {continueActiveWebAppRelease} from './webappReleaseReservation.ts';
import type {
  ContinueActiveWebAppReleaseDependencies,
  PrepareRemoteReleaseBranchCommitOptions,
  VerifyWebAppReleaseCommitAncestorOptions,
} from './webappReleaseReservation.ts';
import {discoverStableWebAppReleases} from './webappStableReleaseGit.ts';
import type {ExecuteWebAppReleaseGitCommand} from './webappReleaseHistoryGit.ts';

type TemporaryRemoteRepository = {
  readonly temporaryDirectoryPath: string;
  readonly remoteDirectoryPath: string;
  readonly workingDirectoryPath: string;
  readonly stableCommit: string;
  readonly targetCommit: string;
  readonly laterCommit: string;
  readonly executeGitCommand: ExecuteWebAppReleaseGitCommand;
};

type GitCommandOptions = {
  readonly arguments: readonly string[];
  readonly workingDirectoryPath: string;
};

type CreateCommitOptions = {
  readonly fileContents: string;
  readonly fileName: string;
  readonly workingDirectoryPath: string;
};

type CreateReviewedFixWorkingCopyOptions = {
  readonly remoteDirectoryPath: string;
  readonly temporaryDirectoryPath: string;
};

type CreateContinuationGitDependenciesOptions = {
  readonly repository: TemporaryRemoteRepository;
  readonly executeGitCommand?: ExecuteWebAppReleaseGitCommand;
};

type DoesGitCommitObjectExistOptions = {
  readonly commitSha: string;
  readonly workingDirectoryPath: string;
};

type SimulateConcurrentPushOptions = {
  readonly competingCommit: string;
  readonly releaseBranch: string;
  readonly repository: TemporaryRemoteRepository;
};

function runGitCommand(options: GitCommandOptions): string {
  return execFileSync('git', [...options.arguments], {
    cwd: options.workingDirectoryPath,
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

function createCommit(options: CreateCommitOptions): string {
  writeFileSync(join(options.workingDirectoryPath, options.fileName), options.fileContents, 'utf8');
  runGitCommand({arguments: ['add', options.fileName], workingDirectoryPath: options.workingDirectoryPath});
  runGitCommand({
    arguments: ['commit', '--quiet', '-m', `Create ${options.fileName}`],
    workingDirectoryPath: options.workingDirectoryPath,
  });

  return runGitCommand({arguments: ['rev-parse', 'HEAD'], workingDirectoryPath: options.workingDirectoryPath}).trim();
}

function createTemporaryRemoteRepository(): TemporaryRemoteRepository {
  const temporaryDirectoryPath = mkdtempSync(join(tmpdir(), 'wire-webapp-reservation-git-'));
  const remoteDirectoryPath = join(temporaryDirectoryPath, 'remote.git');
  const workingDirectoryPath = join(temporaryDirectoryPath, 'working-copy');

  runGitCommand({
    arguments: ['init', '--bare', '--quiet', remoteDirectoryPath],
    workingDirectoryPath: temporaryDirectoryPath,
  });
  runGitCommand({
    arguments: ['clone', '--quiet', remoteDirectoryPath, workingDirectoryPath],
    workingDirectoryPath: temporaryDirectoryPath,
  });
  runGitCommand({arguments: ['checkout', '--quiet', '-b', 'main'], workingDirectoryPath});
  runGitCommand({arguments: ['config', 'user.name', 'Release Test'], workingDirectoryPath});
  runGitCommand({arguments: ['config', 'user.email', 'release-test@example.invalid'], workingDirectoryPath});
  runGitCommand({arguments: ['config', 'commit.gpgsign', 'false'], workingDirectoryPath});
  runGitCommand({arguments: ['config', 'tag.gpgsign', 'false'], workingDirectoryPath});

  const stableCommit = createCommit({
    workingDirectoryPath,
    fileName: 'stable.txt',
    fileContents: 'stable',
  });
  runGitCommand({arguments: ['tag', '-a', 'v1.0.0', '-m', 'Bootstrap stable release'], workingDirectoryPath});
  runGitCommand({arguments: ['push', '--quiet', '--set-upstream', 'origin', 'main', '--tags'], workingDirectoryPath});

  const targetCommit = createCommit({
    workingDirectoryPath,
    fileName: 'target.txt',
    fileContents: 'target',
  });
  const laterCommit = createCommit({
    workingDirectoryPath,
    fileName: 'later.txt',
    fileContents: 'later',
  });

  return {
    temporaryDirectoryPath,
    remoteDirectoryPath,
    workingDirectoryPath,
    stableCommit,
    targetCommit,
    laterCommit,
    async executeGitCommand(commandArguments) {
      return runGitCommand({arguments: commandArguments, workingDirectoryPath});
    },
  };
}

function createReviewedFixWorkingCopy(options: CreateReviewedFixWorkingCopyOptions): string {
  const workingDirectoryPath = join(options.temporaryDirectoryPath, 'reviewed-fix-copy');
  runGitCommand({
    arguments: ['clone', '--quiet', options.remoteDirectoryPath, workingDirectoryPath],
    workingDirectoryPath: options.temporaryDirectoryPath,
  });
  runGitCommand({arguments: ['config', 'user.name', 'Release Fix Author'], workingDirectoryPath});
  runGitCommand({arguments: ['config', 'user.email', 'release-fix@example.invalid'], workingDirectoryPath});
  runGitCommand({arguments: ['config', 'commit.gpgsign', 'false'], workingDirectoryPath});
  runGitCommand({
    arguments: ['checkout', '--quiet', '-b', 'reviewed-fix', 'origin/release/1.1.0'],
    workingDirectoryPath,
  });

  return workingDirectoryPath;
}

function doesGitCommitObjectExist(options: DoesGitCommitObjectExistOptions): boolean {
  try {
    runGitCommand({
      arguments: ['cat-file', '-e', `${options.commitSha}^{commit}`],
      workingDirectoryPath: options.workingDirectoryPath,
    });

    return true;
  } catch {
    return false;
  }
}

function createConcurrentGitExecutor(options: SimulateConcurrentPushOptions): ExecuteWebAppReleaseGitCommand {
  let concurrentPushCompleted = false;

  return async function executeGitCommand(commandArguments): Promise<string> {
    const isReservationPush =
      commandArguments.at(0) === 'push' &&
      commandArguments.some(commandArgument => {
        return commandArgument.endsWith(`:refs/heads/${options.releaseBranch}`);
      });

    if (isReservationPush && concurrentPushCompleted === false) {
      runGitCommand({
        arguments: ['push', '--porcelain', 'origin', `${options.competingCommit}:refs/heads/${options.releaseBranch}`],
        workingDirectoryPath: options.repository.workingDirectoryPath,
      });
      concurrentPushCompleted = true;

      throw new Error('Simulated concurrent branch creation');
    }

    return runGitCommand({
      arguments: commandArguments,
      workingDirectoryPath: options.repository.workingDirectoryPath,
    });
  };
}

function createContinuationGitDependencies(
  options: CreateContinuationGitDependenciesOptions,
): ContinueActiveWebAppReleaseDependencies {
  const executeGitCommand = options.executeGitCommand ?? options.repository.executeGitCommand;

  function readStableWebAppReleases(): ReturnType<typeof discoverStableWebAppReleases> {
    return discoverStableWebAppReleases({executeGitCommand});
  }

  function readRemoteReleaseBranches(): ReturnType<typeof readRemoteWebAppReleaseBranches> {
    return readRemoteWebAppReleaseBranches({
      executeGitCommand,
      remoteName: 'origin',
    });
  }

  function prepareRemoteReleaseBranchCommit(
    preparationOptions: PrepareRemoteReleaseBranchCommitOptions,
  ): ReturnType<typeof prepareRemoteWebAppReleaseBranchCommit> {
    return prepareRemoteWebAppReleaseBranchCommit({
      ...preparationOptions,
      executeGitCommand,
      remoteName: 'origin',
    });
  }

  function verifyStableBaseAncestry(
    ancestorOptions: VerifyWebAppReleaseCommitAncestorOptions,
  ): ReturnType<typeof isWebAppReleaseCommitAncestor> {
    return isWebAppReleaseCommitAncestor({
      ...ancestorOptions,
      executeGitCommand,
    });
  }

  return {
    readStableWebAppReleases,
    readRemoteReleaseBranches,
    prepareRemoteReleaseBranchCommit,
    isCommitAncestor: verifyStableBaseAncestry,
  };
}

describe('WebApp release reservation Git adapter', () => {
  it('lists remote release branches, checks ancestry, and creates a branch with a create-only ref lease', async () => {
    const temporaryRepository = createTemporaryRemoteRepository();
    const commandHistory: string[][] = [];
    const executeGitCommand: ExecuteWebAppReleaseGitCommand = async function executeGitCommand(commandArguments) {
      commandHistory.push([...commandArguments]);

      return temporaryRepository.executeGitCommand(commandArguments);
    };

    try {
      const actualBranchesResult = await readRemoteWebAppReleaseBranches({
        executeGitCommand,
        remoteName: 'origin',
      });
      assert(actualBranchesResult.isOk);
      expect(actualBranchesResult.value).toEqual([]);

      const actualAncestorResult = await isWebAppReleaseCommitAncestor({
        executeGitCommand,
        baseCommit: temporaryRepository.stableCommit,
        targetCommit: temporaryRepository.targetCommit,
      });
      assert(actualAncestorResult.isOk);
      expect(actualAncestorResult.value).toBe(true);

      const actualCreationResult = await createWebAppReleaseReservationBranch({
        executeGitCommand,
        remoteName: 'origin',
        releaseBranch: 'release/1.1.0',
        targetCommit: temporaryRepository.targetCommit,
      });

      assert(actualCreationResult.isOk);
      expect(actualCreationResult.value).toBe('created');
      expect(commandHistory).toContainEqual([
        'push',
        '--porcelain',
        '--force-with-lease=refs/heads/release/1.1.0:',
        'origin',
        `${temporaryRepository.targetCommit}:refs/heads/release/1.1.0`,
      ]);

      const actualReservedBranchesResult = await readRemoteWebAppReleaseBranches({
        executeGitCommand,
        remoteName: 'origin',
      });
      assert(actualReservedBranchesResult.isOk);
      expect(actualReservedBranchesResult.value).toEqual([
        {releaseBranch: 'release/1.1.0', releaseCommitSha: temporaryRepository.targetCommit},
      ]);
    } finally {
      rmSync(temporaryRepository.temporaryDirectoryPath, {force: true, recursive: true});
    }
  });

  it('reuses a same-commit reservation created concurrently', async () => {
    const temporaryRepository = createTemporaryRemoteRepository();

    try {
      const actualReservationResult = await createWebAppReleaseReservationBranch({
        executeGitCommand: createConcurrentGitExecutor({
          repository: temporaryRepository,
          releaseBranch: 'release/1.1.0',
          competingCommit: temporaryRepository.targetCommit,
        }),
        remoteName: 'origin',
        releaseBranch: 'release/1.1.0',
        targetCommit: temporaryRepository.targetCommit,
      });

      assert(actualReservationResult.isOk);
      expect(actualReservationResult.value).toBe('reused');
    } finally {
      rmSync(temporaryRepository.temporaryDirectoryPath, {force: true, recursive: true});
    }
  });

  it('fails on a different concurrent reservation without moving its ref', async () => {
    const temporaryRepository = createTemporaryRemoteRepository();

    try {
      const actualReservationResult = await createWebAppReleaseReservationBranch({
        executeGitCommand: createConcurrentGitExecutor({
          repository: temporaryRepository,
          releaseBranch: 'release/1.1.0',
          competingCommit: temporaryRepository.laterCommit,
        }),
        remoteName: 'origin',
        releaseBranch: 'release/1.1.0',
        targetCommit: temporaryRepository.targetCommit,
      });

      assert(actualReservationResult.isErr);
      expect(actualReservationResult.error.message).toContain('WebApp release reservation conflict');

      const actualRemoteBranchesResult = await readRemoteWebAppReleaseBranches({
        executeGitCommand: temporaryRepository.executeGitCommand,
        remoteName: 'origin',
      });
      assert(actualRemoteBranchesResult.isOk);
      expect(actualRemoteBranchesResult.value).toEqual([
        {releaseBranch: 'release/1.1.0', releaseCommitSha: temporaryRepository.laterCommit},
      ]);
    } finally {
      rmSync(temporaryRepository.temporaryDirectoryPath, {force: true, recursive: true});
    }
  });

  it('does not fast-forward an existing reservation at an ancestor commit', async () => {
    const temporaryRepository = createTemporaryRemoteRepository();

    try {
      runGitCommand({
        arguments: ['push', '--quiet', 'origin', `${temporaryRepository.stableCommit}:refs/heads/release/1.1.0`],
        workingDirectoryPath: temporaryRepository.workingDirectoryPath,
      });

      const actualReservationResult = await createWebAppReleaseReservationBranch({
        executeGitCommand: temporaryRepository.executeGitCommand,
        remoteName: 'origin',
        releaseBranch: 'release/1.1.0',
        targetCommit: temporaryRepository.targetCommit,
      });

      assert(actualReservationResult.isErr);
      expect(actualReservationResult.error.message).toContain('WebApp release reservation conflict');

      const actualRemoteBranchesResult = await readRemoteWebAppReleaseBranches({
        executeGitCommand: temporaryRepository.executeGitCommand,
        remoteName: 'origin',
      });
      assert(actualRemoteBranchesResult.isOk);
      expect(actualRemoteBranchesResult.value).toEqual([
        {releaseBranch: 'release/1.1.0', releaseCommitSha: temporaryRepository.stableCommit},
      ]);
    } finally {
      rmSync(temporaryRepository.temporaryDirectoryPath, {force: true, recursive: true});
    }
  });

  it('fetches and continues a remote-only reviewed fix without mutating remote refs', async () => {
    const temporaryRepository = createTemporaryRemoteRepository();

    try {
      runGitCommand({
        arguments: ['push', '--quiet', 'origin', `${temporaryRepository.targetCommit}:refs/heads/release/1.1.0`],
        workingDirectoryPath: temporaryRepository.workingDirectoryPath,
      });

      const reviewedFixWorkingDirectoryPath = createReviewedFixWorkingCopy({
        remoteDirectoryPath: temporaryRepository.remoteDirectoryPath,
        temporaryDirectoryPath: temporaryRepository.temporaryDirectoryPath,
      });
      const reviewedFixCommit = createCommit({
        workingDirectoryPath: reviewedFixWorkingDirectoryPath,
        fileName: 'reviewed-fix.txt',
        fileContents: 'reviewed fix',
      });
      runGitCommand({
        arguments: ['push', '--quiet', 'origin', `${reviewedFixCommit}:refs/heads/release/1.1.0`],
        workingDirectoryPath: reviewedFixWorkingDirectoryPath,
      });

      const actualWorkerHasReviewedFixBeforeContinuation = doesGitCommitObjectExist({
        commitSha: reviewedFixCommit,
        workingDirectoryPath: temporaryRepository.workingDirectoryPath,
      });
      expect(actualWorkerHasReviewedFixBeforeContinuation).toBe(false);

      const actualRemoteReferencesBeforeContinuation = runGitCommand({
        arguments: ['ls-remote', '--heads', 'origin'],
        workingDirectoryPath: temporaryRepository.workingDirectoryPath,
      });

      const dependencies = createContinuationGitDependencies({repository: temporaryRepository});
      const actualContinuationResult = await continueActiveWebAppRelease({dependencies});

      assert(actualContinuationResult.isOk);
      expect(actualContinuationResult.value).toEqual({
        version: '1.1.0',
        releaseBranch: 'release/1.1.0',
        releaseCommitSha: reviewedFixCommit,
        stableBaseVersion: '1.0.0',
        stableBaseTag: 'v1.0.0',
        stableBaseCommitSha: temporaryRepository.stableCommit,
        action: 'reused',
      });

      const actualWorkerHasReviewedFixAfterContinuation = doesGitCommitObjectExist({
        commitSha: reviewedFixCommit,
        workingDirectoryPath: temporaryRepository.workingDirectoryPath,
      });
      expect(actualWorkerHasReviewedFixAfterContinuation).toBe(true);

      const actualRemoteReferencesAfterContinuation = runGitCommand({
        arguments: ['ls-remote', '--heads', 'origin'],
        workingDirectoryPath: temporaryRepository.workingDirectoryPath,
      });
      expect(actualRemoteReferencesAfterContinuation).toBe(actualRemoteReferencesBeforeContinuation);
    } finally {
      rmSync(temporaryRepository.temporaryDirectoryPath, {force: true, recursive: true});
    }
  });

  it('fails when a release branch advances between remote discovery and fetch', async () => {
    const temporaryRepository = createTemporaryRemoteRepository();

    try {
      runGitCommand({
        arguments: ['push', '--quiet', 'origin', `${temporaryRepository.targetCommit}:refs/heads/release/1.1.0`],
        workingDirectoryPath: temporaryRepository.workingDirectoryPath,
      });

      const reviewedFixWorkingDirectoryPath = createReviewedFixWorkingCopy({
        remoteDirectoryPath: temporaryRepository.remoteDirectoryPath,
        temporaryDirectoryPath: temporaryRepository.temporaryDirectoryPath,
      });
      const discoveredCommit = createCommit({
        workingDirectoryPath: reviewedFixWorkingDirectoryPath,
        fileName: 'first-reviewed-fix.txt',
        fileContents: 'first reviewed fix',
      });
      runGitCommand({
        arguments: ['push', '--quiet', 'origin', `${discoveredCommit}:refs/heads/release/1.1.0`],
        workingDirectoryPath: reviewedFixWorkingDirectoryPath,
      });

      const commandHistory: string[][] = [];
      let advancedCommit: string | undefined;
      const executeGitCommand: ExecuteWebAppReleaseGitCommand = async (commandArguments): Promise<string> => {
        commandHistory.push([...commandArguments]);

        if (commandArguments.at(0) === 'fetch' && advancedCommit === undefined) {
          advancedCommit = createCommit({
            workingDirectoryPath: reviewedFixWorkingDirectoryPath,
            fileName: 'racing-reviewed-fix.txt',
            fileContents: 'racing reviewed fix',
          });
          runGitCommand({
            arguments: ['push', '--quiet', 'origin', `${advancedCommit}:refs/heads/release/1.1.0`],
            workingDirectoryPath: reviewedFixWorkingDirectoryPath,
          });
        }

        return temporaryRepository.executeGitCommand(commandArguments);
      };
      const dependencies = createContinuationGitDependencies({repository: temporaryRepository, executeGitCommand});

      const actualContinuationResult = await continueActiveWebAppRelease({dependencies});

      assert(actualContinuationResult.isErr);
      assert(advancedCommit !== undefined);
      expect(actualContinuationResult.error.message).toBe(
        `WebApp release branch changed during continuation: release/1.1.0 was ${discoveredCommit} when discovered, but fetch resolved ${advancedCommit}; retry continuation`,
      );
      expect(
        commandHistory.some(commandArguments => {
          return commandArguments.at(0) === 'rev-list';
        }),
      ).toBe(false);
    } finally {
      rmSync(temporaryRepository.temporaryDirectoryPath, {force: true, recursive: true});
    }
  });
});
