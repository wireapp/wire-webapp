/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import {isError, isString} from '@sindresorhus/is';
import {Command, CommanderError} from 'commander';

import {execFile} from 'node:child_process';
import process from 'node:process';
import {promisify} from 'node:util';

import type {WebAppReleasePreparationRuntimeEnvironment} from './webAppReleasePreparationCli.ts';
import {runWebAppReleasePreparationCommand} from './webAppReleasePreparationCli.ts';

import {createRuntimeKyHttpClient} from '../releaseGithub/githubHttpClient.ts';
import {readWebAppReleaseHistory} from '../releaseMetadata/webappReleaseHistoryGit.ts';
import type {ReadFirstParentHistory} from '../releaseMetadata/webappReleasePlan.ts';
import {planWebAppRelease} from '../releaseMetadata/webappReleasePlan.ts';
import {createWebAppReleasePlanningGitHubClient} from '../releaseMetadata/webappReleasePlanningGitHubClient.ts';
import {prepareWebAppRelease} from '../releaseMetadata/webappReleaseReservation.ts';
import type {
  PrepareWebAppReleaseDependencies,
  PrepareWebAppReleaseOptions,
} from '../releaseMetadata/webappReleaseReservation.ts';
import {
  createWebAppReleaseReservationBranch,
  isWebAppReleaseCommitAncestor,
  prepareRemoteWebAppReleaseBranchCommit,
  readRemoteWebAppReleaseBranches,
} from '../releaseMetadata/webappReleaseReservationGit.ts';
import {discoverStableWebAppReleases} from '../releaseMetadata/webappStableReleaseGit.ts';

const executeFile = promisify(execFile);
const originRemoteName = 'origin';

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

function createReleasePreparationDependencies(
  runtimeEnvironment: WebAppReleasePreparationRuntimeEnvironment,
): PrepareWebAppReleaseDependencies {
  return {
    readStableWebAppReleases() {
      return discoverStableWebAppReleases({executeGitCommand: executeRuntimeGitCommand});
    },
    readRemoteReleaseBranches() {
      return readRemoteWebAppReleaseBranches({
        executeGitCommand: executeRuntimeGitCommand,
        remoteName: originRemoteName,
      });
    },
    isCommitAncestor(ancestorOptions) {
      const {baseCommit, targetCommit} = ancestorOptions;

      return isWebAppReleaseCommitAncestor({
        baseCommit,
        targetCommit,
        executeGitCommand: executeRuntimeGitCommand,
      });
    },
    planNextWebAppRelease(planOptions) {
      const {currentVersion, baseCommit, targetCommit} = planOptions;
      const httpClient = createRuntimeKyHttpClient({reportRateLimitWait: writeRuntimeError});
      const githubClient = createWebAppReleasePlanningGitHubClient({
        httpClient,
        githubApiUrl: runtimeEnvironment.githubApiUrl,
        githubRepository: runtimeEnvironment.githubRepository,
        githubToken: runtimeEnvironment.githubToken,
      });

      function readFirstParentHistory(
        historyOptions: Parameters<ReadFirstParentHistory>[0],
      ): ReturnType<ReadFirstParentHistory> {
        const {baseCommit: historyBaseCommit, targetCommit: historyTargetCommit} = historyOptions;

        return readWebAppReleaseHistory(
          {baseCommit: historyBaseCommit, targetCommit: historyTargetCommit},
          {executeGitCommand: executeRuntimeGitCommand},
        );
      }

      return planWebAppRelease(
        {currentVersion, baseCommit, targetCommit},
        {
          readFirstParentHistory,
          listPullRequestsForCommit: githubClient.listPullRequestsForCommit,
        },
      );
    },
    prepareRemoteReleaseBranchCommit(branchOptions) {
      const {releaseBranch, expectedCommitSha} = branchOptions;

      return prepareRemoteWebAppReleaseBranchCommit({
        releaseBranch,
        expectedCommitSha,
        executeGitCommand: executeRuntimeGitCommand,
        remoteName: originRemoteName,
      });
    },
    createReleaseBranch(branchOptions) {
      const {releaseBranch, targetCommit} = branchOptions;

      return createWebAppReleaseReservationBranch({
        releaseBranch,
        targetCommit,
        executeGitCommand: executeRuntimeGitCommand,
        remoteName: originRemoteName,
      });
    },
  };
}

function prepareRuntimeWebAppRelease(
  options: PrepareWebAppReleaseOptions,
  runtimeEnvironment: WebAppReleasePreparationRuntimeEnvironment,
): ReturnType<typeof prepareWebAppRelease> {
  return prepareWebAppRelease(options, createReleasePreparationDependencies(runtimeEnvironment));
}

function createCommand(): Command {
  return new Command()
    .name('webappRelease')
    .description('Start or continue the active SemVer WebApp release.')
    .argument('<operation>', 'start or continue')
    .argument('[target-main-sha]')
    .configureOutput({writeOut: writeRuntimeOutput, writeErr: writeRuntimeError})
    .exitOverride()
    .action(async (operation: string, targetCommit: string | undefined) => {
      process.exitCode = await runWebAppReleasePreparationCommand(
        {
          commandLineArguments: [operation, targetCommit],
          environment: process.env,
        },
        {
          prepareRelease: prepareRuntimeWebAppRelease,
          writeOutput: writeRuntimeOutput,
          writeError: writeRuntimeError,
        },
      );
    });
}

async function main(): Promise<void> {
  try {
    await createCommand().parseAsync(process.argv);
  } catch (error: unknown) {
    if (error instanceof CommanderError) {
      process.exitCode = error.exitCode;

      return;
    }

    crash(error);
  }
}

function redactSecret(message: string, secret: string): string {
  return secret.length === 0 ? message : message.replaceAll(secret, '[REDACTED]');
}

function crash(error: unknown): void {
  const errorMessage = isError(error) ? error.message : String(error);
  const githubToken = isString(process.env.GITHUB_TOKEN) ? process.env.GITHUB_TOKEN : '';

  writeRuntimeError(redactSecret(errorMessage, githubToken));
  process.exitCode = 1;
}

if (process.argv[1]?.endsWith('webappRelease.mts') === true) {
  void main();
}
