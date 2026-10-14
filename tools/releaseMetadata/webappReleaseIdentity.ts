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

import {Maybe, maybe, Result} from 'true-myth';

import {validateWebAppVersion} from './webappVersion.ts';
import type {WebAppVersion} from './webappVersion.ts';

export type StableWebAppTagName = `v${WebAppVersion}`;

export type ParsedBetaWebAppTagName = {
  readonly version: WebAppVersion;
  readonly candidateNumber: number;
};

export type ValidateBetaWebAppTagVersionOptions = {
  readonly tagName: string;
  readonly expectedVersion: string;
};

type ParsedExistingBetaTag = {
  readonly tagName: string;
  readonly parseResult: Result<ParsedBetaWebAppTagName, Error>;
};

const stableWebAppTagNamePattern = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/;
const betaWebAppTagNamePattern = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))-beta\.([1-9]\d*)$/;
const webAppReleaseBranchNamePattern = /^release\/(.+)$/;
const betaTagCandidateCaptureIndex = 2;

export function createStableWebAppTagName(version: string): Result<StableWebAppTagName, Error> {
  const versionResult = validateWebAppVersion(version);
  if (versionResult.isErr) {
    return Result.err(new Error(`Cannot create stable WebApp tag: ${versionResult.error.message}`));
  }

  return Result.ok(`v${versionResult.value}` as StableWebAppTagName);
}

export function parseStableWebAppTagName(tagName: string): Result<WebAppVersion, Error> {
  return Maybe.of(stableWebAppTagNamePattern.exec(tagName))
    .andThen(tagNameMatch => {
      return Maybe.of(tagNameMatch.at(1));
    })
    .match({
      Just(versionText) {
        const versionResult = validateWebAppVersion(versionText);
        if (versionResult.isErr) {
          return Result.err(new Error(`Invalid stable WebApp tag name: ${tagName}`, {cause: versionResult.error}));
        }

        return versionResult;
      },
      Nothing() {
        return Result.err(new Error(`Invalid stable WebApp tag name: ${tagName}`));
      },
    });
}

export function createBetaWebAppTagName(version: string, candidateNumber: number): Result<string, Error> {
  const versionResult = validateWebAppVersion(version);
  if (versionResult.isErr) {
    return Result.err(new Error(`Cannot create WebApp Beta tag: ${versionResult.error.message}`));
  }

  if (Number.isSafeInteger(candidateNumber) === false || candidateNumber < 1) {
    return Result.err(new Error('WebApp Beta candidate number must be a positive safe integer'));
  }

  return Result.ok(`v${versionResult.value}-beta.${candidateNumber}`);
}

export function parseBetaWebAppTagName(tagName: string): Result<ParsedBetaWebAppTagName, Error> {
  return Maybe.of(betaWebAppTagNamePattern.exec(tagName))
    .andThen(tagNameMatch => {
      return Maybe.of(tagNameMatch.at(1)).andThen(versionText => {
        return Maybe.of(tagNameMatch.at(betaTagCandidateCaptureIndex)).map(candidateNumberText => {
          return {versionText, candidateNumberText};
        });
      });
    })
    .match({
      Just(parsedBetaTag) {
        const {versionText, candidateNumberText} = parsedBetaTag;
        const versionResult = validateWebAppVersion(versionText);
        if (versionResult.isErr) {
          return Result.err(new Error(`Invalid WebApp Beta tag name: ${tagName}`, {cause: versionResult.error}));
        }

        const candidateNumber = Number(candidateNumberText);
        if (Number.isSafeInteger(candidateNumber) === false || candidateNumber < 1) {
          return Result.err(new Error(`Invalid WebApp Beta candidate number in tag: ${tagName}`));
        }

        return Result.ok(
          Object.freeze({
            version: versionResult.value,
            candidateNumber,
          }),
        );
      },
      Nothing() {
        return Result.err(new Error(`Invalid WebApp Beta tag name: ${tagName}`));
      },
    });
}

export function validateBetaWebAppTagVersion(options: ValidateBetaWebAppTagVersionOptions): Result<string, Error> {
  const {tagName, expectedVersion} = options;
  const betaTagResult = parseBetaWebAppTagName(tagName);
  if (betaTagResult.isErr) {
    return Result.err(betaTagResult.error);
  }

  const expectedVersionResult = validateWebAppVersion(expectedVersion);
  if (expectedVersionResult.isErr) {
    return Result.err(expectedVersionResult.error);
  }

  if (betaTagResult.value.version !== expectedVersionResult.value) {
    return Result.err(
      new Error(
        `WebApp Beta tag ${tagName} belongs to ${betaTagResult.value.version}, expected ${expectedVersionResult.value}`,
      ),
    );
  }

  return Result.ok(tagName);
}

function parseExistingBetaTag(tagName: string): ParsedExistingBetaTag {
  return {tagName, parseResult: parseBetaWebAppTagName(tagName)};
}

