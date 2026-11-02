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

import {validateMaintenanceLineKey, validateMaintenanceTagName} from '../releaseMetadata/releaseMetadata.ts';
import type {MaintenanceLineKey, MaintenanceTagName} from '../releaseMetadata/releaseMetadata.ts';

export type MaintenanceDistributionManifest = {
  readonly maintenanceTag: MaintenanceTagName;
  readonly maintenanceLineKey: MaintenanceLineKey;
  readonly distributionArtifactName: string;
  readonly maintenanceCommitSha: string;
  readonly artifactVersion: string;
  readonly artifactCommitSha: string;
  readonly ebsArtifactChecksum: string;
  readonly dockerContextArchiveChecksum: string;
  readonly sourceWorkflowRunId: string;
};

export type ValidateMaintenanceDistributionManifestOptions = {
  readonly manifest: unknown;
  readonly artifactMetadata: unknown;
  readonly expectedMaintenanceTag: string;
  readonly expectedDistributionArtifactName: string;
  readonly expectedMaintenanceCommitSha: string;
  readonly expectedSourceWorkflowRunId: string;
  readonly expectedEbsArtifactChecksum: string;
  readonly expectedDockerContextArchiveChecksum: string;
};

const legacyWebappChartRepository = 'https://s3-eu-west-1.amazonaws.com/public.wire.com/charts-webapp';
const wireBuildsVersionPattern =
  /^[vV]?(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-((0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(\.(0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*))?$/u;
const sha256Pattern = /^[0-9a-f]{64}$/iu;
const fullCommitShaPattern = /^[0-9a-f]{40}$/iu;
const workflowRunIdPattern = /^[1-9]\d*$/u;
const maintenanceTagNumberSuffixPattern = /-maintenance\.[1-9]\d*$/u;
const distributionArtifactAttemptPattern = /^[1-9]\d*$/u;

export function validateMaintenanceWireBuildsBranch(branchName: string): Result<string, Error> {
  if (!isNonEmptyString(branchName)) {
    return Result.err(new Error('A wire-builds customer release branch must be provided'));
  }

  if (branchName === 'main' || branchName === 'dev') {
    return Result.err(new Error(`Maintenance distribution cannot update wire-builds/${branchName}`));
  }

  return Result.ok(branchName);
}

export function validateMaintenanceWireBuildsMetadata(buildJson: unknown): Result<void, Error> {
  if (!isPlainObject(buildJson)) {
    return Result.err(new Error('wire-builds build.json must be a JSON object'));
  }

  const wireBuildsVersionIsCompatible =
    typeof buildJson.version === 'string' && wireBuildsVersionPattern.test(buildJson.version);

  if (!wireBuildsVersionIsCompatible) {
    return Result.err(
      new Error('wire-builds build.json version must be a SemVer version supported by bump-prerelease'),
    );
  }

  if (!isPlainObject(buildJson.helmCharts) || !isPlainObject(buildJson.helmCharts.webapp)) {
    return Result.err(new Error('wire-builds build.json must contain a WebApp Helm chart entry'));
  }

  const webappChart = buildJson.helmCharts.webapp;

  if (webappChart.repo !== legacyWebappChartRepository) {
    return Result.err(
      new Error(`wire-builds WebApp chart must use the legacy S3 Helm repository: ${legacyWebappChartRepository}`),
    );
  }

  const webappMetadataContainsDigest = isPlainObject(webappChart.meta) && 'digest' in webappChart.meta;

  if (webappMetadataContainsDigest) {
    return Result.err(
      new Error('wire-builds WebApp chart digest metadata cannot be replaced by the legacy S3 updater'),
    );
  }

  return Result.ok(undefined);
}

export function maintenanceLineKeyFromTag(maintenanceTag: string): Result<MaintenanceLineKey, Error> {
  const maintenanceTagResult = validateMaintenanceTagName(maintenanceTag);

  if (maintenanceTagResult.isErr) {
    return Result.err(maintenanceTagResult.error);
  }

  const maintenanceLineKey = maintenanceTag.replace(maintenanceTagNumberSuffixPattern, '');

  return validateMaintenanceLineKey(maintenanceLineKey);
}

export function validateMaintenanceDistributionArtifactName(
  distributionArtifactName: string,
  maintenanceTag: string,
): Result<string, Error> {
  const maintenanceTagResult = validateMaintenanceTagName(maintenanceTag);

  if (maintenanceTagResult.isErr) {
    return Result.err(maintenanceTagResult.error);
  }

  const expectedArtifactPrefix = `maintenance-distribution-${maintenanceTagResult.value}-`;

  if (!distributionArtifactName.startsWith(expectedArtifactPrefix)) {
    return Result.err(new Error('Maintenance distribution artifact name does not match its immutable tag'));
  }

  const artifactAttempt = distributionArtifactName.slice(expectedArtifactPrefix.length);
  const artifactAttemptMatchesPattern = distributionArtifactAttemptPattern.test(artifactAttempt);

  if (!artifactAttemptMatchesPattern) {
    return Result.err(new Error('Maintenance distribution artifact name must include a positive workflow attempt'));
  }

  return Result.ok(distributionArtifactName);
}

function readNonEmptyMaintenanceManifestProperty(
  manifestObject: Record<string, unknown>,
  propertyName: string,
): string | undefined {
  const propertyValue = manifestObject[propertyName];

  if (!isNonEmptyString(propertyValue)) {
    return undefined;
  }

  return propertyValue;
}

export function validateMaintenanceDistributionManifest(
  options: ValidateMaintenanceDistributionManifestOptions,
): Result<MaintenanceDistributionManifest, Error> {
  const maintenanceTagResult = validateMaintenanceTagName(options.expectedMaintenanceTag);

  if (maintenanceTagResult.isErr) {
    return Result.err(maintenanceTagResult.error);
  }

  const maintenanceLineKeyResult = maintenanceLineKeyFromTag(maintenanceTagResult.value);

  if (maintenanceLineKeyResult.isErr) {
    return Result.err(maintenanceLineKeyResult.error);
  }

  if (!isPlainObject(options.manifest)) {
    return Result.err(new Error('Maintenance distribution manifest must be a JSON object'));
  }

  if (!isPlainObject(options.artifactMetadata)) {
    return Result.err(new Error('Maintenance Docker context build metadata must be a JSON object'));
  }

  const manifest = options.manifest;
  const artifactMetadata = options.artifactMetadata;
  const manifestMaintenanceTag = readNonEmptyMaintenanceManifestProperty(manifest, 'maintenanceTag');
  const manifestMaintenanceLineKey = readNonEmptyMaintenanceManifestProperty(manifest, 'maintenanceLineKey');
  const manifestDistributionArtifactName = readNonEmptyMaintenanceManifestProperty(
    manifest,
    'distributionArtifactName',
  );
  const maintenanceCommitSha = readNonEmptyMaintenanceManifestProperty(manifest, 'maintenanceCommitSha');
  const artifactVersion = readNonEmptyMaintenanceManifestProperty(manifest, 'artifactVersion');
  const artifactCommitSha = readNonEmptyMaintenanceManifestProperty(manifest, 'artifactCommitSha');
  const ebsArtifactChecksum = readNonEmptyMaintenanceManifestProperty(manifest, 'ebsArtifactChecksum');
  const dockerContextArchiveChecksum = readNonEmptyMaintenanceManifestProperty(
    manifest,
    'dockerContextArchiveChecksum',
  );
  const sourceWorkflowRunId = readNonEmptyMaintenanceManifestProperty(manifest, 'sourceWorkflowRunId');
  const expectedMaintenanceCommitShaIsValid = fullCommitShaPattern.test(options.expectedMaintenanceCommitSha);
  const expectedSourceWorkflowRunIdIsValid = workflowRunIdPattern.test(options.expectedSourceWorkflowRunId);

  if (manifestMaintenanceTag !== maintenanceTagResult.value) {
    return Result.err(new Error('Maintenance distribution manifest tag does not match the requested tag'));
  }

  if (manifestMaintenanceLineKey !== maintenanceLineKeyResult.value) {
    return Result.err(new Error('Maintenance distribution manifest line key does not match the maintenance tag'));
  }

  const validatedDistributionArtifactName = validateMaintenanceDistributionArtifactName(
    options.expectedDistributionArtifactName,
    maintenanceTagResult.value,
  );

  if (validatedDistributionArtifactName.isErr) {
    return Result.err(validatedDistributionArtifactName.error);
  }

  if (manifestDistributionArtifactName !== validatedDistributionArtifactName.value) {
    return Result.err(new Error('Maintenance distribution manifest artifact name does not match its source run'));
  }

  if (!expectedMaintenanceCommitShaIsValid || maintenanceCommitSha !== options.expectedMaintenanceCommitSha) {
    return Result.err(new Error('Maintenance distribution manifest commit does not match the immutable tag'));
  }

  if (artifactVersion !== maintenanceTagResult.value || artifactMetadata.version !== maintenanceTagResult.value) {
    return Result.err(new Error('Maintenance distribution artifact version does not match the immutable tag'));
  }

  if (
    artifactCommitSha !== options.expectedMaintenanceCommitSha ||
    artifactMetadata.commit !== options.expectedMaintenanceCommitSha
  ) {
    return Result.err(new Error('Maintenance distribution artifact commit does not match the immutable tag'));
  }

  const ebsArtifactChecksumIsValid = sha256Pattern.test(ebsArtifactChecksum ?? '');

  if (!ebsArtifactChecksumIsValid || ebsArtifactChecksum !== options.expectedEbsArtifactChecksum) {
    return Result.err(new Error('Maintenance EBS artifact checksum does not match its validated identity'));
  }

  const dockerContextArchiveChecksumIsValid = sha256Pattern.test(dockerContextArchiveChecksum ?? '');

  if (
    !dockerContextArchiveChecksumIsValid ||
    dockerContextArchiveChecksum !== options.expectedDockerContextArchiveChecksum
  ) {
    return Result.err(new Error('Maintenance Docker context checksum does not match its immutable tag metadata'));
  }

  if (!expectedSourceWorkflowRunIdIsValid || sourceWorkflowRunId !== options.expectedSourceWorkflowRunId) {
    return Result.err(new Error('Maintenance distribution artifact does not belong to the tagged source workflow run'));
  }

  return Result.ok({
    maintenanceTag: maintenanceTagResult.value,
    maintenanceLineKey: maintenanceLineKeyResult.value,
    distributionArtifactName: validatedDistributionArtifactName.value,
    maintenanceCommitSha,
    artifactVersion,
    artifactCommitSha,
    ebsArtifactChecksum,
    dockerContextArchiveChecksum,
    sourceWorkflowRunId,
  });
}
