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

import {selectPrecedingProductionTag, validateProductionTagName} from './releaseMetadata.ts';
import type {ProductionTagName} from './releaseMetadata.ts';
import {createStableWebAppTagName, parseStableWebAppTagName} from './webappReleaseIdentity.ts';
import type {StableWebAppTagName} from './webappReleaseIdentity.ts';
import {compareWebAppVersions} from './webappVersion.ts';
import type {WebAppVersion} from './webappVersion.ts';

export type LegacyProductionTagName = ProductionTagName;
export type WebAppProductionTagName = LegacyProductionTagName | StableWebAppTagName;

export type WebAppProductionRelease =
  | {
      readonly kind: 'legacy';
      readonly tagName: LegacyProductionTagName;
      readonly buildVersion: string;
    }
  | {
      readonly kind: 'semver';
      readonly tagName: StableWebAppTagName;
      readonly version: WebAppVersion;
      readonly buildVersion: WebAppVersion;
    };

type StableSemVerProductionRelease = Extract<WebAppProductionRelease, {readonly kind: 'semver'}>;

const shortenedCommitIdentifierLength = 7;
const historicalTimestampProductionTagPattern = /^\d{4}-\d{2}-\d{2}-production\.\d+$/;

export function parseWebAppProductionRelease(tagName: string): Result<WebAppProductionRelease, Error> {
  const legacyProductionTagResult = validateProductionTagName(tagName);
  if (legacyProductionTagResult.isOk) {
    return Result.ok(
      Object.freeze({
        kind: 'legacy',
        tagName: legacyProductionTagResult.value,
        buildVersion: tagName.slice(0, -'-production'.length),
      }),
    );
  }

  const stableVersionResult = parseStableWebAppTagName(tagName);
  if (stableVersionResult.isErr) {
    if (tagName.startsWith('v')) {
      return Result.err(
        new Error(`Invalid stable WebApp Production tag: ${tagName}`, {cause: stableVersionResult.error}),
      );
    }

    return Result.err(legacyProductionTagResult.error);
  }

  const stableTagNameResult = createStableWebAppTagName(stableVersionResult.value);
  if (stableTagNameResult.isErr) {
    return Result.err(stableTagNameResult.error);
  }

  return Result.ok(
    Object.freeze({
      kind: 'semver',
      tagName: stableTagNameResult.value,
      version: stableVersionResult.value,
      buildVersion: stableVersionResult.value,
    }),
  );
}

export function validateWebAppProductionTagName(tagName: string): Result<WebAppProductionTagName, Error> {
  const productionReleaseResult = parseWebAppProductionRelease(tagName);
  if (productionReleaseResult.isErr) {
    return Result.err(productionReleaseResult.error);
  }

  return Result.ok(productionReleaseResult.value.tagName);
}

export function resolveWebappBuildVersion(
  buildReferenceName: string,
  commitSha: string,
  buildChannel: string,
): Result<string, Error> {
  if (buildChannel !== 'main' && buildChannel !== 'development' && buildChannel !== 'production') {
    return Result.err(new Error(`Invalid webapp build channel: ${buildChannel}`));
  }

  if (buildReferenceName.length === 0) {
    if (buildChannel === 'production') {
      return Result.err(new Error('A production webapp build requires a production tag name'));
    }

    const versionPrefix = buildChannel === 'main' ? 'main' : 'dev';
    return Result.ok(`${versionPrefix}-${commitSha.slice(0, shortenedCommitIdentifierLength) || 'unknown'}`);
  }

  const productionReleaseResult = parseWebAppProductionRelease(buildReferenceName);
  if (productionReleaseResult.isOk) {
    return Result.ok(productionReleaseResult.value.buildVersion);
  }

  if (historicalTimestampProductionTagPattern.test(buildReferenceName)) {
    return Result.ok(buildReferenceName);
  }

  if (buildChannel === 'production' || buildReferenceName.includes('production')) {
    return Result.err(new Error(`Invalid production tag name: ${buildReferenceName}`));
  }

  return Result.ok(`dev-${commitSha.slice(0, shortenedCommitIdentifierLength) || 'unknown'}`);
}

