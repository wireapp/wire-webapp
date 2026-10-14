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

import process from 'node:process';

import {createRuntimeKyHttpClient} from '../release-github/githubHttpClient.ts';
import {
  createWebAppVersionSynchronizationOutput,
  serializeWebAppVersionSynchronizationOutput,
} from '../release-metadata/webappVersionSynchronizationCli.ts';
import {
  createRuntimeWebAppVersionSynchronizationFileSystem,
  createSimpleGitWebAppVersionSynchronizationClient,
} from '../release-metadata/webappVersionSynchronizationGit.ts';
import {createWebAppVersionSynchronizationGitHubClient} from '../release-metadata/webappVersionSynchronizationGitHubClient.ts';
import type {WebAppVersionSynchronizationGitHubClient} from '../release-metadata/webappVersionSynchronizationGitHubClient.ts';
import {synchronizeWebAppVersion} from '../release-metadata/webappVersionSynchronizationOrchestration.ts';
import type {
  WebAppVersionSynchronizationDependencies,
  WebAppVersionSynchronizationOptions,
} from '../release-metadata/webappVersionSynchronizationOrchestration.ts';
import {readSynchronizationRuntimeEnvironment} from '../release-metadata/webappVersionSynchronizationRuntime.ts';

type SynchronizeCommand = {
  readonly productionTagName: string;
};

type CreateWebAppVersionSynchronizationCommandOptions = {
  readonly executeCommand: (command: SynchronizeCommand) => Promise<void> | void;
  readonly writeOutput: (message: string) => void;
  readonly writeError: (message: string) => void;
};

type RunWebAppVersionSynchronizationCommandOptions = {
  readonly commandLineArguments: readonly string[];
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
    httpClient: createRuntimeKyHttpClient({reportRateLimitWait: writeRuntimeOutput}),
    githubApiUrl: options.githubApiUrl,
    githubRepository: options.githubRepository,
    githubToken: options.githubToken,
  });
}

function createCommand(createCommandOptions: CreateWebAppVersionSynchronizationCommandOptions): Command {
  const command = new Command()
    .name('webappVersionSynchronization')
    .description('Synchronize WebApp package versions to a stable Production tag.')
    .configureOutput({
      writeOut: createCommandOptions.writeOutput,
      writeErr: createCommandOptions.writeError,
    })
    .exitOverride();

  command
    .command('synchronize')
    .argument('<production-tag>')
    .action(async (productionTagName: string): Promise<void> => {
      await createCommandOptions.executeCommand({productionTagName});
    });

  return command;
}

export async function runWebAppVersionSynchronizationCommand(
  options: RunWebAppVersionSynchronizationCommandOptions,
  dependencies: CreateWebAppVersionSynchronizationCommandOptions,
): Promise<number> {
  const {commandLineArguments} = options;
  const command = createCommand(dependencies);

  try {
    await command.parseAsync(['node', 'webappVersionSynchronization', ...commandLineArguments]);

    return 0;
  } catch (error: unknown) {
    if (error instanceof CommanderError) {
      return error.exitCode;
    }

    const errorMessage = isError(error) ? error.message : String(error);
    dependencies.writeError(`${errorMessage}\n`);

    return 1;
  }
}

async function executeRuntimeCommand(command: SynchronizeCommand): Promise<void> {
  const runtimeEnvironmentResult = readSynchronizationRuntimeEnvironment(process.env);
  if (runtimeEnvironmentResult.isErr) {
    throw runtimeEnvironmentResult.error;
  }

  const runtimeEnvironment = runtimeEnvironmentResult.value;
  const githubClient = createRuntimeGitHubClient({
    githubApiUrl: runtimeEnvironment.githubApiUrl,
    githubRepository: runtimeEnvironment.githubRepository,
    githubToken: runtimeEnvironment.ottoTheBotGitHubToken,
  });
  const gitClient = createSimpleGitWebAppVersionSynchronizationClient({
    repositoryPath: runtimeEnvironment.repositoryPath,
    fileSystem: createRuntimeWebAppVersionSynchronizationFileSystem(),
    authentication: {githubToken: runtimeEnvironment.ottoTheBotGitHubToken},
  });
  const synchronizationOptions: WebAppVersionSynchronizationOptions = {
    productionTagName: command.productionTagName,
    commitAuthorName: ottoTheBotName,
    commitAuthorEmail: ottoTheBotEmail,
  };
  const dependencies: WebAppVersionSynchronizationDependencies = {githubClient, gitClient};
  const synchronizationResult = await synchronizeWebAppVersion(synchronizationOptions, dependencies).toPromise();

  if (synchronizationResult.isErr) {
    throw synchronizationResult.error;
  }

  const output = createWebAppVersionSynchronizationOutput(synchronizationResult.value);
  writeRuntimeOutput(serializeWebAppVersionSynchronizationOutput(output));
}

async function main(): Promise<void> {
  process.exitCode = await runWebAppVersionSynchronizationCommand(
    {commandLineArguments: process.argv.slice(runtimeCommandLineArgumentStartIndex)},
    {
      executeCommand: executeRuntimeCommand,
      writeError: writeRuntimeError,
      writeOutput: writeRuntimeOutput,
    },
  );
}

if (process.argv[1]?.endsWith('webappVersionSynchronization.mts') === true) {
  void main();
}
