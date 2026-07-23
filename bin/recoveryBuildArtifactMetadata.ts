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

import {isLegacyTimestampBuildVersion} from './legacyBuildMetadata.ts';
import {validateBuildArtifactMetadata} from './buildArtifactMetadata.ts';
import type {BuildArtifactHtmlDocument} from './buildArtifactMetadata.ts';

export type LegacyBuildMetadata = {
  readonly version: string;
  readonly commit: string;
};

export type RecoverableBuildMetadata =
  | {
      readonly kind: 'current';
      readonly metadata: BuildMetadata;
    }
  | {
      readonly kind: 'legacy';
      readonly metadata: LegacyBuildMetadata;
    };

export type RecoveryBuildArtifactMetadataValidationInput = {
  readonly expectedCommit: string;
  readonly expectedVersion: string;
  readonly htmlDocuments: readonly BuildArtifactHtmlDocument[];
  readonly metadata: unknown;
};

const fullCommitShaPattern = /^[0-9a-f]{40}$/iu;

function isRecord(value: unknown): value is Record<string, unknown> {
  return is.plainObject(value);
}

function hasCurrentMetadataField(metadata: Record<string, unknown>): boolean {
  return 'assetVersion' in metadata || 'builtAt' in metadata;
}

function hasExactlyLegacyMetadataFields(metadata: Record<string, unknown>): boolean {
  const metadataFieldNames = Object.keys(metadata).sort();

  return metadataFieldNames.length === 2 && metadataFieldNames[0] === 'commit' && metadataFieldNames[1] === 'version';
}

function isFullCommitSha(value: unknown): value is string {
  return is.nonEmptyString(value) && fullCommitShaPattern.test(value);
}

function validateCurrentBuildArtifactMetadata(
  input: RecoveryBuildArtifactMetadataValidationInput,
): Result<RecoverableBuildMetadata, Error> {
  const validationResult = validateBuildArtifactMetadata(input);

  if (validationResult.isErr) {
    return Result.err(validationResult.error);
  }

  return Result.ok({kind: 'current', metadata: validationResult.value});
}

function validateLegacyBuildArtifactMetadata(
  input: RecoveryBuildArtifactMetadataValidationInput,
  metadata: Record<string, unknown>,
): Result<RecoverableBuildMetadata, Error> {
  if (!hasExactlyLegacyMetadataFields(metadata)) {
    return Result.err(new Error('Build artifact metadata is invalid'));
  }

  const version = metadata.version;
  const commit = metadata.commit;

  if (!isLegacyTimestampBuildVersion(version) || !isFullCommitSha(commit)) {
    return Result.err(new Error('Legacy build artifact metadata is invalid'));
  }

  if (commit !== input.expectedCommit) {
    return Result.err(
      new Error(`Legacy build artifact commit '${commit}' does not match expected commit '${input.expectedCommit}'`),
    );
  }

  if (isLegacyTimestampBuildVersion(input.expectedVersion) && version !== input.expectedVersion) {
    return Result.err(
      new Error(
        `Legacy build artifact version '${version}' does not match expected version '${input.expectedVersion}'`,
      ),
    );
  }

  return Result.ok({kind: 'legacy', metadata: {version, commit}});
}

export function validateRecoveryBuildArtifactMetadata(
  input: RecoveryBuildArtifactMetadataValidationInput,
): Result<RecoverableBuildMetadata, Error> {
  if (isBuildMetadata(input.metadata)) {
    return validateCurrentBuildArtifactMetadata(input);
  }

  if (!isRecord(input.metadata)) {
    return Result.err(new Error('Build artifact metadata is invalid'));
  }

  if (hasCurrentMetadataField(input.metadata)) {
    return validateCurrentBuildArtifactMetadata(input);
  }

  return validateLegacyBuildArtifactMetadata(input, input.metadata);
}
