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

import {isError, isObject, isString} from '@sindresorhus/is';
import {Maybe} from 'true-myth';
import {match} from 'ts-pattern';

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

export type CreateGitHubHeadersOptions = {
  readonly githubToken: string;
  readonly includesJsonBody: boolean;
};

export type CreateGitHubPageUrlOptions = {
  readonly endpoint: URL;
  readonly page: number;
};

export type CreateGitHubHttpRequestOptions = {
  readonly method: HttpMethod;
  readonly url: URL;
  readonly headers: Readonly<Record<string, string>>;
  readonly json: Maybe<NonNullable<unknown>>;
};

export type FormatGitHubRequestErrorOptions = {
  readonly error: unknown;
  readonly fallbackMessage: string;
};

export const githubApiPageSize = 100;

const githubApiVersion = '2022-11-28';
const redactedGitHubSecret = '[REDACTED]';

export function createGitHubApiRoot(githubApiUrl: URL): URL {
  const githubApiUrlString = githubApiUrl.toString();

  return new URL(githubApiUrlString.endsWith('/') ? githubApiUrlString : `${githubApiUrlString}/`);
}

export function encodeGitHubRepositoryName(githubRepository: string): string {
  return githubRepository
    .split('/')
    .map(repositoryPart => {
      return encodeURIComponent(repositoryPart);
    })
    .join('/');
}

export function createGitHubHeaders(options: CreateGitHubHeadersOptions): Readonly<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${options.githubToken}`,
    'X-GitHub-Api-Version': githubApiVersion,
  };

  if (options.includesJsonBody) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

export function createGitHubPageUrl(options: CreateGitHubPageUrlOptions): URL {
  const pageUrl = new URL(options.endpoint);
  pageUrl.searchParams.set('per_page', githubApiPageSize.toString());
  pageUrl.searchParams.set('page', options.page.toString());

  return pageUrl;
}

export function createGitHubHttpRequest(options: CreateGitHubHttpRequestOptions): HttpRequest {
  return {
    method: options.method,
    url: options.url,
    headers: options.headers,
    json: options.json,
  };
}

export function redactGitHubSecret(message: string, secret: string): string {
  return secret.length === 0 ? message : message.replaceAll(secret, redactedGitHubSecret);
}

export function formatGitHubRequestError(options: FormatGitHubRequestErrorOptions): string {
  if (isHttpRequestFailure(options.error)) {
    return formatHttpRequestFailure(options.error);
  }

  return isError(options.error) ? options.error.message : options.fallbackMessage;
}

export function isHttpRequestFailure(error: unknown): error is HttpRequestFailure {
  if (!isObject(error) || !('kind' in error) || !isString(error.kind)) {
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
        ...responseFailure.response.githubMessage.match({
          Just(githubMessage) {
            return [`GitHub message: ${githubMessage}`];
          },
          Nothing() {
            return [];
          },
        }),
        ...responseFailure.response.documentationUrl.match({
          Just(documentationUrl) {
            return [`Documentation URL: ${documentationUrl}`];
          },
          Nothing() {
            return [];
          },
        }),
        ...responseFailure.response.githubRequestId.match({
          Just(githubRequestId) {
            return [`GitHub request ID: ${githubRequestId}`];
          },
          Nothing() {
            return [];
          },
        }),
        ...responseFailure.response.acceptedGithubPermissions.match({
          Just(acceptedGithubPermissions) {
            return [`Accepted GitHub permissions: ${acceptedGithubPermissions}`];
          },
          Nothing() {
            return [];
          },
        }),
        ...responseFailure.response.retryAfter.match({
          Just(retryAfter) {
            return [`Retry-After: ${retryAfter}`];
          },
          Nothing() {
            return [];
          },
        }),
        ...responseFailure.response.rateLimitRemaining.match({
          Just(rateLimitRemaining) {
            return [`Rate-limit remaining: ${rateLimitRemaining}`];
          },
          Nothing() {
            return [];
          },
        }),
        ...responseFailure.response.rateLimitReset.match({
          Just(rateLimitReset) {
            return [`Rate-limit reset: ${rateLimitReset}`];
          },
          Nothing() {
            return [];
          },
        }),
      ];

      return diagnosticParts.join('; ');
    })
    .exhaustive();
}
