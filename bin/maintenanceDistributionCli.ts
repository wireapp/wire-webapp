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

import {isNonEmptyString} from '@sindresorhus/is';
import {Result} from 'true-myth';

import {validateMaintenanceDistributionManifest} from './maintenanceDistribution';

type CommandLineOptions = ReadonlyMap<string, string>;

export type MaintenanceDistributionCliDependencies = {
  readonly readFile: (filePath: string) => string;
  readonly writeError: (message: string) => void;
};

function parseCommandLineOptions(commandLineArguments: readonly string[]): CommandLineOptions {
  const optionValues = new Map<string, string>();

  for (let argumentIndex = 0; argumentIndex < commandLineArguments.length; argumentIndex += 2) {
    const optionName = commandLineArguments[argumentIndex];
    const optionValue = commandLineArguments[argumentIndex + 1];

    if (!isNonEmptyString(optionName) || !optionName.startsWith('--') || !isNonEmptyString(optionValue)) {
      throw new Error('Options must be supplied as non-empty --name value pairs.');
    }

    optionValues.set(optionName.slice(2), optionValue);
  }

  return optionValues;
}

function getRequiredOption(optionValues: CommandLineOptions, optionName: string): string {
  const optionValue = optionValues.get(optionName);

  if (!isNonEmptyString(optionValue)) {
    throw new Error(`Missing required option: --${optionName}`);
  }

  return optionValue;
}

function parseJson(jsonText: string): unknown {
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON: ${errorMessage}`);
  }
}

function readJsonFile(filePath: string, dependencies: MaintenanceDistributionCliDependencies): unknown {
  return parseJson(dependencies.readFile(filePath));
}

function runValidateManifest(
  optionValues: CommandLineOptions,
  dependencies: MaintenanceDistributionCliDependencies,
): Result<void, Error> {
  const validationResult = validateMaintenanceDistributionManifest({
    artifactMetadata: readJsonFile(getRequiredOption(optionValues, 'artifact-metadata-path'), dependencies),
    manifest: readJsonFile(getRequiredOption(optionValues, 'manifest-path'), dependencies),
    maintenanceLineKey: getRequiredOption(optionValues, 'maintenance-line-key'),
    maintenanceBranch: getRequiredOption(optionValues, 'maintenance-branch'),
    sourceProductionTag: getRequiredOption(optionValues, 'source-production-tag'),
    sourceProductionCommitSha: getRequiredOption(optionValues, 'source-production-commit-sha'),
    maintenanceCommitSha: getRequiredOption(optionValues, 'maintenance-commit-sha'),
    maintenanceTag: getRequiredOption(optionValues, 'maintenance-tag'),
    workflowRunId: getRequiredOption(optionValues, 'workflow-run-id'),
    workflowRunAttempt: getRequiredOption(optionValues, 'workflow-run-attempt'),
  });

  if (validationResult.isErr) {
    return Result.err(validationResult.error);
  }

  return Result.ok(undefined);
}

function runCommand(
  commandName: string,
  optionValues: CommandLineOptions,
  dependencies: MaintenanceDistributionCliDependencies,
): Result<void, Error> {
  if (commandName === 'validate-manifest') {
    return runValidateManifest(optionValues, dependencies);
  }

  return Result.err(new Error(`Unknown maintenance distribution command: ${commandName}`));
}

export function runMaintenanceDistributionCli(
  commandLineArguments: readonly string[],
  dependencies: MaintenanceDistributionCliDependencies,
): number {
  try {
    const [commandName, ...optionArguments] = commandLineArguments;

    if (!isNonEmptyString(commandName)) {
      throw new Error('A maintenance distribution command is required.');
    }

    const commandResult = runCommand(commandName, parseCommandLineOptions(optionArguments), dependencies);

    if (commandResult.isErr) {
      dependencies.writeError(commandResult.error.message);

      return 1;
    }

    return 0;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    dependencies.writeError(errorMessage);

    return 1;
  }
}

function main(): void {
  process.exitCode = runMaintenanceDistributionCli(process.argv.slice(2), {
    readFile(filePath) {
      return readFileSync(filePath, 'utf8');
    },
    writeError(message) {
      console.error(message);
    },
  });
}

if (process.argv[1]?.endsWith('maintenanceDistributionCli.ts')) {
  main();
}
