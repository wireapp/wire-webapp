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

import {Maybe} from 'true-myth';

import {
  calculateGitHubRateLimitRetryDecision,
  isRecognizedGitHubRateLimitResponse,
  maximumGitHubRateLimitRetries,
  secondaryRateLimitFirstRetryDelayMilliseconds,
} from './githubRateLimitPolicy.ts';
import type {GitHubRateLimitResponseMetadata} from './githubRateLimitPolicy.ts';

const currentTimeMilliseconds = 1_800_000_000_000;

function createResponse(overrides: Partial<GitHubRateLimitResponseMetadata>): GitHubRateLimitResponseMetadata {
  return {
    statusCode: 403,
    githubMessage: Maybe.just('You have exceeded a secondary rate limit.'),
    retryAfter: Maybe.nothing<string>(),
    rateLimitRemaining: Maybe.just('4999'),
    rateLimitReset: Maybe.just('4000000000'),
    ...overrides,
  };
}

function calculateRetryDecision(
  response: GitHubRateLimitResponseMetadata,
  retryAttempt: number,
): ReturnType<typeof calculateGitHubRateLimitRetryDecision> {
  return calculateGitHubRateLimitRetryDecision({response, retryAttempt, currentTimeMilliseconds});
}

describe('GitHub rate-limit retry policy', () => {
  it('recognizes GitHub secondary-rate-limit responses', () => {
    const actualClassification = isRecognizedGitHubRateLimitResponse(createResponse({}));

    expect(actualClassification).toBe(true);
  });

  it('prefers a valid Retry-After delay over the primary reset timestamp', () => {
    const actualDecision = calculateRetryDecision(createResponse({retryAfter: Maybe.just('15')}), 1);
    const expectedDecision = {
      kind: 'retry',
      rateLimitKind: 'secondary',
      delayMilliseconds: 15_000,
    };

    expect(actualDecision).toEqual(expectedDecision);
  });

  it('waits until the primary reset when primary remaining is exactly zero', () => {
    const actualDecision = calculateRetryDecision(
      createResponse({
        githubMessage: Maybe.just('API rate limit exceeded.'),
        rateLimitRemaining: Maybe.just('0'),
        rateLimitReset: Maybe.just('1800000010'),
      }),
      1,
    );
    const expectedDecision = {
      kind: 'retry',
      rateLimitKind: 'primary',
      delayMilliseconds: 10_000,
    };

    expect(actualDecision).toEqual(expectedDecision);
  });

  it('uses secondary backoff instead of a far-future primary reset for secondary limits', () => {
    // Regression evidence from workflow run 35581293605: 78/130 PRs completed, followed by almost one hour of silence.
    const actualDecision = calculateRetryDecision(
      createResponse({
        rateLimitRemaining: Maybe.just('4999'),
        rateLimitReset: Maybe.just('4000000000'),
      }),
      1,
    );
    const expectedDecision = {
      kind: 'retry',
      rateLimitKind: 'secondary',
      delayMilliseconds: secondaryRateLimitFirstRetryDelayMilliseconds,
    };

    expect(actualDecision).toEqual(expectedDecision);
  });

  it('uses secondary backoff for a 429 response without useful timing headers', () => {
    const actualDecision = calculateRetryDecision(
      createResponse({
        statusCode: 429,
        githubMessage: Maybe.nothing<string>(),
        rateLimitRemaining: Maybe.nothing<string>(),
        rateLimitReset: Maybe.nothing<string>(),
      }),
      1,
    );
    const expectedDecision = {
      kind: 'retry',
      rateLimitKind: 'secondary',
      delayMilliseconds: secondaryRateLimitFirstRetryDelayMilliseconds,
    };

    expect(actualDecision).toEqual(expectedDecision);
  });

  it('uses bounded exponential backoff for repeated secondary-limit responses', () => {
    const firstRetryDecision = calculateRetryDecision(createResponse({}), 1);
    const secondRetryDecision = calculateRetryDecision(createResponse({}), 2);
    const exhaustedRetryDecision = calculateRetryDecision(createResponse({}), maximumGitHubRateLimitRetries + 1);

    expect(firstRetryDecision).toEqual({
      kind: 'retry',
      rateLimitKind: 'secondary',
      delayMilliseconds: 60_000,
    });
    expect(secondRetryDecision).toEqual({
      kind: 'retry',
      rateLimitKind: 'secondary',
      delayMilliseconds: 120_000,
    });
    expect(exhaustedRetryDecision).toEqual({kind: 'no-retry', reason: 'maximum-retries-reached'});
  });

  it('does not retry an unrelated forbidden response', () => {
    const unrelatedForbiddenResponse = createResponse({
      githubMessage: Maybe.just('Resource not accessible by integration.'),
      rateLimitRemaining: Maybe.just('4999'),
      rateLimitReset: Maybe.just('4000000000'),
      retryAfter: Maybe.nothing<string>(),
    });
    const actualClassification = isRecognizedGitHubRateLimitResponse(unrelatedForbiddenResponse);
    const actualDecision = calculateRetryDecision(unrelatedForbiddenResponse, 1);

    expect(actualClassification).toBe(false);
    expect(actualDecision).toEqual({kind: 'no-retry', reason: 'not-rate-limit-response'});
  });

  it('falls back to secondary backoff when Retry-After is malformed', () => {
    const actualDecision = calculateRetryDecision(createResponse({retryAfter: Maybe.just('not-a-duration')}), 1);
    const expectedDecision = {
      kind: 'retry',
      rateLimitKind: 'secondary',
      delayMilliseconds: secondaryRateLimitFirstRetryDelayMilliseconds,
    };

    expect(actualDecision).toEqual(expectedDecision);
  });
});
