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

async function executeGitCommand(options: ExecuteGitCommandOptions): Promise<Result<string, Error>> {
  try {
    return Result.ok(await options.executeGitCommand(options.commandArguments));
  } catch (error: unknown) {
    return Result.err(
      new Error(`Git command failed: git ${options.commandArguments.join(' ')}: ${errorMessage(error)}`, {
        cause: error,
      }),
    );
  }
}

function parseRemoteReleaseBranches(
  options: ParseRemoteReleaseBranchesOptions,
): Result<readonly WebAppReleaseBranchRef[], Error> {
  const releaseBranches: WebAppReleaseBranchRef[] = [];
  const outputLines = options.commandOutput.split(/\r?\n/).filter(outputLine => {
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
    if (options.expectedReference.length > 0 && gitReference !== options.expectedReference) {
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

export async function readRemoteWebAppReleaseBranches(
  options: ReadRemoteWebAppReleaseBranchesOptions,
): Promise<Result<readonly WebAppReleaseBranchRef[], Error>> {
  const commandResult = await executeGitCommand({
    executeGitCommand: options.executeGitCommand,
    commandArguments: ['ls-remote', '--heads', options.remoteName, `${remoteReleaseBranchPrefix}*`],
  });
  if (commandResult.isErr) {
    return Result.err(commandResult.error);
  }

  return parseRemoteReleaseBranches({commandOutput: commandResult.value, expectedReference: ''});
}

async function executeRemoteWebAppReleaseBranchCommitPreparation(
  options: PrepareRemoteWebAppReleaseBranchCommitGitOptions,
): Promise<Unit> {
  const releaseBranchVersionResult = parseWebAppReleaseBranchName(options.releaseBranch);
  if (releaseBranchVersionResult.isErr) {
    throw releaseBranchVersionResult.error;
  }

  if (fullCommitShaPattern.test(options.expectedCommitSha) === false) {
    throw new Error('Invalid expected release commit: expected a full 40-character hexadecimal SHA');
  }

  const fetchResult = await executeGitCommand({
    executeGitCommand: options.executeGitCommand,
    commandArguments: ['fetch', '--no-tags', options.remoteName, `refs/heads/${options.releaseBranch}`],
  });
  if (fetchResult.isErr) {
    throw new Error(
      `Unable to fetch remote WebApp release branch ${options.releaseBranch}: ${fetchResult.error.message}`,
      {
        cause: fetchResult.error,
      },
    );
  }

  const fetchedCommitResult = await executeGitCommand({
    executeGitCommand: options.executeGitCommand,
    commandArguments: ['rev-parse', '--verify', '--end-of-options', 'FETCH_HEAD^{commit}'],
  });
  if (fetchedCommitResult.isErr) {
    throw new Error(
      `Unable to resolve fetched WebApp release branch ${options.releaseBranch} commit: ${fetchedCommitResult.error.message}`,
      {cause: fetchedCommitResult.error},
    );
  }

  const fetchedCommitSha = fetchedCommitResult.value.trim().toLowerCase();
  if (fullCommitShaPattern.test(fetchedCommitSha) === false) {
    throw new Error(`Unable to resolve fetched WebApp release branch ${options.releaseBranch} to a full commit SHA`);
  }

  const expectedCommitSha = options.expectedCommitSha.toLowerCase();
  if (fetchedCommitSha !== expectedCommitSha) {
    throw new Error(
      `WebApp release branch changed during continuation: ${options.releaseBranch} was ${expectedCommitSha} when discovered, but fetch resolved ${fetchedCommitSha}; retry continuation`,
    );
  }

  return Unit;
}

export function prepareRemoteWebAppReleaseBranchCommit(
  options: PrepareRemoteWebAppReleaseBranchCommitGitOptions,
): Task<Unit, Error> {
  return task.tryOrElse(
    (error: unknown): Error => {
      return error instanceof Error ? error : new Error(String(error));
    },
    async (): Promise<Unit> => {
      return executeRemoteWebAppReleaseBranchCommitPreparation(options);
    },
  );
}

async function readRemoteWebAppReleaseBranch(
  options: ReadRemoteWebAppReleaseBranchOptions,
): Promise<Result<Maybe<WebAppReleaseBranchRef>, Error>> {
  const expectedReference = `refs/heads/${options.releaseBranch}`;
  const commandResult = await executeGitCommand({
    executeGitCommand: options.executeGitCommand,
    commandArguments: ['ls-remote', '--heads', options.remoteName, expectedReference],
  });
  if (commandResult.isErr) {
    return Result.err(commandResult.error);
  }

  const releaseBranchResult = parseRemoteReleaseBranches({
    commandOutput: commandResult.value,
    expectedReference,
  });
  if (releaseBranchResult.isErr) {
    return Result.err(releaseBranchResult.error);
  }

  const releaseBranchMaybe = Maybe.of(releaseBranchResult.value.at(0));

  return Result.ok(releaseBranchMaybe);
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

export async function isWebAppReleaseCommitAncestor(
  options: VerifyWebAppReleaseCommitAncestorGitOptions,
): Promise<Result<boolean, Error>> {
  if (fullCommitShaPattern.test(options.baseCommit) === false) {
    return Result.err(new Error('Invalid base commit: expected a full 40-character hexadecimal SHA'));
  }

  if (fullCommitShaPattern.test(options.targetCommit) === false) {
    return Result.err(new Error('Invalid target commit: expected a full 40-character hexadecimal SHA'));
  }

  const commandResult = await executeGitCommand({
    executeGitCommand: options.executeGitCommand,
    commandArguments: [
      'rev-list',
      '--left-right',
      '--count',
      `${options.baseCommit.toLowerCase()}...${options.targetCommit.toLowerCase()}`,
    ],
  });
  if (commandResult.isErr) {
    return Result.err(commandResult.error);
  }

  return parseCommitCountRange(commandResult.value);
}

export async function createWebAppReleaseReservationBranch(
  options: CreateWebAppReleaseReservationBranchGitOptions,
): Promise<Result<WebAppReleaseReservationAction, Error>> {
  const releaseBranchVersionResult = parseWebAppReleaseBranchName(options.releaseBranch);
  if (releaseBranchVersionResult.isErr) {
    return Result.err(releaseBranchVersionResult.error);
  }

  if (fullCommitShaPattern.test(options.targetCommit) === false) {
    return Result.err(new Error('Invalid target commit: expected a full 40-character hexadecimal SHA'));
  }

  const branchReference = `refs/heads/${options.releaseBranch}`;
  const targetCommit = options.targetCommit.toLowerCase();
  // An empty lease allows creation only while this ref is absent; it cannot move an existing reservation.
  const pushResult = await executeGitCommand({
    executeGitCommand: options.executeGitCommand,
    commandArguments: [
      'push',
      '--porcelain',
      `--force-with-lease=${branchReference}:`,
      options.remoteName,
      `${targetCommit}:${branchReference}`,
    ],
  });
  if (pushResult.isOk) {
    return Result.ok('created');
  }

  const remoteBranchResult = await readRemoteWebAppReleaseBranch({
    executeGitCommand: options.executeGitCommand,
    remoteName: options.remoteName,
    releaseBranch: options.releaseBranch,
  });
  if (remoteBranchResult.isErr) {
    return Result.err(
      new Error(
        `Unable to verify failed release reservation push for ${options.releaseBranch}: ${remoteBranchResult.error.message}`,
        {cause: remoteBranchResult.error},
      ),
    );
  }

  return remoteBranchResult.value.match({
    Just(remoteBranch) {
      if (remoteBranch.releaseCommitSha === targetCommit) {
        return Result.ok('reused');
      }

      return Result.err(
        new Error(
          `WebApp release reservation conflict: ${options.releaseBranch} points to ${remoteBranch.releaseCommitSha}, requested target is ${targetCommit}`,
        ),
      );
    },
    Nothing() {
      return Result.err(
        new Error(`Unable to create WebApp release reservation ${options.releaseBranch}: ${pushResult.error.message}`, {
          cause: pushResult.error,
        }),
      );
    },
  });
}
