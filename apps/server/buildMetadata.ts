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

import {Maybe, Result} from 'true-myth';

import {isBuildMetadata, parseBuildMetadata as parseAuthoritativeBuildMetadata} from '@wireapp/config';
import type {BuildMetadata} from '@wireapp/config';

export type BuildMetadataFileDependencies = {
  readonly readFile: (metadataFilePath: string) => string;
};

export function parseBuildMetadata(serializedBuildMetadata: string): Maybe<BuildMetadata> {
  return parseAuthoritativeBuildMetadata(serializedBuildMetadata);
}

function readBuildMetadataFile(
  metadataFilePath: string,
  dependencies: BuildMetadataFileDependencies,
): Result<string, Error> {
  try {
    return Result.ok(dependencies.readFile(metadataFilePath));
  } catch (error: unknown) {
    return Result.err(new Error(`Unable to read build metadata file '${metadataFilePath}'`, {cause: error}));
  }
}

function parseLoadedBuildMetadata(
  metadataFilePath: string,
  serializedBuildMetadata: string,
): Result<BuildMetadata, Error> {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(serializedBuildMetadata);
  } catch (error: unknown) {
    return Result.err(new Error(`Build metadata file '${metadataFilePath}' contains malformed JSON`, {cause: error}));
  }

  if (!isBuildMetadata(parsedValue)) {
    return Result.err(new Error(`Build metadata file '${metadataFilePath}' has an invalid structure`));
  }

  return Result.ok(parsedValue);
}

export function loadBuildMetadata(
  metadataFilePath: string,
  dependencies: BuildMetadataFileDependencies,
): Result<BuildMetadata, Error> {
  return readBuildMetadataFile(metadataFilePath, dependencies).andThen(serializedBuildMetadata => {
    return parseLoadedBuildMetadata(metadataFilePath, serializedBuildMetadata);
  });
}
