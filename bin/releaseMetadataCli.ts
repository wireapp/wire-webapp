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

import {
  createNextBetaTagName,
  createProductionTagName,
  createReleaseBranchName,
  extractReleaseIdentifierFromBranchName,
  resolveWebappBuildVersion,
  validateProductionTagName,
} from './releaseMetadata';

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
  '  releaseMetadataCli.ts webapp-build-version <build-reference-or-empty> <full-commit-sha> <main|development|production>',
].join('\n');

function writeResult(
  result:
    | ReturnType<typeof extractReleaseIdentifierFromBranchName>
    | ReturnType<typeof createReleaseBranchName>
    | ReturnType<typeof createNextBetaTagName>
    | ReturnType<typeof createProductionTagName>
    | ReturnType<typeof resolveWebappBuildVersion>
    | ReturnType<typeof validateProductionTagName>,
  dependencies: ReleaseMetadataCliDependencies,
): number {
  if (result.isErr) {
    dependencies.writeError(result.error.message);
    return 1;
  }

  dependencies.writeOutput(result.value);
  return 0;
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
