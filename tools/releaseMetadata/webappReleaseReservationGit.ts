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

import {Maybe, Result, Task, Unit, task} from 'true-myth';

import type {ExecuteWebAppReleaseGitCommand} from './webappReleaseHistoryGit.ts';
import {parseWebAppReleaseBranchName} from './webappReleaseIdentity.ts';
import type {
  CreateWebAppReleaseReservationBranchOptions,
  VerifyWebAppReleaseCommitAncestorOptions,
  WebAppReleaseBranchRef,
  WebAppReleaseReservationAction,
} from './webappReleaseReservation.ts';

export type ReadRemoteWebAppReleaseBranchesOptions = {
  readonly executeGitCommand: ExecuteWebAppReleaseGitCommand;
  readonly remoteName: string;
};

export type ReadRemoteWebAppReleaseBranchOptions = ReadRemoteWebAppReleaseBranchesOptions & {
  readonly releaseBranch: string;
};

export type VerifyWebAppReleaseCommitAncestorGitOptions = VerifyWebAppReleaseCommitAncestorOptions & {
  readonly executeGitCommand: ExecuteWebAppReleaseGitCommand;
};

export type PrepareRemoteWebAppReleaseBranchCommitGitOptions = {
  readonly executeGitCommand: ExecuteWebAppReleaseGitCommand;
  readonly expectedCommitSha: string;
  readonly releaseBranch: string;
  readonly remoteName: string;
};

export type CreateWebAppReleaseReservationBranchGitOptions = CreateWebAppReleaseReservationBranchOptions &
  ReadRemoteWebAppReleaseBranchesOptions;

type ExecuteGitCommandOptions = {
  readonly executeGitCommand: ExecuteWebAppReleaseGitCommand;
  readonly commandArguments: readonly string[];
};

type ParseRemoteReleaseBranchesOptions = {
  readonly commandOutput: string;
  readonly expectedReference: string;
};

const fullCommitShaPattern = /^[0-9a-f]{40}$/i;
const remoteReleaseBranchPrefix = 'refs/heads/release/';
const remoteReleaseBranchReferenceFieldCount = 2;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function executeGitCommand(options: ExecuteGitCommandOptions): Task<string, Error> {
  const {executeGitCommand: runGitCommand, commandArguments} = options;

  return task.tryOrElse(
    (error: unknown): Error => {
      return new Error(`Git command failed: git ${commandArguments.join(' ')}: ${errorMessage(error)}`, {
        cause: error,
      });
    },
    async (): Promise<string> => {
      return runGitCommand(commandArguments);
    },
  );
}

function parseRemoteReleaseBranches(
  options: ParseRemoteReleaseBranchesOptions,
): Result<readonly WebAppReleaseBranchRef[], Error> {
  const {commandOutput, expectedReference} = options;
  const releaseBranches: WebAppReleaseBranchRef[] = [];
  const outputLines = commandOutput.split(/\r?\n/).filter(outputLine => {
    return outputLine.length > 0;
  });

  for (const outputLine of outputLines) {
    const outputFields = outputLine.trim().split(/\s+/);
    const commitShaMaybe = Maybe.of(outputFields.at(0));
    const gitReferenceMaybe = Maybe.of(outputFields.at(1));
    if (
      commitShaMaybe.isNothing ||
      gitReferenceMaybe.isNothing ||
      outputFields.length > remoteReleaseBranchReferenceFieldCount ||
      fullCommitShaPattern.test(commitShaMaybe.value) === false ||
      gitReferenceMaybe.value.startsWith(remoteReleaseBranchPrefix) === false
    ) {
      return Result.err(new Error(`Git returned a malformed remote release branch reference: ${outputLine}`));
    }

    const commitSha = commitShaMaybe.value;
    const gitReference = gitReferenceMaybe.value;
    if (expectedReference.length > 0 && gitReference !== expectedReference) {
      return Result.err(new Error(`Git returned an unexpected remote reference: ${gitReference}`));
    }

    releaseBranches.push(
      Object.freeze({
        releaseBranch: gitReference.slice('refs/heads/'.length),
        releaseCommitSha: commitSha.toLowerCase(),
      }),
    );
  }

  if (
    new Set(
      releaseBranches.map(releaseBranch => {
        return releaseBranch.releaseBranch;
      }),
    ).size !== releaseBranches.length
  ) {
    return Result.err(new Error('Git returned duplicate remote WebApp release branches'));
  }

  return Result.ok(Object.freeze(releaseBranches));
}

