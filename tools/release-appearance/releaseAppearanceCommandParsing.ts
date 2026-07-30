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

import is from '@sindresorhus/is';
import {Maybe} from 'true-myth';
import {match} from 'ts-pattern';

import {commandFailure, commandFailureWithCause, commandSuccess} from './releaseAppearanceCommandResult.ts';
import type {CommandResult} from './releaseAppearanceCommandResult.ts';

export type ReleaseAppearanceCommandStage = 'beta' | 'production';

export type ParsedCommand =
  | {
      readonly stage: 'beta';
      readonly releaseTag: string;
      readonly releaseCommit: string;
    }
  | {
      readonly stage: 'production';
      readonly releaseTag: string;
      readonly releaseCommit: string;
      readonly promotedBetaTag: string;
    };

export type CommandEnvironment = {
  readonly githubApiUrl: string;
  readonly githubRepository: string;
  readonly githubStepSummary: string;
  readonly githubToken: string;
};

const betaCommandArgumentCount = 3;
const productionCommandArgumentCount = 4;
const releaseTagArgumentIndex = 1;
const releaseCommitArgumentIndex = 2;
const promotedBetaTagArgumentIndex = 3;

export const processArgumentStartIndex = 2;

function validateNonEmptyArgument(argumentName: string, argumentValue: unknown): CommandResult<string> {
  if (!is.nonEmptyStringAndNotWhitespace(argumentValue)) {
    return commandFailure(`${argumentName} must not be empty`);
  }

  return commandSuccess(argumentValue);
}

function readRequiredCommandArgument(
  commandLineArguments: readonly string[],
  argumentIndex: number,
  argumentName: string,
): CommandResult<string> {
  return Maybe.of(commandLineArguments[argumentIndex]).match({
    Just(argumentValue) {
      return validateNonEmptyArgument(argumentName, argumentValue);
    },
    Nothing() {
      return commandFailure(`${argumentName} must not be empty`);
    },
  });
}

function readReleaseCommit(commandLineArguments: readonly string[]): CommandResult<string> {
  return readRequiredCommandArgument(commandLineArguments, releaseCommitArgumentIndex, 'Release commit SHA').andThen(
    releaseCommit => {
      return /^[0-9a-f]{7,64}$/i.test(releaseCommit)
        ? commandSuccess(releaseCommit)
        : commandFailure('Release commit SHA must contain 7 to 64 hexadecimal characters');
    },
  );
}

function parseBetaCommand(commandLineArguments: readonly string[]): CommandResult<ParsedCommand> {
  return readRequiredCommandArgument(commandLineArguments, releaseTagArgumentIndex, 'Beta tag').andThen(betaTag => {
    return readReleaseCommit(commandLineArguments).map(releaseCommit => {
      return {
        stage: 'beta',
        releaseTag: betaTag,
        releaseCommit,
      };
    });
  });
}

function parseProductionCommand(commandLineArguments: readonly string[]): CommandResult<ParsedCommand> {
  return readRequiredCommandArgument(commandLineArguments, releaseTagArgumentIndex, 'Production tag').andThen(
    productionTag => {
      return readReleaseCommit(commandLineArguments).andThen(releaseCommit => {
        return readRequiredCommandArgument(commandLineArguments, promotedBetaTagArgumentIndex, 'Promoted Beta tag').map(
          promotedBetaTag => {
            return {
              stage: 'production',
              releaseTag: productionTag,
              releaseCommit,
              promotedBetaTag,
            };
          },
        );
      });
    },
  );
}

function invalidCommandResult(): CommandResult<ParsedCommand> {
  return commandFailure(
    'Usage: beta <beta-tag> <release-commit-sha> or production <production-tag> <release-commit-sha> <promoted-beta-tag>',
  );
}

export function parseCommandLineArguments(commandLineArguments: readonly string[]): CommandResult<ParsedCommand> {
  return Maybe.of(commandLineArguments[0]).match({
    Nothing() {
      return invalidCommandResult();
    },
    Just(stage) {
      return match(stage)
        .with('beta', () => {
          return commandLineArguments.length === betaCommandArgumentCount
            ? parseBetaCommand(commandLineArguments)
            : invalidCommandResult();
        })
        .with('production', () => {
          return commandLineArguments.length === productionCommandArgumentCount
            ? parseProductionCommand(commandLineArguments)
            : invalidCommandResult();
        })
        .otherwise(() => {
          return invalidCommandResult();
        });
    },
  });
}

function readRequiredEnvironmentValue(environment: NodeJS.ProcessEnv, variableName: string): CommandResult<string> {
  const environmentValue = environment[variableName];
  if (!is.nonEmptyStringAndNotWhitespace(environmentValue)) {
    return commandFailure(`${variableName} must be set`);
  }

  return commandSuccess(environmentValue);
}

export function readCommandEnvironment(environment: NodeJS.ProcessEnv): CommandResult<CommandEnvironment> {
  const githubApiUrlResult = readRequiredEnvironmentValue(environment, 'GITHUB_API_URL');
  if (githubApiUrlResult.isErr) {
    return commandFailure<CommandEnvironment>(githubApiUrlResult.error.message);
  }

  let parsedGithubApiUrl: URL;
  try {
    parsedGithubApiUrl = new URL(githubApiUrlResult.value);
  } catch (error: unknown) {
    return commandFailureWithCause('GITHUB_API_URL must be a valid URL', error);
  }

  if (parsedGithubApiUrl.protocol !== 'https:' && parsedGithubApiUrl.protocol !== 'http:') {
    return commandFailure('GITHUB_API_URL must use HTTP or HTTPS');
  }

  const githubRepositoryResult = readRequiredEnvironmentValue(environment, 'GITHUB_REPOSITORY');
  if (githubRepositoryResult.isErr) {
    return commandFailure<CommandEnvironment>(githubRepositoryResult.error.message);
  }

  if (!/^[^/]+\/[^/]+$/.test(githubRepositoryResult.value)) {
    return commandFailure('GITHUB_REPOSITORY must use the OWNER/REPOSITORY format');
  }

  const githubStepSummaryResult = readRequiredEnvironmentValue(environment, 'GITHUB_STEP_SUMMARY');
  if (githubStepSummaryResult.isErr) {
    return commandFailure<CommandEnvironment>(githubStepSummaryResult.error.message);
  }

  const githubTokenResult = readRequiredEnvironmentValue(environment, 'GITHUB_TOKEN');
  if (githubTokenResult.isErr) {
    return commandFailure<CommandEnvironment>(githubTokenResult.error.message);
  }

  return commandSuccess({
    githubApiUrl: parsedGithubApiUrl.toString(),
    githubRepository: githubRepositoryResult.value,
    githubStepSummary: githubStepSummaryResult.value,
    githubToken: githubTokenResult.value,
  });
}
