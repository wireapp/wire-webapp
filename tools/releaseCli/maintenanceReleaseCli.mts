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
import type {Result as ResultType} from 'true-myth';

import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {
  maintenanceLineKeyFromTag,
  validateMaintenanceDistributionArtifactName,
  validateMaintenanceDistributionManifest,
  validateMaintenanceWireBuildsBranch,
  validateMaintenanceWireBuildsMetadata,
} from '../maintenanceRelease/maintenanceRelease.ts';

type MaintenanceDistributionOptionValues = {
  readonly manifestPath: string;
  readonly artifactMetadataPath: string;
  readonly maintenanceTag: string;
  readonly distributionArtifactName: string;
  readonly maintenanceCommitSha: string;
  readonly sourceRunId: string;
  readonly ebsChecksum: string;
  readonly contextChecksum: string;
};

type MaintenanceDistributionArtifactOptionValues = {
  readonly distributionArtifactName: string;
  readonly maintenanceTag: string;
};

type WireBuildsBuildJsonOptionValues = {
  readonly buildJsonPath: string;
};

function parseJsonFile(filePath: string): unknown {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error: unknown) {
    const errorMessage = isError(error) ? error.message : String(error);

    throw new Error(`Unable to read valid JSON from ${filePath}: ${errorMessage}`, {cause: error});
  }
}

function writeMaintenanceValidationResult(result: ResultType<string, Error>): number {
  if (result.isErr) {
    process.stderr.write(`${result.error.message}\n`);

    return 1;
  }

  process.stdout.write(`${result.value}\n`);

  return 0;
}

function writeGitValidatedMaintenanceBranch(branchName: string): number {
  let gitValidatedBranchName: string;

  try {
    gitValidatedBranchName = execFileSync('git', ['check-ref-format', '--branch', branchName], {
      encoding: 'utf8',
    }).trim();
  } catch {
    process.stderr.write(`Invalid wire-builds branch name: ${branchName}\n`);

    return 1;
  }

  if (gitValidatedBranchName !== branchName) {
    process.stderr.write(`Invalid wire-builds branch name: ${branchName}\n`);

    return 1;
  }

  return writeMaintenanceValidationResult(validateMaintenanceWireBuildsBranch(branchName));
}

function createMaintenanceReleaseCommand(): Command {
  const command = new Command()
    .name('maintenanceReleaseCli')
    .description('Validate maintenance release and distribution identity.')
    .exitOverride();

  command
    .command('validate-wire-builds-branch')
    .argument('<branch-name>')
    .action((branchName: string) => {
      process.exitCode = writeGitValidatedMaintenanceBranch(branchName);
    });

  command
    .command('validate-wire-builds-build-json')
    .requiredOption('--build-json-path <path>')
    .action((optionValues: WireBuildsBuildJsonOptionValues) => {
      const validationResult = validateMaintenanceWireBuildsMetadata(parseJsonFile(optionValues.buildJsonPath));

      if (validationResult.isErr) {
        process.stderr.write(`${validationResult.error.message}\n`);

        process.exitCode = 1;

        return;
      }

      process.stdout.write('wire-builds WebApp distribution metadata is compatible.\n');
      process.exitCode = 0;
    });

  command
    .command('maintenance-line-key')
    .argument('<maintenance-tag>')
    .action((maintenanceTag: string) => {
      process.exitCode = writeMaintenanceValidationResult(maintenanceLineKeyFromTag(maintenanceTag));
    });

  command
    .command('validate-distribution-artifact-name')
    .requiredOption('--distribution-artifact-name <name>')
    .requiredOption('--maintenance-tag <tag>')
    .action((optionValues: MaintenanceDistributionArtifactOptionValues) => {
      process.exitCode = writeMaintenanceValidationResult(
        validateMaintenanceDistributionArtifactName(optionValues.distributionArtifactName, optionValues.maintenanceTag),
      );
    });

  command
    .command('validate-distribution')
    .requiredOption('--manifest-path <path>')
    .requiredOption('--artifact-metadata-path <path>')
    .requiredOption('--maintenance-tag <tag>')
    .requiredOption('--distribution-artifact-name <name>')
    .requiredOption('--maintenance-commit-sha <sha>')
    .requiredOption('--source-run-id <id>')
    .requiredOption('--ebs-checksum <sha256>')
    .requiredOption('--context-checksum <sha256>')
    .action((optionValues: MaintenanceDistributionOptionValues) => {
      const manifest = parseJsonFile(optionValues.manifestPath);
      const artifactMetadata = parseJsonFile(optionValues.artifactMetadataPath);
      const validationResult = validateMaintenanceDistributionManifest({
        manifest,
        artifactMetadata,
        expectedMaintenanceTag: optionValues.maintenanceTag,
        expectedDistributionArtifactName: optionValues.distributionArtifactName,
        expectedMaintenanceCommitSha: optionValues.maintenanceCommitSha,
        expectedSourceWorkflowRunId: optionValues.sourceRunId,
        expectedEbsArtifactChecksum: optionValues.ebsChecksum,
        expectedDockerContextArchiveChecksum: optionValues.contextChecksum,
      });

      if (validationResult.isErr) {
        process.stderr.write(`${validationResult.error.message}\n`);

        process.exitCode = 1;

        return;
      }

      process.stdout.write('Maintenance distribution identity verified.\n');
      process.exitCode = 0;
    });

  return command;
}

async function main(): Promise<void> {
  try {
    await createMaintenanceReleaseCommand().parseAsync(process.argv);
  } catch (error: unknown) {
    if (error instanceof CommanderError) {
      process.exitCode = error.exitCode;

      return;
    }

    const errorMessage = isError(error) ? error.message : String(error);
    process.stderr.write(`${errorMessage}\n`);
    process.exitCode = 1;
  }
}

function isCurrentModuleEntrypoint(): boolean {
  const entrypointPath = process.argv[1];

  return typeof entrypointPath === 'string' && fileURLToPath(import.meta.url) === resolve(entrypointPath);
}

if (isCurrentModuleEntrypoint()) {
  await main();
}
