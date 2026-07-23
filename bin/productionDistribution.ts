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

import is from '@sindresorhus/is';
import {Result} from 'true-myth';

import {isBuildMetadata} from '@wireapp/config';
import type {BuildMetadata} from '@wireapp/config';

import {isLegacyTimestampBuildVersion} from './legacyBuildMetadata';
import {validateProductionTagName} from './releaseMetadata';

export type ProductionDistributionManifest = {
  readonly productionTag: null;
  readonly releaseIdentifier: string;
  readonly releaseCommitSha: string;
  readonly artifactVersion: string;
  readonly cloudArtifactChecksum: string;
  readonly sourceRunId: string;
  readonly sourceRunAttempt: string;
};

export type DistributionManifestValidationParameters = {
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
  return is.plainObject(value);
}

function getNonEmptyString(value: unknown): string | undefined {
  if (!is.nonEmptyString(value)) {
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
  releaseIdentifier: string,
  releaseCommitSha: string,
): Result<BuildMetadata | LegacyProductionDistributionArtifactMetadata, Error> {
  if (isBuildMetadata(artifactMetadata)) {
    if (artifactMetadata.version !== artifactVersion) {
      return Result.err(new Error('Distribution artifact version does not match the manifest'));
    }

    if (artifactMetadata.version !== releaseIdentifier) {
      return Result.err(new Error('Distribution artifact version does not match the release identifier'));
    }

    if (artifactMetadata.commit !== releaseCommitSha) {
      return Result.err(new Error('Distribution artifact commit does not match the Production tag commit'));
    }

    return Result.ok(artifactMetadata);
  }

  if (
    isRecord(artifactMetadata) &&
    is.nonEmptyString(artifactMetadata.version) &&
    isLegacyTimestampBuildVersion(artifactMetadata.version) &&
    is.nonEmptyString(artifactMetadata.commit) &&
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
  parameters: DistributionManifestValidationParameters,
): Result<ProductionDistributionManifest, Error> {
  const productionTagResult = validateProductionTagName(parameters.productionTag);

  if (productionTagResult.isErr) {
    return Result.err(productionTagResult.error);
  }

  if (parameters.productionTagCommitSha.length === 0) {
    return Result.err(new Error('Production tag commit SHA must not be empty'));
  }

  if (parameters.expectedCommitSha !== undefined) {
    if (
      parameters.expectedCommitSha.length === 0 ||
      parameters.expectedCommitSha !== parameters.productionTagCommitSha
    ) {
      return Result.err(new Error('Production tag commit does not match the expected commit SHA'));
    }
  }

  if (!isRecord(parameters.manifest)) {
    return Result.err(new Error('Distribution manifest must be a JSON object'));
  }

  const releaseIdentifier = productionTagResult.value.replace(/-production$/, '');
  const manifestReleaseIdentifier = getNonEmptyString(parameters.manifest.releaseIdentifier);
  const manifestReleaseCommitSha = getNonEmptyString(parameters.manifest.releaseCommitSha);
  const artifactVersion = getNonEmptyString(parameters.manifest.artifactVersion);
  const cloudArtifactChecksum = getNonEmptyString(parameters.manifest.cloudArtifactChecksum);
  const sourceRunId = getNonEmptyString(parameters.manifest.sourceRunId);
  const sourceRunAttempt = getNonEmptyString(parameters.manifest.sourceRunAttempt);

  if (parameters.manifest.productionTag !== null) {
    return Result.err(new Error('Distribution manifest productionTag must be null before publication'));
  }

  if (manifestReleaseIdentifier !== releaseIdentifier) {
    return Result.err(new Error('Distribution manifest release identifier does not match the Production tag'));
  }

  if (manifestReleaseCommitSha !== parameters.productionTagCommitSha) {
    return Result.err(new Error('Distribution manifest release commit does not match the Production tag commit'));
  }

  if (artifactVersion === undefined) {
    return Result.err(new Error('Distribution manifest artifact version must not be empty'));
  }

  const artifactMetadataResult = validateProductionDistributionArtifactMetadata(
    parameters.artifactMetadata,
    artifactVersion,
    releaseIdentifier,
    parameters.productionTagCommitSha,
  );

  if (artifactMetadataResult.isErr) {
    return Result.err(artifactMetadataResult.error);
  }

  if (cloudArtifactChecksum === undefined) {
    return Result.err(new Error('Distribution manifest cloud artifact checksum must not be empty'));
  }

  if (sourceRunId !== parameters.sourceRunId) {
    return Result.err(new Error('Distribution manifest source run ID does not match the supplied source run ID'));
  }

  if (sourceRunAttempt === undefined) {
    return Result.err(new Error('Distribution manifest source run attempt must not be empty'));
  }

  return Result.ok({
    productionTag: null,
    releaseIdentifier,
    releaseCommitSha: parameters.productionTagCommitSha,
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
    .map(publishedChart => publishedChart.version);

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
