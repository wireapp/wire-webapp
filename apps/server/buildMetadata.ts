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

import {Maybe} from 'true-myth';

import {parseBuildMetadata as parseAuthoritativeBuildMetadata} from '@wireapp/config';
import type {BuildMetadata} from '@wireapp/config';

export type BuildMetadataFileDependencies = {
  readonly readFile: (metadataFilePath: string) => string;
};

const unknownBuildMetadata: BuildMetadata = {
  version: 'dev-unknown',
  commit: 'unknown',
  builtAt: '1970-01-01T00:00:00.000Z',
};

export function parseBuildMetadata(serializedBuildMetadata: string): Maybe<BuildMetadata> {
  return parseAuthoritativeBuildMetadata(serializedBuildMetadata);
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
    .andThen(parseAuthoritativeBuildMetadata)
    .unwrapOr(unknownBuildMetadata);
}
