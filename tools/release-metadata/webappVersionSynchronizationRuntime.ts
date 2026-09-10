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
import {Result} from 'true-myth';

import process from 'node:process';

export type WebAppVersionSynchronizationInspectionRuntimeEnvironment = {
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubToken: string;
  readonly repositoryPath: string;
};

export type WebAppVersionSynchronizationSynchronizationRuntimeEnvironment = {
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly ottoTheBotGitHubToken: string;
  readonly repositoryPath: string;
};

type CommonRuntimeEnvironment = {
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly repositoryPath: string;
};

function readRequiredEnvironmentValue(
  environment: NodeJS.ProcessEnv,
  environmentVariableName: string,
): Result<string, Error> {
  const environmentValue = environment[environmentVariableName];

  if (isNonEmptyStringAndNotWhitespace(environmentValue) === false) {
    return Result.err(new Error(`Required environment variable is missing: ${environmentVariableName}`));
  }

  return Result.ok(environmentValue);
}

function readCommonRuntimeEnvironment(environment: NodeJS.ProcessEnv): Result<CommonRuntimeEnvironment, Error> {
  const githubApiUrlValueResult = readRequiredEnvironmentValue(environment, 'GITHUB_API_URL');
  const githubRepositoryResult = readRequiredEnvironmentValue(environment, 'GITHUB_REPOSITORY');
  const repositoryPath = environment.GITHUB_WORKSPACE;

  if (githubApiUrlValueResult.isErr) {
    return Result.err(githubApiUrlValueResult.error);
  }

  if (githubRepositoryResult.isErr) {
    return Result.err(githubRepositoryResult.error);
  }

  const {value: githubApiUrlValue} = githubApiUrlValueResult;
  const {value: githubRepository} = githubRepositoryResult;

  let githubApiUrl: URL;

  try {
    githubApiUrl = new URL(githubApiUrlValue);
  } catch (error: unknown) {
    const errorMessage = isError(error) ? error.message : String(error);

    return Result.err(new Error(`Invalid GITHUB_API_URL: ${errorMessage}`, {cause: error}));
  }

  return Result.ok({
    githubApiUrl,
    githubRepository,
    repositoryPath: isNonEmptyStringAndNotWhitespace(repositoryPath) ? repositoryPath : process.cwd(),
  });
}

export function readInspectionRuntimeEnvironment(
  environment: NodeJS.ProcessEnv,
): Result<WebAppVersionSynchronizationInspectionRuntimeEnvironment, Error> {
  const commonRuntimeEnvironmentResult = readCommonRuntimeEnvironment(environment);

  if (commonRuntimeEnvironmentResult.isErr) {
    return Result.err(commonRuntimeEnvironmentResult.error);
  }

  const githubTokenResult = readRequiredEnvironmentValue(environment, 'GITHUB_TOKEN');

  if (githubTokenResult.isErr) {
    return Result.err(githubTokenResult.error);
  }

  const {value: commonRuntimeEnvironment} = commonRuntimeEnvironmentResult;
  const {value: githubToken} = githubTokenResult;

  return Result.ok({
    ...commonRuntimeEnvironment,
    githubToken,
  });
}

export function readSynchronizationRuntimeEnvironment(
  environment: NodeJS.ProcessEnv,
): Result<WebAppVersionSynchronizationSynchronizationRuntimeEnvironment, Error> {
  const commonRuntimeEnvironmentResult = readCommonRuntimeEnvironment(environment);

  if (commonRuntimeEnvironmentResult.isErr) {
    return Result.err(commonRuntimeEnvironmentResult.error);
  }

  const ottoTheBotGitHubTokenResult = readRequiredEnvironmentValue(environment, 'OTTO_THE_BOT_GH_TOKEN');

  if (ottoTheBotGitHubTokenResult.isErr) {
    return Result.err(ottoTheBotGitHubTokenResult.error);
  }

  const {value: commonRuntimeEnvironment} = commonRuntimeEnvironmentResult;
  const {value: ottoTheBotGitHubToken} = ottoTheBotGitHubTokenResult;

  return Result.ok({
    ...commonRuntimeEnvironment,
    ottoTheBotGitHubToken,
  });
}
