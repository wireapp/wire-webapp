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
import {Command, CommanderError} from 'commander';

import {execFile} from 'node:child_process';
import {resolve} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

import {runWebAppReleaseContinuationCommand} from './webAppReleaseContinuationCli.ts';
import type {WebAppReleaseContinuationCommandOptions} from './webAppReleaseContinuationCli.ts';

import {continueActiveWebAppRelease} from '../release-metadata/webappReleaseReservation.ts';
import type {
  ContinueActiveWebAppReleaseDependencies,
  PrepareRemoteReleaseBranchCommitOptions,
  VerifyWebAppReleaseCommitAncestorOptions,
} from '../release-metadata/webappReleaseReservation.ts';
import {
  readRemoteWebAppReleaseBranches,
  isWebAppReleaseCommitAncestor,
  prepareRemoteWebAppReleaseBranchCommit,
} from '../release-metadata/webappReleaseReservationGit.ts';
import {discoverStableWebAppReleases} from '../release-metadata/webappStableReleaseGit.ts';

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

function readStableWebAppReleases(): ReturnType<typeof discoverStableWebAppReleases> {
  return discoverStableWebAppReleases({executeGitCommand: executeRuntimeGitCommand});
}

function readRemoteReleaseBranches(): ReturnType<typeof readRemoteWebAppReleaseBranches> {
  return readRemoteWebAppReleaseBranches({
    executeGitCommand: executeRuntimeGitCommand,
    remoteName: originRemoteName,
  });
}

function verifyStableBaseAncestry(
  options: VerifyWebAppReleaseCommitAncestorOptions,
): ReturnType<typeof isWebAppReleaseCommitAncestor> {
  return isWebAppReleaseCommitAncestor({
    ...options,
    executeGitCommand: executeRuntimeGitCommand,
  });
}

function prepareRemoteReleaseBranchCommit(
  options: PrepareRemoteReleaseBranchCommitOptions,
): ReturnType<typeof prepareRemoteWebAppReleaseBranchCommit> {
  return prepareRemoteWebAppReleaseBranchCommit({
    ...options,
    executeGitCommand: executeRuntimeGitCommand,
    remoteName: originRemoteName,
  });
}

function createContinuationDependencies(): ContinueActiveWebAppReleaseDependencies {
  return {
    readStableWebAppReleases,
    readRemoteReleaseBranches,
    prepareRemoteReleaseBranchCommit,
    isCommitAncestor: verifyStableBaseAncestry,
  };
}

async function executeRuntimeContinuation(): ReturnType<typeof continueActiveWebAppRelease> {
  return continueActiveWebAppRelease({dependencies: createContinuationDependencies()});
}

function createCommand(commandOptions: WebAppReleaseContinuationCommandOptions): Command {
  return new Command()
    .name('continueWebappRelease')
    .description('Continue the one active WebApp SemVer release at its current remote branch head.')
    .configureOutput({
      writeOut: commandOptions.writeOutput,
      writeErr: commandOptions.writeError,
    })
    .exitOverride()
    .action(async () => {
      process.exitCode = await runWebAppReleaseContinuationCommand(commandOptions);
    });
}

async function main(): Promise<void> {
  const commandOptions: WebAppReleaseContinuationCommandOptions = {
    continueActiveWebAppRelease: executeRuntimeContinuation,
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

    writeRuntimeError(isError(error) ? error.message : String(error));
    process.exitCode = 1;
  }
}

function isCurrentModuleEntrypoint(): boolean {
  const entrypointPath = process.argv[1];

  return isString(entrypointPath) && fileURLToPath(import.meta.url) === resolve(entrypointPath);
}

if (isCurrentModuleEntrypoint()) {
  await main();
}
