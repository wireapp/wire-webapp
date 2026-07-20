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

import type {BuildMetadata} from '@wireapp/config';

export type BuildMetadataFileDependencies = {
  readonly readFile: (metadataFilePath: string) => string;
};

const unknownBuildMetadata: BuildMetadata = {
  version: 'dev-unknown',
  commit: 'unknown',
  builtAt: '1970-01-01T00:00:00.000Z',
};

const isoUtcTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isIsoUtcTimestamp(value: unknown): value is string {
  if (!is.nonEmptyString(value) || !isoUtcTimestampPattern.test(value)) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function isBuildMetadata(value: unknown): value is BuildMetadata {
  if (!is.plainObject(value)) {
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

function readSerializedBuildMetadata(
  metadataFilePath: string,
  dependencies: BuildMetadataFileDependencies,
): Maybe<string> {
  try {
    return Maybe.just(dependencies.readFile(metadataFilePath));
  } catch {
    return Maybe.nothing();
  }
}

export function loadBuildMetadata(
  metadataFilePath: string,
  dependencies: BuildMetadataFileDependencies,
): BuildMetadata {
  return readSerializedBuildMetadata(metadataFilePath, dependencies)
    .andThen(parseBuildMetadata)
    .unwrapOr(unknownBuildMetadata);
}
