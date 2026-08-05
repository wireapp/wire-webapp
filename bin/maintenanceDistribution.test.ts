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

import assert from 'node:assert';

import {validateMaintenanceDistributionManifest} from './maintenanceDistribution';

const maintenanceLineKey = '2026-07-27.1-airgap-a';
const maintenanceBranch = `maintenance/${maintenanceLineKey}`;
const sourceProductionTag = '2026-07-27.1-production';
const sourceProductionCommitSha = '1111111111111111111111111111111111111111';
const maintenanceCommitSha = '2222222222222222222222222222222222222222';
const maintenanceTag = `${maintenanceLineKey}-maintenance.1`;
const artifactChecksum = 'a'.repeat(64);

function createValidManifest(): Record<string, string> {
  return {
    maintenanceLineKey,
    maintenanceBranch,
    sourceProductionTag,
    sourceProductionCommitSha,
    maintenanceCommitSha,
    maintenanceTag,
    artifactVersion: maintenanceTag,
    artifactChecksum,
    workflowRunId: '30271304258',
    workflowRunAttempt: '1',
  };
}

function createValidArtifactMetadata(): Record<string, string> {
  return {
    version: maintenanceTag,
    assetVersion: `${maintenanceTag}-${maintenanceCommitSha.slice(0, 7)}`,
    commit: maintenanceCommitSha,
    builtAt: '2026-07-30T06:18:03.123Z',
  };
}

function createValidationParameters(
  manifest: unknown = createValidManifest(),
  artifactMetadata: unknown = createValidArtifactMetadata(),
): {
  readonly artifactMetadata: unknown;
  readonly manifest: unknown;
  readonly maintenanceLineKey: string;
  readonly maintenanceBranch: string;
  readonly sourceProductionTag: string;
  readonly sourceProductionCommitSha: string;
  readonly maintenanceCommitSha: string;
  readonly maintenanceTag: string;
  readonly workflowRunId: string;
  readonly workflowRunAttempt: string;
} {
  return {
    artifactMetadata,
    manifest,
    maintenanceLineKey,
    maintenanceBranch,
    sourceProductionTag,
    sourceProductionCommitSha,
    maintenanceCommitSha,
    maintenanceTag,
    workflowRunId: '30271304258',
    workflowRunAttempt: '1',
  };
}

describe('maintenance distribution', () => {
  it('validates the manifest and artifact identity together', () => {
    const actualValidation = validateMaintenanceDistributionManifest(createValidationParameters());

    assert(actualValidation.isOk === true);

    expect(actualValidation.value).toEqual({
      ...createValidManifest(),
    });
  });

  it.each([
    ['maintenanceLineKey', '2026-07-27.1-airgap-b'],
    ['maintenanceBranch', 'maintenance/2026-07-27.1-airgap-b'],
    ['sourceProductionTag', '2026-07-28.1-production'],
    ['sourceProductionCommitSha', ''],
    ['maintenanceCommitSha', ''],
    ['maintenanceTag', '2026-07-27.1-airgap-b-maintenance.1'],
    ['artifactVersion', '2026-07-27.1-airgap-b-maintenance.1'],
    ['artifactChecksum', 'not-a-checksum'],
    ['workflowRunId', ''],
    ['workflowRunAttempt', ''],
  ])('rejects manifest field mismatch or invalid value for %s', (fieldName, fieldValue) => {
    const manifest = {...createValidManifest(), [fieldName]: fieldValue};
    const actualValidation = validateMaintenanceDistributionManifest(createValidationParameters(manifest));

    expect(actualValidation.isErr).toBe(true);
  });

  it('rejects artifact metadata with a different maintenance commit', () => {
    const artifactMetadata = {
      ...createValidArtifactMetadata(),
      assetVersion: `${maintenanceTag}-${sourceProductionCommitSha.slice(0, 7)}`,
      commit: sourceProductionCommitSha,
    };

    const actualValidation = validateMaintenanceDistributionManifest(
      createValidationParameters(createValidManifest(), artifactMetadata),
    );

    assert(actualValidation.isErr === true);

    expect(actualValidation.error.message).toBe(
      'Maintenance distribution artifact metadata commit does not match the maintenance commit',
    );
  });

  it('rejects a legacy source Production tag', () => {
    const actualValidation = validateMaintenanceDistributionManifest(
      createValidationParameters({...createValidManifest(), sourceProductionTag: '2026-07-27-production.1'}),
    );

    expect(actualValidation.isErr).toBe(true);
  });
});
