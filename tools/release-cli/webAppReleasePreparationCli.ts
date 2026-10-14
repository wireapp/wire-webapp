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

import {isError, isNonEmptyStringAndNotWhitespace} from '@sindresorhus/is';
import {Result, Task} from 'true-myth';

import type {
  WebAppReleasePreparation,
  PrepareWebAppReleaseOptions,
} from '../release-metadata/webappReleaseReservation.ts';

export type WebAppReleasePreparationRuntimeEnvironment = {
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubToken: string;
};

export type PrepareWebAppRelease = (
  options: PrepareWebAppReleaseOptions,
  dependencies: WebAppReleasePreparationRuntimeEnvironment,
) => Task<WebAppReleasePreparation, Error>;

export type WebAppReleasePreparationCommandOptions = {
  readonly commandLineArguments: WebAppReleasePreparationCommandArguments;
  readonly environment: NodeJS.ProcessEnv;
};

export type WebAppReleasePreparationCommandDependencies = {
  readonly prepareRelease: PrepareWebAppRelease;
  readonly writeOutput: (message: string) => void;
  readonly writeError: (message: string) => void;
};

export type WebAppReleasePreparationCommandArguments = readonly [operation: string, targetCommit?: string];

const githubRepositoryPartCount = 2;
const jsonIndentationSpaces = 2;
const fullCommitShaPattern = /^[0-9a-f]{40}$/i;

function hasValidGitHubRepositoryFormat(githubRepository: string): boolean {
  const githubRepositoryParts = githubRepository.split('/');
  const repositoryOwner = githubRepositoryParts.at(0);
  const repositoryName = githubRepositoryParts.at(1);

  return (
    githubRepositoryParts.length === githubRepositoryPartCount &&
    isNonEmptyStringAndNotWhitespace(repositoryOwner) &&
    isNonEmptyStringAndNotWhitespace(repositoryName)
  );
}

function readRequiredEnvironmentValue(
  environment: NodeJS.ProcessEnv,
  environmentVariableName: string,
): Result<string, Error> {
  const environmentValue = environment[environmentVariableName];
  if (!isNonEmptyStringAndNotWhitespace(environmentValue)) {
    return Result.err(new Error(`Required environment variable is missing: ${environmentVariableName}`));
  }

  return Result.ok(environmentValue);
}

export function readWebAppReleasePreparationRuntimeEnvironment(
  environment: NodeJS.ProcessEnv,
): Result<WebAppReleasePreparationRuntimeEnvironment, Error> {
  const githubApiUrlValueResult = readRequiredEnvironmentValue(environment, 'GITHUB_API_URL');
  if (githubApiUrlValueResult.isErr) {
    return Result.err(githubApiUrlValueResult.error);
  }

  const githubRepositoryResult = readRequiredEnvironmentValue(environment, 'GITHUB_REPOSITORY');
  if (githubRepositoryResult.isErr) {
    return Result.err(githubRepositoryResult.error);
  }

  const githubTokenResult = readRequiredEnvironmentValue(environment, 'GITHUB_TOKEN');
  if (githubTokenResult.isErr) {
    return Result.err(githubTokenResult.error);
  }

  let githubApiUrl: URL;
  try {
    githubApiUrl = new URL(githubApiUrlValueResult.value);
  } catch (error: unknown) {
    return Result.err(new Error('GITHUB_API_URL must be a valid URL', {cause: error}));
  }

  if (githubApiUrl.protocol !== 'https:' && githubApiUrl.protocol !== 'http:') {
    return Result.err(new Error('GITHUB_API_URL must use HTTP or HTTPS'));
  }

  if (hasValidGitHubRepositoryFormat(githubRepositoryResult.value) === false) {
    return Result.err(new Error('GITHUB_REPOSITORY must use the owner/repository format'));
  }

  return Result.ok({
    githubApiUrl,
    githubRepository: githubRepositoryResult.value,
    githubToken: githubTokenResult.value,
  });
}

export function serializeWebAppReleasePreparation(preparation: WebAppReleasePreparation): string {
  return JSON.stringify(
    {
      operation: preparation.operation,
      version: preparation.version,
      release_branch: preparation.releaseBranch,
      release_commit: preparation.releaseCommitSha,
      release_branch_action: preparation.action,
      stable_base_version: preparation.stableBaseVersion,
      stable_base_tag: preparation.stableBaseTag,
      stable_base_commit: preparation.stableBaseCommitSha,
    },
    null,
    jsonIndentationSpaces,
  );
}

function redactSecret(message: string, secret: string): string {
  return secret.length === 0 ? message : message.replaceAll(secret, '[REDACTED]');
}

function readErrorMessage(error: unknown): string {
  return isError(error) ? error.message : String(error);
}

export async function runWebAppReleasePreparationCommand(
  options: WebAppReleasePreparationCommandOptions,
  dependencies: WebAppReleasePreparationCommandDependencies,
): Promise<number> {
  const {commandLineArguments, environment} = options;
  const {prepareRelease, writeOutput, writeError} = dependencies;
  const [operation, requestedTargetCommit] = commandLineArguments;

  if (operation !== 'start' && operation !== 'continue') {
    writeError('Release operation must be either start or continue\n');

    return 1;
  }

  if (operation === 'start') {
    if (requestedTargetCommit === undefined || fullCommitShaPattern.test(requestedTargetCommit) === false) {
      writeError('Start requires a full 40-character main commit SHA\n');

      return 1;
    }
  }

  if (operation === 'continue' && requestedTargetCommit !== undefined) {
    writeError('Continue does not accept a target commit\n');

    return 1;
  }

  const runtimeEnvironmentResult = readWebAppReleasePreparationRuntimeEnvironment(environment);
  if (runtimeEnvironmentResult.isErr) {
    writeError(`${runtimeEnvironmentResult.error.message}\n`);

    return 1;
  }

  const runtimeEnvironment = runtimeEnvironmentResult.value;
  let releasePreparationOptions: PrepareWebAppReleaseOptions;
  if (operation === 'start') {
    if (requestedTargetCommit === undefined) {
      writeError('Start requires a full 40-character main commit SHA\n');

      return 1;
    }

    releasePreparationOptions = {operation, targetCommit: requestedTargetCommit.toLowerCase()};
  } else {
    releasePreparationOptions = {operation};
  }

  try {
    const preparationResult = await prepareRelease(releasePreparationOptions, runtimeEnvironment).toPromise();
    if (preparationResult.isErr) {
      writeError(`${redactSecret(preparationResult.error.message, runtimeEnvironment.githubToken)}\n`);

      return 1;
    }

    writeOutput(`${serializeWebAppReleasePreparation(preparationResult.value)}\n`);

    return 0;
  } catch (error: unknown) {
    writeError(`${redactSecret(readErrorMessage(error), runtimeEnvironment.githubToken)}\n`);

    return 1;
  }
}
