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

import {maybe, Result} from 'true-myth';
import type {NonEmptyString} from 'type-fest';

declare const commitHashBrand: unique symbol;

type NonZeroDecimalDigit = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export type ReleaseIdentifier =
  NonEmptyString<`${number}${number}${number}${number}-${number}${number}-${number}${number}.${NonZeroDecimalDigit}${string}`>;
export type ReleaseBranchName = NonEmptyString<`release/${ReleaseIdentifier}`>;
export type BetaTagName = NonEmptyString<`${ReleaseIdentifier}-beta.${number}`>;
export type ProductionTagName = NonEmptyString<`${ReleaseIdentifier}-production`>;
export type ReleaseTagName = BetaTagName | ProductionTagName;
export type CommitHash = string & {readonly [commitHashBrand]: 'CommitHash'};

export type ReleaseTagMetadata = {
  readonly commitHash: CommitHash;
  readonly tagName: ReleaseTagName;
};

export type ProductionTagPointsToCommitParameters = {
  readonly currentCommitHash: CommitHash;
  readonly releaseIdentifier: ReleaseIdentifier;
  readonly releaseTagMetadata: readonly ReleaseTagMetadata[];
};

const releaseIdentifierPattern = String.raw`\d{4}-\d{2}-\d{2}\.[1-9]\d*`;
const releaseBranchNamePattern = new RegExp(`^release/(${releaseIdentifierPattern})$`);
const productionTagNamePattern = new RegExp(`^(${releaseIdentifierPattern})-production$`);

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