export function selectPrecedingWebAppProductionTag(
  currentProductionTagName: string,
  existingTagNames: readonly string[],
): Result<Maybe<WebAppProductionTagName>, Error> {
  const currentProductionReleaseResult = parseWebAppProductionRelease(currentProductionTagName);
  if (currentProductionReleaseResult.isErr) {
    return Result.err(currentProductionReleaseResult.error);
  }

  const currentProductionRelease = currentProductionReleaseResult.value;
  if (currentProductionRelease.kind === 'legacy') {
    const precedingLegacyTagResult = selectPrecedingProductionTag(currentProductionRelease.tagName, existingTagNames);
    if (precedingLegacyTagResult.isErr) {
      return Result.err(precedingLegacyTagResult.error);
    }

    return Result.ok(
      precedingLegacyTagResult.value.map(precedingLegacyTagName => {
        return precedingLegacyTagName as WebAppProductionTagName;
      }),
    );
  }

  let precedingStableReleaseMaybe: Maybe<StableSemVerProductionRelease> = Maybe.nothing();
  let newerStableReleaseMaybe: Maybe<StableSemVerProductionRelease> = Maybe.nothing();

  for (const existingTagName of existingTagNames) {
    const existingStableVersionResult = parseStableWebAppTagName(existingTagName);
    if (existingStableVersionResult.isErr) {
      continue;
    }

    const existingStableTagNameResult = createStableWebAppTagName(existingStableVersionResult.value);
    if (existingStableTagNameResult.isErr) {
      return Result.err(existingStableTagNameResult.error);
    }

    const existingStableRelease: StableSemVerProductionRelease = {
      kind: 'semver',
      tagName: existingStableTagNameResult.value,
      version: existingStableVersionResult.value,
      buildVersion: existingStableVersionResult.value,
    };
    const comparisonToCurrentResult = compareWebAppVersions(
      existingStableRelease.version,
      currentProductionRelease.version,
    );

    if (comparisonToCurrentResult.isErr) {
      return Result.err(comparisonToCurrentResult.error);
    }

    if (comparisonToCurrentResult.value < 0) {
      if (precedingStableReleaseMaybe.isNothing) {
        precedingStableReleaseMaybe = Maybe.just(existingStableRelease);
        continue;
      }

      const comparisonToPrecedingResult = compareWebAppVersions(
        existingStableRelease.version,
        precedingStableReleaseMaybe.value.version,
      );
      if (comparisonToPrecedingResult.isErr) {
        return Result.err(comparisonToPrecedingResult.error);
      }

      if (comparisonToPrecedingResult.value > 0) {
        precedingStableReleaseMaybe = Maybe.just(existingStableRelease);
      }

      continue;
    }

    if (comparisonToCurrentResult.value > 0) {
      if (newerStableReleaseMaybe.isNothing) {
        newerStableReleaseMaybe = Maybe.just(existingStableRelease);
        continue;
      }

      const comparisonToNewerResult = compareWebAppVersions(
        existingStableRelease.version,
        newerStableReleaseMaybe.value.version,
      );
      if (comparisonToNewerResult.isErr) {
        return Result.err(comparisonToNewerResult.error);
      }

      if (comparisonToNewerResult.value < 0) {
        newerStableReleaseMaybe = Maybe.just(existingStableRelease);
      }
    }
  }

  if (newerStableReleaseMaybe.isJust) {
    return Result.err(
      new Error(
        `Cannot select a preceding tag because a newer stable WebApp Production tag exists: ${newerStableReleaseMaybe.value.tagName}`,
      ),
    );
  }

  return Result.ok(
    precedingStableReleaseMaybe.map(precedingStableRelease => {
      return precedingStableRelease.tagName;
    }),
  );
}
