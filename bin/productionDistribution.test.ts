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
import {execFileSync} from 'node:child_process';

import {
  hasExpectedWireBuildsWebappFields,
  selectHelmChartVersion,
  validateProductionDistributionManifest,
} from './productionDistribution';
import type {WireBuildsWebappFields} from './productionDistribution';

const expectedProductionTag = '2026-07-15.1-production';
const expectedReleaseCommitSha = '1234567890abcdef1234567890abcdef12345678';
const expectedWireBuildsFields: WireBuildsWebappFields = {
  version: '0.8.0-pre.3175',
  repo: 'https://s3-eu-west-1.amazonaws.com/public.wire.com/charts-webapp',
  appVersion: '2026-07-15.1-production-v0.34.9-0-1234567',
  commitUrl: `https://github.com/wireapp/wire-webapp/commit/${expectedReleaseCommitSha}`,
  commit: expectedReleaseCommitSha,
};

function createValidDistributionManifest(): Record<string, unknown> {
  return {
    productionTag: null,
    releaseIdentifier: '2026-07-15.1',
    releaseCommitSha: expectedReleaseCommitSha,
    artifactVersion: '2026-07-15.1',
    cloudArtifactChecksum: 'a'.repeat(64),
    sourceRunId: '12345',
    sourceRunAttempt: '1',
  };
}

function createValidArtifactMetadata(): Record<string, string> {
  return {
    version: '2026-07-15.1',
    assetVersion: '2026-07-15.1-1234567',
    commit: expectedReleaseCommitSha,
    builtAt: '2026-07-20T06:18:03.123Z',
  };
}

function createValidLegacyArtifactMetadata(): Record<string, string> {
  return {
    version: '2026.07.15.12.00',
    commit: expectedReleaseCommitSha,
  };
}

function getUnrelatedWireBuildsState(buildJson: Record<string, unknown>): string {
  return execFileSync('jq', ['-S', '-c', 'del(.version, .helmCharts.webapp)'], {
    encoding: 'utf8',
    input: `${JSON.stringify(buildJson)}\n`,
  }).trim();
}

