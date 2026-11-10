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

import ky, {isHTTPError} from 'ky';
import type {KyInstance, Options} from 'ky';
import {Maybe} from 'true-myth';
import {z} from 'zod';

import {formatHttpRequestFailure, isHttpRequestFailure} from './githubApi.ts';
import type {
  GitHubResponseFailureDetails,
  HttpClient,
  HttpMethod,
  HttpRequest,
  HttpRequestFailure,
} from './githubApi.ts';
import {createGitHubMutationPacer, githubMutationMinimumIntervalMilliseconds} from './githubMutationPacer.ts';
import {calculateGitHubRateLimitRetryDecision, maximumGitHubRateLimitRetries} from './githubRateLimitPolicy.ts';
import type {GitHubRateLimitResponseMetadata} from './githubRateLimitPolicy.ts';

export {formatHttpRequestFailure, isHttpRequestFailure};
export type {GitHubResponseFailureDetails, HttpClient, HttpMethod, HttpRequest, HttpRequestFailure};

export type CreateKyHttpClientOptions = {
  readonly kyInstance: KyInstance;
  readonly currentTimeMilliseconds: () => number;
  readonly sleep: (delayMilliseconds: number) => Promise<void>;
  readonly reportRateLimitWait: (message: string) => void;
};

export type CreateRuntimeKyHttpClientOptions = {
  readonly reportRateLimitWait: (message: string) => void;
};

type ParsedGitHubFailureResponse = {
  readonly githubMessage: Maybe<string>;
  readonly documentationUrl: Maybe<string>;
};

type CreateHttpRequestFailureOptions = {
  readonly error: unknown;
  readonly request: HttpRequest;
};

type CreateKyRequestOperationOptions = {
  readonly kyInstance: KyInstance;
  readonly request: HttpRequest;
  readonly requestOptions: Options;
};

const millisecondsPerSecond = 1_000;

function createMaybeString(value: string | undefined): Maybe<string> {
  return Maybe.of(value);
}

const githubFailureResponseSchema = z
  .object({
    message: z.string().optional().catch(undefined),
    documentation_url: z.string().url().optional().catch(undefined),
  })
  .transform(githubFailureResponse => {
    return {
      githubMessage: createMaybeString(githubFailureResponse.message),
      documentationUrl: createMaybeString(githubFailureResponse.documentation_url),
    };
  });

function readResponseHeader(response: Response, headerName: string): Maybe<string> {
  const headerValue = response.headers.get(headerName);
  return Maybe.of(headerValue);
}

function readBearerToken(headers: Readonly<Record<string, string>>): Maybe<string> {
  const authorizationHeader = headers.Authorization;
  return Maybe.of(authorizationHeader).match({
    Just(headerValue) {
      if (!headerValue.startsWith('Bearer ')) {
        return Maybe.nothing<string>();
      }

      return Maybe.just(headerValue.slice('Bearer '.length));
    },
    Nothing() {
      return Maybe.nothing<string>();
    },
  });
}

function redactSecret(value: Maybe<string>, secret: Maybe<string>): Maybe<string> {
  return value.match({
    Just(valueToRedact) {
      return secret.match({
        Just(secretValue) {
          if (secretValue.length === 0) {
            return Maybe.just(valueToRedact);
          }

          return Maybe.just(valueToRedact.replaceAll(secretValue, '[REDACTED]'));
        },
        Nothing() {
          return Maybe.just(valueToRedact);
        },
      });
    },
    Nothing() {
      return Maybe.nothing<string>();
    },
  });
}

function parseGitHubFailureResponse(responseBody: unknown, githubToken: Maybe<string>): ParsedGitHubFailureResponse {
  const validationResult = githubFailureResponseSchema.safeParse(responseBody);
  if (!validationResult.success) {
    return {
      githubMessage: Maybe.nothing<string>(),
      documentationUrl: Maybe.nothing<string>(),
    };
  }

  return {
    githubMessage: redactSecret(validationResult.data.githubMessage, githubToken),
    documentationUrl: redactSecret(validationResult.data.documentationUrl, githubToken),
  };
}

function createHttpRequestFailure(
  createHttpRequestFailureOptions: CreateHttpRequestFailureOptions,
): HttpRequestFailure {
  const {error, request} = createHttpRequestFailureOptions;
  const githubToken = readBearerToken(request.headers);

  if (isHTTPError(error)) {
    const parsedResponse = parseGitHubFailureResponse(error.data, githubToken);
    return {
      kind: 'http-response-failure',
      method: request.method,
      url: request.url,
      response: {
        statusCode: error.response.status,
        githubMessage: parsedResponse.githubMessage,
        documentationUrl: parsedResponse.documentationUrl,
        githubRequestId: readResponseHeader(error.response, 'x-github-request-id'),
        acceptedGithubPermissions: readResponseHeader(error.response, 'x-accepted-github-permissions'),
        retryAfter: readResponseHeader(error.response, 'retry-after'),
        rateLimitRemaining: readResponseHeader(error.response, 'x-ratelimit-remaining'),
        rateLimitReset: readResponseHeader(error.response, 'x-ratelimit-reset'),
      },
    };
  }

  return {
    kind: 'http-transport-failure',
    method: request.method,
    url: request.url,
    transportMessage: 'No HTTP response was received',
  };
}

