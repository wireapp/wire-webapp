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

import {Result} from 'true-myth';

import {validateProductionTagName} from './releaseMetadata.ts';
import type {ProductionTagName} from './releaseMetadata.ts';
import {createStableWebAppTagName, parseStableWebAppTagName} from './webappReleaseIdentity.ts';
import type {StableWebAppTagName} from './webappReleaseIdentity.ts';
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

const shortenedCommitIdentifierLength = 7;
// Historical timestamp tags remain readable only for artifact validation in recovery workflows.
const historicalTimestampProductionTagPattern = /^\d{4}-\d{2}-\d{2}-production\.\d+$/;

// Date-based Production tags are accepted only so immutable historical releases remain repairable.
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