export function readRemoteWebAppReleaseBranches(
  options: ReadRemoteWebAppReleaseBranchesOptions,
): Task<readonly WebAppReleaseBranchRef[], Error> {
  const {executeGitCommand: runGitCommand, remoteName} = options;
  return executeGitCommand({
    executeGitCommand: runGitCommand,
    commandArguments: ['ls-remote', '--heads', remoteName, `${remoteReleaseBranchPrefix}*`],
  }).andThen(commandOutput => {
    const releaseBranchesResult = parseRemoteReleaseBranches({commandOutput, expectedReference: ''});
    if (releaseBranchesResult.isErr) {
      return Task.reject<readonly WebAppReleaseBranchRef[], Error>(releaseBranchesResult.error);
    }

    return Task.resolve(releaseBranchesResult.value);
  });
}

async function executeRemoteWebAppReleaseBranchCommitPreparation(
  options: PrepareRemoteWebAppReleaseBranchCommitGitOptions,
): Promise<Unit> {
  const {executeGitCommand: runGitCommand, expectedCommitSha, releaseBranch, remoteName} = options;
  const releaseBranchVersionResult = parseWebAppReleaseBranchName(releaseBranch);
  if (releaseBranchVersionResult.isErr) {
    throw releaseBranchVersionResult.error;
  }

  if (fullCommitShaPattern.test(expectedCommitSha) === false) {
    throw new Error('Invalid expected release commit: expected a full 40-character hexadecimal SHA');
  }

  const fetchResult = await executeGitCommand({
    executeGitCommand: runGitCommand,
    commandArguments: ['fetch', '--no-tags', remoteName, `refs/heads/${releaseBranch}`],
  });
  if (fetchResult.isErr) {
    throw new Error(`Unable to fetch remote WebApp release branch ${releaseBranch}: ${fetchResult.error.message}`, {
      cause: fetchResult.error,
    });
  }

  const fetchedCommitResult = await executeGitCommand({
    executeGitCommand: runGitCommand,
    commandArguments: ['rev-parse', '--verify', '--end-of-options', 'FETCH_HEAD^{commit}'],
  });
  if (fetchedCommitResult.isErr) {
    throw new Error(
      `Unable to resolve fetched WebApp release branch ${releaseBranch} commit: ${fetchedCommitResult.error.message}`,
      {cause: fetchedCommitResult.error},
    );
  }

  const fetchedCommitSha = fetchedCommitResult.value.trim().toLowerCase();
  if (fullCommitShaPattern.test(fetchedCommitSha) === false) {
    throw new Error(`Unable to resolve fetched WebApp release branch ${releaseBranch} to a full commit SHA`);
  }

  const normalizedExpectedCommitSha = expectedCommitSha.toLowerCase();
  if (fetchedCommitSha !== normalizedExpectedCommitSha) {
    throw new Error(
      `WebApp release branch changed during continuation: ${releaseBranch} was ${normalizedExpectedCommitSha} when discovered, but fetch resolved ${fetchedCommitSha}; retry continuation`,
    );
  }

  return Unit;
}

export function prepareRemoteWebAppReleaseBranchCommit(
  options: PrepareRemoteWebAppReleaseBranchCommitGitOptions,
): Task<Unit, Error> {
  const {executeGitCommand: runGitCommand, expectedCommitSha, releaseBranch, remoteName} = options;

  return task.tryOrElse(
    (error: unknown): Error => {
      return error instanceof Error ? error : new Error(String(error));
    },
    async (): Promise<Unit> => {
      return executeRemoteWebAppReleaseBranchCommitPreparation({
        executeGitCommand: runGitCommand,
        expectedCommitSha,
        releaseBranch,
        remoteName,
      });
    },
  );
}

function readRemoteWebAppReleaseBranch(
  options: ReadRemoteWebAppReleaseBranchOptions,
): Task<Maybe<WebAppReleaseBranchRef>, Error> {
  const {executeGitCommand: runGitCommand, remoteName, releaseBranch} = options;
  const expectedReference = `refs/heads/${releaseBranch}`;
  return executeGitCommand({
    executeGitCommand: runGitCommand,
    commandArguments: ['ls-remote', '--heads', remoteName, expectedReference],
  }).andThen(commandOutput => {
    const releaseBranchResult = parseRemoteReleaseBranches({commandOutput, expectedReference});
    if (releaseBranchResult.isErr) {
      return Task.reject<Maybe<WebAppReleaseBranchRef>, Error>(releaseBranchResult.error);
    }

    return Task.resolve(Maybe.of(releaseBranchResult.value.at(0)));
  });
}

