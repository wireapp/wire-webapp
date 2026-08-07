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

import {isError, isString} from '@sindresorhus/is';
import {Command, CommanderError} from 'commander';

import {
  executeReleaseMetadataCommand,
  type ReleaseMetadataCliDependencies,
  type ReleaseMetadataCommand,
} from '../release-metadata/releaseMetadataCli.ts';

type CreateReleaseMetadataCommandOptions = {
  readonly executeCommand: (command: ReleaseMetadataCommand) => Promise<number> | number;
  readonly writeOutput: (message: string) => void;
  readonly writeError: (message: string) => void;
};

export function createCommand(createCommandOptions: CreateReleaseMetadataCommandOptions): Command {
  const command = new Command()
    .name('releaseMetadataCli')
    .description('Read and create Wire release metadata.')
    .configureOutput({
      writeOut: createCommandOptions.writeOutput,
      writeErr: createCommandOptions.writeError,
    })
    .exitOverride();

  command
    .command('release-identifier-from-branch')
    .argument('<release-branch>')
    .action(async (releaseBranch: string) => {
      await createCommandOptions.executeCommand({kind: 'release-identifier-from-branch', releaseBranch});
    });

  command
    .command('release-branch')
    .argument('<release-identifier>')
    .action(async (releaseIdentifier: string) => {
      await createCommandOptions.executeCommand({kind: 'release-branch', releaseIdentifier});
    });

  command
    .command('next-beta-tag')
    .argument('<release-identifier>')
    .argument('[existing-tag...]')
    .action(async (releaseIdentifier: string, existingTagNames: string[]) => {
      await createCommandOptions.executeCommand({kind: 'next-beta-tag', releaseIdentifier, existingTagNames});
    });

  command
    .command('production-tag')
    .argument('<release-identifier>')
    .action(async (releaseIdentifier: string) => {
      await createCommandOptions.executeCommand({kind: 'production-tag', releaseIdentifier});
    });

  command
    .command('validate-production-tag')
    .argument('<production-tag>')
    .action(async (productionTag: string) => {
      await createCommandOptions.executeCommand({kind: 'validate-production-tag', productionTag});
    });

  command
    .command('maintenance-branch')
    .argument('<maintenance-line-key>')
    .action(async (maintenanceLineKey: string) => {
      await createCommandOptions.executeCommand({kind: 'maintenance-branch', maintenanceLineKey});
    });

  command
    .command('validate-maintenance-tag')
    .argument('<maintenance-tag>')
    .action(async (maintenanceTag: string) => {
      await createCommandOptions.executeCommand({kind: 'validate-maintenance-tag', maintenanceTag});
    });

  command
    .command('next-maintenance-tag')
    .argument('<maintenance-line-key>')
    .argument('[existing-tag...]')
    .action(async (maintenanceLineKey: string, existingTagNames: string[]) => {
      await createCommandOptions.executeCommand({kind: 'next-maintenance-tag', maintenanceLineKey, existingTagNames});
    });

  command
    .command('validate-maintenance-source')
    .argument('<maintenance-line-key>')
    .argument('<source-production-tag>')
    .action(async (maintenanceLineKey: string, sourceProductionTag: string) => {
      await createCommandOptions.executeCommand({
        kind: 'validate-maintenance-source',
        maintenanceLineKey,
        sourceProductionTag,
      });
    });

  command
    .command('webapp-build-version')
    .argument('<build-reference-or-empty>')
    .argument('<full-commit-sha>')
    .argument('<main|development|production>')
    .action(async (buildReference: string, fullCommitSha: string, environmentName: string) => {
      await createCommandOptions.executeCommand({
        kind: 'webapp-build-version',
        buildReference,
        fullCommitSha,
        environmentName,
      });
    });

  return command;
}

export async function runReleaseMetadataCommand(
  commandLineArguments: readonly string[],
  createCommandOptions: CreateReleaseMetadataCommandOptions,
): Promise<number> {
  let executionExitCode = 0;
  const command = createCommand({
    ...createCommandOptions,
    async executeCommand(applicationCommand: ReleaseMetadataCommand): Promise<number> {
      executionExitCode = await createCommandOptions.executeCommand(applicationCommand);

      return executionExitCode;
    },
  });

  try {
    await command.parseAsync(['node', 'releaseMetadataCli', ...commandLineArguments]);

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

function createRuntimeDependencies(): ReleaseMetadataCliDependencies {
  return {
    writeError: writeRuntimeError,
    writeOutput: writeRuntimeOutputLine,
  };
}

async function main(): Promise<void> {
  process.exitCode = await runReleaseMetadataCommand(process.argv.slice(2), {
    executeCommand(command: ReleaseMetadataCommand): number {
      return executeReleaseMetadataCommand(command, createRuntimeDependencies());
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
