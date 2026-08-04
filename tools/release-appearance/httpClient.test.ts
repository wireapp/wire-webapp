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

import assert from 'node:assert';

import ky from 'ky';
import {Maybe} from 'true-myth';

import {createKyHttpClient, formatHttpRequestFailure, isHttpRequestFailure} from './httpClient.ts';
import type {HttpRequest, HttpRequestFailure} from './httpClient.ts';

function createCommentRequest(): HttpRequest {
  return {
    method: 'post',
    url: new URL('https://api.github.example/repos/wireapp/wire-webapp/issues/7/comments'),
    headers: {
      Authorization: 'Bearer github-token',
    },
    json: Maybe.just({body: 'release comment'}),
  };
}

async function readHttpRequestFailure(requestPromise: Promise<unknown>): Promise<HttpRequestFailure> {
  try {
    await requestPromise;
    assert.fail('Expected the HTTP request to fail');
  } catch (error: unknown) {
    if (isHttpRequestFailure(error) === false) {
      assert.fail('Expected an application-owned HTTP request failure');
    }

    return error;
  }
}

describe('Ky HTTP client', () => {
  it('retains safe diagnostics from a normal forbidden response without retrying', async () => {
    let fetchCallCount = 0;
    const kyInstance = ky.create({
      fetch: async (): Promise<Response> => {
        fetchCallCount += 1;
        return new Response(
          JSON.stringify({
            message: 'Resource not accessible by integration',
            documentation_url: 'https://docs.github.com/rest/issues/comments#create-an-issue-comment',
          }),
          {
            status: 403,
            headers: {
              'content-type': 'application/json',
              'x-github-request-id': 'REQUEST-403',
              'x-accepted-github-permissions': 'issues=write, pull_requests=write',
              'x-ratelimit-remaining': '4999',
              'x-ratelimit-reset': '1785800000',
            },
          },
        );
      },
    });
    const httpClient = createKyHttpClient({kyInstance});

    const failure = await readHttpRequestFailure(httpClient.requestJson(createCommentRequest()));

    expect(fetchCallCount).toBe(1);
    assert(failure.kind === 'http-response-failure');
    expect(failure.response.statusCode).toBe(403);
    expect(failure.response.githubMessage).toEqual(Maybe.just('Resource not accessible by integration'));
    expect(failure.response.documentationUrl).toEqual(
      Maybe.just('https://docs.github.com/rest/issues/comments#create-an-issue-comment'),
    );
    expect(failure.response.githubRequestId).toEqual(Maybe.just('REQUEST-403'));
    expect(failure.response.acceptedGithubPermissions).toEqual(Maybe.just('issues=write, pull_requests=write'));
    expect(failure.response.rateLimitRemaining).toEqual(Maybe.just('4999'));
    expect(failure.response.rateLimitReset).toEqual(Maybe.just('1785800000'));
    expect(failure.response.retryAfter.isNothing).toBe(true);
  });

  it('retries a secondary-rate-limit response using retry-after and fails boundedly', async () => {
    let fetchCallCount = 0;
    const kyInstance = ky.create({
      fetch: async (): Promise<Response> => {
        fetchCallCount += 1;
        return new Response(
          JSON.stringify({
            message: 'You have exceeded a secondary rate limit. Please wait a few minutes before you try again.',
          }),
          {
            status: 403,
            headers: {
              'content-type': 'application/json',
              'retry-after': '0',
              'x-ratelimit-remaining': '0',
              'x-ratelimit-reset': '1785800000',
            },
          },
        );
      },
    });
    const httpClient = createKyHttpClient({kyInstance});

    const failure = await readHttpRequestFailure(httpClient.requestJson(createCommentRequest()));

    expect(fetchCallCount).toBe(3);
    assert(failure.kind === 'http-response-failure');
    expect(failure.response.statusCode).toBe(403);
    assert(failure.response.githubMessage.isJust);
    expect(failure.response.githubMessage.value).toMatch(/secondary rate limit/);
    expect(failure.response.retryAfter).toEqual(Maybe.just('0'));
  });

  it('retries an HTTP 429 response even when the response body has no GitHub message', async () => {
    let fetchCallCount = 0;
    const kyInstance = ky.create({
      fetch: async (): Promise<Response> => {
        fetchCallCount += 1;
        return new Response(JSON.stringify({details: 'release comment'}), {
          status: 429,
          headers: {
            'content-type': 'application/json',
            'retry-after': '0',
          },
        });
      },
    });
    const httpClient = createKyHttpClient({kyInstance});

    const failure = await readHttpRequestFailure(httpClient.requestJson(createCommentRequest()));

    expect(fetchCallCount).toBe(3);
    assert(failure.kind === 'http-response-failure');
    expect(failure.response.statusCode).toBe(429);
    expect(failure.response.githubMessage.isNothing).toBe(true);
    expect(formatHttpRequestFailure(failure)).not.toContain('release comment');
  });

  it('retains valid fields while discarding malformed GitHub fields and unrelated response data', async () => {
    const kyInstance = ky.create({
      fetch: async (): Promise<Response> => {
        return new Response(
          JSON.stringify({
            message: 403,
            documentation_url: 'not a URL',
            body: 'release comment',
            unrelated: 'do not expose this',
          }),
          {
            status: 403,
            headers: {
              'content-type': 'application/json',
              'x-github-request-id': 'REQUEST-MALFORMED',
              'x-unrelated-header': 'do not expose this either',
            },
          },
        );
      },
    });
    const httpClient = createKyHttpClient({kyInstance});

    const failure = await readHttpRequestFailure(httpClient.requestJson(createCommentRequest()));

    assert(failure.kind === 'http-response-failure');
    expect(failure.response.statusCode).toBe(403);
    expect(failure.response.githubMessage.isNothing).toBe(true);
    expect(failure.response.documentationUrl.isNothing).toBe(true);
    expect(failure.response.githubRequestId).toEqual(Maybe.just('REQUEST-MALFORMED'));
    const actualDiagnostic = formatHttpRequestFailure(failure);
    expect(actualDiagnostic).not.toContain('release comment');
    expect(actualDiagnostic).not.toContain('do not expose this');
    expect(actualDiagnostic).toContain('GitHub request ID: REQUEST-MALFORMED');
  });

  it('formats only safe actionable diagnostics and never includes the request body or headers', () => {
    const failure: HttpRequestFailure = {
      kind: 'http-response-failure',
      method: 'post',
      url: new URL('https://api.github.example/repos/wireapp/wire-webapp/issues/7/comments'),
      response: {
        statusCode: 403,
        githubMessage: Maybe.just('Resource not accessible by integration'),
        documentationUrl: Maybe.just('https://docs.github.com/rest/issues/comments#create-an-issue-comment'),
        githubRequestId: Maybe.just('REQUEST-403'),
        acceptedGithubPermissions: Maybe.just('issues=write, pull_requests=write'),
        retryAfter: Maybe.just('3'),
        rateLimitRemaining: Maybe.just('0'),
        rateLimitReset: Maybe.just('1785800000'),
      },
    };

    const actualDiagnostic = formatHttpRequestFailure(failure);
    const expectedDiagnostic = [
      'GitHub API request failed',
      'HTTP status: 403',
      'Request: POST https://api.github.example/repos/wireapp/wire-webapp/issues/7/comments',
      'GitHub message: Resource not accessible by integration',
      'Documentation URL: https://docs.github.com/rest/issues/comments#create-an-issue-comment',
      'GitHub request ID: REQUEST-403',
      'Accepted GitHub permissions: issues=write, pull_requests=write',
      'Retry-After: 3',
      'Rate-limit remaining: 0',
      'Rate-limit reset: 1785800000',
    ].join('; ');

    expect(actualDiagnostic).toBe(expectedDiagnostic);
    expect(actualDiagnostic).not.toContain('release comment');
    expect(actualDiagnostic).not.toContain('Authorization');
    expect(actualDiagnostic).not.toContain('Bearer');
  });
});
