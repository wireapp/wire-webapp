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

import {runMaintenanceDistributionCli} from './maintenanceDistributionCli';

const maintenanceLineKey = '2026-07-27.1-airgap-a';
const maintenanceBranch = `maintenance/${maintenanceLineKey}`;
const sourceProductionTag = '2026-07-27.1-production';
const sourceProductionCommitSha = '1111111111111111111111111111111111111111';
const maintenanceCommitSha = '2222222222222222222222222222222222222222';
const maintenanceTag = `${maintenanceLineKey}-maintenance.1`;

function createManifest(): Record<string, string> {
  return {
    maintenanceLineKey,
    maintenanceBranch,
    sourceProductionTag,
    sourceProductionCommitSha,
    maintenanceCommitSha,
    maintenanceTag,
    artifactVersion: maintenanceTag,
    artifactChecksum: 'a'.repeat(64),
    workflowRunId: '30271304258',
    workflowRunAttempt: '1',
  };
}

function createArtifactMetadata(): Record<string, string> {
  return {
    version: maintenanceTag,
    assetVersion: `${maintenanceTag}-${maintenanceCommitSha.slice(0, 7)}`,
    commit: maintenanceCommitSha,
    builtAt: '2026-07-30T06:18:03.123Z',
  };
}

function runCommand(
  commandLineArguments: readonly string[],
  files: ReadonlyMap<string, string> = new Map([
    ['artifact-metadata.json', JSON.stringify(createArtifactMetadata())],
    ['manifest.json', JSON.stringify(createManifest())],
  ]),
): {readonly errors: readonly string[]; readonly exitCode: number} {
  const errors: string[] = [];
  const exitCode = runMaintenanceDistributionCli(commandLineArguments, {
    readFile(filePath) {
      const fileContents = files.get(filePath);

      if (fileContents === undefined) {
        throw new Error(`Missing test file: ${filePath}`);
      }

      return fileContents;
    },
    writeError(message) {
      errors.push(message);
    },
  });

  return {errors, exitCode};
}

function createValidationArguments(): readonly string[] {
  return [
    'validate-manifest',
    '--artifact-metadata-path',
    'artifact-metadata.json',
    '--manifest-path',
    'manifest.json',
    '--maintenance-line-key',
    maintenanceLineKey,
    '--maintenance-branch',
    maintenanceBranch,
    '--source-production-tag',
    sourceProductionTag,
    '--source-production-commit-sha',
    sourceProductionCommitSha,
    '--maintenance-commit-sha',
    maintenanceCommitSha,
    '--maintenance-tag',
    maintenanceTag,
    '--workflow-run-id',
    '30271304258',
    '--workflow-run-attempt',
    '1',
  ];
}

describe('maintenanceDistributionCli', () => {
  it('accepts a valid maintenance distribution manifest', () => {
    const actualResult = runCommand(createValidationArguments());

    expect(actualResult).toEqual({errors: [], exitCode: 0});
  });

  it('reports manifest validation errors', () => {
    const invalidManifest = {...createManifest(), maintenanceCommitSha: sourceProductionCommitSha};
    const actualResult = runCommand(
      createValidationArguments(),
      new Map([
        ['artifact-metadata.json', JSON.stringify(createArtifactMetadata())],
        ['manifest.json', JSON.stringify(invalidManifest)],
      ]),
    );

    expect(actualResult.exitCode).toBe(1);
    expect(actualResult.errors).toEqual(['Maintenance distribution manifest commit does not match the request']);
  });

  it('reports malformed JSON at the file boundary', () => {
    const actualResult = runCommand(
      createValidationArguments(),
      new Map([
        ['artifact-metadata.json', '{'],
        ['manifest.json', JSON.stringify(createManifest())],
      ]),
    );

    expect(actualResult.exitCode).toBe(1);
    expect(actualResult.errors[0]).toContain('Invalid JSON:');
  });

  it('reports unknown commands as a failed result', () => {
    const actualResult = runCommand(['unsupported-command']);

    expect(actualResult).toEqual({
      errors: ['Unknown maintenance distribution command: unsupported-command'],
      exitCode: 1,
    });
  });

  it('reports missing command arguments', () => {
    const actualResult = runCommand(['validate-manifest']);

    expect(actualResult.exitCode).toBe(1);
    expect(actualResult.errors[0]).toContain('Missing required option: --artifact-metadata-path');
  });
});
