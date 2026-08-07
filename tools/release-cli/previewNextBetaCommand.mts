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

import process from 'node:process';
import {appendFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {resolve} from 'node:path';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';

import {createGitHubClient} from '../release-appearance/githubClient.ts';
import {createRuntimeKyHttpClient} from '../release-appearance/httpClient.ts';
import {executePreviewNextBetaCommand} from '../release-appearance/previewNextBetaCommand.ts';
import {validateTargetMainCommit} from '../release-appearance/previewNextBetaCommand.ts';
import type {PreviewNextBetaCommandDependencies} from '../release-appearance/previewNextBetaCommand.ts';
import {planNextBetaPreviewHistory} from '../release-appearance/releaseHistory.ts';
import {readCommandEnvironment, redactSecret} from '../release-appearance/releaseAppearanceCommand.ts';
import type {CommandEnvironment} from '../release-appearance/releaseAppearanceCommand.ts';

type CreatePreviewNextBetaCommandOptions = {
  readonly executeCommand: (targetMainCommit: string) => Promise<number> | number;
  readonly writeOutput: (message: string) => void;
  readonly writeError: (message: string) => void;
};

const executeFile = promisify(execFile);

export function createCommand(createCommandOptions: CreatePreviewNextBetaCommandOptions): Command {
  const command = new Command()
    .name('previewNextBetaCommand')
    .description('Preview changes waiting for the next Beta release.')
    .argument('<target-main-commit-sha>')
    .configureOutput({
      writeOut: createCommandOptions.writeOutput,
      writeErr: createCommandOptions.writeError,
    })
    .exitOverride()
    .action(async (targetMainCommit: string) => {
      const targetMainCommitResult = validateTargetMainCommit(targetMainCommit);
      if (targetMainCommitResult.isErr) {
        throw targetMainCommitResult.error;
      }

      await createCommandOptions.executeCommand(targetMainCommit);
    });

  return command;
}

export async function runPreviewNextBetaCommand(
  commandLineArguments: readonly string[],
  createCommandOptions: CreatePreviewNextBetaCommandOptions,
): Promise<number> {
  let executionExitCode = 0;
  const command = createCommand({
    ...createCommandOptions,
    async executeCommand(targetMainCommit: string): Promise<number> {
      executionExitCode = await createCommandOptions.executeCommand(targetMainCommit);

      return executionExitCode;
    },
  });

  try {
    await command.parseAsync(['node', 'previewNextBetaCommand', ...commandLineArguments]);

    return executionExitCode;
  } catch (error: unknown) {
    if (error instanceof CommanderError) {
      return error.exitCode;
    }

    throw error;
  }
}

async function executeRuntimeGitCommand(commandArguments: readonly string[]): Promise<string> {
  const commandResult = await executeFile('git', commandArguments, {encoding: 'utf8'});

  return commandResult.stdout.toString();
}

function writeRuntimeError(message: string): void {
  process.stderr.write(`${message}\n`);
}

function writeRuntimeOutput(message: string): void {
  process.stdout.write(`${message}\n`);
}

function writeRuntimeFailure(message: string): Promise<void> {
  writeRuntimeError(message);

  return Promise.resolve();
}

function writeRuntimeInformation(message: string): Promise<void> {
  writeRuntimeOutput(message);

  return Promise.resolve();
}

function createRuntimeDependencies(commandEnvironment: CommandEnvironment): PreviewNextBetaCommandDependencies {
  const httpClient = createRuntimeKyHttpClient();
  const githubClient = createGitHubClient({
    httpClient,
    githubApiUrl: commandEnvironment.githubApiUrl,
    githubRepository: commandEnvironment.githubRepository,
    githubToken: commandEnvironment.githubToken,
  });

  return {
    executeGitCommand: executeRuntimeGitCommand,
    githubClient,
    planNextBetaPreviewHistory,
    writeFailure: writeRuntimeFailure,
    writeInformation: writeRuntimeInformation,
    async writeSummary(summary): Promise<void> {
      await appendFile(commandEnvironment.githubStepSummary, `${summary}\n`, 'utf8');
    },
  };
}

async function executeRuntimeCommand(targetMainCommit: string): Promise<number> {
  const commandEnvironmentResult = readCommandEnvironment(process.env);
  if (commandEnvironmentResult.isErr) {
    throw commandEnvironmentResult.error;
  }

  const commandResult = await executePreviewNextBetaCommand({
    targetMainCommit,
    environment: process.env,
    dependencies: createRuntimeDependencies(commandEnvironmentResult.value),
  });

  return commandResult.exitCode;
}

async function main(): Promise<void> {
  process.exitCode = await runPreviewNextBetaCommand(process.argv.slice(2), {
    executeCommand: executeRuntimeCommand,
    writeError: writeRuntimeError,
    writeOutput: writeRuntimeOutput,
  });
}

function isCurrentModuleEntrypoint(): boolean {
  const entrypointPath = process.argv[1];

  return isString(entrypointPath) && fileURLToPath(import.meta.url) === resolve(entrypointPath);
}

function crash(error: unknown): void {
  const githubToken = isString(process.env.GITHUB_TOKEN) ? process.env.GITHUB_TOKEN : '';
  const errorMessage = isError(error) ? error.message : String(error);
  writeRuntimeError(redactSecret(errorMessage, githubToken));
  process.exitCode = 1;
}

if (isCurrentModuleEntrypoint()) {
  main().catch(crash);
}
