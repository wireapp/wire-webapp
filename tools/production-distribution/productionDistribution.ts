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

import {isNonEmptyString, isPlainObject} from '@sindresorhus/is';
import {Result} from 'true-myth';

import {isBuildMetadata} from '@wireapp/config';
import type {BuildMetadata} from '@wireapp/config';

import {isLegacyTimestampBuildVersion} from '../build-artifact/legacyBuildMetadata.ts';
import {parseWebAppProductionRelease} from '../release-metadata/webappProductionRelease.ts';

export type ProductionDistributionManifest = {
  readonly productionTag: null;
  readonly releaseVersion: string;
  readonly releaseCommitSha: string;
  readonly artifactVersion: string;
  readonly cloudArtifactChecksum: string;
  readonly sourceRunId: string;
  readonly sourceRunAttempt: string;
};

export type DistributionManifestValidationOptions = {
  readonly artifactMetadata: unknown;
  readonly manifest: unknown;
  readonly productionTag: string;
  readonly productionTagCommitSha: string;
  readonly expectedCommitSha?: string;
  readonly sourceRunId: string;
};

export type PublishedHelmChart = {
  readonly version: string;
  readonly appVersion: string;
};

export type HelmChartVersionSelection = {readonly kind: 'reuse'; readonly version: string} | {readonly kind: 'publish'};

