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

import {isFiniteNumber, isNonEmptyStringAndNotWhitespace, isNonNegativeNumber} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

export type GitHubRateLimitResponseMetadata = {
  readonly statusCode: number;
  readonly githubMessage: Maybe<string>;
  readonly retryAfter: Maybe<string>;
  readonly rateLimitRemaining: Maybe<string>;
  readonly rateLimitReset: Maybe<string>;
};

export type GitHubRateLimitNoRetryReason =
  'not-rate-limit-response' | 'maximum-retries-reached' | 'invalid-retry-attempt';

export type GitHubRateLimitRetryDecision =
  | {
      readonly kind: 'retry';
      readonly rateLimitKind: 'primary' | 'secondary';
      readonly delayMilliseconds: number;
    }
  | {
      readonly kind: 'no-retry';
      readonly reason: GitHubRateLimitNoRetryReason;
    };

export type CalculateGitHubRateLimitRetryDecisionOptions = {
  readonly response: GitHubRateLimitResponseMetadata;
  readonly retryAttempt: number;
  readonly currentTimeMilliseconds: number;
};

export const maximumGitHubRateLimitRetries = 2;
export const secondaryRateLimitFirstRetryDelayMilliseconds = 60_000;

const forbiddenHttpStatusCode = 403;
const tooManyRequestsHttpStatusCode = 429;
const millisecondsPerSecond = 1_000;
const secondaryRateLimitBackoffBase = 2;
const githubRateLimitMessagePattern = /\b(?:api|primary|secondary) rate limit\b|\brate limit exceeded\b/i;

function hasNonEmptyHeaderValue(headerValue: Maybe<string>): boolean {
  return headerValue.match({
    Just(value) {
      return isNonEmptyStringAndNotWhitespace(value);
    },
    Nothing() {
      return false;
    },
  });
}

function hasPrimaryRateLimitExhaustion(response: GitHubRateLimitResponseMetadata): boolean {
  return response.rateLimitRemaining.match({
    Just(rateLimitRemaining) {
      if (rateLimitRemaining.trim() !== '0') {
        return false;
      }

      return parseRateLimitResetMilliseconds(response).match({
        Just() {
          return true;
        },
        Nothing() {
          return false;
        },
      });
    },
    Nothing() {
      return false;
    },
  });
}

function parseRetryAfterDelayMilliseconds(retryAfter: Maybe<string>, currentTimeMilliseconds: number): Maybe<number> {
  return retryAfter.match({
    Just(retryAfterValue) {
      if (!isNonEmptyStringAndNotWhitespace(retryAfterValue)) {
        return Maybe.nothing<number>();
      }

      const normalizedRetryAfter = retryAfterValue.trim();
      const retryAfterSeconds = Number(normalizedRetryAfter);

      if (isNonNegativeNumber(retryAfterSeconds)) {
        const delayMilliseconds = retryAfterSeconds * millisecondsPerSecond;

        return isNonNegativeNumber(delayMilliseconds) ? Maybe.just(delayMilliseconds) : Maybe.nothing<number>();
      }

      const retryAfterTimestampMilliseconds = Date.parse(normalizedRetryAfter);

      if (!isFiniteNumber(retryAfterTimestampMilliseconds)) {
        return Maybe.nothing<number>();
      }

      return Maybe.just(Math.max(0, retryAfterTimestampMilliseconds - currentTimeMilliseconds));
    },
    Nothing() {
      return Maybe.nothing<number>();
    },
  });
}

function parseRateLimitResetMilliseconds(response: GitHubRateLimitResponseMetadata): Maybe<number> {
  const rateLimitReset = response.rateLimitReset;

  return rateLimitReset.match({
    Just(rateLimitResetValue) {
      if (!isNonEmptyStringAndNotWhitespace(rateLimitResetValue)) {
        return Maybe.nothing<number>();
      }

      const resetTimestampSeconds = Number(rateLimitResetValue.trim());

      if (!isNonNegativeNumber(resetTimestampSeconds)) {
        return Maybe.nothing<number>();
      }

      const resetTimestampMilliseconds = resetTimestampSeconds * millisecondsPerSecond;

      return isNonNegativeNumber(resetTimestampMilliseconds)
        ? Maybe.just(resetTimestampMilliseconds)
        : Maybe.nothing<number>();
    },
    Nothing() {
      return Maybe.nothing<number>();
    },
  });
}

