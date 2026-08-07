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

import {readFileSync} from 'node:fs';
import process from 'node:process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {isError, isString} from '@sindresorhus/is';
import {Command, CommanderError} from 'commander';

import {
  executeProductionDistributionCommand,
  type ProductionDistributionCommand,
  type ProductionDistributionCommandDependencies,
} from '../production-distribution/productionDistributionCli.ts';

type CreateProductionDistributionCommandOptions = {
  readonly executeCommand: (command: ProductionDistributionCommand) => Promise<number> | number;
  readonly writeOutput: (message: string) => void;
  readonly writeError: (message: string) => void;
};

type ValidateManifestOptionValues = {
  readonly artifactMetadataPath: string;
  readonly manifestPath: string;
  readonly productionTag: string;
  readonly productionTagCommitSha: string;
  readonly expectedCommitSha?: string;
  readonly sourceRunId: string;
};

type SelectHelmChartOptionValues = {
  readonly chartsPath: string;
  readonly imageTag: string;
};

type WireBuildsFieldsMatchOptionValues = {
  readonly version: string;
  readonly repo: string;
  readonly appVersion: string;
  readonly commitUrl: string;
  readonly commit: string;
};

export function createCommand(createCommandOptions: CreateProductionDistributionCommandOptions): Command {
  const command = new Command()
    .name('productionDistributionCli')
    .description('Validate and select production distribution artifacts.')
    .configureOutput({
      writeOut: createCommandOptions.writeOutput,
      writeErr: createCommandOptions.writeError,
    })
    .exitOverride();

  command
    .command('validate-manifest')
    .requiredOption('--artifact-metadata-path <path>')
    .requiredOption('--manifest-path <path>')
    .requiredOption('--production-tag <tag>')
    .requiredOption('--production-tag-commit-sha <sha>')
    .option('--expected-commit-sha <sha>')
    .requiredOption('--source-run-id <id>')
    .action(async (optionValues: ValidateManifestOptionValues) => {
      await createCommandOptions.executeCommand({
        kind: 'validate-manifest',
        artifactMetadataPath: optionValues.artifactMetadataPath,
        manifestPath: optionValues.manifestPath,
        productionTag: optionValues.productionTag,
        productionTagCommitSha: optionValues.productionTagCommitSha,
        expectedCommitSha: optionValues.expectedCommitSha,
        sourceRunId: optionValues.sourceRunId,
      });
    });

  command
    .command('select-helm-chart')
    .requiredOption('--charts-path <path>')
    .requiredOption('--image-tag <tag>')
    .action(async (optionValues: SelectHelmChartOptionValues) => {
      await createCommandOptions.executeCommand({
        kind: 'select-helm-chart',
        chartsPath: optionValues.chartsPath,
        imageTag: optionValues.imageTag,
      });
    });

  command
    .command('wire-builds-fields-match')
    .requiredOption('--version <value>')
    .requiredOption('--repo <value>')
    .requiredOption('--app-version <value>')
    .requiredOption('--commit-url <value>')
    .requiredOption('--commit <value>')
    .action(async (optionValues: WireBuildsFieldsMatchOptionValues) => {
      await createCommandOptions.executeCommand({
        kind: 'wire-builds-fields-match',
        version: optionValues.version,
        repository: optionValues.repo,
        applicationVersion: optionValues.appVersion,
        commitUrl: optionValues.commitUrl,
        commit: optionValues.commit,
      });
    });

  return command;
}

export async function runProductionDistributionCommand(
  commandLineArguments: readonly string[],
  createCommandOptions: CreateProductionDistributionCommandOptions,
): Promise<number> {
  let executionExitCode = 0;
  const command = createCommand({
    ...createCommandOptions,
    async executeCommand(applicationCommand: ProductionDistributionCommand): Promise<number> {
      executionExitCode = await createCommandOptions.executeCommand(applicationCommand);

      return executionExitCode;
    },
  });

  try {
    await command.parseAsync(['node', 'productionDistributionCli', ...commandLineArguments]);

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

function writeRuntimeCommandOutput(message: string): void {
  process.stdout.write(message);
}

function writeRuntimeOutputLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function readRuntimeFile(filePath: string): string {
  return readFileSync(filePath, 'utf8');
}

function readRuntimeStandardInput(): string {
  return readFileSync(0, 'utf8');
}

function createRuntimeDependencies(): ProductionDistributionCommandDependencies {
  return {
    readFile: readRuntimeFile,
    readStandardInput: readRuntimeStandardInput,
    writeOutput: writeRuntimeOutputLine,
  };
}

async function main(): Promise<void> {
  process.exitCode = await runProductionDistributionCommand(process.argv.slice(2), {
    executeCommand(command: ProductionDistributionCommand): number {
      return executeProductionDistributionCommand(command, createRuntimeDependencies());
    },
    writeError: writeRuntimeError,
    writeOutput: writeRuntimeCommandOutput,
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
  main().catch(crash);
}