function createGitHubRateLimitResponseMetadata(
  response: GitHubResponseFailureDetails,
): GitHubRateLimitResponseMetadata {
  return {
    statusCode: response.statusCode,
    githubMessage: response.githubMessage,
    retryAfter: response.retryAfter,
    rateLimitRemaining: response.rateLimitRemaining,
    rateLimitReset: response.rateLimitReset,
  };
}

type FormatRateLimitRetryMessageOptions = {
  readonly request: HttpRequest;
  readonly retryAttempt: number;
  readonly delayMilliseconds: number;
  readonly rateLimitKind: 'primary' | 'secondary';
};

function formatRateLimitRetryDelay(delayMilliseconds: number): string {
  const delaySeconds = delayMilliseconds / millisecondsPerSecond;

  return Number.isInteger(delaySeconds) ? `${delaySeconds}s` : `${delaySeconds.toFixed(1)}s`;
}

function formatRateLimitRetryMessage(options: FormatRateLimitRetryMessageOptions): string {
  return [
    `GitHub ${options.rateLimitKind} rate limit reached; retrying in ${formatRateLimitRetryDelay(options.delayMilliseconds)}`,
    `(attempt ${options.retryAttempt}/${maximumGitHubRateLimitRetries})`,
    `${options.request.method.toUpperCase()} ${options.request.url.pathname}`,
  ].join(' · ');
}

function createKyRequestOperation(
  createKyRequestOperationOptions: CreateKyRequestOperationOptions,
): () => Promise<unknown> {
  const {kyInstance, request, requestOptions} = createKyRequestOperationOptions;

  return async function executeKyRequest(): Promise<unknown> {
    return await kyInstance(request.url, requestOptions).json<unknown>();
  };
}

function isGitHubMutationMethod(method: HttpMethod): boolean {
  return method === 'post' || method === 'patch';
}

export function createKyHttpClient(createKyHttpClientOptions: CreateKyHttpClientOptions): HttpClient {
  const {currentTimeMilliseconds, kyInstance, reportRateLimitWait, sleep} = createKyHttpClientOptions;
  const mutationPacer = createGitHubMutationPacer({
    currentTimeMilliseconds,
    minimumIntervalMilliseconds: githubMutationMinimumIntervalMilliseconds,
    sleep,
  });

  return {
    async requestJson(request): Promise<unknown> {
      const requestOptions: Options = request.json
        .map(json => {
          return {
            method: request.method,
            headers: request.headers,
            json,
            retry: 0,
          };
        })
        .unwrapOr({
          method: request.method,
          headers: request.headers,
          retry: 0,
        });

      for (let retryAttempt = 1; ; retryAttempt += 1) {
        try {
          const requestOperation = createKyRequestOperation({kyInstance, request, requestOptions});
          if (isGitHubMutationMethod(request.method)) {
            return await mutationPacer.run(requestOperation);
          }

          return await requestOperation();
        } catch (error: unknown) {
          const failure = createHttpRequestFailure({error, request});
          if (failure.kind === 'http-response-failure') {
            const retryDecision = calculateGitHubRateLimitRetryDecision({
              response: createGitHubRateLimitResponseMetadata(failure.response),
              retryAttempt,
              currentTimeMilliseconds: currentTimeMilliseconds(),
            });
            if (retryDecision.kind === 'retry') {
              reportRateLimitWait(
                formatRateLimitRetryMessage({
                  request,
                  retryAttempt,
                  delayMilliseconds: retryDecision.delayMilliseconds,
                  rateLimitKind: retryDecision.rateLimitKind,
                }),
              );
              await sleep(retryDecision.delayMilliseconds);
              continue;
            }
          }

          throw failure;
        }
      }
    },
  };
}

function sleepForRateLimitRetry(delayMilliseconds: number): Promise<void> {
  return new Promise<void>(resolvePromise => {
    setTimeout(resolvePromise, delayMilliseconds);
  });
}

export function createRuntimeKyHttpClient(
  createRuntimeKyHttpClientOptions: CreateRuntimeKyHttpClientOptions,
): HttpClient {
  return createKyHttpClient({
    kyInstance: ky,
    currentTimeMilliseconds: Date.now,
    sleep: sleepForRateLimitRetry,
    reportRateLimitWait: createRuntimeKyHttpClientOptions.reportRateLimitWait,
  });
}
