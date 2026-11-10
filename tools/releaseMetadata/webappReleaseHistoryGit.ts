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
import {maybe, Result, Task, task} from 'true-myth';

export type ExecuteWebAppReleaseGitCommand = (commandArguments: readonly string[]) => Promise<string>;

export type WebAppReleaseHistory = {
  readonly baseCommit: string;
  readonly targetCommit: string;
  readonly commits: readonly string[];
};

export type ReadWebAppReleaseHistoryOptions = {
  readonly baseCommit: string;
  readonly targetCommit: string;
};

export type ReadWebAppReleaseHistoryDependencies = {
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

function executeGitCommand(options: ExecuteGitCommandOptions): Task<string, Error> {
  const {executeGitCommand: runGitCommand, commandArguments} = options;

  return task.tryOrElse(
    (error: unknown): Error => {
      const gitCommand = `git ${commandArguments.join(' ')}`;

      return new Error(`Git command failed: ${gitCommand}: ${errorMessage(error)}`, {cause: error});
    },
    async (): Promise<string> => {
      return runGitCommand(commandArguments);
    },
  );
}

function resolveGitCommit(options: ResolveGitCommitOptions): Task<string, Error> {
  const {executeGitCommand: runGitCommand, commitReference, commitName} = options;

  return executeGitCommand({
    executeGitCommand: runGitCommand,
    commandArguments: ['rev-parse', '--verify', '--end-of-options', `${commitReference}^{commit}`],
  })
    .mapRejected(error => {
      return new Error(`Unable to resolve ${commitName} commit ${commitReference}: ${error.message}`, {cause: error});
    })
    .andThen(commandOutput => {
      const resolvedCommitSha = commandOutput.trim();
      if (!fullCommitShaPattern.test(resolvedCommitSha)) {
        return Task.reject<string, Error>(
          new Error(`Unable to resolve ${commitName} commit ${commitReference} to a commit SHA`),
        );
      }

      return Task.resolve(resolvedCommitSha.toLowerCase());
    });
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

export function readWebAppReleaseHistory(
  options: ReadWebAppReleaseHistoryOptions,
  dependencies: ReadWebAppReleaseHistoryDependencies,
): Task<WebAppReleaseHistory, Error> {
  const {baseCommit, targetCommit} = options;
  const {executeGitCommand: executeGit} = dependencies;

  if (!fullCommitShaPattern.test(baseCommit)) {
    return Task.reject(new Error('Invalid base commit: expected a full 40-character hexadecimal SHA'));
  }

  if (!fullCommitShaPattern.test(targetCommit)) {
    return Task.reject(new Error('Invalid target commit: expected a full 40-character hexadecimal SHA'));
  }

  return resolveGitCommit({
    executeGitCommand: executeGit,
    commitReference: baseCommit,
    commitName: 'base',
  }).andThen(resolvedBaseCommit => {
    return resolveGitCommit({
      executeGitCommand: executeGit,
      commitReference: targetCommit,
      commitName: 'target',
    }).andThen(resolvedTargetCommit => {
      return executeGitCommand({
        executeGitCommand: executeGit,
        commandArguments: ['rev-list', '--left-right', '--count', `${resolvedBaseCommit}...${resolvedTargetCommit}`],
      }).andThen(ancestorCheckOutput => {
        const baseAncestorResult = parseCommitCountRange(ancestorCheckOutput);
        if (baseAncestorResult.isErr) {
          return Task.reject<WebAppReleaseHistory, Error>(baseAncestorResult.error);
        }

        if (!baseAncestorResult.value) {
          return Task.reject<WebAppReleaseHistory, Error>(new Error('Base commit is not an ancestor of target commit'));
        }

        return executeGitCommand({
          executeGitCommand: executeGit,
          commandArguments: [
            'rev-list',
            '--reverse',
            '--first-parent',
            `${resolvedBaseCommit}..${resolvedTargetCommit}`,
          ],
        }).andThen(commitListOutput => {
          const commitsResult = parseFirstParentCommitList(commitListOutput);
          if (commitsResult.isErr) {
            return Task.reject<WebAppReleaseHistory, Error>(commitsResult.error);
          }

          return Task.resolve({
            baseCommit: resolvedBaseCommit,
            targetCommit: resolvedTargetCommit,
            commits: commitsResult.value,
          });
        });
      });
    });
  });
}
