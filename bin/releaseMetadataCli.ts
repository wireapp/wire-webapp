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

import {isNonEmptyStringAndNotWhitespace} from '@sindresorhus/is';
import {Result} from 'true-myth';

import {
  createMaintenanceBranchName,
  createNextBetaTagName,
  createNextMaintenanceTagName,
  createProductionTagName,
  createReleaseBranchName,
  extractMaintenanceLineKeyFromBranchName,
  extractMaintenanceTagNameMetadata,
  extractReleaseIdentifierFromBranchName,
  maintenanceTagPointsToCommit,
  resolveWebappBuildVersion,
  validateMaintenanceBranchName,
  validateMaintenanceLineKey,
  validateMaintenanceSourceProductionTag,
  validateMaintenanceTagName,
  validateProductionTagName,
} from './releaseMetadata';
import type {CommitHash, MaintenanceTagMetadata, MaintenanceTagNameMetadata} from './releaseMetadata';

type ReleaseMetadataCliDependencies = {
  readonly writeError: (message: string) => void;
  readonly writeOutput: (message: string) => void;
};

const nodeExecutableAndScriptPathArgumentCount = 2;

const usageText = [
  'Usage:',
  '  releaseMetadataCli.ts release-identifier-from-branch <release/YYYY-MM-DD.N>',
  '  releaseMetadataCli.ts release-branch <YYYY-MM-DD.N>',
  '  releaseMetadataCli.ts next-beta-tag <YYYY-MM-DD.N> [existing-tag ...]',
  '  releaseMetadataCli.ts production-tag <YYYY-MM-DD.N>',
  '  releaseMetadataCli.ts validate-production-tag <YYYY-MM-DD.N-production>',
  '  releaseMetadataCli.ts validate-maintenance-line-key <YYYY-MM-DD.N-qualifier[-qualifier ...]>',
  '  releaseMetadataCli.ts maintenance-branch <YYYY-MM-DD.N-qualifier[-qualifier ...]>',
  '  releaseMetadataCli.ts validate-maintenance-branch <maintenance/YYYY-MM-DD.N-qualifier[-qualifier ...]>',
  '  releaseMetadataCli.ts maintenance-line-key-from-branch <maintenance/YYYY-MM-DD.N-qualifier[-qualifier ...]>',
  '  releaseMetadataCli.ts validate-maintenance-tag <YYYY-MM-DD.N-qualifier-maintenance.X>',
  '  releaseMetadataCli.ts maintenance-tag-metadata <YYYY-MM-DD.N-qualifier-maintenance.X>',
  '  releaseMetadataCli.ts next-maintenance-tag <YYYY-MM-DD.N-qualifier[-qualifier ...]> [existing-tag ...]',
  '  releaseMetadataCli.ts maintenance-tag-points-to-commit <line-key> <commit> [tag commit ...]',
  '  releaseMetadataCli.ts validate-maintenance-source <line-key> <YYYY-MM-DD.N-production>',
  '  releaseMetadataCli.ts webapp-build-version <build-reference-or-empty> <full-commit-sha> <main|development|production>',
].join('\n');

type ReleaseMetadataCliResult =
  | ReturnType<typeof extractReleaseIdentifierFromBranchName>
  | ReturnType<typeof createReleaseBranchName>
  | ReturnType<typeof createNextBetaTagName>
  | ReturnType<typeof createProductionTagName>
  | ReturnType<typeof resolveWebappBuildVersion>
  | ReturnType<typeof validateProductionTagName>
  | ReturnType<typeof createMaintenanceBranchName>
  | ReturnType<typeof createNextMaintenanceTagName>
  | ReturnType<typeof extractMaintenanceLineKeyFromBranchName>
  | ReturnType<typeof extractMaintenanceTagNameMetadata>
  | ReturnType<typeof validateMaintenanceBranchName>
  | ReturnType<typeof validateMaintenanceLineKey>
  | ReturnType<typeof validateMaintenanceSourceProductionTag>
  | ReturnType<typeof validateMaintenanceTagName>
  | ReturnType<typeof maintenanceTagPointsToCommit>;

