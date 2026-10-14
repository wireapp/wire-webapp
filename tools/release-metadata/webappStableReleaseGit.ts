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

async function executeGitCommand(options: ExecuteGitCommandOptions): Promise<Result<string, Error>> {
  const {executeGitCommand: runGitCommand, commandArguments} = options;

  try {
    return Result.ok(await runGitCommand(commandArguments));
  } catch (error: unknown) {
    return Result.err(
      new Error(`Git command failed: git ${commandArguments.join(' ')}: ${errorMessage(error)}`, {
        cause: error,
      }),
    );
  }
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

async function readStableWebAppTag(options: ReadStableWebAppTagOptions): Promise<Result<StableWebAppRelease, Error>> {
  const {executeGitCommand: runGitCommand, tagName} = options;
  const tagObjectTypeResult = await executeGitCommand({
    executeGitCommand: runGitCommand,
    commandArguments: ['cat-file', '-t', `refs/tags/${tagName}`],
  });
  if (tagObjectTypeResult.isErr) {
    return Result.err(
      new Error(`Unable to inspect stable WebApp tag ${tagName}: ${tagObjectTypeResult.error.message}`, {
        cause: tagObjectTypeResult.error,
      }),
    );
  }

  if (tagObjectTypeResult.value.trim() !== 'tag') {
    return Result.err(new Error(`Stable WebApp tag must be annotated: ${tagName}`));
  }

  const commitShaResult = await executeGitCommand({
    executeGitCommand: runGitCommand,
    commandArguments: ['rev-parse', '--verify', '--end-of-options', `refs/tags/${tagName}^{commit}`],
  });
  if (commitShaResult.isErr) {
    return Result.err(
      new Error(`Stable WebApp tag does not resolve to a commit: ${tagName}`, {
        cause: commitShaResult.error,
      }),
    );
  }

  const commitSha = commitShaResult.value.trim();
  if (fullCommitShaPattern.test(commitSha) === false) {
    return Result.err(new Error(`Stable WebApp tag did not resolve to a commit SHA: ${tagName}`));
  }

  const versionResult = parseStableWebAppTagName(tagName);
  if (versionResult.isErr) {
    return Result.err(versionResult.error);
  }

  return Result.ok(
    Object.freeze({
      version: versionResult.value,
      tagName,
      commitSha: commitSha.toLowerCase(),
    }),
  );
}

export async function discoverStableWebAppReleases(
  options: DiscoverStableWebAppReleasesOptions,
): Promise<Result<readonly StableWebAppRelease[], Error>> {
  const {executeGitCommand: runGitCommand} = options;
  const tagNamesResult = await executeGitCommand({
    executeGitCommand: runGitCommand,
    commandArguments: ['tag', '--list'],
  });
  if (tagNamesResult.isErr) {
    return Result.err(tagNamesResult.error);
  }

  const stableReleases: StableWebAppRelease[] = [];
  const tagNames = tagNamesResult.value.split(/\r?\n/).filter(tagName => {
    return tagName.length > 0;
  });

  for (const tagName of tagNames) {
    const classificationResult = classifyWebAppTagName(tagName);
    if (classificationResult.isErr) {
      return Result.err(classificationResult.error);
    }

    const versionMaybe = classificationResult.value;
    if (versionMaybe.isNothing) {
      continue;
    }

    const stableWebAppTagResult = await readStableWebAppTag({
      executeGitCommand: runGitCommand,
      tagName,
    });
    if (stableWebAppTagResult.isErr) {
      return Result.err(stableWebAppTagResult.error);
    }

    stableReleases.push(stableWebAppTagResult.value);
  }

  return Result.ok(Object.freeze(stableReleases));
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
