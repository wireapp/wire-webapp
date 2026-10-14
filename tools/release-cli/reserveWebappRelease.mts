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
import {Command, CommanderError} from 'commander';
import {Maybe} from 'true-myth';

import {execFile} from 'node:child_process';
import {resolve} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

import {runWebAppReleaseReservationCommand} from './webAppReleaseReservationCli.ts';
import type {
  ReserveWebAppReleaseCommandOptions,
  WebAppReleaseReservationCommandOptions,
} from './webAppReleaseReservationCli.ts';

import {createRuntimeKyHttpClient} from '../release-github/githubHttpClient.ts';
import {readWebAppReleaseHistory} from '../release-metadata/webappReleaseHistoryGit.ts';
import {planWebAppRelease} from '../release-metadata/webappReleasePlan.ts';
import type {ReadFirstParentHistory} from '../release-metadata/webappReleasePlan.ts';
import {createWebAppReleasePlanningGitHubClient} from '../release-metadata/webappReleasePlanningGitHubClient.ts';
import {reserveWebAppRelease} from '../release-metadata/webappReleaseReservation.ts';
import type {PlanNextWebAppReleaseOptions} from '../release-metadata/webappReleaseReservation.ts';
import {
  createWebAppReleaseReservationBranch,
  isWebAppReleaseCommitAncestor,
  readRemoteWebAppReleaseBranches,
} from '../release-metadata/webappReleaseReservationGit.ts';
import {discoverStableWebAppReleases} from '../release-metadata/webappStableReleaseGit.ts';

type PlanReservedWebAppReleaseOptions = ReserveWebAppReleaseCommandOptions &
  Pick<PlanNextWebAppReleaseOptions, 'currentVersion' | 'baseCommit'>;

const executeFile = promisify(execFile);
const githubRemoteName = 'origin';

async function executeRuntimeGitCommand(commandArguments: readonly string[]): Promise<string> {
  const commandResult = await executeFile('git', [...commandArguments], {encoding: 'utf8'});

  return commandResult.stdout;
}

function writeRuntimeError(message: string): void {
  process.stderr.write(`${message}\n`);
}

function writeRuntimeOutput(message: string): void {
  process.stdout.write(message);
}

async function planNextWebAppRelease(
  options: PlanReservedWebAppReleaseOptions,
): Promise<Awaited<ReturnType<typeof planWebAppRelease>>> {
  const {githubApiUrl, githubRepository, githubToken, currentVersion, baseCommit, targetCommit} = options;
  const httpClient = createRuntimeKyHttpClient({reportRateLimitWait: writeRuntimeError});
  const githubClient = createWebAppReleasePlanningGitHubClient({
    httpClient,
    githubApiUrl,
    githubRepository,
    githubToken,
  });

  function readFirstParentHistory(
    historyOptions: Parameters<ReadFirstParentHistory>[0],
  ): ReturnType<ReadFirstParentHistory> {
    const {baseCommit: historyBaseCommit, targetCommit: historyTargetCommit} = historyOptions;

    return readWebAppReleaseHistory({
      baseCommit: historyBaseCommit,
      targetCommit: historyTargetCommit,
      executeGitCommand: executeRuntimeGitCommand,
    });
  }

  return planWebAppRelease({
    currentVersion,
    baseCommit,
    targetCommit,
    dependencies: {
      readFirstParentHistory,
      listPullRequestsForCommit: githubClient.listPullRequestsForCommit,
    },
  });
}

async function executeRuntimeReservation(
  options: ReserveWebAppReleaseCommandOptions,
): Promise<Awaited<ReturnType<typeof reserveWebAppRelease>>> {
  const {targetCommit, githubApiUrl, githubRepository, githubToken} = options;

  return reserveWebAppRelease({
    targetCommit,
    async readStableWebAppReleases() {
      return discoverStableWebAppReleases({executeGitCommand: executeRuntimeGitCommand});
    },
    async readRemoteReleaseBranches() {
      return readRemoteWebAppReleaseBranches({
        executeGitCommand: executeRuntimeGitCommand,
        remoteName: githubRemoteName,
      });
    },
    async isCommitAncestor(ancestorOptions) {
      const {baseCommit: ancestorBaseCommit, targetCommit: ancestorTargetCommit} = ancestorOptions;

      return isWebAppReleaseCommitAncestor({
        baseCommit: ancestorBaseCommit,
        targetCommit: ancestorTargetCommit,
        executeGitCommand: executeRuntimeGitCommand,
      });
    },
    async planNextWebAppRelease(planOptions) {
      const {currentVersion, baseCommit, targetCommit} = planOptions;

      return planNextWebAppRelease({
        githubApiUrl,
        githubRepository,
        githubToken,
        currentVersion,
        baseCommit,
        targetCommit,
      });
    },
    async createReleaseBranch(branchOptions) {
      const {releaseBranch, targetCommit} = branchOptions;

      return createWebAppReleaseReservationBranch({
        releaseBranch,
        targetCommit,
        executeGitCommand: executeRuntimeGitCommand,
        remoteName: githubRemoteName,
      });
    },
  });
}

function createCommand(commandOptions: WebAppReleaseReservationCommandOptions): Command {
  const {writeOutput, writeError} = commandOptions;

  return new Command()
    .name('reserveWebappRelease')
    .description('Plan and reserve the next WebApp SemVer release for a target main commit.')
    .argument('<target-main-commit>')
    .configureOutput({
      writeOut: writeOutput,
      writeErr: writeError,
    })
    .exitOverride()
    .action(async (targetCommit: string) => {
      process.exitCode = await runWebAppReleaseReservationCommand([targetCommit], commandOptions);
    });
}

async function main(): Promise<void> {
  const commandOptions: WebAppReleaseReservationCommandOptions = {
    environment: process.env,
    reserveWebAppRelease: executeRuntimeReservation,
    writeError: writeRuntimeError,
    writeOutput: writeRuntimeOutput,
  };
  const command = createCommand(commandOptions);

  try {
    await command.parseAsync(process.argv);
  } catch (error: unknown) {
    if (error instanceof CommanderError) {
      process.exitCode = error.exitCode;

      return;
    }

    throw error;
  }
}

function isCurrentModuleEntrypoint(): boolean {
  return Maybe.of(process.argv[1]).match({
    Just(entrypointPath) {
      return fileURLToPath(import.meta.url) === resolve(entrypointPath);
    },
    Nothing() {
      return false;
    },
  });
}

function redactSecret(message: string, secret: string): string {
  return secret.length === 0 ? message : message.replaceAll(secret, '[REDACTED]');
}

function crash(error: unknown): void {
  const message = isError(error) ? error.message : String(error);
  const redactedMessage = Maybe.of(process.env.GITHUB_TOKEN).match({
    Just(githubToken) {
      return redactSecret(message, githubToken);
    },
    Nothing() {
      return message;
    },
  });

  writeRuntimeError(redactedMessage);
  process.exitCode = 1;
}

if (isCurrentModuleEntrypoint()) {
  try {
    await main();
  } catch (error: unknown) {
    crash(error);
  }
}
