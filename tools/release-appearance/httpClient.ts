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

import {isNull, isObject, isString, isUndefined} from '@sindresorhus/is';
import ky, {isHTTPError} from 'ky';
import type {KyInstance, Options, RetryOptions} from 'ky';
import {Maybe} from 'true-myth';
import {match} from 'ts-pattern';
import {z} from 'zod';

export type HttpMethod = 'get' | 'post' | 'patch';

export type HttpRequest = {
  readonly method: HttpMethod;
  readonly url: URL;
  readonly headers: Readonly<Record<string, string>>;
  readonly json: Maybe<NonNullable<unknown>>;
};

export type HttpClient = {
  readonly requestJson: (request: HttpRequest) => Promise<unknown>;
};

export type GitHubResponseFailureDetails = {
  readonly statusCode: number;
  readonly githubMessage: Maybe<string>;
  readonly documentationUrl: Maybe<string>;
  readonly githubRequestId: Maybe<string>;
  readonly acceptedGithubPermissions: Maybe<string>;
  readonly retryAfter: Maybe<string>;
  readonly rateLimitRemaining: Maybe<string>;
  readonly rateLimitReset: Maybe<string>;
};

export type HttpRequestFailure =
  | {
      readonly kind: 'http-response-failure';
      readonly method: HttpMethod;
      readonly url: URL;
      readonly response: GitHubResponseFailureDetails;
    }
  | {
      readonly kind: 'http-transport-failure';
      readonly method: HttpMethod;
      readonly url: URL;
      readonly transportMessage: string;
    };

export type CreateKyHttpClientOptions = {
  readonly kyInstance: KyInstance;
};

type ParsedGitHubFailureResponse = {
  readonly githubMessage: Maybe<string>;
  readonly documentationUrl: Maybe<string>;
};

type CreateHttpRequestFailureOptions = {
  readonly error: unknown;
  readonly request: HttpRequest;
};

const maximumRateLimitRetries = 2;
const forbiddenHttpStatusCode = 403;
const tooManyRequestsHttpStatusCode = 429;
const internalServerErrorHttpStatusCode = 500;
const badGatewayHttpStatusCode = 502;
const serviceUnavailableHttpStatusCode = 503;
const gatewayTimeoutHttpStatusCode = 504;
const rateLimitRetryStatusCodes = [
  forbiddenHttpStatusCode,
  tooManyRequestsHttpStatusCode,
  internalServerErrorHttpStatusCode,
  badGatewayHttpStatusCode,
  serviceUnavailableHttpStatusCode,
  gatewayTimeoutHttpStatusCode,
];
const githubRateLimitMessagePattern = /\b(?:api|primary|secondary) rate limit\b|\brate limit exceeded\b/i;

function createMaybeString(value: string | undefined): Maybe<string> {
  return isUndefined(value) ? Maybe.nothing<string>() : Maybe.just(value);
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
  return isNull(headerValue) ? Maybe.nothing<string>() : Maybe.just(headerValue);
}

function readBearerToken(headers: Readonly<Record<string, string>>): Maybe<string> {
  const authorizationHeader = headers.Authorization;
  if (isUndefined(authorizationHeader) || authorizationHeader.startsWith('Bearer ') === false) {
    return Maybe.nothing<string>();
  }

  return Maybe.just(authorizationHeader.slice('Bearer '.length));
}

function redactSecret(value: Maybe<string>, secret: Maybe<string>): Maybe<string> {
  if (value.isNothing || secret.isNothing || secret.value.length === 0) {
    return value;
  }

  return Maybe.just(value.value.replaceAll(secret.value, '[REDACTED]'));
}

