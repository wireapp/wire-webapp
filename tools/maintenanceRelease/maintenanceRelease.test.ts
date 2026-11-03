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

import {
  maintenanceLineKeyFromTag,
  validateMaintenanceDistributionArtifactName,
  validateMaintenanceDistributionManifest,
  validateMaintenanceWireBuildsBranch,
  validateMaintenanceWireBuildsMetadata,
} from './maintenanceRelease';

const maintenanceTag = 'v1.1.0-airgap-a-maintenance.1';
const distributionArtifactName = `maintenance-distribution-${maintenanceTag}-2`;
const maintenanceCommitSha = '1234567890abcdef1234567890abcdef12345678';
const ebsArtifactChecksum = 'a'.repeat(64);
const dockerContextArchiveChecksum = 'b'.repeat(64);
const sourceWorkflowRunId = '12345';
const legacyWebappChartRepository = 'https://s3-eu-west-1.amazonaws.com/public.wire.com/charts-webapp';

function createValidMaintenanceDistributionManifest(): Record<string, string> {
  return {
    maintenanceTag,
    maintenanceLineKey: 'v1.1.0-airgap-a',
    distributionArtifactName,
    maintenanceCommitSha,
    artifactVersion: maintenanceTag,
    artifactCommitSha: maintenanceCommitSha,
    ebsArtifactChecksum,
    dockerContextArchiveChecksum,
    sourceWorkflowRunId,
  };
}

