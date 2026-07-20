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
import {Maybe} from 'true-myth';

export type BuildMetadata = {
  readonly version: string;
  readonly assetVersion: string;
  readonly commit: string;
  readonly builtAt: string;
};

export type BuildMetadataInput = {
  readonly version: string;
  readonly commit: string;
  readonly builtAt: string;
};

const isoUtcTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const legacyTimestampVersionPattern = /^\d{4}(?:\.\d{2}){4,5}$/;
const safeAssetVersionPattern = /^[A-Za-z0-9._~-]+$/;
const shortCommitShaLength = 7;

function isRecord(value: unknown): value is Record<string, unknown> {
  return is.plainObject(value);
}

function isIsoUtcTimestamp(value: unknown): value is string {
  if (!is.nonEmptyString(value) || !isoUtcTimestampPattern.test(value)) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function isSafeAssetVersion(value: unknown): value is string {
  return is.nonEmptyString(value) && safeAssetVersionPattern.test(value);
}

function isLogicalBuildVersion(value: unknown): value is string {
  return is.nonEmptyString(value) && isSafeAssetVersion(value) && !legacyTimestampVersionPattern.test(value);
}

export function isBuildMetadata(value: unknown): value is BuildMetadata {
  if (!isRecord(value) || !isBuildMetadataInputRecord(value) || !isSafeAssetVersion(value.assetVersion)) {
    return false;
  }

  return value.assetVersion === resolveAssetVersion(value.version, value.commit);
}

export function isBuildMetadataInput(value: unknown): value is BuildMetadataInput {
  return isRecord(value) && isBuildMetadataInputRecord(value);
}

function isBuildMetadataInputRecord(
  value: Record<string, unknown>,
): value is Record<string, unknown> & BuildMetadataInput {
  return isLogicalBuildVersion(value.version) && is.nonEmptyString(value.commit) && isIsoUtcTimestamp(value.builtAt);
}

export function parseBuildMetadata(serializedBuildMetadata: string): Maybe<BuildMetadata> {
  try {
    const parsedBuildMetadata: unknown = JSON.parse(serializedBuildMetadata);

    return isBuildMetadata(parsedBuildMetadata) ? Maybe.just(parsedBuildMetadata) : Maybe.nothing();
  } catch {
    return Maybe.nothing();
  }
}

export function createBuildMetadata(buildMetadataInput: BuildMetadataInput): BuildMetadata {
  return {
    version: buildMetadataInput.version,
    assetVersion: resolveAssetVersion(buildMetadataInput.version, buildMetadataInput.commit),
    commit: buildMetadataInput.commit,
    builtAt: buildMetadataInput.builtAt,
  };
}

export function resolveAssetVersion(version: string, commitSha: string): string {
  const shortCommitSha = getShortCommitSha(commitSha);

  if (version === `main-${shortCommitSha}` || version === `dev-${shortCommitSha}`) {
    return version;
  }

  return `${version}-${shortCommitSha}`;
}

export function getShortCommitSha(commitSha: string): string {
  return commitSha.slice(0, shortCommitShaLength) || 'unknown';
}

export function resolveBuildVersion(explicitVersion: Maybe<string>, commitSha: string): string {
  return explicitVersion.unwrapOr(`dev-${getShortCommitSha(commitSha)}`);
}
