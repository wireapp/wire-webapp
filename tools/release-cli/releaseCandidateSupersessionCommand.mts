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

import {appendFile} from 'node:fs/promises';
import process from 'node:process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {isError, isInteger, isNonEmptyStringAndNotWhitespace, isString} from '@sindresorhus/is';
import {Result} from 'true-myth';

import {createRuntimeGitHubActionsClient} from '../release-supersession/githubActionsClient.ts';
import {
  renderSupersessionSummary,
  supersedePreviousReleaseCandidates,
} from '../release-supersession/releaseCandidateSupersessionCommand.ts';

type RuntimeCommandEnvironment = {
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubToken: string;
  readonly githubOutputPath: string;
  readonly githubStepSummaryPath: string;
  readonly currentRunId: number;
};

const releaseWorkflowFileName = 'release-webapp.yml';

function createSuccess<valueType>(value: valueType): Result<valueType, Error> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string, cause?: unknown): Result<valueType, Error> {
  return Result.err<valueType, Error>(new Error(message, {cause}));
}

function readRequiredEnvironmentValue(environment: NodeJS.ProcessEnv, variableName: string): Result<string, Error> {
  const environmentValue = environment[variableName];

  if (isNonEmptyStringAndNotWhitespace(environmentValue)) {
    return createSuccess(environmentValue);
  }

  return createFailure(`${variableName} must be set`);
}

function readGitHubApiUrl(environment: NodeJS.ProcessEnv): Result<URL, Error> {
  const githubApiUrlValueResult = readRequiredEnvironmentValue(environment, 'GITHUB_API_URL');
  if (githubApiUrlValueResult.isErr) {
    return createFailure(githubApiUrlValueResult.error.message);
  }

  try {
    const githubApiUrl = new URL(githubApiUrlValueResult.value);

    if (githubApiUrl.protocol !== 'https:' && githubApiUrl.protocol !== 'http:') {
      return createFailure('GITHUB_API_URL must use HTTP or HTTPS');
    }

    return createSuccess(githubApiUrl);
  } catch (error: unknown) {
    return createFailure('GITHUB_API_URL must be a valid URL', error);
  }
}

function readCurrentRunId(environment: NodeJS.ProcessEnv): Result<number, Error> {
  const currentRunIdValueResult = readRequiredEnvironmentValue(environment, 'GITHUB_RUN_ID');
  if (currentRunIdValueResult.isErr) {
    return createFailure(currentRunIdValueResult.error.message);
  }

  const currentRunId = Number(currentRunIdValueResult.value);
  if (isInteger(currentRunId) === false || currentRunId <= 0) {
    return createFailure('GITHUB_RUN_ID must be a positive integer');
  }

  return createSuccess(currentRunId);
}

function readRuntimeCommandEnvironment(environment: NodeJS.ProcessEnv): Result<RuntimeCommandEnvironment, Error> {
  const githubApiUrlResult = readGitHubApiUrl(environment);
  const githubRepositoryResult = readRequiredEnvironmentValue(environment, 'GITHUB_REPOSITORY');
  const githubTokenResult = readRequiredEnvironmentValue(environment, 'GITHUB_TOKEN');
  const githubOutputPathResult = readRequiredEnvironmentValue(environment, 'GITHUB_OUTPUT');
  const githubStepSummaryPathResult = readRequiredEnvironmentValue(environment, 'GITHUB_STEP_SUMMARY');
  const currentRunIdResult = readCurrentRunId(environment);

  if (githubApiUrlResult.isErr) {
    return createFailure(githubApiUrlResult.error.message);
  }
  if (githubRepositoryResult.isErr) {
    return createFailure(githubRepositoryResult.error.message);
  }
  if (githubTokenResult.isErr) {
    return createFailure(githubTokenResult.error.message);
  }
  if (githubOutputPathResult.isErr) {
    return createFailure(githubOutputPathResult.error.message);
  }
  if (githubStepSummaryPathResult.isErr) {
    return createFailure(githubStepSummaryPathResult.error.message);
  }
  if (currentRunIdResult.isErr) {
    return createFailure(currentRunIdResult.error.message);
  }

  return createSuccess({
    githubApiUrl: githubApiUrlResult.value,
    githubRepository: githubRepositoryResult.value,
    githubToken: githubTokenResult.value,
    githubOutputPath: githubOutputPathResult.value,
    githubStepSummaryPath: githubStepSummaryPathResult.value,
    currentRunId: currentRunIdResult.value,
  });
}

function redactSecret(message: string, secret: string): string {
  return secret.length === 0 ? message : message.replaceAll(secret, '[REDACTED]');
}

async function writeSupersessionOutputs(
  environment: RuntimeCommandEnvironment,
  supersededRunIds: readonly number[],
  cancellationConflictRunIds: readonly number[],
): Promise<void> {
  const outputLines = [
    `superseded_run_count=${supersededRunIds.length}`,
    `superseded_run_ids=${supersededRunIds.join(',')}`,
    `cancellation_conflict_run_count=${cancellationConflictRunIds.length}`,
    `cancellation_conflict_run_ids=${cancellationConflictRunIds.join(',')}`,
  ];

  await appendFile(environment.githubOutputPath, `${outputLines.join('\n')}\n`, 'utf8');
}

async function executeRuntimeCommand(environment: RuntimeCommandEnvironment): Promise<void> {
  const githubActionsClient = createRuntimeGitHubActionsClient({
    githubApiUrl: environment.githubApiUrl,
    githubRepository: environment.githubRepository,
    githubToken: environment.githubToken,
  });
  const supersessionResult = await supersedePreviousReleaseCandidates({
    currentRunId: environment.currentRunId,
    workflowFileName: releaseWorkflowFileName,
    githubActionsClient,
  });

  if (supersessionResult.isErr) {
    throw supersessionResult.error;
  }

  await writeSupersessionOutputs(
    environment,
    supersessionResult.value.supersededRunIds,
    supersessionResult.value.cancellationConflictRunIds,
  );
  await appendFile(
    environment.githubStepSummaryPath,
    `${renderSupersessionSummary(environment.currentRunId, supersessionResult.value)}\n`,
    'utf8',
  );
}

async function main(): Promise<void> {
  try {
    const environmentResult = readRuntimeCommandEnvironment(process.env);
    if (environmentResult.isErr) {
      throw environmentResult.error;
    }

    await executeRuntimeCommand(environmentResult.value);
  } catch (error: unknown) {
    const githubToken = isString(process.env.GITHUB_TOKEN) ? process.env.GITHUB_TOKEN : '';
    const errorMessage = isError(error) ? error.message : String(error);
    process.stderr.write(`${redactSecret(errorMessage, githubToken)}\n`);
    process.exitCode = 1;
  }
}

function isCurrentModuleEntrypoint(): boolean {
  const entrypointPath = process.argv[1];

  return isString(entrypointPath) && fileURLToPath(import.meta.url) === resolve(entrypointPath);
}

if (isCurrentModuleEntrypoint()) {
  await main();
}
