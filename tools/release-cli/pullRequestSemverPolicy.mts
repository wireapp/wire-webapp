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

import {isString} from '@sindresorhus/is';
import {Result} from 'true-myth';
import {z} from 'zod';

import {resolve as resolveFileSystemPath} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {validatePullRequestReleaseImpact} from '../release-metadata/pullRequestReleaseImpact.ts';
import type {ValidatePullRequestReleaseImpactOptions} from '../release-metadata/pullRequestReleaseImpact.ts';

type PullRequestSemverPolicyCommandOptions = {
  readonly environment: Readonly<Record<string, string | undefined>>;
  readonly dependencies: {
    readonly writeError: (message: string) => void;
    readonly writeOutput: (message: string) => void;
  };
};

const policyEnvironmentSchema = z.object({
  TARGET_BRANCH: z.string().regex(/\S/, 'must contain a target branch'),
  PULL_REQUEST_LABELS_JSON: z.string().min(1),
});
const pullRequestLabelsSchema = z.array(z.string());

function readPolicyInput(
  environment: PullRequestSemverPolicyCommandOptions['environment'],
): Result<ValidatePullRequestReleaseImpactOptions, Error> {
  const environmentResult = policyEnvironmentSchema.safeParse(environment);

  if (!environmentResult.success) {
    return Result.err(new Error(`Invalid SemVer policy environment: ${environmentResult.error.message}`));
  }

  let parsedLabels: unknown;

  try {
    parsedLabels = JSON.parse(environmentResult.data.PULL_REQUEST_LABELS_JSON);
  } catch (error: unknown) {
    return Result.err(
      new Error('PULL_REQUEST_LABELS_JSON must contain valid JSON describing an array of label names', {cause: error}),
    );
  }

  const labelsResult = pullRequestLabelsSchema.safeParse(parsedLabels);

  if (!labelsResult.success) {
    return Result.err(new Error(`PULL_REQUEST_LABELS_JSON must be an array of strings: ${labelsResult.error.message}`));
  }

  return Result.ok({
    targetBranch: environmentResult.data.TARGET_BRANCH,
    labels: labelsResult.data,
  });
}

export function runPullRequestSemverPolicyCommand(options: PullRequestSemverPolicyCommandOptions): number {
  const {environment, dependencies} = options;
  const policyResult = readPolicyInput(environment).andThen(validatePullRequestReleaseImpact);

  return policyResult.match({
    Ok(releaseImpact) {
      dependencies.writeOutput(`Pull request SemVer policy passed: ${releaseImpact}\n`);

      return 0;
    },
    Err(error) {
      dependencies.writeError(`${error.message}\n`);

      return 1;
    },
  });
}

function writeRuntimeError(message: string): void {
  process.stderr.write(message);
}

function writeRuntimeOutput(message: string): void {
  process.stdout.write(message);
}

function isCurrentModuleEntrypoint(): boolean {
  const entrypointPath = process.argv[1];

  return isString(entrypointPath) && fileURLToPath(import.meta.url) === resolveFileSystemPath(entrypointPath);
}

if (isCurrentModuleEntrypoint()) {
  process.exitCode = runPullRequestSemverPolicyCommand({
    environment: process.env,
    dependencies: {writeError: writeRuntimeError, writeOutput: writeRuntimeOutput},
  });
}
