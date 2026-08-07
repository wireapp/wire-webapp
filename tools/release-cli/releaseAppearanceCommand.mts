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

import * as actionsCore from '@actions/core';
import {isError, isString} from '@sindresorhus/is';
import {Command, CommanderError} from 'commander';

import process from 'node:process';
import {execFile} from 'node:child_process';
import {resolve} from 'node:path';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';

import {createDefaultGitHubActionsProgressReporter} from '../release-appearance/githubActionsProgressReporter.ts';
import {createGitHubClient} from '../release-appearance/githubClient.ts';
import {createRuntimeKyHttpClient} from '../release-appearance/httpClient.ts';
import {
  createBetaCommand,
  createProductionCommand,
  executeReleaseAppearanceCommand,
  readCommandEnvironment,
  redactSecret,
} from '../release-appearance/releaseAppearanceCommand.ts';
import type {
  CommandEnvironment,
  ExecutionMode,
  ParsedCommand,
  ReleaseAppearanceCommandDependencies,
} from '../release-appearance/releaseAppearanceCommand.ts';

type CreateReleaseAppearanceCommandOptions = {
  readonly executeCommand: (command: ParsedCommand) => Promise<number> | number;
  readonly writeOutput: (message: string) => void;
  readonly writeError: (message: string) => void;
};

type ReleaseAppearanceOptionValues = {
  readonly dryRun: boolean;
};

const executeFile = promisify(execFile);

export function createCommand(createCommandOptions: CreateReleaseAppearanceCommandOptions): Command {
  const command = new Command()
    .name('releaseAppearanceCommand')
    .description('Create or preview release-appearance comments.')
    .configureOutput({
      writeOut: createCommandOptions.writeOutput,
      writeErr: createCommandOptions.writeError,
    })
    .exitOverride();

  command
    .command('beta')
    .argument('<beta-tag>')
    .argument('<release-commit-sha>')
    .option('--dry-run', 'run without writing changes', false)
    .action(async (betaTag: string, releaseCommit: string, optionValues: ReleaseAppearanceOptionValues) => {
      const parsedCommandResult = createBetaCommand({
        betaTag,
        releaseCommit,
        executionMode: getExecutionMode(optionValues),
      });
      if (parsedCommandResult.isErr) {
        throw parsedCommandResult.error;
      }

      await createCommandOptions.executeCommand(parsedCommandResult.value);
    });

  command
    .command('production')
    .argument('<production-tag>')
    .argument('<release-commit-sha>')
    .argument('<promoted-beta-tag>')
    .option('--dry-run', 'run without writing changes', false)
    .action(
      async (
        productionTag: string,
        releaseCommit: string,
        promotedBetaTag: string,
        optionValues: ReleaseAppearanceOptionValues,
      ) => {
        const parsedCommandResult = createProductionCommand({
          productionTag,
          releaseCommit,
          promotedBetaTag,
          executionMode: getExecutionMode(optionValues),
        });
        if (parsedCommandResult.isErr) {
          throw parsedCommandResult.error;
        }

        await createCommandOptions.executeCommand(parsedCommandResult.value);
      },
    );

  return command;
}

export async function runReleaseAppearanceCommand(
  commandLineArguments: readonly string[],
  createCommandOptions: CreateReleaseAppearanceCommandOptions,
): Promise<number> {
  let executionExitCode = 0;
  const command = createCommand({
    ...createCommandOptions,
    async executeCommand(applicationCommand: ParsedCommand): Promise<number> {
      executionExitCode = await createCommandOptions.executeCommand(applicationCommand);

      return executionExitCode;
    },
  });

  try {
    await command.parseAsync(['node', 'releaseAppearanceCommand', ...commandLineArguments]);

    return executionExitCode;
  } catch (error: unknown) {
    if (error instanceof CommanderError) {
      return error.exitCode;
    }

    throw error;
  }
}

function getExecutionMode(optionValues: ReleaseAppearanceOptionValues): ExecutionMode {
  return optionValues.dryRun === true ? 'dry-run' : 'write';
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

function readMonotonicTime(): number {
  return performance.now();
}

function createRuntimeDependencies(commandEnvironment: CommandEnvironment): ReleaseAppearanceCommandDependencies {
  actionsCore.setSecret(commandEnvironment.githubToken);
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
    now: readMonotonicTime,
    progressReporter: createDefaultGitHubActionsProgressReporter(),
    writeFailure: writeRuntimeFailure,
    writeInformation: writeRuntimeInformation,
    async writeSummary(summary): Promise<void> {
      await actionsCore.summary.addRaw(`${summary}\n`).write();
    },
  };
}

async function executeRuntimeCommand(command: ParsedCommand): Promise<number> {
  const commandEnvironmentResult = readCommandEnvironment(process.env);
  if (commandEnvironmentResult.isErr) {
    throw commandEnvironmentResult.error;
  }

  const commandResult = await executeReleaseAppearanceCommand({
    command,
    environment: process.env,
    dependencies: createRuntimeDependencies(commandEnvironmentResult.value),
  });

  return commandResult.exitCode;
}

async function main(): Promise<void> {
  process.exitCode = await runReleaseAppearanceCommand(process.argv.slice(2), {
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
