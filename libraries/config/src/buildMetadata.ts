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
  readonly commit: string;
  readonly builtAt: string;
};

export type BuildMetadataInput = {
  readonly version: string;
  readonly commit: string;
  readonly builtAt: string;
};

const isoUtcTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
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

export function isBuildMetadata(value: unknown): value is BuildMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return is.nonEmptyString(value.version) && is.nonEmptyString(value.commit) && isIsoUtcTimestamp(value.builtAt);
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
    commit: buildMetadataInput.commit,
    builtAt: buildMetadataInput.builtAt,
  };
}

export function getShortCommitSha(commitSha: string): string {
  return commitSha.slice(0, shortCommitShaLength) || 'unknown';
}

export function resolveBuildVersion(explicitVersion: Maybe<string>, commitSha: string): string {
  return explicitVersion.unwrapOr(`dev-${getShortCommitSha(commitSha)}`);
}

export function createAuthoritativeBuildMetadata(
  existingBuildMetadata: Maybe<BuildMetadata>,
  buildMetadataInput: BuildMetadataInput,
): BuildMetadata {
  return existingBuildMetadata.mapOrElse(
    () => {
      return createBuildMetadata(buildMetadataInput);
    },
    currentBuildMetadata => {
      if (
        currentBuildMetadata.version === buildMetadataInput.version &&
        currentBuildMetadata.commit === buildMetadataInput.commit &&
        currentBuildMetadata.builtAt.endsWith('Z')
      ) {
        return currentBuildMetadata;
      }

      return createBuildMetadata(buildMetadataInput);
    },
  );
}
