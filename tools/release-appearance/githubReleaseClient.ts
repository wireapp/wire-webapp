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
import {z} from 'zod';

import {formatHttpRequestFailure, isHttpRequestFailure} from './httpClient.ts';
import type {HttpClient, HttpMethod, HttpRequest, HttpRequestFailure} from './httpClient.ts';

export type GitHubReleaseRecord = {
  readonly tagName: string;
  readonly htmlUrl: string;
  readonly isDraft: boolean;
};

export type FindGitHubReleaseOptions = {
  readonly tagName: string;
};

export type CreateProductionDraftOptions = {
  readonly productionTagName: string;
  readonly precedingProductionTagName: Maybe<string>;
};

export type GitHubReleaseClient = {
  readonly listTagNames: () => Promise<Result<readonly string[], Error>>;
  readonly findReleaseByTag: (options: FindGitHubReleaseOptions) => Promise<Result<Maybe<GitHubReleaseRecord>, Error>>;
  readonly createProductionDraft: (
    options: CreateProductionDraftOptions,
  ) => Promise<Result<GitHubReleaseRecord, Error>>;
};

export type CreateGitHubReleaseClientOptions = {
  readonly httpClient: HttpClient;
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubToken: string;
};

type ParsedGitHubTagPage = {
  readonly rawItemCount: number;
  readonly tagNames: readonly string[];
};

type GitHubCreateReleaseRequestBody = {
  readonly tag_name: string;
  readonly name: string;
  readonly draft: true;
  readonly generate_release_notes?: true;
  readonly previous_tag_name?: string;
  readonly body?: string;
};

const githubPageSize = 100;
const githubApiVersion = '2022-11-28';
const notFoundHttpStatusCode = 404;
const noPrecedingProductionReleaseNotes =
  'No preceding ADR Production release was found. Add the customer-facing changelog manually before publication.';

const githubTagResponseSchema = z.object({
  name: z.string().min(1),
});

const githubTagPageResponseSchema = z.array(githubTagResponseSchema);

const githubReleaseResponseSchema = z.object({
  tag_name: z.string().min(1),
  html_url: z.string().url(),
  draft: z.boolean(),
});

function createSuccess<valueType>(value: valueType): Result<valueType, Error> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string): Result<valueType, Error> {
  return Result.err<valueType, Error>(new Error(message));
}

function errorMessage(error: unknown): string {
  if (isHttpRequestFailure(error)) {
    return formatHttpRequestFailure(error);
  }

  if (isError(error)) {
    return error.message;
  }

  return 'Unknown failure';
}

function redactSecret(message: string, secret: string): string {
  if (secret.length === 0) {
    return message;
  }

  return message.replaceAll(secret, '[REDACTED]');
}

function isNotFoundHttpRequestFailure(error: unknown): error is HttpRequestFailure {
  return (
    isHttpRequestFailure(error) &&
    error.kind === 'http-response-failure' &&
    error.response.statusCode === notFoundHttpStatusCode
  );
}

function createGitHubApiRoot(githubApiUrl: URL): URL {
  const githubApiUrlString = githubApiUrl.toString();
  return new URL(githubApiUrlString.endsWith('/') ? githubApiUrlString : `${githubApiUrlString}/`);
}

function encodeRepositoryName(githubRepository: string): string {
  return githubRepository
    .split('/')
    .map(repositoryPart => {
      return encodeURIComponent(repositoryPart);
    })
    .join('/');
}

