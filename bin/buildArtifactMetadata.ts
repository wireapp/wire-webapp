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

const localStaticAssetDirectoryNames = ['assets', 'audio', 'ext', 'font', 'image', 'min', 'proto', 'style', 'worker'];

function readHtmlResourceAttributeValues(htmlContents: string): readonly string[] {
  return [...htmlContents.matchAll(/\b(?:src|href)\s*=\s*(["'])(.*?)\1/giu)].flatMap(attributeMatch => {
    return Maybe.of(attributeMatch[2])
      .map(attributeValue => [attributeValue])
      .unwrapOr([]);
  });
}

function isLocalStaticAssetUrl(resourceUrl: string): boolean {
  const normalizedResourceUrl = resourceUrl.toLowerCase();

  if (
    normalizedResourceUrl.startsWith('//') ||
    normalizedResourceUrl.startsWith('#') ||
    /^[a-z][a-z\d+.-]*:/u.test(normalizedResourceUrl)
  ) {
    return false;
  }

  const queryDelimiterIndex = resourceUrl.indexOf('?');
  const assetPath = queryDelimiterIndex === -1 ? resourceUrl : resourceUrl.slice(0, queryDelimiterIndex);
  const normalizedAssetPath = assetPath.replace(/^(?:(?:\.\.?\/)|\/)+/u, '');

  return localStaticAssetDirectoryNames.some(directoryName => {
    return normalizedAssetPath.startsWith(`${directoryName}/`);
  });
}

function readCacheBustingValue(resourceUrl: string): Maybe<string> {
  if (!isLocalStaticAssetUrl(resourceUrl)) {
    return Maybe.nothing();
  }

  const queryDelimiterIndex = resourceUrl.indexOf('?');

  if (queryDelimiterIndex === -1) {
    return Maybe.nothing();
  }

  const queryWithOptionalFragment = resourceUrl.slice(queryDelimiterIndex + 1);
  const fragmentDelimiterIndex = queryWithOptionalFragment.indexOf('#');
  const query =
    fragmentDelimiterIndex === -1
      ? queryWithOptionalFragment
      : queryWithOptionalFragment.slice(0, fragmentDelimiterIndex);

  if (query.startsWith('v=')) {
    return Maybe.of(new URLSearchParams(query).get('v')).andThen(cacheBustingValue => {
      return cacheBustingValue.length > 0 ? Maybe.just(cacheBustingValue) : Maybe.nothing();
    });
  }

  if (query.length > 0 && !query.includes('=') && !query.includes('&')) {
    return Maybe.just(query);
  }

  return Maybe.nothing();
}

function readCacheBustingValues(htmlContents: string): readonly string[] {
  return readHtmlResourceAttributeValues(htmlContents).flatMap(resourceUrl => {
    return readCacheBustingValue(resourceUrl)
      .map(cacheBustingValue => [cacheBustingValue])
      .unwrapOr([]);
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
