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

import * as nodeFileSystem from 'node:fs';
import * as nodePath from 'node:path';

export type DatadogReference = {
  readonly filePath: string;
  readonly lineNumber: number;
  readonly matchedText: string;
};

export type VerificationResult =
  | {
      readonly references: readonly DatadogReference[];
      readonly status: 'failed';
    }
  | {
      readonly checkedFileCount: number;
      readonly status: 'passed';
    };

const datadogReferencePattern = /@datadog\/browser-logs|@datadog\/browser-rum|datadoghq\.eu/g;
const publicProductionArtifactDirectory = 'apps/server/dist/static';

function isScannedPublicProductionArtifactFile(filePath: string): boolean {
  return filePath.endsWith('.js') || filePath.endsWith('.js.map');
}

export function getPublicProductionArtifactFilePaths(artifactDirectory: string): readonly string[] {
  if (!nodeFileSystem.existsSync(artifactDirectory)) {
    return [];
  }

  const artifactFilePaths: string[] = [];

  for (const directoryEntry of nodeFileSystem.readdirSync(artifactDirectory, {withFileTypes: true})) {
    const directoryEntryPath = nodePath.join(artifactDirectory, directoryEntry.name);

    if (directoryEntry.isDirectory()) {
      artifactFilePaths.push(...getPublicProductionArtifactFilePaths(directoryEntryPath));
    } else if (directoryEntry.isFile() && isScannedPublicProductionArtifactFile(directoryEntryPath)) {
      artifactFilePaths.push(directoryEntryPath);
    }
  }

  return artifactFilePaths.sort();
}

export function getDatadogReferencesInFile(filePath: string): readonly DatadogReference[] {
  const fileContent = nodeFileSystem.readFileSync(filePath, 'utf8');
  const references: DatadogReference[] = [];
  const fileLines = fileContent.split('\n');

  for (const [lineIndex, lineContent] of fileLines.entries()) {
    const matches = lineContent.matchAll(datadogReferencePattern);

    for (const match of matches) {
      references.push({
        filePath,
        lineNumber: lineIndex + 1,
        matchedText: match[0],
      });
    }
  }

  return references;
}

export function verifyPublicProductionBundle(artifactDirectory: string): VerificationResult {
  const artifactFilePaths = getPublicProductionArtifactFilePaths(artifactDirectory);

  if (artifactFilePaths.length === 0) {
    throw new Error(`No public production JavaScript artifact files found in ${artifactDirectory}.`);
  }

  const references: DatadogReference[] = [];

  for (const filePath of artifactFilePaths) {
    references.push(...getDatadogReferencesInFile(filePath));
  }

  if (references.length > 0) {
    return {
      references,
      status: 'failed',
    };
  }

  return {
    checkedFileCount: artifactFilePaths.length,
    status: 'passed',
  };
}

function printVerificationResult(result: VerificationResult): void {
  if (result.status === 'passed') {
    console.log(`No Datadog SDK references found in ${result.checkedFileCount} public production artifact files.`);
    return;
  }

  for (const reference of result.references) {
    console.log(`${reference.filePath}:${reference.lineNumber}: ${reference.matchedText}`);
  }

  console.error('Datadog SDK references were found in the public production bundle.');
  process.exitCode = 1;
}

function main(): void {
  try {
    const result = verifyPublicProductionBundle(publicProductionArtifactDirectory);
    printVerificationResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

function isCurrentProcessEntryPoint(executableScriptPath: string | undefined): boolean {
  return (
    executableScriptPath !== undefined && nodePath.basename(executableScriptPath) === 'verifyPublicProductionBundle.ts'
  );
}

if (isCurrentProcessEntryPoint(process.argv[1])) {
  main();
}