describe('production distribution decisions', () => {
  it('validates the Production identity and distribution manifest together', () => {
    const actualManifest = validateProductionDistributionManifest({
      artifactMetadata: createValidArtifactMetadata(),
      manifest: createValidDistributionManifest(),
      productionTag: expectedProductionTag,
      productionTagCommitSha: expectedReleaseCommitSha,
      expectedCommitSha: expectedReleaseCommitSha,
      sourceRunId: '12345',
    });

    assert(actualManifest.isOk);

    expect(actualManifest.value.releaseCommitSha).toBe(expectedReleaseCommitSha);
    expect(actualManifest.value.cloudArtifactChecksum).toHaveLength(64);
  });

  it('rejects a new artifact whose version differs from the release identifier', () => {
    const manifest = createValidDistributionManifest();
    manifest.artifactVersion = '2026-07-15.2';

    const actualValidation = validateProductionDistributionManifest({
      artifactMetadata: {...createValidArtifactMetadata(), version: '2026-07-15.2'},
      manifest,
      productionTag: expectedProductionTag,
      productionTagCommitSha: expectedReleaseCommitSha,
      sourceRunId: '12345',
    });

    expect(actualValidation.isErr).toBe(true);
  });

  it('rejects a new artifact whose commit differs from the Production tag', () => {
    const actualValidation = validateProductionDistributionManifest({
      artifactMetadata: {
        ...createValidArtifactMetadata(),
        commit: 'fedcba0987654321fedcba0987654321fedcba09',
      },
      manifest: createValidDistributionManifest(),
      productionTag: expectedProductionTag,
      productionTagCommitSha: expectedReleaseCommitSha,
      sourceRunId: '12345',
    });

    expect(actualValidation.isErr).toBe(true);
  });

  it('accepts legacy artifact metadata with matching version and commit', () => {
    const legacyArtifactMetadata = createValidLegacyArtifactMetadata();
    const legacyManifest = {
      ...createValidDistributionManifest(),
      artifactVersion: legacyArtifactMetadata.version,
    };

    const actualValidation = validateProductionDistributionManifest({
      artifactMetadata: legacyArtifactMetadata,
      manifest: legacyManifest,
      productionTag: expectedProductionTag,
      productionTagCommitSha: expectedReleaseCommitSha,
      sourceRunId: '12345',
    });

    expect(actualValidation.isOk).toBe(true);
  });

  it('rejects legacy artifact metadata whose version differs from the manifest', () => {
    const actualValidation = validateProductionDistributionManifest({
      artifactMetadata: createValidLegacyArtifactMetadata(),
      manifest: {...createValidDistributionManifest(), artifactVersion: '2026.07.15.12.01'},
      productionTag: expectedProductionTag,
      productionTagCommitSha: expectedReleaseCommitSha,
      sourceRunId: '12345',
    });

    expect(actualValidation.isErr).toBe(true);
  });

  it('rejects legacy artifact metadata whose commit differs from the Production tag', () => {
    const legacyArtifactMetadata = createValidLegacyArtifactMetadata();
    const actualValidation = validateProductionDistributionManifest({
      artifactMetadata: {
        ...legacyArtifactMetadata,
        commit: 'fedcba0987654321fedcba0987654321fedcba09',
      },
      manifest: {...createValidDistributionManifest(), artifactVersion: legacyArtifactMetadata.version},
      productionTag: expectedProductionTag,
      productionTagCommitSha: expectedReleaseCommitSha,
      sourceRunId: '12345',
    });

    expect(actualValidation.isErr).toBe(true);
  });

  it('rejects legacy artifact metadata without commit metadata', () => {
    const legacyArtifactMetadata = createValidLegacyArtifactMetadata();
    const actualValidation = validateProductionDistributionManifest({
      artifactMetadata: {version: legacyArtifactMetadata.version},
      manifest: {...createValidDistributionManifest(), artifactVersion: legacyArtifactMetadata.version},
      productionTag: expectedProductionTag,
      productionTagCommitSha: expectedReleaseCommitSha,
      sourceRunId: '12345',
    });

    expect(actualValidation.isErr).toBe(true);
  });

  it('rejects artifact metadata with builtAt but no assetVersion', () => {
    const actualValidation = validateProductionDistributionManifest({
      artifactMetadata: {
        version: '2026-07-15.1',
        commit: expectedReleaseCommitSha,
        builtAt: '2026-07-20T06:18:03.123Z',
      },
      manifest: createValidDistributionManifest(),
      productionTag: expectedProductionTag,
      productionTagCommitSha: expectedReleaseCommitSha,
      sourceRunId: '12345',
    });

    expect(actualValidation.isErr).toBe(true);
  });

  it('rejects artifact metadata with assetVersion but no builtAt', () => {
    const actualValidation = validateProductionDistributionManifest({
      artifactMetadata: {
        version: '2026-07-15.1',
        assetVersion: '2026-07-15.1-1234567',
        commit: expectedReleaseCommitSha,
      },
      manifest: createValidDistributionManifest(),
      productionTag: expectedProductionTag,
      productionTagCommitSha: expectedReleaseCommitSha,
      sourceRunId: '12345',
    });

    expect(actualValidation.isErr).toBe(true);
  });

  it('rejects incomplete new artifact metadata instead of treating it as legacy', () => {
    const actualValidation = validateProductionDistributionManifest({
      artifactMetadata: {
        version: '2026-07-15.1',
        commit: expectedReleaseCommitSha,
      },
      manifest: createValidDistributionManifest(),
      productionTag: expectedProductionTag,
      productionTagCommitSha: expectedReleaseCommitSha,
      sourceRunId: '12345',
    });

    expect(actualValidation.isErr).toBe(true);
  });

  it('rejects a manifest for a non-ADR Production tag', () => {
    const actualValidation = validateProductionDistributionManifest({
      artifactMetadata: createValidArtifactMetadata(),
      manifest: createValidDistributionManifest(),
      productionTag: '2026-07-15-production.1',
      productionTagCommitSha: expectedReleaseCommitSha,
      sourceRunId: '12345',
    });

    expect(actualValidation.isErr).toBe(true);
  });

  it('rejects a manifest whose release commit differs from the tag commit', () => {
    const manifest = createValidDistributionManifest();
    manifest.releaseCommitSha = 'fedcba0987654321fedcba0987654321fedcba09';

    const actualValidation = validateProductionDistributionManifest({
      artifactMetadata: createValidArtifactMetadata(),
      manifest,
      productionTag: expectedProductionTag,
      productionTagCommitSha: expectedReleaseCommitSha,
      sourceRunId: '12345',
    });

    expect(actualValidation.isErr).toBe(true);
  });

  it('rejects an empty expected commit when the caller supplies one', () => {
    const actualValidation = validateProductionDistributionManifest({
      artifactMetadata: createValidArtifactMetadata(),
      manifest: createValidDistributionManifest(),
      productionTag: expectedProductionTag,
      productionTagCommitSha: expectedReleaseCommitSha,
      expectedCommitSha: '',
      sourceRunId: '12345',
    });

    expect(actualValidation.isErr).toBe(true);
  });

  it('rejects an expected commit that differs from the Production tag', () => {
    const actualValidation = validateProductionDistributionManifest({
      artifactMetadata: createValidArtifactMetadata(),
      manifest: createValidDistributionManifest(),
      productionTag: expectedProductionTag,
      productionTagCommitSha: expectedReleaseCommitSha,
      expectedCommitSha: 'fedcba0987654321fedcba0987654321fedcba09',
      sourceRunId: '12345',
    });

    expect(actualValidation.isErr).toBe(true);
  });

  it('rejects a manifest from a different source workflow run', () => {
    const actualValidation = validateProductionDistributionManifest({
      artifactMetadata: createValidArtifactMetadata(),
      manifest: createValidDistributionManifest(),
      productionTag: expectedProductionTag,
      productionTagCommitSha: expectedReleaseCommitSha,
      expectedCommitSha: expectedReleaseCommitSha,
      sourceRunId: '67890',
    });

    expect(actualValidation.isErr).toBe(true);
  });

  it('reuses the only Helm chart with the immutable image tag as appVersion', () => {
    const actualSelection = selectHelmChartVersion(
      [
        {version: '0.8.0-pre.3174', appVersion: 'old-image'},
        {version: expectedWireBuildsFields.version, appVersion: expectedWireBuildsFields.appVersion},
      ],
      expectedWireBuildsFields.appVersion,
    );

    assert(actualSelection.isOk);

    expect(actualSelection.value).toEqual({kind: 'reuse', version: expectedWireBuildsFields.version});
  });

  it('requires a fresh Helm chart when no published chart matches', () => {
    const actualSelection = selectHelmChartVersion(
      [{version: '0.8.0-pre.3174', appVersion: 'old-image'}],
      expectedWireBuildsFields.appVersion,
    );

    assert(actualSelection.isOk);

    expect(actualSelection.value).toEqual({kind: 'publish'});
  });

  it('rejects ambiguous Helm publication state', () => {
    const actualSelection = selectHelmChartVersion(
      [
        {version: '0.8.0-pre.3174', appVersion: expectedWireBuildsFields.appVersion},
        {version: '0.8.0-pre.3175', appVersion: expectedWireBuildsFields.appVersion},
      ],
      expectedWireBuildsFields.appVersion,
    );

    expect(actualSelection.isErr).toBe(true);
  });

  it('detects an exact wire-builds idempotent no-op without considering the top-level version', () => {
    const currentBuildJson = {
      version: '1.0.0-154',
      helmCharts: {
        webapp: {
          repo: expectedWireBuildsFields.repo,
          version: expectedWireBuildsFields.version,
          meta: {
            appVersion: expectedWireBuildsFields.appVersion,
            commitURL: expectedWireBuildsFields.commitUrl,
            commit: expectedWireBuildsFields.commit,
          },
        },
        'wire-server': {
          version: '5.34.0',
        },
      },
    };

    const actualIsCurrent = hasExpectedWireBuildsWebappFields(currentBuildJson, expectedWireBuildsFields);

    expect(actualIsCurrent).toBe(true);
  });

  it('rejects a build.json without helmCharts', () => {
    const actualIsCurrent = hasExpectedWireBuildsWebappFields({version: '1.0.0-154'}, expectedWireBuildsFields);

    expect(actualIsCurrent).toBe(false);
  });

  it('rejects a build.json without a WebApp entry', () => {
    const actualIsCurrent = hasExpectedWireBuildsWebappFields(
      {version: '1.0.0-154', helmCharts: {'wire-server': {version: '5.34.0'}}},
      expectedWireBuildsFields,
    );

    expect(actualIsCurrent).toBe(false);
  });

  it('rejects a build.json with incorrect nested WebApp metadata', () => {
    const currentBuildJson = {
      version: '1.0.0-154',
      helmCharts: {
        webapp: {
          repo: expectedWireBuildsFields.repo,
          version: expectedWireBuildsFields.version,
          meta: {
            appVersion: expectedWireBuildsFields.appVersion,
            commitURL: 'https://example.com/commit',
            commit: expectedWireBuildsFields.commit,
          },
        },
        'wire-server': {
          version: '5.34.0',
        },
      },
    };

    const actualIsCurrent = hasExpectedWireBuildsWebappFields(currentBuildJson, expectedWireBuildsFields);

    expect(actualIsCurrent).toBe(false);
  });

  it('allows only the build version and WebApp chart entry to change', () => {
    const currentBuildJson = {
      version: '1.0.0-154',
      helmCharts: {
        webapp: {version: '0.8.0-pre.3174'},
        'wire-server': {version: '5.34.0'},
      },
      metadata: {releaseChannel: 'production'},
    };
    const generatedBuildJson = {
      version: '1.0.0-155',
      helmCharts: {
        webapp: {version: expectedWireBuildsFields.version},
        'wire-server': {version: '5.34.0'},
      },
      metadata: {releaseChannel: 'production'},
    };

    expect(getUnrelatedWireBuildsState(generatedBuildJson)).toBe(getUnrelatedWireBuildsState(currentBuildJson));
  });

  it('detects an unrelated wire-builds change', () => {
    const currentBuildJson = {
      version: '1.0.0-154',
      helmCharts: {
        webapp: {version: '0.8.0-pre.3174'},
        'wire-server': {version: '5.34.0'},
      },
    };
    const generatedBuildJson = {
      version: '1.0.0-155',
      helmCharts: {
        webapp: {version: expectedWireBuildsFields.version},
        'wire-server': {version: '5.34.1'},
      },
    };

    expect(getUnrelatedWireBuildsState(generatedBuildJson)).not.toBe(getUnrelatedWireBuildsState(currentBuildJson));
  });
});