function formatResultValue(value: string | boolean | MaintenanceTagNameMetadata): string {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function writeResult(result: ReleaseMetadataCliResult, dependencies: ReleaseMetadataCliDependencies): number {
  if (result.isErr) {
    dependencies.writeError(result.error.message);

    return 1;
  }

  dependencies.writeOutput(formatResultValue(result.value));

  return 0;
}

function readMaintenanceTagMetadata(
  commandLineValues: readonly string[],
): ReturnType<typeof maintenanceTagPointsToCommit> {
  const [maintenanceLineKey, currentCommitHash, ...tagAndCommitValues] = commandLineValues;

  if (
    maintenanceLineKey === undefined ||
    !isNonEmptyStringAndNotWhitespace(currentCommitHash) ||
    tagAndCommitValues.length === 0 ||
    tagAndCommitValues.length % 2 !== 0
  ) {
    return Result.err(new Error(usageText));
  }

  const maintenanceTagMetadata: MaintenanceTagMetadata[] = [];

  for (let valueIndex = 0; valueIndex < tagAndCommitValues.length; valueIndex += 2) {
    const tagName = tagAndCommitValues[valueIndex];
    const commitHash = tagAndCommitValues[valueIndex + 1];

    if (!isNonEmptyStringAndNotWhitespace(tagName) || !isNonEmptyStringAndNotWhitespace(commitHash)) {
      return Result.err(new Error(usageText));
    }

    const tagNameResult = validateMaintenanceTagName(tagName);

    if (tagNameResult.isErr) {
      return Result.err(tagNameResult.error);
    }

    maintenanceTagMetadata.push({tagName: tagNameResult.value, commitHash: commitHash as unknown as CommitHash});
  }

  return maintenanceTagPointsToCommit({
    currentCommitHash: currentCommitHash as unknown as CommitHash,
    maintenanceLineKey,
    maintenanceTagMetadata,
  });
}

export function runReleaseMetadataCli(
  commandLineArguments: readonly string[],
  dependencies: ReleaseMetadataCliDependencies,
): number {
  const [commandName, primaryValue, ...remainingValues] = commandLineArguments;

  if (commandName === 'release-identifier-from-branch' && primaryValue !== undefined) {
    return writeResult(extractReleaseIdentifierFromBranchName(primaryValue), dependencies);
  }

  if (commandName === 'release-branch' && primaryValue !== undefined) {
    return writeResult(createReleaseBranchName(primaryValue), dependencies);
  }

  if (commandName === 'next-beta-tag' && primaryValue !== undefined) {
    return writeResult(createNextBetaTagName(primaryValue, remainingValues), dependencies);
  }

  if (commandName === 'production-tag' && primaryValue !== undefined) {
    return writeResult(createProductionTagName(primaryValue), dependencies);
  }

  if (commandName === 'validate-production-tag' && primaryValue !== undefined) {
    return writeResult(validateProductionTagName(primaryValue), dependencies);
  }

  if (commandName === 'validate-maintenance-line-key' && primaryValue !== undefined && remainingValues.length === 0) {
    return writeResult(validateMaintenanceLineKey(primaryValue), dependencies);
  }

  if (commandName === 'maintenance-branch' && primaryValue !== undefined && remainingValues.length === 0) {
    return writeResult(createMaintenanceBranchName(primaryValue), dependencies);
  }

  if (commandName === 'validate-maintenance-branch' && primaryValue !== undefined && remainingValues.length === 0) {
    return writeResult(validateMaintenanceBranchName(primaryValue), dependencies);
  }

  if (
    commandName === 'maintenance-line-key-from-branch' &&
    primaryValue !== undefined &&
    remainingValues.length === 0
  ) {
    return writeResult(extractMaintenanceLineKeyFromBranchName(primaryValue), dependencies);
  }

  if (commandName === 'validate-maintenance-tag' && primaryValue !== undefined && remainingValues.length === 0) {
    return writeResult(validateMaintenanceTagName(primaryValue), dependencies);
  }

  if (commandName === 'maintenance-tag-metadata' && primaryValue !== undefined && remainingValues.length === 0) {
    return writeResult(extractMaintenanceTagNameMetadata(primaryValue), dependencies);
  }

  if (commandName === 'next-maintenance-tag' && primaryValue !== undefined) {
    return writeResult(createNextMaintenanceTagName(primaryValue, remainingValues), dependencies);
  }

  if (commandName === 'maintenance-tag-points-to-commit') {
    const maintenanceTagPointsToCommitArguments =
      primaryValue === undefined ? remainingValues : [primaryValue, ...remainingValues];

    return writeResult(readMaintenanceTagMetadata(maintenanceTagPointsToCommitArguments), dependencies);
  }

  if (commandName === 'validate-maintenance-source' && primaryValue !== undefined && remainingValues.length === 1) {
    return writeResult(validateMaintenanceSourceProductionTag(primaryValue, remainingValues[0]), dependencies);
  }

  if (commandName === 'webapp-build-version' && primaryValue !== undefined && remainingValues.length === 2) {
    return writeResult(resolveWebappBuildVersion(primaryValue, remainingValues[0], remainingValues[1]), dependencies);
  }

  dependencies.writeError(usageText);

  return 1;
}

if (require.main === module) {
  process.exitCode = runReleaseMetadataCli(process.argv.slice(nodeExecutableAndScriptPathArgumentCount), {
    writeError(message): void {
      console.error(message);
    },
    writeOutput(message): void {
      console.log(message);
    },
  });
}
