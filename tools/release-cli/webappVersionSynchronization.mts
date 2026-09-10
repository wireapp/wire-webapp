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

import {resolve} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {createRuntimeKyHttpClient} from '../release-appearance/httpClient.ts';
import {
  createWebAppVersionSynchronizationInspectionOutput,
  createWebAppVersionSynchronizationResultOutput,
  serializeWebAppVersionSynchronizationOutput,
} from '../release-metadata/webappVersionSynchronizationCli.ts';
import {
  createRuntimeWebAppVersionSynchronizationFileSystem,
  createSimpleGitWebAppVersionSynchronizationClient,
} from '../release-metadata/webappVersionSynchronizationGit.ts';
import {createWebAppVersionSynchronizationGitHubClient} from '../release-metadata/webappVersionSynchronizationGitHubClient.ts';
import type {WebAppVersionSynchronizationGitHubClient} from '../release-metadata/webappVersionSynchronizationGitHubClient.ts';
import type {
  InspectWebAppVersionSynchronizationOptions,
  SynchronizeWebAppVersionOptions,
} from '../release-metadata/webappVersionSynchronizationOrchestration.ts';
import {
  inspectWebAppVersionSynchronization,
  synchronizeWebAppVersion,
} from '../release-metadata/webappVersionSynchronizationOrchestration.ts';
import {
  readInspectionRuntimeEnvironment,
  readSynchronizationRuntimeEnvironment,
} from '../release-metadata/webappVersionSynchronizationRuntime.ts';
import type {WebAppVersionSynchronizationSynchronizationRuntimeEnvironment} from '../release-metadata/webappVersionSynchronizationRuntime.ts';

type InspectCommand = {
  readonly kind: 'inspect';
  readonly releaseIdentifier: string;
  readonly productionTagName: string;
};

type SynchronizeCommand = {
  readonly kind: 'synchronize';
  readonly releaseIdentifier: string;
  readonly productionTagName: string;
};

type WebAppVersionSynchronizationCommand = InspectCommand | SynchronizeCommand;

type CreateWebAppVersionSynchronizationCommandOptions = {
  readonly executeCommand: (command: WebAppVersionSynchronizationCommand) => Promise<void> | void;
  readonly writeOutput: (message: string) => void;
  readonly writeError: (message: string) => void;
};

const ottoTheBotName = 'otto-the-bot';
const ottoTheBotEmail = '8736538+otto-the-bot@users.noreply.github.com';
const runtimeCommandLineArgumentStartIndex = 2;

function writeRuntimeError(message: string): void {
  process.stderr.write(`${message}\n`);
}

function writeRuntimeOutput(message: string): void {
  process.stdout.write(`${message}\n`);
}

type RuntimeGitHubClientOptions = {
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubToken: string;
};

function createRuntimeGitHubClient(options: RuntimeGitHubClientOptions): WebAppVersionSynchronizationGitHubClient {
  return createWebAppVersionSynchronizationGitHubClient({
    httpClient: createRuntimeKyHttpClient(),
    githubApiUrl: options.githubApiUrl,
    githubRepository: options.githubRepository,
    githubToken: options.githubToken,
  });
}

async function executeInspectionCommand(
  command: InspectCommand,
  githubClient: WebAppVersionSynchronizationGitHubClient,
  writeOutput: (message: string) => void,
): Promise<void> {
  const inspectionOptions: InspectWebAppVersionSynchronizationOptions = {
    releaseIdentifier: command.releaseIdentifier,
    productionTagName: command.productionTagName,
    githubClient,
  };
  const inspectionResult = await inspectWebAppVersionSynchronization(inspectionOptions);

  if (inspectionResult.isErr) {
    throw inspectionResult.error;
  }

  const {value: inspection} = inspectionResult;
  const output = createWebAppVersionSynchronizationInspectionOutput(inspection);

  writeOutput(serializeWebAppVersionSynchronizationOutput(output));
}