function createGitHubHeaders(githubToken: string, includesBody: boolean): Readonly<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${githubToken}`,
    'X-GitHub-Api-Version': githubApiVersion,
  };

  if (includesBody) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

function createPageUrl(endpoint: URL, page: number): URL {
  const pageUrl = new URL(endpoint);
  pageUrl.searchParams.set('per_page', githubPageSize.toString());
  pageUrl.searchParams.set('page', page.toString());
  return pageUrl;
}

function createHttpRequest(
  method: HttpMethod,
  url: URL,
  headers: Readonly<Record<string, string>>,
  json: Maybe<NonNullable<unknown>>,
): HttpRequest {
  return {method, url, headers, json};
}

function parseGitHubTagPage(githubResponse: unknown): Result<ParsedGitHubTagPage, Error> {
  const validationResult = githubTagPageResponseSchema.safeParse(githubResponse);

  if (validationResult.success === false) {
    return createFailure('Malformed GitHub tag response');
  }

  return createSuccess({
    rawItemCount: validationResult.data.length,
    tagNames: validationResult.data.map(tag => {
      return tag.name;
    }),
  });
}

function parseGitHubRelease(githubResponse: unknown): Result<GitHubReleaseRecord, Error> {
  const validationResult = githubReleaseResponseSchema.safeParse(githubResponse);

  if (validationResult.success === false) {
    return createFailure('Malformed GitHub Release response');
  }

  return createSuccess({
    tagName: validationResult.data.tag_name,
    htmlUrl: validationResult.data.html_url,
    isDraft: validationResult.data.draft,
  });
}

function createProductionDraftRequestBody(options: CreateProductionDraftOptions): GitHubCreateReleaseRequestBody {
  if (options.precedingProductionTagName.isJust) {
    return {
      tag_name: options.productionTagName,
      name: options.productionTagName,
      draft: true,
      generate_release_notes: true,
      previous_tag_name: options.precedingProductionTagName.value,
    };
  }

  return {
    tag_name: options.productionTagName,
    name: options.productionTagName,
    draft: true,
    body: noPrecedingProductionReleaseNotes,
  };
}

export function createGitHubReleaseClient(
  createGitHubReleaseClientOptions: CreateGitHubReleaseClientOptions,
): GitHubReleaseClient {
  const {httpClient, githubApiUrl, githubRepository, githubToken} = createGitHubReleaseClientOptions;
  const githubApiRoot = createGitHubApiRoot(githubApiUrl);
  const encodedRepositoryName = encodeRepositoryName(githubRepository);
  const readHeaders = createGitHubHeaders(githubToken, false);
  const writeHeaders = createGitHubHeaders(githubToken, true);

  return {
    async listTagNames(): Promise<Result<readonly string[], Error>> {
      const tagNames: string[] = [];
      const endpoint = new URL(`repos/${encodedRepositoryName}/tags`, githubApiRoot);

      for (let page = 1; ; page += 1) {
        let githubResponse: unknown;

        try {
          githubResponse = await httpClient.requestJson(
            createHttpRequest('get', createPageUrl(endpoint, page), readHeaders, Maybe.nothing()),
          );
        } catch (error: unknown) {
          return createFailure(`Unable to list GitHub tag names: ${redactSecret(errorMessage(error), githubToken)}`);
        }

        const pageResult = parseGitHubTagPage(githubResponse);

        if (pageResult.isErr) {
          return createFailure(pageResult.error.message);
        }

        tagNames.push(...pageResult.value.tagNames);

        if (pageResult.value.rawItemCount !== githubPageSize) {
          break;
        }
      }

      return createSuccess(tagNames);
    },

    async findReleaseByTag(options: FindGitHubReleaseOptions): Promise<Result<Maybe<GitHubReleaseRecord>, Error>> {
      const endpoint = new URL(
        `repos/${encodedRepositoryName}/releases/tags/${encodeURIComponent(options.tagName)}`,
        githubApiRoot,
      );

      try {
        const githubResponse = await httpClient.requestJson(
          createHttpRequest('get', endpoint, readHeaders, Maybe.nothing()),
        );
        const releaseResult = parseGitHubRelease(githubResponse);

        if (releaseResult.isErr) {
          return createFailure(releaseResult.error.message);
        }

        return createSuccess(Maybe.just(releaseResult.value));
      } catch (error: unknown) {
        if (isNotFoundHttpRequestFailure(error)) {
          return createSuccess(Maybe.nothing<GitHubReleaseRecord>());
        }

        return createFailure(
          `Unable to find GitHub Release for tag ${options.tagName}: ${redactSecret(errorMessage(error), githubToken)}`,
        );
      }
    },

    async createProductionDraft(options: CreateProductionDraftOptions): Promise<Result<GitHubReleaseRecord, Error>> {
      const endpoint = new URL(`repos/${encodedRepositoryName}/releases`, githubApiRoot);

      try {
        const githubResponse = await httpClient.requestJson(
          createHttpRequest('post', endpoint, writeHeaders, Maybe.just(createProductionDraftRequestBody(options))),
        );
        return parseGitHubRelease(githubResponse);
      } catch (error: unknown) {
        return createFailure(
          `Unable to create GitHub Release for tag ${options.productionTagName}: ${redactSecret(errorMessage(error), githubToken)}`,
        );
      }
    },
  };
}
