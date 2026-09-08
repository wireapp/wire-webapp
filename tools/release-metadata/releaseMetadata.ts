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

import {isUndefined} from '@sindresorhus/is';
import {Maybe, maybe, Result} from 'true-myth';
import type {NonEmptyString} from 'type-fest';

declare const commitHashBrand: unique symbol;

type NonZeroDecimalDigit = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export type ReleaseIdentifier =
  NonEmptyString<`${number}${number}${number}${number}-${number}${number}-${number}${number}.${NonZeroDecimalDigit}${string}`>;
export type ReleaseBranchName = NonEmptyString<`release/${ReleaseIdentifier}`>;
export type BetaTagName = NonEmptyString<`${ReleaseIdentifier}-beta.${number}`>;
export type ProductionTagName = NonEmptyString<`${ReleaseIdentifier}-production`>;
export type MaintenanceLineKey = NonEmptyString<`${ReleaseIdentifier}-${string}`>;
export type MaintenanceBranchName = NonEmptyString<`maintenance/${MaintenanceLineKey}`>;
export type MaintenanceTagName = NonEmptyString<`${MaintenanceLineKey}-maintenance.${number}`>;
export type ReleaseTagName = BetaTagName | ProductionTagName;
export type CommitHash = string & {readonly [commitHashBrand]: 'CommitHash'};
export type WebappBuildChannel = 'main' | 'development' | 'production';

export type ReleaseTagMetadata = {
  readonly commitHash: CommitHash;
  readonly tagName: ReleaseTagName;
};

export type ProductionTagPointsToCommitParameters = {
  readonly currentCommitHash: CommitHash;
  readonly releaseIdentifier: ReleaseIdentifier;
  readonly releaseTagMetadata: readonly ReleaseTagMetadata[];
};

type ParsedProductionTag = {
  readonly tagName: ProductionTagName;
  readonly releaseIdentifier: ReleaseIdentifier;
};

const releaseDatePattern = String.raw`\d{4}-\d{2}-\d{2}`;
const releaseIdentifierPattern = String.raw`${releaseDatePattern}\.[1-9]\d*`;
const releaseBranchNamePattern = new RegExp(`^release/(${releaseIdentifierPattern})$`);
const productionTagNamePattern = new RegExp(`^(${releaseIdentifierPattern})-production$`);
const legacyProductionTagNamePattern = new RegExp(String.raw`^${releaseDatePattern}-production\.\d+$`);
const maintenanceLineKeyPattern = new RegExp(String.raw`^${releaseIdentifierPattern}-[a-z0-9]+(?:-[a-z0-9]+)*$`);
const maintenanceBranchNamePattern = new RegExp(
  String.raw`^maintenance/${releaseIdentifierPattern}-[a-z0-9]+(?:-[a-z0-9]+)*$`,
);
const maintenanceTagNamePattern = new RegExp(
  String.raw`^${releaseIdentifierPattern}-[a-z0-9]+(?:-[a-z0-9]+)*-maintenance\.[1-9]\d*$`,
);
const productionTagSuffix = '-production';
const releaseDateLength = 10;
const releaseSequenceStartIndex = 11;

