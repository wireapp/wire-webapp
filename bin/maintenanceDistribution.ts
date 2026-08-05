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

import {
  extractMaintenanceLineKeyFromBranchName,
  extractMaintenanceTagNameMetadata,
  validateMaintenanceBranchName,
  validateMaintenanceLineKey,
  validateMaintenanceSourceProductionTag,
  validateMaintenanceTagName,
  validateProductionTagName,
} from './releaseMetadata';
import type {MaintenanceBranchName, MaintenanceLineKey, MaintenanceTagName, ProductionTagName} from './releaseMetadata';

export type MaintenanceDistributionManifest = {
  readonly maintenanceLineKey: MaintenanceLineKey;
  readonly maintenanceBranch: MaintenanceBranchName;
  readonly sourceProductionTag: ProductionTagName;
  readonly sourceProductionCommitSha: string;
  readonly maintenanceCommitSha: string;
  readonly maintenanceTag: MaintenanceTagName;
  readonly artifactVersion: string;
  readonly artifactChecksum: string;
  readonly workflowRunId: string;
  readonly workflowRunAttempt: string;
};

export type MaintenanceDistributionManifestValidationParameters = {
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

function isSha256Checksum(value: string): boolean {
  return /^[a-f0-9]{64}$/u.test(value);
}

export function validateMaintenanceDistributionManifest(
  parameters: MaintenanceDistributionManifestValidationParameters,
): Result<MaintenanceDistributionManifest, Error> {
  const maintenanceLineKeyResult = validateMaintenanceLineKey(parameters.maintenanceLineKey);

  if (maintenanceLineKeyResult.isErr) {
    return Result.err(maintenanceLineKeyResult.error);
  }

  const maintenanceBranchResult = validateMaintenanceBranchName(parameters.maintenanceBranch);

  if (maintenanceBranchResult.isErr) {
    return Result.err(maintenanceBranchResult.error);
  }

  const branchLineKeyResult = extractMaintenanceLineKeyFromBranchName(maintenanceBranchResult.value);

  if (branchLineKeyResult.isErr || branchLineKeyResult.value !== maintenanceLineKeyResult.value) {
    return Result.err(new Error('Maintenance distribution branch does not match the maintenance line key'));
  }

  const sourceProductionTagResult = validateMaintenanceSourceProductionTag(
    maintenanceLineKeyResult.value,
    parameters.sourceProductionTag,
  );

  if (sourceProductionTagResult.isErr) {
    return Result.err(sourceProductionTagResult.error);
  }

  const sourceProductionTagNameResult = validateProductionTagName(parameters.sourceProductionTag);

  if (sourceProductionTagNameResult.isErr) {
    return Result.err(sourceProductionTagNameResult.error);
  }

  const maintenanceTagResult = validateMaintenanceTagName(parameters.maintenanceTag);

  if (maintenanceTagResult.isErr) {
    return Result.err(maintenanceTagResult.error);
  }

  const maintenanceTagMetadataResult = extractMaintenanceTagNameMetadata(maintenanceTagResult.value);

  if (
    maintenanceTagMetadataResult.isErr ||
    maintenanceTagMetadataResult.value.lineKey !== maintenanceLineKeyResult.value
  ) {
    return Result.err(new Error('Maintenance distribution tag does not match the maintenance line key'));
  }

  if (parameters.sourceProductionCommitSha.length === 0) {
    return Result.err(new Error('Source Production commit SHA must not be empty'));
  }

  if (parameters.maintenanceCommitSha.length === 0) {
    return Result.err(new Error('Maintenance commit SHA must not be empty'));
  }

  if (parameters.workflowRunId.length === 0) {
    return Result.err(new Error('Workflow run ID must not be empty'));
  }

  if (parameters.workflowRunAttempt.length === 0) {
    return Result.err(new Error('Workflow run attempt must not be empty'));
  }

  if (!isRecord(parameters.manifest)) {
    return Result.err(new Error('Maintenance distribution manifest must be a JSON object'));
  }

  const manifestMaintenanceLineKey = getNonEmptyString(parameters.manifest.maintenanceLineKey);
  const manifestMaintenanceBranch = getNonEmptyString(parameters.manifest.maintenanceBranch);
  const manifestSourceProductionTag = getNonEmptyString(parameters.manifest.sourceProductionTag);
  const manifestSourceProductionCommitSha = getNonEmptyString(parameters.manifest.sourceProductionCommitSha);
  const manifestMaintenanceCommitSha = getNonEmptyString(parameters.manifest.maintenanceCommitSha);
  const manifestMaintenanceTag = getNonEmptyString(parameters.manifest.maintenanceTag);
  const manifestArtifactVersion = getNonEmptyString(parameters.manifest.artifactVersion);
  const manifestArtifactChecksum = getNonEmptyString(parameters.manifest.artifactChecksum);
  const manifestWorkflowRunId = getNonEmptyString(parameters.manifest.workflowRunId);
  const manifestWorkflowRunAttempt = getNonEmptyString(parameters.manifest.workflowRunAttempt);

  if (manifestMaintenanceLineKey !== maintenanceLineKeyResult.value) {
    return Result.err(new Error('Maintenance distribution manifest line key does not match the request'));
  }

  if (manifestMaintenanceBranch !== maintenanceBranchResult.value) {
    return Result.err(new Error('Maintenance distribution manifest branch does not match the request'));
  }

  if (manifestSourceProductionTag !== sourceProductionTagNameResult.value) {
    return Result.err(new Error('Maintenance distribution manifest source Production tag does not match the request'));
  }

  if (manifestSourceProductionCommitSha !== parameters.sourceProductionCommitSha) {
    return Result.err(
      new Error('Maintenance distribution manifest source Production commit does not match the request'),
    );
  }

  if (manifestMaintenanceCommitSha !== parameters.maintenanceCommitSha) {
    return Result.err(new Error('Maintenance distribution manifest commit does not match the request'));
  }

  if (manifestMaintenanceTag !== maintenanceTagResult.value) {
    return Result.err(new Error('Maintenance distribution manifest tag does not match the request'));
  }

  if (manifestArtifactVersion !== maintenanceTagResult.value) {
    return Result.err(new Error('Maintenance distribution artifact version does not match the maintenance tag'));
  }

  if (manifestArtifactChecksum === undefined || !isSha256Checksum(manifestArtifactChecksum)) {
    return Result.err(new Error('Maintenance distribution artifact checksum is invalid'));
  }

  if (manifestWorkflowRunId !== parameters.workflowRunId) {
    return Result.err(new Error('Maintenance distribution manifest workflow run ID does not match the request'));
  }

  if (manifestWorkflowRunAttempt !== parameters.workflowRunAttempt) {
    return Result.err(new Error('Maintenance distribution manifest workflow run attempt does not match the request'));
  }

  if (!isBuildMetadata(parameters.artifactMetadata)) {
    return Result.err(new Error('Maintenance distribution artifact metadata is invalid'));
  }

  const artifactMetadata: BuildMetadata = parameters.artifactMetadata;

  if (artifactMetadata.version !== maintenanceTagResult.value) {
    return Result.err(
      new Error('Maintenance distribution artifact metadata version does not match the maintenance tag'),
    );
  }

  if (artifactMetadata.commit !== parameters.maintenanceCommitSha) {
    return Result.err(
      new Error('Maintenance distribution artifact metadata commit does not match the maintenance commit'),
    );
  }

  return Result.ok({
    maintenanceLineKey: maintenanceLineKeyResult.value,
    maintenanceBranch: maintenanceBranchResult.value,
    sourceProductionTag: sourceProductionTagNameResult.value,
    sourceProductionCommitSha: parameters.sourceProductionCommitSha,
    maintenanceCommitSha: parameters.maintenanceCommitSha,
    maintenanceTag: maintenanceTagResult.value,
    artifactVersion: maintenanceTagResult.value,
    artifactChecksum: manifestArtifactChecksum,
    workflowRunId: parameters.workflowRunId,
    workflowRunAttempt: parameters.workflowRunAttempt,
  });
}
