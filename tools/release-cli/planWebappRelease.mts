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

import {isError, isString} from '@sindresorhus/is';

import {execFile} from 'node:child_process';
import {resolve} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

import type {PlanWebAppReleaseCommandOptions} from './webAppReleasePlanCli.ts';
import {runWebAppReleasePlanCommand} from './webAppReleasePlanCli.ts';

import {createRuntimeKyHttpClient} from '../release-appearance/httpClient.ts';
import {readWebAppReleaseHistory} from '../release-metadata/webappReleaseHistoryGit.ts';
import {planWebAppRelease} from '../release-metadata/webappReleasePlan.ts';
import type {ReadFirstParentHistory} from '../release-metadata/webappReleasePlan.ts';
import {createWebAppReleasePlanningGitHubClient} from '../release-metadata/webappReleasePlanningGitHubClient.ts';

const executeFile = promisify(execFile);
const runtimeCommandLineArgumentStartIndex = 2;

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

async function executeRuntimePlan(
  options: PlanWebAppReleaseCommandOptions,
): Promise<Awaited<ReturnType<typeof planWebAppRelease>>> {
  const httpClient = createRuntimeKyHttpClient({reportRateLimitWait: writeRuntimeError});
  const githubClient = createWebAppReleasePlanningGitHubClient({
    httpClient,
    githubApiUrl: options.githubApiUrl,
    githubRepository: options.githubRepository,
    githubToken: options.githubToken,
  });
  function readFirstParentHistory(
    historyOptions: Parameters<ReadFirstParentHistory>[0],
  ): ReturnType<ReadFirstParentHistory> {
    return readWebAppReleaseHistory({
      ...historyOptions,
      executeGitCommand: executeRuntimeGitCommand,
    });
  }

  return planWebAppRelease({
    currentVersion: options.currentVersion,
    baseCommit: options.baseCommit,
    targetCommit: options.targetCommit,
    dependencies: {
      readFirstParentHistory,
      listPullRequestsForCommit: githubClient.listPullRequestsForCommit,
    },
  });
}

async function main(): Promise<void> {
  process.exitCode = await runWebAppReleasePlanCommand(process.argv.slice(runtimeCommandLineArgumentStartIndex), {
    environment: process.env,
    planWebAppRelease: executeRuntimePlan,
    writeError: writeRuntimeError,
    writeOutput: writeRuntimeOutput,
  });
}

function isCurrentModuleEntrypoint(): boolean {
  const entrypointPath = process.argv[1];

  return isString(entrypointPath) && fileURLToPath(import.meta.url) === resolve(entrypointPath);
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

if (isCurrentModuleEntrypoint()) {
  try {
    await main();
  } catch (error: unknown) {
    crash(error);
  }
}
