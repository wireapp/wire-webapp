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

import {Maybe, Result, Task, task} from 'true-myth';

import type {ExecuteWebAppReleaseGitCommand} from './webappReleaseHistoryGit.ts';
import {parseBetaWebAppTagName, parseStableWebAppTagName} from './webappReleaseIdentity.ts';
import type {WebAppVersion} from './webappVersion.ts';
import {compareWebAppVersions} from './webappVersion.ts';

export type StableWebAppRelease = {
  readonly version: WebAppVersion;
  readonly tagName: string;
  readonly commitSha: string;
};

export type DiscoverStableWebAppReleasesOptions = {
  readonly executeGitCommand: ExecuteWebAppReleaseGitCommand;
};

export type SelectLatestStableWebAppReleaseOptions = {
  readonly stableReleases: readonly StableWebAppRelease[];
};

type ReadStableWebAppTagOptions = {
  readonly executeGitCommand: ExecuteWebAppReleaseGitCommand;
  readonly tagName: string;
};

type ExecuteGitCommandOptions = {
  readonly executeGitCommand: ExecuteWebAppReleaseGitCommand;
  readonly commandArguments: readonly string[];
};

const fullCommitShaPattern = /^[0-9a-f]{40}$/i;
const intendedWebAppTagPrefixPattern = /^v\d/;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function executeGitCommand(options: ExecuteGitCommandOptions): Task<string, Error> {
  const {executeGitCommand: runGitCommand, commandArguments} = options;

  return task.tryOrElse(
    (error: unknown): Error => {
      return new Error(`Git command failed: git ${commandArguments.join(' ')}: ${errorMessage(error)}`, {
        cause: error,
      });
    },
    async (): Promise<string> => {
      return runGitCommand(commandArguments);
    },
  );
}

function classifyWebAppTagName(tagName: string): Result<Maybe<WebAppVersion>, Error> {
  const stableVersionResult = parseStableWebAppTagName(tagName);
  if (stableVersionResult.isOk) {
    return Result.ok(Maybe.just(stableVersionResult.value));
  }

  const betaTagResult = parseBetaWebAppTagName(tagName);
  if (betaTagResult.isOk) {
    return Result.ok(Maybe.nothing<WebAppVersion>());
  }

  if (intendedWebAppTagPrefixPattern.test(tagName)) {
    return Result.err(new Error(`Malformed WebApp SemVer tag found in Git history: ${tagName}`));
  }

  return Result.ok(Maybe.nothing<WebAppVersion>());
}

function readStableWebAppTag(options: ReadStableWebAppTagOptions): Task<StableWebAppRelease, Error> {
  const {executeGitCommand: runGitCommand, tagName} = options;
  return executeGitCommand({
    executeGitCommand: runGitCommand,
    commandArguments: ['cat-file', '-t', `refs/tags/${tagName}`],
  })
    .mapRejected(error => {
      return new Error(`Unable to inspect stable WebApp tag ${tagName}: ${error.message}`, {cause: error});
    })
    .andThen(tagObjectType => {
      if (tagObjectType.trim() !== 'tag') {
        return Task.reject<StableWebAppRelease, Error>(new Error(`Stable WebApp tag must be annotated: ${tagName}`));
      }

      return executeGitCommand({
        executeGitCommand: runGitCommand,
        commandArguments: ['rev-parse', '--verify', '--end-of-options', `refs/tags/${tagName}^{commit}`],
      })
        .mapRejected(error => {
          return new Error(`Stable WebApp tag does not resolve to a commit: ${tagName}`, {cause: error});
        })
        .andThen(commitOutput => {
          const commitSha = commitOutput.trim();
          if (fullCommitShaPattern.test(commitSha) === false) {
            return Task.reject<StableWebAppRelease, Error>(
              new Error(`Stable WebApp tag did not resolve to a commit SHA: ${tagName}`),
            );
          }

          const versionResult = parseStableWebAppTagName(tagName);
          if (versionResult.isErr) {
            return Task.reject<StableWebAppRelease, Error>(versionResult.error);
          }

          return Task.resolve(
            Object.freeze({
              version: versionResult.value,
              tagName,
              commitSha: commitSha.toLowerCase(),
            }),
          );
        });
    });
}

type ReadStableWebAppReleasesFromTagsOptions = {
  readonly tagNames: readonly string[];
  readonly tagIndex: number;
  readonly stableReleases: readonly StableWebAppRelease[];
  readonly executeGitCommand: ExecuteWebAppReleaseGitCommand;
};

function readStableWebAppReleasesFromTags(
  options: ReadStableWebAppReleasesFromTagsOptions,
): Task<readonly StableWebAppRelease[], Error> {
  const tagName = options.tagNames.at(options.tagIndex);
  if (tagName === undefined) {
    return Task.resolve(Object.freeze(options.stableReleases));
  }

  const classificationResult = classifyWebAppTagName(tagName);
  if (classificationResult.isErr) {
    return Task.reject(classificationResult.error);
  }

  if (classificationResult.value.isNothing) {
    return readStableWebAppReleasesFromTags({...options, tagIndex: options.tagIndex + 1});
  }

  return readStableWebAppTag({executeGitCommand: options.executeGitCommand, tagName}).andThen(stableRelease => {
    return readStableWebAppReleasesFromTags({
      ...options,
      tagIndex: options.tagIndex + 1,
      stableReleases: [...options.stableReleases, stableRelease],
    });
  });
}

export function discoverStableWebAppReleases(
  options: DiscoverStableWebAppReleasesOptions,
): Task<readonly StableWebAppRelease[], Error> {
  const {executeGitCommand: runGitCommand} = options;
  return executeGitCommand({
    executeGitCommand: runGitCommand,
    commandArguments: ['tag', '--list'],
  }).andThen(tagNamesOutput => {
    const tagNames = tagNamesOutput.split(/\r?\n/).filter(tagName => {
      return tagName.length > 0;
    });

    return readStableWebAppReleasesFromTags({
      tagNames,
      tagIndex: 0,
      stableReleases: [],
      executeGitCommand: runGitCommand,
    });
  });
}

export function selectLatestStableWebAppRelease(
  options: SelectLatestStableWebAppReleaseOptions,
): Result<StableWebAppRelease, Error> {
  const {stableReleases} = options;
  const firstStableReleaseMaybe = Maybe.of(stableReleases.at(0));
  if (firstStableReleaseMaybe.isNothing) {
    return Result.err(new Error('No stable WebApp SemVer tag exists; expected an annotated vMAJOR.MINOR.PATCH tag'));
  }

  let latestStableRelease = firstStableReleaseMaybe.value;
  for (const stableRelease of stableReleases.slice(1)) {
    const versionComparisonResult = compareWebAppVersions(stableRelease.version, latestStableRelease.version);
    if (versionComparisonResult.isErr) {
      return Result.err(versionComparisonResult.error);
    }

    if (versionComparisonResult.value > 0) {
      latestStableRelease = stableRelease;
    }
  }

  return Result.ok(latestStableRelease);
}
