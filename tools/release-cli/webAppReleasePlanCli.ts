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

import {isError, isNonEmptyStringAndNotWhitespace, isString} from '@sindresorhus/is';
import {Result} from 'true-myth';

import type {WebAppReleasePlan} from '../release-metadata/webappReleasePlan.ts';
import {validateWebAppVersion} from '../release-metadata/webappVersion.ts';

export type WebAppReleasePlanRuntimeEnvironment = {
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubToken: string;
};

export type PlanWebAppReleaseCommandOptions = {
  readonly currentVersion: string;
  readonly baseCommit: string;
  readonly targetCommit: string;
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubToken: string;
};

export type WebAppReleasePlanCommandOptions = {
  readonly environment: NodeJS.ProcessEnv;
  readonly planWebAppRelease: (options: PlanWebAppReleaseCommandOptions) => Promise<Result<WebAppReleasePlan, Error>>;
  readonly writeOutput: (message: string) => void;
  readonly writeError: (message: string) => void;
};

const fullCommitShaPattern = /^[0-9a-f]{40}$/i;
const githubRepositoryPartCount = 2;
const targetCommitArgumentIndex = 2;
const releasePlanCommandArgumentCount = 3;
const jsonIndentationSpaces = 2;

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

export function readWebAppReleasePlanRuntimeEnvironment(
  environment: NodeJS.ProcessEnv,
): Result<WebAppReleasePlanRuntimeEnvironment, Error> {
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

function validateCommitSha(commitSha: string, commitName: 'base' | 'target'): Result<string, Error> {
  if (!fullCommitShaPattern.test(commitSha)) {
    return Result.err(new Error(`Invalid ${commitName} commit: expected a full 40-character hexadecimal SHA`));
  }

  return Result.ok(commitSha);
}

function readErrorMessage(error: unknown): string {
  return isError(error) ? error.message : String(error);
}

function redactSecret(message: string, secret: string): string {
  return isString(secret) && secret.length > 0 ? message.replaceAll(secret, '[REDACTED]') : message;
}

export function serializeWebAppReleasePlan(plan: WebAppReleasePlan): string {
  return JSON.stringify(
    {
      base_commit: plan.baseCommit,
      target_commit: plan.targetCommit,
      current_version: plan.currentVersion,
      version_bump: plan.versionBump,
      next_version: plan.nextVersion,
      pull_requests: plan.pullRequests.map(pullRequest => {
        return {
          number: pullRequest.number,
          title: pullRequest.title,
          release_impact: pullRequest.releaseImpact,
        };
      }),
    },
    null,
    jsonIndentationSpaces,
  );
}

export async function runWebAppReleasePlanCommand(
  commandLineArguments: readonly string[],
  options: WebAppReleasePlanCommandOptions,
): Promise<number> {
  const firstCommandLineArgument = commandLineArguments.at(0);
  const helpWasRequested = firstCommandLineArgument === '--help' || firstCommandLineArgument === '-h';
  if (commandLineArguments.length === 1 && helpWasRequested) {
    options.writeOutput('Usage: planWebappRelease <current-version> <base-commit> <target-commit>\n');

    return 0;
  }

  const currentVersion = commandLineArguments.at(0);
  const baseCommit = commandLineArguments.at(1);
  const targetCommit = commandLineArguments.at(targetCommitArgumentIndex);

  if (currentVersion === undefined) {
    options.writeError("Missing required argument 'current-version'\n");

    return 1;
  }

  if (baseCommit === undefined) {
    options.writeError("Missing required argument 'base-commit'\n");

    return 1;
  }

  if (targetCommit === undefined) {
    options.writeError("Missing required argument 'target-commit'\n");

    return 1;
  }

  if (commandLineArguments.length > releasePlanCommandArgumentCount) {
    options.writeError(
      'Too many arguments. Usage: planWebappRelease <current-version> <base-commit> <target-commit>\n',
    );

    return 1;
  }

  const currentVersionResult = validateWebAppVersion(currentVersion);
  if (currentVersionResult.isErr) {
    options.writeError(`${currentVersionResult.error.message}\n`);

    return 1;
  }

  const baseCommitResult = validateCommitSha(baseCommit, 'base');
  if (baseCommitResult.isErr) {
    options.writeError(`${baseCommitResult.error.message}\n`);

    return 1;
  }

  const targetCommitResult = validateCommitSha(targetCommit, 'target');
  if (targetCommitResult.isErr) {
    options.writeError(`${targetCommitResult.error.message}\n`);

    return 1;
  }

  const runtimeEnvironmentResult = readWebAppReleasePlanRuntimeEnvironment(options.environment);
  if (runtimeEnvironmentResult.isErr) {
    options.writeError(`${runtimeEnvironmentResult.error.message}\n`);

    return 1;
  }

  const {value: runtimeEnvironment} = runtimeEnvironmentResult;

  try {
    const planResult = await options.planWebAppRelease({
      currentVersion: currentVersionResult.value,
      baseCommit: baseCommitResult.value,
      targetCommit: targetCommitResult.value,
      githubApiUrl: runtimeEnvironment.githubApiUrl,
      githubRepository: runtimeEnvironment.githubRepository,
      githubToken: runtimeEnvironment.githubToken,
    });

    if (planResult.isErr) {
      options.writeError(`${redactSecret(planResult.error.message, runtimeEnvironment.githubToken)}\n`);

      return 1;
    }

    options.writeOutput(`${serializeWebAppReleasePlan(planResult.value)}\n`);

    return 0;
  } catch (error: unknown) {
    const githubToken = isString(options.environment.GITHUB_TOKEN) ? options.environment.GITHUB_TOKEN : '';
    options.writeError(`${redactSecret(readErrorMessage(error), githubToken)}\n`);

    return 1;
  }
}
