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

import process from 'node:process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {isError, isNonEmptyStringAndNotWhitespace, isString} from '@sindresorhus/is';
import {Command, CommanderError} from 'commander';
import {Result} from 'true-myth';

import {ensureProductionGitHubRelease} from '../release-appearance/ensureProductionGitHubRelease.ts';
import {createGitHubReleaseClient} from '../release-appearance/githubReleaseClient.ts';
import type {ProductionGitHubReleaseHandoff} from '../release-appearance/ensureProductionGitHubRelease.ts';
import {createRuntimeKyHttpClient} from '../release-appearance/httpClient.ts';

type CreateEnsureProductionGitHubReleaseCommandOptions = {
  readonly executeCommand: (productionTagName: string) => Promise<void> | void;
  readonly writeOutput: (message: string) => void;
  readonly writeError: (message: string) => void;
};

type RuntimeEnvironment = {
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubToken: string;
};

function readRequiredEnvironmentValue(
  environment: NodeJS.ProcessEnv,
  environmentVariableName: string,
): Result<string, Error> {
  const environmentValue = environment[environmentVariableName];

  if (isNonEmptyStringAndNotWhitespace(environmentValue) === false) {
    return Result.err(new Error(`Required environment variable is missing: ${environmentVariableName}`));
  }

  return Result.ok(environmentValue);
}

function readRuntimeEnvironment(environment: NodeJS.ProcessEnv): Result<RuntimeEnvironment, Error> {
  const githubApiUrlValueResult = readRequiredEnvironmentValue(environment, 'GITHUB_API_URL');
  const githubRepositoryResult = readRequiredEnvironmentValue(environment, 'GITHUB_REPOSITORY');
  const githubTokenResult = readRequiredEnvironmentValue(environment, 'GITHUB_TOKEN');

  if (githubApiUrlValueResult.isErr) {
    return Result.err(githubApiUrlValueResult.error);
  }

  if (githubRepositoryResult.isErr) {
    return Result.err(githubRepositoryResult.error);
  }

  if (githubTokenResult.isErr) {
    return Result.err(githubTokenResult.error);
  }

  let githubApiUrl: URL;

  try {
    githubApiUrl = new URL(githubApiUrlValueResult.value);
  } catch (error: unknown) {
    const errorMessage = isError(error) ? error.message : String(error);
    return Result.err(new Error(`Invalid GITHUB_API_URL: ${errorMessage}`, {cause: error}));
  }

  return Result.ok({
    githubApiUrl,
    githubRepository: githubRepositoryResult.value,
    githubToken: githubTokenResult.value,
  });
}

function writeProductionReleaseOutputs(
  handoff: ProductionGitHubReleaseHandoff,
  writeOutput: (message: string) => void,
): void {
  writeOutput(`production_tag_name=${handoff.tagName}`);
  writeOutput(`github_release_action=${handoff.action}`);
  writeOutput(`github_release_state=${handoff.state}`);
  writeOutput(`github_release_url=${handoff.url}`);
}

export function createCommand(createCommandOptions: CreateEnsureProductionGitHubReleaseCommandOptions): Command {
  return new Command()
    .name('ensureProductionGitHubRelease')
    .description('Ensure the draft GitHub Release for a verified Production tag.')
    .argument('<production-tag>')
    .configureOutput({
      writeOut: createCommandOptions.writeOutput,
      writeErr: createCommandOptions.writeError,
    })
    .exitOverride()
    .action(async (productionTagName: string): Promise<void> => {
      await createCommandOptions.executeCommand(productionTagName);
    });
}

export async function runEnsureProductionGitHubReleaseCommand(
  commandLineArguments: readonly string[],
  createCommandOptions: CreateEnsureProductionGitHubReleaseCommandOptions,
): Promise<number> {
  let executionExitCode = 0;
  const command = createCommand({
    ...createCommandOptions,
    async executeCommand(productionTagName: string): Promise<void> {
      await createCommandOptions.executeCommand(productionTagName);
      executionExitCode = 0;
    },
  });

  try {
    await command.parseAsync(['node', 'ensureProductionGitHubRelease', ...commandLineArguments]);

    return executionExitCode;
  } catch (error: unknown) {
    if (error instanceof CommanderError) {
      return error.exitCode;
    }

    const errorMessage = isError(error) ? error.message : String(error);
    createCommandOptions.writeError(`${errorMessage}\n`);

    return 1;
  }
}

function writeRuntimeError(message: string): void {
  process.stderr.write(`${message}\n`);
}

function writeRuntimeOutput(message: string): void {
  process.stdout.write(`${message}\n`);
}

async function executeRuntimeCommand(productionTagName: string): Promise<void> {
  const runtimeEnvironmentResult = readRuntimeEnvironment(process.env);

  if (runtimeEnvironmentResult.isErr) {
    throw runtimeEnvironmentResult.error;
  }

  const runtimeEnvironment = runtimeEnvironmentResult.value;
  const githubReleaseClient = createGitHubReleaseClient({
    httpClient: createRuntimeKyHttpClient(),
    githubApiUrl: runtimeEnvironment.githubApiUrl,
    githubRepository: runtimeEnvironment.githubRepository,
    githubToken: runtimeEnvironment.githubToken,
  });
  const handoffResult = await ensureProductionGitHubRelease({
    currentProductionTagName: productionTagName,
    githubReleaseClient,
  });

  if (handoffResult.isErr) {
    throw handoffResult.error;
  }

  writeProductionReleaseOutputs(handoffResult.value, writeRuntimeOutput);
}

async function main(): Promise<void> {
  process.exitCode = await runEnsureProductionGitHubReleaseCommand(process.argv.slice(2), {
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
  const errorMessage = isError(error) ? error.message : String(error);
  writeRuntimeError(errorMessage);
  process.exitCode = 1;
}

if (isCurrentModuleEntrypoint()) {
  try {
    await main();
  } catch (error: unknown) {
    crash(error);
  }
}