export type WireBuildsWebappFields = {
  readonly version: string;
  readonly repo: string;
  readonly appVersion: string;
  readonly commitUrl: string;
  readonly commit: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

function getNonEmptyString(value: unknown): string | undefined {
  if (!isNonEmptyString(value)) {
    return undefined;
  }

  return value;
}

type LegacyProductionDistributionArtifactMetadata = {
  readonly version: string;
  readonly commit: string;
};

function validateProductionDistributionArtifactMetadata(
  artifactMetadata: unknown,
  artifactVersion: string,
  productionBuildVersion: string,
  releaseCommitSha: string,
  acceptsLegacyTimestampBuildMetadata: boolean,
): Result<BuildMetadata | LegacyProductionDistributionArtifactMetadata, Error> {
  if (isBuildMetadata(artifactMetadata)) {
    if (artifactMetadata.version !== artifactVersion) {
      return Result.err(new Error('Distribution artifact version does not match the manifest'));
    }

    if (artifactMetadata.version !== productionBuildVersion) {
      return Result.err(new Error('Distribution artifact version does not match the release version'));
    }

    if (artifactMetadata.commit !== releaseCommitSha) {
      return Result.err(new Error('Distribution artifact commit does not match the Production tag commit'));
    }

    return Result.ok(artifactMetadata);
  }

  if (
    acceptsLegacyTimestampBuildMetadata &&
    isRecord(artifactMetadata) &&
    isNonEmptyString(artifactMetadata.version) &&
    isLegacyTimestampBuildVersion(artifactMetadata.version) &&
    isNonEmptyString(artifactMetadata.commit) &&
    !('assetVersion' in artifactMetadata) &&
    !('builtAt' in artifactMetadata)
  ) {
    if (artifactMetadata.version !== artifactVersion) {
      return Result.err(new Error('Legacy distribution artifact version does not match the manifest'));
    }

    if (artifactMetadata.commit !== releaseCommitSha) {
      return Result.err(new Error('Legacy distribution artifact commit does not match the Production tag commit'));
    }

    return Result.ok({version: artifactMetadata.version, commit: artifactMetadata.commit});
  }

  return Result.err(new Error('Distribution artifact metadata is invalid'));
}

export function validateProductionDistributionManifest(
  options: DistributionManifestValidationOptions,
): Result<ProductionDistributionManifest, Error> {
  const productionReleaseResult = parseWebAppProductionRelease(options.productionTag);

  if (productionReleaseResult.isErr) {
    return Result.err(productionReleaseResult.error);
  }

  if (options.productionTagCommitSha.length === 0) {
    return Result.err(new Error('Production tag commit SHA must not be empty'));
  }

  if (options.expectedCommitSha !== undefined) {
    if (options.expectedCommitSha.length === 0 || options.expectedCommitSha !== options.productionTagCommitSha) {
      return Result.err(new Error('Production tag commit does not match the expected commit SHA'));
    }
  }

  if (!isRecord(options.manifest)) {
    return Result.err(new Error('Distribution manifest must be a JSON object'));
  }

  const productionRelease = productionReleaseResult.value;
  const productionBuildVersion = productionRelease.buildVersion;
  const manifestReleaseVersion = getNonEmptyString(options.manifest.releaseIdentifier);
  const manifestReleaseCommitSha = getNonEmptyString(options.manifest.releaseCommitSha);
  const artifactVersion = getNonEmptyString(options.manifest.artifactVersion);
  const cloudArtifactChecksum = getNonEmptyString(options.manifest.cloudArtifactChecksum);
  const sourceRunId = getNonEmptyString(options.manifest.sourceRunId);
  const sourceRunAttempt = getNonEmptyString(options.manifest.sourceRunAttempt);

  if (options.manifest.productionTag !== null) {
    return Result.err(new Error('Distribution manifest productionTag must be null before publication'));
  }

  if (manifestReleaseVersion !== productionBuildVersion) {
    return Result.err(new Error('Distribution manifest release version does not match the Production tag'));
  }

  if (manifestReleaseCommitSha !== options.productionTagCommitSha) {
    return Result.err(new Error('Distribution manifest release commit does not match the Production tag commit'));
  }

  if (artifactVersion === undefined) {
    return Result.err(new Error('Distribution manifest artifact version must not be empty'));
  }

  const artifactMetadataResult = validateProductionDistributionArtifactMetadata(
    options.artifactMetadata,
    artifactVersion,
    productionBuildVersion,
    options.productionTagCommitSha,
    productionRelease.kind === 'legacy',
  );

  if (artifactMetadataResult.isErr) {
    return Result.err(artifactMetadataResult.error);
  }

  if (cloudArtifactChecksum === undefined) {
    return Result.err(new Error('Distribution manifest cloud artifact checksum must not be empty'));
  }

  if (sourceRunId !== options.sourceRunId) {
    return Result.err(new Error('Distribution manifest source run ID does not match the supplied source run ID'));
  }

  if (sourceRunAttempt === undefined) {
    return Result.err(new Error('Distribution manifest source run attempt must not be empty'));
  }

  return Result.ok({
    productionTag: null,
    releaseVersion: productionBuildVersion,
    releaseCommitSha: options.productionTagCommitSha,
    artifactVersion,
    cloudArtifactChecksum,
    sourceRunId,
    sourceRunAttempt,
  });
}

export function selectHelmChartVersion(
  publishedCharts: readonly PublishedHelmChart[],
  immutableImageTag: string,
): Result<HelmChartVersionSelection, Error> {
  const matchingChartVersions = publishedCharts
    .filter(publishedChart => {
      return publishedChart.appVersion === immutableImageTag;
    })
    .map(publishedChart => {
      return publishedChart.version;
    });

  if (matchingChartVersions.length > 1) {
    return Result.err(new Error(`More than one Helm chart matches image tag ${immutableImageTag}`));
  }

  if (matchingChartVersions.length === 1) {
    return Result.ok({kind: 'reuse', version: matchingChartVersions[0]});
  }

  return Result.ok({kind: 'publish'});
}

export function hasExpectedWireBuildsWebappFields(buildJson: unknown, expectedFields: WireBuildsWebappFields): boolean {
  if (!isRecord(buildJson) || !isRecord(buildJson.helmCharts)) {
    return false;
  }

  const webappEntry = buildJson.helmCharts.webapp;

  if (!isRecord(webappEntry) || !isRecord(webappEntry.meta)) {
    return false;
  }

  return (
    webappEntry.repo === expectedFields.repo &&
    webappEntry.version === expectedFields.version &&
    webappEntry.meta.appVersion === expectedFields.appVersion &&
    webappEntry.meta.commitURL === expectedFields.commitUrl &&
    webappEntry.meta.commit === expectedFields.commit
  );
}
