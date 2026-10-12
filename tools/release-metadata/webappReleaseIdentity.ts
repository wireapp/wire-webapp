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

import {validateWebAppVersion} from './webappVersion.ts';
import type {WebAppVersion} from './webappVersion.ts';

export type ParsedBetaWebAppTagName = {
  readonly version: WebAppVersion;
  readonly candidateNumber: number;
};

const stableWebAppTagNamePattern = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/;
const betaWebAppTagNamePattern = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))-beta\.([1-9]\d*)$/;
const webAppReleaseBranchNamePattern = /^release\/(.+)$/;
const betaTagCandidateCaptureIndex = 2;

export function createStableWebAppTagName(version: string): Result<string, Error> {
  const versionResult = validateWebAppVersion(version);
  if (versionResult.isErr) {
    return Result.err(new Error(`Cannot create stable WebApp tag: ${versionResult.error.message}`));
  }

  return Result.ok(`v${versionResult.value}`);
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