function parseGitHubFailureResponse(responseBody: unknown, githubToken: Maybe<string>): ParsedGitHubFailureResponse {
  const validationResult = githubFailureResponseSchema.safeParse(responseBody);
  if (validationResult.success === false) {
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

export function isHttpRequestFailure(error: unknown): error is HttpRequestFailure {
  if (isObject(error) === false || 'kind' in error === false || isString(error.kind) === false) {
    return false;
  }

  return error.kind === 'http-response-failure' || error.kind === 'http-transport-failure';
}

export function formatHttpRequestFailure(failure: HttpRequestFailure): string {
  return match(failure)
    .with({kind: 'http-transport-failure'}, transportFailure => {
      return [
        'GitHub API request failed',
        `Request: ${transportFailure.method.toUpperCase()} ${transportFailure.url.toString()}`,
        transportFailure.transportMessage,
      ].join('; ');
    })
    .with({kind: 'http-response-failure'}, responseFailure => {
      const diagnosticParts = [
        'GitHub API request failed',
        `HTTP status: ${responseFailure.response.statusCode}`,
        `Request: ${responseFailure.method.toUpperCase()} ${responseFailure.url.toString()}`,
      ];
      if (responseFailure.response.githubMessage.isJust) {
        diagnosticParts.push(`GitHub message: ${responseFailure.response.githubMessage.value}`);
      }
      if (responseFailure.response.documentationUrl.isJust) {
        diagnosticParts.push(`Documentation URL: ${responseFailure.response.documentationUrl.value}`);
      }
      if (responseFailure.response.githubRequestId.isJust) {
        diagnosticParts.push(`GitHub request ID: ${responseFailure.response.githubRequestId.value}`);
      }
      if (responseFailure.response.acceptedGithubPermissions.isJust) {
        diagnosticParts.push(
          `Accepted GitHub permissions: ${responseFailure.response.acceptedGithubPermissions.value}`,
        );
      }
      if (responseFailure.response.retryAfter.isJust) {
        diagnosticParts.push(`Retry-After: ${responseFailure.response.retryAfter.value}`);
      }
      if (responseFailure.response.rateLimitRemaining.isJust) {
        diagnosticParts.push(`Rate-limit remaining: ${responseFailure.response.rateLimitRemaining.value}`);
      }
      if (responseFailure.response.rateLimitReset.isJust) {
        diagnosticParts.push(`Rate-limit reset: ${responseFailure.response.rateLimitReset.value}`);
      }

      return diagnosticParts.join('; ');
    })
    .exhaustive();
}

function isRateLimitFailure(failure: HttpRequestFailure): boolean {
  if (failure.kind === 'http-transport-failure') {
    return false;
  }

  if (failure.response.statusCode === tooManyRequestsHttpStatusCode || failure.response.retryAfter.isJust) {
    return true;
  }

  return (
    failure.response.githubMessage.isJust && githubRateLimitMessagePattern.test(failure.response.githubMessage.value)
  );
}

function createRateLimitRetryOptions(request: HttpRequest): RetryOptions {
  return {
    limit: maximumRateLimitRetries,
    methods: [request.method],
    statusCodes: rateLimitRetryStatusCodes,
    afterStatusCodes: rateLimitRetryStatusCodes,
    shouldRetry(retryState) {
      const {error} = retryState;
      const failure = createHttpRequestFailure({error, request});

      return isRateLimitFailure(failure) ? undefined : false;
    },
  };
}

export function createKyHttpClient(createKyHttpClientOptions: CreateKyHttpClientOptions): HttpClient {
  const {kyInstance} = createKyHttpClientOptions;

  return {
    async requestJson(request): Promise<unknown> {
      const requestOptions: Options = request.json
        .map(json => {
          return {
            method: request.method,
            headers: request.headers,
            json,
            retry: createRateLimitRetryOptions(request),
          };
        })
        .unwrapOr({
          method: request.method,
          headers: request.headers,
          retry: createRateLimitRetryOptions(request),
        });

      try {
        return await kyInstance(request.url, requestOptions).json<unknown>();
      } catch (error: unknown) {
        throw createHttpRequestFailure({error, request});
      }
    },
  };
}

export function createRuntimeKyHttpClient(): HttpClient {
  return createKyHttpClient({kyInstance: ky});
}