function isWebappBuildChannel(value: string): value is WebappBuildChannel {
  return value === 'main' || value === 'development' || value === 'production';
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function validateReleaseIdentifier(releaseIdentifier: string): Result<ReleaseIdentifier, Error> {
  const releaseIdentifierMatches = new RegExp(`^${releaseIdentifierPattern}$`).test(releaseIdentifier);

  if (!releaseIdentifierMatches) {
    return Result.err(new Error(`Invalid release identifier: ${releaseIdentifier}`));
  }

  return Result.ok(releaseIdentifier as ReleaseIdentifier);
}

function isMaintenanceLineKey(value: string): value is MaintenanceLineKey {
  return maintenanceLineKeyPattern.test(value);
}

function isMaintenanceBranchName(value: string): value is MaintenanceBranchName {
  return maintenanceBranchNamePattern.test(value);
}

function isMaintenanceTagName(value: string): value is MaintenanceTagName {
  return maintenanceTagNamePattern.test(value);
}

export function isReleaseBranchName(branchName: string): boolean {
  return releaseBranchNamePattern.test(branchName);
}

export function extractReleaseIdentifierFromBranchName(branchName: string): Result<ReleaseIdentifier, Error> {
  const branchNameMatch = releaseBranchNamePattern.exec(branchName);

  if (branchNameMatch === null) {
    return Result.err(new Error(`Invalid release branch name: ${branchName}`));
  }

  return Result.ok(branchNameMatch[1] as ReleaseIdentifier);
}

export function createReleaseBranchName(releaseIdentifier: string): Result<ReleaseBranchName, Error> {
  const releaseIdentifierResult = validateReleaseIdentifier(releaseIdentifier);

  if (releaseIdentifierResult.isErr) {
    return Result.err(releaseIdentifierResult.error);
  }

  return Result.ok(`release/${releaseIdentifierResult.value}` as ReleaseBranchName);
}

export function createProductionTagName(releaseIdentifier: string): Result<ProductionTagName, Error> {
  const releaseIdentifierResult = validateReleaseIdentifier(releaseIdentifier);

  if (releaseIdentifierResult.isErr) {
    return Result.err(releaseIdentifierResult.error);
  }

  return Result.ok(`${releaseIdentifierResult.value}-production` as ProductionTagName);
}

export function validateProductionTagName(productionTagName: string): Result<ProductionTagName, Error> {
  const productionTagNameMatches = productionTagNamePattern.test(productionTagName);

  if (!productionTagNameMatches) {
    return Result.err(new Error(`Invalid production tag name: ${productionTagName}`));
  }

  return Result.ok(productionTagName as ProductionTagName);
}

function parseProductionTag(productionTagName: string): Result<ParsedProductionTag, Error> {
  const validatedProductionTagNameResult = validateProductionTagName(productionTagName);

  if (validatedProductionTagNameResult.isErr) {
    return Result.err(validatedProductionTagNameResult.error);
  }

  const validatedProductionTagName = validatedProductionTagNameResult.value;

  return Result.ok({
    tagName: validatedProductionTagName,
    releaseIdentifier: validatedProductionTagName.slice(0, -productionTagSuffix.length) as ReleaseIdentifier,
  });
}

function compareReleaseIdentifiers(leftReleaseIdentifier: string, rightReleaseIdentifier: string): number {
  const leftReleaseDate = leftReleaseIdentifier.slice(0, releaseDateLength);
  const rightReleaseDate = rightReleaseIdentifier.slice(0, releaseDateLength);

  if (leftReleaseDate < rightReleaseDate) {
    return -1;
  }

  if (leftReleaseDate > rightReleaseDate) {
    return 1;
  }

  const leftReleaseSequence = BigInt(leftReleaseIdentifier.slice(releaseSequenceStartIndex));
  const rightReleaseSequence = BigInt(rightReleaseIdentifier.slice(releaseSequenceStartIndex));

  if (leftReleaseSequence < rightReleaseSequence) {
    return -1;
  }

  if (leftReleaseSequence > rightReleaseSequence) {
    return 1;
  }

  return 0;
}

export function selectPrecedingProductionTag(
  currentProductionTagName: string,
  existingTagNames: readonly string[],
): Result<Maybe<ProductionTagName>, Error> {
  const currentProductionTagResult = parseProductionTag(currentProductionTagName);

  if (currentProductionTagResult.isErr) {
    return Result.err(currentProductionTagResult.error);
  }

  const currentProductionTag = currentProductionTagResult.value;
  const validProductionTags = existingTagNames.flatMap(existingTagName => {
    const parsedProductionTagResult = parseProductionTag(existingTagName);

    if (parsedProductionTagResult.isErr) {
      return [];
    }

    return [parsedProductionTagResult.value];
  });
  const laterProductionTags = validProductionTags
    .filter(productionTag => {
      return compareReleaseIdentifiers(productionTag.releaseIdentifier, currentProductionTag.releaseIdentifier) > 0;
    })
    .toSorted((leftProductionTag, rightProductionTag) => {
      return compareReleaseIdentifiers(leftProductionTag.releaseIdentifier, rightProductionTag.releaseIdentifier);
    });

  const laterProductionTag = laterProductionTags[0];

  if (isUndefined(laterProductionTag) === false) {
    return Result.err(
      new Error(
        `Cannot select a preceding Production tag because a newer ADR Production tag exists: ${laterProductionTag.tagName}`,
      ),
    );
  }

  const precedingProductionTags = validProductionTags.filter(productionTag => {
    return compareReleaseIdentifiers(productionTag.releaseIdentifier, currentProductionTag.releaseIdentifier) < 0;
  });
  const precedingProductionTag = precedingProductionTags.toSorted((leftProductionTag, rightProductionTag) => {
    return compareReleaseIdentifiers(leftProductionTag.releaseIdentifier, rightProductionTag.releaseIdentifier);
  })[precedingProductionTags.length - 1];

  if (isUndefined(precedingProductionTag)) {
    return Result.ok(Maybe.nothing<ProductionTagName>());
  }

  return Result.ok(Maybe.just(precedingProductionTag.tagName));
}

export function validateMaintenanceLineKey(maintenanceLineKey: string): Result<MaintenanceLineKey, Error> {
  if (!isMaintenanceLineKey(maintenanceLineKey)) {
    return Result.err(new Error(`Invalid maintenance line key: ${maintenanceLineKey}`));
  }

  return Result.ok(maintenanceLineKey);
}

export function createMaintenanceBranchName(maintenanceLineKey: string): Result<MaintenanceBranchName, Error> {
  const maintenanceLineKeyResult = validateMaintenanceLineKey(maintenanceLineKey);

  if (maintenanceLineKeyResult.isErr) {
    return Result.err(maintenanceLineKeyResult.error);
  }

  return validateMaintenanceBranchName(`maintenance/${maintenanceLineKeyResult.value}`);
}

export function validateMaintenanceBranchName(maintenanceBranchName: string): Result<MaintenanceBranchName, Error> {
  if (!isMaintenanceBranchName(maintenanceBranchName)) {
    return Result.err(new Error(`Invalid maintenance branch name: ${maintenanceBranchName}`));
  }

  return Result.ok(maintenanceBranchName);
}

export function validateMaintenanceTagName(maintenanceTagName: string): Result<MaintenanceTagName, Error> {
  if (!isMaintenanceTagName(maintenanceTagName)) {
    return Result.err(new Error(`Invalid maintenance tag name: ${maintenanceTagName}`));
  }

  return Result.ok(maintenanceTagName);
}

export function createNextMaintenanceTagName(
  maintenanceLineKey: string,
  existingTagNames: readonly string[],
): Result<MaintenanceTagName, Error> {
  const maintenanceLineKeyResult = validateMaintenanceLineKey(maintenanceLineKey);

  if (maintenanceLineKeyResult.isErr) {
    return Result.err(maintenanceLineKeyResult.error);
  }

  const escapedMaintenanceLineKey = escapeRegularExpression(maintenanceLineKeyResult.value);
  const maintenanceTagPattern = new RegExp(String.raw`^${escapedMaintenanceLineKey}-maintenance\.([1-9]\d*)$`);
  const existingMaintenanceTagNumbers = existingTagNames.flatMap(existingTagName => {
    const existingTagNameMatch = maintenanceTagPattern.exec(existingTagName);

    if (existingTagNameMatch === null) {
      return [];
    }

    return [Number(existingTagNameMatch[1])];
  });
  const latestMaintenanceTagNumber =
    existingMaintenanceTagNumbers.length > 0 ? Math.max(...existingMaintenanceTagNumbers) : 0;
  const nextMaintenanceTagNumber = latestMaintenanceTagNumber + 1;

  return validateMaintenanceTagName(`${maintenanceLineKeyResult.value}-maintenance.${nextMaintenanceTagNumber}`);
}

export function validateMaintenanceSource(
  maintenanceLineKey: string,
  sourceProductionTag: string,
): Result<ProductionTagName, Error> {
  const maintenanceLineKeyResult = validateMaintenanceLineKey(maintenanceLineKey);

  if (maintenanceLineKeyResult.isErr) {
    return Result.err(maintenanceLineKeyResult.error);
  }

  const sourceProductionTagResult = validateProductionTagName(sourceProductionTag);

  if (sourceProductionTagResult.isErr) {
    return Result.err(sourceProductionTagResult.error);
  }

  const releaseIdentifierEndIndex = maintenanceLineKeyResult.value.indexOf(
    '-',
    maintenanceLineKeyResult.value.indexOf('.') + 1,
  );
  const releaseIdentifier = maintenanceLineKeyResult.value.slice(0, releaseIdentifierEndIndex);
  const expectedSourceProductionTag = `${releaseIdentifier}-production`;

  if (sourceProductionTagResult.value !== expectedSourceProductionTag) {
    return Result.err(
      new Error(
        `Source production tag ${sourceProductionTag} does not belong to maintenance line ${maintenanceLineKey}`,
      ),
    );
  }

  return Result.ok(sourceProductionTagResult.value);
}

export function resolveWebappBuildVersion(
  buildReferenceName: string,
  commitSha: string,
  buildChannel: string,
): Result<string, Error> {
  if (!isWebappBuildChannel(buildChannel)) {
    return Result.err(new Error(`Invalid webapp build channel: ${buildChannel}`));
  }

  if (buildReferenceName.length === 0) {
    if (buildChannel === 'production') {
      return Result.err(new Error('A production webapp build requires a production tag name'));
    }

    const versionPrefix = buildChannel === 'main' ? 'main' : 'dev';
    return Result.ok(`${versionPrefix}-${commitSha.slice(0, 7) || 'unknown'}`);
  }

  const productionTagNameMatch = productionTagNamePattern.exec(buildReferenceName);

  if (productionTagNameMatch !== null) {
    return Result.ok(productionTagNameMatch[1]);
  }

  if (legacyProductionTagNamePattern.test(buildReferenceName)) {
    return Result.ok(buildReferenceName);
  }

  if (buildChannel === 'production' || buildReferenceName.includes('production')) {
    return Result.err(new Error(`Invalid production tag name: ${buildReferenceName}`));
  }

  return Result.ok(`dev-${commitSha.slice(0, 7) || 'unknown'}`);
}

export function createNextBetaTagName(
  releaseIdentifier: string,
  existingTagNames: readonly string[],
): Result<BetaTagName, Error> {
  const releaseIdentifierResult = validateReleaseIdentifier(releaseIdentifier);

  if (releaseIdentifierResult.isErr) {
    return Result.err(releaseIdentifierResult.error);
  }

  const escapedReleaseIdentifier = escapeRegularExpression(releaseIdentifierResult.value);
  const betaTagNamePattern = new RegExp(String.raw`^${escapedReleaseIdentifier}-beta\.(\d+)$`);
  const existingBetaTagNumbers = existingTagNames.flatMap(existingTagName => {
    const existingTagNameMatch = betaTagNamePattern.exec(existingTagName);

    if (existingTagNameMatch === null) {
      return [];
    }

    return [Number(existingTagNameMatch[1])];
  });
  const latestBetaTagNumber = existingBetaTagNumbers.length > 0 ? Math.max(...existingBetaTagNumbers) : 0;
  const nextBetaTagNumber = latestBetaTagNumber + 1;

  return Result.ok(`${releaseIdentifierResult.value}-beta.${nextBetaTagNumber}` as BetaTagName);
}

export function productionTagExists(
  releaseIdentifier: string,
  existingTagNames: readonly string[],
): Result<boolean, Error> {
  const productionTagNameResult = createProductionTagName(releaseIdentifier);

  if (productionTagNameResult.isErr) {
    return Result.err(productionTagNameResult.error);
  }

  return Result.ok(existingTagNames.includes(productionTagNameResult.value));
}

export function productionTagPointsToCommit(parameters: ProductionTagPointsToCommitParameters): Result<boolean, Error> {
  const productionTagNameResult = createProductionTagName(parameters.releaseIdentifier);

  if (productionTagNameResult.isErr) {
    return Result.err(productionTagNameResult.error);
  }

  const productionTagMetadata = maybe.find(tagMetadata => {
    return tagMetadata.tagName === productionTagNameResult.value;
  }, parameters.releaseTagMetadata);

  if (productionTagMetadata.isNothing) {
    return Result.ok(false);
  }

  return Result.ok(productionTagMetadata.value.commitHash === parameters.currentCommitHash);
}
