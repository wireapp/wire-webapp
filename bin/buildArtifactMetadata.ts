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

import {isBuildMetadata} from '@wireapp/config';
import type {BuildMetadata} from '@wireapp/config';

export type BuildArtifactHtmlDocument = {
  readonly archiveFilePath: string;
  readonly contents: string;
};

export type BuildArtifactMetadataValidationInput = {
  readonly expectedCommit: string;
  readonly expectedVersion: string;
  readonly htmlDocuments: readonly BuildArtifactHtmlDocument[];
  readonly metadata: unknown;
};

function readCacheBustingValues(htmlContents: string): readonly string[] {
  return [...htmlContents.matchAll(/(?:\?|&)v=([^"'&\s]+)|\?([^"'&\s]+)/g)].flatMap(cacheBustingMatch => {
    const cacheBustingValue = Maybe.of(cacheBustingMatch[1]).orElse(() => Maybe.of(cacheBustingMatch[2]));

    return cacheBustingValue.map(value => [value]).unwrapOr([]);
  });
}

function containsExpectedMetadata(htmlDocument: BuildArtifactHtmlDocument, metadata: BuildMetadata): boolean {
  const cacheBustingValues = readCacheBustingValues(htmlDocument.contents);

  return (
    htmlDocument.contents.includes(`<!--! ${metadata.version} -->`) &&
    cacheBustingValues.length > 0 &&
    cacheBustingValues.every(cacheBustingValue => cacheBustingValue === metadata.assetVersion)
  );
}

export function validateBuildArtifactMetadata(
  input: BuildArtifactMetadataValidationInput,
): Result<BuildMetadata, Error> {
  if (!isBuildMetadata(input.metadata)) {
    return Result.err(new Error('Build artifact metadata is invalid'));
  }

  if (input.metadata.version !== input.expectedVersion) {
    return Result.err(
      new Error(
        `Build artifact version '${input.metadata.version}' does not match expected version '${input.expectedVersion}'`,
      ),
    );
  }

  if (input.metadata.commit !== input.expectedCommit) {
    return Result.err(
      new Error(
        `Build artifact commit '${input.metadata.commit}' does not match expected commit '${input.expectedCommit}'`,
      ),
    );
  }

  if (input.htmlDocuments.length === 0) {
    return Result.err(new Error('Build artifact does not contain generated HTML'));
  }

  for (const htmlDocument of input.htmlDocuments) {
    if (!containsExpectedMetadata(htmlDocument, input.metadata)) {
      return Result.err(new Error(`Generated HTML '${htmlDocument.archiveFilePath}' does not use artifact metadata`));
    }
  }

  return Result.ok(input.metadata);
}
