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

import {isError} from '@sindresorhus/is';
import {maybe, Result} from 'true-myth';

export type ExecuteWebAppReleaseGitCommand = (commandArguments: readonly string[]) => Promise<string>;

export type WebAppReleaseHistory = {
  readonly baseCommit: string;
  readonly targetCommit: string;
  readonly commits: readonly string[];
};

export type ReadWebAppReleaseHistoryOptions = {
  readonly baseCommit: string;
  readonly targetCommit: string;
  readonly executeGitCommand: ExecuteWebAppReleaseGitCommand;
};

type ExecuteGitCommandOptions = {
  readonly executeGitCommand: ExecuteWebAppReleaseGitCommand;
  readonly commandArguments: readonly string[];
};

type ResolveGitCommitOptions = {
  readonly executeGitCommand: ExecuteWebAppReleaseGitCommand;
  readonly commitReference: string;
  readonly commitName: 'base' | 'target';
};

const fullCommitShaPattern = /^[0-9a-f]{40}$/i;

function errorMessage(error: unknown): string {
  return isError(error) ? error.message : String(error);
}

async function executeGitCommand(options: ExecuteGitCommandOptions): Promise<Result<string, Error>> {
  try {
    const commandOutput = await options.executeGitCommand(options.commandArguments);

    return Result.ok(commandOutput);
  } catch (error: unknown) {
    const gitCommand = `git ${options.commandArguments.join(' ')}`;

    return Result.err(new Error(`Git command failed: ${gitCommand}: ${errorMessage(error)}`, {cause: error}));
  }
}

async function resolveGitCommit(options: ResolveGitCommitOptions): Promise<Result<string, Error>> {
  const commandResult = await executeGitCommand({
    executeGitCommand: options.executeGitCommand,
    commandArguments: ['rev-parse', '--verify', '--end-of-options', `${options.commitReference}^{commit}`],
  });

  if (commandResult.isErr) {
    return Result.err(
      new Error(
        `Unable to resolve ${options.commitName} commit ${options.commitReference}: ${commandResult.error.message}`,
        {cause: commandResult.error},
      ),
    );
  }

  const resolvedCommitSha = commandResult.value.trim();
  if (!fullCommitShaPattern.test(resolvedCommitSha)) {
    return Result.err(
      new Error(`Unable to resolve ${options.commitName} commit ${options.commitReference} to a commit SHA`),
    );
  }

  return Result.ok(resolvedCommitSha.toLowerCase());
}

function parseCommitCountRange(commandOutput: string): Result<boolean, Error> {
  const countMatch = /^(\d+)\s+(\d+)$/.exec(commandOutput.trim());
  const baseOnlyCommitCount = countMatch?.at(1);

  if (countMatch === null || baseOnlyCommitCount === undefined) {
    return Result.err(new Error('Git returned an invalid ancestor check result'));
  }

  return Result.ok(baseOnlyCommitCount === '0');
}

function containsInvalidCommitSha(commitShas: readonly string[]): boolean {
  return maybe.find(commitSha => {
    return !fullCommitShaPattern.test(commitSha);
  }, commitShas).isJust;
}

function parseFirstParentCommitList(commandOutput: string): Result<readonly string[], Error> {
  const commitShas = commandOutput
    .split(/\r?\n/)
    .map(commitSha => {
      return commitSha.trim();
    })
    .filter(commitSha => {
      return commitSha.length > 0;
    });

  if (containsInvalidCommitSha(commitShas)) {
    return Result.err(new Error('Git returned an invalid commit SHA in the first-parent range'));
  }

  if (new Set(commitShas).size !== commitShas.length) {
    return Result.err(new Error('Git returned duplicate commits in the first-parent range'));
  }

  return Result.ok(
    Object.freeze(
      commitShas.map(commitSha => {
        return commitSha.toLowerCase();
      }),
    ),
  );
}

export async function readWebAppReleaseHistory(
  options: ReadWebAppReleaseHistoryOptions,
): Promise<Result<WebAppReleaseHistory, Error>> {
  const {baseCommit, targetCommit, executeGitCommand: executeGit} = options;

  if (!fullCommitShaPattern.test(baseCommit)) {
    return Result.err(new Error('Invalid base commit: expected a full 40-character hexadecimal SHA'));
  }

  if (!fullCommitShaPattern.test(targetCommit)) {
    return Result.err(new Error('Invalid target commit: expected a full 40-character hexadecimal SHA'));
  }

  const resolvedBaseCommitResult = await resolveGitCommit({
    executeGitCommand: executeGit,
    commitReference: baseCommit,
    commitName: 'base',
  });
  if (resolvedBaseCommitResult.isErr) {
    return Result.err(resolvedBaseCommitResult.error);
  }

  const resolvedTargetCommitResult = await resolveGitCommit({
    executeGitCommand: executeGit,
    commitReference: targetCommit,
    commitName: 'target',
  });
  if (resolvedTargetCommitResult.isErr) {
    return Result.err(resolvedTargetCommitResult.error);
  }

  const resolvedBaseCommit = resolvedBaseCommitResult.value;
  const resolvedTargetCommit = resolvedTargetCommitResult.value;
  const ancestorCheckResult = await executeGitCommand({
    executeGitCommand: executeGit,
    commandArguments: ['rev-list', '--left-right', '--count', `${resolvedBaseCommit}...${resolvedTargetCommit}`],
  });
  if (ancestorCheckResult.isErr) {
    return Result.err(ancestorCheckResult.error);
  }

  const baseAncestorResult = parseCommitCountRange(ancestorCheckResult.value);
  if (baseAncestorResult.isErr) {
    return Result.err(baseAncestorResult.error);
  }

  if (!baseAncestorResult.value) {
    return Result.err(new Error('Base commit is not an ancestor of target commit'));
  }

  const commitListResult = await executeGitCommand({
    executeGitCommand: executeGit,
    commandArguments: ['rev-list', '--reverse', '--first-parent', `${resolvedBaseCommit}..${resolvedTargetCommit}`],
  });
  if (commitListResult.isErr) {
    return Result.err(commitListResult.error);
  }

  const commitsResult = parseFirstParentCommitList(commitListResult.value);
  if (commitsResult.isErr) {
    return Result.err(commitsResult.error);
  }

  return Result.ok({
    baseCommit: resolvedBaseCommit,
    targetCommit: resolvedTargetCommit,
    commits: commitsResult.value,
  });
}