describe('maintenance release decisions', () => {
  it.each(['2026-q3', 'customers/gov-2027', 'bund/stable'])(
    'accepts a non-protected wire-builds branch without a naming convention: %s',
    branchName => {
      const actualCustomerBranch = validateMaintenanceWireBuildsBranch(branchName);

      assert(actualCustomerBranch.isOk);
      expect(actualCustomerBranch.value).toBe(branchName);
    },
  );

  it('always rejects protected wire-builds branches', () => {
    const actualMainBranch = validateMaintenanceWireBuildsBranch('main');
    const actualDevelopmentBranch = validateMaintenanceWireBuildsBranch('dev');

    assert(actualMainBranch.isErr);
    assert(actualDevelopmentBranch.isErr);
  });

  it('accepts compatible legacy S3 WebApp metadata without modifying the build definition', () => {
    const legacyBuildJson = {
      version: '1.0.0-174',
      helmCharts: {
        webapp: {
          repo: legacyWebappChartRepository,
          version: '0.8.0-pre.3713',
          meta: {appVersion: 'previous-image', commit: 'previous-commit'},
        },
        backend: {repo: 'https://charts.example.invalid/backend', version: '3.2.1'},
      },
      unrelatedMetadata: {owner: 'integration'},
    };
    const expectedBuildJson = structuredClone(legacyBuildJson);
    const actualValidation = validateMaintenanceWireBuildsMetadata(legacyBuildJson);

    assert(actualValidation.isOk);
    expect(legacyBuildJson).toEqual(expectedBuildJson);
  });

  it('rejects OCI WebApp chart metadata without modifying unrelated build data', () => {
    const ociBuildJson = {
      version: '1.0.0-174',
      helmCharts: {
        webapp: {
          repo: 'oci://quay.io/wire/charts/dev',
          version: '0.8.0-pre.3692',
          meta: {digest: `sha256:${'a'.repeat(64)}`},
        },
        backend: {repo: 'https://charts.example.invalid/backend', version: '3.2.1'},
      },
      unrelatedMetadata: {owner: 'integration'},
    };
    const expectedBuildJson = structuredClone(ociBuildJson);
    const actualValidation = validateMaintenanceWireBuildsMetadata(ociBuildJson);

    assert(actualValidation.isErr);
    expect(actualValidation.error.message).toContain('must use the legacy S3 Helm repository');
    expect(ociBuildJson).toEqual(expectedBuildJson);
  });

  it('rejects WebApp digest metadata even when the chart repository is S3', () => {
    const digestBuildJson = {
      version: '1.0.0-174',
      helmCharts: {
        webapp: {
          repo: legacyWebappChartRepository,
          version: '0.8.0-pre.3713',
          meta: {digest: `sha256:${'b'.repeat(64)}`},
        },
      },
    };
    const actualValidation = validateMaintenanceWireBuildsMetadata(digestBuildJson);

    assert(actualValidation.isErr);
    expect(actualValidation.error.message).toContain('digest metadata cannot be replaced');
  });

  it('rejects top-level versions that bump-prerelease cannot process', () => {
    const invalidVersionBuildJson = {
      version: '2026.09.0',
      helmCharts: {
        webapp: {repo: legacyWebappChartRepository, version: '0.8.0-pre.3713'},
      },
    };
    const expectedBuildJson = structuredClone(invalidVersionBuildJson);
    const actualValidation = validateMaintenanceWireBuildsMetadata(invalidVersionBuildJson);

    assert(actualValidation.isErr);
    expect(actualValidation.error.message).toContain('must be a SemVer version');
    expect(invalidVersionBuildJson).toEqual(expectedBuildJson);
  });

  it('rejects a customer branch without an existing WebApp chart entry', () => {
    const actualValidation = validateMaintenanceWireBuildsMetadata({
      version: '1.0.0-174',
      helmCharts: {backend: {repo: 'https://charts.example.invalid/backend', version: '3.2.1'}},
    });

    assert(actualValidation.isErr);
    expect(actualValidation.error.message).toContain('must contain a WebApp Helm chart entry');
  });

  it('extracts the existing maintenance line key from an immutable tag', () => {
    const actualLineKey = maintenanceLineKeyFromTag(maintenanceTag);

    assert(actualLineKey.isOk);
    expect(actualLineKey.value).toBe('v1.1.0-airgap-a');
  });

  it('accepts a distribution artifact name scoped to the tag and workflow attempt', () => {
    const actualArtifactName = validateMaintenanceDistributionArtifactName(distributionArtifactName, maintenanceTag);

    assert(actualArtifactName.isOk);
    expect(actualArtifactName.value).toBe(distributionArtifactName);
  });

  it('rejects a distribution artifact name from another tag or missing workflow attempt', () => {
    const actualDifferentTag = validateMaintenanceDistributionArtifactName(
      'maintenance-distribution-v1.1.0-other-line-maintenance.1-2',
      maintenanceTag,
    );
    const actualMissingAttempt = validateMaintenanceDistributionArtifactName(
      `maintenance-distribution-${maintenanceTag}`,
      maintenanceTag,
    );

    assert(actualDifferentTag.isErr);
    assert(actualMissingAttempt.isErr);
  });

  it('validates a recovered distribution artifact against its immutable tag and checksums', () => {
    const actualManifest = validateMaintenanceDistributionManifest({
      manifest: createValidMaintenanceDistributionManifest(),
      artifactMetadata: {version: maintenanceTag, commit: maintenanceCommitSha},
      expectedMaintenanceTag: maintenanceTag,
      expectedDistributionArtifactName: distributionArtifactName,
      expectedMaintenanceCommitSha: maintenanceCommitSha,
      expectedSourceWorkflowRunId: sourceWorkflowRunId,
      expectedEbsArtifactChecksum: ebsArtifactChecksum,
      expectedDockerContextArchiveChecksum: dockerContextArchiveChecksum,
    });

    assert(actualManifest.isOk);
    expect(actualManifest.value.maintenanceLineKey).toBe('v1.1.0-airgap-a');
  });

  it.each([
    [
      'different tag',
      {...createValidMaintenanceDistributionManifest(), maintenanceTag: 'v1.1.0-airgap-a-maintenance.2'},
    ],
    [
      'different distribution artifact name',
      {
        ...createValidMaintenanceDistributionManifest(),
        distributionArtifactName: 'maintenance-distribution-v1.1.0-airgap-a-maintenance.1-1',
      },
    ],
    ['different commit', {...createValidMaintenanceDistributionManifest(), maintenanceCommitSha: 'f'.repeat(40)}],
    ['different EBS artifact', {...createValidMaintenanceDistributionManifest(), ebsArtifactChecksum: 'c'.repeat(64)}],
    [
      'different Docker context',
      {...createValidMaintenanceDistributionManifest(), dockerContextArchiveChecksum: 'c'.repeat(64)},
    ],
    ['different workflow run', {...createValidMaintenanceDistributionManifest(), sourceWorkflowRunId: '67890'}],
  ])('rejects recovery when the manifest has a %s identity', (_description, manifest) => {
    const actualManifest = validateMaintenanceDistributionManifest({
      manifest,
      artifactMetadata: {version: maintenanceTag, commit: maintenanceCommitSha},
      expectedMaintenanceTag: maintenanceTag,
      expectedDistributionArtifactName: distributionArtifactName,
      expectedMaintenanceCommitSha: maintenanceCommitSha,
      expectedSourceWorkflowRunId: sourceWorkflowRunId,
      expectedEbsArtifactChecksum: ebsArtifactChecksum,
      expectedDockerContextArchiveChecksum: dockerContextArchiveChecksum,
    });

    assert(actualManifest.isErr);
  });

  it('rejects a non-numeric source workflow run ID even when manifest and request match', () => {
    const invalidSourceRunManifest = {
      ...createValidMaintenanceDistributionManifest(),
      sourceWorkflowRunId: 'run-id',
    };
    const actualManifest = validateMaintenanceDistributionManifest({
      manifest: invalidSourceRunManifest,
      artifactMetadata: {version: maintenanceTag, commit: maintenanceCommitSha},
      expectedMaintenanceTag: maintenanceTag,
      expectedDistributionArtifactName: distributionArtifactName,
      expectedMaintenanceCommitSha: maintenanceCommitSha,
      expectedSourceWorkflowRunId: 'run-id',
      expectedEbsArtifactChecksum: ebsArtifactChecksum,
      expectedDockerContextArchiveChecksum: dockerContextArchiveChecksum,
    });

    assert(actualManifest.isErr);
  });
});