function calculatePrimaryRateLimitDelayMilliseconds(
  response: GitHubRateLimitResponseMetadata,
  currentTimeMilliseconds: number,
): Maybe<number> {
  if (!hasPrimaryRateLimitExhaustion(response)) {
    return Maybe.nothing<number>();
  }

  return parseRateLimitResetMilliseconds(response).match({
    Just(resetTimestampMilliseconds) {
      return Maybe.just(Math.max(0, resetTimestampMilliseconds - currentTimeMilliseconds));
    },
    Nothing() {
      return Maybe.nothing<number>();
    },
  });
}

function calculateSecondaryRateLimitDelayMilliseconds(retryAttempt: number): number {
  return secondaryRateLimitFirstRetryDelayMilliseconds * secondaryRateLimitBackoffBase ** (retryAttempt - 1);
}

function createNoRetryDecision(reason: GitHubRateLimitNoRetryReason): GitHubRateLimitRetryDecision {
  return {kind: 'no-retry', reason};
}

export function isRecognizedGitHubRateLimitResponse(response: GitHubRateLimitResponseMetadata): boolean {
  if (response.statusCode === tooManyRequestsHttpStatusCode) {
    return true;
  }

  if (response.statusCode !== forbiddenHttpStatusCode) {
    return false;
  }

  const hasRateLimitMessage = response.githubMessage.match({
    Just(githubMessage) {
      return githubRateLimitMessagePattern.test(githubMessage);
    },
    Nothing() {
      return false;
    },
  });

  if (hasRateLimitMessage) {
    return true;
  }

  if (hasPrimaryRateLimitExhaustion(response)) {
    return true;
  }

  return hasNonEmptyHeaderValue(response.retryAfter);
}

export function calculateGitHubRateLimitRetryDecision(
  calculateGitHubRateLimitRetryDecisionOptions: CalculateGitHubRateLimitRetryDecisionOptions,
): GitHubRateLimitRetryDecision {
  const {currentTimeMilliseconds, response, retryAttempt} = calculateGitHubRateLimitRetryDecisionOptions;

  if (!isRecognizedGitHubRateLimitResponse(response)) {
    return createNoRetryDecision('not-rate-limit-response');
  }

  if (retryAttempt < 1) {
    return createNoRetryDecision('invalid-retry-attempt');
  }

  if (retryAttempt > maximumGitHubRateLimitRetries) {
    return createNoRetryDecision('maximum-retries-reached');
  }

  const retryAfterDelayMilliseconds = parseRetryAfterDelayMilliseconds(response.retryAfter, currentTimeMilliseconds);
  const primaryRateLimitDelayMilliseconds = calculatePrimaryRateLimitDelayMilliseconds(
    response,
    currentTimeMilliseconds,
  );
  const rateLimitKind = primaryRateLimitDelayMilliseconds.match({
    Just(): 'primary' {
      return 'primary';
    },
    Nothing(): 'secondary' {
      return 'secondary';
    },
  });

  return retryAfterDelayMilliseconds.match({
    Just(delayMilliseconds) {
      return {kind: 'retry', rateLimitKind, delayMilliseconds};
    },
    Nothing() {
      return primaryRateLimitDelayMilliseconds.match({
        Just(delayMilliseconds) {
          return {kind: 'retry', rateLimitKind, delayMilliseconds};
        },
        Nothing() {
          return {
            kind: 'retry',
            rateLimitKind: 'secondary',
            delayMilliseconds: calculateSecondaryRateLimitDelayMilliseconds(retryAttempt),
          };
        },
      });
    },
  });
}
