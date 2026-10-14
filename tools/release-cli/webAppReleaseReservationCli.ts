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

import {isError} from '@sindresorhus/is';
import {Maybe, Result} from 'true-myth';

import {readWebAppReleasePlanRuntimeEnvironment} from './webAppReleasePlanCli.ts';
import type {WebAppReleasePlanRuntimeEnvironment} from './webAppReleasePlanCli.ts';
import {serializeWebAppReleaseReservation} from './webAppReleaseReservationSerializer.ts';

import {redactGitHubSecret} from '../release-github/githubApi.ts';
import type {WebAppReleaseReservation} from '../release-metadata/webappReleaseReservation.ts';

export {serializeWebAppReleaseReservation} from './webAppReleaseReservationSerializer.ts';

export type ReserveWebAppReleaseCommandOptions = {
  readonly targetCommit: string;
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubToken: string;
};

export type WebAppReleaseReservationCommandOptions = {
  readonly environment: NodeJS.ProcessEnv;
  readonly reserveWebAppRelease: (
    options: ReserveWebAppReleaseCommandOptions,
  ) => Promise<Result<WebAppReleaseReservation, Error>>;
  readonly writeOutput: (message: string) => void;
  readonly writeError: (message: string) => void;
};

export type WebAppReleaseReservationCommandArguments = readonly [targetCommit: string];

type ExecuteWebAppReleaseReservationOptions = {
  readonly targetCommit: string;
  readonly commandOptions: WebAppReleaseReservationCommandOptions;
};

const fullCommitShaPattern = /^[0-9a-f]{40}$/i;

function readErrorMessage(error: unknown): string {
  return isError(error) ? error.message : String(error);
}

async function executeWebAppReleaseReservationCommand(
  options: ExecuteWebAppReleaseReservationOptions,
): Promise<number> {
  const {targetCommit, commandOptions} = options;
  if (fullCommitShaPattern.test(targetCommit) === false) {
    commandOptions.writeError('Invalid target commit: expected a full 40-character hexadecimal SHA\n');

    return 1;
  }

  const runtimeEnvironmentResult = readWebAppReleasePlanRuntimeEnvironment(commandOptions.environment);
  if (runtimeEnvironmentResult.isErr) {
    commandOptions.writeError(`${runtimeEnvironmentResult.error.message}\n`);

    return 1;
  }

  const runtimeEnvironment: WebAppReleasePlanRuntimeEnvironment = runtimeEnvironmentResult.value;

  try {
    const reservationResult = await commandOptions.reserveWebAppRelease({
      targetCommit: targetCommit.toLowerCase(),
      githubApiUrl: runtimeEnvironment.githubApiUrl,
      githubRepository: runtimeEnvironment.githubRepository,
      githubToken: runtimeEnvironment.githubToken,
    });
    if (reservationResult.isErr) {
      commandOptions.writeError(
        `${redactGitHubSecret(reservationResult.error.message, runtimeEnvironment.githubToken)}\n`,
      );

      return 1;
    }

    commandOptions.writeOutput(`${serializeWebAppReleaseReservation(reservationResult.value)}\n`);

    return 0;
  } catch (error: unknown) {
    const errorMessage = readErrorMessage(error);
    const redactedErrorMessage = Maybe.of(commandOptions.environment.GITHUB_TOKEN).match({
      Just(githubToken) {
        return redactGitHubSecret(errorMessage, githubToken);
      },
      Nothing() {
        return errorMessage;
      },
    });
    commandOptions.writeError(`${redactedErrorMessage}\n`);

    return 1;
  }
}

export async function runWebAppReleaseReservationCommand(
  commandLineArguments: WebAppReleaseReservationCommandArguments,
  options: WebAppReleaseReservationCommandOptions,
): Promise<number> {
  const [targetCommit] = commandLineArguments;

  return executeWebAppReleaseReservationCommand({targetCommit, commandOptions: options});
}
