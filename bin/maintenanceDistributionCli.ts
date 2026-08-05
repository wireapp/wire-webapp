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

function readJsonFile(filePath: string): unknown {
  return parseJson(readFileSync(filePath, 'utf8'));
}

function runValidateManifest(optionValues: CommandLineOptions): Result<void, Error> {
  const validationResult = validateMaintenanceDistributionManifest({
    artifactMetadata: readJsonFile(getRequiredOption(optionValues, 'artifact-metadata-path')),
    manifest: readJsonFile(getRequiredOption(optionValues, 'manifest-path')),
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

function runCommand(commandName: string, optionValues: CommandLineOptions): Result<void, Error> {
  if (commandName === 'validate-manifest') {
    return runValidateManifest(optionValues);
  }

  return Result.err(new Error(`Unknown maintenance distribution command: ${commandName}`));
}

function main(): void {
  try {
    const commandName = process.argv[2];

    if (!isNonEmptyString(commandName)) {
      throw new Error('A maintenance distribution command is required.');
    }

    const commandResult = runCommand(commandName, parseCommandLineOptions(process.argv.slice(3)));

    if (commandResult.isErr) {
      console.error(commandResult.error.message);
      process.exitCode = 1;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(errorMessage);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('maintenanceDistributionCli.ts')) {
  main();
}