function parseCommitCountRange(commandOutput: string): Result<boolean, Error> {
  const baseOnlyCommitCountMaybe = Maybe.of(/^(\d+)\s+(\d+)$/.exec(commandOutput.trim())).andThen(countMatch => {
    return Maybe.of(countMatch.at(1));
  });
  if (baseOnlyCommitCountMaybe.isNothing) {
    return Result.err(new Error('Git returned an invalid ancestor check result'));
  }

  return Result.ok(baseOnlyCommitCountMaybe.value === '0');
}

export function isWebAppReleaseCommitAncestor(
  options: VerifyWebAppReleaseCommitAncestorGitOptions,
): Task<boolean, Error> {
  const {executeGitCommand: runGitCommand, baseCommit, targetCommit} = options;
  if (fullCommitShaPattern.test(baseCommit) === false) {
    return Task.reject(new Error('Invalid base commit: expected a full 40-character hexadecimal SHA'));
  }

  if (fullCommitShaPattern.test(targetCommit) === false) {
    return Task.reject(new Error('Invalid target commit: expected a full 40-character hexadecimal SHA'));
  }

  return executeGitCommand({
    executeGitCommand: runGitCommand,
    commandArguments: [
      'rev-list',
      '--left-right',
      '--count',
      `${baseCommit.toLowerCase()}...${targetCommit.toLowerCase()}`,
    ],
  }).andThen(commandOutput => {
    const ancestorResult = parseCommitCountRange(commandOutput);
    if (ancestorResult.isErr) {
      return Task.reject<boolean, Error>(ancestorResult.error);
    }

    return Task.resolve(ancestorResult.value);
  });
}

export function createWebAppReleaseReservationBranch(
  options: CreateWebAppReleaseReservationBranchGitOptions,
): Task<WebAppReleaseReservationAction, Error> {
  const {executeGitCommand: runGitCommand, remoteName, releaseBranch, targetCommit: requestedTargetCommit} = options;
  const releaseBranchVersionResult = parseWebAppReleaseBranchName(releaseBranch);
  if (releaseBranchVersionResult.isErr) {
    return Task.reject(releaseBranchVersionResult.error);
  }

  if (fullCommitShaPattern.test(requestedTargetCommit) === false) {
    return Task.reject(new Error('Invalid target commit: expected a full 40-character hexadecimal SHA'));
  }

  const branchReference = `refs/heads/${releaseBranch}`;
  const targetCommit = requestedTargetCommit.toLowerCase();
  // An empty lease allows creation only while this ref is absent; it cannot move an existing reservation.
  return executeGitCommand({
    executeGitCommand: runGitCommand,
    commandArguments: [
      'push',
      '--porcelain',
      `--force-with-lease=${branchReference}:`,
      remoteName,
      `${targetCommit}:${branchReference}`,
    ],
  })
    .map(() => {
      return 'created' as const;
    })
    .orElse(pushError => {
      return readRemoteWebAppReleaseBranch({executeGitCommand: runGitCommand, remoteName, releaseBranch})
        .mapRejected(branchError => {
          return new Error(
            `Unable to verify failed release reservation push for ${releaseBranch}: ${branchError.message}`,
            {cause: branchError},
          );
        })
        .andThen(remoteBranchMaybe => {
          return remoteBranchMaybe.match({
            Just(remoteBranch) {
              if (remoteBranch.releaseCommitSha === targetCommit) {
                return Task.resolve<WebAppReleaseReservationAction, Error>('reused');
              }

              return Task.reject<WebAppReleaseReservationAction, Error>(
                new Error(
                  `WebApp release reservation conflict: ${releaseBranch} points to ${remoteBranch.releaseCommitSha}, requested target is ${targetCommit}`,
                ),
              );
            },
            Nothing() {
              return Task.reject<WebAppReleaseReservationAction, Error>(
                new Error(`Unable to create WebApp release reservation ${releaseBranch}: ${pushError.message}`, {
                  cause: pushError,
                }),
              );
            },
          });
        });
    });
}