function claimsBetaVersion(options: {readonly tagName: string; readonly betaTagPrefix: string}): boolean {
  const {tagName, betaTagPrefix} = options;
  return tagName === betaTagPrefix || tagName.startsWith(`${betaTagPrefix}.`);
}

function isMalformedBetaTagForVersion(options: {
  readonly parsedBetaTag: ParsedExistingBetaTag;
  readonly betaTagPrefix: string;
}): boolean {
  const {parsedBetaTag, betaTagPrefix} = options;
  return parsedBetaTag.parseResult.isErr && claimsBetaVersion({tagName: parsedBetaTag.tagName, betaTagPrefix});
}

function findMalformedBetaTagError(options: {
  readonly version: WebAppVersion;
  readonly parsedExistingBetaTags: readonly ParsedExistingBetaTag[];
}): Maybe<Error> {
  const {version, parsedExistingBetaTags} = options;
  const betaTagPrefix = `v${version}-beta`;
  const malformedBetaTag = maybe.find(parsedBetaTag => {
    return isMalformedBetaTagForVersion({parsedBetaTag, betaTagPrefix});
  }, parsedExistingBetaTags);
  if (malformedBetaTag.isNothing || malformedBetaTag.value.parseResult.isOk) {
    return Maybe.nothing<Error>();
  }

  return Maybe.just(
    new Error(`Invalid WebApp Beta tag for version ${version}: ${malformedBetaTag.value.tagName}`, {
      cause: malformedBetaTag.value.parseResult.error,
    }),
  );
}

function findBetaCandidateNumberForVersion(options: {
  readonly parsedBetaTag: ParsedExistingBetaTag;
  readonly version: WebAppVersion;
}): readonly number[] {
  const {parsedBetaTag, version} = options;
  if (parsedBetaTag.parseResult.isErr || parsedBetaTag.parseResult.value.version !== version) {
    return [];
  }

  return [parsedBetaTag.parseResult.value.candidateNumber];
}

function findMissingBetaCandidateNumber(candidateNumbers: readonly number[]): Maybe<number> {
  return candidateNumbers.reduce<Maybe<number>>((missingCandidateNumber, candidateNumber, candidateIndex) => {
    if (missingCandidateNumber.isJust || candidateNumber === candidateIndex + 1) {
      return missingCandidateNumber;
    }

    return Maybe.just(candidateIndex + 1);
  }, Maybe.nothing<number>());
}

function findBetaCandidateSequenceError(options: {
  readonly version: WebAppVersion;
  readonly candidateNumbers: readonly number[];
}): Maybe<Error> {
  const {version, candidateNumbers} = options;
  if (new Set(candidateNumbers).size !== candidateNumbers.length) {
    return Maybe.just(new Error(`Duplicate WebApp Beta candidate for version ${version}`));
  }

  return findMissingBetaCandidateNumber(candidateNumbers).map(missingCandidateNumber => {
    return new Error(`Missing WebApp Beta candidate v${version}-beta.${missingCandidateNumber}`);
  });
}

export function createNextBetaWebAppTagName(
  version: WebAppVersion,
  existingTagNames: readonly string[],
): Result<string, Error> {
  const parsedExistingBetaTags = existingTagNames.map(parseExistingBetaTag);
  const malformedBetaTagError = findMalformedBetaTagError({version, parsedExistingBetaTags});
  if (malformedBetaTagError.isJust) {
    return Result.err(malformedBetaTagError.value);
  }

  const candidateNumbers = parsedExistingBetaTags
    .flatMap(parsedBetaTag => {
      return findBetaCandidateNumberForVersion({parsedBetaTag, version});
    })
    .toSorted((leftCandidateNumber, rightCandidateNumber) => {
      return leftCandidateNumber - rightCandidateNumber;
    });
  const candidateSequenceError = findBetaCandidateSequenceError({version, candidateNumbers});
  if (candidateSequenceError.isJust) {
    return Result.err(candidateSequenceError.value);
  }

  return createBetaWebAppTagName(version, candidateNumbers.length + 1);
}

export function createWebAppReleaseBranchName(version: string): Result<string, Error> {
  const versionResult = validateWebAppVersion(version);
  if (versionResult.isErr) {
    return Result.err(new Error(`Cannot create WebApp release branch: ${versionResult.error.message}`));
  }

  return Result.ok(`release/${versionResult.value}`);
}

export function parseWebAppReleaseBranchName(branchName: string): Result<WebAppVersion, Error> {
  return Maybe.of(webAppReleaseBranchNamePattern.exec(branchName))
    .andThen(branchNameMatch => {
      return Maybe.of(branchNameMatch.at(1));
    })
    .match({
      Just(versionText) {
        const versionResult = validateWebAppVersion(versionText);
        if (versionResult.isErr) {
          return Result.err(
            new Error(`Invalid WebApp release branch name: ${branchName}`, {cause: versionResult.error}),
          );
        }

        return versionResult;
      },
      Nothing() {
        return Result.err(new Error(`Invalid WebApp release branch name: ${branchName}`));
      },
    });
}