async function executeSynchronizationCommand(
  command: SynchronizeCommand,
  runtimeEnvironment: WebAppVersionSynchronizationSynchronizationRuntimeEnvironment,
  githubClient: WebAppVersionSynchronizationGitHubClient,
  writeOutput: (message: string) => void,
): Promise<void> {
  const gitClient = createSimpleGitWebAppVersionSynchronizationClient({
    repositoryPath: runtimeEnvironment.repositoryPath,
    fileSystem: createRuntimeWebAppVersionSynchronizationFileSystem(),
  });
  const synchronizationOptions: SynchronizeWebAppVersionOptions = {
    releaseIdentifier: command.releaseIdentifier,
    productionTagName: command.productionTagName,
    commitAuthorName: ottoTheBotName,
    commitAuthorEmail: ottoTheBotEmail,
    dependencies: {githubClient, gitClient},
  };
  const synchronizationResult = await synchronizeWebAppVersion(synchronizationOptions);

  if (synchronizationResult.isErr) {
    throw synchronizationResult.error;
  }

  const {value: synchronization} = synchronizationResult;
  const output = createWebAppVersionSynchronizationResultOutput(synchronization);

  writeOutput(serializeWebAppVersionSynchronizationOutput(output));
}

export function createCommand(createCommandOptions: CreateWebAppVersionSynchronizationCommandOptions): Command {
  const command = new Command()
    .name('webappVersionSynchronization')
    .description('Inspect or synchronize WebApp Production package metadata.')
    .configureOutput({
      writeOut: createCommandOptions.writeOutput,
      writeErr: createCommandOptions.writeError,
    })
    .exitOverride();

  command
    .command('inspect')
    .argument('<release-identifier>')
    .argument('<production-tag>')
    .action(async (releaseIdentifier: string, productionTagName: string): Promise<void> => {
      await createCommandOptions.executeCommand({kind: 'inspect', releaseIdentifier, productionTagName});
    });

  command
    .command('synchronize')
    .argument('<release-identifier>')
    .argument('<production-tag>')
    .action(async (releaseIdentifier: string, productionTagName: string): Promise<void> => {
      await createCommandOptions.executeCommand({kind: 'synchronize', releaseIdentifier, productionTagName});
    });

  return command;
}

export async function runWebAppVersionSynchronizationCommand(
  commandLineArguments: readonly string[],
  createCommandOptions: CreateWebAppVersionSynchronizationCommandOptions,
): Promise<number> {
  let executionExitCode = 0;
  const command = createCommand({
    ...createCommandOptions,
    async executeCommand(applicationCommand: WebAppVersionSynchronizationCommand): Promise<void> {
      await createCommandOptions.executeCommand(applicationCommand);
      executionExitCode = 0;
    },
  });

  try {
    await command.parseAsync(['node', 'webappVersionSynchronization', ...commandLineArguments]);

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

async function executeRuntimeCommand(command: WebAppVersionSynchronizationCommand): Promise<void> {
  if (command.kind === 'inspect') {
    const runtimeEnvironmentResult = readInspectionRuntimeEnvironment(process.env);

    if (runtimeEnvironmentResult.isErr) {
      throw runtimeEnvironmentResult.error;
    }

    const {value: runtimeEnvironment} = runtimeEnvironmentResult;
    const githubClient = createRuntimeGitHubClient({
      githubApiUrl: runtimeEnvironment.githubApiUrl,
      githubRepository: runtimeEnvironment.githubRepository,
      githubToken: runtimeEnvironment.githubToken,
    });

    await executeInspectionCommand(command, githubClient, writeRuntimeOutput);

    return;
  }

  const runtimeEnvironmentResult = readSynchronizationRuntimeEnvironment(process.env);

  if (runtimeEnvironmentResult.isErr) {
    throw runtimeEnvironmentResult.error;
  }

  const {value: runtimeEnvironment} = runtimeEnvironmentResult;
  const githubClient = createRuntimeGitHubClient({
    githubApiUrl: runtimeEnvironment.githubApiUrl,
    githubRepository: runtimeEnvironment.githubRepository,
    githubToken: runtimeEnvironment.ottoTheBotGitHubToken,
  });

  await executeSynchronizationCommand(command, runtimeEnvironment, githubClient, writeRuntimeOutput);
}

async function main(): Promise<void> {
  process.exitCode = await runWebAppVersionSynchronizationCommand(
    process.argv.slice(runtimeCommandLineArgumentStartIndex),
    {
      executeCommand: executeRuntimeCommand,
      writeError: writeRuntimeError,
      writeOutput: writeRuntimeOutput,
    },
  );
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
